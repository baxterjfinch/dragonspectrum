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

"""
authentication module.
"""

from datetime import datetime
import logging
import uuid

from google.appengine.ext import ndb
from google.appengine.api import memcache

from models_base import User, ReferenceProperty

log = logging.getLogger('tt')

_cache = memcache.Client()  # TODO: ensure this is 2.7 threadsafe!


class Session(ndb.Model):
    """Stored representation of a user's authentication session"""
    user = ReferenceProperty(required=True)
    created = ndb.DateTimeProperty(auto_now_add=True)
    expiration = ndb.DateTimeProperty(default=datetime.max)
    token = ndb.StringProperty(required=True)
    ip_addresses = ndb.StringProperty(repeated=True)

    @staticmethod
    def new(new_user, expires=datetime.max):
        return Session(id=new_user.username, user=new_user, token=Session.generate_token(), expiration=expires)

    @staticmethod
    def generate_token():
        return uuid.uuid4().hex

    def cache_set(self):
        return _cache.set(self.user.username, self, namespace=Session.__name__)

    @staticmethod
    def cache_get(username):
        if not username:
            return None
        return _cache.get(username, namespace=Session.__name__)

    @staticmethod
    def invalidate_cache_for(user):
        return _cache.delete(user.username, namespace=Session.__name__)

    def __str__(self):
        return '[Session %s %s created=%s expiration=%s]' % (
            self.key.string_id(), self.token, self.created, self.expiration)


class Credentials(object):
    """Common interface for account-specific credentials."""

    account_type = None

    def authenticate(self):
        """Return True if authentication succeeds, False otherwise"""
        raise NotImplementedError()

    def get_username(self):
        """
        Return username or mapping to an username. This is expected to be valid only after
        a successful call to `authenticate()`, and the username is not guaranteed to map to an
        existing MPL User object."""
        raise NotImplementedError()

    def as_dict(self):
        """Return a JSON-compatible dict representation of this Credentials object"""
        raise NotImplementedError()

    @staticmethod
    def from_request(req):
        raise NotImplementedError()


class GenericCredentials(Credentials):
    account_type = 'generic'
    user = None

    def __init__(self, user, password):
        self.username = user
        self.password = password

    def authenticate(self):
        self.user = User.get_by_id(self.username)
        return self.user and self.user.password == self.password

    def get_username(self):
        return self.username

    def as_dict(self):
        return {'user': self.username, 'password': self.password}

    @staticmethod
    def from_request(req):
        if not ('username' in req and 'password' in req):
            return None

        return GenericCredentials(req['username'], req['password'])


FACTORY_MAP = {'generic': GenericCredentials}


# noinspection PyPep8Naming
def CredentialFactory(req):

    try:
        return FACTORY_MAP[req['account']].from_request(req)
    except KeyError:
        return None


### Utilities
def authenticate(username, token, ip_address):
    """Validate a user's session token.
    @return Session if valid, None otherwise"""
    session = Session.cache_get(username)
    if not session:
        session = Session.get_by_id(username)
        if session:
            session.cache_set()
        else:
            return None

    if session.token != token:
        return None

    if session.expiration < datetime.now():
        log.info('expired!')
        Session.invalidate_cache_for(username)
        session.key.delete()
        return None

    if ip_address not in session.ip_addresses:
        session.ip_addresses.append(ip_address)
        log.info('User session ip address has changed: session token: %s, ip address: %s',
                 session.token, ip_address, extra={'user': session.user})
    log.debug('authenticate() success!')
    return session


def login(request, credentials, clazz, expires=datetime.max):
    """
    authenticates and logs in an existing user
    """
    if not credentials.authenticate():
        return None
    
    username = credentials.get_username()

    session = Session.cache_get(username)

    if not session:
        session = Session.get_by_id(username)

    if not session:
        user = clazz.get_by_id(username)

        if not user:
            return None

        session = Session.new(user)
        session.ip_addresses = [request.remote_addr]
    
    session.expiration = expires
    session.user.last_login = datetime.now()
    session.user.put()
    session.put()
    session.cache_set()

    return session


def store_new_user(user):
    """
    persists new user to datastore and creates session
    for new user
    """
    user.put()
    session = Session.new(user)
    session.cache_set()
    session.put()

    return session
