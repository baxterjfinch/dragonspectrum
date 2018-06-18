import logging
from datetime import timedelta

from cerberus import handlers as cerberus_handlers
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

from models.analytic import *
from models.account import Organization

log = logging.getLogger('tt')


class AjaxThinkTankAnalyticsHanlder(AuthorizationRequestHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        temp_data = {}
        template_index = JINJA_ENVIRONMENT.get_template('admin_panel/thinktank/analytics.html')
        self.response.write(template_index.render(temp_data))

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)


class ThinkTankAnalyticsDailyHanlder(AuthorizationRequestHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        start_time = self.request.get('start_time', None)
        try:
            start_time = AnalyticsDailyStat.get_start_time(datetime.fromtimestamp(int(start_time) / 1000))
        except ValueError:
            raise HttpErrorException.bad_request('start_time must be javascript timestamps')
        end_time = AnalyticsDailyStat.get_end_time(start_time)
        self.write_json_response(self._get_analyticstats_json(AnalyticsHourlyStat, OrgAnalyticsHourlyStat,
                                                              start_time, end_time))

    @cerberus_handlers.exception_callback
    def _get_analyticstats_json(self, cls, cls_org, start_time, end_time):
        log.debug('Class: %s Class Org: %s Start Time: %s End Time: %s', cls.__name__, cls_org.__name__, start_time, end_time)
        if self.organization:
            query = cls_org.query()
            query = query.filter(ndb.AND(
                cls_org.entity == self.organization.key,
                cls_org.start_time >= start_time,
                cls_org.start_time < end_time)).order(
                    cls_org.start_time)
        else:
            query = cls.query()
            query = query.filter(ndb.AND(
                cls.start_time >= start_time,
                cls.start_time < end_time)).order(
                    cls.start_time)
        anastat = query.fetch()
        anastat_json = []
        added = False
        cur_start_time = start_time

        ana_index = 0
        while cur_start_time < end_time:
            if ana_index < len(anastat) and anastat[ana_index].start_time == cur_start_time:
                anastat_json.append(anastat[ana_index].to_dict())
                ana_index += 1
            else:
                temp_ana = cls.new()
                temp_ana.ts = datetime.now()
                temp_ana.mod_ts = datetime.now()
                temp_ana.start_time = cur_start_time
                temp_ana.end_time = cls.get_end_time(cur_start_time)
                anastat_json.append(temp_ana.to_dict())
            cur_start_time = cls.get_end_time(cur_start_time)

        # for ana in anastat:
        #     count = 0
        #     while ana.start_time != cur_start_time:
        #         if count > 1000:
        #             raise HttpErrorException.bad_request('error getting analytics')
        #         added = True
        #         temp_ana = cls.new()
        #         temp_ana.ts = datetime.now()
        #         temp_ana.mod_ts = datetime.now()
        #         temp_ana.start_time = cur_start_time
        #         cur_start_time = cls.get_end_time(cur_start_time)
        #         temp_ana.end_time = cur_start_time
        #         anastat_json.append(temp_ana.to_dict())
        #     if not added:
        #         cur_start_time = cls.get_end_time(cur_start_time)
        #         added = False
        #         anastat_json.append(ana.to_dict())
        response = {
            'start_time': time.mktime(start_time.timetuple()) * 1000,
            'start_time_str': str(start_time),
            'end_time': time.mktime(end_time.timetuple()) * 1000,
            'end_time_str': str(end_time),
            'analyticstat': anastat_json,
        }
        return response


class ThinkTankAnalyticsWeeklyHanlder(ThinkTankAnalyticsDailyHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        start_time = self.request.get('start_time', None)
        try:
            start_time = AnalyticsWeeklyStat.get_start_time(datetime.fromtimestamp(int(start_time) / 1000))
        except ValueError:
            raise HttpErrorException.bad_request('start_time must be javascript timestamps')
        end_time = AnalyticsWeeklyStat.get_end_time(start_time)
        self.write_json_response(self._get_analyticstats_json(AnalyticsDailyStat, OrgAnalyticsDailyStat,
                                                              start_time, end_time))


class ThinkTankAnalyticsMonthlyHanlder(ThinkTankAnalyticsDailyHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        start_time = self.request.get('start_time', None)
        try:
            start_time = AnalyticsMonthlyStat.get_start_time(datetime.fromtimestamp(int(start_time) / 1000))
        except ValueError:
            raise HttpErrorException.bad_request('start_time must be javascript timestamps')
        end_time = AnalyticsMonthlyStat.get_end_time(start_time)
        self.write_json_response(self._get_analyticstats_json(AnalyticsWeeklyStat, OrgAnalyticsWeeklyStat,
                                                              start_time, end_time))


class ThinkTankAnalyticsTopDailyHanlder(AuthorizationRequestHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        start_time = self.request.get('start_time', None)
        limit = self.request.get('limit', 10)
        ana_type = self.request.get('type', 'concept')
        if ana_type not in ['concept', 'user']:
            raise HttpErrorException.bad_request('invalid type')
        if ana_type == 'user':
            ana_type = UserAnalyticsDailyStat
        else:
            ana_type = ConceptAnalyticsDailyStat
        try:
            limit = int(limit)
        except ValueError:
            raise HttpErrorException.bad_request('limit must be int')
        if limit > 100:
            limit = 100
        if not start_time:
            raise HttpErrorException.bad_request('no start_time given')
        try:
            start_time = ana_type.get_start_time(datetime.fromtimestamp(int(start_time) / 1000))
        except ValueError:
            raise HttpErrorException.bad_request('start_time must be javascript timestamps')
        if not self.organization:
            top_total = ana_type.query(ana_type.start_time == start_time).order(
                -ana_type.total).fetch(limit)
            top_consumption = ana_type.query(ana_type.start_time == start_time).order(
                -ana_type.total_consumption).fetch(limit)
            top_production = ana_type.query(ana_type.start_time == start_time).order(
                -ana_type.total_production).fetch(limit)
        else:
            top_total = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total).fetch(limit)
            top_consumption = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total_consumption).fetch(limit)
            top_production = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total_production).fetch(limit)
        top_total_json = []
        for s in top_total:
            if ana_type == ConceptAnalyticsDailyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_total_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_total_json.append(d)
        top_consumption_json = []
        for s in top_consumption:
            if ana_type == ConceptAnalyticsDailyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_consumption_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_consumption_json.append(d)
        top_production_json = []
        for s in top_production:
            if ana_type == ConceptAnalyticsDailyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_production_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_production_json.append(d)
        response = {
            'start_time': time.mktime(start_time.timetuple()) * 1000,
            'start_time_str': str(start_time),
            'top_total': top_total_json,
            'top_consumption': top_consumption_json,
            'top_production': top_production_json,
        }
        self.write_json_response(response)


class ThinkTankAnalyticsTopWeeklyHanlder(AuthorizationRequestHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        start_time = self.request.get('start_time', None)
        limit = self.request.get('limit', 10)
        ana_type = self.request.get('type', 'concept')
        if ana_type not in ['concept', 'user']:
            raise HttpErrorException.bad_request('invalid type')
        if ana_type == 'user':
            ana_type = UserAnalyticsWeeklyStat
        else:
            ana_type = ConceptAnalyticsWeeklyStat
        try:
            limit = int(limit)
        except ValueError:
            raise HttpErrorException.bad_request('limit must be int')
        if limit > 100:
            limit = 100
        if not start_time:
            raise HttpErrorException.bad_request('no start_time given')
        try:
            start_time = ana_type.get_start_time(datetime.fromtimestamp(int(start_time) / 1000))
        except ValueError:
            raise HttpErrorException.bad_request('start_time must be javascript timestamps')
        if not self.organization:
            top_total = ana_type.query(ana_type.start_time == start_time).order(
                -ana_type.total).fetch(limit)
            top_consumption = ana_type.query(
                ana_type.start_time == start_time).order(
                    -ana_type.total_consumption).fetch(limit)
            top_production = ana_type.query(
                ana_type.start_time == start_time).order(
                    -ana_type.total_production).fetch(limit)
        else:
            top_total = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total).fetch(limit)
            top_consumption = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total_consumption).fetch(limit)
            top_production = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total_production).fetch(limit)
        top_total_json = []
        for s in top_total:
            if ana_type == ConceptAnalyticsWeeklyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_total_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_total_json.append(d)
        top_consumption_json = []
        for s in top_consumption:
            if ana_type == ConceptAnalyticsWeeklyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_consumption_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_consumption_json.append(d)
        top_production_json = []
        for s in top_production:
            if ana_type == ConceptAnalyticsWeeklyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_production_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_production_json.append(d)
        response = {
            'start_time': time.mktime(start_time.timetuple()) * 1000,
            'start_time_str': str(start_time),
            'top_total': top_total_json,
            'top_consumption': top_consumption_json,
            'top_production': top_production_json,
        }
        self.write_json_response(response)


