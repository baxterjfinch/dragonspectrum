from google.appengine.ext import ndb

__all__ = [
    'AnalyticsSession',
]


class AnalyticsSession(ndb.Model):
    # session_token == self.key.id()
    ts = ndb.DateTimeProperty(auto_now_add=True)
    ip_addr = ndb.StringProperty()
    host = ndb.StringProperty()
    host_url = ndb.TextProperty()
    referer = ndb.TextProperty()
    app_code_name = ndb.StringProperty()
    app_name = ndb.StringProperty()
    app_version = ndb.StringProperty()
    cookie_enabled = ndb.BooleanProperty()
    do_not_track = ndb.StringProperty()
    geolocation = ndb.StringProperty()
    language = ndb.StringProperty()
    platform = ndb.StringProperty()
    plugins = ndb.StringProperty(repeated=True)
    product = ndb.StringProperty()
    user_agent = ndb.StringProperty()
    vender = ndb.StringProperty()
    project = ndb.KeyProperty()
    user = ndb.KeyProperty()
