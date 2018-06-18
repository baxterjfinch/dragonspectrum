import init_remote_script
init_remote_script.init_paths()

import getpass


from google.appengine.ext.remote_api import remote_api_stub

import setup_paths
setup_paths.fix_path()
from server import GlobalConfig, config
from server import tt_logging
from models.account import *
from models.artifacts import *
from models.importer import *
from models.payment import *
from cerberus.handlers import Session

import logging


def auth_func():
    return raw_input('Username: '), getpass.getpass('Password:')


def app_func():
    return raw_input('App: ') + '.appspot.com'

remote_api_stub.ConfigureRemoteApi(None, '/_ah/remote_api', auth_func, app_func())

wordshare = Group.get_by_id('world')

orgs = Organization.query().fetch()
for org in orgs:
    org.groups.append(wordshare.key)
ndb.put_multi(orgs)