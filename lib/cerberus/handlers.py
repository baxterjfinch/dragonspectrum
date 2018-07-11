"""
Copyright 2013 cr3473

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
"""
import sys
import os.path
import logging
import json
import base64

import webapp2

from models_base import User, Timestamp

import auth
import datetime
from auth import CredentialFactory, login, Session
from server import tt_logging
from server.httperrorexception import HttpErrorException

log = logging.getLogger('tt')

__all__ = 'get_template_path', 'HttpStatus', 'JsonRequestHandler', 'auth_required'


def get_template_path(template_name):
    """Get the full filesystem path to the specified template"""
    return os.path.join(os.path.dirname(__file__), '..', 'templates', template_name)


def _asciify(d):
    """Python 2.5 (Google App Engine) has bug in that object constructors require ASCII kwargs, so this function ASCIIfys Unicode keys in a dict"""
    d2 = {}
    for k,v in d.iteritems():
        d2[str(k)] = v
    return d2


class HttpStatus(webapp2.HTTPException):
    """Throw this "exception" to immediately cause handler to end with specified HTTP status code"""
    # TOOD: completely migrate away from this old class to webapp2 HttpExceptions
    
    @staticmethod
    def bad_request(message=None):
        webapp2.abort(400, message)

    @staticmethod
    def unauthorized(message=None):
        webapp2.abort(401, message)

    @staticmethod
    def forbidden(message=None):
        webapp2.abort(403, message)

    @staticmethod
    def not_found(message=None):
        webapp2.abort(404, message)


def auth_required(required=True):
    """
    Method decorator to specify that a particular HTTP method is or is not auth_required.
    
    @auth_required(False)
    def get(self):
      pass
    """
    def f(func):
        func.auth_required = required
        return func

    return f

def enable_json(enable=True):
    """
    Method decorator to specify that a particular HTTP method should enable json.

    @enable_json(False)
    def get(self):
      pass
    """
    def f(func):
        func.enable_json = enable
        return func

    return f

