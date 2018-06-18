from google.appengine.ext import ndb

__all__ = [
    'Transaction',
]


# Our own transaction record for user billing events
class Transaction(ndb.Model):
    user = ndb.KeyProperty()
    start_date = ndb.DateTimeProperty(required=True)
    end_date = ndb.DateTimeProperty()
    status = ndb.StringProperty(required=True)
    discription = ndb.StringProperty(required=True)
    denomination = ndb.StringProperty(required=True)
    price = ndb.FloatProperty(required=True)
    rec_price = ndb.FloatProperty(required=True)
    notes = ndb.TextProperty(repeated=True)
    merchant = ndb.StringProperty()
    merchant_data = ndb.JsonProperty()
    coupon = ndb.KeyProperty()
    order_id = ndb.StringProperty()

    def to_dict(self):
        coupon_to_dict = lambda coup: coup.get().to_dict() if coup else None
        return {
            'user': self.user.id(),
            'start_date': str(self.start_date),
            'end_date': str(self.end_date),
            'status': self.status,
            'discription': self.discription,
            'denomination': self.denomination,
            'price': self.price,
            'rec_price': self.rec_price,
            'notes': self.notes,
            'mrchant': self.merchant,
            'merchant_data': self.merchant_data,
            'coupon': coupon_to_dict(self.coupon),
            'order_id': self.order_id,
        }