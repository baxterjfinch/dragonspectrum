import logging

from cerberus import handlers as cerberus_handlers

from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

log = logging.getLogger('tt')

__all__ = [
    'AjaxArtifactsProjectsHanlder',
]


class AjaxArtifactsProjectsHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        temp_data = {}
        template_index = JINJA_ENVIRONMENT.get_template('admin_panel/artifacts/projects.html')
        self.response.write(template_index.render(temp_data))

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)