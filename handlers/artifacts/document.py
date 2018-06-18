import logging
import datetime

from cerberus import handlers as cerberus_handlers
from google.appengine.api import memcache
from google.appengine.ext import ndb

import server
from models.account import User
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException
from models.artifacts import Document, SummaryDocument, Project, Permission, \
    Concept, Marker, ChannelToken, Transaction, PresentationDocument, PublishDocument, PublishSummary, \
    PublishPresentation

__all__ = [
    'DocumentHandler',
    'SummaryDocumentHandler',
    'PresentationDocumentHandler',
]


log = logging.getLogger('tt')


class DocumentHandler(AuthorizationRequestHanlder):
    document = None
    project = None

    @cerberus_handlers.exception_callback
    def get(self, document='none'):
        document = Document.get_by_id(document)
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        if not document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        self.write_json_response(document.to_dict(self.user))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, document_id=None):
        if not self.json_request.get('project') and not Project.valid_id(self.json_request.get('project')):
            raise HttpErrorException.bad_request('invalid project id')
        pro = Project.get_by_id(self.json_request.get('project'))
        if not pro:
            raise HttpErrorException.bad_request('invalid project id')
        if not pro.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        if not self.json_request.get('title'):
            raise HttpErrorException.bad_request('invalid title')

        doc = Document(key=Document.create_key())
        doc.project = pro.key
        doc.title = self.json_request.get('title')
        doc.subtitle = self.json_request.get('subtitle')
        doc.author = self.json_request.get('author')
        doc.version = self.json_request.get('version')
        doc.date = self.json_request.get('date')
        doc.copyright_text = self.json_request.get('copyright')
        doc.description = self.json_request.get('description')
        doc.owner.append(self.user.key)
        doc_perm = Permission(permissions=Permission.init_perm_struct(Document.operations_list),
                              key=Permission.create_key(), project=pro.key)
        doc_perm.artifact = doc.key
        doc_perm.put()
        doc.permissions = doc_perm.key
        if self.user.in_org():
            doc.organization = self.user.organization
        doc.parent_perms = [pro.permissions, pro.distilled_document.get().permissions]
        doc.put()
        pro.documents.append(doc.key)
        indexes = self.user.get_put_index()
        doc.index(indexes)
        pro.pw_modified_ts = datetime.datetime.now()
        pro.put()
        self.write_json_response(doc.to_dict(self.user))

        action_data = {'document': doc.to_dict(self.user)}

        trans = Transaction(action='doc_new', user=self.user.key, artifact=doc.key,
                            project=pro.key, action_data=action_data)
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(pro.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [doc])

        for channel_token in channel_tokens:
            trans.action_data['document'] = doc.to_dict(channel_token.user.get())

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }
            ChannelToken.broadcast_message([channel_token], message)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, document_id=None):
        self.get_channel_token()
        modify_ts = True
        if not document_id and not Document.valid_id(document_id):
            raise HttpErrorException.bad_request('invalid document id')
        self.document = Document.get_by_id(document_id)
        if not self.document:
            raise HttpErrorException.bad_request('invalid document id')
        self.project = self.document.project.get()
        if not self.document.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        if self.json_request.get('active_document'):
            modify_ts = False
            self._activate_document()
        else:
            if not self.document.has_permission_write(self.user):
                raise HttpErrorException.forbidden()
            if self.json_request.get('permission'):
                self._add_perm()

            values = {}
            values_changed = False
            if not self.json_request.get('permission') and self.json_request.get('group_id'):
                self._rm_perm()
            if self.json_request.get('remove_group'):
                self._remove_group()
            if self.json_request.get('title') is not None:
                self._set_title()
                values_changed = True
                values['title'] = self.json_request.get('title', '')
            if self.json_request.get('subtitle') is not None:
                self._set_subtitle()
                values_changed = True
                values['subtitle'] = self.json_request.get('subtitle', '')
            if self.json_request.get('author') is not None:
                self._set_author()
                values_changed = True
                values['author'] = self.json_request.get('author', '')
            if self.json_request.get('date') is not None:
                self._set_date()
                values_changed = True
                values['date'] = self.json_request.get('date', '')
            if self.json_request.get('version') is not None:
                self._set_version()
                values_changed = True
                values['version'] = self.json_request.get('version', '')
            if self.json_request.get('copyright') is not None:
                self._set_copyright()
                values_changed = True
                values['copyright'] = self.json_request.get('copyright', '')
            if self.json_request.get('description') is not None:
                self._set_description()
                values_changed = True
                values['description'] = self.json_request.get('description', '')

            if values_changed:
                action_data = {'values': values}

                trans = Transaction(action='doc_edit', user=self.user.key, artifact=self.document.key,
                                    project=self.document.project, action_data=action_data)
                trans.put()

                self.get_channel_token()
                channel_tokens = ChannelToken.get_by_project_key(self.document.project, self.user_channel_token)
                channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.document])

                message = {
                    'user': self.get_user_channel_data(),
                    'transaction': trans.to_dict(self.user)
                }

                ChannelToken.broadcast_message(channel_tokens, message)

        if modify_ts:
            project = self.document.project.get()
            project.pw_modified_ts = datetime.datetime.now()
            project.put()
        self.document.put()

    def _activate_document(self):
        trans = Transaction(action='doc_act', user=self.user.key, artifact=self.document.key,
                            project=self.document.project)
        trans.put()

        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _add_perm(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        group, required = self.document.validate_add_perm_request(self.json_request, self.user)
        self.document.add_group_perm(group, self.json_request.get('operation'),
                                     self.json_request.get('permission'), required)

        action_data = {
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'permission': self.json_request.get('permission'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(action='doc_perm_add', user=self.user.key, artifact=self.document.key,
                            project=self.project.key, action_data=action_data)
        trans.put()
        org = self.document.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.document.has_permission_read(channel_token.user.get()) and not
                    self.document.had_permission_read(channel_token.user.get())):
                continue

            if not ach_user.is_super_admin and not \
                    (ach_user.is_org_admin and org.key == ach_user.organization) and \
                    org.is_hidden_group(group):

                fake_id = memcache.get(group.key.id() + '_fake_id')
                if fake_id is None:
                    fake_id = server.create_uuid()
                    memcache.add(key=group.key.id() + '_fake_id', value=fake_id)

                trans.action_data['group'] = fake_id
                trans.action_data['hidden'] = True

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }

            ChannelToken.broadcast_message([channel_token], message)

    def _rm_perm(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        group, required = self.document.validate_rm_perm_request(self.json_request, self.user)
        self.document.remove_group_perm(group, self.json_request.get('operation'), required)

        action_data = {
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(action='doc_perm_rmv', user=self.user.key, artifact=self.document.key,
                            project=self.project.key, action_data=action_data)
        trans.put()
        org = self.document.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.document.has_permission_read(channel_token.user.get()) and not
                    self.document.had_permission_read(channel_token.user.get())):
                continue

            if not ach_user.is_super_admin and not \
                    (ach_user.is_org_admin and org.key == ach_user.organization) and \
                    org.is_hidden_group(group):

                fake_id = memcache.get(group.key.id() + '_fake_id')
                if fake_id is None:
                    fake_id = server.create_uuid()
                    memcache.add(key=group.key.id() + '_fake_id', value=fake_id)

                trans.action_data['group'] = fake_id
                trans.action_data['hidden'] = True

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }

            ChannelToken.broadcast_message([channel_token], message)

    def _remove_group(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        group = self.document.validate_rm_group_request(self.json_request, self.user)
        for op in self.document.operations_list:
            self.document.remove_group_perm(group, op)
            self.document.remove_group_perm(group, op, required=True)

        action_data = {
            'group': group.key.id(),
            'hidden': False,
        }

        trans = Transaction(action='doc_grp_rmv', user=self.user.key, artifact=self.document.key,
                            project=self.project.key, action_data=action_data)
        trans.put()
        org = self.document.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.document.has_permission_read(channel_token.user.get()) and not
                    self.document.had_permission_read(channel_token.user.get())):
                continue

            if not ach_user.is_super_admin and not \
                    (ach_user.is_org_admin and org.key == ach_user.organization) and \
                    org.is_hidden_group(group):

                fake_id = memcache.get(group.key.id() + '_fake_id')
                if fake_id is None:
                    fake_id = server.create_uuid()
                    memcache.add(key=group.key.id() + '_fake_id', value=fake_id)

                trans.action_data['group'] = fake_id
                trans.action_data['hidden'] = True

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }

            ChannelToken.broadcast_message([channel_token], message)

    def _set_title(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        title = self.json_request.get('title', '').rstrip()
        if title == '':
            raise HttpErrorException.bad_request('title can not be empty')
        self.document.title = title

    def _set_subtitle(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.document.subtitle = self.json_request.get('subtitle', '')

    def _set_author(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.document.author = self.json_request.get('author', '')

    def _set_date(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.document.date = self.json_request.get('date', '')

    def _set_version(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.document.version = self.json_request.get('version', '')

    def _set_copyright(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.document.copyright_text = self.json_request.get('copyright', '')

    def _set_description(self):
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.document.description = self.json_request.get('description', '')

    @cerberus_handlers.exception_callback
    def delete(self, document_id=None):
        if not document_id and not Document.valid_id(document_id):
            raise HttpErrorException.bad_request('invalid document id')
        self.document = Document.get_by_id(document_id)
        if not self.document:
            raise HttpErrorException.bad_request('invalid document id')
        if not self.document.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        if self.document.is_distilled_document():
            raise HttpErrorException.bad_request('can not delete distilled document')

        trans = Transaction(action='doc_del', user=self.user.key, artifact=self.document.key,
                            project=self.document.project)
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(self.document.project, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.document])

        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }

        ChannelToken.broadcast_message(channel_tokens, message)

        self._delete_document()
        project = self.document.project.get()
        project.modified_ts = datetime.datetime.now()
        project.pw_modified_ts = datetime.datetime.now()
        project.put()

    def _delete_document(self):
        pro = self.document.project.get()
        pro.remove_document(self.document.key)
        q = Concept.query()
        q = q.filter(Concept.project == pro.key)

        for concept in q.iter():
            concept.remove_document(self.document.key)

        q = Marker.query()
        q = q.filter(Marker.document == self.document.key)
        for m in q.iter():
            m.key.delete()

        q = PublishDocument.query()
        q = q.filter(PublishDocument.document == self.document.key)
        for m in q.iter():
            m.key.delete()

        q = PublishSummary.query()
        q = q.filter(PublishSummary.document == self.document.key)
        for m in q.iter():
            m.key.delete()

        q = PublishPresentation.query()
        q = q.filter(PublishPresentation.document == self.document.key)
        for m in q.iter():
            m.key.delete()

        q = PresentationDocument.query()
        q = q.filter(PresentationDocument.document == self.document.key)
        for m in q.iter():
            m.key.delete()

        q = SummaryDocument.query()
        q = q.filter(SummaryDocument.document == self.document.key)
        for m in q.iter():
            m.key.delete()

        self.document.permissions.delete()
        self.document.key.delete()
        indexes = self.user.get_indexes(create_new=False)
        self.document.index_delete(indexes)

    def on_authentication_fail(self, document_id=None):
        self.user = User.get_world_user()
        return True


class SummaryDocumentHandler(AuthorizationRequestHanlder):
    document = None
    project = None

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self):
        pro = Project.get_by_id(self.json_request.get('project', 'none'))
        if not pro:
            raise HttpErrorException.bad_request('invalid project id')

        doc = Document.get_by_id(self.json_request.get('document', 'none'))
        if not doc:
            raise HttpErrorException.bad_request('invalid document id')
        if not doc.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        if doc.key != pro.distilled_document and doc.key not in pro.documents:
            raise HttpErrorException.bad_request('document does not belong to project')

        sum_doc = SummaryDocument(
            key=SummaryDocument.create_key(),
            project=pro.key,
            document=doc.key
        )

        doc.summary_document = sum_doc.key
        pro.pw_modified_ts = datetime.datetime.now()

        ndb.put_multi([sum_doc, doc, pro])
        self.write_json_response(sum_doc.to_dict())


class SummaryDocumentWordCountHandler(AuthorizationRequestHanlder):
    document = None
    project = None

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self):
        doc = Document.get_by_id(self.json_request.get('document', 'none'))
        if not doc:
            raise HttpErrorException.bad_request('invalid document id')
        if not doc.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        if not doc.summary_document:
            raise HttpErrorException.bad_request('no summary document')

        sum_doc = doc.summary_document.get()
        if not sum_doc:
            raise HttpErrorException.bad_request('no summary document')

        word_count = self.json_request.get('word_count')
        try:
            word_count = int(word_count)
        except (ValueError, TypeError):
            raise HttpErrorException.bad_request('word_count must be int')

        if word_count < 100 or word_count > 2500 or word_count % 50 != 0:
            raise HttpErrorException.bad_request('word_count must be 100 to 2500 in 50 inc')

        sum_doc.word_count = word_count
        sum_doc.put()


class PresentationDocumentHandler(AuthorizationRequestHanlder):
    document = None
    project = None

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self):
        pro = Project.get_by_id(self.json_request.get('project', 'none'))
        if not pro:
            raise HttpErrorException.bad_request('invalid project id')

        doc = Document.get_by_id(self.json_request.get('document', 'none'))
        if not doc:
            raise HttpErrorException.bad_request('invalid document id')
        if not doc.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        if doc.key != pro.distilled_document and doc.key not in pro.documents:
            raise HttpErrorException.bad_request('document does not belong to project')

        pres_doc = PresentationDocument(
            key=PresentationDocument.create_key(),
            project=pro.key,
            document=doc.key
        )

        doc.presentation_document = pres_doc.key
        pro.pw_modified_ts = datetime.datetime.now()

        ndb.put_multi([pres_doc, doc, pro])
        self.write_json_response(pres_doc.to_dict())