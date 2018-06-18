import webapp2
import logging

from server import tt_logging

log = logging.getLogger('tt')


class CoinBaseCallback(webapp2.RequestHandler):
    auth_required = False

    def post(self, secret_key=None):
        lr = tt_logging.construct_log(msg_short='[Coinbase Callback] This is not implemented yet???',
                                      msg='We received a post to coinbase callback and coinbase has not been '
                                          'implemented yet', log_type=tt_logging.PAYMENT, request=self.request)
        log.error(lr['dict_msg']['msg'], extra=lr)