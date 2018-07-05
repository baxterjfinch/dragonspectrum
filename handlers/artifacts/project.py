import os
import json
import time
import logging
import datetime

from google.appengine.ext import ndb, deferred
from google.appengine.api import channel, memcache


# noinspection PyUnresolvedReferences
from cerberus import handlers as cerberus_handlers

import server
from server import spectra
from server import ttindex
from server import tt_logging
from models.account.user import User
from models.analytic import AnalyticsSession
from server.importer.importer import ImporterTask
from server.importer.restore import ProjectRestore
from models.account.organization import Organization
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT
from models.artifacts import Project, ProjectUserVotes, Document, Concept, Phrasing, Permission, \
    Attributes, ChannelToken, Transaction

log = logging.getLogger('tt')

__all__ = [
    'ProjectHomeHandler',
    'ProjectHandler',
    'AnalyticHandler',
    'ProjectImporterHandler',
    'ProjectRestoreHandler',
    'ChannelConnectHandler',
    'ChannelDisconnectedHandler',
    'SearchLibraryHandler',
    'SearchProjectHandler',
    'ChannelTokenHandler',
    'ChannelUsersHandler',
    'ChannelPingHandler',
]


class ProjectHomeHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self):
        self._create_analytic_session()
        projects = Project.get_user_projects(self.user)

        debug_level = 0
        if os.environ.get('SERVER_SOFTWARE', '').startswith('Development'):
            debug_level = 3
        try:
            debug_level = int(self.request.get('debug_level', debug_level))
        except ValueError:
            debug_level = 0

        template_data = {
            'title': 'thinkTank',
            'display_name': self.user.display_name,
            'nav_bar_title': 'thinkTank',
            'projects': projects,
            'data': {
                'page': 'home',
                'user': json.dumps(self.user.to_dict(user=self.user)),
                'projects': json.dumps(projects),
                'an_token': self.analytic_session.key.id(),
                'debug_level': debug_level,
            },
            'domain': self.request.host_url,
        }
        template_index = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template_index.render(template_data))

    def _create_analytic_session(self):
        analytic_session = AnalyticsSession(
            id=server.create_uuid(),
            ip_addr=self.request.remote_addr,
            user_agent=self.request.user_agent,
            host=self.request.host,
            host_url=self.request.host_url,
            referer=self.request.referer,
        )

        if not self.user.is_world_user():
            analytic_session.user = self.user.key

        analytic_session.put()
        memcache.add(analytic_session.key.id(), analytic_session, namespace='analytics')
        self.analytic_session = analytic_session

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)


