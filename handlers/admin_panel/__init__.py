from webapp2_extras.routes import RedirectRoute


BASE_URL = '/admin/'
BASE_URL_ORG = BASE_URL + '<organization>/'

# AdminPanel > Dashboard
from dashboard import *
admin_url_mapping = [
    RedirectRoute(BASE_URL + 'ajax/dashboard/', handler=AjaxDashboardHanlder, strict_slash=True, name='ajax_dashboard'),
    RedirectRoute(BASE_URL_ORG + 'ajax/dashboard/', handler=AjaxDashboardHanlder, strict_slash=True, name='ajax_dashboard_org'),
]

# AdminPanel > Organization
from organization import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG + 'ajax/organization/', handler=AjaxOrganizationHanlder, strict_slash=True, name='ajax_org_org'),
    RedirectRoute(BASE_URL + 'ajax/organization/', handler=AjaxOrganizationHanlder, strict_slash=True, name='ajax_org'),
    RedirectRoute(BASE_URL_ORG + 'organization/', handler=OrganizationHanlder, strict_slash=True, name='org_org'),
    RedirectRoute(BASE_URL + 'organization/', handler=OrganizationHanlder, strict_slash=True, name='org'),
]

# AdminPanel > Artifacts > Projects
from artifacts.projects import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG + 'ajax/artifacts/projects/', handler=AjaxArtifactsProjectsHanlder, strict_slash=True, name='ajax_art_pro_org'),
    RedirectRoute(BASE_URL + 'ajax/artifacts/projects/', handler=AjaxArtifactsProjectsHanlder, strict_slash=True, name='ajax_art_pro'),
]

# AdminPanel > Artifacts > Concepts
from artifacts.concepts import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG + 'ajax/artifacts/concepts/', handler=AjaxArtifactsConceptHanlder, strict_slash=True, name='ajax_art_con_org'),
    RedirectRoute(BASE_URL + 'ajax/artifacts/concepts/', handler=AjaxArtifactsConceptHanlder, strict_slash=True, name='ajax_con_pro'),
]

# AdminPanel > Users > Users
from users.users import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG + 'ajax/users/users/', handler=AjaxUsersHanlder, strict_slash=True, name='ajax_users_org'),
    RedirectRoute(BASE_URL + 'ajax/users/users/', handler=AjaxUsersHanlder, strict_slash=True, name='ajax_users'),
    RedirectRoute(BASE_URL_ORG + 'users/users/', handler=UsersHanlder, strict_slash=True,name='users_org'),
    RedirectRoute(BASE_URL + 'users/users/', handler=UsersHanlder, strict_slash=True, name='users'),
]

# AdminPanel > Users > Groups
from users.groups import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG + 'ajax/users/groups/', handler=AjaxGroupsHanlder, strict_slash=True, name='ajax_groups_org'),
    RedirectRoute(BASE_URL + 'ajax/users/groups/', handler=AjaxGroupsHanlder, strict_slash=True, name='ajax_groups'),
    RedirectRoute(BASE_URL_ORG + 'users/groups/', handler=GroupsHanlder, strict_slash=True, name='groups_org'),
    RedirectRoute(BASE_URL + 'users/groups/', handler=GroupsHanlder, strict_slash=True, name='groups'),
]

# AdminPanel > thinkTank > Datastore > Backup
from thinktank.datastore.backup import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/datastore/backup/', handler=AjaxThinkTankBackupHanlder, strict_slash=True, name='ajax_tt_ds_backup'),
    RedirectRoute(BASE_URL + 'thinktank/datastore/backup/', handler=AjaxThinkTankBackupHanlder, strict_slash=True, name='tt_ds_backup'),
]

# AdminPanel > thinkTank > Datastore > Index
from thinktank.datastore.index import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/datastore/index/', handler=AjaxThinkTankIndexHanlder, strict_slash=True, name='ajax_tt_ds_index'),
    RedirectRoute(BASE_URL + 'thinktank/datastore/index/', handler=AjaxThinkTankIndexHanlder, strict_slash=True, name='tt_ds_index'),
]

# AdminPanel > thinkTank > Datastore > Repair
from thinktank.datastore.repair import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/datastore/repair/', handler=AjaxThinkTankRepairHanlder, strict_slash=True, name='ajax_tt_ds_repair'),
    RedirectRoute(BASE_URL + 'thinktank/datastore/repair/', handler=AjaxThinkTankRepairHanlder, strict_slash=True, name='tt_ds_repair'),
]

# AdminPanel > thinkTank > Finance > Payment Plans
from thinktank.finance.payment_plans import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/finance/payment_plans/', handler=AjaxFinancePaymentPlansHanlder, strict_slash=True, name='ajax_tt_fn_payment_plan'),
    RedirectRoute(BASE_URL + 'thinktank/finance/payment_plans/', handler=AjaxFinancePaymentPlansHanlder, strict_slash=True, name='tt_fn_payment_plan'),
]

# AdminPanel > thinkTank > Finance > Coupons
from thinktank.finance.coupons import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/finance/coupons/', handler=AjaxFinanceCouponsHanlder, strict_slash=True, name='ajax_tt_fn_coupons'),
    RedirectRoute(BASE_URL + 'thinktank/finance/coupons/', handler=AjaxFinanceCouponsHanlder, strict_slash=True, name='tt_fn_coupons'),
]

