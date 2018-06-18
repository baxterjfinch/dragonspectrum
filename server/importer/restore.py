import json
import StringIO
import base64
import zipfile
import logging
import server
import cloudstorage as gcs
from uuid import uuid1
from models.artifacts import Project, Document, Concept, Attributes, CrawlContext, \
    SelectedPhrasing, Phrasing, Permission
from models.importer import Restore
from server import tt_logging
from google.appengine.ext import ndb, deferred, blobstore
from google.appengine.api import memcache

log = logging.getLogger('tt')


class ProjectRestore(object):
    def __init__(self):
        self.id = self.create_uuid()

    @staticmethod
    def create_uuid():
        return uuid1().get_hex()

    @staticmethod
    def get_restore_status(restore_id):
        restore_status = Restore.get_by_id(restore_id)
        if restore_status.restore_status == 'not started':
            status = {'status': 'not started'}
        elif restore_status.restore_status == 'started':
            status = {'status': 'running'}
        elif restore_status.restore_status == 'finished':
            status = {'status': 'finished'}
        elif restore_status.restore_status == 'failed':
            status = {'status': 'failed'}
        else:
            status = {'status': 'unknown'}
        return status

    @staticmethod
    def get_restore_results(restore_id):
        restore_status = {'results': 'none'}
        project_id = memcache.get(key=restore_id + '_result')
        if project_id is not None:
            restore_status = {'results': project_id}
            restore = Restore.get_by_id(restore_id)
            if restore is not None:
                restore.key.delete()
        return restore_status

    @staticmethod
    def restore(request, request_user):
        project_restore = ProjectRestore()
        restore_status = Restore(id=project_restore.id, restore_status='not started')
        restore_status.put()
        log.info('User is restoring project: restore id: %s', project_restore.id, extra={'user': request_user})
        filename = '/' + server.GCS_BUCKET_NAME + '/importerdata/' + project_restore.id
        f = gcs.open(filename, mode='w', content_type='text/text')
        f.write(request.get('base64').encode('UTF-8'))
        f.close()
        deferred.defer(project_restore.start_restore, request_user, _queue='projectRestore')
        return {'status': 'not started', 'restore_id': project_restore.id}

    def start_restore(self, request_user):
        restore_status = Restore.get_by_id(self.id)
        restore_status.restore_status = 'started'
        restore_status.put()
        filename = '/' + server.GCS_BUCKET_NAME + '/importerdata/' + self.id
        f = gcs.open(filename, mode='r')
        base64_project = f.read()
        f.close()
        gcs.delete(filename)
        project_zip_blob = base64.decodestring(base64_project)
        zip_file = zipfile.ZipFile(StringIO.StringIO(project_zip_blob), 'r')
        info_list = zip_file.infolist()
        project_file = zip_file.open(info_list[0], 'r')
        project_json = json.load(project_file)
        if 'version' in project_json:
            if project_json['version'] == 1:
                project = self.restore_v1(project_json, request_user, zip_file)
            elif project_json['version'] == 2:
                project = self.restore_v2(project_json, request_user, zip_file)
            else:
                project = self.restore_v1(project_json, request_user, zip_file)
        else:
            project = self.restore_v1(project_json, request_user, zip_file)
        memcache.add(key=self.id + '_result', value=project.key.id(), time=600)
        restore_status.restore_status = 'finished'
        restore_status.put()

    def restore_v1(self, project_json, request_user, zip_file):
        doc_perm = Permission(key=Permission.create_key(),
                              permissions=Permission.init_perm_struct(Document.operations_list))
        pro_perm = Permission(key=Permission.create_key(),
                              permissions=Permission.init_perm_struct(Project.operations_list))
        document = Document(
            key=Document.create_key(),
            title=project_json['distilled_document']['title'],
            author=project_json['distilled_document']['author'],
            subtitle=project_json['distilled_document']['subtitle'],
            date=project_json['distilled_document']['date'],
            copyright_text=project_json['distilled_document']['copyright_text'],
            description=project_json['distilled_document']['description'],
            owner=[request_user.key],
            permissions=doc_perm.key
        )
        project = Project(key=Project.create_key(), title=project_json['title'], distilled_document=document.key,
                          permissions=pro_perm.key, owner=[request_user.key])
        document.project = project.key
        document.parent_perms.append(pro_perm.key)
        if request_user.in_org():
            document.organization = request_user.organization
            project.organization = request_user.organization
        doc_perm.artifact = document.key
        doc_perm.project = project.key
        pro_perm.artifact = project.key
        pro_perm.project = project.key
        ndb.put_multi([doc_perm, pro_perm, document, project])

        # We do not want to re-use the old project, document, concept, ... ids so we will create a mapping
        # from old to new :)
        id_mapping = {project_json['id']: project.key.id(),
                      project_json['distilled_document']['id']: project.distilled_document.id()}

        documents = {project.distilled_document.id(): project.distilled_document.get()}
        for doc_json in project_json['documents']:
            doc_json['project_id'] = project.key.id()
            doc_perm = Permission(key=Permission.create_key(), project=project.key,
                                  permissions=Permission.init_perm_struct(Document.operations_list))
            doc_obj = Document(
                key=Document.create_key(),
                title=doc_json['title'],
                author=doc_json['author'],
                subtitle=doc_json['subtitle'],
                date=doc_json['date'],
                copyright_text=doc_json['copyright_text'],
                description=doc_json['description'],
                owner=[request_user.key],
                permissions=doc_perm.key,
                project=project.key
            )

            doc_perm.artifact = doc_obj.key
            doc_obj.put()
            doc_perm.put()
            project.documents.append(doc_obj.key)
            id_mapping[doc_json['id']] = doc_obj.key.id()
            documents[doc_obj.key.id()] = doc_obj
        project.put()
        model_array = []
        project.children = self.restore_concept_from_json_v1(project, project_json['concepts'], id_mapping,
                                                             request_user, model_array, None, documents, zip_file)

        ndb.put_multi(model_array)
        Phrasing.index_multi(model_array, request_user)
        project.put()
        return project

    def restore_concept_from_json_v1(self, project, concepts, id_mapping, request_user,
                                     model_array, parent, documents, zip_file):
        concepts_key_array = []
        for con_json in concepts:
            con_json['distilled_phrasing_text'] = con_json['phrasings'][con_json['distilled_phrasing']]
            phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                                  key=Permission.create_key(), project=project.key)
            con_perm = Permission(permissions=Permission.init_perm_struct(Concept.operations_list),
                                  key=Permission.create_key(), project=project.key)
            distilled_phrasing = Phrasing(key=Phrasing.create_key(),
                                          text=con_json['phrasings'][con_json['distilled_phrasing']],
                                          owner=[request_user.key], permissions=phr_perm.key,
                                          originating_document=project.distilled_document,
                                          project=project.key)
            concept = Concept(
                key=Concept.create_key(),
                owner=[request_user.key],
                parent=parent.key if parent else None,
                project=project.key,
                distilled_phrasing=distilled_phrasing.key,
                phrasings=[distilled_phrasing.key],
                permissions=con_perm.key
            )
            if parent:
                parent.children.append(concept.key)
                concept.parent_perms = parent.parent_perms
                concept.parent_perms.append(parent.permissions)
            else:
                project.children.append(concept.key)
                concept.parent_perms.append(project.permissions)
            phr_perm.artifact = distilled_phrasing.key
            con_perm.artifact = concept.key
            distilled_phrasing.concept = concept.key
            if request_user.in_org():
                distilled_phrasing.organization = request_user.organization
                concept.organization = request_user.organization
            model_array += [phr_perm, con_perm, distilled_phrasing, concept]
            id_mapping[con_json['id']] = concept.key.id()
            id_mapping[con_json['distilled_phrasing']] = distilled_phrasing.key.id()

            for doc_id in con_json['attributes'].keys():
                try:
                    attribute = Attributes(key=Attributes.create_key(), project=project.key,
                                           document=documents[id_mapping[doc_id]].key,
                                           attributes=con_json['attributes'][doc_id])
                    concept.attributes.append(attribute.key)
                    model_array.append(attribute)
                except KeyError:
                    continue

            for doc_id in con_json['crawlcontext'].keys():
                try:
                    crawlcontext = CrawlContext(key=CrawlContext.create_key(), project=project.key,
                                                document=documents[id_mapping[doc_id]].key,
                                                crawl=con_json['crawlcontext'][doc_id])
                    concept.crawlcontext.append(crawlcontext.key)
                    model_array.append(crawlcontext)
                except KeyError:
                    continue

            new_phrasing_dict = {}
            for phrasing_id in con_json['phrasings'].keys():
                if phrasing_id != con_json['distilled_phrasing']:
                    try:
                        phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                                              key=Permission.create_key(), project=project.key)
                        phrasing = Phrasing(key=Phrasing.create_key(), concept=concept.key,
                                            text=con_json['phrasings'][phrasing_id],
                                            owner=[request_user.key], permissions=phr_perm.key,
                                            originating_document=project.distilled_document,
                                            project=project.key)
                        phr_perm.artifact = phrasing.key
                        new_phrasing_dict[phrasing.key.id()] = phrasing
                        concept.phrasings.append(phrasing.key)
                        id_mapping[phrasing_id] = phrasing.key.id()
                        model_array.append(phrasing)
                        model_array.append(phr_perm)
                    except KeyError:
                        continue

                else:
                    new_phrasing_dict[distilled_phrasing.key.id()] = distilled_phrasing

            for doc_id in con_json['selected_phrasings'].keys():
                try:
                    selected_phrasing = SelectedPhrasing(key=SelectedPhrasing.create_key(), project=project.key,
                                                         document=documents[id_mapping[doc_id]].key,
                                                         phrasing=new_phrasing_dict[id_mapping[
                                                             con_json['selected_phrasings'][doc_id]]].key)
                    concept.selected_phrasings.append(selected_phrasing.key)
                    model_array.append(selected_phrasing)
                except KeyError:
                    continue

            if 'is_media' in con_json.keys():
                if con_json['is_media']:
                    if 'image' in con_json['content_type']:
                        concept.media_id = server.create_uuid()
                        if 'id_real' in con_json.keys():
                            image = zip_file.open('images/' + con_json['id_real'], 'r')
                        else:
                            image = zip_file.open('images/' + con_json['id'], 'r')
                        filename = '/' + server.GCS_BUCKET_NAME + '/' + concept.media_id
                        f = gcs.open(filename, mode='w', content_type=con_json['content_type'])
                        f.write(image.read())
                        f.close()
                        concept.media_blob = blobstore.create_gs_key('/gs' + filename)

            if con_json['children'] is not None:
                self.restore_concept_from_json_v1(project, con_json['children'], id_mapping,
                                                  request_user, model_array, concept, documents, zip_file)

            concepts_key_array.append(concept.key)

        return concepts_key_array

    def restore_v2(self, project_json, request_user, zip_file):
        doc_perm = Permission(key=Permission.create_key(),
                              permissions=Permission.init_perm_struct(Document.operations_list))
        pro_perm = Permission(key=Permission.create_key(),
                              permissions=Permission.init_perm_struct(Project.operations_list))

        document = Document(
            key=Document.create_key(),
            title=project_json['distilled_document']['title'],
            author=project_json['distilled_document']['author'],
            subtitle=project_json['distilled_document']['subtitle'],
            date=project_json['distilled_document']['date'],
            copyright_text=project_json['distilled_document']['copyright_text'],
            description=project_json['distilled_document']['description'],
            owner=[request_user.key],
            permissions=doc_perm.key
        )

        project = Project(key=Project.create_key(), title=project_json['title'], distilled_document=document.key,
                          permissions=pro_perm.key, owner=[request_user.key])

        document.project = project.key
        document.parent_perms.append(pro_perm.key)
        if request_user.in_org():
            document.organization = request_user.organization
            project.organization = request_user.organization
        doc_perm.artifact = document.key
        doc_perm.project = project.key
        pro_perm.artifact = project.key
        pro_perm.project = project.key
        ndb.put_multi([doc_perm, pro_perm, document, project])

        # We do not want to re-use the old project, document, concept, ... ids so we will create a mapping
        # from old to new :)
        id_mapping = {project_json['id']: project.key.id(),
                      project_json['distilled_document']['id']: project.distilled_document.id()}

        documents = {project.distilled_document.id(): project.distilled_document.get()}
        for doc_json in project_json['documents']:
            doc_json['project_id'] = project.key.id()
            doc_perm = Permission(key=Permission.create_key(), project=project.key,
                                  permissions=Permission.init_perm_struct(Document.operations_list))
            doc_obj = Document(
                key=Document.create_key(),
                title=doc_json['title'],
                author=doc_json['author'],
                subtitle=doc_json['subtitle'],
                date=doc_json['date'],
                copyright_text=doc_json['copyright_text'],
                description=doc_json['description'],
                owner=[request_user.key],
                permissions=doc_perm.key,
                project=project.key
            )

            doc_perm.artifact = doc_obj.key
            doc_obj.put()
            doc_perm.put()
            project.documents.append(doc_obj.key)
            id_mapping[doc_json['id']] = doc_obj.key.id()
            documents[doc_obj.key.id()] = doc_obj
        project.put()
        model_array = []

        for attr in project_json['attributes']:
            try:
                attribute = Attributes(key=Attributes.create_key(), project=project.key,
                                       document=documents[id_mapping[attr['doc_id']]].key,
                                       attributes=attr['attributes'])
                project.attributes.append(attribute.key)
                model_array.append(attribute)
            except KeyError:
                continue

        project.children = self.restore_concept_from_json_v2(project, project_json['children'], id_mapping,
                                                             request_user, model_array, None, documents,
                                                             zip_file)

        ndb.put_multi(model_array)
        Phrasing.index_multi(model_array, request_user)
        project.put()
        return project

    def restore_concept_from_json_v2(self, project, concepts, id_mapping, request_user,
                                     model_array, parent, documents, zip_file):
        concepts_key_array = []
        for con_json in concepts:
            con_json['distilled_phrasing_text'] = con_json['distilled_phrasing']['text']
            phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                                  key=Permission.create_key(), project=project.key)
            con_perm = Permission(permissions=Permission.init_perm_struct(Concept.operations_list),
                                  key=Permission.create_key(), project=project.key)
            distilled_phrasing = Phrasing(key=Phrasing.create_key(),
                                          text=con_json['distilled_phrasing']['text'],
                                          owner=[request_user.key], permissions=phr_perm.key,
                                          originating_document=project.distilled_document,
                                          project=project.key)
            concept = Concept(
                key=Concept.create_key(),
                owner=[request_user.key],
                parent=parent.key if parent else None,
                project=project.key,
                distilled_phrasing=distilled_phrasing.key,
                phrasings=[distilled_phrasing.key],
                permissions=con_perm.key
            )

            if parent:
                parent.children.append(concept.key)
                concept.parent_perms = parent.parent_perms
                concept.parent_perms.append(parent.permissions)
            else:
                project.children.append(concept.key)
                concept.parent_perms.append(project.permissions)

            phr_perm.artifact = distilled_phrasing.key
            con_perm.artifact = concept.key
            distilled_phrasing.concept = concept.key

            if request_user.in_org():
                distilled_phrasing.organization = request_user.organization
                concept.organization = request_user.organization

            model_array += [phr_perm, con_perm, distilled_phrasing, concept]
            id_mapping[con_json['id']] = concept.key.id()
            id_mapping[con_json['distilled_phrasing']['id']] = distilled_phrasing.key.id()

            if con_json['id'] == "c3598ccc0b5511e4b7839bfd6cb32178":
                pass

            for attr in con_json['attributes']:
                try:
                    attribute = Attributes(key=Attributes.create_key(), project=project.key,
                                           document=documents[id_mapping[attr['document']]].key,
                                           attributes=attr['attributes'])
                    concept.attributes.append(attribute.key)
                    model_array.append(attribute)
                except KeyError:
                    continue

            for crawl in con_json['crawlcontexts']:
                try:
                    crawlcontext = CrawlContext(key=CrawlContext.create_key(), project=project.key,
                                                document=documents[id_mapping[crawl['document']]].key,
                                                crawl=crawl['crawl'])
                    concept.crawlcontext.append(crawlcontext.key)
                    model_array.append(crawlcontext)
                except KeyError:
                    continue

            new_phrasing_dict = {}
            for phrasing_dict in con_json['phrasings']:
                if phrasing_dict['id'] != con_json['distilled_phrasing']['id']:
                    try:
                        phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                                              key=Permission.create_key(), project=project.key)

                        phrasing = Phrasing(key=Phrasing.create_key(), concept=concept.key,
                                            text=phrasing_dict['text'],
                                            owner=[request_user.key], permissions=phr_perm.key,
                                            originating_document=project.distilled_document,
                                            project=project.key)

                        phr_perm.artifact = phrasing.key
                        new_phrasing_dict[phrasing.key.id()] = phrasing
                        concept.phrasings.append(phrasing.key)
                        id_mapping[phrasing_dict['id']] = phrasing.key.id()
                        model_array.append(phrasing)
                        model_array.append(phr_perm)
                    except KeyError:
                        continue

                else:
                    new_phrasing_dict[distilled_phrasing.key.id()] = distilled_phrasing

            for sel_phr in con_json['selected_phrasings']:
                try:
                    selected_phrasing = SelectedPhrasing(key=SelectedPhrasing.create_key(), project=project.key,
                                                         document=documents[id_mapping[sel_phr['document']]].key,
                                                         phrasing=new_phrasing_dict[id_mapping[sel_phr['phrsing']]].key)
                    concept.selected_phrasings.append(selected_phrasing.key)
                    model_array.append(selected_phrasing)
                except KeyError:
                    continue

            if 'is_media' in con_json.keys():
                if con_json['is_media']:
                    if 'image' in con_json['content_type']:
                        concept.media_id = server.create_uuid()
                        image = zip_file.open('images/' + con_json['id'], 'r')
                        filename = '/' + server.GCS_BUCKET_NAME + '/' + concept.media_id
                        f = gcs.open(filename, mode='w', content_type=con_json['content_type'])
                        f.write(image.read())
                        f.close()
                        concept.media_blob = blobstore.create_gs_key('/gs' + filename)

            if con_json['children'] is not None:
                self.restore_concept_from_json_v2(project, con_json['children'], id_mapping,
                                                  request_user, model_array, concept, documents, zip_file)

            concepts_key_array.append(concept.key)

        return concepts_key_array