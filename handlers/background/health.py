import time
import json
import webapp2
import logging
from datetime import datetime, timedelta

from google.appengine.api import memcache, background_thread, logservice

from models.background.health import *
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException

log = logging.getLogger('tt')

__all__ = [
    'SiteHealthRunHandler',
    'CreateTestData',
]


class SiteHealthRunHandler(webapp2.RequestHandler):
    health = None

    def get(self):
        t = background_thread.BackgroundThread(target=self._start_health_monitoring)
        t.start()

    def _start_health_monitoring(self):
        self._purge_old_logs()
        self.health = Health.new()
        keys = self._get_datastore_write_latency()
        self._get_datastore_read_latency(keys)
        self._get_datastore_delete_latency(keys)
        self._process_logs()
        self._get_memcache_stats()
        self.health.put()

    def _purge_old_logs(self):
        cut_off_date = datetime.now() - timedelta(days=90)
        ndb.delete_multi(Health.query(Health.ts < cut_off_date).fetch(keys_only=True))
        ndb.delete_multi(LogRecords.query(Health.ts < cut_off_date).fetch(keys_only=True))

    def _get_datastore_write_latency(self):
        keys = []
        for i in xrange(100):
            keys = WriteTestLatency.new(str(i))
        total = 0
        for e in keys:
            start = time.clock()
            e.put()
            end = time.clock()
            total += end - start
        self.health.write_latency = total / len(keys)
        return keys

    def _get_datastore_read_latency(self, keys):
        total = 0
        for k in keys:
            start = time.clock()
            k.get()
            end = time.clock()
            total += end - start
        self.health.read_latency = total / len(keys)

    def _get_datastore_delete_latency(self, keys):
        total = 0
        for k in keys:
            start = time.clock()
            k.delete()
            end = time.clock()
            total += end - start
        self.health.delete_latency = total / len(keys)

    def _get_load_log_offset(self):
        results = Health.query().order(Health.ts).fetch(1)
        if len(results) == 0:
            return None
        return results[0].last_log_offset

    def _process_logs(self):
        total_latency = 0
        total_cost = 0
        total_pending_time = 0
        total_response_size = 0
        total_loading_request_latency = 0

        offset = self._get_load_log_offset()
        end_time = time.time()
        if not offset:
            start_time = time.time() - 60 * 60
            rls = logservice.fetch(end_time=end_time, start_time=start_time,
                                   minimum_log_level=logservice.LOG_LEVEL_DEBUG)
        else:
            rls = logservice.fetch(end_time=end_time, offset=offset,
                                   minimum_log_level=logservice.LOG_LEVEL_DEBUG)
        self.health.log_count = len(rls)
        for rl in rls:
            self.health.last_log_offset = rl.offset

            if not rl.was_loading_request:
                total_latency += rl.latency
                if rl.latency > self.health.highest_latency:
                    self.health.highest_latency = rl.latency
            else:
                total_loading_request_latency += rl.latency
                self.health.total_loading_request += 1
                if rl.latency > self.health.highest_loading_latency:
                    self.health.highest_loading_latency = rl.latency
            total_cost += rl.cost
            if rl.cost > self.health.highest_cost:
                self.health.highest_cost = rl.cost
            total_pending_time += rl.pending_time
            if rl.pending_time > self.health.highest_pending_time:
                self.health.highest_pending_time = rl.pending_time
            total_response_size += rl.response_size
            if rl.response_size > self.health.biggest_response_size:
                self.health.biggest_response_size = rl.response_size
            if rl.status in self.health.status_count:
                self.health.status_count[rl.status] += 1
            else:
                self.health.status_count[rl.status] = 1

            lr = LogRecords.from_requestlog(rl)
            lr.put()

        self.health.avg_latency = total_latency / (self.health.log_count - self.health.total_loading_request)
        self.health.avg_cost = total_cost / self.health.log_count
        self.health.avg_pending_time = total_pending_time / self.health.log_count
        self.health.avg_response_size = total_response_size / self.health.log_count
        self.health.avg_loading_latency = total_loading_request_latency / self.health.total_loading_request

    def _get_memcache_stats(self):
        self.health.memcache_stats = memcache.get_stats()


class CreateTestData(webapp2.RequestHandler):
    def get(self):
        import random
        for i in xrange(720):
            h = Health.new()
            h.ts = datetime.now() - timedelta(hours=i)
            h.ndb_write_latency = random.uniform(0.4, 0.6)
            h.ndb_read_latency = random.uniform(0.01, 0.2)
            h.ndb_delete_latency = random.uniform(0.2, 0.4)
            h.last_log_offset = 10
            h.highest_latency = random.uniform(0.2, 0.5)
            h.avg_latency = random.uniform(0.2, 2)
            h.highest_cost = random.uniform(0.008, 0.009)
            h.avg_cost = random.uniform(0.0002, 0.008)
            h.highest_pending_time = random.uniform(0.8, 0.9)
            h.avg_pending_time = random.uniform(0.02, 0.8)
            h.biggest_response_size = random.randint(500, 600)
            h.avg_response_size = random.randint(50, 500)
            # h.status_cout = ndb.JsonProperty()
            h.total_loading_request = random.randint(3, 20)
            h.highest_loading_latency = random.uniform(8.0, 8.5)
            h.avg_loading_latency = random.uniform(2.0, 8.0)
            h.log_count = random.randint(10000, 12000)
            h.memcache_stats = memcache.get_stats()
            h.put()
        self.response.write('done')