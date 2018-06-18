import logging
import datetime
from cerberus import handlers as cerberus_handlers
from google.appengine.api import memcache

import server
from models.account import User, Group
from models.analytic import AnalyticsSession, Analytics
from server.handlers import JINJA_ENVIRONMENT
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException
from models.artifacts import Document, Project, Concept, PublishDocument, PublishSummary, \
    PublishPresentation

__all__ = [
    'DocumentPublishStatus',
    'DocumentGroupPublishHandler',
    'DocumentPublishHandler',
    'DocumentPublishAnalyticHandler',
    'SummaryGroupPublishHandler',
    'SummaryPublishHandler',
    'SummaryPublishAnalyticHandler',
    'PresentationGroupPublishHandler',
    'PresentationPublishHandler',
    'PresentationPublishAnalyticHandler',
]


log = logging.getLogger('tt')


class DocumentPublishStatus(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, publish):
        if not publish:
            raise HttpErrorException.bad_request('invalid publish id given')
        pub = memcache.get(publish, namespace='document_publish')
        if not pub:
            raise HttpErrorException.not_found()

        if pub == '500':
            self.write_json_response({'error': 500})
        else:
            document = pub.document.get()
            if not document.has_permission_read(self.user):
                raise HttpErrorException.forbidden()

            self.write_json_response(pub.to_dict(html=False))


class DocumentPublish(AuthorizationRequestHanlder):
    document = None
    project = None

    def get_publish(self, document, group):
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group id')

        self.project = document.project.get()
        version = self.request.get('v', 'latest')
        pub = PublishDocument.get(document, group, version)

        if not pub:
            raise HttpErrorException.not_found()

        if pub.group not in self.user.groups and pub.group != Group.get_worldshare_key():
            raise HttpErrorException.forbidden()

        self._create_analytic_session()
        self.project.record_analytic('pro_opn', self.analytic_session)

        template_index = JINJA_ENVIRONMENT.get_template('document_public.html')
        return template_index.render({
            'title': self.project.title,
            'version': pub.version,
            'created_at': pub.created_ts,
            'published_to': pub.group.get().name,
            'an_token': self.analytic_session.key.id(),
            'project_id': self.project.id,
            'html': pub.html,
        })

    def _create_analytic_session(self):
        analytic_session = AnalyticsSession(
            id=server.create_uuid(),
            ip_addr=self.request.remote_addr,
            user_agent=self.request.user_agent,
            host=self.request.host,
            host_url=self.request.host_url,
            project=self.project.key,
            referer=self.request.referer,
        )
        if not self.user.is_world_user():
            analytic_session.user = self.user.key
        analytic_session.put()
        memcache.add(analytic_session.key.id(), analytic_session, namespace='analytics')
        self.analytic_session = analytic_session

    @cerberus_handlers.exception_callback
    def delete(self, publish):
        publish = PublishDocument.get_by_id(publish)
        if not publish:
            raise HttpErrorException.bad_request('invalid publish id')
        document = publish.document.get()
        if not document:
            raise HttpErrorException.bad_request('document does not exists')
        if not document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        if publish.key in document.published:
            document.published.remove(publish.key)
            document.put()
        publish.key.delete()

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True


class DocumentGroupPublishHandler(DocumentPublish):
    @cerberus_handlers.exception_callback
    def get(self, document, group):
        self.response.write(self.get_publish(document, group))


class DocumentPublishHandler(DocumentPublish):
    @cerberus_handlers.exception_callback
    def get(self, document):
        group = Group.get_worldshare()
        self.response.write(self.get_publish(document, group))


class DocumentPublishAnalyticHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, project, concept, action):
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        concept = Concept.get_by_id(concept)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')

        if action.rstrip() == '' or not Analytics.is_valid_action(action):
            raise HttpErrorException.bad_request('invalid action')

        self.get_analytic_session()
        concept.record_analytic(action, self.analytic_session, project=project.key)


