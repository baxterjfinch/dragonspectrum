import copy
import datetime

from google.appengine.ext import ndb
from dateutil.relativedelta import relativedelta

import server
import payment_plan
from server.httperrorexception import HttpErrorException


class InvalidCouponEngineException(Exception):
    pass


class InvalidCouponCodeException(Exception):
    pass


class InvalidPropertyException(Exception):
    pass


class InActiveCouponExpcetion(Exception):
    pass

coupon_types = ['generic']


def is_valid_coupon_type(typ):
    if typ in coupon_types:
        return True
    return False


class Coupon(ndb.Model):
    @staticmethod
    def get_coupon_all():
        coupon_list = []
        q = Coupon.query()
        for c in q.iter():
            coupon_list.append(c)
        return coupon_list

    @staticmethod
    def get_coupon(coupon_code):
        if not coupon_code:
            raise TypeError('coupon code can not be None')
        coupon = GenericCoupon.get_by_id(coupon_code)
        if not coupon:
            raise InvalidCouponCodeException('invalid coupon code: ' + str(coupon_code))
        return coupon

    # Coupon generators
    @staticmethod
    def new(code, request):
        if type(code) is not str:
            raise InvalidPropertyException('code must be a str')
        coup = Coupon.get_by_id(code)
        if coup:
            raise InvalidCouponCodeException('coupon code already taken')
        if not request.get('engine_type'):
            raise InvalidPropertyException('no engine type given')
        if not is_valid_coupon_type(request.get('engine_type')):
            raise InvalidPropertyException('invalide engine type')
        if request.get('engine_type') == 'generic':
            try:
                start_date = datetime.datetime.fromtimestamp(int(request.get('start_date')))
            except:
                raise HttpErrorException.bad_request('invalid start date timestamp')
            if request.get('end_date'):
                try:
                    end_date = datetime.datetime.fromtimestamp(int(request.get('end_date')))
                except:
                    raise HttpErrorException.bad_request('invalid end date timestamp')
            else:
                end_date = None
            return GenericCoupon.new_(
                code,
                request.get('plan_ids'),
                request.get('init_price'),
                request.get('rec_price'),
                request.get('coupon_type'),
                start_date,
                end_date,
                request.get('activation_limit'),
                request.get('effective_period'),
                request.get('discription') if request.get('discription') != '' else None,
            )
        else:
            raise InvalidPropertyException('unknown engine type')


class GenericCoupon(Coupon):
    version = ndb.StringProperty(default='1')
    discription = ndb.StringProperty()
    plans = ndb.StringProperty(repeated=True)
    init_price = ndb.FloatProperty()
    rec_price = ndb.FloatProperty()
    type = ndb.StringProperty()
    start_date = ndb.DateTimeProperty()
    end_date = ndb.DateTimeProperty()
    activation_limit = ndb.IntegerProperty()
    effective_period = ndb.IntegerProperty()

    @staticmethod
    def new_(code, plan_ids, init_price, rec_price, coupon_type, start_date, end_date,
             activation_limit, effective_period, discription):
        if not isinstance(code, basestring):
            raise InvalidPropertyException('code must be a string')
        if type(plan_ids) is list:
            for plan_id in plan_ids:
                # pass
                if not payment_plan.is_valid_payment_plan(plan_id):
                    raise payment_plan.InvalidPaymentPlanException('invalid payment plan: ' + str(plan_id))
        elif plan_ids != 'all':
            raise InvalidPropertyException('plan ids must be a list of payment plan ids or "all"')
        elif plan_ids == 'all':
            plan_ids = ['all']
        if type(init_price) is not int and type(init_price) is not float and init_price is not 0:
            raise InvalidPropertyException('init_price must be int or float')
        if init_price < 0:
            raise InvalidPropertyException('init_price greater than -1')
        if type(rec_price) is not int and type(rec_price) is not float:
            raise InvalidPropertyException('rec_price must be int or float')
        if rec_price < 0:
            raise InvalidPropertyException('rec_price greater than -1')
        coupon_type_list_generic = ['flat_fee', 'discount_percentage', 'discount_amount']
        if coupon_type not in coupon_type_list_generic:
            raise InvalidPropertyException('invalid coupon_type must be one of ' + str(coupon_type_list_generic))
        if type(start_date) is not datetime.datetime:
            raise InvalidPropertyException('start_date must be a datetime.datetime object')
        if end_date:
            if type(end_date) is not datetime.datetime:
                raise InvalidPropertyException('end_date must be a datetime.datetime object')
        if activation_limit != 'Unlimited':
            if type(activation_limit) is not int:
                raise InvalidPropertyException('activation_list must be int or Unlimited')
        else:
            activation_limit = None
        if type(effective_period) is not int:
            raise InvalidPropertyException('effective_period must be int')
        coup = GenericCoupon(
            key=ndb.Key('GenericCoupon', code),
            plans=plan_ids,
            type=coupon_type,
            init_price=init_price,
            rec_price=rec_price,
            start_date=start_date,
            effective_period=effective_period
        )
        if end_date:
            coup.end_date = end_date
        if activation_limit:
            coup.activation_limit = activation_limit
        if discription:
            coup.discription = discription
        coup.put()
        return coup

    def is_active(self):
        if self.end_date:
            if datetime.datetime.now() > self.end_date:
                return False
        if self.start_date:
            if datetime.datetime.now() < self.start_date:
                return False
        if self.activation_limit:
            if self.activation_limit != 0:
                from models.account import User
                count = User.query(User.coupon == self.key).count()
                if self.activation_limit <= count:
                    return False
        return True

    def to_dict(self):
        return {
            'version': self.version,
            'plans': str(self.plans),
            'init_price': self.init_price,
            'rec_price': self.rec_price,
            'type': self.type,
            'start_date': str(self.start_date),
            'end_date': str(self.end_date),
            'activation_limit': self.activation_limit,
            'effective_period': self.effective_period,
            'active': self.is_active(),
        }

    def process_coupon(self, plan):
        if self.plans[0] != 'all':
            if plan['id'] not in self.plans:
                raise payment_plan.InvalidPaymentPlanException('this coupon does not work with given plan')
        final_plan = copy.deepcopy(plan)
        if self.effective_period < 1:
            start_date_addition = datetime.datetime.now() + relativedelta(months=+1)
        else:
            start_date_addition = datetime.datetime.now() + datetime.timedelta(days=self.effective_period)
        if self.type == 'flat_fee':
            final_plan['init_price'] = self.init_price
            final_plan['rec_price'] = self.rec_price
            final_plan['start_date'] = start_date_addition
        elif self.type == 'discount_percentage':
            final_plan['init_price'] -= ((self.init_price / 100) * final_plan['init_price'])
            final_plan['rec_price'] -= ((self.rec_price / 100) * final_plan['rec_price'])
            final_plan['start_date'] = start_date_addition
        elif self.type == 'discount_amount':
            final_plan['init_price'] -= self.init_price
            final_plan['rec_price'] -= self.rec_price
            final_plan['start_date'] = start_date_addition
        final_plan['name'] = self.key.id()
        final_plan['discription'] = self.discription
        final_plan['amount_saved'] = plan['rec_price'] - final_plan['rec_price']

        if final_plan['init_price'] < 0:
            final_plan['init_price'] = 0
        if final_plan['rec_price'] < 0:
            final_plan['rec_price'] = 0

        final_plan['rec_price_formatted'] = "$%s" % format(final_plan['rec_price'], ',.2f')
        final_plan['amount_saved_formatted'] = "$%s" % format(final_plan['amount_saved'], ',.2f')
        return final_plan