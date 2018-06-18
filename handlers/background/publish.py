import logging
import server
from datetime import datetime
from models.account import Group, User
from google.appengine.api import memcache
from google.appengine.api import background_thread
from cerberus import handlers as cerberus_handlers
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException
from renderengine.publisher import DocumentPublisherEngine, SummaryPublisherEngine, PresentationPublisherEngine
from models.artifacts import Project, Document, PublishDocument, PublishSummary, PublishPresentation, \
    ChannelToken, Transaction

log = logging.getLogger(__file__)


class DocumentPublisherThread(background_thread.BackgroundThread):
    id = None
    request = None
    project = None
    document = None
    group = None
    version = ''
    user = None

    def set_lock(self):
        memcache.set(self.document.id, 'publish-lock', namespace='document_publish_lock', time=60*60)

    def release_lock(self):
        memcache.delete(self.document.id, namespace='document_publish_lock')

    def is_lock(self):
        return memcache.get(self.document.id, namespace='document_publish_lock') is not None

    def cache_publish(self, pub):
        memcache.set(self.id, pub, namespace='document_publish')

    def cache_error(self, error):
        memcache.set(self.id, error, namespace='document_publish')

    def run(self):
        try:
            log.info('Publisher Stated')
            self.set_lock()

            org = self.user.organization.get() if self.user.organization else None

            publisher = DocumentPublisherEngine(
                self.project,
                self.document,
                self.group,
                organization=org
            )

            publisher.render()

            pubs = self.document.get_published(group=self.group)
            version_int = PublishDocument.get_largest_version(pubs)
            if version_int is None:
                version_int = 1
            else:
                version_int += 1

            pub_doc = PublishDocument(key=PublishDocument.create_key())
            pub_doc.project = self.project.key
            pub_doc.document = self.document.key
            pub_doc.group = self.group.key
            pub_doc.version = self.version
            pub_doc.version_int = version_int
            pub_doc.html = publisher.html
            pub_doc.owner.append(self.user.key)
            if self.user.organization:
                pub_doc.organization = self.user.organization

            pub_doc.put()
            pub_doc.cache(latest=True)
            self.document.published.append(pub_doc.key)
            self.document.put()

            trans = Transaction(action='doc_published', user=self.user.key, artifact=self.document.key,
                                project=self.project.key, action_data={'publish': pub_doc.to_dict(html=False)})
            trans.put()

            self.project.pw_modified_ts = datetime.now()
            self.project.put()

            self.cache_publish(pub_doc)

        except:
            self.cache_error('500')
            raise

        finally:
            self.release_lock()
            log.info('Publisher Finished')


class DocumentPublishHandler(AuthorizationRequestHanlder):

    @cerberus_handlers.exception_callback
    def get(self, project, document, group):
        if not project:
            raise HttpErrorException.bad_request('invalid project given')
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project given')
        if not project.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        if not group:
            raise HttpErrorException.bad_request('invalid group given')
        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group given')

        temp_user = User()
        temp_user.groups = [group.key, Group.get_worldshare().key]
        org = self.user.organization if self.user.organization else None
        if org:
            temp_user.organization = org

        if not document.has_permission_read(temp_user):
            raise HttpErrorException.bad_request('Group does not have permission to read the document')

        if document.key not in project.documents and document.key != project.distilled_document:
            raise HttpErrorException.bad_request('document does not belong to project')

        pubs = document.get_published(group=group)
        version_int = PublishDocument.get_largest_version(pubs)
        if version_int is None:
            version_int = 1
        else:
            version_int += 1

        version = self.request.get('version', str(version_int))
        if version == 'latest':
            raise HttpErrorException.bad_request('invalid version given')

        pubs = document.get_published(group=group)
        for pub in pubs:
            if pub.version == version:
                raise HttpErrorException.bad_request('version name already taken')

        publisher = DocumentPublisherThread()
        publisher.id = server.create_uuid()
        publisher.request = self
        publisher.project = project
        publisher.document = document
        publisher.group = group
        publisher.user = self.user
        publisher.version = version

        if publisher.is_lock():
            raise HttpErrorException.bad_request('publisher already running')
        publisher.start()

        self.write_json_response({'id': publisher.id})

        self.get_analytic_session()
        document.record_analytic('doc_publish', self.analytic_session, project=project.key)


