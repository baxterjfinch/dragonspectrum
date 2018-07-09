import time
from uuid import uuid1
from datetime import datetime
from google.appengine.ext import ndb
from dateutil.relativedelta import *


class AnalyticsStat(ndb.Model):
    ts = ndb.DateTimeProperty(auto_now_add=True)
    mod_ts = ndb.DateTimeProperty(auto_now=True)
    start_time = ndb.DateTimeProperty()
    end_time = ndb.DateTimeProperty()
    total_con_nav = ndb.IntegerProperty(default=0)
    total_con_exp = ndb.IntegerProperty(default=0)
    total_con_col = ndb.IntegerProperty(default=0)
    total_con_new = ndb.IntegerProperty(default=0)
    total_con_mov = ndb.IntegerProperty(default=0)
    total_con_cc_t = ndb.IntegerProperty(default=0)
    total_con_cc_f = ndb.IntegerProperty(default=0)
    total_con_del = ndb.IntegerProperty(default=0)
    total_con_phr_del = ndb.IntegerProperty(default=0)
    total_con_phr_edit = ndb.IntegerProperty(default=0)
    total_con_phr_cha = ndb.IntegerProperty(default=0)
    total_con_phr_new = ndb.IntegerProperty(default=0)
    total_con_soc_sha = ndb.IntegerProperty(default=0)
    total_con_lnk = ndb.IntegerProperty(default=0)
    total_con_attr_cha = ndb.IntegerProperty(default=0)
    total_con_perm = ndb.IntegerProperty(default=0)
    total_con_med_vw = ndb.IntegerProperty(default=0)
    total_pro_opn = ndb.IntegerProperty(default=0)
    total_pro_soc_sha = ndb.IntegerProperty(default=0)
    total_pro_search = ndb.IntegerProperty(default=0)
    total_pro_perm = ndb.IntegerProperty(default=0)
    total_pro_import = ndb.IntegerProperty(default=0)
    total_consumption = ndb.IntegerProperty(default=0)
    total_production = ndb.IntegerProperty(default=0)
    total_doc_publish = ndb.IntegerProperty(default=0)
    total_sum_publish = ndb.IntegerProperty(default=0)
    total_pres_publish = ndb.IntegerProperty(default=0)
    total = ndb.IntegerProperty(default=0)
    touch_count = 0

    @classmethod
    def new(cls, id=None, **kwargs):
        return cls(id=id if id else uuid1().get_hex(), **kwargs)

    @classmethod
    def get_first(cls):
        ana = cls.query().order(cls.start_time).fetch(1)
        if len(ana) == 0:
            return None
        return ana[0]

    @classmethod
    def get_first_ts(cls):
        first = cls.get_first()
        return first.start_time if first else None

    @classmethod
    def get_last(cls):
        results = cls.query().order(-cls.end_time).fetch(1)
        if len(results) == 0:
            return None
        return results[0]

    @classmethod
    def get_last_ts(cls):
        last = cls.get_last()
        return last.start_time if last else None

    @classmethod
    def get_time_frame(cls, start_time, end_time):
        return cls.query(ndb.AND(cls.ts >= start_time, cls.ts < end_time)).order(cls.ts).fetch()

    def to_dict(self):
        d = super(AnalyticsStat, self).to_dict()
        d['id'] = self.key.id()
        d['ts_str'] = str(d['ts'])
        d['start_time_str'] = str(d['start_time'])
        d['end_time_str'] = str(d['end_time'])
        d['ts'] = time.mktime(d['ts'].timetuple()) * 1000
        d['start_time'] = time.mktime(d['start_time'].timetuple()) * 1000
        d['end_time'] = time.mktime(d['end_time'].timetuple()) * 1000
        if d['mod_ts']:
            d['mod_ts_str'] = str(d['mod_ts'])
            d['mod_ts'] = time.mktime(d['mod_ts'].timetuple()) * 1000
        return d


# All Analytics
class AnalyticsHourlyStat(AnalyticsStat):
    @staticmethod
    def get_start_time(start_time=None):
        """
        Return the start time used to query for AnalyticStats

        If start_time is given it is assumed that it is on the current hour needed
        and we set it to the beginning of that hour

        If it is not than we awesume we are one hour ahead and set it to the
        beginning of the previous hour
        """
        if start_time:
            return start_time.replace(minute=0, second=0, microsecond=0)
        else:
            return datetime.now().replace(minute=0, second=0, microsecond=0) - relativedelta(hours=1)

    @staticmethod
    def get_end_time(start_time):
        return start_time + relativedelta(hours=1)


