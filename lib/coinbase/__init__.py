"""
Coinbase Python Client Library

AUTHOR

George Sibble
Github:  sibblegp

LICENSE (The MIT License)

Copyright (c) 2013 George Sibble "gsibble@gmail.com"

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

"""

__author__ = 'gsibble'

import time
import hmac
import hashlib
import json

import requests
#TODO: Switch to decimals from floats
#from decimal import Decimal

from coinbase.models import CoinbaseAmount, CoinbaseTransaction, CoinbaseUser, CoinbaseTransfer, CoinbaseError

COINBASE_ENDPOINT_URL = 'https://coinbase.com/api/v1'
CHECKOUT_URL = 'https://coinbase.com/checkouts/'
ACCOUNT_BALANCE_URL = '/account/balance'
ACCOUNT_RECEIVE_ADDRESS_URL = '/account/receive_address'
ACCOUNT_GENERATE_RECEIVE_ADDRESS = '/account/generate_receive_address'
CONTACTS_URL = '/contacts'
PRICES_BUY_URL = '/prices/buy'
PRICES_SELL_URL = '/prices/sell'
BUYS_URL = '/buys'
SELLS_URL = '/sells'
TRANSACTIONS_URL = '/transactions'
TRANSACTIONS_REQUEST_MONEY_URL = '/transactions/request_money'
TRANSACTIONS_SEND_MONEY = '/transactions/send_money'
TRANSFERS = '/transfers'
USERS_URL = '/users'
BUTTONS_URL = '/buttons'


