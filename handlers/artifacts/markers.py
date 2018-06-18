import logging
from google.appengine.ext import ndb
from cerberus import handlers as cerberus_handlers

from models.account.user import User
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException
from models.artifacts import Project, Document, Concept, Marker, AnnotationComment, \
    Transaction, ChannelToken

from server import ttindex

__all__ = [
    'AnnotationHandler',
]

log = logging.getLogger('tt')


class AnnotationHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, project='None'):
        project = Project.get_by_id(project)
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        doc = self.request.get('doc', None)
        if doc:
            doc = Document.get_by_id(doc)
            if not doc:
                raise HttpErrorException.bad_request('invalid document id')
            if not doc.has_permission_annotation_read(self.user):
                raise HttpErrorException.forbidden()

        docs = {}
        q = Marker.query().filter(ndb.AND(Marker.project == project.key, Marker.type == 'anno'))
        if doc:
            q = q.filter(Marker.document == doc.key)
            docs[doc.id] = doc
        annos = []
        for ann in q.iter():
            doc = docs.get(ann.document.id())
            if not doc:
                doc = ann.document.get()
            if not doc:
                ann.corrupted = True
                ann.put()
                continue
            if doc.has_permission_annotation_read(self.user):
                annos.append(ann.to_dict())
        self.write_json_response(annos)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, annotation=''):
        self.get_channel_token()
        self.user.current_token_id = self.json_request.get('token_id', '')

        comment = self.json_request.get('comment', '').rstrip()
        concept = self.json_request.get('concept')
        document = self.json_request.get('document')

        if not comment or comment == '':
            raise HttpErrorException.bad_request('invalid comment')
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not document:
            raise HttpErrorException.bad_request('invalid document id')

        concept = Concept.get_by_id(concept)
        document = Document.get_by_id(document)

        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not document:
            raise HttpErrorException.bad_request('invalid document id')

        if not document.has_permission_annotation_write(self.user):
            log.debug('User does not have permission to write anno')
            raise HttpErrorException.forbidden()
        log.debug('User does has permission to write anno')

        anno_com = AnnotationComment(user=self.user.key, comment=comment)

        anno = Marker(key=Marker.create_key(), type='anno', project=concept.project,
                      document=document.key, concept=concept.key, comments=[anno_com])

        if self.user.organization:
            anno.organization = self.user.organization

        anno.put()
        anno_dict = anno.to_dict()

        self.write_json_response(anno_dict)
        index = self.user.get_put_index()
        anno.index_comment(index, anno_com)

        project = document.project.get()

        action_data = {
            'annotation': anno.to_dict()
        }
        trans = Transaction(action='anno_new', user=self.user.key, artifact=anno.key,
                            project=project.key, document=document, action_data=action_data)
        trans.put()

        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept, document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, annotation=''):
        self.get_channel_token()
        self.user.current_token_id = self.json_request.get('token_id', '')

        anno = Marker.get_by_id(annotation)
        if not anno:
            raise HttpErrorException.bad_request('invalid annotation')

        comment = self.json_request.get('comment', '').strip()
        if not comment or comment == '':
            raise HttpErrorException.bad_request('invalid comment')
        
        document = self.json_request.get('document')
        if not document:
            raise HttpErrorException.bad_request('invalid document id')

        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_annotation_write(self.user):
            raise HttpErrorException.forbidden()

        anno_com = AnnotationComment(user=self.user.key, comment=comment)
        anno.comments.append(anno_com)
        anno.put()

        self.write_json_response(anno.to_dict())
        msg = {
            'command': 'anno_new_com',
            'concept': anno.concept.id(),
            'id': anno.id,
            'comment': {
                'username': self.user.username,
                'comment': comment
            }
        }
        index = self.user.get_put_index()
        anno.index_comment(index, anno_com)

        project = document.project.get()

        action_data = {
            'id': anno.key.id(),
            'comment': comment,
        }
        trans = Transaction(action='anno_rply', user=self.user.key, artifact=anno.key,
                            project=project.key, document=document, action_data=action_data)
        trans.put()

        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens,
                                                                [anno.concept.get(), document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    @cerberus_handlers.exception_callback
    def delete(self, annotation=''):
        self.get_channel_token()
        self.user.current_token_id = self.request.get('token_id')
        anno = Marker.get_by_id(annotation)
        if not anno:
            raise HttpErrorException.bad_request('invalid annotation')
        document = anno.document.get()
        if not document.has_permission_annotation_write(self.user):
            raise HttpErrorException.forbidden()

        project = anno.project.get()

        action_data = {'id': anno.key.id()}
        trans = Transaction(action='anno_del', user=self.user.key, artifact=anno.key,
                            project=project.key, document=document, action_data=action_data)
        trans.put()

        anno.key.delete()
        index = self.user.get_indexes()
        while True:
            doc_ids = ttindex.ttsearch(index, {'anno': anno.id}, limit=1000, ids_only=True,
                                       cache_cursor=False, use_cursor=False)
            if len(doc_ids) == 0:
                break
            for i in xrange(0, len(doc_ids), 200):
                ttindex.index_delete(index, doc_ids[i:i + 200])


        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens,
                                                                [anno.concept.get(), document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True
        # raise HttpErrorException.unauthorized()7