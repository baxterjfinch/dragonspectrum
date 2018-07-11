#!/usr/bin/python

# import init_remote_script
# init_remote_script.init_paths()

import sys
sys.path.insert(0, '/opt/google/google-cloud-sdk/platform/google_appengine/')

import dev_appserver
dev_appserver.fix_sys_path()


from google.appengine.ext import vendor
from google.appengine.ext.remote_api import remote_api_stub
vendor.add('lib')

# import setup_paths
# setup_paths.fix_path()

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

logging.info('Logging into app engine')
remote_api_stub.ConfigureRemoteApi(None, '/_ah/remote_api', auth_func, app_func())
logging.info('Logged in')

global_conf = GlobalConfig.get_by_id(config.global_config_id)
if not global_conf:
    GlobalConfig.new()

logging.info('Clearing Datastore')
ndb.delete_multi(Attributes.query().fetch(keys_only=True))
ndb.delete_multi(Concept.query().fetch(keys_only=True))
ndb.delete_multi(CrawlContext.query().fetch(keys_only=True))
ndb.delete_multi(Document.query().fetch(keys_only=True))
ndb.delete_multi(Group.query().fetch(keys_only=True))
ndb.delete_multi(Organization.query().fetch(keys_only=True))
ndb.delete_multi(Permission.query().fetch(keys_only=True))
ndb.delete_multi(Phrasing.query().fetch(keys_only=True))
ndb.delete_multi(Project.query().fetch(keys_only=True))
ndb.delete_multi(User.query().fetch(keys_only=True))
ndb.delete_multi(SelectedPhrasing.query().fetch(keys_only=True))
ndb.delete_multi(Marker.query().fetch(keys_only=True))
ndb.delete_multi(Session.query().fetch(keys_only=True))
ndb.delete_multi(Importer.query().fetch(keys_only=True))
ndb.delete_multi(Transaction.query().fetch(keys_only=True))
ndb.delete_multi(GlobalConfig.query().fetch(keys_only=True))
from google.appengine.api import memcache

memcache.flush_all()
from google.appengine.api import memcache

logging.info('Flushing all memcache')
memcache.flush_all()

logging.info('Rebuilding Datastore')
logging.info('Checking for super users')

global_conf = tt_logging.LoggingConfig.get_by_id(config.logging_config_id)
if not global_conf:
    tt_logging.LoggingConfig.new()

global_conf = GlobalConfig.get_by_id(config.global_config_id)
if not global_conf:
    GlobalConfig.new()

wordshare = Group.get_by_id('world')
if wordshare is None:
    wordshare = Group(id='world', name='World Share', description='World Share')
    wordshare.active = True
    wordshare.put()

logging.info('Checking for super users')
corpus = Organization.get_by_id('corpus.io')
if corpus is None:
    corpus = Organization(id='corpus.io', name='corpus.io', description='corpus.io',
                          domain='corpus.io', owner='Joe Roets', webpage='www.corpus.io',
                          point_of_contact='Joe Roets', email='support@corpus.io',
                          phone='+1 650 731 2223', account_type='super_account')
    corpus.groups.append(wordshare.key)
    corpus.put()

super_admin = Group.get_by_id('super_admin')
if super_admin is None:
    super_admin = Group(id='super_admin', name='Super Administrator',
                        description='Super Administrator', organization=corpus.key)
    super_admin.active = True
    super_admin.put()

org = Group.query(Group.name == 'corpus.io')
if org.get() is None:
    org = Group(key=Group.create_key(), name='corpus.io',
                description='corpus.io organization group', organization=corpus.key)
    org.active = True
    org.organization = corpus.key
    corpus.groups.append(org.key)
    corpus.org_group = org.key
    org.put()

tech = Group.query(Group.name == 'Tech')
if tech.get() is None:
    tech = Group(key=Group.create_key(), name='Tech',
                 description='Tech', organization=corpus.key)
    tech.active = True
    tech.organization = corpus.key
    corpus.groups.append(tech.key)
    tech.put()

legal = Group.query(Group.name == 'Legal')
if legal.get() is None:
    legal = Group(key=Group.create_key(), name='Legal',
                  description='Legal', organization=corpus.key)
    legal.active = True
    legal.organization = corpus.key
    corpus.groups.append(legal.key)
    legal.put()

finance = Group.query(Group.name == 'Finance')
if finance.get() is None:
    finance = Group(key=Group.create_key(), name='Finance',
                    description='Finance', organization=corpus.key)
    finance.active = True
    finance.organization = corpus.key
    corpus.hidden_groups.append(finance.key)
    finance.put()

marketing = Group.query(Group.name == 'Marketing')
if marketing.get() is None:
    marketing = Group(key=Group.create_key(), name='Marketing',
                      description='Marketing', organization=corpus.key)
    marketing.active = True
    marketing.organization = corpus.key
    corpus.groups.append(marketing.key)
    marketing.put()

topsec = Group.query(Group.name == 'Top Secret')
if topsec.get() is None:
    topsec = Group(key=Group.create_key(), name='Top Secret',
                   description='Top Secret', organization=corpus.key)
    topsec.active = True
    topsec.organization = corpus.key
    corpus.hidden_groups.append(topsec.key)
    topsec.put()

