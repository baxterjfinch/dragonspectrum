import logging

from models.payment import coupon
from cerberus import handlers as cerberus_handlers
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException

log = logging.getLogger('tt')


class CouponHandler(AuthorizationRequestHanlder):
    auth_required = False

    @cerberus_handlers.exception_callback
    def get(self, coupon_code=None):
        if not coupon_code:
            raise HttpErrorException.bad_request('no coupon code given')
        try:
            coupon_obj = coupon.Coupon.get_coupon(coupon_code.lower())
        except coupon.InvalidCouponCodeException:
            raise HttpErrorException.bad_request('invalid coupon code')
        self.write_json_response(coupon_obj.to_dict())


class CouponAdminHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, coupon_code=None):
        if not self.user.is_super_admin:
            raise HttpErrorException.forbidden()
        if not coupon_code:
            if self.request.get('coupons') != '':
                coupons = coupon.Coupon.get_coupon_all()
                coupons_json = []
                for c in coupons:
                    coupons_json.append(c.to_dict())
                self.write_json_response(coupons_json)
            elif self.request.get('coupon_types') != '':
                self.write_json_response(coupon.coupon_types)
        else:
            coupon_obj = coupon.Coupon.get_coupon(coupon_code.lower())
            if not coupon_obj:
                raise HttpErrorException.bad_request('invalid coupon code given')
            self.write_json_response(coupon_obj.to_dict())

    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def put(self, coupon_code=None):
        if not self.user.is_super_admin:
            raise HttpErrorException.forbidden()
        if not coupon_code:
            raise HttpErrorException.bad_request('no coupon code given')
        try:
            coupon.Coupon.new(coupon_code.lower(), self.json_request)
        except coupon.InvalidCouponCodeException as e:
            raise HttpErrorException.bad_request(e.message)
        except coupon.InvalidPropertyException as e:
            raise HttpErrorException.bad_request(e.message)
        except coupon.InvalidCouponEngineException as e:
            raise HttpErrorException.bad_request(e.message)