class AnalyticsDailyStat(AnalyticsHourlyStat):
    @staticmethod
    def get_start_time(start_time=None):
        """
        Return the start time used to query for AnalyticStats

        If start_time is given it is assumed that it is on the current day needed
        and we set it to the beginning of that day

        If it is not than we awesume we are one day ahead and set it to the
        beginning of the previous day
        """
        if start_time:
            return start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - relativedelta(days=1)

    @staticmethod
    def get_end_time(start_time):
        return start_time + relativedelta(days=1)


class AnalyticsWeeklyStat(AnalyticsDailyStat):
    @staticmethod
    def get_start_time(start_time=None):
        """
        Return the start time used to query for AnalyticStats

        If start_time is given it is assumed that it is on the current week needed
        and we set it to the beginning of that week

        If it is not than we awesume we are one week ahead and set it to the
        beginning of the previous week
        """
        if start_time:
            return (start_time + relativedelta(weekday=MO(-1))).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            return (datetime.now() + relativedelta(weekday=MO(-2))).replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def get_end_time(start_time):
        return start_time + relativedelta(weeks=1)


class AnalyticsMonthlyStat(AnalyticsDailyStat):
    @staticmethod
    def get_start_time(start_time=None):
        """
        Return the start time used to query for AnalyticStats

        If start_time is given it is assumed that it is on the current month needed
        and we set it to the beginning of that month

        If it is not than we awesume we are one month ahead and set it to the
        beginning of the previous month
        """
        if start_time:
            return start_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            return (datetime.now() + relativedelta(months=-1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def get_end_time(start_time):
        return start_time + relativedelta(months=1)


# Base Class for Artifact AnlyticStats
class ArtifactAnalyticStat(AnalyticsStat):
    entity = ndb.KeyProperty()
    entity_organization = ndb.KeyProperty()

    def to_dict(self):
        d = super(ArtifactAnalyticStat, self).to_dict()
        if d['entity']:
            d['entity'] = d['entity'].id()
        if d['entity_organization']:
            d['entity_organization'] = d['entity_organization'].id()
        return d


# Project Analytics
class ProjectAnalyticsHourlyStat(ArtifactAnalyticStat, AnalyticsHourlyStat):
    pass


class ProjectAnalyticsDailyStat(ProjectAnalyticsHourlyStat, AnalyticsDailyStat):
    pass


class ProjectAnalyticsWeeklyStat(ProjectAnalyticsDailyStat, AnalyticsWeeklyStat):
    pass


class ProjectAnalyticsMonthlyStat(ProjectAnalyticsDailyStat, AnalyticsMonthlyStat):
    pass


# Concept Analytics
class ConceptAnalyticsHourlyStat(ArtifactAnalyticStat, AnalyticsHourlyStat):
    pass


class ConceptAnalyticsDailyStat(ConceptAnalyticsHourlyStat, AnalyticsDailyStat):
    pass


class ConceptAnalyticsWeeklyStat(ConceptAnalyticsDailyStat, AnalyticsWeeklyStat):
    pass


class ConceptAnalyticsMonthlyStat(ConceptAnalyticsDailyStat, AnalyticsMonthlyStat):
    pass


# Organization Analytics
class OrgAnalyticsHourlyStat(ArtifactAnalyticStat, AnalyticsHourlyStat):
    pass


class OrgAnalyticsDailyStat(OrgAnalyticsHourlyStat, AnalyticsDailyStat):
    pass


class OrgAnalyticsWeeklyStat(OrgAnalyticsDailyStat, AnalyticsWeeklyStat):
    pass


class OrgAnalyticsMonthlyStat(OrgAnalyticsDailyStat, AnalyticsMonthlyStat):
    pass


# User Analytics
class UserAnalyticsHourlyStat(ArtifactAnalyticStat, AnalyticsHourlyStat):
    pass


class UserAnalyticsDailyStat(UserAnalyticsHourlyStat, AnalyticsDailyStat):
    pass


class UserAnalyticsWeeklyStat(UserAnalyticsDailyStat, AnalyticsWeeklyStat):
    pass


class UserAnalyticsMonthlyStat(UserAnalyticsDailyStat, AnalyticsMonthlyStat):
    pass