class CoinbaseAccount(object):
    """
    Primary object for interacting with a Coinbase account

    You may either use oauth credentials or a classic API key
    """

    def __init__(self, api_key=None, api_secret=None):
        """
        :param oauth2_credentials: JSON representation of Coinbase oauth2 credentials
        :param api_key:  Coinbase API key
        """

        print 'Coinbase Stuff'
        print type(api_key)
        print type(api_secret)

        #Set up our requests session
        self.session = requests.session()

        self.api_key = api_key.encode('utf8')
        self.api_secret = api_secret.encode('utf8')

    def _update_session_headers(self, url, msg=None):
        nonce = int(time.time() * 1e6)
        message = str(nonce) + url + ('' if msg is None else msg)
        signature = hmac.new(self.api_secret, message, hashlib.sha256).hexdigest()
        self.session.headers.update({'content-type': 'application/json',
                                     'ACCESS_KEY': self.api_key,
                                     'ACCESS_NONCE': nonce,
                                     'ACCESS_SIGNATURE': signature,
                                     })

    @property
    def balance(self):
        """
        Retrieve coinbase's account balance

        :return: CoinbaseAmount (float) with currency attribute
        """

        url = COINBASE_ENDPOINT_URL + ACCOUNT_BALANCE_URL
        self._update_session_headers(url)
        response = self.session.get(url)
        results = response.json()
        return CoinbaseAmount(results['amount'], results['currency'])

    @property
    def receive_address(self):
        """
        Get the account's current receive address

        :return: String address of account
        """
        url = COINBASE_ENDPOINT_URL + ACCOUNT_RECEIVE_ADDRESS_URL
        self._update_session_headers(url)
        response = self.session.get(url)
        return response.json()['address']

    @property
    def contacts(self):
        """
        Get the account's contacts

        :return: List of contacts in the account
        """
        url = COINBASE_ENDPOINT_URL + CONTACTS_URL
        self._update_session_headers(url)
        response = self.session.get(url)
        return [contact['contact'] for contact in response.json()['contacts']]

    def buy_price(self, qty=1):
        """
        Return the buy price of BitCoin in USD
        :param qty: Quantity of BitCoin to price
        :return: CoinbaseAmount (float) with currency attribute
        """
        url = COINBASE_ENDPOINT_URL + PRICES_BUY_URL
        params = {'qty': qty}
        self._update_session_headers(url)
        response = self.session.get(url, params=params)
        results = response.json()
        return CoinbaseAmount(results['amount'], results['currency'])

    def sell_price(self, qty=1):
        """
        Return the sell price of BitCoin in USD
        :param qty: Quantity of BitCoin to price
        :return: CoinbaseAmount (float) with currency attribute
        """
        url = COINBASE_ENDPOINT_URL + PRICES_SELL_URL
        params = {'qty': qty}
        self._update_session_headers(url)
        response = self.session.get(url, params=params)
        results = response.json()
        return CoinbaseAmount(results['amount'], results['currency'])

    def buy_btc(self, qty, pricevaries=False):
        """
        Buy BitCoin from Coinbase for USD
        :param qty: BitCoin quantity to be bought
        :param pricevaries: Boolean value that indicates whether or not the transaction should
                be processed if Coinbase cannot gaurentee the current price. 
        :return: CoinbaseTransfer with all transfer details on success or 
                 CoinbaseError with the error list received from Coinbase on failure
        """
        url = COINBASE_ENDPOINT_URL + BUYS_URL
        request_data = json.dumps({
            "qty": qty,
            "agree_btc_amount_varies": pricevaries
        })
        self._update_session_headers(url, request_data)
        response = self.session.post(url=url, data=request_data)
        response_parsed = response.json()
        if not response_parsed['success']:
            return CoinbaseError(response_parsed['errors'])

        return CoinbaseTransfer(response_parsed['transfer'])

    def sell_btc(self, qty):
        """
        Sell BitCoin to Coinbase for USD
        :param qty: BitCoin quantity to be sold
        :return: CoinbaseTransfer with all transfer details on success or 
                 CoinbaseError with the error list received from Coinbase on failure
        """
        url = COINBASE_ENDPOINT_URL + SELLS_URL
        request_data = json.dumps({
            "qty": qty,
        })
        self._update_session_headers(url, request_data)
        response = self.session.post(url=url, data=request_data)
        response_parsed = response.json()
        if not response_parsed['success']:
            return CoinbaseError(response_parsed['errors'])

        return CoinbaseTransfer(response_parsed['transfer'])

    def request(self, from_email, amount, notes='', currency='BTC'):
        """
        Request BitCoin from an email address to be delivered to this account
        :param from_email: Email from which to request BTC
        :param amount: Amount to request in assigned currency
        :param notes: Notes to include with the request
        :param currency: Currency of the request
        :return: CoinbaseTransaction with status and details
        """
        url = COINBASE_ENDPOINT_URL + TRANSACTIONS_REQUEST_MONEY_URL

        if currency == 'BTC':
            request_data = json.dumps({
                "transaction": {
                    "from": from_email,
                    "amount": amount,
                    "notes": notes
                }
            })
        else:
            request_data = json.dumps({
                "transaction": {
                    "from": from_email,
                    "amount_string": str(amount),
                    "amount_currency_iso": currency,
                    "notes": notes
                }
            })
        self._update_session_headers(url, request_data)
        response = self.session.post(url=url, data=request_data)
        response_parsed = response.json()
        if not response_parsed['success']:
            pass
            #DO ERROR HANDLING and raise something

        return CoinbaseTransaction(response_parsed['transaction'])

    def send(self, to_address, amount, notes='', currency='BTC'):
        """
        Send BitCoin from this account to either an email address or a BTC address
        :param to_address: Email or BTC address to where coin should be sent
        :param amount: Amount of currency to send
        :param notes: Notes to be included with transaction
        :param currency: Currency to send
        :return: CoinbaseTransaction with status and details
        """
        url = COINBASE_ENDPOINT_URL + TRANSACTIONS_SEND_MONEY

        if currency == 'BTC':
            request_data = json.dumps({
                "transaction": {
                    "to": to_address,
                    "amount": amount,
                    "notes": notes
                }
            })
        else:
            request_data = json.dumps({
                "transaction": {
                    "to": to_address,
                    "amount_string": str(amount),
                    "amount_currency_iso": currency,
                    "notes": notes
                }
            })
        self._update_session_headers(url, request_data)
        response = self.session.post(url=url, data=request_data)
        response_parsed = response.json()

        if not response_parsed['success']:
            raise RuntimeError('Transaction Failed')

        return CoinbaseTransaction(response_parsed['transaction'])

    def transactions(self, count=30):
        """
        Retrieve the list of transactions for the current account
        :param count: How many transactions to retrieve
        :return: List of CoinbaseTransaction objects
        """
        url = COINBASE_ENDPOINT_URL + TRANSACTIONS_URL
        pages = count / 30 + 1
        transactions = []

        reached_final_page = False

        for page in xrange(1, pages + 1):
            if not reached_final_page:
                request_data = json.dumps({'page': page})
                self._update_session_headers(url, request_data)
                response = self.session.get(url=url, data=request_data)
                parsed_transactions = response.json()
                if parsed_transactions['num_pages'] == page or parsed_transactions['num_pages'] == 0:
                    reached_final_page = True

                for transaction in parsed_transactions['transactions']:
                    transactions.append(CoinbaseTransaction(transaction['transaction']))

        return transactions

    def transfers(self, count=30):
        """
        Retrieve the list of transfers for the current account
        :param count: How many transfers to retrieve
        :return: List of CoinbaseTransfer objects
        """
        url = COINBASE_ENDPOINT_URL + TRANSFERS
        pages = count / 30 + 1
        transfers = []

        reached_final_page = False

        for page in xrange(1, pages + 1):
            if not reached_final_page:
                request_data = json.dumps({'page': page})
                self._update_session_headers(url, request_data)
                response = self.session.get(url=url, data=request_data)
                parsed_transfers = response.json()

                if parsed_transfers['num_pages'] == page:
                    reached_final_page = True

                for transfer in parsed_transfers['transfers']:
                    transfers.append(CoinbaseTransfer(transfer['transfer']))

        return transfers

    def get_transaction(self, transaction_id):
        """
        Retrieve a transaction's details
        :param transaction_id: Unique transaction identifier
        :return: CoinbaseTransaction object with transaction details
        """
        url = COINBASE_ENDPOINT_URL + TRANSACTIONS_URL + '/' + str(transaction_id)
        self._update_session_headers(url)
        response = self.session.get(url)
        results = response.json()

        if not results.get('success', True):
            pass
            #TODO:  Add error handling

        return CoinbaseTransaction(results['transaction'])

    def get_user_details(self):
        """
        Retrieve the current user's details

        :return: CoinbaseUser object with user details
        """
        url = COINBASE_ENDPOINT_URL + USERS_URL
        self._update_session_headers(url)
        response = self.session.get(url)
        results = response.json()

        user_details = results['users'][0]['user']

        #Convert our balance and limits to proper amounts
        balance = CoinbaseAmount(user_details['balance']['amount'], user_details['balance']['currency'])
        buy_limit = CoinbaseAmount(user_details['buy_limit']['amount'], user_details['buy_limit']['currency'])
        sell_limit = CoinbaseAmount(user_details['sell_limit']['amount'], user_details['sell_limit']['currency'])

        user = CoinbaseUser(user_id=user_details['id'],
                            name=user_details['name'],
                            email=user_details['email'],
                            time_zone=user_details['time_zone'],
                            native_currency=user_details['native_currency'],
                            balance=balance,
                            buy_level=user_details['buy_level'],
                            sell_level=user_details['sell_level'],
                            buy_limit=buy_limit,
                            sell_limit=sell_limit)

        return user

    def generate_receive_address(self, callback_url=None):
        """
        Generate a new receive address
        :param callback_url: The URL to receive instant payment notifications
        :return: The new string address
        """
        url = COINBASE_ENDPOINT_URL + ACCOUNT_GENERATE_RECEIVE_ADDRESS
        request_data = json.dumps({
            "address": {
                "callback_url": callback_url
            }
        })
        self._update_session_headers(url, request_data)
        response = self.session.post(url=url, data=request_data)
        return response.json()['address']

    def generate_checkout_url(self, plan):
        """
        Generate a new payment page
        :param plan: The plan to generate a page for suck as pricing and other information
        :return: The url to the new payment page
        """
        url = COINBASE_ENDPOINT_URL + BUTTONS_URL
        request_data = json.dumps({'button': plan})
        self._update_session_headers(url, request_data)
        response = self.session.post(url=url, data=request_data)
        payment_page_info = response.json()
        return CHECKOUT_URL + payment_page_info['button']['code']
