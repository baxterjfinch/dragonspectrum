import logging
import datetime

from cerberus import handlers as cerberus_handlers

from models.artifacts import ChannelToken, Transaction, Project, Phrasing, \
    SelectedPhrasing, SummarySelectedPhrasing, Document, PresentationSelectedPhrasing
from server import tt_logging
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder

__all__ = [
    'SelectedPhrasingHandler',
    'SummarySelectedPhrasingHandler',
    'PresentationSelectedPhrasingHandler',
]


log = logging.getLogger('tt')


class SelectedPhrasingHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, selected_phrasing_id=None):
        selected_phrasing_dict = {}
        q = SelectedPhrasing.query()

        if self.request.get('project_id').strip() != '':
            q = q.filter(SelectedPhrasing.project == Project.get_by_id(
                self.request.get('project_id').strip()).key)

        if self.request.get('document_id').strip() != '':
            q = q.filter(SelectedPhrasing.document == Document.get_by_id(
                self.request.get('document_id').strip()).key)

        if self.request.get('phrasing_id').strip() != '':
            q = q.filter(SelectedPhrasing.phrasing == Phrasing.get_by_id(
                self.request.get('phrasing_id').strip()).key)

        for phrase in q.iter():
            phrase_dict = phrase.to_dict()
            selected_phrasing_dict[phrase.key.id()] = phrase_dict

        self.write_json_response(selected_phrasing_dict)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, phrasing_id=None):
        if not phrasing_id:
            raise HttpErrorException.bad_request('no phrasing_id given')

        phrasing = Phrasing.get_by_id(phrasing_id)
        if not phrasing:
            raise HttpErrorException.bad_request('invalid phrasing_id given')
        if not self.json_request.get('document'):
            raise HttpErrorException.bad_request('no document given')

        document = Document.get_by_id(self.json_request.get('document'))
        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        if not document.has_permission(self.user, 'manage_phrasings'):
            lr = tt_logging.construct_log(
                msg_short='User does not have manage_phrasing perm',
                log_type=tt_logging.SECURITY,
                request=self.request,
                artifact=document,
                request_user=self.user
            )
            log.info(lr['dict_msg']['msg'], extra=lr)

            raise HttpErrorException.forbidden()

        concept = phrasing.concept.get()
        project = concept.project.get()
        selected_phrasing = None

        if document.is_distilled_document() and project.key == document.project:
            concept.distilled_phrasing = phrasing.key
            concept.put()
        else:
            if concept.has_selected_phrasing(document=document):
                selected_phrasing = concept.get_selected_phrasing(document)
                selected_phrasing.phrasing = phrasing.key
                selected_phrasing.put()
            else:
                selected_phrasing = SelectedPhrasing(id=Phrasing.create_uuid(), project=concept.project,
                                                     document=document.key, phrasing=phrasing.key)
                selected_phrasing.put()
                concept.selected_phrasings.append(selected_phrasing.key)
                concept.put()

        project = document.project.get()  # Don't want concept's project, this could be a linked concept
        project.pw_modified_ts = datetime.datetime.now()
        project.put()

        self.get_analytic_session()
        concept.record_analytic('con_phr_cha', self.analytic_session)

        if selected_phrasing:
            self.write_json_response(selected_phrasing.to_dict())

        action_data = {'document': document.key.id()}
        trans = Transaction(
            action='phr_chg',
            user=self.user.key,
            artifact=phrasing.key,
            project=project.key,
            action_data=action_data
        )
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept, document, phrasing])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, selected_phrasing_id=None):
        raise HttpErrorException.unauthorized()


class SummarySelectedPhrasingHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, phrasing_id=None):
        if not phrasing_id:
            raise HttpErrorException.bad_request('no phrasing_id given')

        phrasing = Phrasing.get_by_id(phrasing_id)
        if not phrasing:
            raise HttpErrorException.bad_request('invalid phrasing_id given')
        if not self.json_request.get('document'):
            raise HttpErrorException.bad_request('no document given')

        document = Document.get_by_id(self.json_request.get('document'))
        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        if not document.has_permission(self.user, 'manage_phrasings'):
            raise HttpErrorException.forbidden()

        if not document.summary_document:
            raise HttpErrorException.bad_request('document does not have a summary')

        sum_doc = document.summary_document.get()
        if not sum_doc:
            raise HttpErrorException.bad_request('document does not have a summary')

        concept = phrasing.concept.get()
        if concept.has_summary_selected_phrasing(document=sum_doc):
            selected_phrasing = concept.get_summary_selected_phrasing(sum_doc)
            selected_phrasing.phrasing = phrasing.key
            selected_phrasing.put()
        else:
            selected_phrasing = SummarySelectedPhrasing(
                id=SummarySelectedPhrasing.create_uuid(),
                project=concept.project,
                document=sum_doc.key,
                phrasing=phrasing.key
            )
            selected_phrasing.put()

            concept.summary_selected_phrasings.append(selected_phrasing.key)
            concept.put()

        project = document.project.get()  # Don't want concept's project, this could be a linked concept
        project.pw_modified_ts = datetime.datetime.now()
        project.put()

        self.get_analytic_session()
        concept.record_analytic('con_phr_cha', self.analytic_session)

        if selected_phrasing:
            self.write_json_response(selected_phrasing.to_dict())

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, selected_phrasing_id=None):
        raise HttpErrorException.unauthorized()


class PresentationSelectedPhrasingHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, phrasing_id=None):
        if not phrasing_id:
            raise HttpErrorException.bad_request('no phrasing_id given')

        phrasing = Phrasing.get_by_id(phrasing_id)
        if not phrasing:
            raise HttpErrorException.bad_request('invalid phrasing_id given')
        if not self.json_request.get('document'):
            raise HttpErrorException.bad_request('no document given')

        document = Document.get_by_id(self.json_request.get('document'))
        if not document:
            raise HttpErrorException.bad_request('invalid document given')
        if not document.has_permission(self.user, 'manage_phrasings'):
            raise HttpErrorException.forbidden()

        if not document.presentation_document:
            raise HttpErrorException.bad_request('document does not have a presentation')

        sum_doc = document.presentation_document.get()
        if not sum_doc:
            raise HttpErrorException.bad_request('document does not have a presentation')

        concept = phrasing.concept.get()
        if concept.has_presentation_selected_phrasing(document=sum_doc):
            selected_phrasing = concept.get_presentation_selected_phrasing(sum_doc)
            selected_phrasing.phrasing = phrasing.key
            selected_phrasing.put()
        else:
            selected_phrasing = PresentationSelectedPhrasing(
                id=PresentationSelectedPhrasing.create_uuid(),
                project=concept.project,
                document=sum_doc.key,
                phrasing=phrasing.key
            )
            selected_phrasing.put()

            concept.presentation_selected_phrasings.append(selected_phrasing.key)
            concept.put()

        project = document.project.get()  # Don't want concept's project, this could be a linked concept
        project.pw_modified_ts = datetime.datetime.now()
        project.put()

        self.get_analytic_session()
        concept.record_analytic('con_phr_cha', self.analytic_session)

        if selected_phrasing:
            self.write_json_response(selected_phrasing.to_dict())

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, selected_phrasing_id=None):
        raise HttpErrorException.unauthorized()
