import setup_paths
setup_paths.fix_path()
import webapp2


import requests_toolbelt.adapters.appengine
requests_toolbelt.adapters.appengine.monkeypatch()


import firebase_admin
from firebase_admin import credentials


cred = credentials.Certificate("firebase-serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://dragonspectra-dev.firebaseio.com'
})


from account import account_url_mapping
from payment import payment_url_mapping
from artifacts import artifact_url_mapping
from background import background_url_mapping
from admin_panel import admin_url_mapping


account_app = webapp2.WSGIApplication(account_url_mapping, debug=True)
payment_app = webapp2.WSGIApplication(payment_url_mapping, debug=True)
artifact_app = webapp2.WSGIApplication(artifact_url_mapping, debug=True)
importer_app = webapp2.WSGIApplication([], debug=True)
background_app = webapp2.WSGIApplication(background_url_mapping, debug=True)
admin_app = webapp2.WSGIApplication(admin_url_mapping, debug=True)