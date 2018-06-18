from google.appengine.ext import ndb


class Restore(ndb.Model):
    restore_status = ndb.StringProperty(required=True)