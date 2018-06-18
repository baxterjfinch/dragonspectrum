import json
import logging
from datetime import datetime, timedelta

from cerberus import handlers as cerberus_handlers
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

from models.background.health import Health

log = logging.getLogger('tt')

__all__ = [
    'AjaxThinkTankHealthHanlder',
    'ThinkTankHealthHanlder',
]


class AjaxThinkTankHealthHanlder(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def get(self, organization=None):
        if not self.user.is_admin:
            raise HttpErrorException.forbidden()
        temp_data = {}
        template_index = JINJA_ENVIRONMENT.get_template('admin_panel/thinktank/health.html')
        self.response.write(template_index.render(temp_data))

    @cerberus_handlers.exception_callback
    def on_authentication_fail(self, method):
        self.redirect('/account/login', abort=True)


class ThinkTankHealthHanlder(AuthorizationRequestHanlder):
    def get(self, hours):
        if not self.user.is_super_admin:
            raise HttpErrorException.forbidden()
        if not hours:
            raise HttpErrorException.bad_request('no hours given')
        try:
            hours = int(hours)
        except ValueError:
            raise HttpErrorException.bad_request('hours must be int')
        start_time = datetime.now() - timedelta(hours=hours)
        healths = Health.query(Health.ts > start_time).order(Health.ts).fetch()
        healths_dict = []
        for health in healths:
            healths_dict.append(health.to_dict())
        self.response.write(json.dumps(healths_dict))