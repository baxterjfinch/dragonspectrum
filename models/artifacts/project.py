import time
import logging

from google.appengine.ext import ndb, deferred

from server import ttindex
from markers import Marker
from concept import Concept
from artifact import CorruptedArtifactException, ProjectNode, DATETIME_FORMATE
from document import PresentationDocument, SummaryDocument
from publish import PublishDocument, PublishPresentation, PublishSummary

log = logging.getLogger('tt')

__all__ = [
    'Project',
]


class Project(ProjectNode):
    project = None  # Want to overide the Artifact's requirement for this
    pw_modified_ts = ndb.DateTimeProperty(auto_now_add=True)
    title = ndb.StringProperty(required=True)
    orphan_concept = ndb.KeyProperty(repeated=True)
    documents = ndb.KeyProperty(kind='Document', repeated=True)
    distilled_document = ndb.KeyProperty(kind='Document', required=True)
    operations_list = ['admin', 'read', 'write', 'delete', 'edit_children']
    import_url = ndb.TextProperty()

    def delete(self, request_user):
        self.owner = []
        self.put()

        if self.organization:
            mod_groups = []
            groups = self.organization.get().get_all_group_objects()

            for group in groups:
                if self.key in group.artifacts:
                    group.artifacts.remove(self.key)
                    mod_groups.append(group)

            ndb.put_multi(mod_groups)

        deferred.defer(self.delete_project, request_user, _queue='projectDel')

    def delete_project(self, user):
        indexes = user.get_indexes(create_new=False)

        if self.distilled_document is not None and self.distilled_document not in self.documents:
            self.documents.append(self.distilled_document)

        if len(self.documents) > 0:
            documents = ndb.get_multi(self.documents)
            perms = []

            for doc in documents:
                perms.append(doc.permissions)

                q = Marker.query()
                q = q.filter(Marker.document == doc.key)
                for m in q.iter():
                    m.key.delete()

                q = PublishDocument.query()
                q = q.filter(PublishDocument.document == doc.key)
                for m in q.iter():
                    m.key.delete()

                q = PublishSummary.query()
                q = q.filter(PublishSummary.document == doc.key)
                for m in q.iter():
                    m.key.delete()

                q = PublishPresentation.query()
                q = q.filter(PublishPresentation.document == doc.key)
                for m in q.iter():
                    m.key.delete()

                q = PresentationDocument.query()
                q = q.filter(PresentationDocument.document == doc.key)
                for m in q.iter():
                    m.key.delete()

                q = SummaryDocument.query()
                q = q.filter(SummaryDocument.document == doc.key)
                for m in q.iter():
                    m.key.delete()

                doc.index_delete(indexes)

            ndb.delete_multi(perms)
            ndb.delete_multi(self.documents)

        concept = self.get_children()
        indexes = user.get_indexes()

        for con in concept:
            if not con:
                continue

            if con.node_type == 'LinkedConcept':
                con.delete(user, touch_concept=True, force=True)
            else:
                con.rdelete(user, indexes)

        groups = self.get_groups()
        for group in groups:
            if self.key in group.artifacts:
                group.artifacts.remove(self.key)

        ndb.put_multi(groups)

        self.permissions.delete()
        self.index_delete(indexes)
        self.key.delete()

    def is_root(self):
        return True

    def remove_document(self, document_key):
        if self.documents is not None:
            if document_key in self.documents:
                self.documents.remove(document_key)
                self.put()

    def get_children(self, user=None):
        q = Concept.query()
        q = q.filter(
            ndb.AND(
                Concept.project == self.key,
                ndb.OR(Concept.parent == None, Concept.parent == self.key)
            )
        )

        children_by_id = {}
        for child in q.iter():
            children_by_id[child.id] = child

        changed = self._check_children_dups()
        children = []
        for child_key in self.children:
            c = children_by_id.get(child_key.id())
            if c is not None:
                children.append(c)
                del children_by_id[child_key.id()]
            else:
                self.children.remove(child_key)
                changed = True

        children = children + children_by_id.values()

        if changed:
            self.put()

        if not user:
            return children
        c = []
        for child in children:
            if child and child.has_permission_read(user):
                c.append(child)
        return c

    @staticmethod
    def get_user_projects(user):
        q = Project.query(Project.owner == user.key)
        projects = []

        for results in q.iter():
            results.has_permission(user, 'read')
            projects.append(results)

        groups = ndb.get_multi(user.groups)
        for group in groups:
            pros = ndb.get_multi(group.artifacts)
            for pro in pros:
                if pro is None:
                    continue
                if pro.has_permission(user, 'read'):
                    if pro not in projects:
                        projects.append(pro)

        project_list = []
        for project in projects:
            try:
                project_list.append(project.to_dict(user))
            except CorruptedArtifactException:
                pass  # Do nothing, just continue

        return project_list

    @staticmethod
    def get_org_projects(org, user):
        q = Project.query()
        q = q.filter(Project.organization == org.key)

        project_array = []

        for project in q.iter():
            try:
                project_array.append(project.to_dict(0, user))
            except CorruptedArtifactException:
                pass

        return project_array

    def get_document_ids(self):
        doc_ids = [self.distilled_document.id()]
        for doc in self.documents:
            doc_ids.append(doc.id())
        return doc_ids

    def get_distilled_document(self):
        return self.distilled_document.get()

    def get_index_doc(self):
        fields = [
            ttindex.ATOMFIELD, 'typ', 'pro',
            ttindex.TEXTFIELD, 'title', self.title,
        ]
        return self.key.id(), fields

    def get_indexes(self, create_new=True):
        if self.organization:
            return ttindex.get_indexes(namespace=self.organization.id(), create_new=create_new)
        else:
            return ttindex.get_indexes(namespace='user', index_name=self.owner[0].id(), create_new=create_new)

    def get_put_index(self):
        if self.organization:
            return ttindex.get_put_index(namespace=self.organization.id())
        else:
            return ttindex.get_put_index(namespace='user', index_name=self.owner[0].id())

    @staticmethod
    def search_projects(query_dict, user):
        index = user.get_indexes(create_new=False)
        search_results = ttindex.ttsearch(index, query_dict, limit=1000, use_cursor=False, user=user)
        project_ids = []

        while len(project_ids) < 20 and search_results is not None:
            pro_ids = []

            for sr in search_results:
                if sr['fields']['typ'] != 'pro':
                    if sr['fields']['pro'] not in project_ids:
                        pro_ids.append(sr['fields']['pro'])
                else:
                    if sr['id'] not in project_ids:
                        pro_ids.append(sr['id'])

            for pro_id in pro_ids:
                project = Project.get_by_id(pro_id)
                if project:
                    if project.has_permission(user, 'read') and pro_id not in project_ids:
                        project_ids.append(pro_id)

            search_results = ttindex.ttsearch(index, query_dict, limit=1000, user=user)

        return project_ids

    def index(self, index_):
        id_, fields = self.get_index_doc()
        ttindex.index_artifact(index_, id_, fields)

    def index_delete(self, indexes):
        ttindex.index_delete(indexes, self.key.id())

    def has_permission_delete(self, user):
        return self.has_permission(user, 'delete')

    @property
    def node_type(self):
        return 'Project'

    # TODO Add depth option for getting children concepts
    def to_dict(self, user, check_perms=True):
        if self.corrupted:
            raise CorruptedArtifactException('project is corrupted')

        d = super(Project, self).to_dict(user)

        del d['orphan_concept']

        d['path'] = '/project/' + self.key.id()

        if self.distilled_document not in d['documents']:
            d['documents'].append(self.distilled_document)

        documents = ndb.get_multi(d['documents'])
        d['documents'] = []
        for document in documents:
            if document is None:
                continue
            elif document.has_permission(user, 'read'):
                d['documents'].append(document.to_dict(user))

        if d['distilled_document'] is None:
            self.corrupted = True
            self.put()
            raise CorruptedArtifactException('No distilled document key')

        d['distilled_document'] = d['distilled_document'].get()
        if d['distilled_document'] is None:
            self.corrupted = True
            self.put()
            raise CorruptedArtifactException('No distilled document key')
        d['distilled_document'] = d['distilled_document'].key.id()

        # TODO: This can be remove once all projects have this value set
        if not d['pw_modified_ts']:
            d['pw_modified_ts'] = self.modified_ts

        pw_modified_ts = d['pw_modified_ts']
        d['pw_modified_ts'] = time.mktime(d['pw_modified_ts'].timetuple()) * 1000
        d['pw_modified'] = pw_modified_ts.strftime(DATETIME_FORMATE)

        # Remove the world group from the user to test if a project is share to them
        # or just world shared
        world_share_key = None
        for group in user.groups:
            if group.id() == 'world':
                world_share_key = group
                user.groups.remove(group)

        d['shared'] = False
        if user.key not in self.owner and self.has_permission_read(user):
            d['shared'] = True

        # Add the world group back to the user
        if world_share_key:
            user.groups.append(world_share_key)

        perm = self.permissions.get().permissions
        if user.key not in self.owner and 'world' in perm['read']['shared'].keys():
            d['world_shared'] = True
        else:
            d['world_shared'] = False

        return d