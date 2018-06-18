import getpass
import sys
import os
import logging

# if len(sys.argv) != 2:
#     logging.critical("invalid arguments given")
#     sys.exit(-1)

logging.basicConfig(level=logging.INFO)
logging.info('Setting up PATHs')


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

logging.info('PATHs are set')

from google.appengine.ext.remote_api import remote_api_stub
from server.models import *


def auth_func():
    return raw_input('Username: '), getpass.getpass('Password:')


def app_func():
    return raw_input('App: ') + '.appspot.com'


logging.info('Logging into app engine')
remote_api_stub.ConfigureRemoteApi(None, '/_ah/remote_api', auth_func, app_func())
logging.info('Logged in')

org = Organization.get_by_id('corpus.io')
q = Project.query()
q = q.filter(Project.organization == org.key)


for project in q.iter():
    print project.key
    try:
        project.to_dict(0, User.get_by_id('amiller_su'))
    except:
        print project.title



# logging.info('Project fetched')
# logging.info('Saving project to json file')
# f = open(project_dict['title'] + '.json', 'w')
# f.write(json.dumps(project_dict))