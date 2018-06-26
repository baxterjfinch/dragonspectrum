from webapp2 import RequestHandler
from webapp2_extras.routes import RedirectRoute
import logging

from task import *
from publish import *
from migration import *
from models.background.account_notification import start_account_notification

from health import *
from analytics import *
from spectra import *

log = logging.getLogger(__file__)


class MainHandler(RequestHandler):
    def post(self):
        start_account_notification()


background_url_mapping = [
    RedirectRoute('/background/project/publish/<project:\w+>/<document:\w+>/<group:\w+>', handler=DocumentPublishHandler, name='publish_project'),
    RedirectRoute('/background/project/publish/<project:\w+>/<document:\w+>/<group:\w+>/', handler=DocumentPublishHandler, name='publish_project'),
    RedirectRoute('/background/summary/publish/<project:\w+>/<document:\w+>/<group:\w+>', handler=SummaryPublishHandler, name='summary_project'),
    RedirectRoute('/background/summary/publish/<project:\w+>/<document:\w+>/<group:\w+>/', handler=SummaryPublishHandler, name='summary_project'),
    RedirectRoute('/background/presentation/publish/<project:\w+>/<document:\w+>/<group:\w+>', handler=PresentationPublishHandler, name='presentation_project'),
    RedirectRoute('/background/presentation/publish/<project:\w+>/<document:\w+>/<group:\w+>/', handler=PresentationPublishHandler, name='presentation_project'),
    RedirectRoute('/background/migration/(.*)/?', handler=MigrationHandler, strict_slash=True, name='migration'),
    RedirectRoute('/background/search/reindex/?', handler=ReindexProjects, strict_slash=True, name='reindex'),
    RedirectRoute('/background/health/run/', handler=SiteHealthRunHandler, strict_slash=True, name='run_health'),
    # RedirectRoute('/background/analytics/gentest/hourly/', handler=GenHourlyTestDataHandler, strict_slash=True, name='gen_hourly_analytics'),
    # RedirectRoute('/background/analytics/gentest/', handler=GenTestDataHandler, strict_slash=True, name='gen_analytics'),
    RedirectRoute('/background/analytics/stats/', handler=AnalyticsStatsHandler, strict_slash=True, name='stats_analytics'),
    RedirectRoute('/background/analytics/run/hourly/', handler=RunHourlyAnalyticsHandler, strict_slash=True, name='run_hourly_analytics'),
    RedirectRoute('/background/analytics/run/daily/', handler=RunDailyAnalyticsHandler, strict_slash=True, name='run_daily_analytics'),
    RedirectRoute('/background/analytics/run/weekly/', handler=RunWeeklyAnalyticsHanler, strict_slash=True, name='run_weekly_analytics'),
    RedirectRoute('/background/analytics/run/monthly/', handler=RunMonthlyAnalyticsHanler, strict_slash=True, name='run_monthly_analytics'),
    RedirectRoute('/background/analytics/fix/', handler=FixAnalyticData, strict_slash=True, name='fix'),
    # RedirectRoute('/background/health/test/', handler=CreateTestData, strict_slash=True, name='test'),
    RedirectRoute('/background/', handler=MainHandler, strict_slash=True, name='background'),

    RedirectRoute('/background/spectra/run/daily/', handler=SpectraDailyHandler, strict_slash=True, name='run_daily_spectra'),
]