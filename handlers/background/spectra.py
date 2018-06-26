import webapp2
import logging
from google.appengine.ext import ndb
from google.appengine.api import background_thread

from models.account import User

log = logging.getLogger('tt')


class SpectraDailyHandler(webapp2.RequestHandler):
    def get(self):
        log.info('Starting Spectra Daily Points Distribution')
        t = background_thread.BackgroundThread(target=self._distribute_spectra_points())
        t.start()
        # self._gen_analytics()

    def _distribute_spectra_points(self):
        q = User.query()
        users = []
        for user in q.iter():
            print user.username, user.spectra_count

            user.spectra_count += 100
            users.append(user)

            if len(users) > 1000:
                ndb.put_multi(users)
                users = []

        ndb.put_multi(users)
