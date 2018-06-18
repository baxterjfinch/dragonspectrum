import time
import webapp2
import logging
import random
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from google.appengine.api import background_thread, logservice
from google.appengine.ext import ndb

from models.analytic import *
from models.artifacts import Concept
from models.account import Organization, User

log = logging.getLogger('tt')


class GenTestDataHandler(webapp2.RequestHandler):
    def get(self):
        hours = int(self.request.get('hours', 24))
        log.info('Hours: %s', hours)
        logservice.flush()
        an_action_count = {}
        for action in ANALYTIC_ACTIONS:
            an_action_count[action] = int(self.request.get(action, 2))
        start = datetime.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=hours)
        log.info('Start Time: %s', start)
        logservice.flush()
        total_per_hour = 0
        for count in an_action_count.itervalues():
            total_per_hour += count
        log.info('total per hours: %s', total_per_hour)
        logservice.flush()
        ana_obj = []
        for h in xrange(0, hours):
            log.info('Current Hour: %s', h)
            logservice.flush()
            start += timedelta(hours=1)
            for action, count in an_action_count.iteritems():
                for i in xrange(0, count):
                    ana_obj.append(Analytics.new(
                        ts=start + timedelta(minutes=random.randint(0, 59)),
                        artifact=ndb.Key('Concept', '043155e8eb4311e3bc89534d9485b528'),
                        artifact_owners=[ndb.Key('User', 'amiller')],
                        project=ndb.Key('Project', '03b0826beb4311e3a269534d9485b528'),
                        action=action,
                    ))
            ndb.put_multi(ana_obj)
            ana_obj[:] = []
        self.response.write(Analytics.query().count())


class GenHourlyTestDataHandler(webapp2.RequestHandler):
    def get(self):
        log.info('Starting Hourly Analytic Generator')
        t = background_thread.BackgroundThread(target=self._gen_analytics())
        t.start()
        # self._gen_analytics()

    def _get_next(self, lst, index):
        if index == len(lst):
            index = 0
        return lst[index], index + 1

    def _create_analytic(self, start=None, org=None, usr=None):
        concept_index = 0
        if usr:
            concepts = Concept.query(Concept.owner.IN([usr])).order(Concept.created_ts).fetch(limit=10)
        else:
            concepts = Concept.query().order(-Concept.created_ts).fetch(limit=10)
        an_action_count = {}
        for action in ANALYTIC_ACTIONS:
            an_action_count[action] = random.randint(1, 3)
        log.info('Generated Analytics:\n%s', an_action_count)
        log.info('User: %s', usr)
        log.info('Con len: %s', len(concepts))
        ana_obj = []
        log.info(len(concepts))
        for action, count in an_action_count.iteritems():
            for i in xrange(0, count):
                ana = Analytics.new(
                    ts=start + timedelta(
                        minutes=random.randint(0, 59),
                        seconds=random.randint(0, 59),
                        milliseconds=random.randint(0, 999)
                    ),
                    action=action,
                )
                if org:
                    ana.artifact_organization = org
                if usr:
                    ana.artifact_owners = [usr]
                if len(concepts) != 0:
                    con, concept_index = self._get_next(concepts, concept_index)
                    ana.artifact = con.key
                    ana.project = con.project
                ana_obj.append(ana)
        ndb.put_multi(ana_obj)
        return len(ana_obj)

    def _gen_analytics(self):
        log.info('Hourly Analytic Generator Stated')
        hours = int(self.request.get('hours', 1))
        for h in reversed(xrange(hours)):
            log.info('Generation for hour %s', h)
            start = datetime.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=h)
            log.info('Start Time: %s', start)
            ana_count = 0
            orgs = Organization.query()
            for org in orgs.iter(keys_only=True, limit=3):
                log.info('Generating Analytics for %s', org.id())
                users = User.query(User.organization == org).order(User.first_name)
                for usr in users.iter(keys_only=True, limit=3):
                    ana_count += self._create_analytic(start=start, org=org, usr=usr)
            ana_count += self._create_analytic(start=start)
            log.info('Hourly Analytic Generator Finished: %s Analytics created', ana_count)


class AnalyticsStatsHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write(Analytics.query().count())


