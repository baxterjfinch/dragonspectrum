#!/usr/bin/python
import init_remote_script

init_remote_script.init_paths()

import getpass

from google.appengine.ext.remote_api import remote_api_stub

import setup_paths

setup_paths.fix_path()
from models.account import *
from models.artifacts import *
from models.importer import *
from models.payment import *
from cerberus.handlers import Session
from renderengine.publisher import *
import code


def auth_func():
    return '', ''


def app_func():
    return 'localhost:5000'


remote_api_stub.ConfigureRemoteApi(None, '/_ah/remote_api', auth_func, app_func())

project = Project.get_by_id('2edd3c948f9411e4b34cbf83d218a550')
# walker = ConceptPublishWalker(project)
#
# for walk in walker:
#     for con in walk:
#         print con.get_phrasing()[:120]

print Concept.query(Concept.project == project.key).count()