class SummaryPublisherThread(background_thread.BackgroundThread):
    id = None
    request = None
    project = None
    document = None
    word_count = None
    group = None
    version = ''
    user = None

    def set_lock(self):
        memcache.set(self.document.id, 'publish-lock', namespace='summary_publish_lock', time=60 * 60)

    def release_lock(self):
        memcache.delete(self.document.id, namespace='summary_publish_lock')

    def is_lock(self):
        return memcache.get(self.document.id, namespace='summary_publish_lock') is not None

    def cache_publish(self, pub):
        memcache.set(self.id, pub, namespace='document_publish')

    def cache_error(self, error):
        memcache.set(self.id, error, namespace='document_publish')

    def run(self):
        try:
            log.info('Publisher Stated')
            self.set_lock()

            org = self.user.organization.get() if self.user.organization else None

            publisher = SummaryPublisherEngine(
                self.project,
                self.document,
                self.word_count,
                self.group,
                organization=org
            )

            publisher.render()

            pubs = self.document.get_summary_published(group=self.group)
            version_int = PublishSummary.get_largest_version(pubs)
            if version_int is None:
                version_int = 1
            else:
                version_int += 1

            pub_doc = PublishSummary(key=PublishSummary.create_key())
            pub_doc.project = self.project.key
            pub_doc.document = self.document.key
            pub_doc.group = self.group.key
            pub_doc.version = self.version
            pub_doc.version_int = version_int
            pub_doc.word_count = self.word_count
            pub_doc.html = publisher.html
            pub_doc.owner.append(self.user.key)
            if self.user.organization:
                pub_doc.organization = self.user.organization

            pub_doc.put()
            pub_doc.cache(latest=True)
            self.document.summary_published.append(pub_doc.key)
            self.document.put()

            trans = Transaction(action='sum_published', user=self.user.key, artifact=self.document.key,
                                project=self.project.key, action_data={'publish': pub_doc.to_dict(html=False)})
            trans.put()

            self.project.pw_modified_ts = datetime.now()
            self.project.put()

            self.cache_publish(pub_doc)

        except:
            self.cache_error('500')
            raise

        finally:
            self.release_lock()
            log.info('Publisher Finished')


class SummaryPublishHandler(AuthorizationRequestHanlder):

    @cerberus_handlers.exception_callback
    def get(self, project, document, group):
        if not project:
            raise HttpErrorException.bad_request('invalid project given')
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project given')
        if not project.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        if not group:
            raise HttpErrorException.bad_request('invalid group given')
        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group given')

        if document.key not in project.documents and document.key != project.distilled_document:
            raise HttpErrorException.bad_request('document does not belong to project')

        temp_user = User()
        temp_user.groups = [group.key, Group.get_worldshare().key]
        org = self.user.organization if self.user.organization else None
        if org:
            temp_user.organization = org

        if not document.has_permission_read(temp_user):
            raise HttpErrorException.bad_request('Group does not have permission to read the document')

        pubs = document.get_summary_published(group=group)
        version_int = PublishDocument.get_largest_version(pubs)
        if version_int is None:
            version_int = 1
        else:
            version_int += 1

        version = self.request.get('version', str(version_int))
        if version == 'latest':
            raise HttpErrorException.bad_request('invalid version given')

        try:
            word_count = int(self.request.get('word_count', 250))
        except ValueError:
            raise HttpErrorException.bad_request('invalid word count, must be integer')

        if word_count < 100:
            raise HttpErrorException.bad_request('invalid word_count given min 100')

        if word_count > 2500:
            raise HttpErrorException.bad_request('invalid word_count given max 2500')

        pubs = document.get_summary_published(group=group)
        for pub in pubs:
            if pub.version == version:
                raise HttpErrorException.bad_request('version name already taken')

        publisher = SummaryPublisherThread()
        publisher.id = server.create_uuid()
        publisher.request = self
        publisher.project = project
        publisher.document = document
        publisher.word_count = word_count
        publisher.group = group
        publisher.user = self.user
        publisher.version = version

        if publisher.is_lock():
            raise HttpErrorException.bad_request('publisher already running')
        publisher.start()

        self.write_json_response({'id': publisher.id})

        self.get_analytic_session()
        document.record_analytic('sum_publish', self.analytic_session, project=project.key)


