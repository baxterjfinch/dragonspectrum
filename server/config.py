import sys
import logging

# All of our configurations are contained here for easy access


# Static Configurations
#
# This configs are not changabel after deploy
# any change will require a re-deploy

# Security permission rules
# DO NOT CHANGES THIS
permission_rules = ['allow', 'deny', 'inherit', 'none']

# Time to live for hidden group memcache fake ids
memcache_fake_id_timeout = 600  # seconds

# Time to live for channel ping request memcache
memcache_user_ping_timeout = 60  # seconds

# How long to sleep when waiting for channel ping request response
channel_ping_request_response_time_out = 10  # seconds

# This settings are for generation channel user colors
channel_user_red_start_color = 0
channel_user_red_end_color = 240
channel_user_green_start_color = 0
channel_user_green_end_color = 255
channel_user_blue_start_color = 0
channel_user_blue_end_color = 255
channel_user_luminance_adjustment = 0.8

# Default value for requiring password change for new users
require_password_change_new_user = False

# ID for Globel Configurations Datastore entitiy
global_config_id = 'global_configs'

# ID for logging Configurations Datastore entitiy
logging_config_id = 'logging_configs'

########################################################################################################################

# Dynamic Configurations
#
# This configs are loaded into the GlobalConfig datastore entitiy on init
# and is/will be changable in super admin panel or through remote api

############################################# Concept Loader Configuations #############################################
# The number of parents to request at one time when loading concept's children
default_concept_loading_hq_batch_size = 2
default_concept_loading_lq_batch_size = 5

# Time our for proccessing children (throttler)
default_concept_loading_hq_timeout = 20
default_concept_loading_lq_timeout = 40

# Whether to load children ahead of the user
concept_loading_stay_ahead = True

# Number of concurrent request for requesting children
concept_loading_num_concur_req = 2

# Whether or not to cache children under non-expanded concepts
concept_loading_cache_children = True

############################################# Site Configurations ######################################################

# Whether or not to allow non admin users to login
allow_non_admin_user_login = True

# Whether or not to all new users to register
allow_user_registration = True

# Default value for requiring email verification for new users
require_email_verification = True

# Login failed attemps config
failed_login_attemps_timeout = 5  # minutes
failed_login_attemps_limit = 4

# User Currency Information
default_ddss = 500
default_spectra_count = 5000

# Coinbase api configs
coinbase_api_key = 'NNLfvy0LB1hhzfpm'
coinbase_api_secret = 'EG8tyrbVJ3Z8HGr7a20TJLl5FVxYJddl'
coinbase_callback_secret_key = '194deb68a3df11e380180090f5bc9bce'

# Google Merchant
google_seller_id = '14228469657172855304'
google_seller_secret = 'UjxsH8fcsSJf31WHDli24g'

# SMTP server settings
smtp_server_address = 'smtp.gmail.com'
smtp_server_port = '587'
smtp_username = 'thinktank@corpus.io'
smtp_password = 'g7V!J!JZWmzUrY9'

# Logging Configurations

# SMTP Message Subject Length
smtp_log_subject_len = 50

# Datastore Handler config
datestore_log_level = logging.INFO

# SMTP Handler config
smtphandler_default_log_level = sys.maxint  # Do not send
smtphandler_default_to_email_addr = 'exceptions@corpus.io'
smtphandler_user_log_level = sys.maxint  # Do not send
smtphandler_user_to_email_addr = 'exceptions@corpus.io'
smtphandler_admin_log_level = logging.WARNING
smtphandler_admin_to_email_addr = 'exceptions@corpus.io'
smtphandler_payment_log_level = logging.WARNING
smtphandler_payment_to_email_addr = 'support@corpus.io'
smtphandler_security_log_level = logging.WARNING
smtphandler_security_to_email_addr = 'security@corpus.io'
smtphandler_backend_log_level = logging.WARNING
smtphandler_backend_to_email_addr = 'exceptions@corpus.io'
smtphandler_remote_api_log_level = logging.WARNING
smtphandler_remote_api_to_email_addr = 'exceptions@corpus.io'
smtphandler_registration_log_level = logging.INFO
smtphandler_registration_to_email_addr = 'registrations@corpus.io'
smtphandler_exception_log_level = sys.maxint  # Do not send
smtphandler_exception_to_email_addr = 'exceptions@corpus.io'
smtphandler_httpbadrequest_log_level = sys.maxint  # Do not send
smtphandler_httpbadrequest_to_email_addr = 'exceptions@corpus.io'
smtphandler_httpunauthorized_log_level = sys.maxint  # Do not send
smtphandler_httpunauthorized_to_email_addr = 'exceptions@corpus.io'
smtphandler_httpforbidden_log_level = sys.maxint  # Do not send
smtphandler_httpforbidden_to_email_addr = 'security@corpus.io'
smtphandler_httpnotfound_log_level = sys.maxint  # Do not send
smtphandler_httpnotfound_to_email_addr = 'exceptions@corpus.io'
smtphandler_httpmethodnotallowed_log_level = sys.maxint  # Do not send
smtphandler_httpmethodnotallowed_to_email_addr = 'exceptions@corpus.io'
smtphandler_httprequesttimeout_log_level = sys.maxint  # Do not send
smtphandler_httprequesttimeout_to_email_addr = 'exceptions@corpus.io'

