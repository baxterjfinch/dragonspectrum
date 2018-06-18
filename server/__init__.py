__name__ = 'server'

import random
import logging
from uuid import uuid1

from google.appengine.ext import ndb
from google.appengine.api import app_identity, memcache

from . import config, tt_logging

PRODUCTION = True


log = logging.getLogger('tt')

dbhandler = tt_logging.DatastoreLogHandler()
dbhandler.setLevel(config.datestore_log_level)
log.addHandler(dbhandler)

smtphandler = tt_logging.TTSMTPHandler()
smtphandler.setLevel(logging.DEBUG)
log.addHandler(smtphandler)


# Need to put a try/except around this for remote_api scripts
# get_application_id() throws an exception when not running
# through the dev_appserver
try:
    GCS_BUCKET_NAME = app_identity.get_application_id()
except AttributeError:
    GCS_BUCKET_NAME = None

if PRODUCTION:
    server_url = 'https://thinktank.corpus.io'
else:
    server_url = app_identity.get_default_version_hostname()


def create_uuid():
    return uuid1().get_hex()


def is_sub_list(list1, list2):
    for l in list1:
        if l not in list2:
            return False
    return True


def get_union(list1, list2):
    union = list1
    for element in list2:
        if element not in union:
            union.append(element)
    return union


def get_difference(list1, list2):
    diff = []
    for element in list1:
        if element not in list2:
            diff.append(element)
    for element in list2:
        if element not in list1:
            diff.append(element)
    return diff


def has_intersection(list1, list2):
    for element in list1:
        if element in list2:
            return True
    return False


def get_intersection(list1, list2):
    intersecting_list = []
    for element in list1:
        if element in list2:
            intersecting_list.append(element)
    return intersecting_list


def get_ids_from_key_list(keys):
    ids = []
    for key in keys:
        ids.append(key.id())
    return ids


def hsv_to_rgb(s, v, h=random.random()):
    h_i = int((h * 6))
    f = h * 6 - h_i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    if h_i == 0:
        r, g, b = v, t, p
    elif h_i == 1:
        r, g, b = q, v, p
    elif h_i == 2:
        r, g, b = p, v, t
    elif h_i == 3:
        r, g, b = p, q, v
    elif h_i == 4:
        r, g, b = t, p, v
    elif h_i == 5:
        r, g, b = v, p, q
    else:
        r, g, b = v, t, p
    return [int((r * 256)), int((g * 256)), int((b * 256))]


