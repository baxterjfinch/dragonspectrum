// Account URL Paths
var BASE_ADMIN_URL = '/admin/<organization>';
var ADMIN_URLS = {
    index: BASE_ADMIN_URL,
    users: BASE_ADMIN_URL + 'users/users/',
    groups: BASE_ADMIN_URL + 'users/groups/',
    organization: BASE_ADMIN_URL + 'organization/',
    analytics: BASE_ADMIN_URL + 'thinktank/analytics/',
    analytics_hourly: BASE_ADMIN_URL + 'thinktank/analytics/hourly/',
    analytics_daily: BASE_ADMIN_URL + 'thinktank/analytics/daily/',
    analytics_weekly: BASE_ADMIN_URL + 'thinktank/analytics/weekly/',
    analytics_monthly: BASE_ADMIN_URL + 'thinktank/analytics/monthly/',
    analytics_top_hourly: BASE_ADMIN_URL + 'thinktank/analytics/top/hourly/',
    analytics_top_daily: BASE_ADMIN_URL + 'thinktank/analytics/top/daily/',
    analytics_top_weekly: BASE_ADMIN_URL + 'thinktank/analytics/top/weekly/',
    analytics_top_monthly: BASE_ADMIN_URL + 'thinktank/analytics/top/monthly/'
};


function get_admin_url(key, org_id) {
    if (!ADMIN_URLS.hasOwnProperty(key))
        throw 'invalid url';
    var url = ADMIN_URLS[key];
    if (org_id)
        url = url.replace('<organization>', org_id + '/');
    else
        url = url.replace('<organization>', '');
    return url;
}