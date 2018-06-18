import setup_paths
setup_paths.fix_path()
import webapp2

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