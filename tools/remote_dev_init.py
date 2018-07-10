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

    global_conf = GlobalConfig.get_by_id(config.global_config_id)
    if not global_conf:
        GlobalConfig.new()

    from google.appengine.api import memcache
    memcache.flush_all()

    print 'Flushing all memcache'
    memcache.flush_all()

    global_conf = tt_logging.LoggingConfig.get_by_id(config.logging_config_id)
    if not global_conf:
        tt_logging.LoggingConfig.new()

    global_conf = GlobalConfig.get_by_id(config.global_config_id)
    if not global_conf:
        GlobalConfig.new()

    wordshare = Group.query(Group.name == 'world')
    if wordshare.get() is None:
        wordshare = Group(id='world', name='World Share', description='World Share')
        wordshare.active = True
        wordshare.put()

    print 'Checking for super users'
    dragonchain = Organization.get_by_id('DragonChain')
    if dragonchain is None:
        dragonchain = Organization(id='DragonChain', name='DragonChain', description='DragonChain',
                              domain='dragonchain.com', owner='Joe Roets', webpage='https://dragonchain.com/',
                              point_of_contact='Joe Roets', email='support@dragonchain.com',
                              phone='+1 111 111 1111', account_type='super_account')
        dragonchain.groups.append(wordshare.key)
        dragonchain.put()

    super_admin = Group.get_by_id('super_admin')
    if super_admin is None:
        super_admin = Group(id='super_admin', name='Super Administrator',
                            description='Super Administrator', organization=dragonchain.key)
        super_admin.active = True
        super_admin.put()

    org = Group.query(Group.name == 'DragonChain')
    if org.get() is None:
        org = Group(key=Group.create_key(), name='DragonChain',
                    description='DragonChain organization group', organization=dragonchain.key)
        org.active = True
        org.organization = dragonchain.key
        dragonchain.groups.append(org.key)
        dragonchain.org_group = org.key
        org.put()

    tech = Group.query(Group.name == 'Tech')
    if tech.get() is None:
        tech = Group(key=Group.create_key(), name='Tech',
                     description='Tech', organization=dragonchain.key)
        tech.active = True
        tech.organization = dragonchain.key
        dragonchain.groups.append(tech.key)
        tech.put()

    legal = Group.query(Group.name == 'Legal')
    if legal.get() is None:
        legal = Group(key=Group.create_key(), name='Legal',
                      description='Legal', organization=dragonchain.key)
        legal.active = True
        legal.organization = dragonchain.key
        dragonchain.groups.append(legal.key)
        legal.put()

    finance = Group.query(Group.name == 'Finance')
    if finance.get() is None:
        finance = Group(key=Group.create_key(), name='Finance',
                        description='Finance', organization=dragonchain.key)
        finance.active = True
        finance.organization = dragonchain.key
        dragonchain.hidden_groups.append(finance.key)
        finance.put()

    marketing = Group.query(Group.name == 'Marketing')
    if marketing.get() is None:
        marketing = Group(key=Group.create_key(), name='Marketing',
                          description='Marketing', organization=dragonchain.key)
        marketing.active = True
        marketing.organization = dragonchain.key
        dragonchain.groups.append(marketing.key)
        marketing.put()

    topsec = Group.query(Group.name == 'Top Secret')
    if topsec.get() is None:
        topsec = Group(key=Group.create_key(), name='Top Secret',
                       description='Top Secret', organization=dragonchain.key)
        topsec.active = True
        topsec.organization = dragonchain.key
        dragonchain.hidden_groups.append(topsec.key)
        topsec.put()

    secret = Group.query(Group.name == 'Secret')
    if secret.get() is None:
        secret = Group(key=Group.create_key(), name='Secret',
                       description='Secret', organization=dragonchain.key)
        secret.active = True
        secret.organization = dragonchain.key
        dragonchain.hidden_groups.append(secret.key)
        secret.put()

    confid = Group.query(Group.name == 'Confidential')
    if confid.get() is None:
        confid = Group(key=Group.create_key(), name='Confidential',
                       description='Confidential', organization=dragonchain.key)
        confid.active = True
        tech.organization = dragonchain.key
        dragonchain.groups.append(confid.key)
        confid.put()

    amiller_su = User.get_by_id('amiller_su')
    if amiller_su is None:
        print 'Super user amiller not found, creating him now'
        User.new({'username': 'amiller_su', 'password': 'pass', 'first_name': 'Andrew',
                  'last_name': 'Miller', 'email': 'amiller_su@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        amiller_su = User.get_by_id('amiller_su')
        amiller_su.organization = dragonchain.key
        amiller_su.require_password_change = True
        amiller_su.groups = [super_admin.key]
        amiller_su.put()
        dragonchain.admins.append(amiller_su.key)

    baxter_su = User.get_by_id('baxter_su')
    if baxter_su is None:
        print 'Super user joe not found, creating him now'
        User.new({'username': 'baxter_su', 'password': 'pass', 'first_name': 'Baxter',
                  'last_name': 'Finch', 'email': 'baxter_su@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        baxter_su = User.get_by_id('baxter_su')
        baxter_su.groups.append(super_admin.key)
        baxter_su.organization = dragonchain.key
        baxter_su.require_password_change = True
        baxter_su.put()
        dragonchain.admins.append(baxter_su.key)

    joe_su = User.get_by_id('joe_su')
    if joe_su is None:
        print 'Super user joe not found, creating him now'
        User.new({'username': 'joe_su', 'password': 'pass', 'first_name': 'Joe',
                  'last_name': 'Roets', 'email': 'joe_su@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        joe_su = User.get_by_id('joe_su')
        joe_su.groups.append(super_admin.key)
        joe_su.organization = dragonchain.key
        joe_su.require_password_change = True
        joe_su.put()
        dragonchain.admins.append(joe_su.key)

    amiller = User.get_by_id('amiller')
    if amiller is None:
        print 'User amiller not found, creating him now'
        User.new({'username': 'amiller', 'password': 'pass', 'first_name': 'Andrew',
                  'last_name': 'Miller', 'email': 'andrew@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        amiller = User.get_by_id('amiller')
        amiller.organization = dragonchain.key
        amiller.require_password_change = True
        amiller.groups.append(tech.key)
        amiller.groups.append(legal.key)
        amiller.put()

    joe = User.get_by_id('joe')
    if joe is None:
        print 'User joe not found, creating him now'
        User.new({'username': 'joe', 'password': 'pass', 'first_name': 'Joe',
                  'last_name': 'Roets', 'email': 'joe@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        joe = User.get_by_id('joe')
        joe.groups.append(tech.key)
        joe.groups.append(legal.key)
        joe.organization = dragonchain.key
        joe.require_password_change = True
        joe.put()

    baxter = User.get_by_id('baxter')
    if baxter is None:
        print 'User baxter not found, creating him now'
        User.new({'username': 'baxter', 'password': 'pass', 'first_name': 'Baxter',
                  'last_name': 'Finch', 'email': 'baxter@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        baxter = User.get_by_id('baxter')
        baxter.groups.append(tech.key)
        baxter.groups.append(legal.key)
        baxter.organization = dragonchain.key
        baxter.require_password_change = True
        baxter.put()

    bob = User.get_by_id('bob')
    if bob is None:
        print 'User bob not found, creating him now'
        User.new({'username': 'bob', 'password': 'pass', 'first_name': 'bob',
                  'last_name': 'bob', 'email': 'bob@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        bob = User.get_by_id('bob')
        bob.organization = dragonchain.key
        bob.require_password_change = True
        bob.groups.append(tech.key)
        bob.groups.append(legal.key)
        bob.put()

    tom = User.get_by_id('tom')
    if tom is None:
        print 'User tom not found, creating him now'
        User.new({'username': 'tom', 'password': 'pass', 'first_name': 'tom',
                  'last_name': 'tom', 'email': 'tom@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        tom = User.get_by_id('tom')
        tom.organization = dragonchain.key
        tom.require_password_change = True
        tom.groups.append(tech.key)
        tom.groups.append(legal.key)
        tom.put()

    sam = User.get_by_id('sam')
    if sam is None:
        print 'User sam not found, creating him now'
        User.new({'username': 'sam', 'password': 'pass', 'first_name': 'sam',
                  'last_name': 'sam', 'email': 'sam@dragonchain.com',
                  'phone_numbers': {'main': '304-123-1234'}},
                 verify_email=False, organization=dragonchain, worldshare_group=Group.get_worldshare_key())
        sam = User.get_by_id('sam')
        sam.organization = dragonchain.key
        sam.require_password_change = True
        sam.groups.append(tech.key)
        sam.groups.append(secret.key)
        sam.put()

    dragonchain.put()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('project_id', help='Your Project ID.')

    args = parser.parse_args()

    main(args.project_id)