class PresentationPublisherThread(background_thread.BackgroundThread):
    id = None
    request = None
    project = None
    document = None
    slide_count = None
    min_bullet = None
    max_bullet = None
    group = None
    version = ''
    user = None

    def set_lock(self):
        memcache.set(self.document.id, 'publish-lock', namespace='presentation_publish_lock', time=60 * 60)

    def release_lock(self):
        memcache.delete(self.document.id, namespace='presentation_publish_lock')

    def is_lock(self):
        return memcache.get(self.document.id, namespace='presentation_publish_lock') is not None

    def cache_publish(self, pub):
        memcache.set(self.id, pub, namespace='document_publish')

    def cache_error(self, error):
        memcache.set(self.id, error, namespace='document_publish')

    def run(self):
        try:
            log.info('Publisher Stated')
            self.set_lock()

            org = self.user.organization.get() if self.user.organization else None

            publisher = PresentationPublisherEngine(
                self.project,
                self.document,
                self.slide_count,
                self.min_bullet,
                self.max_bullet,
                self.group,
                organization=org
            )

            publisher.render()

            pubs = self.document.get_presentation_published(group=self.group)
            version_int = PublishPresentation.get_largest_version(pubs)
            if version_int is None:
                version_int = 1
            else:
                version_int += 1

            pub_doc = PublishPresentation(key=PublishPresentation.create_key())
            pub_doc.project = self.project.key
            pub_doc.document = self.document.key
            pub_doc.group = self.group.key
            pub_doc.version = self.version
            pub_doc.version_int = version_int
            pub_doc.slide_count = self.slide_count
            pub_doc.min_bullet = self.min_bullet
            pub_doc.max_bullet = self.max_bullet
            pub_doc.html = publisher.html
            pub_doc.owner.append(self.user.key)
            if self.user.organization:
                pub_doc.organization = self.user.organization

            pub_doc.put()
            pub_doc.cache(latest=True)
            self.document.presentation_published.append(pub_doc.key)
            self.document.put()

            trans = Transaction(action='pres_published', user=self.user.key, artifact=self.document.key,
                                project=self.project.key, action_data={'publish': pub_doc.to_dict(html=False)})
            trans.put()

            self.project.pw_modified_ts = datetime.now()
            self.project.put()

            self.cache_publish(pub_doc)

        except:
            self.cache_error('500')
            raise
        finally:
            self.release_lock()
            log.info('Publisher Finished')


class PresentationPublishHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, project, document, group):
        if not project:
            raise HttpErrorException.bad_request('invalid project given')
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project given')
        if not project.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        if not group:
            raise HttpErrorException.bad_request('invalid group given')
        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group given')

        if document.key not in project.documents and document.key != project.distilled_document:
            raise HttpErrorException.bad_request('document does not belong to project')

        temp_user = User()
        temp_user.groups = [group.key, Group.get_worldshare().key]
        org = self.user.organization if self.user.organization else None
        if org:
            temp_user.organization = org

        if not document.has_permission_read(temp_user):
            raise HttpErrorException.bad_request('Group does not have permission to read the document')

        pubs = document.get_presentation_published(group=group)
        version_int = PublishDocument.get_largest_version(pubs)
        if version_int is None:
            version_int = 1
        else:
            version_int += 1

        version = self.request.get('version', str(version_int))
        if version == 'latest':
            raise HttpErrorException.bad_request('invalid version given')

        for pub in pubs:
            if pub.version == version:
                raise HttpErrorException.bad_request('version name already taken')

        try:
            slide_count = int(self.request.get('slide_count', 15))
        except ValueError:
            raise HttpErrorException.bad_request('invalid slide count, must be integer')
        if slide_count < 1:
            raise HttpErrorException.bad_request('invalid slide_count given min 1')
        if slide_count > 100:
            raise HttpErrorException.bad_request('invalid slide_count given max 100')

        try:
            min_bullet = int(self.request.get('min_bullet', 4))
        except ValueError:
            raise HttpErrorException.bad_request('invalid min bullet, must be integer')
        if min_bullet < 1:
            raise HttpErrorException.bad_request('invalid min_bullet given min 1')
        if min_bullet > 15:
            raise HttpErrorException.bad_request('invalid min_bullet given max 15')

        try:
            max_bullet = int(self.request.get('max_bullet', 6))
        except ValueError:
            raise HttpErrorException.bad_request('invalid max bullet, must be integer')
        if max_bullet < 1:
            raise HttpErrorException.bad_request('invalid max_bullet given min 1')
        if max_bullet > 15:
            raise HttpErrorException.bad_request('invalid max_bullet given max 15')

        if min_bullet > max_bullet:
            raise HttpErrorException.bad_request('min_bullet can not be greater than max_bullet')

        publisher = PresentationPublisherThread()
        publisher.id = server.create_uuid()
        publisher.request = self
        publisher.project = project
        publisher.document = document
        publisher.slide_count = slide_count
        publisher.min_bullet = min_bullet
        publisher.max_bullet = max_bullet
        publisher.group = group
        publisher.user = self.user
        publisher.version = version

        if publisher.is_lock():
            raise HttpErrorException.bad_request('publisher already running')
        publisher.start()

        self.write_json_response({'id': publisher.id})

        self.get_analytic_session()
        document.record_analytic('pres_publish', self.analytic_session, project=project.key)