import logging

from cerberus import handlers as cerberus_handlers

import server
from models import payment
from server import tt_logging
from server import GlobalConfig
from models.payment import coupon
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

log = logging.getLogger('tt')


class CheckoutHandler(AuthorizationRequestHanlder):
    enable_unverified_account = False
    enable_disabled_account = False

    @cerberus_handlers.exception_callback
    def get(self, username=None):
        try:
            checkout_info = payment.get_checkout_data(self.user, GlobalConfig.get_configs())
            if checkout_info == 'free':
                self.redirect('/', abort=True)
        except payment.coupon.InActiveCouponExpcetion as e:
            lr = tt_logging.construct_log(msg_short='Error Processing User\'s Checkout',
                                          msg=e.message,
                                          log_type=tt_logging.PAYMENT, request=self.request, request_user=self.user)
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise HttpErrorException.bad_request('There was an error processing your checkout')
        except Exception as e:
            lr = tt_logging.construct_log(msg_short='Error Processing User\'s Checkout',
                                          msg=e.message,
                                          log_type=tt_logging.PAYMENT, request=self.request, request_user=self.user)
            log.error(lr['dict_msg']['msg'], extra=lr)
            raise
        template_data = {
            'title': 'thinkTank Checkout',
            'nav_bar_title': 'thinkTank',
            'domain': self.request.host_url,
            'merchant': self.user.merchant,
            'payment_plan': checkout_info['items']['pay_plan'],
            'jwt_token': checkout_info['jwt_token'],
            'production': server.PRODUCTION,
        }
        if 'adjusted_plan' in checkout_info['items']:
            template_data['adjusted_plan'] = checkout_info['items']['adjusted_plan']
        template_index = JINJA_ENVIRONMENT.get_template('checkout.html')
        self.response.write(template_index.render(template_data))


from coupon import CouponAdminHandler, CouponHandler
from payment_plan import PaymentPlanHandler
from coinbase import CoinBaseCallback
from google import GoogleWalletCallback


payment_url_mapping = [
    ('/payment/checkout/(.*)/?', CheckoutHandler),
    ('/payment/checkout/?', CheckoutHandler),
    ('/payment/coupon/admin/(.*)/?', CouponAdminHandler),
    ('/payment/coupon/(.*)/?', CouponHandler),
    ('/payment/paymentplan/(.*)/?', PaymentPlanHandler),
    ('/payment/coinbase/callback/(.*)/?', CoinBaseCallback),
    ('/payment/google_wallet/callback/(.*)/?', GoogleWalletCallback),
]