import json
import logging
import datetime

from cerberus import handlers as cerberus_handlers

from server import tt_logging
from models.account.organization import Organization
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

log = logging.getLogger('tt')

__all__ = [
    'AjaxOrganizationHanlder',
    'OrganizationSearchHandler',
    'OrganizationHanlder',
]


class AjaxOrganizationHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        if organization:
            organization = Organization.get_by_id(organization)
            if not organization:
                raise HttpErrorException.bad_request('invalid org id')
        temp_data = {}
        if organization:
            temp_data['org'] = organization
        template_index = JINJA_ENVIRONMENT.get_template('admin_panel/organization.html')
        self.response.write(template_index.render(temp_data))

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)


class OrganizationHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        if self.user.is_super_admin and organization is None:
            orgs = Organization.query().fetch()
            orgs_dict = []
            for org in orgs:
                orgs_dict.append(org.to_dict())
            self.write_json_response(orgs_dict)
        else:
            if not organization:
                raise HttpErrorException.bad_request('invalid org id')
            org = Organization.get_by_id(organization)
            if not org:
                raise HttpErrorException.bad_request('invalid org id')
            if not self.user.is_super_admin and self.user.organization != org.key:
                raise HttpErrorException.forbidden()
            self.write_json_response(org.to_dict())

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)


class OrganizationSearchHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.exception_callback
    def get(self, query):
        if not self.user.is_super_admin:
            raise HttpErrorException.forbidden()
        self.write_json_response(['corpus.io', 'demo'])
