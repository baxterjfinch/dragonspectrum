import time
import datetime
import logging

from google.appengine.ext import ndb
from google.appengine.api import channel, memcache

from cerberus.models_base import Password
from cerberus.auth import User as AuthUser
from cerberus.auth import GenericCredentials

import server
from models.payment import payment
from server import config, mail
from server import tt_logging
from server import GlobalConfig
from server import ttindex
from models.payment import coupon
from server.httperrorexception import HttpErrorException


__all__ = [
    'EmailVerification',
    'ChannelToken',
    'User',
]


log = logging.getLogger('tt')


class EmailVerification(ndb.Model):
    verify_id = ndb.StringProperty(required=True)
    time_st = ndb.DateTimeProperty(auto_now=True)
    verified = ndb.BooleanProperty()
    lock_act = ndb.BooleanProperty(default=True)

    @staticmethod
    def new(verified=None):
        verify_id = server.create_uuid()
        if not verified:
            if server.GlobalConfig.get_configs().require_email_verification:
                verified = False
            else:
                verified = True
        return EmailVerification(verify_id=verify_id, verified=verified)


class ChannelToken(ndb.Model):
    id = ndb.StringProperty(required=True)
    token = ndb.StringProperty(required=True)


# noinspection PyTypeChecker
class User(AuthUser):
    user_id = ndb.StringProperty(required=True)  # This is not the Key's id
    first_name = ndb.StringProperty(required=True)
    last_name = ndb.StringProperty(required=True)
    display_name = ndb.StringProperty(required=True)
    registration_date = ndb.DateTimeProperty(auto_now=True)
    modified_ts = ndb.DateTimeProperty(auto_now=True)
    email = ndb.StringProperty(required=True)
    email_changed = ndb.DateTimeProperty(required=True)
    email_verification = ndb.StructuredProperty(EmailVerification)
    phone_numbers = ndb.JsonProperty(repeated=True)
    address = ndb.JsonProperty()
    birthday = ndb.StringProperty()
    groups = ndb.KeyProperty(kind='Group', repeated=True)
    organization = ndb.KeyProperty(kind='Organization')
    password_expiration_date = ndb.DateTimeProperty()
    require_password_change = ndb.BooleanProperty(default=config.require_password_change_new_user)
    opened_projects = ndb.KeyProperty(kind='Project', repeated=True)
    password_reset_secret = ndb.StringProperty()
    failed_login_attemps = ndb.DateTimeProperty(repeated=True)

    # new user identifiers
    tour_home_complete = ndb.BooleanProperty(default=False)
    tour_project_complete = ndb.BooleanProperty(default=False)

    # logging
    account_activity_logs = ndb.KeyProperty(repeated=True)
    account_error_logs = ndb.KeyProperty(repeated=True)
    last_ip_addr = ndb.StringProperty()

    # Payment infomations
    merchant = ndb.StringProperty()
    account_type = ndb.StringProperty(required=True)
    account_status = ndb.StringProperty(required=True)
    transaction_history = ndb.KeyProperty(kind='Transaction', repeated=True)
    account_expire_data = ndb.DateTimeProperty(required=True)
    coupon = ndb.KeyProperty()

    # User Currency Information
    ddss = ndb.IntegerProperty(default=config.default_ddss)
    spectra_count = ndb.IntegerProperty(default=config.default_spectra_count)

    # Temp variables
    log = None
    current_token_id = None
    org_admin = None
    super_admin = None

    @staticmethod
    def new(request_user, verify_email=True, request=None, worldshare_group=None, organization=None):
        if not request_user.get('username'):
            raise HttpErrorException.bad_request('no username given')
        if request_user.get('username') == 'anonymous':
            raise HttpErrorException.bad_request('reserved username')
        if len(request_user.get('username')) > 75:
            raise HttpErrorException.bad_request('username to long, max 75 characters')
        if User.get_by_id(request_user.get('username')):
            raise HttpErrorException.bad_request('username not available')
        if not request_user.get('password'):
            raise HttpErrorException.bad_request('no password given')
        if not request_user.get('first_name'):
            raise HttpErrorException.bad_request('no first name given')
        if not request_user.get('last_name'):
            raise HttpErrorException.bad_request('no last name given')
        if not request_user.get('email'):
            raise HttpErrorException.bad_request('no email given')
        if not request_user.get('phone_numbers'):
            raise HttpErrorException.bad_request('no phone number given')
        if not request_user.get('payment_plan') and not organization:
            raise HttpErrorException.bad_request('no payment plan given')
        creds = GenericCredentials.from_request(request_user)
        user = User(id=request_user.get('username'))
        user.user_id = server.create_uuid()
        user.username = request_user.get('username')
        user.display_name = request_user.get('display_name', request_user.get('first_name') + ' ' +
                                             request_user.get('last_name'))
        user.password = Password(creds.password)
        user.first_name = request_user.get('first_name')
        user.last_name = request_user.get('last_name')
        user.email = request_user.get('email')
        user.email_changed = datetime.datetime.now()
        user.groups.append(worldshare_group)
        for num_type in request_user.get('phone_numbers'):
            user.phone_numbers.append({num_type: request_user.get('phone_numbers').get(num_type)})
        if request_user.get('address'):
            address = request_user.get('address')
            user.address = {'street1': address['street1'], 'city': address['city'],
                            'state': address['state'], 'zip_code': address['zip_code']}
            if 'street2' in address:
                user.address['street2'] = address['street2']
        if request_user.get('birthday'):
            user.birthday = request_user.get('birthday')
        if organization:
            user.organization = organization.key
            user.groups.append(organization.org_group)
        coup = request_user.get('coupon_code')
        if coup != '' and coup is not None:
            try:
                coup = coupon.Coupon.get_coupon(request_user.get('coupon_code').lower())
                user.coupon = coup.key
            except coupon.InvalidCouponCodeException as e:
                raise HttpErrorException.bad_request(e.message)
        if user.organization:
            user.account_status = payment.ORG
            user.account_type = payment.ORG
            user.account_expire_data = datetime.datetime.max
        else:
            if not request_user.get('merchant'):
                raise HttpErrorException.bad_request('no merchant given')

            payment.init_payment(user, request_user.get('payment_plan'), request_user.get('merchant'))
        if verify_email:
            user.email_verification = EmailVerification.new()
            import smtplib

            try:
                mail.send_email_verification(user, GlobalConfig.get_configs())
            except smtplib.SMTPException as e:
                log.error('Could not send verification email')
                log.exception(e)
        else:
            user.email_verification = EmailVerification.new(verified=True)
        lr = tt_logging.construct_log(msg_short='New User Registered',
                                      msg='%s %s has registered an account' % (user.first_name, user.last_name),
                                      log_type=tt_logging.REGISTRATION, request_user=user, request=request)
        log.info(lr['dict_msg']['msg'], extra=lr)
        user.put()
        return user

    @property
    def is_org_admin(self):
        if self.org_admin is not None:
            return self.org_admin
        if not self.organization:
            return False
        org = self.organization.get()
        self.org_admin = org.is_admin(self)
        return self.org_admin

    @property
    def is_super_admin(self):
        if self.super_admin is not None:
            return self.super_admin
        for g in self.groups:
            if g.id() == 'super_admin':
                self.super_admin = True
                break
        else:
            self.super_admin = False
        return self.super_admin

    @property
    def is_admin(self):
        return self.is_org_admin or self.is_super_admin

    @property
    def full_name(self):
        return self.first_name + ' ' + self.last_name

    @staticmethod
    def get_all_users(organization, to_dict=True, request_user=None, request=None):
        q = User.query()
        q = q.filter(User.organization == organization.key)
        user_array = []
        for user in q.iter():
            if to_dict:
                user_array.append(user.to_dict(user=request_user, request=request))
            else:
                user_array.append(user)
        return user_array

    def is_account_expired(self):
        if self.account_expire_data <= datetime.datetime.now():
            return True
        return False

    def in_org(self):
        return True if self.organization else False

    def edit(self, request, request_data, request_user=None):
        if not request_user:
            lr = tt_logging.construct_log(msg_short='Unknow User tried altering a User',
                                          log_type=tt_logging.SECURITY, affected_user=self,
                                          request=request)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        if request_user.key != self.key:
            if not request_user.is_admin:
                lr = tt_logging.construct_log(msg_short='Non-Admin User tried altering another User',
                                              log_type=tt_logging.SECURITY, affected_user=self,
                                              request_user=request_user, request=request)
                log.warning(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.forbidden()
        if request_data.get('add'):
            if request_data.get('add') == 'group':
                if request_data.get('group_id') is None:
                    raise HttpErrorException.bad_request('no group id given')
                if request_data.get('group_id') == 'super_admin' and not request_user.is_super_admin:
                    raise HttpErrorException.forbidden()
                group = ndb.Key('Group', request_data.get('group_id')).get()
                if not group:
                    raise HttpErrorException.bad_request('invalid group id')
                if group.key not in self.groups:
                    self.groups.append(group.key)
                    lr = tt_logging.construct_log(msg_short='User Was Added to Group',
                                                  msg='User was added to group %s' % group.key.id(),
                                                  log_type=tt_logging.USER, affected_user=self,
                                                  request_user=request_user, request=request, artifact=group)
                    log.info(lr['dict_msg']['msg'], extra=lr)
                else:
                    raise HttpErrorException.bad_request('user already in group')
        if request_data.get('remove'):
            if request_data.get('remove') == 'group':
                if request_data.get('group_id') is None:
                    raise HttpErrorException.bad_request('no group id given')
                if request_data.get('group_id') == 'super_admin' and not request_user.is_super_admin:
                    raise HttpErrorException.forbidden()
                group = ndb.Key('Group', request_data.get('group_id')).get()
                if not group:
                    raise HttpErrorException.bad_request('invalid group id')
                if group.key in self.groups:
                    self.groups.remove(group.key)
                    lr = tt_logging.construct_log(msg_short='User Was Removed to Group',
                                                  msg='User was removed from group %s' % group.key.id(),
                                                  log_type=tt_logging.USER, affected_user=self,
                                                  request_user=request_user, request=request, artifact=group)
                    log.info(lr['dict_msg']['msg'], extra=lr)
                else:
                    raise HttpErrorException.bad_request('user not in group')
        if request_data.get('groups'):
            old_groups = server.get_ids_from_key_list(self.groups)
            new_groups = request_data.get('groups')
            for group_id in new_groups:
                if group_id not in old_groups:
                    if group_id == 'super_admin' and not request_user.is_super_admin:
                        raise HttpErrorException.forbidden()
                    group = ndb.Key('Group', group_id).get()
                    if not group:
                        raise HttpErrorException.bad_request('invalid group id')
                    if group.key not in self.groups:
                        self.groups.append(group.key)
                        lr = tt_logging.construct_log(msg_short='User Was Added to Group',
                                                      msg='User was added to group %s' % group.key.id(),
                                                      log_type=tt_logging.USER, affected_user=self,
                                                      request_user=request_user, request=request, artifact=group)
                        log.info(lr['dict_msg']['msg'], extra=lr)
            for group_id in old_groups:
                if group_id not in new_groups:
                    if group_id == 'super_admin' and not request_user.is_super_admin:
                        raise HttpErrorException.forbidden()
                    group = ndb.Key('Group', group_id).get()
                    if not group:
                        raise HttpErrorException.bad_request('invalid group id')
                    if group.key in self.groups:
                        self.groups.remove(group.key)
                        lr = tt_logging.construct_log(msg_short='User Was Removed to Group',
                                                      msg='User was removed from group %s' % group.key.id(),
                                                      log_type=tt_logging.USER, affected_user=self,
                                                      request_user=request_user, request=request, artifact=group)
                        log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('first_name'):
            old_first_name = self.first_name
            self.first_name = request_data.get('first_name')
            lr = tt_logging.construct_log(msg_short='User Fist Name Was Change',
                                          msg='User fist name was change from %s to %s' %
                                              (old_first_name, self.first_name),
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user, request=request)
            log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('last_name'):
            old_last_name = self.last_name
            self.last_name = request_data.get('last_name')
            lr = tt_logging.construct_log(msg_short='User Last Name Was Change',
                                          msg='User last name was change from %s to %s' %
                                              (old_last_name, self.last_name),
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user, request=request)
            log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('display_name'):
            old_display_name = self.display_name
            self.display_name = request_data.get('display_name')
            lr = tt_logging.construct_log(msg_short='User Dislay Name Was Change',
                                          msg='User display name was change from %s to %s' %
                                              (old_display_name, self.display_name),
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user, request=request)
            log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('password'):
            creds = GenericCredentials(self.username, request_data.get('password'))
            self.password = Password(creds.password)
            lr = tt_logging.construct_log(msg_short='User Password Was Changed',
                                          msg='Request not recorded to protect new password',
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user)
            log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('email'):
            old_email = self.email
            self.email = request_data.get('email')
            lr = tt_logging.construct_log(msg_short='User Email Was Change',
                                          msg='User email was change from %s to %s' %
                                              (old_email, self.email),
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user, request=request)
            log.info(lr['dict_msg']['msg'], extra=lr)
            self.email_verification = EmailVerification.new()
            mail.send_email_verification(self, GlobalConfig.get_configs())
            self.email_verification.lock_act = False
        if request_data.get('phone_type'):
            if not request_data.get('phone_number'):
                raise HttpErrorException.bad_request('no phone number given')
            old_phones = self.phone_numbers
            self.update_or_add_phone(request_data.get('phone_type'), request_data.get('phone_number'))
            lr = tt_logging.construct_log(msg_short='User Updated or Added Phone Number',
                                          msg='User updated or added phone number: old: %s, new: %s' %
                                              (str(old_phones), str(self.phone_numbers)),
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user, request=request)
            log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('address'):
            old_address = self.address
            address = request_data.get('address')
            self.address = {'street1': address['street1'], 'city': address['city'],
                            'state': address['state'], 'zip_code': address['zip_code']}
            if 'street2' in address:
                self.address['street2'] = address['street2']
            lr = tt_logging.construct_log(msg_short='User Updated Their Address',
                                          msg='User updated their address from [%s] to [%s]' %
                                              (str(old_address), str(self.address)),
                                          log_type=tt_logging.USER, affected_user=self,
                                          request_user=request_user, request=request)
            log.info(lr['dict_msg']['msg'], extra=lr)
        if request_data.get('reset_password'):
            mail.send_password_reset(self, GlobalConfig.get_configs())
        self.put()

    @staticmethod
    def get_world_user():
        return User(id=server.create_uuid(),
                    user_id=server.create_uuid(),
                    groups=[ndb.Key('Group', 'world')],
                    username='anonymous')

    def is_world_user(self):
        return self.username == 'anonymous'

    def update_or_add_phone(self, typ, number):
        for phone in self.phone_numbers:
            if typ in phone:
                phone[typ] = number
                break
        else:
            self.phone_numbers.append({type: number})

    def get_phone_number(self, typ):
        for phone in self.phone_numbers:
            if typ in phone:
                return phone[typ]

    def is_billable_account(self):
        payment.is_billable_account(self)

    def setup_billable_account(self, pay_plan):
        return payment.setup_billable_account(self, pay_plan, GlobalConfig.get_configs())

    def add_channel_token(self):
        token_id = str(self.username) + str(server.create_uuid())
        token = ChannelToken(id=token_id, token=channel.create_channel(token_id))
        client = memcache.Client()
        while True:  # Retry Loop
            user_token_list = client.gets(key=self.key.id(), namespace='user_tokens')
            if user_token_list is None:
                if not memcache.add(key=self.key.id(), value=[token], namespace='user_tokens'):
                    memcache.set(key=self.key.id(), value=[token], namespace='user_tokens')
                break
            user_token_list.append(token)
            if client.cas(key=self.key.id(), value=user_token_list, namespace='user_tokens'):
                break
        return token

    def remove_channel_token(self, token_id):
        client = memcache.Client()
        user_token_list = client.gets(key=self.key.id(), namespace='user_tokens')
        if user_token_list:
            for token in user_token_list:
                if token.id == token_id:
                    while True:  # Retry Loop
                        user_token_list = client.gets(key=self.key.id(), namespace='user_tokens')
                        if token in user_token_list:  # Check to make sure nothing else removed it
                            user_token_list.remove(token)
                            if client.cas(key=self.key.id(), value=user_token_list, namespace='user_tokens'):
                                break
                        else:
                            break
                    break

    def get_token_ids(self):
        client = memcache.Client()
        user_token_list = client.gets(key=self.key.id(), namespace='user_tokens')
        if user_token_list:
            token_ids = []
            for t in user_token_list:
                token_ids.append(t.id)
            return token_ids

    def get_user_token_by_token_id(self, token_id):
        client = memcache.Client()
        user_token_list = client.gets(key=self.key.id(), namespace='user_tokens')
        if user_token_list:
            for t in user_token_list:
                if t.id == token_id:
                    return t

    def get_groups(self):
        return self.groups

    def in_group(self, group):
        if not isinstance(group, ndb.Key):
            group = group.key
        if group in self.groups:
            return True
        return False

    def send_username_email(self):
        mail.send_username(self, GlobalConfig.get_configs())

    def send_password_reset(self):
        mail.send_password_reset(self, GlobalConfig.get_configs())

    def email_verification_lock(self):
        if not self.email_verification.verified and self.email_verification.lock_act:
            return True
        return False

    def get_put_index(self):
        if self.organization:
            return ttindex.get_put_index(namespace=self.organization.id())
        else:
            return ttindex.get_put_index(namespace='user', index_name=self.key.id())

    def get_indexes(self, create_new=True):
        if self.organization:
            return ttindex.get_indexes(namespace=self.organization.id(), create_new=create_new)
        else:
            return ttindex.get_indexes(namespace='user', index_name=self.key.id(), create_new=create_new)

    def log_activity(self, ual):
        self.account_activity_logs.append(ual)
        self.put()

    def log_error(self, ual):
        self.account_error_logs.append(ual)
        self.put()

    def login_timeout(self):
        gc = GlobalConfig.get_configs()
        timeout_point = datetime.datetime.now() - datetime.timedelta(minutes=gc.failed_login_attemps_timeout)
        for attemp in self.failed_login_attemps:
            if attemp < timeout_point:
                self.failed_login_attemps.remove(attemp)
            else:
                break  # Attemps should be in order
        self.put()
        if len(self.failed_login_attemps) < gc.failed_login_attemps_limit:
            return False
        return True

    def account_locked(self):
        return self.account_status == payment.LOCKED

    def account_expired(self):
        return self.account_status == payment.EXPIRED

    def account_disabled(self):
        return self.account_status == payment.DISABLED

    def get_ddss(self):
        if self.ddss is None:
            self.ddss = config.default_ddss
        return self.ddss

    def get_spectra_count(self):
        if self.spectra_count is None:
            self.spectra_count = config.default_spectra_count
        return self.spectra_count

    def sub_spectra_cost(self, cost):
        self.spectra_count = self.get_spectra_count() - cost
        return self.spectra_count

    def to_dict(self, user=None, request=None):
        include = [
            'user_id',
            'username',
            'last_login',
            'first_name',
            'last_name',
            'display_name',
            'registration_date',
            'modified_ts',
            'email',
            'email_changed',
            'phone_numbers',
            'address',
            'birthday',
            'groups',
            'organization',
            'password_expiration_date',
            'require_password_change',
            'account_type',
            'account_status',
            'account_expire_data',
            'tour_home_complete',
            'tour_project_complete',
            'ddss',
            'spectra_count',
        ]
        d = super(User, self).to_dict(include=include)

        if d['modified_ts']:
            d['modified_ts'] = str(d['modified_ts'])
        if d['registration_date']:
            d['registration_date'] = time.mktime(d['registration_date'].timetuple())
        if d['account_expire_data']:
            d['account_expire_data'] = time.mktime(d['account_expire_data'].timetuple())
        if d['last_login'] is not None:
            d['last_login'] = time.mktime(d['last_login'].timetuple())
        else:
            d['last_login'] = 'never'
        if d['email_changed']:
            d['email_changed'] = time.mktime(d['email_changed'].timetuple())
        d['id'] = self.key.id()

        gc = GlobalConfig.get_configs()
        if self.ddss is None:
            d['ddss'] = gc.default_ddss
        if self.spectra_count is None:
            d['spectra_count'] = gc.default_spectra_count

        if not self.is_world_user():
            d['full_name'] = self.full_name

        groups = []
        d['groups'] = ndb.get_multi(d['groups'])
        index = 0
        for g in d['groups']:
            if g is None:
                self.groups.remove(self.groups[index])
                lr = tt_logging.construct_log(msg_short='Broken Group Key in User Group List',
                                              msg='Found a broken group key (%s) in the user\'s group list\n'
                                                  'Key has been removed' % str(self.groups[index]),
                                              log_type=tt_logging.USER, request_user=user, affected_user=self,
                                              request=request)
                log.error(lr['dict_msg']['msg'], extra=lr)
            groups.append(g.to_dict())
            index += 1
        d['groups'] = groups

        if d['organization'] is not None:
            d['organization'] = d['organization'].id()

        if d['password_expiration_date'] is not None:
            d['password_expiration_date'] = str(d['password_expiration_date'])

        if self.organization:
            if self.is_org_admin:
                d['is_admin'] = True
            else:
                d['is_admin'] = False
            if self.is_super_admin:
                d['is_super_admin'] = True
            else:
                d['is_super_admin'] = False
        return d
