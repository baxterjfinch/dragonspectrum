import time
import jwt
import datetime
import logging
from server import tt_logging
from transaction import Transaction
from dateutil.relativedelta import relativedelta

log = logging.getLogger('tt')

SANDBOX_MODE = False
SANDBOX_SELLER_ID = '16252859785814088961'
SANDBOX_SELLER_SECRET = 'm0oIQEkEqxGdFFgIzztDyQ'


class InvalidSellerDataException(Exception):
    pass


class InvalidOrderIdException(Exception):
    pass


# This are used to construct the JWT request to Google Merchant
# https://developers.google.com/wallet/digital/docs/jsreference#jwt
class GoogleInitialPayment(object):
    def __init__(self, price, currencyCode, paymentType):
        self.price = price
        self.currencyCode = currencyCode
        self.paymentType = paymentType  # The currently supported service types are "free_trial" and "prorated".

    def to_dict(self):
        return {
            'price': str(round(self.price, 2)),
            'currencyCode': self.currencyCode,
            'paymentType': self.paymentType
        }


class GoogleRecurrence(object):
    def __init__(self, price, currencyCode, startTime, frequency, numRecurrences):
        self.price = price
        self.currencyCode = currencyCode
        self.startTime = startTime  # The current supported frequency is "monthly".
        self.frequency = frequency
        self.numRecurrences = numRecurrences  # Optional: Number of times to recur the charge.
                                              # If omitted the subscription will recur until cancelled.

    def to_dict(self):
        return {
            'price': str(round(self.price, 2)),
            'currencyCode': self.currencyCode,
            'startTime': self.startTime,
            'frequency': self.frequency,
            'numRecurrences': self.numRecurrences,
        }


class GoogleSubscriptionRequest(object):
    def __init__(self, name, description, sellerData, initialPayment, recurrence):
        self.name = name  # 50 char limit (Google inforced)
        self.description = description  # 100 char limit (Google inforced)
        self.sellerData = sellerData  # 200 char limit (Google inforced)
        self.initialPayment = initialPayment
        self.recurrence = recurrence

    def to_dict(self):
        return {
            'name': self.name,
            'description': self.description,
            'sellerData': self.sellerData,
            'initialPayment': self.initialPayment.to_dict(),
            'recurrence': self.recurrence.to_dict(),
        }


class GoogleSubscriptionJWT(object):
    def __init__(self, iss, request):
        self.iss = iss
        self.aud = 'Google'  # Never changes
        self.typ = 'google/payments/inapp/subscription/v1'  # Never changes
        self.exp = int(time.time() + 3600)
        self.iat = int(time.time())
        self.request = request

    def to_dict(self):
        return {
            'iss': self.iss,
            'aud': self.aud,
            'typ': self.typ,
            'exp': self.exp,
            'iat': self.iat,
            'request': self.request.to_dict(),
        }


class GoogleItemRequest(object):
    def __init__(self, name, description, price, currencyCode, sellerData):
        self.name = name  # 50 char limit (Google inforced)
        self.description = description  # 100 char limit (Google inforced)
        self.price = price
        self.currencyCode = currencyCode
        self.sellerData = sellerData  # 200 char limit (Google inforced)

    def to_dict(self):
        return {
            'name': self.name,
            'description': self.description,
            'price': str(round(self.price, 2)),
            'currencyCode': self.currencyCode,
            'sellerData': self.sellerData,
        }


class GoogleItemJWT(object):
    def __init__(self, iss, exp, iat, request):
        self.iss = iss
        self.aud = 'Google'  # Never changes
        self.typ = 'google/payments/inapp/subscription/v1'  # Never changes
        self.exp = exp
        self.iat = iat
        self.request = request

    def to_dict(self):
        return {
            'iss': self.iss,
            'aud': self.aud,
            'typ': self.typ,
            'exp': self.exp,
            'iat': self.iat,
            'requets': self.request.to_dict()
        }


