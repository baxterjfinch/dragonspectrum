#!/usr/bin/python
import argparse

try:
    import dev_appserver
    dev_appserver.fix_sys_path()
except ImportError:
    print('Please make sure the App Engine SDK is in your PYTHONPATH.')
    raise

from google.appengine.ext import ndb
from google.appengine.ext.remote_api import remote_api_stub


import setup_paths
setup_paths.fix_path()

import server
from server import GlobalConfig, config
from server import tt_logging
from models.account import *
from models.artifacts import *
from models.importer import *
from models.payment import *
from cerberus.handlers import Session
from google.appengine.api import memcache


def app_func():
    return raw_input('App: ') + '.appspot.com'


def main(project_id):
    print ('Logging into app engine')
    remote_api_stub.ConfigureRemoteApiForOAuth(
        '{}.appspot.com'.format(project_id),
        '/_ah/remote_api')
    print ('Logged in')

    from google.appengine.api import app_identity
    print app_identity.get_application_id()

    # dragonchain = Organization.get_by_id('DragonChain')
    # super_admin = Group.get_by_id('super_admin')
    #
    # ur = User.get_by_id('ray_su')
    # ur.groups = [super_admin.key]
    # ur.put()
    # dragonchain.admins.append(ur.key)
    # dragonchain.put()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('project_id', help='Your Project ID.')

    args = parser.parse_args()
    main(args.project_id)