class RunAnalyticsHandler(webapp2.RequestHandler):
    hour_count = 0
    now = None
    start_time = None
    end_time = None
    org_ana_stats = {}
    art_ana_stats = {}
    user_ana_stats = {}

    def _finallize_anastats(self, anastats):
        for anastat in anastats:
            self._finallize_anastat(anastat)
        return anastats

    def _finallize_anastat(self, anastat):
        # Clear this out just incase this got repeated
        anastat.total_consumption = 0
        anastat.total_production = 0
        anastat.total = 0

        for action in ANALYTIC_CONSUMPTION_ACTIONS:
            anastat.total_consumption += getattr(anastat, 'total_' + action)
            anastat.total += getattr(anastat, 'total_' + action)
        for action in ANALYTIC_PRODUCTION_ACTIONS:
            anastat.total_production += getattr(anastat, 'total_' + action)
            anastat.total += getattr(anastat, 'total_' + action)
        return anastat


class RunHourlyAnalyticsHandler(RunAnalyticsHandler):
    def get(self):
        log.info('Starting Hourly Analytic Thread')
        t = background_thread.BackgroundThread(target=self._process_hourly_analytics)
        t.start()
        # self._process_hourly_analytics()
        log.info('Thread Started')

    def _drop_lowest_art_stat(self, count):
        anastats = sorted(self.art_ana_stats.values(), key=lambda a: a.touch_count)[:count]
        self._finallize_anastats(anastats)
        ndb.put_multi(anastats)
        for anastat in anastats:
            del self.art_ana_stats[anastat.key.id()]

    def _drop_lowest_user_stat(self, count):
        anastats = sorted(self.user_ana_stats.values(), key=lambda a: a.touch_count)[:count]
        self._finallize_anastats(anastats)
        ndb.put_multi(anastats)
        for anastat in anastats:
            del self.user_ana_stats[anastat.key.id()]

    def _record_project_ana_action(self, ana):
        in_art_ana_state = True
        anastat = self.art_ana_stats.get(ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'), None)
        if not anastat:
            in_art_ana_state = False
            anastat = ConceptAnalyticsHourlyStat.get_by_id(ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
            if not anastat:
                anastat = ConceptAnalyticsHourlyStat.new(id=ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
                anastat.artifact = ana.artifact
                anastat.start_time = self.start_time
                anastat.end_time = self.end_time
                anastat.entity = ana.artifact
                if ana.artifact_organization:
                    anastat.entity_organization = ana.artifact_organization
        self._record_ana_action(anastat, ana)
        anastat.touch_count += 1
        if not in_art_ana_state:
            self.art_ana_stats[ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M')] = anastat
            art_list_len = len(self.art_ana_stats.keys())
            if art_list_len >= 1100:
                self._drop_lowest_art_stat(art_list_len - 1000)

    def _record_concept_ana_action(self, ana):
        in_art_ana_state = True
        anastat = self.art_ana_stats.get(ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'), None)
        if not anastat:
            in_art_ana_state = False
            anastat = ConceptAnalyticsHourlyStat.get_by_id(
                ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
            if not anastat:
                anastat = ConceptAnalyticsHourlyStat.new(
                    id=ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
                anastat.artifact = ana.artifact
                anastat.start_time = self.start_time
                anastat.end_time = self.end_time
                anastat.entity = ana.artifact
                if ana.artifact_organization:
                    anastat.entity_organization = ana.artifact_organization
        self._record_ana_action(anastat, ana)
        anastat.touch_count += 1
        if not in_art_ana_state:
            self.art_ana_stats[ana.artifact.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M')] = anastat
            art_list_len = len(self.art_ana_stats.keys())
            if art_list_len >= 1100:
                self._drop_lowest_art_stat(art_list_len - 1000)

    def _record_user_ana_action(self, ana):
        in_user_ana_state = True
        if not ana.analytic_session:
            return
        analytic_session = ana.analytic_session.get()
        if not analytic_session:
            return
        if analytic_session.user is None:
            return
        user_key = analytic_session.user
        anastat = self.user_ana_stats.get(user_key.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'), None)
        if not anastat:
            in_user_ana_state = False
            anastat = UserAnalyticsHourlyStat.get_by_id(user_key.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
            if not anastat:
                anastat = UserAnalyticsHourlyStat.new(id=user_key.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
                anastat.start_time = self.start_time
                anastat.end_time = self.end_time
                anastat.entity = user_key
                if ana.artifact_organization:
                    anastat.entity_organization = ana.artifact_organization
        self._record_ana_action(anastat, ana)
        anastat.touch_count += 1
        if not in_user_ana_state:
            self.user_ana_stats[user_key.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M')] = anastat
            user_list_len = len(self.user_ana_stats.keys())
            if user_list_len >= 110:
                self._drop_lowest_user_stat(user_list_len - 100)

    def _record_ana_action(self, anastat, ana):
        setattr(anastat, 'total_' + ana.action, getattr(anastat, 'total_' + ana.action) + 1)

    def _process_hour_block(self, anas):
        log.info('Processing %s anlytics', len(anas))
        logservice.flush()
        anastat = AnalyticsHourlyStat.new()
        anastat.start_time = self.start_time
        anastat.end_time = self.end_time
        for ana in anas:
            if ana.artifact_organization:
                if ana.artifact_organization.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M') in self.org_ana_stats:
                    self._record_ana_action(self.org_ana_stats[ana.artifact_organization.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M')], ana)
                else:
                    org_ana_stat = OrgAnalyticsHourlyStat.new(id=ana.artifact_organization.id() + '-' + self.end_time.strftime('%Y-%m-%d-%H-%M'))
                    org_ana_stat.start_time = self.start_time
                    org_ana_stat.end_time = self.end_time
                    org_ana_stat.entity = ana.artifact_organization
                    org_ana_stat.entity_organization = ana.artifact_organization
                    self.org_ana_stats[org_ana_stat.key.id()] = org_ana_stat
                    self._record_ana_action(org_ana_stat, ana)
            # if ana.artifact and ana.artifact.kind() == 'Project':
            #     self._record_project_ana_action(ana)
            if ana.artifact and ana.artifact.kind() == 'Concept':
                self._record_concept_ana_action(ana)
            self._record_user_ana_action(ana)
            self._record_ana_action(anastat, ana)
        anastats = [anastat] + self.art_ana_stats.values() + self.org_ana_stats.values() + self.user_ana_stats.values()
        self._finallize_anastats(anastats)
        ndb.put_multi(anastats)

    def _process_hourly_analytics(self):
        log.info('Hourly Analytics Processer Started')
        logservice.flush()
        last_analyticstat = AnalyticsHourlyStat.get_last()
        if not last_analyticstat:  # If no last analytic than this is the first time.
            log.info('Analytics have not been process yet, starting from the beginning')
            logservice.flush()
            first_ana = Analytics.get_first()
            last_ana = Analytics.get_last()
            if first_ana:
                self.now = datetime.now()
                self.start_time = first_ana.ts.replace(minute=0, second=0, microsecond=0)
                self.end_time = self.start_time + timedelta(hours=1)
                self.hour_count = 0
                while True:
                    log.info('Hour: %s Start Time: %s End Time: %s', self.hour_count, self.start_time, self.end_time)
                    logservice.flush()
                    anas = Analytics.get_time_frame(self.start_time, self.end_time)
                    self._process_hour_block(anas)
                    if last_ana in anas or self.end_time > self.now:
                        break
                    self.hour_count += 1
                    self.start_time = self.end_time
                    self.end_time = self.start_time + timedelta(hours=1)
            else:
                log.info('Found no Analytics to process')
        else:
            self.start_time = last_analyticstat.end_time
            self.end_time = self.start_time + timedelta(hours=1)
            while self.end_time < datetime.now():
                anas = Analytics.get_time_frame(self.start_time, self.end_time)
                self._process_hour_block(anas)
                self.start_time = self.end_time
                self.end_time = self.end_time + timedelta(hours=1)
        log.info('Hourly Analytics Processer Finished')


class RunDailyAnalyticsHandler(RunAnalyticsHandler):
    def get(self):
        t = background_thread.BackgroundThread(target=self._run)
        t.start()
        # self._run()

    def _run(self):
        log.info('Processing Aanlytic Daily Stats')
        logservice.flush()
        self._process_analytics(AnalyticsDailyStat)
        # log.info('Processing Project Aanlytic Daily Stats')
        # self._process_analytics(ProjectAnalyticsDailyStat)
        log.info('Processing Concept Aanlytic Daily Stats')
        logservice.flush()
        self._process_analytics(ConceptAnalyticsDailyStat)
        log.info('Processing Organization Aanlytic Daily Stats')
        logservice.flush()
        self._process_analytics(OrgAnalyticsDailyStat)
        log.info('Processing User Aanlytic Daily Stats')
        logservice.flush()
        self._process_analytics(UserAnalyticsDailyStat)
        log.info('Finished')
        logservice.flush()

    def _process_analytics(self, cls):
        try:
            c = 0
            now = datetime.now()
            # Check if this is the first time running
            last_ana = AnalyticsDailyStat.get_last()
            if last_ana is None:  # This is the first time running
                start_time = cls.__base__.get_first_ts()
                log.info('first: %s', start_time)
                if not start_time:  # Check if there are any Analytics Stats
                    log.warn('No Analytics Stats')
                    return  # There are no analyticstats to process
                start_time = cls.get_start_time(start_time=start_time)
                end_time = cls.get_end_time(start_time)
                parents = []
                log.debug('Loop Times s: %s e: %s', start_time, end_time)
                while end_time < now:
                    log.info('Loop Count %s: Start Time: %s End Time: %s', c, start_time, end_time)
                    c += 1
                    if hasattr(cls, 'entity'):
                        parents += self._process_time_frame_with_entity(start_time, end_time, cls)
                    else:
                        parents += self._process_time_frame(start_time, end_time, cls)
                    start_time = end_time
                    end_time = cls.get_end_time(start_time)
                    logservice.flush()
                self._finallize_anastats(parents)
                ndb.put_multi(parents)
            else:  # We have already processed ConceptAnalyticsDailyStat before
                start_time = last_ana.end_time
                end_time = cls.get_end_time(start_time)
                log.debug('Times s: %s e: %s', start_time, end_time)
                while end_time < datetime.now():
                    if hasattr(cls, 'entity'):
                        ndb.put_multi(self._finallize_anastats(self._process_time_frame_with_entity(start_time, end_time, cls)))
                    else:
                        ndb.put_multi(self._finallize_anastats(self._process_time_frame(start_time, end_time, cls)))
                    start_time = end_time
                    end_time = cls.get_end_time(start_time)
        except Exception:
            raise

    def _process_time_frame(self, start_time, end_time, cls):
        parents = []
        parent = cls.new()
        parent.start_time = start_time
        parent.end_time = end_time
        children = cls.__base__.query(ndb.AND(
            cls.__base__.start_time >= start_time,
            cls.__base__.start_time < end_time
        ))
        for child in children.iter():
            parent.total_con_exp += child.total_con_exp
            parent.total_con_col += child.total_con_col
            parent.total_con_new += child.total_con_new
            parent.total_con_mov += child.total_con_mov
            parent.total_con_cc_t += child.total_con_cc_t
            parent.total_con_cc_f += child.total_con_cc_f
            parent.total_con_del += child.total_con_del
            parent.total_con_phr_del += child.total_con_phr_del
            parent.total_con_phr_edit += child.total_con_phr_edit
            parent.total_con_phr_cha += child.total_con_phr_cha
            parent.total_con_phr_new += child.total_con_phr_new
            parent.total_con_soc_sha += child.total_con_soc_sha
            parent.total_con_lnk += child.total_con_lnk
            parent.total_con_attr_cha += child.total_con_attr_cha
            parent.total_con_perm += child.total_con_perm
            parent.total_con_med_vw += child.total_con_med_vw
            parent.total_pro_opn += child.total_pro_opn
            parent.total_pro_soc_sha += child.total_pro_soc_sha
            parent.total_pro_search += child.total_pro_search
            parent.total_pro_import += child.total_pro_import
            parent.total_consumption += child.total_consumption
            parent.total_production += child.total_production
            parent.total_doc_publish += child.total_doc_publish
            parent.total_sum_publish += child.total_sum_publish
            parent.total_pres_publish += child.total_pres_publish
            parent.total += child.total
        parents.append(parent)
        return parents

    def _process_time_frame_with_entity(self, start_time, end_time, cls):
        parents = []
        entities = cls.__base__.query(projection=['entity'], distinct=True).fetch()
        for entity in entities:
            parent = cls.new()
            parent.start_time = start_time
            parent.end_time = end_time
            parent.entity = entity.entity
            children = cls.__base__.query(ndb.AND(
                cls.__base__.entity == entity.entity,
                cls.__base__.start_time >= start_time,
                cls.__base__.start_time < end_time
            ))
            count = 0
            for child in children.iter():
                count += 1
                parent.total_con_nav += child.total_con_nav
                parent.total_con_exp += child.total_con_exp
                parent.total_con_col += child.total_con_col
                parent.total_con_new += child.total_con_new
                parent.total_con_mov += child.total_con_mov
                parent.total_con_cc_t += child.total_con_cc_t
                parent.total_con_cc_f += child.total_con_cc_f
                parent.total_con_del += child.total_con_del
                parent.total_con_phr_del += child.total_con_phr_del
                parent.total_con_phr_edit += child.total_con_phr_edit
                parent.total_con_phr_cha += child.total_con_phr_cha
                parent.total_con_phr_new += child.total_con_phr_new
                parent.total_con_soc_sha += child.total_con_soc_sha
                parent.total_con_lnk += child.total_con_lnk
                parent.total_con_attr_cha += child.total_con_attr_cha
                parent.total_con_perm += child.total_con_perm
                parent.total_con_med_vw += child.total_con_med_vw
                parent.total_pro_opn += child.total_pro_opn
                parent.total_pro_soc_sha += child.total_pro_soc_sha
                parent.total_pro_search += child.total_pro_search
                parent.total_pro_import += child.total_pro_import
                parent.total_consumption += child.total_consumption
                parent.total_production += child.total_production
                parent.total_doc_publish += child.total_doc_publish
                parent.total_sum_publish += child.total_sum_publish
                parent.total_pres_publish += child.total_pres_publish
                parent.total += child.total
                parent.entity_organization = child.entity_organization
            if count > 0:
                parents.append(parent)
        return parents


class RunWeeklyAnalyticsHanler(RunDailyAnalyticsHandler):
    def _run(self):
        log.info("Starting Weekly Analytics")
        self._process_analytics(AnalyticsWeeklyStat)
        # self._process_analytics(ProjectAnalyticsWeeklyStat)
        self._process_analytics(ConceptAnalyticsWeeklyStat)
        self._process_analytics(OrgAnalyticsWeeklyStat)
        self._process_analytics(UserAnalyticsWeeklyStat)
        log.info('Finished')


class RunMonthlyAnalyticsHanler(RunWeeklyAnalyticsHanler):
    def _run(self):
        pass
        # self._process_analytics(AnalyticsMonthlyStat)
        # self._process_analytics(ProjectAnalyticsMonthlyStat)
        # self._process_analytics(ConceptAnalyticsMonthlyStat)
        # self._process_analytics(OrgAnalyticsMonthlyStat)
        # self._process_analytics(UserAnalyticsMonthlyStat)


class FixAnalyticData(webapp2.RequestHandler):
    def get(self):
        l = []
        # q = Analytics.query()
        # for a in q.iter():
        #     if a.artifact:
        #         art = a.artifact.get()
        #         if art and art.organization:
        #             a.artifact_organization = art.organization
        #             l.append(a)
        #     if len(l) == 100:
        #         ndb.put_multi(l)
        #         l[:] = []
        # ndb.put_multi(l)

        l[:] = []
        stats = [
            ConceptAnalyticsHourlyStat,
            # UserAnalyticsHourlyStat,
        ]
        for s in stats:
            log.info('Fixing %s', s.__name__)
            q = s.query()
            for a in q.iter():
                if a.entity:
                    entity = a.entity.get()
                    if entity and entity.organization:
                        a.entity_organization = entity.organization
                        l.append(a)
                if len(l) == 100:
                    ndb.put_multi(l)
                    l[:] = []
        ndb.put_multi(l)

        # l[:] = []
        # log.info('Fixing %s', s.__name__)
        # q = OrgAnalyticsHourlyStat.query()
        # for a in q.iter():
        #     if a.entity:
        #         a.entity_organization = a.entity
        #         l.append(a)
        #     if len(l) == 100:
        #         ndb.put_multi(l)
        #         l[:] = []
        # ndb.put_multi(l)