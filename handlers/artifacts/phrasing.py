import datetime

from google.appengine.ext import ndb
from google.appengine.api import memcache
from cerberus import handlers as cerberus_handlers

import server
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException
from models.artifacts import Phrasing, Permission, Concept, Document, \
    SummarySelectedPhrasing, PresentationSelectedPhrasing, SelectedPhrasing, ChannelToken, Transaction

__all__ = [
    'PhrasingHandler',
]


class PhrasingHandler(AuthorizationRequestHanlder):
    phrasing = None

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, phrasing_id=None):
        self.get_analytic_session()
        phrasing_text = self.json_request.get('text')
        if not phrasing_text:
            raise HttpErrorException.bad_request('invalid phrasing text')
        if not self.json_request.get('concept') and not Concept.valid_id(self.json_request.get('concept')):
            raise HttpErrorException.bad_request('invalid concept id')
        concept = Concept.get_by_id(self.json_request.get('concept'))
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not self.json_request.get('document') and not Document.valid_id(self.json_request.get('document')):
            raise HttpErrorException.bad_request('invalid document id')
        document = Document.get_by_id(self.json_request.get('document'))
        if not document:
            raise HttpErrorException.bad_request('invalid document id')
        sum_doc = None
        if self.json_request.get('summary', False):
            if not document.summary_document:
                HttpErrorException.bad_request('no document does not have summary')
            sum_doc = document.summary_document.get()
            if not sum_doc:
                HttpErrorException.bad_request('no document does not have summary')
        pres_doc = None
        if self.json_request.get('presentation', False):
            if not document.presentation_document:
                HttpErrorException.bad_request('no document does not have presentation')
            pres_doc = document.presentation_document.get()
            if not pres_doc:
                HttpErrorException.bad_request('no document does not have presentation')
        phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                              key=Permission.create_key(), project=document.project)
        phrasing = Phrasing(key=Phrasing.create_key(), text=phrasing_text, concept=concept.key,
                            owner=[self.user.key], permissions=phr_perm.key, project=document.project)
        phr_perm.artifact = phrasing.key
        concept.phrasings.append(phrasing.key)

        sel_phr = None
        if (document.is_distilled_document() and document.project == concept.project and
                    sum_doc is None and pres_doc is None):
            concept.distilled_phrasing = phrasing.key
        else:
            if sum_doc is not None:
                if concept.has_summary_selected_phrasing(document=sum_doc):
                    sel_phr = concept.get_summary_selected_phrasing(sum_doc)
                    sel_phr.phrasing = phrasing.key
                else:
                    sel_phr = SummarySelectedPhrasing(
                        key=SummarySelectedPhrasing.create_key(),
                        project=concept.project,
                        document=sum_doc.key,
                        phrasing=phrasing.key
                    )
                    concept.summary_selected_phrasings.append(sel_phr.key)
            elif pres_doc is not None:
                if concept.has_presentation_selected_phrasing(document=pres_doc):
                    sel_phr = concept.get_presentation_selected_phrasing(pres_doc)
                    sel_phr.phrasing = phrasing.key
                else:
                    sel_phr = PresentationSelectedPhrasing(
                        key=PresentationSelectedPhrasing.create_key(),
                        project=concept.project,
                        document=pres_doc.key,
                        phrasing=phrasing.key
                    )
                    concept.presentation_selected_phrasings.append(sel_phr.key)
            else:
                if concept.has_selected_phrasing(document=document):
                    sel_phr = concept.get_selected_phrasing(document=document)
                    sel_phr.phrasing = phrasing.key
                else:
                    sel_phr = SelectedPhrasing(
                        key=SelectedPhrasing.create_key(),
                        document=document.key,
                        phrasing=phrasing.key,
                        project=document.project
                    )
                    concept.selected_phrasings.append(sel_phr.key)
            sel_phr.put()

        phrasing.originating_document = document.key
        project = phrasing.project.get()
        project.pw_modified_ts = datetime.datetime.now()
        ndb.put_multi([phr_perm, phrasing, concept, project])
        index = self.user.get_put_index()
        phrasing.index(index, concept=concept)
        concept.record_analytic('con_phr_new', self.analytic_session)
        self.write_json_response({'phrasing': phrasing.to_dict(self.user),
                                  'selected_phrasing': sel_phr.to_dict() if sel_phr else None})

        action_data = {
            'concept': concept.key.id(),
            'document': document.key.id(),
            'phrasing': phrasing.to_dict(self.user)
        }

        trans = Transaction(action='phr_new', user=self.user.key, artifact=phrasing.key,
                            project=project.key, action_data=action_data)
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept, phrasing, document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, phrasing_id=None):
        self.get_channel_token()
        if not Phrasing.valid_id(phrasing_id):
            raise HttpErrorException.bad_request('invalid phrasing id')
        self.phrasing = Phrasing.get_by_id(phrasing_id)
        if not self.phrasing:
            raise HttpErrorException.bad_request('invalid phrasing id')
        if not self.phrasing.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        if self.json_request.get('text'):
            self._set_text()
        if self.json_request.get('permission'):
            self._add_perm()
        if not self.json_request.get('permission') and self.json_request.get('group_id'):
            self._rm_perm()
        if self.json_request.get('remove_group'):
            self._remove_group()
        self.phrasing.modified_ts = datetime.datetime.now()
        project = self.phrasing.project.get()
        project.pw_modified_ts = datetime.datetime.now()
        ndb.put_multi([project, self.phrasing])

    def _set_text(self):
        if not self.phrasing.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        self.get_analytic_session()
        concept = self.phrasing.concept.get()
        project = concept.project.get()
        if concept.is_image(project.distilled_document) and self.phrasing.text.rstrip() == '':
            raise HttpErrorException.bad_request('can not override this phrasing')
        old_text = self.phrasing.text
        self.phrasing.text = self.json_request.get('text')
        index = self.user.get_put_index()
        self.phrasing.index(index, concept=concept)
        concept.record_analytic('con_phr_edit', self.analytic_session)

        action_data = {
            'old_text': old_text,
            'text': self.phrasing.text,
        }

        trans = Transaction(action='phr_edt', user=self.user.key, artifact=self.phrasing.key,
                            project=project.key, action_data=action_data)
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept, self.phrasing])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _add_perm(self):
        group, required = self.phrasing.validate_add_perm_request(self.json_request, self.user)
        self.phrasing.add_group_perm(group, self.json_request.get('operation'),
                                     self.json_request.get('permission'), required)
        project = self.phrasing.concept.get().project.get()

        action_data = {
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'permission': self.json_request.get('permission'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(action='phr_perm_add', user=self.user.key, artifact=self.phrasing.key,
                            project=project.key, action_data=action_data)
        trans.put()
        org = project.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.phrasing.has_permission_read(channel_token.user.get()) and not
                    self.phrasing.had_permission_read(channel_token.user.get())):
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
        group, required = self.phrasing.validate_rm_perm_request(self.json_request, self.user)
        self.phrasing.remove_group_perm(group, self.json_request.get('operation'), required)
        project = self.phrasing.concept.get().project.get()

        action_data = {
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(action='phr_perm_rmv', user=self.user.key, artifact=self.phrasing.key,
                            project=project.key, action_data=action_data)
        trans.put()
        org = project.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.phrasing.has_permission_read(channel_token.user.get()) and not
                    self.phrasing.had_permission_read(channel_token.user.get())):
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
        group = self.phrasing.validate_rm_group_request(self.json_request, self.user)
        for op in self.phrasing.operations_list:
            self.phrasing.remove_group_perm(group, op)
            self.phrasing.remove_group_perm(group, op, required=True)
        project = self.phrasing.concept.get().project.get()
        self.phrasing.broadcast_rm_grp(project, group, self.user, 'phr_rm_grp')

        action_data = {
            'group': group.key.id(),
            'hidden': False,
        }

        trans = Transaction(action='phr_grp_rmv', user=self.user.key, artifact=self.phrasing.key,
                            project=project.key, action_data=action_data)
        trans.put()
        org = project.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.phrasing.has_permission_read(channel_token.user.get()) and not
                    self.phrasing.had_permission_read(channel_token.user.get())):
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


    @cerberus_handlers.exception_callback
    def delete(self, phrasing_id=None):
        if not phrasing_id:
            raise HttpErrorException.bad_request('no phrasing_id given')
        phrasing = Phrasing.get_by_id(phrasing_id)
        if not phrasing:
            raise HttpErrorException.bad_request('invalid phrasing_id given')
        if not phrasing.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        concept = phrasing.concept.get()
        if phrasing.key == concept.distilled_phrasing:
            raise HttpErrorException.forbidden()
        project = phrasing.project.get()
        project.pw_modified_ts = datetime.datetime.now()
        project.put()

        trans = Transaction(action='phr_del', user=self.user.key, artifact=phrasing.key,
                            project=project.key)
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept, phrasing])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

        phrasing.delete(concept, self.user)
        self.get_analytic_session()
        concept.record_analytic('con_phr_del', self.analytic_session)

    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()