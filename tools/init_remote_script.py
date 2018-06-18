# Change working dictory to project root
import os
import sys
import inspect

cmd_subfolder = os.path.realpath(
    os.path.abspath(os.path.join(os.path.split(inspect.getfile(inspect.currentframe()))[0], "../")))
if cmd_subfolder not in sys.path:
    sys.path.insert(0, cmd_subfolder)


def init_paths():
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