secret = Group.query(Group.name == 'Secret')
if secret.get() is None:
    secret = Group(key=Group.create_key(), name='Secret',
                   description='Secret', organization=corpus.key)
    secret.active = True
    secret.organization = corpus.key
    corpus.hidden_groups.append(secret.key)
    secret.put()

confid = Group.query(Group.name == 'Confidential')
if confid.get() is None:
    confid = Group(key=Group.create_key(), name='Confidential',
                   description='Confidential', organization=corpus.key)
    confid.active = True
    tech.organization = corpus.key
    corpus.groups.append(confid.key)
    confid.put()

amiller_su = User.get_by_id('amiller_su')
if amiller_su is None:
    logging.info('Super user amiller not found, creating him now')
    User.new({'username': 'amiller_su', 'password': 'pass', 'first_name': 'Andrew',
              'last_name': 'Miller', 'email': 'andrew.miller@createtank.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    amiller_su = User.get_by_id('amiller_su')
    amiller_su.organization = corpus.key
    amiller_su.require_password_change = True
    amiller_su.groups = [super_admin.key]
    amiller_su.put()
    corpus.admins.append(amiller_su.key)

joe_su = User.get_by_id('joe_su')
if joe_su is None:
    logging.info('Super user joe not found, creating him now')
    User.new({'username': 'joe_su', 'password': 'pass', 'first_name': 'Joe',
              'last_name': 'Roets', 'email': 'joe@corpus.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    joe_su = User.get_by_id('joe_su')
    joe_su.groups.append(super_admin.key)
    joe_su.organization = corpus.key
    joe_su.require_password_change = True
    joe_su.put()
    corpus.admins.append(joe_su.key)

mgreenman_su = User.get_by_id('mgreenman_su')
if mgreenman_su is None:
    logging.info('Super user mgreenman not found, creating him now')
    User.new({'username': 'mgreenman_su', 'password': 'pass', 'first_name': 'Martin',
              'last_name': 'Greenman', 'email': 'mgreenman@corpus.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    mgreenman_su = User.get_by_id('mgreenman_su')
    mgreenman_su.groups.append(super_admin.key)
    mgreenman_su.organization = corpus.key
    mgreenman_su.require_password_change = True
    mgreenman_su.put()
    corpus.admins.append(mgreenman_su.key)

amiller = User.get_by_id('amiller')
if amiller is None:
    logging.info('User amiller not found, creating him now')
    User.new({'username': 'amiller', 'password': 'pass', 'first_name': 'Andrew',
              'last_name': 'Miller', 'email': 'andrew.miller@createtank.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    amiller = User.get_by_id('amiller')
    amiller.organization = corpus.key
    amiller.require_password_change = True
    amiller.groups.append(tech.key)
    amiller.groups.append(legal.key)
    amiller.put()

joe = User.get_by_id('joe')
if joe is None:
    logging.info('User joe not found, creating him now')
    User.new({'username': 'joe', 'password': 'pass', 'first_name': 'Joe',
              'last_name': 'Roets', 'email': 'joe@corpus.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    joe = User.get_by_id('joe')
    joe.groups.append(tech.key)
    joe.groups.append(legal.key)
    joe.organization = corpus.key
    joe.require_password_change = True
    joe.put()

mgreenman = User.get_by_id('mgreenman')
if mgreenman is None:
    logging.info('User mgreenman not found, creating him now')
    User.new({'username': 'mgreenman', 'password': 'pass', 'first_name': 'Martin',
              'last_name': 'Greenman', 'email': 'mgreenman@createtank.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    mgreenman = User.get_by_id('mgreenman')
    mgreenman.groups.append(tech.key)
    mgreenman.groups.append(legal.key)
    mgreenman.organization = corpus.key
    mgreenman.require_password_change = True
    mgreenman.put()

bob = User.get_by_id('bob')
if bob is None:
    logging.info('User bob not found, creating him now')
    User.new({'username': 'bob', 'password': 'pass', 'first_name': 'bob',
              'last_name': 'bob', 'email': 'bob@corpus.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    bob = User.get_by_id('bob')
    bob.organization = corpus.key
    bob.require_password_change = True
    bob.groups.append(tech.key)
    bob.groups.append(legal.key)
    bob.put()

tom = User.get_by_id('tom')
if tom is None:
    logging.info('User tom not found, creating him now')
    User.new({'username': 'tom', 'password': 'pass', 'first_name': 'tom',
              'last_name': 'tom', 'email': 'tom@corpus.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    tom = User.get_by_id('tom')
    tom.organization = corpus.key
    tom.require_password_change = True
    tom.groups.append(tech.key)
    tom.groups.append(legal.key)
    tom.put()

sam = User.get_by_id('sam')
if sam is None:
    logging.info('User sam not found, creating him now')
    User.new({'username': 'sam', 'password': 'pass', 'first_name': 'sam',
              'last_name': 'sam', 'email': 'sam@corpus.com',
              'phone_numbers': {'main': '304-123-1234'}},
             verify_email=False, organization=corpus, worldshare_group=Group.get_worldshare_key())
    sam = User.get_by_id('sam')
    sam.organization = corpus.key
    sam.require_password_change = True
    sam.groups.append(tech.key)
    sam.groups.append(secret.key)
    sam.put()

corpus.put()