class ProjectHandler(AuthorizationRequestHanlder):
    project = None
    client_debug = False
    client_check_auth = True
    loader_configs = {}

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, project_id=None):
        if project_id:
            if not Project.valid_id(project_id):
                raise HttpErrorException.bad_request('invalid project id')

            self.project = Project.get_by_id(project_id)
            if not self.project:
                raise HttpErrorException.bad_request('invalid project id')

            if not self.project.has_permission_read(self.user):
                lr = tt_logging.construct_log(
                    msg_short='User does not have permission to access this project',
                    log_type=tt_logging.SECURITY,
                    request=self.request,
                    artifact=self.project,
                    request_user=self.user
                )
                log.info(lr['dict_msg']['msg'], extra=lr)
                self.redirect('/', abort=True)

            self._serve_page()
        elif self.request.get('type') == 'json':
            self._serve_json()

    def _serve_page(self):
        self._create_analytic_session()
        self.project.record_analytic('pro_opn', self.analytic_session)

        doc = None
        if self.request.get('doc') != '':
            doc = Document.get_by_id(self.request.get('doc'))
            if not doc:
                raise HttpErrorException.bad_request('invalid doc id given')
            if doc.project != self.project.key:
                raise HttpErrorException.bad_request('invalid doc id given')

        if self.request.get('active_concept') != '':
            act_con_path = self.request.get('active_concept')
        elif self.request.get('act_con') != '':
            act_con_path = self.request.get('act_con')
        else:
            act_con_path = None

        if self.request.get('debug').lower() == 'true':
            self.client_debug = True

        if self.request.get('check_auth').lower() == 'false':
            self.client_check_auth = False

        self._get_concept_loader_configs()

        if self.user.is_world_user():
            self._serve_worldshare_page(doc, act_con_path)
        else:
            self._serve_project_page(doc, act_con_path)

    def _serve_worldshare_page(self, doc, act_con_path):
        template_index = JINJA_ENVIRONMENT.get_template('worldshare_project.html')

        if not doc:
            doc = self.project.distilled_document.get()

        if doc.project != self.project.key:
            raise HttpErrorException.bad_request('invalid doc id given')

        if not doc.has_permission_read(self.user):
            self.redirect('/', abort=True)

        tree = False
        if self.request.get('tree') != '':
            if self.request.get('tree') == 'true':
                tree = True

        nav = True
        if self.request.get('nav') != '' and not tree and act_con_path is None:
            if self.request.get('nav') == 'false':
                nav = False

        depth = -1
        if self.request.get('depth') not in ['all', 'max', '']:
            depth = self._to_int(self.request.get('depth'))

        debug_level = 0
        if os.environ.get('SERVER_SOFTWARE', '').startswith('Development'):
            debug_level = 3
        try:
            debug_level = int(self.request.get('debug_level', debug_level))
        except ValueError:
            debug_level = 0

        template_data = {
            'data': json.dumps({
                'project': self.project.to_dict(self.user),
                'user': self.user.to_dict(),
                'act_con_path': act_con_path,
                'doc': doc.key.id(),
                'page': 'world',
                'tree': tree,
                'nav': nav,
                'depth': depth,
                'debug': self.client_debug,
                'check_auth': self.client_check_auth,
                'loader_configs': self.loader_configs,
                'an_token': self.analytic_session.key.id(),
                'debug_level': debug_level,
            }),
            'display_name': self.user.display_name,
            'tree': tree,
            'nav': nav,
        }

        self.response.write(template_index.render(template_data))

    def _serve_project_page(self, doc, act_con_path,):
        open_chal = False
        if self.request.get('open_chal').lower() == 'false':
            open_chal = False

        context_menu = True
        if self.request.get('context_menu').lower() == 'false':
            context_menu = False

        template_index = JINJA_ENVIRONMENT.get_template('project.html')

        display_name = self.user.display_name
        short_name = (display_name[:14] + '...') if len(display_name) > 17 else display_name

        debug_level = 0
        if os.environ.get('SERVER_SOFTWARE', '').startswith('Development'):
            debug_level = 3
        try:
            debug_level = int(self.request.get('debug_level', debug_level))
        except ValueError:
            debug_level = 0

        template_data = {
            'data': json.dumps({
                'project': self.project.to_dict(self.user),
                'user': self.user.to_dict(),
                'act_con_path': act_con_path,
                'doc': doc.key.id() if doc else None,
                'page': 'project',
                'debug': self.client_debug,
                'check_auth': self.client_check_auth,
                'loader_configs': self.loader_configs,
                'open_chal': open_chal,
                'context_menu': context_menu,
                'an_token': self.analytic_session.key.id(),
                'debug_level': debug_level,
            }),
            'display_name': short_name,
            'project': self.project,
        }

        lr = tt_logging.construct_log(
            msg_short='Opened Project',
            log_type=tt_logging.USER,
            request=self.request,
            artifact=self.project,
            request_user=self.user
        )
        log.info(lr['dict_msg']['msg'], extra=lr)

        self.response.write(template_index.render(template_data))

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

    def _serve_json(self):
        if self.request.get('organization_projects') != '':
            if self.request.get('organization_projects') == 'all':
                self._serve_org_project_json()
        else:
            self._serve_project_json()

    def _serve_org_project_json(self):
        organization = Organization.get_by_id(self.request.get('organization_id'))

        if not self.user.is_admin:
            lr = tt_logging.construct_log(
                msg_short='Non-Admin User Attemped to Access all Org Projects',
                log_type=tt_logging.SECURITY,
                request=self.request,
                artifact=organization,
                request_user=self.user
            )
            log.warning(lr['dict_msg']['msg'], extra=lr)

            raise HttpErrorException.forbidden()
        else:
            project_arry = Project.get_org_projects(organization, self.user)
            self.write_json_response(project_arry)

    def _serve_project_json(self):
        depth = 0
        if self.request.get('depth').strip() != '':
            depth = self._to_int(self.request.get('depth'))

        if self.request.get('project_id').strip() != '':
            project = Project.get_by_id(self.request.get('project_id').strip())

            if not project.has_permission_read(self.user):
                lr = tt_logging.construct_log(
                    msg_short='User does not have permission to access this project',
                    log_type=tt_logging.SECURITY,
                    request=self.request,
                    artifact=project,
                    request_user=self.user
                )
                log.info(lr['dict_msg']['msg'], extra=lr)

                raise HttpErrorException.forbidden()

            project_dict = project.to_dict(depth, self.user, get_treeview=self.request.get('get_treeview'))
        else:
            q = Project.query(Project.owner == self.user.key)

            projects = []
            for results in q.iter():
                if results.has_permission_read(self.user):
                    projects.append(results)

            groups = ndb.get_multi(self.user.groups)
            for group in groups:
                pros = ndb.get_multi(group.artifacts)
                index = 0

                for pro in pros:
                    if pro is None:
                        group.artifacts.remove(group.artifacts[index])
                        lr = tt_logging.construct_log(
                            msg_short='Found Broken Project Key',
                            msg='Found broken project key (%s) in group artifact list'
                                '\n Key has been removed' % group.artifacts[index],
                            log_type=tt_logging.SECURITY,
                            request=self.request,
                            request_user=self.user
                        )
                        log.info(lr['dict_msg']['msg'], extra=lr)

                    if pro.has_permission_read(self.user):
                        if pro not in projects:
                            projects.append(pro)

                    index += 1

            project_dict = []
            for project in projects:
                project_dict.append(project.to_dict(self.user))

        self.write_json_response(project_dict)

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


    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, project_id=None):
        if self.json_request.get('title') is None:
            raise HttpErrorException.bad_request('invalid project title')

        if self.json_request.get('distilled_document') is None:
            raise HttpErrorException.bad_request('invalid document')

        distilled_document = self.json_request.get('distilled_document')
        if not distilled_document.get('title'):
            raise HttpErrorException.bad_request('invalid document title')

        doc_perm = Permission(
            permissions=Permission.init_perm_struct(Document.operations_list),
            key=Permission.create_key()
        )

        doc = Document(
            key=Document.create_key(),
            title=distilled_document.get('title'),
            subtitle=distilled_document.get('subtitle'),
            author=distilled_document.get('author', self.user.full_name),
            version=distilled_document.get('version', 'v0.1'),
            date=distilled_document.get('date', datetime.datetime.now().year),
            copyright_text=distilled_document.get('copyright', ''),
            description=distilled_document.get('description', ''),
            owner=[self.user.key],
            permissions=doc_perm.key,
        )

        doc_perm.artifact = doc.key
        pro_perm = Permission(
            permissions=Permission.init_perm_struct(Project.operations_list),
            key=Permission.create_key()
        )

        pro = Project(
            key=Project.create_key(),
            title=self.json_request.get('title'),
            distilled_document=doc.key,
            permissions=pro_perm.key,
            owner=[self.user.key],
        )

        pro_perm.artifact = pro.key
        pro_perm.project = pro.key
        doc_perm.project = pro.key
        doc.project = pro.key

        doc.parent_perms.append(pro_perm.key)

        if self.user.in_org():
            doc.organization = self.user.organization
            pro.organization = self.user.organization

        ndb.put_multi([doc_perm, doc, pro_perm, pro])

        index = self.user.get_put_index()
        doc.index(index)
        pro.index(index)

        self.write_json_response(pro.to_dict(self.user))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, project_id=None):
        self.get_channel_token()

        if not project_id and not Project.valid_id(project_id):
            raise HttpErrorException.bad_request('no project id')

        self.project = Project.get_by_id(project_id)
        if not self.project:
            raise HttpErrorException.bad_request('invalid project id')

        self.get_analytic_session()
        if self.json_request.get('permission'):
            self._add_perm()
        if not self.json_request.get('permission') and self.json_request.get('group_id'):
            self._rm_perm()
        if self.json_request.get('remove_group'):
            self._remove_group()
        if self.json_request.get('add_attribute'):
            self._add_attribute()
        if self.json_request.get('title'):
            self._set_title()
        if self.json_request.get('up_vote'):
            self._up_vote()
        if self.json_request.get('down_vote'):
            self._down_vote()
        if self.json_request.get('shared'):
            self._shared()

        self.project.pw_modified_ts = datetime.datetime.now()
        self.project.put()

        self.user.put()

        self.write_json_response(self.project.to_dict(self.user))

    def _add_perm(self):
        group, required = self.project.validate_add_perm_request(self.json_request, self.user)

        self.project.add_group_perm(
            group,
            self.json_request.get('operation'),
            self.json_request.get('permission'),
            required
        )

        if self.json_request.get('operation') == 'read':
            self.project.record_analytic('pro_perm', self.analytic_session)

        action_data = {
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'permission': self.json_request.get('permission'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(
            action='pro_perm_add',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        org = self.project.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.project.has_permission_read(channel_token.user.get()) and not
                    self.project.had_permission_read(channel_token.user.get())):
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
        group, required = self.project.validate_rm_perm_request(self.json_request, self.user)

        self.project.remove_group_perm(
            group,
            self.json_request.get('operation'),
            required
        )

        action_data = {
            'group': group.key.id(),
            'operation': self.json_request.get('operation'),
            'type': 'required' if required else 'shared',
            'hidden': False,
        }

        trans = Transaction(
            action='pro_perm_rmv',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        org = self.project.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.project.has_permission_read(channel_token.user.get()) and not
                    self.project.had_permission_read(channel_token.user.get())):
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
        group = self.project.validate_rm_group_request(self.json_request, self.user)

        for op in self.project.operations_list:
            self.project.remove_group_perm(group, op)
            self.project.remove_group_perm(group, op, required=True)

        self.project.record_analytic('pro_perm', self.analytic_session)

        action_data = {
            'group': group.key.id(),
            'hidden': False,
        }

        trans = Transaction(
            action='pro_grp_rmv',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        org = self.project.organization.get()

        # Get project channel tokens
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        # Loop through each channel token to test permissions on next sibling
        for channel_token in channel_tokens:
            ach_user = channel_token.user.get()

            if (not self.project.has_permission_read(channel_token.user.get()) and not
                    self.project.had_permission_read(channel_token.user.get())):
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

        attr = self.project.get_attr(doc.key)
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
            attr = Attributes(project=self.project.project, document=doc.key, attributes=attr)
            attr.put()
            self.project.attributes.append(attr.key)

        action_data = {
            'attribute': r_attr,
            'document': doc.key.id()
        }

        trans = Transaction(
            action='pro_attr_add',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.project, doc])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _set_title(self):
        title = self.json_request.get('title')
        if title.rstrip() == '':
            raise HttpErrorException.bad_request('empty title given')

        if not self.project.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        self.project.title = title

        action_data = {'title': title}
        trans = Transaction(
            action='pro_title',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.project])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _up_vote(self):
        if not self.project.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        vote_changed = True

        pvote = self.project.get_user_vote(self.user)

        # If there is no previous vote, they can vote up or down
        if pvote is None:
            self.project.project_score += 1
            uvote = ProjectUserVotes(project=self.project.key, user=self.user.key, direction='up')
            uvote.put()

        # If there was a previous vote and its down. We remove their vote, otherwise they are trying
        # to vote up again and we disallow that.
        elif pvote is not None and pvote.direction == 'down':
            self.project.project_score += 1
            pvote.key.delete()

        else:
            vote_changed = False

        if vote_changed:
            cost = spectra.calculate_cost('pro_up_vote', user=self.user, artifact=self.project)
            if not spectra.has_sufficient_points(cost, self.user):
                raise HttpErrorException.forbidden()
            self.user.sub_spectra_cost(cost)

        action_data = {'project_score': self.project.project_score}
        trans = Transaction(
            action='pro_up_vote',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.project])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _down_vote(self):
        if not self.project.has_permission_write(self.user):
            raise HttpErrorException.forbidden()

        vote_changed = True

        # If there is no previous vote, they can vote up or down
        pvote = self.project.get_user_vote(self.user)
        if pvote is None:
            self.project.project_score -= 1
            uvote = ProjectUserVotes(project=self.project.key, user=self.user.key, direction='down')
            uvote.put()

        # If there was a previous vote and its down. We remove their vote, otherwise they are trying
        # to vote up again and we disallow that.
        elif pvote is not None and pvote.direction == 'up':
            self.project.project_score -= 1
            pvote.key.delete()

        else:
            vote_changed = False

        if vote_changed:
            cost = spectra.calculate_cost('pro_down_vote', user=self.user, artifact=self.project)
            if not spectra.has_sufficient_points(cost, self.user):
                raise HttpErrorException.forbidden()
            self.user.sub_spectra_cost(cost)

        action_data = {'project_score': self.project.project_score}
        trans = Transaction(
            action='pro_down_vote',
            user=self.user.key,
            artifact=self.project.key,
            project=self.project.key,
            action_data=action_data
        )
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(self.project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [self.project])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def _shared(self):
        self.project.record_analytic('pro_soc_sha', self.analytic_session)

    @cerberus_handlers.exception_callback
    def delete(self, project_id=None):
        if self.request.get('token_id') is None:
            raise HttpErrorException.bad_request('no token id')

        self.user.current_token_id = self.request.get('token_id')
        if not project_id and not Project.valid_id(project_id):
            raise HttpErrorException.bad_request('no project id')

        project = Project.get_by_id(project_id)
        if not project:
            raise HttpErrorException.bad_request('invaild project id')
        if not project.has_permission_delete(self.user):
            raise HttpErrorException.forbidden()

        trans = Transaction(
            action='pro_del',
            user=self.user.key,
            artifact=project.key,
            project=project.key
        )
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [project])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

        project.delete(self.user)

    def on_authentication_fail(self, method):
        self.user = User.get_world_user()
        return True


