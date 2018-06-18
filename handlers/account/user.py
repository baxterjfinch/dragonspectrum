import json
import datetime
import logging
import base64

from google.appengine.api import channel

from cerberus.models_base import Password
from cerberus import handlers as cerberus_handlers
from cerberus.auth import GenericCredentials, login, Session

from models.account import User, Organization, Group
from server import mail
from server import tt_logging
from server import GlobalConfig
from models.payment import coupon
from models.payment import payment_plan
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT
from server.httperrorexception import HttpErrorException


__all__ = [
    'UnverifiedEmail',
    'UserUsername',
    'ResetPasswordHanlder',
    'UserAccountBilling',
    'UserNameAvailable',
    'UserHandler',
    'UserEmailVerification',
    'LoginUserHandler',
    'UserAccountProfileHandler',
    'LoginDisabledHandler',
    'RegisterUserHandler',
    'RegisterDisabledHandler',
    'ClientLoggerHanlder',
    'HomeGuidedTourCompleteHandler',
    'ProjectGuidedTourCompleteHandler',
]

log = logging.getLogger('tt')


class UnverifiedEmail(AuthorizationRequestHanlder):
    enable_unverified_account = False
    enable_expired_account = False
    enable_locked_account = False
    enable_disabled_account = False

    @cerberus_handlers.exception_callback
    def get(self, username=None):
        template_index = JINJA_ENVIRONMENT.get_template('email_unverified.html')
        self.response.write(template_index.render())

    @cerberus_handlers.exception_callback
    def post(self, username=None):
        mail.send_email_verification(self.user, GlobalConfig.get_configs())


class UserUsername(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self):
        email = self.request.get('email')
        if email == '':
            raise HttpErrorException.bad_request('no email given')
        user = User.query(User.email == email).get()
        if not user:
            raise HttpErrorException.bad_request('invalid email given')
        user.send_username_email()


class ResetPasswordHanlder(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, secret=None):
        if not secret:
            raise HttpErrorException.bad_request('no password secret given')
        user = User.query(User.password_reset_secret == secret).get()
        if not user:
            raise HttpErrorException.bad_request('could not find user for password reset')
        reset_url = ('/account/password/reset/' + user.password_reset_secret)
        template_data = {
            'title': 'Password Reset',
            'reset_url': reset_url,
        }
        template_index = JINJA_ENVIRONMENT.get_template('password_reset.html')
        self.response.write(template_index.render(template_data))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, secret=None):
        if not secret:
            raise HttpErrorException.bad_request('no reset code given')
        user = User.query(User.password_reset_secret == secret).get()
        if not user:
            raise HttpErrorException.bad_request('could not find user for password reset')
        creds = GenericCredentials(user.username, self.json_request.get('password'))
        user.password = Password(creds.password)
        lr = tt_logging.construct_log(msg_short='User has changed their password', log_type=tt_logging.USER,
                                      affected_user=user, request=self.request)
        log.info(lr['dict_msg']['msg'], extra=lr)
        user.put()


