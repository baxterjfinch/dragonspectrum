import json
import logging
import datetime

from google.appengine.ext import ndb
from google.appengine.api import channel
from cerberus import handlers as cerberus_handlers

from server import ttindex
from server import tt_logging
from models.account.user import User
from server.importer.importer import ImporterTask
from server.importer.restore import ProjectRestore
from models.account.organization import Organization
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT
from models.artifacts import Project, Document, Concept, Phrasing, Permission, Attributes


log = logging.getLogger('tt')

__all__ = [
    'AdminHandler',
]


class AdminHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        temp_data = {
            'user': {
                'display_name': self.user.display_name,
                'super_admin': self.user.is_super_admin,
            },
            'org': False,
            'org_json': None,
        }
        if not self.user.is_org_admin or (self.user.is_super_admin and organization is not None):
            if not organization:
                raise HttpErrorException.forbidden()
            org = Organization.get_by_id(organization)
            if not org:
                raise HttpErrorException.bad_request('invalid organization id')
            if not self.user.is_super_admin and self.user.organization != org.key:
                raise HttpErrorException.forbidden()
            temp_data['org'] = True
            temp_data['org_id'] = org.key.id()
            temp_data['org_json'] = json.dumps(org.to_dict())
            groups = org.get_all_groups()
            groups += org.get_all_hidden_groups()
            temp_data['groups'] = json.dumps(groups)
        template_index = JINJA_ENVIRONMENT.get_template('admin_panel/index.html')
        self.response.write(template_index.render(temp_data))

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)