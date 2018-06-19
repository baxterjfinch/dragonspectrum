import json
import logging

from google.appengine.ext import ndb
from cerberus import handlers as cerberus_handlers

import user as user_user
from models.account import Organization, Group, User
from server import tt_logging
from server.handlers import AuthorizationRequestHanlder, requires_admin
from server.httperrorexception import HttpErrorException

__all__ = [
    'OrganizationHandler',
    'OrganizationAdminHandler',
    'GroupHandler',
    'GroupSearchHandler',
]

log = logging.getLogger('tt')


class OrganizationHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, org_id=None):
        if self.user.is_super_admin:
            self._serve_site_organizations()
        elif self.user.is_org_admin:
            self._serve_user_organization()
        else:
            lr = tt_logging.construct_log(
                msg_short='Non-Admin User Tried Access Organizations',
                msg='A Non-Admin user tried accessing other organizations',
                log_type=tt_logging.SECURITY, request_user=self.user,
                request=self.request
            )
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()

    def _serve_site_organizations(self):
        orgs_dict = []
        orgs = Organization.query()
        for o in orgs.iter():
            orgs_dict.append(o.to_dict())

        self.write_json_response(orgs_dict)

    def _serve_user_organization(self):
        self.write_json_response(self.user.organization.get().to_dict())

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, org_id=None):
        self.write_json_response(Organization.new(self, self.json_request, self.user))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, org_id=None):
        if not org_id:
            raise HttpErrorException.bad_request('no org_id given')

        org = Organization.get_by_id(org_id)
        if not org:
            raise HttpErrorException.bad_request('invalid org_id given')

        org.edit(self.request, self.json_request, self.user)

    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()


class OrganizationAdminHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, organization):
        if not organization and not Organization.valid_id(organization):
            raise HttpErrorException.bad_request('invalid organization id')

        organization = Organization.get_by_id(organization)
        if organization is None:
            raise HttpErrorException.bad_request('invalid organization id')

        user = user_user.User.get_by_id(self.json_request.get('username'))
        if user is None:
            raise HttpErrorException.bad_request('bad username')

        if not self.user.is_admin:
            lr = tt_logging.construct_log(
                msg_short='Non-Admin User Tried Adding Org Admin',
                msg='A Non-Admin user try setting another user as admin',
                log_type=tt_logging.SECURITY, request_user=self.user,
                affected_user=user, request=self.request,
                artifact=organization
            )
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()

        is_admin = self.json_request.get('is_admin')
        if is_admin is None and not type(is_admin) == bool:
            raise HttpErrorException.bad_request('invalid admin settings')

        if is_admin:
            if user.key not in organization.admins:
                organization.admins.append(user.key)
                organization.put()
                lr = tt_logging.construct_log(
                    msg_short='User was made organization admin',
                    log_type=tt_logging.USER, request_user=self.user, affected_user=user,
                    artifact=organization, request=self.request
                )
                log.info(lr['dict_msg']['msg'], extra=lr)
        else:
            if user.key in organization.admins:
                organization.admins.remove(user.key)
                organization.put()
                lr = tt_logging.construct_log(
                    msg_short='User was removed as organization admin',
                    log_type=tt_logging.USER, request_user=self.user, affected_user=user,
                    artifact=organization, request=self.request
                )
                log.info(lr['dict_msg']['msg'], extra=lr)


class GroupHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self):
        if self.request.get('organization_groups') is not '':
            if self.request.get('organization_groups') == 'all':
                organization = Organization.get_by_id(self.request.get('organization'))
                if organization.is_user(self.user) or self.user.is_super_admin:
                    hidden = False
                    if self.request.get('hidden') is not '':
                        hidden = self.request.get('hidden')

                    group_array = organization.get_all_groups()
                    if hidden and self.user.is_admin:
                        hidden_group_array = organization.get_all_hidden_groups()
                        group_array = group_array + hidden_group_array
                    elif self.user.is_admin:
                        hidden_group_array = organization.get_all_hidden_groups()
                        group_array = group_array + hidden_group_array
                    else:
                        user_hidden_groups = organization.get_user_hidden_groups(self.user)
                        for group in user_hidden_groups:
                            group_array.append(group.to_dict())

                    self.write_json_response(group_array)
                else:
                    lr = tt_logging.construct_log(
                        msg_short='User Tried Access Organization Groups',
                        msg='User (%s) tried to access groups that belongs to organization '
                            '(%s) and they are not in this organization' %
                            (self.user.key.id(), organization.key.id()),
                        log_type=tt_logging.SECURITY, request_user=self.user,
                        artifact=organization, request=self.request
                    )
                    log.warning(lr['dict_msg']['msg'], extra=lr)
                    raise HttpErrorException.forbidden()

            elif self.request.get('organization_groups') == 'mine':
                user_groups = self.user.get_groups()
                user_groups = ndb.get_multi(user_groups)
                user_groups_dict_list = []

                for group in user_groups:
                    user_groups_dict_list.append(group.to_dict())

                self.write_json_response(user_groups_dict_list)

        else:
            self._serve_user_groups()

    def _serve_user_groups(self):
        user_groups = self.user.get_groups()
        user_groups = ndb.get_multi(user_groups)
        user_groups_dict_list = []
        for group in user_groups:
            user_groups_dict_list.append(group.to_dict())
        self.write_json_response(user_groups_dict_list)

    @requires_admin(True)
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self):
        if not self.json_request.get('organization') and \
                not Organization.valid_id(self.json_request.get('organization')):
            raise HttpErrorException.bad_request('invalid organization id')

        org = Organization.get_by_id(self.json_request.get('organization'))
        if not org:
            raise HttpErrorException.bad_request('invalid organization id')

        name = self.json_request.get('name', None)
        hidden = self.json_request.get('hidden', False)
        description = self.json_request.get('description', '')

        if not name or name == 'super_admin' or name == 'admin':
            raise HttpErrorException.bad_request('invalid group name')

        if type(hidden) != bool:
            raise HttpErrorException.bad_request('invalid hidden type must be boolean')

        if Group.query(ndb.AND(Group.organization == org.key, Group.name == name)).count() > 0:
            raise HttpErrorException.bad_request('group name taken')
        group = Group(key=Group.create_key(), name=name, description=description, organization=org.key, active=True)
        if hidden:
            org.hidden_groups.append(group.key)
        else:
            org.groups.append(group.key)

        ndb.put_multi([group, org])
        if self.json_request.get('return', '') == 'group_dict':
            self.write_json_response(group.to_dict())

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, group):
        if not group and Group.valid_id(group):
            raise HttpErrorException.bad_request('invalid group id')

        group = Group.get_by_id(group)
        if group is None:
            raise HttpErrorException.bad_request('invalid group id')
        if not self.json_request.get('username', None):
            raise HttpErrorException.bad_request('invalid username')

        user = user_user.User.get_by_id(self.json_request.get('username'))
        if user is None:
            raise HttpErrorException.bad_request('invalid username')
        if not self.user.is_admin and not group.is_admin(self.user):
            lr = tt_logging.construct_log(
                msg_short='Non-Admin User Tried To Give Group Admin',
                msg='User (%s) tried to give User (%s) group admin for group (%s)Request:'
                    '%s' % (self.user.key.id(), user.key.id(), group.key.id(), str(self.request)),
                log_type=tt_logging.SECURITY, request_user=self.user, affected_user=user,
                artifact=group, request=self.request
            )
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()

        is_group_admin = self.json_request.get('is_group_admin')
        if is_group_admin is None:
            raise HttpErrorException.bad_request('no group settings')

        if is_group_admin:
            if user.key not in group.admins:
                group.admins.append(user.key)
                group.put()
                lr = tt_logging.construct_log(
                    msg_short='User was set a group admin', log_type=tt_logging.USER,
                    request_user=self.user, affected_user=user, artifact=group, request=self.request
                )
                log.info(lr['dict_msg']['msg'], extra=lr)
        else:
            if user.key in group.admins:
                group.admins.remove(user.key)
                group.put()
                lr = tt_logging.construct_log(
                    msg_short='User was removed as group admin', log_type=tt_logging.USER,
                    request_user=self.user, affected_user=user, artifact=group, request=self.request
                )
                log.info(lr['dict_msg']['msg'], extra=lr)

    @requires_admin(True)
    @cerberus_handlers.exception_callback
    def delete(self, group):
        if not group and not Group.valid_id(group):
            raise HttpErrorException.bad_request('invalid group id')

        group = Group.get_by_id(group)
        if not group:
            raise HttpErrorException.bad_request('invalid group id')
        group.delete(self)

        users = user_user.User.get_all_users(
            organization=group.organization.get(), to_dict=False,
            request_user=self.user, request=self
        )

        mod_users = []
        for user in users:
            if group.key in user.groups:
                user.groups.remove(group.key)
                mod_users.append(user)

        ndb.put_multi(mod_users)

    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()


class GroupSearchHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self):
        term = self.request.get('term', '')
        if term == '':
            raise HttpErrorException.bad_request('no search term given')

        limit = 10
        if self.request.get('limit', '') != '':
            try:
                limit = int(self.request.get('limit'))
            except ValueError:
                raise HttpErrorException.bad_request('limit must be integer')

        if self.user.is_super_admin and self.request.get('organization', '') != '':
            org = Organization.get_by_id(self.request.get('organization'))
            if not org:
                raise HttpErrorException.bad_request('invalid org id')
        else:
            if not self.user.organization:
                raise HttpErrorException.bad_request('user has not organization')
            org = self.user.organization.get()

        groups = org.get_all_group_objects()
        if self.user.is_admin:
            groups += org.get_all_hidden_group_objects()
        else:
            groups += org.get_user_hidden_groups(self.user)

        matched_groups = []
        for group in groups:
            if len(matched_groups) == limit:
                break
            if term.lower() in group.name.lower():
                matched_groups.append(group.to_dict())

        if self.request.get('callback', '') != '':
            self.response.write(self.request.get('callback') + '(%s)' % json.dumps(matched_groups))
        else:
            self.write_json_response(matched_groups)