# How many days before account expires we should send a email warning
# Must be a list
trial_expiring_email_intervales = [7, 4, 2, 1]  # days

# How many days after account expires we should ask to come back,
# this is after grace period
# Must be a list
trial_expired_email_intervales = [7, 1]  # days

# Account expiring grace period
trial_expiring_grace_period = 0  # days

# How many days before account expires we should send a email warning
# Must be a list
acct_expiring_email_intervales = [7, 4, 2, 1]  # days

# How many days after account expires we should ask to come back,
# this is after grace period
# Must be a list
acct_expired_email_intervales = [1, 2, 4, 7, 15, 30, 60, 90, 120, 150, 180, 210, 240]  # days

# Account expiring grace period
acct_expiring_grace_period = 10  # days

# Email verification grace period
email_verifcation_grace_time = 24  # hours

# Subscription account extision period
subscription_account_extension_period = 15  # days

# Template for verification emails
email_verification_template_subject = 'Thank you for signing up'
email_verification_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Thank you for signing up for a thinkTank account, please verify you email address by clicking the link below.</p>
<p>Click <a href="{{ verification_link }}">here</a> to verify you email.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for expiring trials emails
trial_ending_template_subject = 'Your trial period is ending'
trial_ending_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Your trial period will end in {{ days }} days.</p>
<p>To avoid service interruption, please update your billing information.</p>

<p>For more information, please email the thinkTank team at <a href="mailto:support@corpus.io">support@corpus.io</a>.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for expired trial emails
trial_ended_template_subject = 'Your trial period has ended'
trial_ended_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Your trial period has ended.</p>
<p>To avoid service interruption, please update your billing information.</p>

<p>For more information, please email the thinkTank team at <a href="mailto:support@corpus.io">support@corpus.io</a>.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for after expired trials emails
after_trial_ended_template_subject = 'Your trial period has ended'
after_trial_ended_template = '''
<html>
<head></head>
<body>

<p>Your thinkTank trial account ended {{ days }} days ago.</p>
<p>To avoid service interruption, please update your billing information.</p>
<p>For more information, please email the thinkTank team at <a href="mailto:support@corpus.io">support@corpus.io</a>.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for expiring account emails
account_expiring_template_subject = 'Your account is about to expire'
account_expiring_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Your thinkTank account will expire in {{ days }} days.</p>
<p>To avoid service interruption, please update your billing information.</p>

<p>For more information, please email the thinkTank team at <a href="mailto:support@corpus.io">support@corpus.io</a>.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for expired account emails
account_expired_template_subject = 'Your account has expired'
account_expired_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Your account has expired.</p>
<p>To avoid service interruption, please update your billing information.</p>

<p>For more information, please email the thinkTank team at <a href="mailto:support@corpus.io">support@corpus.io</a>.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for after expired account emails
after_account_expiring_template_subject = 'Your account is expired'
after_account_expiring_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Your thinkTank account expired {{ days }} days ago.</p>
<p>To continue service, please update your billing information.</p>

<p>For more information, please email the thinkTank team at <a href="mailto:support@corpus.io">support@corpus.io</a>.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for after reset password emails
reset_password_template_subject = 'Password Reset'
reset_password_template = '''
<html>
<head></head>
<body>
Dear {{ first_name }},<br><br>

<p>Please click <a href="{{ reset_url }}">here</a> to reset your password.</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''

# Template for after reset password emails
username_template_subject = 'Forgotten Username'
username_template = '''
<html>
<head></head>
<body>

Hello,
<p>Your username is {{ username }}</p>

Thank you,<br>
Your friends at thinkTank.
</body>
</html>
'''


# Template for after reset password emails
logger_email_template = '''
<html>
<head></head>
<body>
<h3>{{ msg_short }}</h3>
<strong>DateTime:</strong> {{ datetime }}<br>
<strong>log_level:</strong> {{ log_level }}<br>
<strong>logger_name:</strong> {{ logger_name }}<br>
<strong>logger_pathname:</strong> {{ logger_pathname }}<br>
<strong>logger_func:</strong> {{ logger_func }}<br>
<strong>log_type:</strong> {{ log_type }}<br>
<br>
<strong>Organization:</strong> {{ org }}<br>
<strong>Request User:</strong> {{ request_user }}<br>
<strong>Affected User:</strong> {{ affected_user }}<br>
<strong>Artifact:</strong> {{ artifact }}<br>
<br>
<strong>Message:</strong><br>
{{ message }}
<br><br>
<strong>Request:</strong><br>
{{ request }}

</body>
</html>
'''