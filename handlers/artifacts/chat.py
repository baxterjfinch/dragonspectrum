import logging
from datetime import datetime
from google.appengine.ext import ndb

from cerberus import handlers as cerberus_handlers

from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder
from models.artifacts import Project, Document, ChatMessage, ChannelToken

log = logging.getLogger('tt')

__all__ = [
    'ChatHandler',
]


class ChatHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self):
        if self.json_request.get('project') is None:
            raise HttpErrorException.bad_request('invalid project id')
        
        project = Project.get_by_id(self.json_request.get('project'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')
        if self.json_request.get('document') is None:
            raise HttpErrorException.bad_request('invalid document id')
        
        document = Document.get_by_id(self.json_request.get('document'))
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        try:
            limit = int(self.request.get('limit', 30))
        except ValueError:
            raise HttpErrorException.bad_request('limit must be int')
        
        try:
            before_date = int(self.request.get('before_date', 0))
        except ValueError:
            raise HttpErrorException.bad_request('before_date must be int')

        if limit > 100:
            limit = 100

        if before_date and before_date > 0:
            before_date = datetime.fromtimestamp(before_date / 1000.0)
            chat_query = ChatMessage.query(ndb.AND(ChatMessage.project == project.key,
                                                   ChatMessage.document == document.key,
                                                   ChatMessage.created_ts < before_date))
        else:
            chat_query = ChatMessage.query(ndb.AND(ChatMessage.project == project.key,
                                                   ChatMessage.document == document.key))

        chat_messages = chat_query.order(ChatMessage.created_ts).fetch(limit=limit)

        chat_messages_dict = []
        for chat in chat_messages:
            chat_messages_dict.append(chat.to_dict())
        
        self.write_json_response(chat_messages_dict)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self):
        if self.json_request.get('project') is None:
            raise HttpErrorException.bad_request('invalid project id')
        
        project = Project.get_by_id(self.json_request.get('project'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')
        if self.json_request.get('document') is None:
            raise HttpErrorException.bad_request('invalid document id')
        
        document = Document.get_by_id(self.json_request.get('document'))
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        
        msg = self.json_request.get('msg')
        if not msg or msg.strip() == '':
            raise HttpErrorException.bad_request('no message given')

        chat = ChatMessage(
            key=ChatMessage.create_key(),
            project=project.key, document=document.key,
            user=self.user.key, message=msg
        )
        chat.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [project, document])
        
        message = {
            'user': self.get_user_channel_data(),
            'chat': chat.to_dict()
        }
        
        ChannelToken.broadcast_message(channel_tokens, message)

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)