class UserAccountBilling(AuthorizationRequestHanlder):
    enable_expired_account = False

    @cerberus_handlers.exception_callback
    def get(self, user_id=None):
        if not user_id:
            raise HttpErrorException.bad_request('no user id given')
        user = User.get_by_id(user_id)
        if not user:
            raise HttpErrorException.bad_request('invalid user id given')
        if user != self.user and not self.user.is_super_admin:
            lr = tt_logging.construct_log(msg_short='Non-Admin User try to Alter Another User\'s Billing',
                                          msg='User (%s) attemped to change another user\'s (%s) '
                                              'billing information' % (self.user.key.id(), user.key.id()),
                                          log_type=tt_logging.SECURITY, request_user=self.user, affected_user=user,
                                          request=self.request)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        template_data = {
            'title': 'thinkTank',
            'display_name': self.user.display_name,
            'nav_bar_title': 'thinkTank',
            'domain': self.request.host_url,
            'payment_plans': payment_plan.get_payment_plan_list(),
            'data': {'user': json.dumps(self.user.to_dict(user=self.user))},
        }
        if user.is_billable_account():
            template_data['billable_account'] = True
        else:
            template_data['billable_account'] = False
        if user.is_admin:
            template_data['admin'] = True
        template_index = JINJA_ENVIRONMENT.get_template('user_billing.html')
        self.response.write(template_index.render(template_data))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, user_id=None):
        if not user_id:
            raise HttpErrorException.bad_request('no user id given')
        user = User.get_by_id(user_id)
        if not user:
            raise HttpErrorException.bad_request('invalid user id given')
        if user != self.user and not self.user.is_super_admin:
            lr = tt_logging.construct_log(msg_short='Non-Admin User try to Alter Another User\'s Billing',
                                          msg='User (%s) attemped to change another user\'s (%s) '
                                              'billing information' % (self.user.key.id(), user.key.id()),
                                          log_type=tt_logging.SECURITY, request_user=self.user, affected_user=user,
                                          request=self.request)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        if self.json_request.get('subscribe'):
            pay_plan = self.json_request.get('subscribe')
            if user.is_billable_account():
                raise HttpErrorException.bad_request('user already has billable account')
            checkout_url = user.setup_billable_account(pay_plan)
            self.write_json_response({'checkout_url': checkout_url})


class UserNameAvailable(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, user_id=None):
        if user_id is not None:
            if user_id == 'anonymous':
                self.write_json_response({'username': 'unavailable'})
            else:
                user = User.get_by_id(user_id)
                if not user:
                    self.write_json_response({'username': 'unavailable'})
                else:
                    self.write_json_response({'username': 'available'})
        else:
            user_id = self.request.get('username')
            if user_id is None or user_id == '' or user_id == 'anonymous':
                self.response.write('false')
            else:
                user = User.get_by_id(user_id)
                if not user:
                    self.response.write('true')
                else:
                    self.response.write('false')


class UserHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, user_id=None):
        if self.request.get('user_info') is not '':
            if (self.request.get('user_info') == self.user.username or
                    self.user.is_admin):
                user = User.get_by_id(self.request.get('user_info'))
                if not user:
                    raise HttpErrorException.bad_request('invalid user id')
                self.write_json_response(user.to_dict(user=self.user))
        elif self.request.get('user_perms') is not '':
            user = User.get_by_id(self.request.get('user_perms'))
            if not user:
                raise HttpErrorException.bad_request('invalid username')
            if not user.is_admin and not self.user == user:
                lr = tt_logging.construct_log(msg_short='Non-Admin User Try Accessing Another User',
                                              msg='User (%s) attemped to access user\'s (%s) data ' %
                                                  (self.user.key.id(), user.key.id()),
                                              log_type=tt_logging.SECURITY, request_user=self.user, affected_user=user,
                                              request=self.request)
                log.warning(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.forbidden()
            user_perms_dict = {}
            for group_key in user.groups:
                group = group_key.get()
                if group is None:
                    user.groups.remove(group_key)
                    user.put()
                    lr = tt_logging.construct_log(msg_short='Broken Group Key in User Group List',
                                                  msg='Found a broken group key (%s) in the user\'s group list\n'
                                                      'Key has been removed' %
                                                      str(group_key),
                                                  log_type=tt_logging.USER, request_user=self.user, affected_user=user,
                                                  request=self.request)
                    log.error(lr['dict_msg']['msg'], extra=lr)
                elif (group.has_permission(self.user, 'set_user_perms') or
                          group.has_permission(self.user, 'remove_user_perms') or
                              user.key == self.user.key):
                    perms = user.get_group_perms_dict(group)
                    if perms is not None:
                        user_perms_dict[group.key.id()] = perms
            self.write_json_response(user_perms_dict)
        elif self.request.get('organization_users') is not '':
            if self.request.get('organization_users') == 'all':
                organization = Organization.get_by_id(self.request.get('organization_id'))
                if organization.is_admin(self.user) or Group.get_by_id('super_admin').key in self.user.groups:
                    user_array = User.get_all_users(organization, request_user=self.user)
                    self.write_json_response(user_array)
                else:
                    lr = tt_logging.construct_log(msg_short='Non-Admin User Try Accessing Org Users',
                                                  msg='User (%s) attemped to access all Organization\'s users' %
                                                      (self.user.key.id()),
                                                  log_type=tt_logging.SECURITY, request_user=self.user,
                                                  request=self.request, artifact=organization)
                    log.warning(lr['dict_msg']['msg'], extra=lr)
                    raise HttpErrorException.forbidden()
        elif self.request.get('non_org') is not '':
            if not self.user.is_super_admin:
                lr = tt_logging.construct_log(msg_short='Non-Admin User Try Accessing Org Users',
                                              msg='User (%s) attemped to access all Organization\'s users' %
                                                  (self.user.key.id()),
                                              log_type=tt_logging.SECURITY, request_user=self.user,
                                              request=self.request)
                log.warning(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.forbidden()
            else:
                users = User.query(User.organization == None).fetch()
                users_dicts = []
                for user in users:
                    users_dicts.append(user.to_dict())
                self.write_json_response(users_dicts)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, user_id=None):
        if not self.user.is_admin:
            lr = tt_logging.construct_log(msg_short='Non-Admin User Try Create New User',
                                          msg='User (%s) attemped to create a new user' %
                                              (self.user.key.id()),
                                          log_type=tt_logging.SECURITY, request_user=self.user,
                                          request=self.request)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        if self.json_request.get('username'):
            org = None
            if self.json_request.get('organization'):
                org = Organization.get_by_id(self.json_request.get('organization'))
            User.new(self.json_request, verify_email=False, request=self.request,
                     worldshare_group=Group.get_worldshare_key(), organization=org)

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, user_id=None):
        if not user_id:
            raise HttpErrorException.bad_request('No user id given')
        user = User.get_by_id(user_id)
        if not user:
            raise HttpErrorException.bad_request('invalid user id given')
        user.edit(self.request, self.json_request, self.user)

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()


