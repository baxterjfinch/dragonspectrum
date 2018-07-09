import logging

from cerberus import handlers as cerberus_handlers

from server import tt_logging
from server import GlobalConfig
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder

__all__ = [
    'MonitoringHanlder',
]

log = logging.getLogger('tt')


class MonitoringHanlder(AuthorizationRequestHanlder):
    auth_required = False

    # TODO: This is a security risk! If there is required we will need to redesign it to be safe
    # @cerberus_handlers.exception_callback
    # def get(self, secret=None):
    #     if secret != '296e477ba0f4b3b7d099c7ea60d35f2b5dd9905cf03421223dc06b8fce8c2c96':
    #         lr = tt_logging.construct_log(msg_short='Invalid Secret Key',
    #                                       msg='Recieved invalid secret key for from site monitor: %s\n'
    #                                           'respondeing with 404 NOT FOUND for security reasons' % secret,
    #                                       log_type=tt_logging.SECURITY, request=self.request)
    #         log.error(lr['dict_msg']['msg'], extra=lr)
    #         raise HttpErrorException.not_found('')
    #     import time
    #
    #     start = time.time()
    #     config = GlobalConfig.get_configs()
    #     end = time.time()
    #     if not config:
    #         lr = tt_logging.construct_log(msg_short='Could Not Get Global Configurations',
    #                                       log_type=tt_logging.EXCEPTION, request=self.request)
    #         log.error(lr['dict_msg']['msg'], extra=lr)
    #         raise HttpErrorException.bad_request('server failed to get config')
    #     self.write_json_response({'test': 'successful', 'datastore_read_time': end - start})