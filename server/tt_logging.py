import setup_paths
setup_paths.fix_path()
import os
import server
import logging
import datetime
import smtplib
from google.appengine.api import memcache
from server import config
from logging.handlers import SMTPHandler
from google.appengine.ext import ndb
from email.mime.text import MIMEText
from jinja2 import Environment

MSG_SHORT_LEN = 50

# Log types
DEFAULT = '1'
USER = '2'
ADMIN = '3'
PAYMENT = '4'
SECURITY = '5'
BACKEND = '6'
REMOTE_API = '7'
REGISTRATION = '8'
EXCEPTION = '9'
HTTPBADREQUEST = '400'
HTTPUNAUTHORIZED = '401'
HTTPFORBIDDEN = '403'
HTTPNOTFOUND = '404'
HTTPMETHODNOTALLOWED = '405'
HTTPREQUESTTIMEOUT = '408'

log_types = [  # Convenient list
    DEFAULT,
    USER,
    ADMIN,
    PAYMENT,
    SECURITY,
    BACKEND,
    REMOTE_API,
    REGISTRATION,
    EXCEPTION,
    HTTPBADREQUEST,
    HTTPUNAUTHORIZED,
    HTTPFORBIDDEN,
    HTTPNOTFOUND,
    HTTPMETHODNOTALLOWED,
    HTTPREQUESTTIMEOUT,
]


def stringify_request(request):
    try:
        l = ['%s %s' % (request.method, request.path_qs)]
        if request.remote_addr:
            l.append('IP Address: %s' % request.remote_addr)
        if request.headers:
            for header in request.headers.keys():
                l.append('%s: %s' % (header, request.headers.get(header, '')))
        if request.cookies:
            l.append('Cookie: ' + '; '.join(['%s=%s' % (k, v) for k, v in request.cookies.items()]))
        if request.body:
            l += ['\n', request.body]
        return '\n'.join(l) + ''
    except:
        return ''  # Don't want to fail here


class LoggingConfig(ndb.Model):
    smtphandler_default_log_level = ndb.IntegerProperty(default=config.smtphandler_default_log_level)
    smtphandler_default_to_email_addr = ndb.StringProperty(default=config.smtphandler_default_to_email_addr)
    smtphandler_user_log_level = ndb.IntegerProperty(default=config.smtphandler_user_log_level)
    smtphandler_user_to_email_addr = ndb.StringProperty(default=config.smtphandler_user_to_email_addr)
    smtphandler_admin_log_level = ndb.IntegerProperty(default=config.smtphandler_admin_log_level)
    smtphandler_admin_to_email_addr = ndb.StringProperty(default=config.smtphandler_admin_to_email_addr)
    smtphandler_payment_log_level = ndb.IntegerProperty(default=config.smtphandler_payment_log_level)
    smtphandler_payment_to_email_addr = ndb.StringProperty(default=config.smtphandler_payment_to_email_addr)
    smtphandler_security_log_level = ndb.IntegerProperty(default=config.smtphandler_security_log_level)
    smtphandler_secuirty_to_email_addr = ndb.StringProperty(default=config.smtphandler_security_to_email_addr)
    smtphandler_backend_log_level = ndb.IntegerProperty(default=config.smtphandler_backend_log_level)
    smtphandler_backend_to_email_addr = ndb.StringProperty(default=config.smtphandler_backend_to_email_addr)
    smtphandler_remote_api_log_level = ndb.IntegerProperty(default=config.smtphandler_remote_api_log_level)
    smtphandler_remote_api_to_email_addr = ndb.StringProperty(default=config.smtphandler_remote_api_to_email_addr)
    smtphandler_registration_log_level = ndb.IntegerProperty(default=config.smtphandler_registration_log_level)
    smtphandler_registration_to_email_addr = ndb.StringProperty(default=config.smtphandler_registration_to_email_addr)
    smtphandler_exception_log_level = ndb.IntegerProperty(default=config.smtphandler_exception_log_level)
    smtphandler_exception_to_email_addr = ndb.StringProperty(default=config.smtphandler_exception_to_email_addr)
    smtphandler_httpbadrequest_log_level = ndb.IntegerProperty(default=config.smtphandler_httpbadrequest_log_level)
    smtphandler_httpbadrequest_to_email_addr = ndb.StringProperty(default=config.smtphandler_httpbadrequest_to_email_addr)
    smtphandler_httpunauthorized_log_level = ndb.IntegerProperty(default=config.smtphandler_httpunauthorized_log_level)
    smtphandler_httpunauthorized_to_email_addr = ndb.StringProperty(default=config.smtphandler_httpunauthorized_to_email_addr)
    smtphandler_httpforbidden_log_level = ndb.IntegerProperty(default=config.smtphandler_httpforbidden_log_level)
    smtphandler_httpforbidden_to_email_addr = ndb.StringProperty(default=config.smtphandler_httpforbidden_to_email_addr)
    smtphandler_httpnotfound_log_level = ndb.IntegerProperty(default=config.smtphandler_httpnotfound_log_level)
    smtphandler_httpnotfound_to_email_addr = ndb.StringProperty(default=config.smtphandler_httpnotfound_to_email_addr)
    smtphandler_httpmethodnotallowed_log_level = ndb.IntegerProperty(default=config.smtphandler_httpmethodnotallowed_log_level)
    smtphandler_httpmethodnotallowed_to_email_addr = ndb.StringProperty(default=config.smtphandler_httpmethodnotallowed_to_email_addr)
    smtphandler_httprequesttimeout_log_level = ndb.IntegerProperty(default=config.smtphandler_httprequesttimeout_log_level)
    smtphandler_httprequesttimeout_to_email_addr = ndb.StringProperty(default=config.smtphandler_httprequesttimeout_to_email_addr)
    logger_email_template = ndb.TextProperty(default=config.logger_email_template)
    datestore_log_level = ndb.IntegerProperty(default=config.datestore_log_level)
    smtp_log_subject_len = ndb.IntegerProperty(default=config.smtp_log_subject_len)

    @staticmethod
    def new():
        lg = LoggingConfig(id=config.logging_config_id)
        lg.put()
        return lg

    @staticmethod
    def get_configs():
        lc = LoggingConfig.get_by_id(config.logging_config_id)
        if not lc:
            return LoggingConfig.new()
        return lc