class SummaryPublish(AuthorizationRequestHanlder):
    document = None
    project = None

    def get_publish(self, document, group):
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group id')

        self.project = document.project.get()
        version = self.request.get('v', 'latest')
        pub = PublishSummary.get(document, group, version)

        if not pub:
            raise HttpErrorException.not_found()

        if pub.group not in self.user.groups and pub.group != Group.get_worldshare_key():
            raise HttpErrorException.forbidden()

        self._create_analytic_session()
        self.project.record_analytic('pro_opn', self.analytic_session)

        template_index = JINJA_ENVIRONMENT.get_template('summary_public.html')
        return template_index.render({
            'title': self.project.title,
            'version': pub.version,
            'created_at': pub.created_ts,
            'published_to': pub.group.get().name,
            'an_token': self.analytic_session.key.id(),
            'project_id': self.project.id,
            'html': pub.html,
        })

    def _create_analytic_session(self):
        analytic_session = AnalyticsSession(
            id=server.create_uuid(),
            ip_addr=self.request.remote_addr,
            user_agent=self.request.user_agent,
            host=self.request.host,
            host_url=self.request.host_url,
            project=self.project.key,
            referer=self.request.referer,
        )
        if not self.user.is_world_user():
            analytic_session.user = self.user.key
        analytic_session.put()
        memcache.add(analytic_session.key.id(), analytic_session, namespace='analytics')
        self.analytic_session = analytic_session

    @cerberus_handlers.exception_callback
    def delete(self, publish):
        publish = PublishSummary.get_by_id(publish)
        if not publish:
            raise HttpErrorException.bad_request('invalid publish id')
        document = publish.document.get()
        if not document:
            raise HttpErrorException.bad_request('document does not exists')
        if not document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        publish.key.delete()

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True


class SummaryGroupPublishHandler(SummaryPublish):
    @cerberus_handlers.exception_callback
    def get(self, document, group):
        self.response.write(self.get_publish(document, group))


class SummaryPublishHandler(SummaryPublish):
    @cerberus_handlers.exception_callback
    def get(self, document):
        group = Group.get_worldshare()
        self.response.write(self.get_publish(document, group))


class SummaryPublishAnalyticHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, project, concept, action):
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        concept = Concept.get_by_id(concept)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')

        if action.rstrip() == '' or not Analytics.is_valid_action(action):
            raise HttpErrorException.bad_request('invalid action')

        self.get_analytic_session()
        concept.record_analytic(action, self.analytic_session, project=project.key)


class PresentationPublish(AuthorizationRequestHanlder):
    document = None
    project = None

    def get_publish(self, document, group):
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group id')

        self.project = document.project.get()
        version = self.request.get('v', 'latest')
        pub = PublishPresentation.get(document, group, version)

        if not pub:
            raise HttpErrorException.not_found()

        if pub.group not in self.user.groups and pub.group != Group.get_worldshare_key():
            raise HttpErrorException.forbidden()

        self._create_analytic_session()
        self.project.record_analytic('pro_opn', self.analytic_session)

        template_index = JINJA_ENVIRONMENT.get_template('presentation_public.html')
        return template_index.render({
            'title': self.project.title,
            'version': pub.version,
            'created_at': pub.created_ts,
            'published_to': pub.group.get().name,
            'an_token': self.analytic_session.key.id(),
            'project_id': self.project.id,
            'html': pub.html,
        })

    def _create_analytic_session(self):
        analytic_session = AnalyticsSession(
            id=server.create_uuid(),
            ip_addr=self.request.remote_addr,
            user_agent=self.request.user_agent,
            host=self.request.host,
            host_url=self.request.host_url,
            project=self.project.key,
            referer=self.request.referer,
        )
        if not self.user.is_world_user():
            analytic_session.user = self.user.key
        analytic_session.put()
        memcache.add(analytic_session.key.id(), analytic_session, namespace='analytics')
        self.analytic_session = analytic_session

    @cerberus_handlers.exception_callback
    def delete(self, publish):
        publish = PublishPresentation.get_by_id(publish)
        if not publish:
            raise HttpErrorException.bad_request('invalid publish id')
        document = publish.document.get()
        if not document:
            raise HttpErrorException.bad_request('document does not exists')
        if not document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        publish.key.delete()

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True


class PresentationGroupPublishHandler(PresentationPublish):
    @cerberus_handlers.exception_callback
    def get(self, document, group):
        self.response.write(self.get_publish(document, group))


class PresentationPublishHandler(PresentationPublish):
    @cerberus_handlers.exception_callback
    def get(self, document):
        group = Group.get_worldshare()
        self.response.write(self.get_publish(document, group))


class PresentationPublishAnalyticHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, project, concept, action):
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        concept = Concept.get_by_id(concept)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')

        if action.rstrip() == '' or not Analytics.is_valid_action(action):
            raise HttpErrorException.bad_request('invalid action')

        self.get_analytic_session()
        concept.record_analytic(action, self.analytic_session, project=project.key)