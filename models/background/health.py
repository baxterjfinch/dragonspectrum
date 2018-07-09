import time
from uuid import uuid1
from google.appengine.ext import ndb


def create_uuid():
    return uuid1().get_hex()


class Health(ndb.Model):
    # ts = ndb.DateTimeProperty(auto_now=True)
    ts = ndb.DateTimeProperty()
    ndb_write_latency = ndb.FloatProperty()
    ndb_read_latency = ndb.FloatProperty()
    ndb_delete_latency = ndb.FloatProperty()
    last_log_offset = ndb.GenericProperty()
    highest_latency = ndb.FloatProperty(default=0)
    avg_latency = ndb.FloatProperty()
    highest_cost = ndb.FloatProperty(default=0)
    avg_cost = ndb.FloatProperty()
    highest_pending_time = ndb.FloatProperty(default=0)
    avg_pending_time = ndb.FloatProperty()
    biggest_response_size = ndb.IntegerProperty(default=0)
    avg_response_size = ndb.IntegerProperty()
    status_count = ndb.JsonProperty()
    total_loading_request = ndb.IntegerProperty()
    highest_loading_latency = ndb.FloatProperty(default=0)
    avg_loading_latency = ndb.FloatProperty()
    log_count = ndb.IntegerProperty()
    memcache_stats = ndb.JsonProperty()

    @property
    def non_loading_log_count(self):
        return self.log_count - self.total_loading_request

    @staticmethod
    def new():
        return Health(id=create_uuid())

    def to_dict(self):
        include = [
            'ts',
            'ndb_write_latency',
            'ndb_read_latency',
            'ndb_delete_latency',
            'last_log_offset',
            'highest_latency',
            'avg_latency',
            'highest_cost',
            'avg_cost',
            'highest_pending_time',
            'avg_pending_time',
            'biggest_response_size',
            'avg_response_size',
            'status_count',
            'total_loading_request',
            'highest_loading_latency',
            'avg_loading_latency',
            'log_count',
            'memcache_stats',
        ]
        d = super(Health, self).to_dict(include=include)
        d['ts'] = time.mktime(d['ts'].timetuple())
        return d


class WriteTestLatency(ndb.Model):
    test_data = ndb.IntegerProperty(default=0)

    _use_cache = False
    _use_memcache = False

    @staticmethod
    def new(id_):
        return WriteTestLatency(id=id_)


class LogRecords(ndb.Model):
    app_id = ndb.StringProperty()
    api_mcycles = ndb.IntegerProperty()
    combined = ndb.StringProperty()
    cost = ndb.FloatProperty()
    end_time = ndb.FloatProperty()
    finished = ndb.BooleanProperty()
    host = ndb.StringProperty()
    http_version = ndb.StringProperty()
    instance_key = ndb.StringProperty()
    ip = ndb.StringProperty()
    latency = ndb.FloatProperty()
    mcycles = ndb.IntegerProperty()
    method = ndb.StringProperty()
    nickname = ndb.StringProperty()
    offset = ndb.GenericProperty()
    pending_time = ndb.FloatProperty()
    referrer = ndb.StringProperty()
    replica_index = ndb.IntegerProperty()
    request_id = ndb.GenericProperty()
    resource = ndb.StringProperty()
    response_size = ndb.IntegerProperty()
    start_time = ndb.IntegerProperty()
    status = ndb.IntegerProperty()
    task_name = ndb.StringProperty()
    task_queue_name = ndb.StringProperty()
    url_map_entry = ndb.StringProperty()
    user_agent = ndb.StringProperty()
    version_id = ndb.StringProperty()
    was_loading_request = ndb.BooleanProperty()

    @staticmethod
    def from_requestlog(rl):
        lr = LogRecords(id=create_uuid())
        if rl.app_id:
            lr.app_id = rl.app_id
        if rl.api_mcycles:
            lr.api_mcycles = rl.api_mcycles
        if rl.combined:
            lr.combined = rl.combined
        if rl.cost:
            lr.cost = rl.cost
        if rl.end_time:
            lr.end_time = rl.end_time
        if rl.finished:
            lr.finished = rl.finished
        if rl.host:
            lr.host = rl.host
        if rl.http_version:
            lr.http_version = rl.http_version
        if rl.instance_key:
            lr.instance_key = rl.instance_key
        if rl.ip:
            lr.ip = rl.ip
        if rl.latency:
            lr.latency = rl.latency
        if rl.mcycles:
            lr.mcycles = rl.mcycles
        if rl.method:
            lr.method = rl.method
        if rl.nickname:
            lr.nickname = rl.nickname
        if rl.offset:
            lr.offset = rl.offset
        if rl.pending_time:
            lr.pending_time = rl.pending_time
        if rl.referrer:
            lr.referrer = rl.referrer
        if rl.replica_index:
            lr.replica_index = rl.replica_index
        if rl.request_id:
            lr.request_id = rl.request_id
        if rl.resource:
            lr.resource = rl.resource
        if rl.response_size:
            lr.response_size = rl.response_size
        if rl.start_time:
            lr.start_time = rl.start_time
        if rl.status:
            lr.status = rl.status
        if rl.task_name:
            lr.task_name = rl.task_name
        if rl.task_queue_name:
            lr.task_queue_name = rl.task_queue_name
        if rl.url_map_entry:
            lr.url_map_entry = rl.url_map_entry
        if rl.user_agent:
            lr.user_agent = rl.user_agent
        if rl.version_id:
            lr.version_id = rl.version_id
        if rl.was_loading_request:
            lr.was_loading_request = rl.was_loading_request
        return lr