class GlobalConfig(ndb.Model):
    default_concept_loading_hq_batch_size = ndb.IntegerProperty(default=config.default_concept_loading_hq_batch_size)
    default_concept_loading_lq_batch_size = ndb.IntegerProperty(default=config.default_concept_loading_lq_batch_size)
    default_concept_loading_hq_timeout = ndb.IntegerProperty(default=config.default_concept_loading_hq_timeout)
    default_concept_loading_lq_timeout = ndb.IntegerProperty(default=config.default_concept_loading_lq_timeout)
    concept_loading_stay_ahead = ndb.BooleanProperty(default=config.concept_loading_stay_ahead)
    concept_loading_num_concur_req = ndb.IntegerProperty(default=config.concept_loading_num_concur_req)
    concept_loading_cache_children = ndb.IntegerProperty(default=config.concept_loading_cache_children)
    smtp_server_address = ndb.StringProperty(default=config.smtp_server_address)
    smtp_server_port = ndb.StringProperty(default=config.smtp_server_port)
    smtp_username = ndb.StringProperty(default=config.smtp_username)
    smtp_password = ndb.StringProperty(default=config.smtp_password)
    email_verifcation_grace_time = ndb.IntegerProperty(default=config.email_verifcation_grace_time)  # Hours
    email_verification_template_subject = ndb.TextProperty(default=config.email_verification_template_subject)
    email_verification_template = ndb.TextProperty(default=config.email_verification_template)
    trial_ending_template_subject = ndb.TextProperty(default=config.trial_ending_template_subject)
    trial_ending_template = ndb.TextProperty(default=config.trial_ending_template)
    trial_ended_template_subject = ndb.TextProperty(default=config.trial_ended_template_subject)
    trial_ended_template = ndb.TextProperty(default=config.trial_ended_template)
    after_trial_ended_template_subject = ndb.TextProperty(default=config.after_trial_ended_template_subject)
    after_trial_ended_template = ndb.TextProperty(default=config.after_trial_ended_template)
    account_expiring_template_subject = ndb.TextProperty(default=config.account_expiring_template_subject)
    account_expiring_template = ndb.TextProperty(default=config.account_expiring_template)
    account_expired_template_subject = ndb.TextProperty(default=config.account_expired_template_subject)
    account_expired_template = ndb.TextProperty(default=config.account_expired_template)
    after_account_expiring_template_subject = ndb.TextProperty(default=config.after_account_expiring_template_subject)
    after_account_expiring_template = ndb.TextProperty(default=config.after_account_expiring_template)
    subscription_account_extension_period = ndb.IntegerProperty(default=config.subscription_account_extension_period)
    reset_password_template = ndb.TextProperty(default=config.reset_password_template)
    reset_password_template_subject = ndb.TextProperty(default=config.reset_password_template_subject)
    username_template_subject = ndb.TextProperty(default=config.username_template_subject)
    username_template = ndb.TextProperty(default=config.username_template)
    coinbase_api_key = ndb.StringProperty(default=config.coinbase_api_key)
    coinbase_api_secret = ndb.StringProperty(default=config.coinbase_api_secret)
    coinbase_callback_secret_key = ndb.StringProperty(default=config.coinbase_callback_secret_key)
    google_seller_id = ndb.StringProperty(default=config.google_seller_id)
    google_seller_secret = ndb.StringProperty(default=config.google_seller_secret)
    require_email_verification = ndb.BooleanProperty(default=config.require_email_verification)
    trial_expiring_email_intervales = ndb.IntegerProperty(repeated=True)
    trial_expired_email_intervales = ndb.IntegerProperty(repeated=True)
    trial_expiring_grace_period = ndb.IntegerProperty(default=config.trial_expiring_grace_period)
    acct_expiring_email_intervales = ndb.IntegerProperty(repeated=True)
    acct_expired_email_intervales = ndb.IntegerProperty(repeated=True)
    acct_expiring_grace_period = ndb.IntegerProperty(default=config.acct_expiring_grace_period)
    allow_user_registration = ndb.BooleanProperty(default=config.allow_user_registration)
    allow_non_admin_user_login = ndb.BooleanProperty(default=config.allow_non_admin_user_login)
    failed_login_attemps_limit = ndb.IntegerProperty(default=config.failed_login_attemps_limit)
    failed_login_attemps_timeout = ndb.IntegerProperty(default=config.failed_login_attemps_timeout)

    @staticmethod
    def new():
        gc = GlobalConfig(id=config.global_config_id)
        gc.trial_expiring_email_intervales = config.trial_expiring_email_intervales
        gc.trial_expired_email_intervales = config.trial_expired_email_intervales
        gc.acct_expiring_email_intervales = config.acct_expiring_email_intervales
        gc.acct_expired_email_intervales = config.acct_expired_email_intervales
        gc.put()
        return gc

    @staticmethod
    def refresh_memcache():
        gc = GlobalConfig.get_by_id(config.global_config_id)
        memcache.set(config.global_config_id, gc, namespace='configurations')

    @staticmethod
    def get_configs():
        gc = memcache.get(config.global_config_id, namespace='configs')
        if gc is not None:
            return gc
        else:
            gc = GlobalConfig.get_by_id(config.global_config_id)
            if not gc:
                gc = GlobalConfig.new()
            memcache.add(config.global_config_id, gc, namespace='configs')
            return gc

    @staticmethod
    def reset():
        gc = GlobalConfig.get_configs()
        gc.key.delete()
        gc = GlobalConfig.new()
        gc.put()
        if memcache.get(config.global_config_id, namespace='configs') is not None:
            memcache.delete(config.global_config_id, namespace='configs')
            memcache.add(config.global_config_id, gc, namespace='configs')
