#!/usr/bin/python

import getpass
import sys
import os


def _get_dir_path(sibling):
    if 'GAE_SDK_ROOT' in os.environ:
        gae_sdk_root = os.path.abspath(os.environ['GAE_SDK_ROOT'])

        os.environ['GAE_SDK_ROOT'] = gae_sdk_root
        for dir_path in [gae_sdk_root,
                         os.path.join(gae_sdk_root, 'google_appengine')]:
            if os.path.exists(os.path.join(dir_path, sibling)):
                return dir_path
        raise ValueError('GAE_SDK_ROOT %r does not refer to a valid SDK '
                         'directory' % gae_sdk_root)
    else:
        py_file = __file__.replace('.pyc', '.py')
        dir_paths = [os.path.abspath(os.path.dirname(os.path.realpath(py_file))),
                     os.path.abspath(os.path.dirname(py_file))]
        for dir_path in dir_paths:
            sibling_path = os.path.join(dir_path, sibling)
            if os.path.exists(sibling_path):
                return dir_path
        raise ValueError('Could not determine SDK root; please set GAE_SDK_ROOT '
                         'environment variable.')


_DIR_PATH = _get_dir_path(os.path.join('lib', 'ipaddr'))
_SCRIPT_DIR = os.path.join(_DIR_PATH, 'google', 'appengine', 'tools')
_DEVAPPSERVER2_DIR = os.path.join(
    _DIR_PATH, 'google', 'appengine', 'tools', 'devappserver2')
_PHP_RUNTIME_DIR = os.path.join(_DEVAPPSERVER2_DIR, 'php')
_PYTHON_RUNTIME_DIR = os.path.join(_DEVAPPSERVER2_DIR, 'python')

_STUB_DEPENDENCIES = [
    os.path.join(_DIR_PATH, 'lib', 'antlr3'),
    os.path.join(_DIR_PATH, 'lib', 'fancy_urllib'),
    os.path.join(_DIR_PATH, 'lib', 'ipaddr'),
    os.path.join(_DIR_PATH, 'lib', 'yaml-3.10'),
    os.path.join(_DIR_PATH, 'lib', 'rsa'),
    os.path.join(_DIR_PATH, 'lib', 'pyasn1'),
    os.path.join(_DIR_PATH, 'lib', 'pyasn1_modules'),
]

EXTRA_PATHS = _STUB_DEPENDENCIES + [
    _DIR_PATH,

    os.path.join(_DIR_PATH, 'lib', 'simplejson'),


    os.path.join(_DIR_PATH, 'lib', 'django-1.4'),
    os.path.join(_DIR_PATH, 'lib', 'endpoints-1.0'),
    os.path.join(_DIR_PATH, 'lib', 'jinja2-2.6'),
    os.path.join(_DIR_PATH, 'lib', 'protorpc-1.0'),
    os.path.join(_DIR_PATH, 'lib', 'PyAMF-0.6.1'),
    os.path.join(_DIR_PATH, 'lib', 'markupsafe-0.15'),
    os.path.join(_DIR_PATH, 'lib', 'webob-1.2.3'),
    os.path.join(_DIR_PATH, 'lib', 'webapp2-2.5.2'),
]

_DEVAPPSERVER2_PATHS = _STUB_DEPENDENCIES + [
    _DIR_PATH,

    os.path.join(_DIR_PATH, 'lib', 'concurrent'),
    os.path.join(_DIR_PATH, 'lib', 'cherrypy'),
    os.path.join(_DIR_PATH, 'lib', 'jinja2-2.6'),
    os.path.join(_DIR_PATH, 'lib', 'webob-1.2.3'),
    os.path.join(_DIR_PATH, 'lib', 'webapp2-2.5.1'),
]

_PHP_RUNTIME_PATHS = [
    _DIR_PATH,

    os.path.join(_DIR_PATH, 'lib', 'concurrent'),
    os.path.join(_DIR_PATH, 'lib', 'cherrypy'),
    os.path.join(_DIR_PATH, 'lib', 'yaml-3.10'),
]

_PYTHON_RUNTIME_PATHS = [
    _DIR_PATH,

    os.path.join(_DIR_PATH, 'lib', 'concurrent'),
    os.path.join(_DIR_PATH, 'lib', 'cherrypy'),
    os.path.join(_DIR_PATH, 'lib', 'fancy_urllib'),
    os.path.join(_DIR_PATH, 'lib', 'protorpc-1.0'),
    os.path.join(_DIR_PATH, 'lib', 'yaml-3.10'),
]

_BOOTSTAP_NAME_TO_REAL_NAME = {
    'dev_appserver.py': 'devappserver2.py',
    '_php_runtime.py': 'runtime.py',
    '_python_runtime.py': 'runtime.py',
}

_SCRIPT_TO_DIR = {
    'dev_appserver.py': _DEVAPPSERVER2_DIR,
    '_php_runtime.py': _PHP_RUNTIME_DIR,
    '_python_runtime.py': _PYTHON_RUNTIME_DIR,
}

_SYS_PATH_ADDITIONS = {
    'dev_appserver.py': _DEVAPPSERVER2_PATHS,
    '_php_runtime.py': _PHP_RUNTIME_PATHS,
    '_python_runtime.py': _PYTHON_RUNTIME_PATHS,
}

