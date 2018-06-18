from google.appengine.ext import ndb


class Importer(ndb.Model):
    importer_status = ndb.StringProperty()
    importer_reason = ndb.StringProperty()
