import logging

from cerberus import handlers as cerberus_handlers

from models.payment import payment_plan
from server import tt_logging
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder

log = logging.getLogger('tt')


class PaymentPlanHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, pay_plan=None):
        if not self.user.is_super_admin:
            lr = tt_logging.construct_log(msg_short='Non-Admin User Attemped to Access Payment Plans',
                                          log_type=tt_logging.SECURITY, request=self.request, request_user=self.user)
            log.warning(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.forbidden()
        if not pay_plan:
            self.write_json_response(payment_plan.get_payment_plan_list())
        else:
            raise NotImplementedError()