class UserEmailVerification(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, verification_id):
        if not verification_id:
            return HttpErrorException.bad_request('no verification id given')
        if self.request.get('username') == '':
            return HttpErrorException.bad_request('no username given')
        user = User.get_by_id(self.request.get('username'))
        if not user:
            return HttpErrorException.bad_request('invilad username')
        if user.email_verification.verify_id == verification_id:
            user.email_verification.verified = True
            user.put()
            lr = tt_logging.construct_log(msg_short='User has verified their email',
                                          msg='User has verified their email: ' + user.email,
                                          log_type=tt_logging.USER, affected_user=user)
            log.info(lr['dict_msg']['msg'], extra=lr)
            self.redirect('/')
        else:
            return HttpErrorException.bad_request('invalid verification id')


class LoginUserHandler(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self):
        agent = self.request.headers.get('user_agent')
        if agent.find('MSIE') != -1:
            browser = 'MSIE'
            template_index = JINJA_ENVIRONMENT.get_template('login_no_soop_for_you.html')
        elif agent.find('Firefox') != -1:
            browser = 'FIREFOX'
            template_index = JINJA_ENVIRONMENT.get_template('login.html')
        elif agent.find('Chrome') != -1:
            browser = 'CHROME'
            template_index = JINJA_ENVIRONMENT.get_template('login.html')
        else:
            browser = "UNKNOWN"
            template_index = JINJA_ENVIRONMENT.get_template('login.html')

        template_data = {
            'title': 'thinkTank',
            'browser': browser,
        }
        self.response.write(template_index.render(template_data))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self):
        if self.json_request.get('status') == 'login':
            gc = GlobalConfig.get_configs()
            user = User.get_by_id(self.json_request.get('username'))
            if not user:
                self.request.body = ''  # Make sure we don't record the users credentials in plan text
                lr = tt_logging.construct_log(msg_short='Unknow user attempted to login',
                                              log_type=tt_logging.USER, request=self.request)
                log.info(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.bad_request('invalid username or password given')
            if user.login_timeout():
                raise HttpErrorException.forbidden()
            if not gc.allow_non_admin_user_login and not user.is_admin:
                self.request.body = ''  # Make sure we don't record the users credentials in plan text
                lr = tt_logging.construct_log(msg_short='User attempted to loggin, but login is disabled',
                                              log_type=tt_logging.USER, request=self.request, request_user=user)
                log.info(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.forbidden()
            creds = GenericCredentials.from_request(self.json_request)
            if not creds.authenticate():
                user.failed_login_attemps.append(datetime.datetime.now())
                self.request.body = ''  # Make sure we don't record the users credentials in plan text
                lr = tt_logging.construct_log(msg_short='User provided invalid credentials',
                                              log_type=tt_logging.USER, request=self.request, request_user=user)
                log.info(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.bad_request('invalid username or password given')
            user.failed_login_attemps = []
            user.last_login == datetime.datetime.now()
            user.put()
            session = login(self.request, creds, User)
            self.request.body = ''  # Make sure we don't record the users credentials in plan text
            lr = tt_logging.construct_log(msg_short='User logged in',
                                          msg='User logged in: session: %s, IP Address: %s' %
                                              (session.token, self.request.remote_addr),
                                          log_type=tt_logging.USER, request=self.request, request_user=user)
            log.info(lr['dict_msg']['msg'], extra=lr)
            self.response.set_cookie('auth_user', base64.b64encode(creds.username))
            self.response.set_cookie('user', creds.username)
            self.response.set_cookie('auth_token', session.token)
            self.write_json_response({'status': 'success'})
        elif self.json_request.get('status') == 'logout':
            user = User.get_by_id(self.json_request.get('user'))
            Session.invalidate_cache_for(user)
            session = Session.get_by_id(user.username)
            if session is not None:
                lr = tt_logging.construct_log(msg_short='User logged out',
                                              msg='User logged out: session: %s, IP Address: %s' %
                                                  (session.token, self.request.remote_addr),
                                              log_type=tt_logging.USER, request=self.request, request_user=user)
                log.info(lr['dict_msg']['msg'], extra=lr)
                session.key.delete()
            else:
                lr = tt_logging.construct_log(msg_short='User logged out',
                                              msg='User logged out: session: %s, IP Address: %s' %
                                                  self.request.remote_addr,
                                              log_type=tt_logging.USER, request=self.request, request_user=user)
                log.info(lr['dict_msg']['msg'], extra=lr)
        elif self.json_request.get('reset_password'):
            user = User.get_by_id(self.json_request.get('username'))
            if not user:
                raise HttpErrorException.bad_request('invalid username')
            lr = tt_logging.construct_log(msg_short='Password Reset Requested',
                                          msg='User has requested password reset',
                                          log_type=tt_logging.USER, request=self.request, request_user=user)
            log.info(lr['dict_msg']['msg'], extra=lr)
            user.send_password_reset()
        else:
            self.write_json_response({'status': 'failed do not know what to do!!!'})


class UserAccountProfileHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, username=None):
        if not username:
            raise HttpErrorException.bad_request('no username given')
        user = User.get_by_id(username)
        if not user:
            raise HttpErrorException.bad_request('invalid username given')
        if user != self.user:
            raise HttpErrorException.bad_request('Getting someone else user account info is not supported right now')
        template_data = {
            'title': 'thinkTank',
            'display_name': self.user.display_name,
            'nav_bar_title': 'thinkTank',
            'domain': self.request.host_url,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'main_phone': user.get_phone_number('main') if user.get_phone_number('main') else 'Main Phone',
            'cell_phone': user.get_phone_number('cell') if user.get_phone_number('cell') else 'Cell Phone',
            'birthday': user.birthday,
            'street1': user.address['street1'] if user.address else 'Street1',
            'street2': user.address['street2'] if user.address else 'Street2',
            'city': user.address['city'] if user.address else 'City',
            'state': user.address['state'] if user.address else 'State',
            'zipecode': user.address['zip_code'] if user.address else 'Zip Code',
            'data': {'user': json.dumps(user.to_dict(user=self.user))},
        }

        if user.in_org():
            template_data['organization'] = True
        if user.is_admin:
            template_data['admin'] = True

        template_index = JINJA_ENVIRONMENT.get_template('user_profile.html')
        self.response.write(template_index.render(template_data))


class LoginDisabledHandler(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self):
        gc = GlobalConfig.get_configs()
        if gc.allow_non_admin_user_login:
            self.redirect('/', abort=True)
        template_index = JINJA_ENVIRONMENT.get_template('login_disabled.html')
        self.response.write(template_index.render())


class RegisterUserHandler(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, request=None):
        gc = GlobalConfig.get_configs()
        if not gc.allow_user_registration:
            self.redirect('/register/disabled/', abort=True)
        else:
            coupon_code = self.request.get('coupon_code')
            coupon_obj = None
            if coupon_code != '':
                try:
                    coupon_obj = coupon.Coupon.get_coupon(coupon_code.lower())
                    if not coupon_obj.is_active():
                        raise HttpErrorException.bad_request('coupon is not active')
                except coupon.InvalidCouponCodeException:
                    raise HttpErrorException.bad_request('invalid coupon code')
            payment_plans = payment_plan.get_payment_plan_list()
            pay_plan = self.request.get('payment_plan')
            if pay_plan != '':
                try:
                    pay_plan = payment_plan.get_payment_plan(pay_plan)
                except payment_plan.InvalidPaymentPlanException as e:
                    raise HttpErrorException.bad_request(e.message)
            else:
                pay_plan = payment_plans[0]
            template_data = {
                'title': 'thinkTank Registration',
                'nav_bar_title': 'thinkTank',
                'domain': self.request.host_url,
                'payment_plans': payment_plans,
                'active_payment_plan': pay_plan['id'],
            }
            if coupon_obj:
                template_data['coupon'] = coupon_code
            template_index = JINJA_ENVIRONMENT.get_template('register.html')
            self.response.write(template_index.render(template_data))

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, user=None):
        gc = GlobalConfig.get_configs()
        if not gc.allow_user_registration:
            self.redirect('/register/disabled/', abort=True)
        if self.json_request.get('organization'):
            return HttpErrorException.forbidden()
        User.new(self.json_request, request=self.request, worldshare_group=Group.get_worldshare_key())
        creds = GenericCredentials(self.json_request.get('username'), self.json_request.get('password'))
        if not creds.authenticate():
            raise HttpErrorException.bad_request('faild to authinicate')
        session = login(self.request, creds, User)
        self.response.set_cookie('auth_user', base64.b64encode(creds.username))
        self.response.set_cookie('user', creds.username)
        self.response.set_cookie('auth_token', session.token)
        # self.write_json_response({'user': creds.username, 'token': session.token})


class RegisterDisabledHandler(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self):
        gc = GlobalConfig.get_configs()
        if gc.allow_user_registration:
            self.redirect('/', abort=True)
        template_index = JINJA_ENVIRONMENT.get_template('register_disabled.html')
        self.response.write(template_index.render())


class ClientLoggerHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self):
        for log_record in self.json_request:
            logger = log_record.get('logger', None)
            try:
                timestamp = 'client time: %s' % datetime.datetime.fromtimestamp(
                    float(log_record.get('timestamp'))/1000)
            except ValueError:
                timestamp = 'server time: %s' % datetime.datetime.now()
            url = log_record.get('url', 'No URL Given')
            message_list = log_record.get('message', 'No Message Given')
            msg = ''
            for message in message_list:
                msg += message.replace('\r\n', '\n') if isinstance(message, basestring) else \
                    str(message).replace('\r\n', '\n')
            msg_complete = 'Client logger: %s\nDatetime: %s\nURL: %s\n%s' % (logger, timestamp, url, msg)
            lr = tt_logging.construct_log(msg_short='Received Error Log From Client',
                                          msg=msg_complete, client_log=True, log_type=tt_logging.USER,
                                          request=self.request, request_user=self.user)
            log.error(lr['dict_msg']['msg'], extra=lr)


class HomeGuidedTourCompleteHandler(AuthorizationRequestHanlder):

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self):
        self.user.tour_home_complete = True
        self.user.put()


class ProjectGuidedTourCompleteHandler(AuthorizationRequestHanlder):

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self):
        self.user.tour_project_complete = True
        self.user.put()