class TTLogRecord(ndb.Model):
    datetime = ndb.DateTimeProperty(auto_now=True)
    log_level = ndb.IntegerProperty(required=True)
    log_level_name = ndb.StringProperty(required=True)
    logger_name = ndb.StringProperty(required=True)
    logger_pathname = ndb.TextProperty(required=True)
    logger_lineno = ndb.IntegerProperty(required=True)
    logger_func = ndb.StringProperty(required=True)
    log_type = ndb.StringProperty(choices=log_types)
    msg_short = ndb.StringProperty(required=True)
    msg = ndb.TextProperty(required=True)
    request_user = ndb.KeyProperty(kind='User')
    affected_user = ndb.KeyProperty(kind='User')
    artifact = ndb.KeyProperty()
    organization = ndb.KeyProperty()
    request = ndb.TextProperty()
    client_log = ndb.BooleanProperty(default=False)


class DatastoreLogHandler(logging.Handler):
    def emit(self, record):
        try:
            rc_msg = record.getMessage()
            msg = record.__dict__.get('dict_msg', {
                'msg_short': rc_msg[:MSG_SHORT_LEN] + '...' if len(rc_msg) > MSG_SHORT_LEN else rc_msg,
                'msg': record.getMessage()
            })
            request_user = record.__dict__.get('request_user', None)
            affected_user = record.__dict__.get('affected_user', None)
            artifact = record.__dict__.get('artifact', None)
            log_type = record.__dict__.get('log_type', DEFAULT)
            request = record.__dict__.get('request', None)
            org = record.__dict__.get('org', None)
            client_log = record.__dict__.get('client_log', False)
            if not org:
                org = record.__dict__.get('organization', None)
            lg = TTLogRecord(
                id=server.create_uuid(),
                log_level=record.levelno,
                log_level_name=record.levelname,
                logger_name=record.name,
                logger_pathname=record.pathname,
                logger_lineno=record.lineno,
                logger_func=record.funcName,
                log_type=log_type,
                msg_short=msg.get('msg_short', ''),
                msg=msg.get('msg', ''),
                client_log=client_log,
            )
            if artifact:
                if isinstance(artifact, ndb.Model):
                    artifact = artifact.key
                lg.artifact = artifact
            if org:
                if isinstance(org, ndb.Model):
                    org = org.key
                lg.organization = org
            if request_user:
                lg.request_user = request_user.key
            if affected_user:
                lg.affected_user = affected_user.key
            if request:
                lg.request = stringify_request(request) if request else ''

            lg.put()
        except:
            return


