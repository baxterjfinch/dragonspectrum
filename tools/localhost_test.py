#!/usr/bin/python
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
    return '', ''


def app_func():
    return 'localhost:5000'


def main():
    remote_api_stub.ConfigureRemoteApi(None, '/_ah/remote_api', auth_func, app_func())

    print Permission.get_by_id('56082847852611e8a90fe9cd3e90132f')

if __name__ == '__main__':
    main()