class ThinkTankAnalyticsTopMonthlyHanlder(AuthorizationRequestHanlder):
    organization = None

    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if organization:
            self.organization = Organization.get_by_id(organization)
            if not self.organization:
                raise HttpErrorException.bad_request('invalid organization id')
        if (not self.user.is_super_admin or (self.organization and not self.user.is_org_admin and
                                             self.organization.key != self.user.organization)):
            raise HttpErrorException.forbidden()
        start_time = self.request.get('start_time', None)
        limit = self.request.get('limit', 10)
        ana_type = self.request.get('type', 'concept')
        if ana_type not in ['concept', 'user']:
            raise HttpErrorException.bad_request('invalid type')
        if ana_type == 'user':
            ana_type = UserAnalyticsMonthlyStat
        else:
            ana_type = ConceptAnalyticsMonthlyStat
        try:
            limit = int(limit)
        except ValueError:
            raise HttpErrorException.bad_request('limit must be int')
        if limit > 100:
            limit = 100
        if not start_time:
            raise HttpErrorException.bad_request('no start_time given')
        try:
            start_time = ana_type.get_start_time(datetime.fromtimestamp(int(start_time) / 1000))
        except ValueError:
            raise HttpErrorException.bad_request('start_time must be javascript timestamps')
        log.debug('start_time: %s', start_time)
        if not self.organization:
            top_total = ana_type.query(ana_type.start_time == start_time).order(
                -ana_type.total).fetch(limit)
            top_consumption = ana_type.query(
                ana_type.start_time == start_time).order(
                    -ana_type.total_consumption).fetch(limit)
            top_production = ana_type.query(
                ana_type.start_time == start_time).order(
                    ana_type.total_production).fetch(limit)
        else:
            top_total = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total).fetch(limit)
            top_consumption = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total_consumption).fetch(limit)
            top_production = ana_type.query(ndb.AND(
                ana_type.start_time == start_time,
                ana_type.entity_organization == self.organization.key
            )).order(-ana_type.total_production).fetch(limit)
        top_total_json = []
        for s in top_total:
            if ana_type == ConceptAnalyticsMonthlyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_total_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_total_json.append(d)
        top_consumption_json = []
        for s in top_consumption:
            if ana_type == ConceptAnalyticsMonthlyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_consumption_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_consumption_json.append(d)
        top_production_json = []
        for s in top_production:
            if ana_type == ConceptAnalyticsMonthlyStat:
                d = s.to_dict()
                con = s.entity.get()
                if con:
                    phr = con.get_phrasing()
                else:
                    phr = 'Concept no longer exists'
                d['phrasing'] = phr
                top_production_json.append(d)
            else:
                d = s.to_dict()
                user = s.entity.get()
                if user:
                    username = user.username
                else:
                    username = 'User no longer exists'
                d['username'] = username
                top_production_json.append(d)
        response = {
            'start_time': time.mktime(start_time.timetuple()) * 1000,
            'start_time_str': str(start_time),
            'top_total': top_total_json,
            'top_consumption': top_consumption_json,
            'top_production': top_production_json,
        }
        self.write_json_response(response)