def get_checkout_data(user, pay_plan, adjusted_plan, gc):
    checkout_info = {
        'items': {
            'pay_plan': {
                'id': pay_plan['id'],
                'name': pay_plan['name'],
                'init_price': pay_plan['init_price'],
                'rec_price': pay_plan['rec_price'],
                'rec_price_formatted': "$%s" % format(pay_plan['rec_price'], ',.2f'),
                'currency': pay_plan['currency'],
                'type': pay_plan['type'],
                'repeat': pay_plan['repeat'],
                'discription': pay_plan['discription'],
            }
        }
    }
    final_rec_price = pay_plan['rec_price']
    final_init_price = pay_plan['init_price']
    final_start_date = datetime.datetime.now() + relativedelta(months=+1)
    if adjusted_plan:
        checkout_info['items']['adjusted_plan'] = {
            'id': adjusted_plan['id'],
            'name': adjusted_plan['name'],
            'init_price': adjusted_plan['init_price'],
            'rec_price': adjusted_plan['rec_price'],
            'rec_price_formatted':  adjusted_plan['rec_price_formatted'],
            'amount_saved':  adjusted_plan['amount_saved'],
            'amount_saved_formatted':  adjusted_plan['amount_saved_formatted'],
            'currency': adjusted_plan['currency'],
            'type': adjusted_plan['type'],
            'repeat': adjusted_plan['repeat'],
            'discription': adjusted_plan['discription'],
        }
        final_rec_price = adjusted_plan['rec_price']
        final_init_price = adjusted_plan['init_price']
        final_start_date = adjusted_plan['start_date']
    jwt_dict = GoogleSubscriptionJWT(
        iss=gc.google_seller_id if not SANDBOX_MODE else SANDBOX_SELLER_ID,
        request=GoogleSubscriptionRequest(
            name=pay_plan['name'],
            description=pay_plan['discription'],
            sellerData=user.user_id,
            initialPayment=GoogleInitialPayment(
                price=final_init_price,
                currencyCode=pay_plan['currency'],
                paymentType='prorated'
            ),
            recurrence=GoogleRecurrence(
                price=final_rec_price,
                currencyCode=pay_plan['currency'],
                startTime=time.mktime(final_start_date.timetuple()),
                frequency=pay_plan['repeat'],
                numRecurrences=None  # We don't need this right now
            )
        )
    ).to_dict()
    if SANDBOX_MODE:
        checkout_info['jwt_token'] = jwt.encode(jwt_dict, SANDBOX_SELLER_SECRET)
    else:
        checkout_info['jwt_token'] = jwt.encode(jwt_dict, gc.google_seller_secret)
    return checkout_info


def handle_google_callback(jwt_token):
    from server import GlobalConfig
    gc = GlobalConfig.get_configs()
    if SANDBOX_MODE:
        jwt_token = jwt.decode(jwt_token, SANDBOX_SELLER_SECRET)
    else:
        jwt_token = jwt.decode(jwt_token, gc.google_seller_secret)
    log.info('Google Callback jwt: ' + str(jwt_token))
    order_id = jwt_token['response']['orderId']
    from models.account.user import User
    from models import payment
    if 'request' in jwt_token:
        user_id = jwt_token['request']['sellerData']
        user = User.query(User.user_id == user_id).get()
        if not user:
            raise InvalidSellerDataException('could not find user to match user_id: ' + str(user_id))
        payment.process_payment(
            user=user,
            status='complete',
            discription='Recurrening payment',
            denomination=jwt_token['request']['recurrence']['currencyCode'],
            price=jwt_token['request']['initialPayment']['price'] if 'initialPayment' in jwt_token['request'] else 0,
            rec_price=jwt_token['request']['recurrence']['price'],
            merchant='Google',
            order_id=order_id,
            merchant_data=jwt_token
        )
        lr = tt_logging.construct_log(msg_short='[Google Postback] JWT', msg=str(jwt_token),
                                      log_type=tt_logging.PAYMENT, user=user)
        log.info(lr['dict_msg']['msg'], extra=lr)

    else:
        if 'statusCode' in jwt_token['response']:
            if jwt_token['response']['statusCode'] == 'SUBSCRIPTION_CANCELED':
                trans = Transaction.query(Transaction.order_id == order_id).get()
                if not trans:
                    raise InvalidOrderIdException('Could not find transaction for order id')
                user = trans.user.get()
                user.account_expire_data = datetime.datetime.now() + datetime.timedelta(
                    days=gc.subscription_account_extension_period)
                user.account_status = payment.PAID
                user.put()
                payment.process_payment(
                    user=user,
                    status='complete',
                    discription='Recurrening canceled',
                    denomination='',
                    price=0,
                    rec_price=0,
                    merchant='Google',
                    order_id=order_id,
                    merchant_data=jwt_token,
                    update_status=False,
                )
                lr = tt_logging.construct_log(msg_short='[Google Postback] JWT', msg=str(jwt_token),
                                              log_type=tt_logging.PAYMENT, user=user)
                log.info(lr['dict_msg']['msg'], extra=lr)
    return order_id


def process_checkout(checkout_data):
    pass