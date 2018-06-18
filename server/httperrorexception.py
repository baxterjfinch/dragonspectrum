import os
import logging

import webapp2
import jinja2


log = logging.getLogger('tt')

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)


class HttpErrorException(webapp2.HTTPException):
    @staticmethod
    def bad_request(message='', detail='bad_request'):
        log.debug('Returned 400: %s', message)
        webapp2.abort(400, detail=detail, comment=message, headers={'reason': message})

    @staticmethod
    def unauthorized(message='', detail='unauthorized'):
        log.debug('Returned 401: %s', message)
        webapp2.abort(401, detail=detail, comment=message, headers={'reason': message})

    @staticmethod
    def forbidden(message='', detail='forbidden'):
        log.debug('Returned 403: %s', message)
        webapp2.abort(403, detail=detail, comment=message)

    @staticmethod
    def not_found(message='', detail='not_found'):
        log.debug('Returned 404: %s', message)
        webapp2.abort(404, detail=detail, comment=message, headers={'reason': message})