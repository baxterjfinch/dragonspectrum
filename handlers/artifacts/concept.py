import json
import time
import base64
import logging
import requests
from datetime import datetime
from StringIO import StringIO

import cloudstorage as gcs
from google.appengine.ext import ndb, blobstore
from google.appengine.api import memcache
from cerberus import handlers as cerberus_handlers
from google.appengine.ext.webapp import blobstore_handlers

import server
from models.artifacts import Document, Marker
from server import tt_logging
from models.account.user import User
from server.httperrorexception import HttpErrorException
from models.artifacts import Concept
from models.artifacts.transaction import Transaction
from models.artifacts.artifact import CorruptedArtifactException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT
from models.artifacts import Phrasing, Project, Attributes, CrawlContext, Permission, ConceptLink, ChannelToken

__all__ = [
    'ConceptHandler',
    'ConceptChildrenHandler',
    'MediaDownloadHandler',
    'MediaUploadHandler',
]

log = logging.getLogger('tt')


class ConceptHandler(AuthorizationRequestHanlder):
    concept = None
    project = None
    loader_configs = {}

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, concept_id=None):
        if concept_id == '':
            concept_id = None
            if self.request.get('concept_id').strip() != '':
                concept_id = self.request.get('concept_id').strip()

        if concept_id is None and self.request.get('parent_id') == '':
            self._serve_project_children_json()
        else:
            if concept_id:
                if not Concept.valid_id(concept_id):
                    raise HttpErrorException.bad_request('invalid concept id')
                self.concept = Concept.get_by_id(concept_id)
                if not self.concept:
                    raise HttpErrorException.bad_request('invalid concept id')
            if self.request.get('parent_list') != '':
                self._serve_parent_list()
            elif self.request.get('json') != '' and self.request.get('children') != 'false':
                self._serve_concept_json()
            elif self.request.get('json') != '':
                self.write_json_response(self.concept.to_dict(self.user, self.concept.project.get()))
            else:
                self._serve_concept_page()

    def _get_concept_loader_configs(self):
        if self.request.get('hq_batch_size'):
            self.loader_configs['hq_batch_size'] = self._to_int(self.request.get('hq_batch_size'))
        else:
            self.loader_configs['hq_batch_size'] = self.gc.default_concept_loading_hq_batch_size

        if self.request.get('lq_batch_size'):
            self.loader_configs['lq_batch_size'] = self._to_int(self.request.get('lq_batch_size'))
        else:
            self.loader_configs['lq_batch_size'] = self.gc.default_concept_loading_lq_batch_size

        if self.request.get('hq_timeout'):
            self.loader_configs['hq_timeout'] = self._to_int(self.request.get('hq_timeout'))
        else:
            self.loader_configs['hq_timeout'] = self.gc.default_concept_loading_hq_timeout

        if self.request.get('lq_timeout'):
            self.loader_configs['lq_timeout'] = self._to_int(self.request.get('lq_timeout'))
        else:
            self.loader_configs['lq_timeout'] = self.gc.default_concept_loading_lq_timeout

        if self.request.get('concurrent_request'):
            self.loader_configs['concurrent_request'] = self._to_int(self.request.get('concurrent_request'))
        else:
            self.loader_configs['concurrent_request'] = self.gc.concept_loading_num_concur_req

        if self.request.get('stay_ahead').lower() == 'true':
            self.loader_configs['stay_ahead'] = True
        elif self.request.get('stay_ahead').lower() == 'false':
            self.loader_configs['stay_ahead'] = False
        else:
            self.loader_configs['stay_ahead'] = self.gc.concept_loading_stay_ahead

        if self.request.get('cache_children').lower() == 'true':
            self.loader_configs['cache_children'] = True
        elif self.request.get('cache_children').lower() == 'false':
            self.loader_configs['cache_children'] = False
        else:
            self.loader_configs['cache_children'] = self.gc.concept_loading_cache_children

    def _serve_project_children_json(self):
        project_id = self.request.get('project_id')
        if project_id is None and Project.valid_id(project_id):
            raise HttpErrorException.bad_request('invalid project id')

        concept_json = []
        depth = 0
        if self.request.get('depth') != '':
            depth = int(self.request.get('depth'))

        project = Project.get_by_id(project_id)
        concepts = ndb.get_multi(project.children)
        index = 0

        for concept in concepts:
            if concept:  # TODO: we need to setup a recover process for dead children keys
                if concept.has_permission_read(self.user):
                    if self.request.get('get_treeview') is not None:
                        try:
                            con_dict = concept.to_dict(
                                depth, self.user, get_treeview=self.request.get('get_treeview'), request=self.request
                            )
                            if con_dict:
                                concept_json.append(con_dict)
                        except CorruptedArtifactException:
                            pass  # Skip this one
            else:
                broken_key = project.children[index]
                project.children.remove(project.children[index])
                project.put()
                lr = tt_logging.construct_log(
                    msg_short='Project Has Broken Child Key',
                    msg='Found broken concept key (%s) in project children list\n'
                        'Key has been removed' % str(broken_key),
                    log_type=tt_logging.USER, request=self.request, artifact=project,
                    request_user=self.user
                )
                log.error(lr['dict_msg']['msg'], extra=lr)

            index += 1

        self.write_json_response(concept_json)

    def _serve_parent_list(self):
        if not self.concept:
            raise HttpErrorException.bad_request('invalid concept id given')
        if not self.concept.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        self.write_json_response(self.concept.get_parent_id_list(self.user))

    def _serve_concept_json(self):
        if self.concept:
            self._serve_concept_children_json()
        else:
            self._serve_concepts_children_json()

    def _serve_concept_children_json(self):
        depth = 0
        if self.request.get('depth') != '':
            depth = int(self.request.get('depth'))

        get_treeview = False
        if self.request.get('get_treeview').lower() == 'true':
            get_treeview = True

        try:
            concept_json = self.concept.to_dict(
                depth, self.user, get_treeview=get_treeview, request=self.request,
                keep_dist=self.concept.project.get().distilled_document.id()
            )
        except CorruptedArtifactException:
            lr = tt_logging.construct_log(
                msg_short='User Tried to Read Currupted Concept',
                log_type=tt_logging.EXCEPTION, request=self.request, artifact=self.concept,
                request_user=self.user
            )
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise

        self.write_json_response(concept_json)

    def _serve_concepts_children_json(self):
        max_return_size = 100
        non_parents = []

        project = Project.get_by_id(self.request.get('project'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        parent_ids = self.request.get_all('parent_id')
        if not parent_ids:
            raise HttpErrorException.bad_request('no parent ids')

        parent_keys = Concept.ids_to_keys(parent_ids)
        parents = ndb.get_multi(parent_keys)
        children = []
        first = True
        unprocessed_parent_ids = []
        index = -1

        for parent in parents:
            index += 1
            if not parent:
                parent = Project.get_by_id(parent_keys[index].id())
                if not parent:
                    continue
            if first or len(parent.children) + len(children) < max_return_size:
                children += parent.get_children()
            elif len(parent.children) > 0:
                unprocessed_parent_ids.append(parent.key.id())
            if len(parent.children) == 0:
                non_parents.append(parent.key.id())
            first = False

        children_processed = []
        dist_doc = project.distilled_document.id()

        for child in children:
            if child is not None and child.has_permission_read(self.user):
                try:
                    children_processed.append(child.to_dict(self.user, project, keep_dist=dist_doc))
                except CorruptedArtifactException:
                    pass  # Nothing to do, its all handler internally. We just skip and more on

        results = {
            'non_parents': non_parents,
            'unprocessed_parents': unprocessed_parent_ids,
            'children': children_processed
        }

        self.write_json_response(results)

    def _serve_concept_page(self):
        project = self.concept.project.get()
        if self.request.get('doc') == '':
            raise HttpErrorException.bad_request('no doc id given')
        if not Document.valid_id(self.request.get('doc')):
            raise HttpErrorException.bad_request('invalid document id')

        doc = Document.get_by_id(self.request.get('doc'))
        if not doc:
            raise HttpErrorException.bad_request('invalid doc id given')
        if doc.project != project.key:
            raise HttpErrorException.bad_request('invalid doc id given')
        if not doc.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        tree = False
        nav = False

        if self.request.get('nav') == 'true':
            nav = True

        limit_depth = False
        if self.request.get('limit_depth') == 'true' or not nav:
            limit_depth = True

        depth = -1
        if self.request.get('depth') != '':
            if self.request.get('depth') in ['all', 'max']:
                depth = -1
            else:
                try:
                    depth = int(self.request.get('depth'))
                except ValueError:
                    raise HttpErrorException.bad_request('depth must be an int')

        project_dict = project.to_dict(self.user)
        # The user may not have permission to view this project, so we will need to create a fake one
        if not project_dict:
            project_dict = {
                'attributes': {doc.key.id(): project.get_attr(doc.key)},
                'created_timestamp': time.mktime(datetime.now().timetuple()),
                'distilled_document': doc.to_dict(self.user),
                'documents': [doc.to_dict(self.user)],
                'id': server.create_uuid(),
                'organization': None,
                'owner': '',
                'permissions': Permission.init_perm_struct(Project.operations_list),
                'title': self.concept.get_phrasing(doc),
            }

        if project.distilled_document.id() != doc.key.id():
            project_dict['distilled_document'] = {
                'id': project.distilled_document.id(),
                'permissions': Permission.init_perm_struct(Document.operations_list)
            }
            project_dict['documents'].append(project_dict['distilled_document'])

        concept_json = self.concept.to_dict(self.user, project=project, keep_dist=project.distilled_document.id())
        self._get_concept_loader_configs()
        project_dict['children'] = [concept_json]

        template_data = {
            'data': json.dumps({
                'project': project_dict,
                'user': self.user.to_dict(),
                'doc': doc.key.id(),
                'page': 'concept',
                'tree': tree,
                'limit_depth': limit_depth,
                'max_depth': depth,
                'nav': nav,
                'loader_configs': self.loader_configs,
                'concept': self.concept.key.id(),
            }),
            'display_name': self.user.display_name,
            'tree': tree,
            'nav': nav,
        }

        template_index = JINJA_ENVIRONMENT.get_template('concept.html')
        self.response.write(template_index.render(template_data))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, concept_id=None):
        self.get_channel_token()
        self._init_post(concept_id)

        modify_ts = True

        if self.json_request.get('parent') and not self.json_request.get('link_concept'):
            self._set_parent()
        if self.json_request.get('activated'):
            modify_ts = False
            self._activate_concept()
        if self.json_request.get('expand'):
            modify_ts = False
            self._expand_event()
        if self.json_request.get('collapse'):
            modify_ts = False
            self._collapse_event()
        if self.json_request.get('permission'):
            self._add_perm()
        if not self.json_request.get('permission') and self.json_request.get('group_id'):
            self._rm_perm()
        if self.json_request.get('remove_group'):
            self._remove_group()
        if self.json_request.get('add_attribute'):
            self._add_attribute()
        if self.json_request.get('shared'):
            self._concept_shared()
        if self.json_request.get('link_concept'):
            self._link_concept()

        if modify_ts:
            project = self.concept.project.get()
            project.pw_modified_ts = datetime.now()
            project.put()

        self.concept.put()

    def _init_post(self, concept_id):
        if not Concept.valid_id(concept_id):
            raise HttpErrorException.bad_request('invalid concept id')

        self.concept = Concept.get_by_id(concept_id)
        if not self.concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not self.concept.has_permission_read(self.user):
            raise HttpErrorException.forbidden()
        if not self.json_request.get('project', None):
            raise HttpErrorException.bad_request('invalid project id')

        self.project = Project.get_by_id(self.json_request.get('project'))
        if not self.project:
            raise HttpErrorException.bad_request('invalid project id')

        self.get_analytic_session()

    def _activate_concept(self):
        meta_data = {'depth': self.concept.depth}
        project_key = self.concept.project

        link_id = None
        if self.json_request.get('link'):
            link_id = self.json_request.get('link')
            meta_data['link'] = link_id

            for link in self.concept.linked_to:
                if link.link_id == link_id:
                    project_key = link.project

        document = None
        if self.user_channel_token:
            self.user_channel_token.concept = self.concept.key

            if link_id:
                self.user_channel_token.link_id = link_id
            else:
                self.user_channel_token.link_id = None

            document = Document.get_by_id(self.json_request.get('document', 'none'))
            if document:
                self.user_channel_token.document = document.key

            self.user_channel_token.put()

        self.concept.record_analytic('con_nav', self.analytic_session, project=project_key, meta_data=meta_data)

        action_data = {
            'link': link_id
        }
        trans = Transaction(action='con_act', user=self.user.key, artifact=self.concept.key,
                            project=project_key, action_data=action_data)
        trans.created_ts = datetime.now()
        trans.modified_ts = datetime.now()
        trans.project = self.project.key

        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.concept, document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _expand_event(self):
        meta_data = {'depth': self.concept.depth}
        if self.json_request.get('link'):
            meta_data['link'] = self.json_request.get('link')
        self.concept.record_analytic('con_exp', self.analytic_session, meta_data=meta_data)

    def _collapse_event(self):
        meta_data = {'depth': self.concept.depth}
        if self.json_request.get('link'):
            meta_data['link'] = self.json_request.get('link')
        self.concept.record_analytic('con_col', self.analytic_session, meta_data=meta_data)

    def _set_parent(self):
        if not Concept.valid_id(self.json_request.get('parent')):
            raise HttpErrorException.bad_request('invalid parent id')

        new_parent = Concept.get_by_id(self.json_request.get('parent'))
        if not new_parent:
            new_parent = Project.get_by_id(self.json_request.get('parent'))
            if not new_parent:
                raise HttpErrorException.bad_request('invalid parent id')

        link = self.json_request.get('link', None)
        if link:
            link = self.concept.get_link(self.json_request.get('link'))
            cur_parent = link.parent.get()
        else:
            cur_parent = self.concept.get_parent()

        if (not cur_parent.has_permission_edit_children(self.user) and not
                new_parent.has_permission_edit_children(self.user)):
            raise HttpErrorException.forbidden()

        if self.json_request.get('nextSibling') and not Concept.valid_id(self.json_request.get('nextSibling')):
            raise HttpErrorException.bad_request('invalid nextSibling id')

        if not self.json_request.get('project', None):
            raise HttpErrorException.bad_request('invalid project id')

        project = Project.get_by_id(self.json_request.get('project'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        next_sibling = None
        if self.json_request.get('nextSibling', None):
            next_sibling = Concept.get_by_id(self.json_request.get('nextSibling'))

        self.concept.set_parent(new_parent, next_sibling, self.user, link=link)
        self.concept.record_analytic('con_mov', self.analytic_session, meta_data={'depth': self.concept.depth})

        action_data = {
            'old_parent': cur_parent.key.id(),
            'new_parent': new_parent.key.id(),
            'link': link.link_id if link else None,
            'next_sibling': next_sibling.key.id() if next_sibling else '',
        }

        trans = Transaction(action='con_mov', user=self.user.key, artifact=self.concept.key,
                            project=project.key, action_data=action_data)
        trans.put()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ns = next_sibling

            # check if channel token has permission to view the concept or its new parent
            auth_channel_token = ChannelToken.remove_unauthorized_users(channel_token, [self.concept, new_parent])
            # if nothing is returned continue to next token
            if len(auth_channel_token) == 0:
                continue

            # Check if there is a next sibling, if so then check if the user has permission to read it.
            # If the token does not, we get the next sibling after it. Continue till we find one
            # the token can read or we run out of siblings in which case the concept will be the last
            # child for this tokens instance of the parent.
            ach = auth_channel_token
            if ns:
                ach = ChannelToken.remove_unauthorized_users(auth_channel_token, [ns])
                while len(ach) == 0 and ns is not None:
                    ns = ns.get_next_sibling()
                    ach = ChannelToken.remove_unauthorized_users(auth_channel_token, [ns])

            # Adjust the transactions next sibling for this token.
            # This will not be save to the server.
            trans.action_data.update(next_sibling=ns.key.id() if ns else '')

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }

            ChannelToken.broadcast_message(ach, message)

    def _add_perm(self):
        group, required = self.concept.validate_add_perm_request(self.json_request, self.user)
        self.concept.add_group_perm(group, self.json_request.get('operation'),
                                    self.json_request.get('permission'), required)
        if self.json_request.get('operation') == 'read':
            self.concept.record_analytic('con_perm', self.analytic_session)

        action_data = {
            'parent': self.concept.get_parent().key.id(),
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'permission': self.json_request.get('permission'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(action='con_perm_add', user=self.user.key, artifact=self.concept.key,
                            project=self.project.key, action_data=action_data)
        trans.put()
        org = self.concept.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.concept.has_permission_read(channel_token.user.get()) and not
                    self.concept.had_permission_read(channel_token.user.get())):
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
        group, required = self.concept.validate_rm_perm_request(self.json_request, self.user)
        self.concept.remove_group_perm(group, self.json_request.get('operation'), required)

        action_data = {
            'parent': self.concept.get_parent().key.id(),
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(action='con_perm_rmv', user=self.user.key, artifact=self.concept.key,
                            project=self.project.key, action_data=action_data)
        trans.put()
        org = self.concept.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.concept.has_permission_read(channel_token.user.get()) and not
                    self.concept.had_permission_read(channel_token.user.get())):
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
        group = self.concept.validate_rm_group_request(self.json_request, self.user)
        for op in self.concept.operations_list:
            self.concept.remove_group_perm(group, op)
            self.concept.remove_group_perm(group, op, required=True)
        self.concept.record_analytic('con_perm', self.analytic_session)

        action_data = {
            'parent': self.concept.get_parent().key.id(),
            'group': group.key.id(),
            'hidden': False,
        }

        trans = Transaction(action='con_grp_rmv', user=self.user.key, artifact=self.concept.key,
                            project=self.project.key, action_data=action_data)
        trans.put()
        org = self.concept.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.concept.has_permission_read(channel_token.user.get()) and not
                    self.concept.had_permission_read(channel_token.user.get())):
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

    def _add_attribute(self):
        r_attr = self.json_request.get('add_attribute')

        if not r_attr:
            raise ValueError('no attribute given')
        if not isinstance(r_attr, basestring):
            raise ValueError('attributes must be a string')
        if not self.json_request.get('document'):
            raise ValueError('no document id given')
        if not Document.valid_id(self.json_request.get('document')):
            raise HttpErrorException.bad_request('invalid document id')

        doc = Document.get_by_id(self.json_request.get('document'))
        if not doc.has_permission_write(self.user):
            raise HttpErrorException.forbidden()
        if not doc:
            raise ValueError('invalid document id given')

        attr = self.concept.get_attr_by_doc(doc)
        if attr:
            if r_attr == 'h' and 'noh' in attr.attributes:
                attr.attributes.remove('noh')
            if r_attr == 'noh' and 'h' in attr.attributes:
                attr.attributes.remove('h')
            if r_attr == 'ol' and 'nol' in attr.attributes:
                attr.attributes.remove('nol')
            if r_attr == 'ol' and 'ul' in attr.attributes:
                attr.attributes.remove('ul')
            if r_attr == 'ul' and 'nol' in attr.attributes:
                attr.attributes.remove('nol')
            if r_attr == 'il' and 'ol' in attr.attributes:
                attr.attributes.remove('ol')
            if r_attr == 'nol' and 'ol' in attr.attributes:
                attr.attributes.remove('ol')
            if r_attr == 'nol' and 'ul' in attr.attributes:
                attr.attributes.remove('ul')
            if r_attr not in attr.attributes:
                attr.attributes.append(r_attr)
            attr.put()
        else:
            attr = [r_attr] if r_attr != 'attr' else []
            attr = Attributes(project=self.concept.project, document=doc.key, attributes=attr)
            attr.put()
            self.concept.attributes.append(attr.key)

        self.concept.record_analytic('con_attr_cha', self.analytic_session, meta_data={'to': r_attr})
        self.write_json_response(attr.to_dict())

        action_data = {
            'attribute': r_attr,
            'document': doc.key.id()
        }
        trans = Transaction(action='con_attr_add', user=self.user.key, artifact=self.concept.key,
                            project=self.project.key, action_data=action_data)
        trans.put()

        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.concept, doc])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _concept_shared(self):
        self.get_analytic_session()
        self.concept.record_analytic('con_soc_sha', self.analytic_session)

    def _link_concept(self):
        project = Project.get_by_id(self.json_request.get('project', ''))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        link_document = Document.get_by_id(self.json_request.get('document', ''))
        if not link_document:
            raise HttpErrorException.bad_request('invalid document id')

        if self.json_request.get('parent', '') != project.key.id():
            parent = Concept.get_by_id(self.json_request.get('parent', ''))
            if not parent:
                raise HttpErrorException.bad_request('invalid parent id')
        else:
            parent = project

        next_sibling = None
        if self.json_request.get('next_sibling'):
            next_sibling = Concept.get_by_id(self.json_request.get('next_sibling', ''))

        children = ndb.get_multi(parent.children)
        for child in children:
            if child and child.key.id() == self.concept.key.id():
                raise HttpErrorException.bad_request('can not link same concept twice under same parent')

        original_project = self.concept.project.get()
        concept_link = ConceptLink()
        concept_link.link_id = server.create_uuid()
        concept_link.created_ts = datetime.now()
        concept_link.modified_ts = datetime.now()
        concept_link.project = project.key
        concept_link.parent = parent.key
        concept_link.document = link_document.key
        concept_link.distilled_document = original_project.distilled_document
        self.concept.linked_to.append(concept_link)

        if next_sibling:
            index = parent.children.index(next_sibling.key)
            parent.children.insert(index, self.concept.key)
        else:
            parent.children.append(self.concept.key)

        ndb.put_multi([parent, self.concept])
        self.write_json_response(self.concept.to_dict(self.user, project=project))

        action_data = {
            'concept': self.concept.to_dict(self.user, project),
            'next_sibling': next_sibling.key.id() if next_sibling else '',
            'parent': parent.key.id(),
        }

        trans = Transaction(action='con_lnk', user=self.user.key, artifact=self.concept.key,
                            project=project.key, action_data=action_data)
        trans.put()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ns = next_sibling
            # check if channel token has permission to view the concept or its new parent
            auth_channel_token = ChannelToken.remove_unauthorized_users(channel_token, [self.concept, parent])
            # if nothing is returned continue to next token
            if len(auth_channel_token) == 0:
                continue

            # Check if there is a next sibling, if so then check if the user has permission to read it.
            # If the token does not, we get the next sibling after it. Continue till we find one
            # the token can read or we run out of siblings in which case the concept will be the last
            # child for this tokens instance of the parent.
            ach = auth_channel_token
            if ns:
                ach = ChannelToken.remove_unauthorized_users(auth_channel_token, [ns])
                while len(ach) == 0 and ns is not None:
                    ns = ns.get_next_sibling()
                    ach = ChannelToken.remove_unauthorized_users(auth_channel_token, [ns])

            # Adjust the transactions next sibling for this token.
            # This will not be save to the server.
            trans.action_data.update(next_sibling=ns.key.id() if ns else '')

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }

            ChannelToken.broadcast_message(ach, message)

    # TODO: Need to make this handler multiple phrasing, attributes, crawlcontext, ...
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, concept_id=None):
        self.get_analytic_session()
        concept_json = self.json_request

        project_id = concept_json.get('project', None)
        project = Project.get_by_id(project_id)

        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        parent = concept_json.get('parent', None)
        if parent == project.key.id():
            parent = None
        if parent:
            parent = Concept.get_by_id(parent)
            if not parent:
                raise HttpErrorException.bad_request('invalid parent id')

        if not parent:
            if not project.has_permission_edit_children(self.user):
                raise HttpErrorException.forbidden()
        else:
            if not parent.has_permission_edit_children(self.user):
                raise HttpErrorException.forbidden()

        document = project.get_distilled_document()
        attributes = concept_json.get('attributes', None)
        attribute = None

        if attributes:
            attribute = Attributes(
                key=Attributes.create_key(),
                project=project.key,
                document=document.key,
                attributes=attributes
            )

        crawlcontext = CrawlContext(
            key=CrawlContext.create_key(),
            project=project.key,
            document=document.key,
            crawl=True
        )

        phrasing_text = concept_json.get('phrasing_text', '')
        phr_perm = Permission(
            key=Permission.create_key(),
            permissions=Permission.init_perm_struct(Phrasing.operations_list),
            project=project.key
        )

        phrasing = Phrasing(
            key=Phrasing.create_key(),
            text=phrasing_text,
            owner=[self.user.key],
            permissions=phr_perm.key,
            project=project.key
        )

        phr_perm.artifact = phrasing.key

        con_perm = Permission(
            key=Permission.create_key(),
            permissions=Permission.init_perm_struct(Concept.operations_list),
            project=project.key
        )

        concept = Concept(
            key=Concept.create_key(),
            owner=[self.user.key],
            project=project.key,
            distilled_phrasing=phrasing.key,
            phrasings=[phrasing.key],
            crawlcontext=[crawlcontext.key],
            permissions=con_perm.key
        )

        con_perm.artifact = concept.key
        phrasing.concept = concept.key
        phrasing.originating_document = document.key
        crawlcontext.concept = concept.key

        if attribute:
            concept.attributes = [attribute.key]
            attribute.put()

        if not parent:
            parent = project
            concept.parent_perms.append(project.permissions)
        else:
            concept.parent = parent.key
            concept.parent_perms = parent.parent_perms
            concept.parent_perms.append(parent.permissions)

        next_sibling_id = concept_json.get('nextSibling', None)
        next_sibling = None
        index = len(parent.children)

        if next_sibling_id:
            next_sibling = Concept.get_by_id(next_sibling_id)
            if not next_sibling:
                raise HttpErrorException.bad_request('invalid next sibling id')
            if not next_sibling.has_permission_read(self.user):
                raise HttpErrorException.forbidden()
            if next_sibling:
                index = parent.get_concept_index(next_sibling)

        parent.children.insert(index, concept.key)
        media_url = concept_json.get('media_url', None)

        if media_url:
            r = requests.get(media_url, stream=True)
            concept.media_id = server.create_uuid()
            filename = '/' + server.GCS_BUCKET_NAME + '/' + concept.media_id
            image_data = StringIO(r.content).getvalue()

            if 'image' not in r.headers['content-type']:
                raise HttpErrorException.bad_request('media must be an image')
            else:
                f = gcs.open(filename, mode='w', content_type=r.headers['content-type'])
                f.write(image_data)
                f.close()
                concept.media_blob = blobstore.create_gs_key('/gs' + filename)
                concept.media_ready = True

        if self.user.in_org():
            phrasing.organization = self.user.organization
            concept.organization = self.user.organization

        ndb.put_multi([crawlcontext, phrasing, phr_perm, con_perm, concept, parent])

        index = self.user.get_put_index()
        concept.index_phrasings(index)

        project.pw_modified_ts = datetime.now()
        project.put()

        concept.record_analytic('con_new', self.analytic_session, meta_data={'depth': concept.depth})

        self.write_json_response(concept.to_dict(self.user, project))

        self.get_channel_token()
        action_data = {
            'concept': concept.to_dict(self.user, project),
            'next_sibling': next_sibling.key.id() if next_sibling else '',
        }

        trans = Transaction(action='con_new', user=self.user.key, artifact=concept.key,
                            project=project.key, action_data=action_data)
        trans.put()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ns = next_sibling
            # check if channel token has permission to view the concept or its new parent
            auth_channel_token = ChannelToken.remove_unauthorized_users(channel_token, [concept, parent])
            # if nothing is returned continue to next token
            if len(auth_channel_token) == 0:
                continue

            # Check if there is a next sibling, if so then check if the user has permission to read it.
            # If the token does not, we get the next sibling after it. Continue till we find one
            # the token can read or we run out of siblings in which case the concept will be the last
            # child for this tokens instance of the parent.
            ach = auth_channel_token
            if ns:
                ach = ChannelToken.remove_unauthorized_users(auth_channel_token, [ns])
                while len(ach) == 0 and ns is not None:
                    ns = ns.get_next_sibling()
                    ach = ChannelToken.remove_unauthorized_users(auth_channel_token, [ns])

            # Adjust the transactions next sibling for this token.
            # This will not be save to the server.
            trans.action_data.update(next_sibling=ns.key.id() if ns else '')

            message = {
                'user': self.get_user_channel_data(),
                'transaction': trans.to_dict(self.user)
            }

            ChannelToken.broadcast_message(ach, message)

    @cerberus_handlers.exception_callback
    def delete(self, concept_id=None):
        if self.request.get('token_id') is None:
            raise HttpErrorException.bad_request('no token id given')

        self.user.current_token_id = self.request.get('token_id')

        if not concept_id:
            raise HttpErrorException.bad_request('no concept id given')

        if len(concept_id) > 32:
            concept = Concept.get_by_id(concept_id[:32])
            link_id = concept_id[32:]
        else:
            concept = Concept.get_by_id(concept_id)
            link_id = None

        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not concept.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        self.get_analytic_session()
        link = None

        if link_id:
            link = concept.get_link(link_id)
        project = concept.project.get() if not link else link.project.get()

        # Must get Channel Tokens before deleting concept
        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept])
        trans = Transaction(action='con_del', user=self.user.key, artifact=concept.key,
                            project=project.key, action_data={'link': link_id})
        trans.put()

        if not link:
            concept.record_analytic('con_del', self.analytic_session, meta_data={'depth': concept.depth})
            concept.delete(self.user)
            annos = Marker.query(Marker.concept == concept.key).fetch()
            for anno in annos:
                anno.key.delete()
        else:
            concept.linked_to.remove(link)
            concept.put()
            parent = link.parent.get()
            parent.children.remove(concept.key)
            parent.put()

        project.pw_modified_ts = datetime.now()
        project.put()

        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }

        ChannelToken.broadcast_message(channel_tokens, message)

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True


class ConceptChildrenHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, parent='none'):
        project = Project.get_by_id(self.request.get('project', 'none'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        if parent == project.id:
            parent = project
        else:
            parent = Concept.get_by_id(parent)

        if not parent:
            raise HttpErrorException.bad_request('invalid concept id')

        children = ndb.get_multi(parent.children)
        children_ids = []

        for child in children:
            if child and child.has_permission_read(self.user):
                children_ids.append(child.id)

        self.write_json_response({'children': children_ids})


class MediaDownloadHandler(blobstore_handlers.BlobstoreDownloadHandler, AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, concept=None):
        if not concept and not Concept.valid_id(concept):
            raise HttpErrorException.bad_request('invalid concept id')

        concept = Concept.get_by_id(concept)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not concept.has_permission_read(self.user):
            raise HttpErrorException.forbidden()

        bucket = server.GCS_BUCKET_NAME
        if not concept.media_id:
            # concept.corrupted = True
            # concept.put()
            raise HttpErrorException.not_found('image not found')

        concept.record_analytic('con_med_vw', self.analytic_session, meta_data={'mime_type': concept.media_mime_type})
        filename = '/' + bucket + '/' + concept.media_id

        if self.request.get('type') == 'base64':
            f = gcs.open(filename, mode='r')
            stats = gcs.stat(filename)
            base64_str = StringIO()
            base64.encode(f, base64_str)
            self.write_json_response({'base64': base64_str.getvalue(), 'content_type': stats.content_type})
        else:
            key = blobstore.create_gs_key('/gs' + filename)
            self.send_blob(key)

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True


class MediaUploadHandler(blobstore_handlers.BlobstoreUploadHandler, AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def post(self, concept=None):
        if not concept:
            raise HttpErrorException.bad_request('no concept id given')

        concept = Concept.get_by_id(concept)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id given')
        if not concept.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        bucket = server.GCS_BUCKET_NAME
        media_data = self.request.POST.get('image')
        concept.media_id = server.create_uuid()
        concept.media_mime_type = media_data.type

        filename = '/' + bucket + '/' + concept.media_id
        f = gcs.open(filename, mode='w', content_type=media_data.type)
        f.write(media_data.value)
        f.close()

        concept.media_blob = blobstore.create_gs_key('/gs' + filename)
        concept.put()

        project = concept.project.get()
        project.pw_modified_ts = datetime.now()
        project.put()

    def on_authentication_fail(self, method):
        raise HttpErrorException.forbidden()