class TTSMTPHandler(SMTPHandler):
    def __init__(self):
        logging.Handler.__init__(self)

    def emit(self, record):
        try:
            lc = LoggingConfig.get_configs()
            gc = server.GlobalConfig.get_configs()
            log_type = record.__dict__.get('log_type', DEFAULT)

            # TODO: This needs to be a dict lookup instead of lots of if/else
            if not lc:  # Datastore must not be init yet.
                self.handleError(record)
                return
            elif log_type == USER:
                if record.levelno < lc.smtphandler_user_log_level:
                    return
                to_addr = lc.smtphandler_user_to_email_addr
            elif log_type == ADMIN:
                if record.levelno < lc.smtphandler_admin_log_level:
                    return
                to_addr = lc.smtphandler_admin_to_email_addr
            elif log_type == PAYMENT:
                if record.levelno < lc.smtphandler_payment_log_level:
                    return
                to_addr = lc.smtphandler_payment_to_email_addr
            elif log_type == SECURITY:
                if record.levelno < lc.smtphandler_security_log_level:
                    return
                to_addr = lc.smtphandler_secuirty_to_email_addr
            elif log_type == BACKEND:
                if record.levelno < lc.smtphandler_backend_log_level:
                    return
                to_addr = lc.smtphandler_backend_to_email_addr
            elif log_type == REMOTE_API:
                if record.levelno < lc.smtphandler_remote_api_log_level:
                    return
                to_addr = lc.smtphandler_remote_api_to_email_addr
            elif log_type == REGISTRATION:
                if record.levelno < lc.smtphandler_registration_log_level:
                    return
                to_addr = lc.smtphandler_registration_to_email_addr
            elif log_type == EXCEPTION:
                if record.levelno < lc.smtphandler_exception_log_level:
                    return
                to_addr = lc.smtphandler_exception_to_email_addr
            elif log_type == HTTPBADREQUEST:
                if record.levelno < lc.smtphandler_httpbadrequest_log_level:
                    return
                to_addr = lc.smtphandler_httpbadrequest_to_email_addr
            elif log_type == HTTPUNAUTHORIZED:
                if record.levelno < lc.smtphandler_httpunauthorized_log_level:
                    return
                to_addr = lc.smtphandler_httpunauthorized_to_email_addr
            elif log_type == HTTPFORBIDDEN:
                if record.levelno < lc.smtphandler_httpforbidden_log_level:
                    return
                to_addr = lc.smtphandler_httpforbidden_to_email_addr
            elif log_type == HTTPNOTFOUND:
                if record.levelno < lc.smtphandler_httpnotfound_log_level:
                    return
                to_addr = lc.smtphandler_httpnotfound_to_email_addr
            elif log_type == HTTPMETHODNOTALLOWED:
                if record.levelno < lc.smtphandler_httpmethodnotallowed_log_level:
                    return
                to_addr = lc.smtphandler_httpmethodnotallowed_to_email_addr
            elif log_type == HTTPREQUESTTIMEOUT:
                if record.levelno < lc.smtphandler_httprequesttimeout_log_level:
                    return
                to_addr = lc.smtphandler_httprequesttimeout_to_email_addr
            else:
                if record.levelno < lc.smtphandler_default_log_level:
                    return
                to_addr = lc.smtphandler_default_to_email_addr
            rc_msg = record.getMessage()
            msg = record.__dict__.get('dict_msg', {
                'msg_short': rc_msg[:MSG_SHORT_LEN] + '...' if len(rc_msg) > MSG_SHORT_LEN else rc_msg,
                'msg': record.getMessage()
            })
            request_user = record.__dict__.get('request_user', None)
            affected_user = record.__dict__.get('affected_user', None)
            artifact = record.__dict__.get('artifact', None)
            org = record.__dict__.get('org', None)
            request = record.__dict__.get('request', None)
            if record.__dict__.get('client_log', False):
                log_from = '[Client Log][User: %s]' % request_user.key.id()
            else:
                log_from = '[Server Log]'
            if not org:
                org = record.__dict__.get('organization', None)
            if artifact:
                if isinstance(artifact, ndb.Model):
                    artifact = artifact.key
            if org:
                if isinstance(org, ndb.Model):
                    org = org.key
            if request_user:
                if isinstance(request_user, ndb.Model):
                    user = request_user.key
            if affected_user:
                if isinstance(affected_user, ndb.Model):
                    user = affected_user.key
            env = Environment()
            temp_var = {
                'msg_short': msg.get('msg_short', 'thinktank log record'),
                'datetime': str(datetime.datetime.now()),
                'log_level': record.levelname,
                'logger_name': record.name,
                'logger_pathname': record.pathname,
                'logger_func': record.funcName,
                'log_type': log_type,
                'org': org.id() if org else 'None',
                'request_user': request_user.key.id() if request_user else 'None',
                'affected_user': affected_user.key.id() if affected_user else 'None',
                'artifact': artifact.id() if artifact else 'None',
                'message': msg.get('msg').replace('\n', '<br>'),
                'request': stringify_request(request) if request else '',
            }
            email_temp = env.from_string(source=lc.logger_email_template)
            emsg = MIMEText(email_temp.render(temp_var), 'html')
            emsg['Subject'] = log_from + '[' + record.levelname + '] ' + \
                              msg.get('msg_short', 'thinktank log record')
            emsg['From'] = gc.smtp_username
            emsg['To'] = to_addr

            if os.environ.get('SERVER_SOFTWARE', '').startswith('Development'):
                print ('This is the development server: Can not send emails')
                print ('Email message:\n' + emsg.as_string())
                return
            svr = smtplib.SMTP(gc.smtp_server_address + ':' + gc.smtp_server_port)
            svr.starttls()
            svr.login(gc.smtp_username, gc.smtp_password)
            svr.sendmail(gc.smtp_username, to_addr, emsg.as_string())
            svr.quit()
        except:
            return


def construct_log(msg_short='', msg=None, log_type=DEFAULT, request_user=None, client_log=False,
                  affected_user=None, user=None, org=None, artifact=None, request=None):
    return {
        'dict_msg': {
            'msg_short': msg_short,
            'msg': msg if msg else msg_short,
        },
        'log_type': log_type,
        'request_user': request_user if request_user else user,
        'affected_user': affected_user if affected_user else user,
        'org': org if org else (user.organization if user and user.organization else None),
        'artifact': artifact,
        'request': request if request else '',
        'client_log': client_log,
    }