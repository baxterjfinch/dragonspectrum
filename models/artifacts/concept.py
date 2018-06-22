import time
import logging

import cloudstorage as gcs
from google.appengine.ext import ndb

import server
from server import ttindex
from artifact import ProjectNode, CorruptedArtifactException

__all__ = [
    'Concept',
    'ConceptLink',
]


log = logging.getLogger('tt')


class ConceptLink(ndb.Model):
    link_id = ndb.StringProperty()
    created_ts = ndb.DateTimeProperty()
    modified_ts = ndb.DateTimeProperty()
    project = ndb.KeyProperty()
    parent = ndb.KeyProperty()
    document = ndb.KeyProperty()
    distilled_document = ndb.KeyProperty()

    def to_dict(self):
        return {
            'id': self.link_id,
            'created_ts': time.mktime(self.created_ts.timetuple()),
            'modified_ts': time.mktime(self.modified_ts.timetuple()),
            'project': self.project.id(),
            'parent': self.parent.id(),
            'document': self.document.id(),
            'distilled_document': self.distilled_document.id(),
        }


class Concept(ProjectNode):
    parent = ndb.KeyProperty()  # TODO: Need to start storing project as parent instead of None for top level Concepts
    distilled_phrasing = ndb.KeyProperty(kind='Phrasing')
    phrasings = ndb.KeyProperty(kind='Phrasing', repeated=True)
    selected_phrasings = ndb.KeyProperty(kind='SelectedPhrasing', repeated=True)
    summary_selected_phrasings = ndb.KeyProperty(kind='SummarySelectedPhrasing', repeated=True)
    presentation_selected_phrasings = ndb.KeyProperty(kind='PresentationSelectedPhrasing', repeated=True)
    crawlcontext = ndb.KeyProperty(kind='CrawlContext', repeated=True)
    summary_crawlcontext = ndb.KeyProperty(kind='SummaryCrawlContext', repeated=True)
    presentation_crawlcontext = ndb.KeyProperty(kind='PresentationCrawlContext', repeated=True)
    media_id = ndb.StringProperty()
    media_blob = ndb.StringProperty()
    media_ready = ndb.BooleanProperty(default=True)
    media_mime_type = ndb.StringProperty()
    linked_to = ndb.StructuredProperty(ConceptLink, repeated=True)

    # Deprecated
    linkes = ndb.KeyProperty(kind='LinkedConcept', repeated=True)

    parent_obj = None
    operations_list = ['admin', 'read', 'write', 'edit_children']

    def get_parent(self, link_id=None):
        if not self.parent:
            return self.project.get()
        return self.parent.get()

    def get_link(self, link_id):
        # noinspection PyTypeChecker
        for link in self.linked_to:
            if link.link_id == link_id:
                return link
        return None

    def is_root(self):
        return False

    @property
    def depth(self):
        depth = 0
        par = self.parent
        while par and par.kind() != 'Project':
            depth += 1
            par = par.get().parent
        return depth

    def get_children(self, user=None):
        q = Concept.query()
        q = q.filter(Concept.parent == self.key)

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

    # noinspection PyUnusedLocal
    def set_parent(self, new_parent, next_sibling, user, link=None):
        if next_sibling:
            index = new_parent.children.index(next_sibling.key)
            if index < 0:
                index = len(new_parent.children)
            if (self.parent == new_parent.key) or (self.parent is None and new_parent.node_type == 'Project'):
                self_index = new_parent.get_concept_index(self) + 1
                if self_index < index:
                    index -= 1
        else:
            index = len(new_parent.children)

        if link:
            old_parent = link.parent.get()
        elif self.parent is None:
            old_parent = self.project.get()
        else:
            old_parent = self.parent.get()

        if self.key in old_parent.children:
            old_parent.children.remove(self.key)
        old_parent.put()
        if new_parent.node_type == 'Project':
            if link:
                link.parent = new_parent.key
            else:
                self.parent = None
            if index is None:
                new_parent.children.append(self.key)
            else:
                new_parent.children.insert(index, self.key)
            if not link:
                self.parent_perms = [new_parent.permissions]
        else:
            if link:
                link.parent = new_parent.key
            else:
                self.parent = new_parent.key
            if index is None:
                new_parent.children.append(self.key)
            else:
                new_parent.children.insert(index, self.key)
            if not link:
                self.parent_perms = new_parent.parent_perms
                self.parent_perms.append(new_parent.permissions)
        if not link and len(self.children) > 0:
            children = ndb.get_multi(self.children)
            for child in children:
                child.update_parent_permissions(self)
        new_parent.put()
        self.put()

    def get_parent_id_list(self, user):
        if self.parent is None:
            return []
        parent = self.parent.get()
        parent_list = []
        while True:
            parent_list.append(parent.key.id())
            if parent.parent is None:
                break
            parent = parent.parent.get()
            if parent.node_type == 'Project':
                break
            if not parent.has_permission_read(user):
                break
        parent_list.reverse()
        return parent_list

    def delete(self, user):
        indexes = user.get_indexes(create_new=False)
        self.rdelete(user, indexes)

    # This is a recursive method that should only be called from within the models.py
    # everyone else should call delete() instead.
    # noinspection PyTypeChecker
    def rdelete(self, user, indexes):
        if not self.has_permission_write(user):
            return False

        if len(self.phrasings) > 0:
            perms = []
            phrasings = ndb.get_multi(self.phrasings)
            for phrase in phrasings:
                perms.append(phrase.permissions)
                phrase.index_delete(indexes)
            ndb.delete_multi(self.phrasings)
            ndb.delete_multi(perms)

        if len(self.selected_phrasings) > 0:
            ndb.delete_multi(self.selected_phrasings)

        if len(self.attributes) > 0:
            ndb.delete_multi(self.attributes)

        if len(self.crawlcontext) > 0:
            ndb.delete_multi(self.crawlcontext)

        if len(self.linkes) > 0:
            links = ndb.get_multi(self.linkes)
            for link in links:
                link.delete(user, False, True)

        children_list = self.get_children()
        for child in children_list:
            if child.rdelete(user, indexes):
                child.key.delete()
            else:
                project = child.project.get()
                project.orphan_concept.append(child.key)
                project.put()

        if self.media_blob is not None:
            self.delete_media()

        self.distilled_phrasing.delete()
        self.permissions.delete()
        self.remove_from_parent(self.project)
        self.key.delete()

        return True

    def delete_media(self):
        # noinspection PyBroadException
        try:
            # noinspection PyTypeChecker
            gcs.delete('/' + server.GCS_BUCKET_NAME + '/' + self.media_id)
        except:
            pass  # Don't want to fail if the media has already be deleted

    def get_parent_list(self, user, auth=True, keys_only=False, ids_only=False, append_self=False):
        parent_list = []
        if auth and not self.has_permission(user, 'read'):
            return None
        if append_self:
            parent = self
        else:
            parent = self.parent.get()
        while not parent.node_type == 'Project':
            if auth and not parent.has_permission(user, 'read'):
                return None
            if keys_only:
                parent_list.append(parent.key)
            elif ids_only:
                parent_list.append(parent.key.id())
            else:
                parent_list.append(parent)
            if parent.parent is None:
                break
            parent = parent.parent.get()
        parent_list.reverse()
        return parent_list

    def get_phrasing(self, doc=None, return_text=True):
        if doc:
            sel_ph = self.get_selected_phrasing(doc.key)
            if not sel_ph:
                if return_text:
                    return self.distilled_phrasing.get().text
                else:
                    return self.distilled_phrasing.get()
            else:
                return sel_ph.phrasing.get().text
        else:
            if return_text:
                return self.distilled_phrasing.get().text
            else:
                return self.distilled_phrasing.get()

    def get_summary_phrasing(self, document):
        sp = self.get_summary_selected_phrasing(document=document)
        if not sp:
            return self.get_phrasing(doc=document, return_text=False)
        return None

    def get_presentation_phrasing(self, document):
        sp = self.get_presentation_selected_phrasing(document=document)
        if not sp:
            return self.get_phrasing(doc=document, return_text=False)
        return None

    def has_selected_phrasing(self, document=None, phrasing=None):
        if document:
            if not isinstance(document, ndb.Key):
                document = document.key
            sel_phrs = ndb.get_multi(self.selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.document == document:
                    return True
        elif phrasing:
            if not isinstance(phrasing, ndb.Key):
                phrasing = phrasing.key
            sel_phrs = ndb.get_multi(self.selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.phrasing == phrasing:
                    return True
        return False

    def has_summary_selected_phrasing(self, document=None, phrasing=None):
        if document:
            if not isinstance(document, ndb.Key):
                document = document.key
            sel_phrs = ndb.get_multi(self.summary_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.document == document:
                    return True
        elif phrasing:
            if not isinstance(phrasing, ndb.Key):
                phrasing = phrasing.key
            sel_phrs = ndb.get_multi(self.summary_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.phrasing == phrasing:
                    return True
        return False

    def has_presentation_selected_phrasing(self, document=None, phrasing=None):
        if document:
            if not isinstance(document, ndb.Key):
                document = document.key
            sel_phrs = ndb.get_multi(self.presentation_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.document == document:
                    return True
        elif phrasing:
            if not isinstance(phrasing, ndb.Key):
                phrasing = phrasing.key
            sel_phrs = ndb.get_multi(self.presentation_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.phrasing == phrasing:
                    return True
        return False

    def get_selected_phrasing(self, document=None, phrasing=None):
        if document:
            if not isinstance(document, ndb.Key):
                document = document.key
            sel_phrs = ndb.get_multi(self.selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.document == document:
                    return sel_phr
        elif phrasing:
            if not isinstance(phrasing, ndb.Key):
                phrasing = phrasing.key
            sel_phr_list = []
            sel_phrs = ndb.get_multi(self.selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.phrasing == phrasing:
                    sel_phr_list.append(sel_phr)
            return sel_phr_list

    def get_summary_selected_phrasing(self, document=None, phrasing=None):
        if document:
            if not isinstance(document, ndb.Key):
                document = document.key
            sel_phrs = ndb.get_multi(self.summary_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.document == document:
                    return sel_phr
        elif phrasing:
            if not isinstance(phrasing, ndb.Key):
                phrasing = phrasing.key
            sel_phr_list = []
            sel_phrs = ndb.get_multi(self.summary_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.phrasing == phrasing:
                    sel_phr_list.append(sel_phr)
            return sel_phr_list

    def get_presentation_selected_phrasing(self, document=None, phrasing=None):
        if document:
            if not isinstance(document, ndb.Key):
                document = document.key
            sel_phrs = ndb.get_multi(self.presentation_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.document == document:
                    return sel_phr
        elif phrasing:
            if not isinstance(phrasing, ndb.Key):
                phrasing = phrasing.key
            sel_phr_list = []
            sel_phrs = ndb.get_multi(self.presentation_selected_phrasings)
            for sel_phr in sel_phrs:
                if sel_phr.phrasing == phrasing:
                    sel_phr_list.append(sel_phr)
            return sel_phr_list

    def get_crawlcontext(self, document=None, project=None, _crawlcontext_list=None):
        crawl = self.get_crawlcontext_by_doc(document=document, _crawlcontext_list=_crawlcontext_list)
        if not crawl:
            crawl = self.get_distilled_crawlcontext(project=project, _crawlcontext_list=_crawlcontext_list)
        return crawl

    def get_summary_crawlcontext(self, document=None, project=None):
        return self.get_crawlcontext(document=document, project=project,
                                     _crawlcontext_list=self.summary_crawlcontext)

    def get_presentation_crawlcontext(self, document=None, project=None):
        return self.get_crawlcontext(document=document, project=project,
                                     _crawlcontext_list=self.presentation_crawlcontext)

    def get_distilled_crawlcontext(self, project=None, _crawlcontext_list=None):
        if not project:
            project = self.project.get()
        if not _crawlcontext_list:
            cc = ndb.get_multi(self.crawlcontext)
        else:
            cc = ndb.get_multi(_crawlcontext_list)
        for c in cc:
            if not c:
                continue
            if c.document == project.distilled_document:
                return c
        return None

    def get_summary_distilled_crawlcontext(self, project=None):
        return self.get_distilled_crawlcontext(project=project, _crawlcontext_list=self.summary_crawlcontext)

    def get_presentation_distilled_crawlcontext(self, project=None):
        return self.get_distilled_crawlcontext(project=project, _crawlcontext_list=self.presentation_crawlcontext)

    def get_crawlcontext_by_doc(self, document=None, _crawlcontext_list=None):
        if not _crawlcontext_list:
            cc = ndb.get_multi(self.crawlcontext)
        else:
            cc = ndb.get_multi(_crawlcontext_list)
        if document:
            for c in cc:
                if not c:
                    continue
                if c.document == document.key:
                    return c
        return None

    def get_summary_crawlcontext_by_doc(self, document=None):
        return self.get_crawlcontext_by_doc(document=document, _crawlcontext_list=self.summary_crawlcontext)

    def get_presentation_crawlcontext_by_doc(self, document=None):
        return self.get_crawlcontext_by_doc(document=document, _crawlcontext_list=self.presentation_crawlcontext)

    def is_crawlable(self, document=None, project=None, _crawlcontext_list=None):
        cc = self.get_crawlcontext(document=document, project=project, _crawlcontext_list=_crawlcontext_list)
        if cc and not cc.crawl:
            return False
        parent = self.get_parent()
        while parent and not parent.is_root():
            cc = parent.get_crawlcontext(document=document, project=project, _crawlcontext_list=_crawlcontext_list)
            if cc and not cc.crawl:
                return False
            parent = parent.get_parent()
        return True

    def is_summary_crawlable(self, document=None, project=None):
        return self.is_crawlable(document=document, project=project, _crawlcontext_list=self.summary_crawlcontext)

    def is_presentation_crawlable(self, document=None, project=None):
        return self.is_crawlable(document=document, project=project, _crawlcontext_list=self.presentation_crawlcontext)

    def update_parent_permissions(self, parent):
        self.parent_perms = parent.parent_perms
        self.parent_perms.append(parent.permissions)
        self.put()

        children = self.get_children()
        if len(children) > 0:
            for child in children:
                child.update_parent_permissions(self)

    def remove_from_parent(self, project):
        if self.parent is not None:
            p = self.parent.get()
            if self.key in p.children:
                p.children.remove(self.key)
                p.put()

        else:  # if self.parent is None then this must be a direct child of a Project
            pro = project.get()
            if self.key in pro.children:
                pro.children.remove(self.key)
                pro.put()

    def remove_document(self, document_key):
        modified = False
        if self.selected_phrasings is not None:
            selected_phrasings = ndb.get_multi(self.selected_phrasings)
            for sp in selected_phrasings:
                if sp.document == document_key:
                    self.selected_phrasings.remove(sp.key)
                    sp.key.delete()
                    modified = True
                    break
        if self.crawlcontext is not None:
            crawlcontext = ndb.get_multi(self.crawlcontext)
            for cc in crawlcontext:
                if cc.document == document_key:
                    self.crawlcontext.remove(cc.key)
                    cc.key.delete()
                    modified = True
                    break
        if self.attributes is not None:
            attributes = ndb.get_multi(self.attributes)
            for a in attributes:
                if a.document == document_key:
                    self.attributes.remove(a.key)
                    a.key.delete()
                    modified = True
                    break
        if modified:  # puts are money, no need to call it if we don't need to :)
            self.put()

    def remove_link_setting(self, document_ids):
        sel_ph = ndb.get_multi(self.selected_phrasings)
        if sel_ph is not None:
            for s in sel_ph:
                if s.document.id() in document_ids:
                    self.selected_phrasings.remove(s.key)
                    s.key.delete()
        crawlc = ndb.get_multi(self.crawlcontext)
        if crawlc is not None:
            for c in crawlc:
                if c.document.id() in document_ids:
                    self.crawlcontext.remove(c.key)
                    c.key.delete()
        attrs = ndb.get_multi(self.attributes)
        if attrs is not None:
            for a in attrs:
                if a.document.id() in document_ids:
                    self.attributes.remove(a.key)
                    a.key.delete()
        children = self.get_children()
        for child in children:
            child.remove_link_setting(document_ids)
            child.put()

    def get_selected_phrasing_by_doc_id(self, doc_id):
        sel_phrs = ndb.get_multi(self.selected_phrasings)
        for sel_phr in sel_phrs:
            if sel_phr.document.id() == doc_id:
                return sel_phr
        return None

    # TODO: This should be moved to ttindex.py
    @staticmethod
    def search_concept(query_dict, user):
        index = user.get_indexes(create_new=False)
        search_results = ttindex.ttsearch(index, query_dict, limit=1000, use_cursor=False, user=user)
        concept_ids = []
        while len(concept_ids) < 20 and search_results is not None:
            for sr in search_results:
                if sr['fields']['con'] not in concept_ids:
                    concept = Concept.get_by_id(sr['fields']['con'])
                    phrasing = ndb.Key('Phrasing', sr['id'])
                    if concept and phrasing:
                        if concept.has_permission(user, 'read') and phrasing.has_permission(user, 'read'):
                            concept_ids.append({'con_id': sr['fields']['con'], 'phr_text': sr['fields']['phr']})
                if len(concept_ids) >= 20:
                    break
            else:
                search_results = ttindex.ttsearch(index, query_dict, limit=1000, user=user)
        return concept_ids

    def index_phrasings(self, indexes, index_children=True):
        if self.distilled_phrasing not in self.phrasings:
            phrasings = [self.distilled_phrasing.get()]
        else:
            phrasings = []
        phrasings += ndb.get_multi(self.phrasings)
        for phr in phrasings:
            phr.index(indexes, concept=self)
        if index_children:
            children = self.get_children()
            for child in children:
                if child:
                    child.index_phrasings(indexes, index_children=index_children)

    @property
    def node_type(self):
        return 'Concept'

    @staticmethod
    def ids_to_keys(ids):
        keys = []
        for id_ in ids:
            if len(id_) == 32:
                keys.append(Concept.create_key(id_))
        return keys

    def to_dict(self, user, project=None, keep_dist=None):
        if self.corrupted:
            raise CorruptedArtifactException()
        d = super(Concept, self).to_dict(user, keep_dist=keep_dist)

        del d['media_blob']
        del d['linked_to']
        del d['linkes']

        if self.parent is None:
            parent = self.project.get()
        else:
            parent = self.parent.get()
        d['parent'] = parent.key.id()

        d['index'] = parent.get_concept_index_adjusted(user, self)
        d['distilled_phrasing'] = d['distilled_phrasing'].id()

        d['phrasings'] = []
        phrasings = ndb.get_multi(self.phrasings)
        for phrasing in phrasings:
            if phrasing is None:
                continue
            if phrasing.has_permission(user, 'read'):
                d['phrasings'].append(phrasing.to_dict(user))

        d['selected_phrasings'] = []
        selected_phrasings = ndb.get_multi(self.selected_phrasings)
        for selected in selected_phrasings:
            if selected is None:
                continue
            doc = selected.document.get()
            if not doc:
                continue
            elif doc.has_permission(user, 'read') or doc.key.id == keep_dist:
                d['selected_phrasings'].append(selected.to_dict())

        d['summary_selected_phrasings'] = []
        summary_selected_phrasings = ndb.get_multi(self.summary_selected_phrasings)
        for selected in summary_selected_phrasings:
            if selected is None:
                continue
            sum_doc = selected.document.get()
            if not sum_doc:
                continue
            doc = sum_doc.document.get()
            if not doc:
                continue
            elif doc.has_permission(user, 'read') or doc.key.id == keep_dist:
                d['summary_selected_phrasings'].append(selected.to_dict())

        d['presentation_selected_phrasings'] = []
        presentation_selected_phrasings = ndb.get_multi(self.presentation_selected_phrasings)
        for selected in presentation_selected_phrasings:
            if selected is None:
                continue
            pres_doc = selected.document.get()
            if not pres_doc:
                continue
            doc = pres_doc.document.get()
            if not doc:
                continue
            elif doc.has_permission(user, 'read') or doc.key.id == keep_dist:
                d['presentation_selected_phrasings'].append(selected.to_dict())

        d['crawlcontext'] = []
        crawlcontexts = ndb.get_multi(self.crawlcontext)
        for crawl in crawlcontexts:
            if crawl is None:
                continue
            doc = crawl.document.get()
            if not doc:
                continue
            elif doc.has_permission(user, 'read') or doc.key.id == keep_dist:
                d['crawlcontext'].append(crawl.to_dict())

        d['summary_crawlcontext'] = []
        summary_crawlcontext = ndb.get_multi(self.summary_crawlcontext)
        for crawl in summary_crawlcontext:
            if crawl is None:
                continue
            sum_doc = crawl.document.get()
            if not sum_doc:
                continue
            doc = sum_doc.document.get()
            if not doc:
                continue
            elif doc.has_permission(user, 'read'):
                d['summary_crawlcontext'].append(crawl.to_dict())

        d['presentation_crawlcontext'] = []
        presentation_crawlcontext = ndb.get_multi(self.presentation_crawlcontext)
        for crawl in presentation_crawlcontext:
            if crawl is None:
                continue
            pres_doc = crawl.document.get()
            if not pres_doc:
                continue
            doc = pres_doc.document.get()
            if not doc:
                continue
            elif doc.has_permission(user, 'read'):
                d['presentation_crawlcontext'].append(crawl.to_dict())

        d['link'] = []
        if project and self.project != project.key:
            # noinspection PyTypeChecker
            for link in self.linked_to:
                # self.linked_to = []
                # self.put()
                if link.project == project.key:
                    link_dict = link.to_dict()
                    link_dict['index'] = link.parent.get().get_concept_index_adjusted(user, self)
                    d['link'].append(link_dict)

        return d