class AnalyticHandler(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.enable_json(True)
    def post(self):
        self.get_analytic_session()
        if not self.analytic_session:
            return
        if self.json_request.get('app_code_name', None):
            self.analytic_session.app_code_name = str(self.json_request.get('app_code_name', None))
        if self.json_request.get('app_name', None):
            self.analytic_session.app_name = str(self.json_request.get('app_name', None))
        if self.json_request.get('app_version', None):
            self.analytic_session.app_version = str(self.json_request.get('app_version', None))
        if 'cookie_enabled' in self.json_request.keys():
            self.analytic_session.cookie_enabled = self.json_request.get('cookie_enabled')
        if self.json_request.get('do_not_track', None):
            self.analytic_session.do_not_track = str(self.json_request.get('do_not_track', None))
        if self.json_request.get('geolocation', None):
            self.analytic_session.geolocation = str(self.json_request.get('geolocation', None))
        if self.json_request.get('language', None):
            self.analytic_session.language = str(self.json_request.get('language', None))
        if self.json_request.get('platform', None):
            self.analytic_session.platform = str(self.json_request.get('platform', None))
        if self.json_request.get('plugins', None):
            self.analytic_session.plugins = self.json_request.get('plugins', None)
        if self.json_request.get('product', None):
            self.analytic_session.product_sub = str(self.json_request.get('product_sub', None))
        if self.json_request.get('vender', None):
            self.analytic_session.vender = str(self.json_request.get('vender', None))
        self.analytic_session.put()


class ProjectImporterHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, importer_id=None):
        if self.request.get('importer_status_id') != '':
            status = ImporterTask.get_importer_status(self.request.get('importer_status_id'))
            self.write_json_response(status)
        elif self.request.get('importer_results_id') != '':
            project_id = ImporterTask.get_importer_results(self.request.get('importer_results_id'))
            self.write_json_response(project_id)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, importer_id=None):
        self.get_analytic_session()
        self.json_request['analytic_session'] = self.analytic_session
        results = ImporterTask.import_project(self.json_request.get('command'), self.json_request, self.user)
        self.write_json_response(results)


class ProjectRestoreHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, restore_id):
        if self.request.get('restore_status_id') != '':
            status = ProjectRestore.get_restore_status(self.request.get('restore_status_id'))
            self.write_json_response(status)
        elif self.request.get('restore_results_id') != '':
            project_id = ProjectRestore.get_restore_results(self.request.get('restore_results_id'))
            self.write_json_response(project_id)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, restore_id=None):
        results = ProjectRestore.restore(self.json_request, self.user)
        self.write_json_response(results)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, restore_id=None):
        results = ProjectRestore.restore(self.json_request, self.user)
        self.write_json_response(results)


class ChannelConnectHandler(AuthorizationRequestHanlder):
    auth_required = False  # turn off the authentication for development

    @cerberus_handlers.exception_callback
    def post(self):
        client_id = self.request.get('from')
        channel_token = ChannelToken.get_by_id(client_id)
        if not channel_token:
            log.warning('No channel token found to connect')
        else:
            channel_token.connected = True
            channel_token.put()


class ChannelDisconnectedHandler(AuthorizationRequestHanlder):
    auth_required = False  # turn off the authentication for development

    @cerberus_handlers.exception_callback
    def post(self):
        client_id = self.request.get('from')
        log.debug('User Disconnected: %s', client_id)
        channel_token = ChannelToken.get_by_id(client_id)

        if channel_token:
            log.debug('Found Channel Token')
            channel_token.key.delete()

            channel_tokens = ChannelToken.get_by_project_key(channel_token.project, channel_token)
            log.debug('Messaging Other Project Users')
            log.debug(channel_tokens)
            ChannelToken.broadcast_message(channel_tokens, {'channel_op': 'remove_user', 'user': client_id})
        else:
            log.debug('Did Not Find Channel Token')


class ChannelTokenHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self):
        if not self.request.get('project', None):
            raise HttpErrorException.bad_request('invalid project id')
        project = Project.get_by_id(self.request.get('project'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        client_id = server.create_uuid()
        token = self._create_custom_token(self.user.user_id + '_' + project.id)

        color = self.get_previous_color(project)
        if not color:
            color = ChannelToken.generate_color()

        channel_token = ChannelToken(
            key=ChannelToken.create_key(client_id),
            project=project.key,
            user=self.user.key,
            color=color,
            token=token
        )

        channel_token.put()
        self.write_json_response({'token': token, 'client_id': client_id})

    def get_previous_color(self, project):
        channel_tokens = ChannelToken.query(ChannelToken.user == self.user.key,
                                            ChannelToken.project == project.key).fetch(limit=1)
        if len(channel_tokens) > 0:
            return channel_tokens[0].color
        return None

    def _create_custom_token(self, uid, valid_minutes=60):
        """Create a secure token for the given id.

        This method is used to create secure custom JWT tokens to be passed to
        clients. It takes a unique id (uid) that will be used by Firebase's
        security rules to prevent unauthorized access. In this case, the uid will
        be the channel id which is a combination of user_id and game_key
        """
        custom_token = auth.create_custom_token(uid)
        return custom_token


class ChannelUsersHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    def get(self):
        if not self.request.get('project', None):
            raise HttpErrorException.bad_request('invalid project id')

        project = Project.get_by_id(self.request.get('project'))
        if not project:
            raise HttpErrorException.bad_request('invalid project id')

        self.get_user_channel_data()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens_list = []

        for channel_token in channel_tokens:
            user = channel_token.user.get()
            if channel_token:
                channel_tokens_list.append({
                    'username': user.username,
                    'display_name': user.display_name,
                    'client_id': channel_token.client_id,
                    'link_id': channel_token.link_id,
                    'color': channel_token.color,
                    'concept': channel_token.concept.id() if channel_token.concept else '',
                    'document': channel_token.document.id() if channel_token.document else '',
                })

        self.write_json_response(channel_tokens_list)
        self.ping_test(project)

    def ping_test(self, project):
        if not memcache.get(project.key.id(), namespace='channel_ping'):
            memcache.set(project.key.id(), True, namespace='channel_ping')
            deferred.defer(check_ping_replies, project.key, _queue='collaboration')


def check_ping_replies(project_key):
    try:
        time.sleep(10)

        channel_tokens = ChannelToken.get_by_project_key(project_key)
        for channel_token in channel_tokens:
                channel.send_message(channel_token.client_id, json.dumps({'channel_op': 'ping'}))

        time.sleep(10)

        good_channel_tokens = []
        good_channel_tokens_ids = []

        for chan_token in channel_tokens:
            reply = memcache.get(chan_token.client_id)
            memcache.delete(chan_token.client_id)

            if not reply:
                chan_token.key.delete()
            else:
                good_channel_tokens.append(chan_token)
                good_channel_tokens_ids.append(chan_token.client_id)

        for chan_token in good_channel_tokens:
            channel.send_message(chan_token.client_id, json.dumps({'channel_op': 'valid_users',
                                                                   'users': good_channel_tokens_ids}))
    except Exception as e:
        log.error('Error ping channel users: %s', e.message)
    finally:
        memcache.delete(project_key.id(), namespace='channel_ping')


class ChannelPingHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    def post(self):
        self.get_channel_token()
        if self.user_channel_token:
            memcache.set(self.user_channel_token.client_id, 'here', time=60*5)


class SearchLibraryHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    def post(self):
        query_dict = self.json_request.get('query')
        if not query_dict:
            raise HttpErrorException.bad_request('no query given')

        if query_dict['return'] == 'project_ids':
            self.write_json_response({'projects': Project.search_projects(query_dict, self.user)})
        elif query_dict['return'] == 'concept_ids':
            self.write_json_response({'concepts': Concept.search_concept(query_dict, self.user)})


class SearchProjectHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    def post(self):
        query_dict = self.json_request.get('query')
        if not query_dict:
            raise HttpErrorException.bad_request('no query given')
        if not query_dict['pro']:
            raise HttpErrorException.bad_request('no project id given')

        project = Project.get_by_id(query_dict['pro'])
        if not project:
            raise HttpErrorException.bad_request('invalid project id given')
        if not project.has_permission(self.user, 'read'):
            raise HttpErrorException.forbidden()

        index = project.get_indexes(create_new=False)
        self.get_analytic_session()

        query_string = 'pro=%s typ=(phr OR anno_reply) (reply=(%s) OR phr=(%s))' % (
            project.key.id(),
            query_dict.get('string', ''),
            query_dict.get('string', '')
        )

        if index is not None and len(index) > 0:
            search_results = ttindex.ttsearch(index, query_string, limit=1000, use_cursor=False, user=self.user)

            concepts = []
            concept_ids = []

            while len(concepts) < 20 and search_results is not None:
                for sr in search_results:
                    if sr['fields']['con'] not in concept_ids:
                        concept_ids.append(sr['fields']['con'])

                        if sr['fields']['typ'] == 'phr':
                            concept = Concept.get_by_id(sr['fields']['con'])
                            phrasing = Phrasing.get_by_id(sr['id'])

                            if concept.has_permission_read(self.user) and phrasing.has_permission_read(self.user):
                                concepts.append({'con_id': sr['fields']['con'], 'phr_text': sr['fields']['phr']})
                        elif sr['fields']['typ'] == 'anno_reply':
                            concept = Concept.get_by_id(sr['fields']['con'])
                            document = Document.get_by_id(sr['fields']['doc'])

                            if concept.has_permission_read(self.user) and \
                                    document.has_permission_read(self.user) and \
                                    document.has_permission_annotation_read(self.user):
                                concepts.append({'con_id': sr['fields']['con'], 'phr_text': sr['fields']['reply']})

                    if len(concepts) >= 20:
                        break

                else:
                    search_results = ttindex.ttsearch(index, query_dict, limit=1000, user=self.user)

            self.write_json_response({'concepts': concepts})

        else:
            self.write_json_response({'concepts': ''})

        project.record_analytic('pro_search', self.analytic_session, meta_data={'sch_query': str(query_dict)})
