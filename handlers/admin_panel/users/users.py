import logging

from cerberus import handlers as cerberus_handlers

from models.account.user import User
from models.account.organization import Organization
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

log = logging.getLogger('tt')

__all__ = [
    'AjaxUsersHanlder',
    'UsersHanlder',
]


class AjaxUsersHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        temp_data = {}
        template_index = JINJA_ENVIRONMENT.get_template('admin_panel/users/users.html')
        self.response.write(template_index.render(temp_data))

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)


class UsersHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        if self.user.is_super_admin and not organization:
            users = User.query(User.organization == None).fetch()
            users_dicts = []
            for user in users:
                users_dicts.append(user.to_dict())
            self.write_json_response(users_dicts)
        else:
            org = Organization.get_by_id(organization)
            if not org:
                raise HttpErrorException.bad_request('invalid org id')
            if not self.user.is_super_admin and self.user.organization != org.key:
                raise HttpErrorException.forbidden()
            if self.request.get('username', None):
                user = User.get_by_id(self.request.get('username'))
                if not user:
                    raise HttpErrorException.bad_request('invalid username')
                self.write_json_response(user.to_dict())
            else:
                users = User.query(User.organization == org.key).fetch()
                users_dicts = []
                for user in users:
                    users_dicts.append(user.to_dict())
                self.write_json_response(users_dicts)

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)