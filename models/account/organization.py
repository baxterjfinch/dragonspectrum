import re
import time
import logging

from google.appengine.ext import ndb

import server
from server import ttindex
from server import tt_logging
from server.httperrorexception import HttpErrorException

__all__ = [
    'Organization',
    'Group',
]


log = logging.getLogger('tt')


class OrganizationEntity(ndb.Model):
    created_ts = ndb.DateTimeProperty(auto_now=True)
    modified_ts = ndb.DateTimeProperty(auto_now=True)
    name = ndb.StringProperty(required=True)
    admins = ndb.KeyProperty(kind='User', repeated=True)

    @classmethod
    def create_key(cls, id_=None):
        return ndb.Key(cls.__name__, id_ if id_ else server.create_uuid())

    @staticmethod
    def valid_id(id_):
        if not isinstance(id_, basestring) or len(id_) != 32:
            return False
        return True if re.match(r'([a-fA-F\d]{32})', id_) else False

    @property
    def id(self):
        return self.key.id()

    def to_dict(self, *args, **kwargs):
        d = super(OrganizationEntity, self).to_dict(*args, **kwargs)
        d['created_ts'] = time.mktime(d['created_ts'].timetuple())
        d['modified_ts'] = time.mktime(d['modified_ts'].timetuple())
        admins = []
        for admin in d['admins']:
            admins.append(admin.id())
        d['admins'] = admins
        return d


class Organization(OrganizationEntity):
    description = ndb.StringProperty()
    domain = ndb.StringProperty()
    owner = ndb.StringProperty()
    webpage = ndb.StringProperty()
    point_of_contact = ndb.StringProperty()
    email = ndb.StringProperty()
    phone = ndb.StringProperty()
    fax = ndb.StringProperty()
    account_type = ndb.StringProperty()
    groups = ndb.KeyProperty(kind='Group', repeated=True)
    hidden_groups = ndb.KeyProperty(kind='Group', repeated=True)
    org_group = ndb.KeyProperty(kind='Group')

    @staticmethod
    def new(request, request_data, request_user):
        if not request_user.is_super_admin:
            lr = tt_logging.construct_log(msg_short='Non-Admin User Tried Creating New Organization',
                                          log_type=tt_logging.SECURITY, request_user=request_user,
                                          request=request)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        if request_data.get('name') is None:
            raise HttpErrorException.bad_request('no name given')
        if request_data.get('id') is None:
            raise HttpErrorException.bad_request('no organization id given')

        org = Organization(key=Organization.create_key(request_data.get('id').strip()))
        org.name = request_data.get('name').strip()
        org.groups.append(Group.get_worldshare_key())
        if request_data.get('description') is not None:
            org.description = request_data.get('description')
        if request_data.get('domain') is not None:
            org.domain = request_data.get('domain')
        if request_data.get('owner') is not None:
            org.owner = request_data.get('owner')
        if request_data.get('webpage') is not None:
            org.webpage = request_data.get('webpage')
        if request_data.get('point_of_contact') is not None:
            org.point_of_contact = request_data.get('point_of_contact')
        if request_data.get('email') is not None:
            org.email = request_data.get('email')
        if request_data.get('phone') is not None:
            org.phone = request_data.get('phone')
        if request_data.get('fax') is not None:
            org.fax = request_data.get('fax')
        if request_data.get('account_type') is not None:
            org.account_type = request_data.get('account_type')
        group = Group(key=Group.create_key(), name=org.name,
                      description=str(org.name) + '\'s organization group',
                      organization=org.key, active=True)
        group.put()
        org.groups.append(group.key)
        org.org_group = group.key
        org.put()
        lr = tt_logging.construct_log(msg_short='New Organization Was Created',
                                      log_type=tt_logging.DEFAULT, request_user=request_user,
                                      request=request, artifact=org)
        log.info(lr['dict_msg']['msg'], extra=lr)
        return org.to_dict()

    # FIXME: This was not completely converted to a staticmethod
    @staticmethod
    def edit(request, request_data, request_user):
        org = None
        if not request_user.is_admin and org.organization == request_user.key:
            lr = tt_logging.construct_log(msg_short='Non-Admin User Tried Altering Organization',
                                          log_type=tt_logging.SECURITY, request_user=request_user,
                                          request=request, artifact=org)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        if request_data.get('add'):
            if request_data.get('admin'):
                if request_data.get('user_id') == '':
                    raise HttpErrorException.bad_request('no user_id given')
                user = ndb.Key('User', request_data.get('user_id'))
                if not user:
                    raise HttpErrorException.bad_request('invalid user_id given')
                if user.key not in org.admins:
                    lr = tt_logging.construct_log(msg_short='User Was Added as Organization Admin',
                                                  log_type=tt_logging.USER, request_user=request_user,
                                                  request=request, artifact=org, affected_user=user)
                    log.info(lr['dict_msg']['msg'], extra=lr)
                    org.admins.append(user.key)
        if request_data.get('remove'):
            if request_data.get('remove') == 'admin':
                if request_data.get('user_id') == '':
                    raise HttpErrorException.bad_request('no user_id given')
                user = ndb.Key('User', request_data.get('user_id'))
                if not user:
                    raise HttpErrorException.bad_request('invalid user_id given')
                if user.key in org.admins:
                    lr = tt_logging.construct_log(msg_short='User Was Removed as Organization Admin',
                                                  log_type=tt_logging.USER, request_user=request_user,
                                                  request=request, artifact=org, affected_user=user)
                    log.info(lr['dict_msg']['msg'], extra=lr)
                    org.admins.remove(user.key)
        org.put()

    @staticmethod
    def delete(request, request_data, request_user):
        raise NotImplementedError()

    def is_user(self, user):
        if user.organization == self.key:
            return True

        return False

    def is_admin(self, user):
        if user.key in self.admins:
            return True

        return False

    def get_all_groups(self):
        q = ndb.get_multi(self.groups)
        groups = []
        for group in q:
            groups.append(group.to_dict())
        return groups

    def get_all_group_objects(self):
        return ndb.get_multi(self.groups)

    def get_all_hidden_groups(self):
        q = ndb.get_multi(self.hidden_groups)
        groups = []
        for group in q:
            groups.append(group.to_dict())
        return groups

    def get_all_hidden_group_objects(self):
        return ndb.get_multi(self.hidden_groups)

    def is_hidden_group(self, group):
        if isinstance(group, Group):
            group = group.key
        if group in self.hidden_groups:
            return True
        return False

    def get_user_hidden_groups(self, user):
        return ndb.get_multi(server.get_intersection(user.groups, self.hidden_groups))

    def get_indexes(self):
        return ttindex.get_indexes(namespace=self.key.id(), create_new=False)

    def to_dict(self):
        d = super(Organization, self).to_dict()
        d['id'] = self.key.id()
        del d['hidden_groups']
        d['org_group'] = d['org_group'].id()
        groups = []
        for group in d['groups']:
            groups.append(group.id())
        d['groups'] = groups
        return d


