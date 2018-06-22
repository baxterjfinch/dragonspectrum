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

    # pro = Project.get_by_id('')
    # con = Concept.get_by_id('')
    # par = Concept.get_by_id('')
    #
    # print 'Con:', con.id, con.phrasings[0].get().text
    # print 'Par:', par.id, par.phrasings[0].get().text
    # print ''
    #
    # q = Concept.query()
    # q = q.filter(Concept.project == pro.key)
    # for c in q.iter():
    #     if c.id == '':
    #         continue
    #
    #     print c.id, con.key in c.children, c.phrasings[0].get().text

    # con = Concept.get_by_id('')
    # for child in con.get_children():
    #     print child.id
    #
    # print ''
    #
    # con = Concept.get_by_id('')
    # for child in con.get_children():
    #     print child.id

    q = Concept.query()
    q = q.filter()
    for c in q.iter():
        print c.id, c.phrasings[0].get().text


if __name__ == '__main__':
    main()