sys.path[1:1] = EXTRA_PATHS

print ('PATHs are set')

import server
from google.appengine.ext.remote_api import remote_api_stub
from server.models import *


def auth_func():
    return raw_input('Username: '), getpass.getpass('Password:')


def app_func():
    return raw_input('App: ') + '.appspot.com'


print ('Logging into app engine')
remote_api_stub.ConfigureRemoteApi(None, '/_ah/remote_api', auth_func, app_func())
print ('Logged in')


print ('building Datastore')

# Check for global config if exist exit, else init it
global_conf = GlobalConfig.get_by_id(config.global_config_id)
if not global_conf:
    GlobalConfig.new()
else:
    print ('Found Global configurations in datastore, this is not a clean instance. Exitting now')
    sys.exit(-1)

# Setting up Corpus organization
corpus = Organization(id='corpus.io', name='corpus.io', description='corpus.io',
                      domain='corpus.io', owner='Joe Roets', webpage='www.corpus.io',
                      point_of_contact='Joe Roets', email='support@corpus.io',
                      phone='+1-650-731-2223', account_type='super_account')
corpus.put()

# Create super admin group
super_admin = Group(id='super_admin', name='Super Administrator',
                    description='Super Administrator', organization=corpus.key)
super_admin.active = True
super_admin.put()

# Create Corpus.io group
org = Group(key=Group.create_key(), name='corpus.io',
            description='corpus.io organization group', organization=corpus.key)
org.active = True
org.organization = corpus.key
corpus.groups.append(org.key)
corpus.org_group = org.key
org.put()

# Setup Super Admin Accounts
username = server.create_uuid()
print ('Super user Andrew, username: ' + username)
User.new({'username': username, 'password': 'NVE06vX^23i5%7Qu^4HfocNe0CEK$U', 'first_name': 'Andrew',
          'last_name': 'Miller', 'email': 'andrew@createtank.com',
          'organization': corpus.key.id(), 'phone_numbers': {'main': '304-816-2003'}},
         verify_email=False)
amiller_su = User.get_by_id(username)
amiller_su.organization = corpus.key
amiller_su.require_password_change = True
amiller_su.groups = [super_admin.key]
amiller_su.put()
corpus.admins.append(amiller_su.key)

username = server.create_uuid()
print ('Super user Joe, username: ' + username)
User.new({'username': username, 'password': 'NVE06vX^23i5%7Qu^4HfocNe0CEK$U', 'first_name': 'Joe',
          'last_name': 'Roets', 'email': 'joe@corpus.com',
          'organization': corpus.key.id(), 'phone_numbers': {'main': '646-355-8865'}},
         verify_email=False)
joe_su = User.get_by_id(username)
joe_su.groups.append(super_admin.key)
joe_su.organization = corpus.key
joe_su.require_password_change = True
joe_su.put()
corpus.admins.append(joe_su.key)

username = server.create_uuid()
print ('Super user Martin, username: ' + username)
User.new({'username': username, 'password': 'NVE06vX^23i5%7Qu^4HfocNe0CEK$U', 'first_name': 'Martin',
          'last_name': 'Greenman', 'email': 'mgreenman@corpus.com',
          'organization': corpus.key.id(), 'phone_numbers': {'main': '304-933-9334'}},
         verify_email=False)
mgreenman_su = User.get_by_id(username)
mgreenman_su.groups.append(super_admin.key)
mgreenman_su.organization = corpus.key
mgreenman_su.require_password_change = True
mgreenman_su.put()
corpus.admins.append(mgreenman_su.key)

# Setup personal accounts
print ('Createing Andrew\'s personal account')
User.new({'username': 'amiller', 'password': 'NVE06vX^23i5%7Qu^4HfocNe0CEK$U', 'first_name': 'Andrew',
          'last_name': 'Miller', 'email': 'andrew@corpus.io',
          'organization': corpus.key.id(), 'phone_numbers': {'main': '304-816-2003'}},
         verify_email=False)
amiller = User.get_by_id('amiller')
amiller.organization = corpus.key
amiller.require_password_change = True
amiller.put()

print ('Createing Joe\'s personal account')
User.new({'username': 'joe', 'password': 'NVE06vX^23i5%7Qu^4HfocNe0CEK$U', 'first_name': 'Joe',
          'last_name': 'Roets', 'email': 'joe@corpus.io',
          'organization': corpus.key.id(), 'phone_numbers': {'main': '646-355-8865'}},
         verify_email=False)
joe = User.get_by_id('joe')
joe.organization = corpus.key
joe.require_password_change = True
joe.put()

print ('Createing Martin\'s personal account')
User.new({'username': 'martin', 'password': 'NVE06vX^23i5%7Qu^4HfocNe0CEK$U', 'first_name': 'Martin',
          'last_name': 'Greenman', 'email': 'martin@corpus.io',
          'organization': corpus.key.id(), 'phone_numbers': {'main': '304-933-9334'}},
         verify_email=False)
mgreenman = User.get_by_id('martin')
mgreenman.organization = corpus.key
mgreenman.require_password_change = True
mgreenman.put()

# Save and quit
corpus.put()