class Group(OrganizationEntity):
    description = ndb.StringProperty()
    organization = ndb.KeyProperty(kind='Organization')
    active = ndb.BooleanProperty(required=True)
    artifacts = ndb.KeyProperty(repeated=True)

    @staticmethod
    def new(request):
        if request.get('group_name') == "":
            raise HttpErrorException.bad_request('no group name given')
        if request.get('group_name') == 'super_admin':
            raise HttpErrorException.bad_request('invalid group name')
        if request.get('group_name') == 'admin':
            raise HttpErrorException.bad_request('invalid group name')
        if request.get('organization_id') == "":
            raise HttpErrorException.bad_request('no orgaization group id given')
        hidden = False
        if request.get('hidden') is not None:
            hidden = request.get('hidden')
        org = Organization.get_by_id(request.get('organization_id'))
        q = Group.query(ndb.AND(Group.organization == org.key, Group.name == request.get('group_name')))
        if q.count(limit=1) > 0:
            raise HttpErrorException.bad_request('group name taken')
        group = Group(key=Group.create_key())
        group.name = request.get('group_name')
        group.organization = org.key
        group.active = True
        if hidden:
            org.hidden_groups.append(group.key)
        else:
            org.groups.append(group.key)
        if request.get('description') is not "":
            group.description = request.get('description')
        org.put()
        group.put()
        return group.to_dict()

    @staticmethod
    def edit(command, request, request_data, request_user=None):
        if command is not None:
            command = command.split(' ')
        if request_data.get('group_id') is None:
            raise HttpErrorException.bad_request('no group id given')
        group = Group.get_by_id(request_data.get('group_id'))

        if 'add' in command:
            if 'admin' in command:
                if request_data.get('user_id') is None:
                    raise HttpErrorException.bad_request('no user id given')
                user = ndb.Key('User', request_data.get('user_id'))
                if (not request_user.is_admin and
                        not group.is_admin(request_user)):
                    lr = tt_logging.construct_log(msg_short='Non-Admin User Tried Adding User To Group Admin',
                                                  log_type=tt_logging.SECURITY, request_user=request_user,
                                                  request=request, artifact=group, affected_user=user)
                    log.warning(lr['dict_msg']['msg'], extra=lr)
                    raise HttpErrorException.forbidden()
                if user.key not in group.admins:
                    lr = tt_logging.construct_log(msg_short='User Was Set as Group Admin',
                                                  log_type=tt_logging.USER, request_user=request_user,
                                                  request=request, artifact=group, affected_user=user)
                    log.info(lr['dict_msg']['msg'], extra=lr)
                    group.admins.append(user.key)

        if 'remove' in command:
            if 'admin' in command:
                if request_data.get('user_id') is None:
                    raise HttpErrorException.bad_request('no user id given')
                user = ndb.Key('User', request_data.get('user_id'))
                if (not request_user.is_admin and
                        not group.is_admin(request_user)):
                    lr = tt_logging.construct_log(msg_short='Non-Admin User Tried Removing User From Group Admin',
                                                  log_type=tt_logging.SECURITY, request_user=request_user,
                                                  request=request, artifact=group, affected_user=user)
                    log.warning(lr['dict_msg']['msg'], extra=lr)
                    raise HttpErrorException.forbidden()
                if user.key in group.admins:
                    lr = tt_logging.construct_log(msg_short='User Was Removed as Group Admin',
                                                  log_type=tt_logging.USER, request_user=request_user,
                                                  request=request, artifact=group, affected_user=user)
                    log.info(lr['dict_msg']['msg'], extra=lr)
                    group.admins.remove(user.key)
        if 'set' in command:
            if 'inactive' in command:
                if not request_user.is_admin:
                    lr = tt_logging.construct_log(msg_short='Non-Admin User Tried Setting Group to Inactive',
                                                  log_type=tt_logging.SECURITY, request_user=request_user,
                                                  request=request, artifact=group)
                    log.warning(lr['dict_msg']['msg'], extra=lr)
                    raise HttpErrorException.forbidden()
                group.active = False
            if 'active' in command:
                if not request_user.is_admin:
                    lr = tt_logging.construct_log(msg_short='Non-Admin User Tried Setting Group to Active',
                                                  log_type=tt_logging.SECURITY, request_user=request_user,
                                                  request=request, artifact=group)
                    log.warning(lr['dict_msg']['msg'], extra=lr)
                    raise HttpErrorException.forbidden()
                group.active = True
        group.put()
        return group.to_dict()

    def delete(self, request):
        if self.key.id() == 'super_user':
            raise HttpErrorException.forbidden()
        organization = self.organization.get()
        if self.key in organization.groups:
            organization.groups.remove(self.key)
        if self.key in organization.hidden_groups:
            organization.hidden_groups.remove(self.key)
        organization.put()
        self.key.delete()
        lr = tt_logging.construct_log(msg_short='Group Was Deleted',
                                      msg='Group (%s) was deleted' % str(self.key),
                                      log_type=tt_logging.DEFAULT, request_user=request.user,
                                      request=request, artifact=self)
        log.info(lr['dict_msg']['msg'], extra=lr)

    @staticmethod
    def get_worldshare_key():
        return ndb.Key('Group', 'world')

    @staticmethod
    def get_worldshare():
        return Group.get_by_id('world')

    def user_in_group(self, user):
        if self.key in user.groups:
            return True
        return False

    def is_admin(self, user):
        if user.key in self.admins:
            return True
        return False

    def to_dict(self):
        d = super(Group, self).to_dict()
        del d['artifacts']
        if d['organization'] is not None:
            d['organization'] = d['organization'].id()
        d['id'] = self.key.id()
        return d