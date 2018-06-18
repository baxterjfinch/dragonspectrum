from google.appengine.ext import ndb


class InvalidPaymentPlanException(Exception):
    pass


# Payment Plans
personal_basic = {
    'id': 'personal_basic',
    'name': 'P-1',
    'init_price': 29.99,
    'rec_price': 29.99,
    'currency': 'USD',
    'discription': 'thinkTank Personal Basic Subscription',
    'type': 'subscription',
    'repeat': 'monthly',
    'order': 0,
}

personal_plus = {
    'id': 'personal_plus',
    'name': 'P-2',
    'init_price': 49.99,
    'rec_price': 49.99,
    'currency': 'USD',
    'discription': 'thinkTank Personal Plus Subscription',
    'type': 'subscription',
    'repeat': 'monthly',
    'order': 1,
}

payment_plans = {
    'personal_basic': personal_basic,
    'personal_plus': personal_plus,
}


# This is the model for the payment plans
class PaymentPlan(ndb.Model):
    id = ndb.StringProperty()
    name = ndb.StringProperty()
    price = ndb.StringProperty()
    currency = ndb.StringProperty(choices=['USD', 'BTC'])
    description = ndb.StringProperty()
    type = ndb.StringProperty(choices=['subscription', 'one_time'])
    subscription_frequency = ndb.StringProperty(choices=['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])


def is_valid_payment_plan(payment_plan):
    try:
        payment_plans[payment_plan]
    except KeyError:
        if not payment_plan == 'trial':
            return False
    return True


def get_payment_plan(pay_plan):
    if not is_valid_payment_plan(pay_plan):
        raise InvalidPaymentPlanException('invalid payment plan: ' + str(pay_plan))
    return payment_plans[pay_plan]


def get_payment_plans():
    return payment_plans


def get_payment_plan_list():
    plan_list = []
    for key in payment_plans:
        plan_list.insert(payment_plans[key]['order'], payment_plans[key])
    return plan_list


def get_payment_plan_list_with_trail():
    plan_list = []
    for key in payment_plans:
        plan_list.insert(payment_plans[key]['order'], payment_plans[key])
    # plan_list.insert(0, trial)
    return plan_list
