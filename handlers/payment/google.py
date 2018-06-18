import webapp2
import logging

from server import tt_logging
from models.payment import google_merchant
from server.httperrorexception import HttpErrorException

log = logging.getLogger('tt')


class GoogleWalletCallback(webapp2.RequestHandler):
    auth_required = False

    def post(self, secret_key=None):
        if self.request.get('jwt') == '':
            lr = tt_logging.construct_log(msg_short='[Google Postback] No JWT Given',
                                          log_type=tt_logging.PAYMENT, request=self.request)
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.bad_request('no jwt token given')
        try:
            self.response.write(google_merchant.handle_google_callback(self.request.get('jwt')))
        except google_merchant.InvalidSellerDataException as e:
            lr = tt_logging.construct_log(msg_short='[Google Postback] Invalied Seller Data',
                                          msg=e.message, log_type=tt_logging.PAYMENT, request=self.request)
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.bad_request(e.message)
        except google_merchant.InvalidOrderIdException as e:
            lr = tt_logging.construct_log(msg_short='[Google Postback] Invalide Order Id',
                                          msg=e.message, log_type=tt_logging.PAYMENT, request=self.request)
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.bad_request(e.message)
        except Exception as e:
            lr = tt_logging.construct_log(msg_short='[Google Postback] Unknow Error',
                                          msg=e.message, log_type=tt_logging.PAYMENT, request=self.request)
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.bad_request(e.message)
