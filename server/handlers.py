import os
import jinja2
import logging
import traceback

from cerberus import handlers as cerberus_handlers
from google.appengine.api import memcache
from google.appengine.ext import ndb

from server import tt_logging
from server import GlobalConfig
# from models.analytic import AnalyticsSession
from server.httperrorexception import HttpErrorException
from models.artifacts import ChannelToken

log = logging.getLogger('tt')


TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)


def server_error_callback(e, t, v, tb, func, request, user, log_type=tt_logging.EXCEPTION, log_level=logging.ERROR):
    lr = tt_logging.construct_log(msg_short=e.message, request=request,
                                  msg='\n\nTraceBack:\n' + traceback.format_exc(tb),
                                  log_type=log_type, request_user=user)
    log.log(log_level, lr['dict_msg']['msg'], extra=lr)

exception_callback_func = server_error_callback


def requires_admin(required=True):
    """
    Method decorator to specify that a particular HTTP method is or is not auth_required.

    @auth_required(False)
    def get(self):
      pass
    """
    def f(func):
        func.requires_admin = required
        return func

    return f


class AuthorizationRequestHanlder(cerberus_handlers.AuthenticatedRequestHandler):
    requires_admin = False
    enable_unverified_account = True
    enable_expired_account = True
    enable_locked_account = True
    enable_disabled_account = True
    gc = None  # Global Configurations
    user_channel_token = None
    analytic_session = None

    def initialize(self, request, response):
        """Initializes the handler instance with Request and Response objects; called
        automatically by WSGIApplication does this after instantiating the handler class."""
        super(AuthorizationRequestHanlder, self).initialize(request, response)
        self.gc = GlobalConfig.get_configs()

    def _to_int(self, string):
        try:
            return int(string)
        except ValueError:
            raise HttpErrorException.bad_request('concurrent_request must be int')

    def on_authentication_success(self, user, session, method):
        if self.requires_admin:
            if not self.user.is_admin:
                lr = tt_logging.construct_log(
                    msg_short='Non-Admin User Attemped to Prefrom Admin Operations',
                    msg='Method: %s'.format(method),
                    log_type=tt_logging.SECURITY, request_user=self.user, request=self.request)
                log.warning(lr['dict_msg']['msg'], extra=lr)
                raise HttpErrorException.forbidden()
        if user.email_verification_lock() and self.enable_unverified_account:
            self.redirect('/account/unverified/' + user.username, abort=True)
        if user.account_locked() and self.enable_locked_account:
            self.redirect('/account/locked/' + user.username, abort=True)
        if user.account_expired() and self.enable_expired_account:
            self.redirect('/account/expired/' + user.username, abort=True)
        if user.account_disabled() and self.enable_disabled_account:
            self.redirect('/account/disabled/' + user.username, abort=True)

    def get_analytic_session(self):
        if self.json_request:
            an_token = self.json_request.get('an_token', None)
        else:
            an_token = self.request.get('an_token', None)
        if an_token:
            self.analytic_session = memcache.get(an_token, namespace='analytics')
            if not self.analytic_session:
                # We can't import AnalyticSession due to import issues, so we will just have to build the key manually
                self.analytic_session = ndb.Key('AnalyticsSession', an_token).get()
                memcache.add(self.analytic_session.key.id(), self.analytic_session, namespace='analytics')

    def get_channel_token(self):
        if self.json_request:
            client_id = self.json_request.get('client_id', None)
        else:
            client_id = self.request.get('client_id', None)
        if client_id:
            self.user_channel_token = ChannelToken.get_by_id(client_id)

    def get_user_channel_data(self):
        if not self.user_channel_token:
            return {}
        return {
            'username': self.user.username,
            'display_name': self.user.display_name,
            'client_id': self.user_channel_token.client_id if self.user_channel_token else '',
            'color': self.user_channel_token.color if self.user_channel_token else '',
            'concept': self.user_channel_token.concept.id() if self.user_channel_token.concept else '',
            'link_id': self.user_channel_token.link_id if self.user_channel_token.link_id else '',
            'document': self.user_channel_token.document.id() if self.user_channel_token.document else '',
        }


class AccountLocked(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, username=None):
        template_index = JINJA_ENVIRONMENT.get_template('account_locked.html')
        self.response.write(template_index.render())


class AccountExpired(AuthorizationRequestHanlder):
    auth_required = True

    @cerberus_handlers.exception_callback
    def get(self, username=None):
        template_data = {
            'username': self.user.username,
        }
        template_index = JINJA_ENVIRONMENT.get_template('account_expired.html')
        self.response.write(template_index.render(template_data))


class AccountDisabled(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, username=None):
        template_index = JINJA_ENVIRONMENT.get_template('account_disabled.html')
        self.response.write(template_index.render())


class AdminHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self):
        if self.user.is_admin:
            template_data = {
                'title': 'thinkTank',
                'user_super_admin': self.user.is_super_admin,
                'data': {
                    'debug': True if self.request.get('debug').lower() == 'true' else False
                }
            }
            template_index = JINJA_ENVIRONMENT.get_template('admin.html')
            self.response.write(template_index.render(template_data))
        else:
            lr = tt_logging.construct_log(msg_short='Non-Admin User Attemped to Access Admin Panel',
                                          log_type=tt_logging.SECURITY, request_user=self.user,
                                          request=self.request)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.bad_request()

    def on_authentication_fail(self, method):
        lr = tt_logging.construct_log(msg_short='Non-logged in User Attempted to Access Admin Panel',
                                      log_type=tt_logging.SECURITY, request=self.request)
        log.warning(lr['dict_msg']['msg'], extra=lr)
        raise HttpErrorException.unauthorized()