from server.handlers import *
from user import *
from organization import *


account_url_mapping = [
    ('/account/login/disabled/?', LoginDisabledHandler),
    ('/account/login/?', LoginUserHandler),
    ('/account/register/disabled/?', RegisterDisabledHandler),
    ('/account/register/(.*)/?', RegisterUserHandler),
    # ('/account/admin/?', AdminHandler),
    ('/account/username/available/v2/?', UserNameAvailable),
    ('/account/username/available/(.*)/?', UserNameAvailable),
    ('/account/username/email/?', UserUsername),
    ('/account/password/reset/(.*)/?', ResetPasswordHanlder),
    ('/account/billing/(.*)/?', UserAccountBilling),
    ('/account/profile/(.*)/?', UserAccountProfileHandler),
    ('/account/verify/email/(.*)/?', UserEmailVerification),
    ('/account/unverified(.*)/?', UnverifiedEmail),
    ('/account/locked(.*)/?', AccountLocked),
    ('/account/expired(.*)/?', AccountExpired),
    ('/account/disabled(.*)/?', AccountDisabled),
    ('/account/organization/admin/(.*)/?', OrganizationAdminHandler),
    ('/account/organization/(.*)/?', OrganizationHandler),
    ('/account/group/?', GroupHandler),
    ('/account/group/admin/(.*)/?', GroupHandler),
    ('/account/group/search/?', GroupSearchHandler),
    ('/account/client/logger/?', ClientLoggerHanlder),
    ('/account/tour-home-complete', HomeGuidedTourCompleteHandler),
    ('/account/tour-project-complete', ProjectGuidedTourCompleteHandler),
    ('/account/(.*)/?', UserHandler),
    ('/account/?', UserHandler),
]