# AdminPanel > thinkTank > Logging > App Engine Logs
from thinktank.tlogging.app_engine import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/logging/app_engine_logs/', handler=AjaxLoggingAppEngineLogsHanlder, strict_slash=True, name='ajax_tt_l_app_engine'),
    RedirectRoute(BASE_URL + 'thinktank/finance/app_engine_logs/', handler=AjaxLoggingAppEngineLogsHanlder, strict_slash=True, name='tt_l_app_engine'),
]

# AdminPanel > thinkTank > Logging > Server Logs
from thinktank.tlogging.app_engine import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/logging/server_logs/', handler=AjaxLoggingAppEngineLogsHanlder, strict_slash=True, name='ajax_tt_l_server'),
    RedirectRoute(BASE_URL + 'thinktank/finance/server_logs/', handler=AjaxLoggingAppEngineLogsHanlder, strict_slash=True, name='tt_l_server'),
]

# AdminPanel > thinkTank > Logging > Settings
from thinktank.tlogging.settings import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/logging/settings/', handler=AjaxLoggingSettingHanlder, strict_slash=True, name='ajax_tt_l_settings'),
    RedirectRoute(BASE_URL + 'thinktank/finance/settings/', handler=AjaxLoggingSettingHanlder, strict_slash=True, name='tt_l_settings'),
]

# AdminPanel > thinkTank > Analytics
from thinktank.analytics import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG + 'ajax/thinktank/analytics/', handler=AjaxThinkTankAnalyticsHanlder, strict_slash=True, name='ajax_tt_analytics_org'),
    RedirectRoute(BASE_URL + 'ajax/thinktank/analytics/', handler=AjaxThinkTankAnalyticsHanlder, strict_slash=True, name='ajax_tt_analytics'),
    # RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/hourly/', handler=ThinkTankAnalyticsHourlyHanlder, strict_slash=True, name='tt_analytics_hourly_org'),
    # RedirectRoute(BASE_URL + 'thinktank/analytics/hourly/', handler=ThinkTankAnalyticsHourlyHanlder, strict_slash=True, name='tt_analytics_hourly'),
    RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/daily/', handler=ThinkTankAnalyticsDailyHanlder, strict_slash=True, name='tt_analytics_daily_org'),
    RedirectRoute(BASE_URL + 'thinktank/analytics/daily/', handler=ThinkTankAnalyticsDailyHanlder, strict_slash=True, name='tt_analytics_daily'),
    RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/weekly/', handler=ThinkTankAnalyticsWeeklyHanlder, strict_slash=True, name='tt_analytics_weekly_org'),
    RedirectRoute(BASE_URL + 'thinktank/analytics/weekly/', handler=ThinkTankAnalyticsWeeklyHanlder, strict_slash=True, name='tt_analytics_weekly'),
    RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/monthly/', handler=ThinkTankAnalyticsMonthlyHanlder, strict_slash=True, name='tt_analytics_monthly_org'),
    RedirectRoute(BASE_URL + 'thinktank/analytics/monthly/', handler=ThinkTankAnalyticsMonthlyHanlder, strict_slash=True, name='tt_analytics_monthly'),

    # Top
    # RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/top/hourly/', handler=ThinkTankAnalyticsTopHourlyHanlder, strict_slash=True, name='tt_analytics_hourly_org'),
    # RedirectRoute(BASE_URL + 'thinktank/analytics//top/hourly/', handler=ThinkTankAnalyticsTopHourlyHanlder, strict_slash=True, name='tt_analytics_hourly'),
    RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/top/daily/', handler=ThinkTankAnalyticsTopDailyHanlder, strict_slash=True, name='tt_analytics_daily_org'),
    RedirectRoute(BASE_URL + 'thinktank/analytics/top/daily/', handler=ThinkTankAnalyticsTopDailyHanlder, strict_slash=True, name='tt_analytics_daily'),
    RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/top/weekly/', handler=ThinkTankAnalyticsTopWeeklyHanlder, strict_slash=True, name='tt_analytics_weekly_org'),
    RedirectRoute(BASE_URL + 'thinktank/analytics/top/weekly/', handler=ThinkTankAnalyticsTopWeeklyHanlder, strict_slash=True, name='tt_analytics_weekly'),
    RedirectRoute(BASE_URL_ORG + 'thinktank/analytics/top/monthly/', handler=ThinkTankAnalyticsTopMonthlyHanlder, strict_slash=True, name='tt_analytics_monthly_org'),
    RedirectRoute(BASE_URL + 'thinktank/analytics/top/monthly/', handler=ThinkTankAnalyticsTopMonthlyHanlder, strict_slash=True, name='tt_analytics_monthly'),
]

# AdminPanel > thinkTank > Health
from thinktank.health import *
admin_url_mapping += [
    RedirectRoute(BASE_URL + 'ajax/thinktank/health/', handler=AjaxThinkTankHealthHanlder, strict_slash=True, name='ajax_tt_health'),
    RedirectRoute(BASE_URL + 'thinktank/health/<hours>/', handler=ThinkTankHealthHanlder, strict_slash=True, name='tt_health'),
]

# AdminPanel
from admin_panel import *
admin_url_mapping += [
    RedirectRoute(BASE_URL_ORG, handler=AdminHandler, strict_slash=True, name='index_org'),
    RedirectRoute(BASE_URL, handler=AdminHandler, strict_slash=True, name='index'),
]