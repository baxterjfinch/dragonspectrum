from uuid import uuid1
from datetime import datetime
from google.appengine.ext import ndb

__all__ = [
    'Analytics',
    'ANALYTIC_ACTIONS',
    'ANALYTIC_CONSUMPTION_ACTIONS',
    'ANALYTIC_PRODUCTION_ACTIONS',
]


ANALYTIC_ACTIONS = [
    'con_nav',          # Concept Navigation
    'con_exp',          # Concept Expanded
    'con_col',          # Concept Collapsed
    'con_new',          # Concept Created
    'con_mov',          # Concept Moved
    'con_cc_t',         # Concept Crawlcontext Set to True
    'con_cc_f',         # Concept Crawlcontext Set to False
    'con_del',          # Concept Deleted
    'con_phr_del',      # Concept's Phrasing Deleted
    'con_phr_edit',     # Concept's Phrasing Edited
    'con_phr_cha',      # Concept's Phrasing Changed
    'con_phr_new',      # Concept has New Phrasing
    'con_soc_sha',      # Concept Shared to Social Network (not implemented)
    'con_lnk',          # Concept Linked
    'con_attr_cha',     # Concept's Attribute Changed
    'con_perm',         # Concept's Permission Changed
    'con_med_vw',       # Concept's Media Viewed
    'pro_opn',          # Project Opened
    'pro_soc_sha',      # Project Shared to Social Network (not implemented)
    'pro_search',       # Project Searched
    'pro_import',       # Project Imported
    'doc_publish',      # Document Publish
    'sum_publish',      # Summary Publish
    'pres_publish',     # Presentation Publish
]

ANALYTIC_CONSUMPTION_ACTIONS = [
    'con_nav',
    'con_exp',
    'con_col',
    'con_med_vw',
    'pro_opn',
    'pro_search',
]

ANALYTIC_PRODUCTION_ACTIONS = [
    'con_new',
    'con_mov',
    'con_cc_t',
    'con_cc_f',
    'con_del',
    'con_phr_del',
    'con_phr_edit',
    'con_phr_cha',
    'con_phr_new',
    'con_soc_sha',
    'con_lnk',
    'con_attr_cha',
    'con_perm',
    'pro_soc_sha',
    'pro_import',
    'doc_publish',
    'sum_publish',
    'pres_publish',
]


class Analytics(ndb.Model):
    ts = ndb.DateTimeProperty()
    artifact_organization = ndb.KeyProperty()
    artifact = ndb.KeyProperty()
    artifact_owners = ndb.KeyProperty(repeated=True)
    meta_data = ndb.JsonProperty()
    project = ndb.KeyProperty()
    action = ndb.StringProperty()
    reference = ndb.KeyProperty()
    analytic_session = ndb.KeyProperty()

    @staticmethod
    def is_valid_action(action):
        if action in ANALYTIC_ACTIONS:
            return True
        return False

    @staticmethod
    def new(ts=None, **kwargs):
        return Analytics(id=uuid1().get_hex(), ts=ts if ts else datetime.now(), **kwargs)

    @staticmethod
    def get_first():
        ana = Analytics.query().order(Analytics.ts).fetch(1)
        if len(ana) == 0:
            return None
        return ana[0]

    @staticmethod
    def get_last():
        ana = Analytics.query().order(-Analytics.ts).fetch(1)
        if len(ana) == 0:
            return None
        return ana[0]

    @staticmethod
    def get_time_frame(start_time, end_time):
        return Analytics.query(ndb.AND(Analytics.ts >= start_time, Analytics.ts < end_time)).order(Analytics.ts).fetch()