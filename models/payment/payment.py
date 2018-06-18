import logging
import datetime
from uuid import uuid1

from dateutil.relativedelta import relativedelta

import payment_plan
import google_merchant
import coinbase_merchant
from transaction import Transaction

log = logging.getLogger(__file__)


class InvalidAccountTypeException(Exception):
    pass


class InvalidMerchantException(Exception):
    pass


merchants = {
    'coinbase': coinbase_merchant,
    'google_wallet': google_merchant,
}


def is_supported_merchant(merchant):
    if merchant in merchants:
        return True
    return False


def process_checkout(merchant, checkout_data):
    if not is_supported_merchant(merchant):
        raise InvalidMerchantException('unsupported merchant given')
    return merchants[merchant].process_checkout(checkout_data)

# Account Status
TRIAL = 'trial'
PAID = 'paid'
SUB = 'sub'
LOCKED = 'locked'
DISABLED = 'disabled'
TRIAL_EXPIRED = 'trial_expired'
EXPIRED = 'expired'
FREE = 'free'
ORG = 'org'

TRIAL_LENGTH = 30  # Days


# Non Billable Accounts
non_billable_accounts = [
    TRIAL,
    FREE,
]

# Account Types
BASIC_INDIVIDUAL_SUB = 'basic_individual_sub'

# Billable Accounts
billable_accounts = [
    BASIC_INDIVIDUAL_SUB,
]


def is_valid_account_type(account_type):
    if account_type in non_billable_accounts:
        return True
    if account_type in billable_accounts:
        return True
    return False


def is_billable_account(user):
    if user.account_type:
        if user.account_type in billable_accounts:
            return True
    return False


def setup_billable_account(user, pay_plan, gc):
    pass


def payment_plan_required(account_type):
    if account_type in non_billable_accounts:
        return False
    elif account_type in billable_accounts:
        return True
    else:
        raise InvalidAccountTypeException(account_type + ' is a invalid account type')


def is_free_account(pay_plan, adjusted_plan):
    if adjusted_plan:
        if adjusted_plan['init_price'] == 0 and adjusted_plan['rec_price'] == 0:
            return True
        else:
            return False
    elif pay_plan['init_price'] == 0 and pay_plan['rec_price'] == 0:
        return True
    return False


def get_checkout_data(user, gc):
    merchant = user.merchant
    pay_plan = payment_plan.get_payment_plan(user.account_type)
    if user.coupon:
        adjusted_plan = user.coupon.get().process_coupon(pay_plan)
    else:
        adjusted_plan = None
    if is_free_account(pay_plan, adjusted_plan):
        trans = Transaction(
            user=user.key,
            start_date=datetime.datetime.now(),
            status='complete',
            discription='free account',
            denomination='USD',
            price=0,
            rec_price=0,
            coupon=user.coupon,
            id=uuid1().get_hex()
        )
        trans.put()
        user.transaction_history.append(trans.key)
        user.account_status = FREE
        user.account_expire_data = datetime.datetime.max
        user.put()
        return 'free'
    else:
        return merchants[merchant].get_checkout_data(user, pay_plan, adjusted_plan, gc)


def init_payment(user, pay_plan, merchant):
    if not is_supported_merchant(merchant):
        raise InvalidMerchantException('unsupported merchant: ' + str(merchant))
    user.account_status = TRIAL
    pay_plan = payment_plan.get_payment_plan(pay_plan)
    user.account_type = pay_plan['id']
    user.account_expire_data = datetime.datetime.now() + datetime.timedelta(days=7)
    user.merchant = merchant


def process_payment(user, status, discription, denomination, price, rec_price,
                    merchant, order_id, merchant_data, update_status=True):
    if not isinstance(price, float):
        price = float(price)
    if not isinstance(rec_price, float):
        rec_price = float(rec_price)
    trans = Transaction(
        user=user.key,
        start_date=datetime.datetime.now(),
        status=status,
        discription=discription,
        denomination=denomination,
        price=price,
        rec_price=rec_price,
        merchant=merchant,
        order_id=order_id,
        merchant_data=merchant_data,
        id=uuid1().get_hex()
    )
    if user.coupon:
        trans.coupon = user.coupon
    trans.put()
    user.transaction_history.append(trans.key)
    if update_status:
        user.account_status = SUB
    user.account_expire_data = datetime.datetime.now() + relativedelta(months=+1)
    user.put()