exception_callback_func = None
def exception_callback(fn):
    def wrapped(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except webapp2.HTTPException as e:
            if exception_callback_func:
                et, ei, tb = sys.exc_info()
                if e.code == 400:
                    log_type = tt_logging.HTTPBADREQUEST
                elif e.code == 401:
                    log_type = tt_logging.HTTPUNAUTHORIZED
                elif e.code == 403:
                    raise e  # We log this else where
                elif e.code == 404:
                    log_type = tt_logging.HTTPNOTFOUND
                elif e.code == 405:
                    log_type = tt_logging.HTTPMETHODNOTALLOWED
                elif e.code == 408:
                    log_type = tt_logging.HTTPREQUESTTIMEOUT
                elif e.code == 302:
                    raise e
                else:
                    log_type = tt_logging.HTTPBADREQUEST
                exception_callback_func(e, et, ei, tb, fn, args[0].request, args[0].user,
                                        log_type=log_type, log_level=logging.ERROR)
            raise
        except Exception as e:
            if exception_callback_func:
                et, ei, tb = sys.exc_info()
                exception_callback_func(e, et, ei, tb, fn, args[0].request, args[0].user)
            raise
    return wrapped


class AuthenticatedRequestHandler(webapp2.RequestHandler):
    """Base class for webapp framework RequestHandlers that emit JSON responses"""
    
    """Should this Handler require authentication?"""
    auth_required = True
    
    """Should this Handler expect request in JSON format?"""
    enable_json = False
    
    """Should this Handler be strict with the JSON payload format?"""
    strict_parsing = True
    
    """Should this Handler log requests as they come in?"""
    log_requests = False
    log_responses = False
    log_headers = False
    
    """Instance variable populated with Python version of parsed JSON request body"""
    json_request = None
    
    """Instance variable populated with devaria.models.User if authenticated"""
    user = None
    
    """Instance variable populated with devaria.auth.Session if authenticated"""
    session = None
    
    def initialize(self, request, response):
        """Initializes the handler instance with Request and Response objects; called
        automatically by WSGIApplication does this after instantiating the handler class."""
        super(AuthenticatedRequestHandler, self).initialize(request, response)
        self._wire_wrappers()

    def _wire_wrappers(self):
        # This uses some Python trickery to decorate webapp's HTTP handler functions so we can
        # bail early without forcing RequestHandler authors to implement boilerplate
        if getattr(self, 'get', None):
            self._get, self.get = self.get, lambda *args, **kwargs: self._http_method_wrapper(self._get, *args, **kwargs)
        if getattr(self, 'post', None):
            self._post, self.post = self.post, lambda *args, **kwargs: self._http_method_wrapper(self._post, *args, **kwargs)
        if getattr(self, 'put', None):
            self._put, self.put = self.put, lambda *args, **kwargs: self._http_method_wrapper(self._put, *args, **kwargs)
        if getattr(self, 'delete', None):
            self._delete, self.delete = self.delete, lambda *args, **kwargs: self._http_method_wrapper(self._delete, *args, **kwargs)
        if getattr(self, 'head', None):
            self._head, self.head = self.head, lambda *args, **kwargs: self._http_method_wrapper(self._head, *args, **kwargs)

    def _http_method_wrapper(self, f, *args, **kwargs):
        """Wrap webapp RequestHandler functions with our authentication and JSON parsing functionality"""
        if self.log_requests:
            self._log_req()
        
        if hasattr(f, 'enable_json') and f.enable_json or self.enable_json:
            self.json_request = self._parse_json_request()

        if hasattr(f, 'auth_required') and f.auth_required or self.auth_required:
            self._authenticate()
        
        return f(*args, **kwargs)  # finally call the real handler function itself
    
    def _get_auth_tokens(self):
        """Return (username, token) for use by _authenticate.
        Attempts to discover auth tokens from:
        - HTTP cookie
        - JSON payload 'auth' field
        - GET query parameters
        """
        username = self.request.cookies.get('auth_user', None)
        if username:
            try:
                username = base64.b64decode(username)
            except TypeError:
                username = None
        else:
            username = None
        token = self.request.cookies.get('auth_token', None)

        # try request body or query
        if not username or not token:
            
            if not self.enable_json or self.request.method in ('GET', 'DELETE'):
                # non-JSON
                username = self.request.get('auth_user')
                token = self.request.get('auth_token')
                log.debug('username=%s  token=%s', username, token)
                if not username or not token:
                    log.debug('Authenticated JSON requests must have `auth_user=foo&auth_token=bar` query params')
                    self.on_authentication_fail(self.request.method) 
                    return None, None
                    
            else:
                # JSON
                try:
                    username = self.json_request['auth']['user']
                    token = self.json_request['auth']['token']
                except (KeyError, TypeError):
                    log.debug('Authenticated JSON requests must have "auth {user, token}" params')
                    self.on_authentication_fail(self.request.method)
                    return None, None
        
        if username is None or not username.strip() or token is None or not token.strip():
            log.debug('_get_auth_tokens() username="%s" token="%s"', username, token)
            self.on_authentication_fail(self.request.method)
            return None, None

        return username, token
    
    def _authenticate(self):
        """Attempt to authenticate the current request
        @return (User, Session)
        @raise HttpStatus
        """
        username, token = self._get_auth_tokens()
        if not username:
            if not self.on_authentication_fail(self.request.method):
                raise HttpStatus.bad_request()
        else:
            session = auth.authenticate(username, token, self.request.remote_addr)
            if not session:
                if not self.on_authentication_fail(self.request.method):
                    raise HttpStatus.bad_request()
            else:
                self.user = session.user
                self.session = session
                self.on_authentication_success(session.user, session, self.request.method)

    def write_json_response(self, objects):
        """Write out a JSON response given the specified object(s), which should
        support `to_json()` or be in dict format. Iterables should be composed
        only of JSON-serializable (dict) objects."""
        # TODO coerce iterables to JSON
        if hasattr(objects, 'to_json'):
            json_response_body = objects.to_json()
        else:
            json_response_body = json.dumps(objects)

        if self.log_responses:
            self._log_res(json_response_body)
        
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json_response_body)

    def _is_request_json(self):
        for content_type in ('application/json', 'application/jsonrequest'):
            if self.request.headers.get('Content-Type', '').startswith(content_type):  # Python 2.7 App Engine gives us Content-Type: application/json; charset="utf-8"
                return True
        return False
    
    def _parse_json_request(self):
        """Return the JSON POST body as Python object or None"""
        if self.request.method == 'GET':
            return None
        
        if self.strict_parsing and not self._is_request_json():
            log.debug('Request Content-Type not "application/json", nothing to de-serialize!')
            raise HttpStatus.bad_request()

        try:
            json_obj = json.loads(self.request.body)
        except ValueError, e:
            lr = tt_logging.construct_log(msg_short='Failed parsing JSON request', log_type=tt_logging.DEFAULT,
                                          msg='Failed parsing JSON request: %s'.format(str(e)),
                                          user=self.user if self.user else None)
            log.exception(lr['dict_msg']['msg'], extra=lr)
            raise HttpStatus.bad_request()
        
        if type(json_obj) is dict:
            # object
            return _asciify(json_obj)
        else:
            # array or single value
            return json_obj

    def _log_req(self, log_headers=log_headers):
        """Log the contents of the HTTP request"""
        l = ['%s %s' % (self.request.method, self.request.path_qs)]
        if self.request.remote_addr:
            l.append('IP Address: %s' % self.request.remote_addr)
        if log_headers and self.request.headers:
            for header in self.request.headers.keys():  # GAE bug throws KeyError on CONTENT_TYPE if we iterate
                                                        # over headers.items(), so we use keys() and get() instead
                l.append('%s: %s' % (header, self.request.headers.get(header, '')))
        if not log_headers and self.request.cookies:
            # ensure that cookies are always logged, even if the other headers aren't
            l.append('Cookie: ' + '; '.join(['%s=%s' % (k, v) for k, v in self.request.cookies.items()]))
        req_str = '\n'.join(l)
        log.debug('%s %s', self.__class__.__name__, req_str)

    def _log_res(self, response_body):
        """Log the contents of the handler's response"""
        pass
        # log.debug('%s response:\n%s', self.__class__.__name__, response_body)
        
    def on_authentication_success(self, user, session, method):
        pass

    def on_authentication_fail(self, method):
        pass


def create_new_user(creds):
    username = creds.get_username()
    password = creds.password if hasattr(creds, 'password') else None
    access_token = creds.access_token if hasattr(creds, 'access_token') else None

    user = User(id=username, username=username, access_token=access_token, password=password)
    user.last_login = Timestamp(datetime.datetime.now()).as_datetime
    user.date_joined = datetime.date.today()

    return user
    

class LoginHandler(AuthenticatedRequestHandler):

    auth_required = False

    def put(self):
        
        creds = CredentialFactory(self.json_request)

        if not creds:
            raise HttpStatus.bad_request()

        if not creds.authenticate():
            return HttpStatus.unauthorized()

        username = creds.get_username()
        user = User.get_by_id(username)
        
        if user:
            session = login(creds, User)
        else:
            user = create_new_user(creds)

            session = Session.new(user)

        user.put()
        session.put()
        session.cache_set()

        self.write_json_response({'token': session.token, 'user': user.username})
