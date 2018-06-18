import logging

from google.appengine.ext import ndb
from google.appengine.api import background_thread, logservice
from cerberus import handlers as cerberus_handlers

from server import ttindex
from models.account.user import User
from models.account.organization import Organization
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder
from models.artifacts import Project

log = logging.getLogger('tt')

__all__ = [
    'ReindexProjects',
]


class ReindexProjects(AuthorizationRequestHanlder):
    project_keys = []

    @cerberus_handlers.enable_json(True)
    def post(self):
        if not self.user.is_super_admin:
            raise HttpErrorException.not_found()
        if self.json_request.get('clear_indexes'):
            orgs = Organization.query().fetch()
            for org in orgs:
                indexes = org.get_indexes()
                for index in indexes:
                    ttindex.clear_index(index)
            users = User.query(User.organization == None).fetch()
            for user in users:
                indexes = user.get_indexes()
                for index in indexes:
                    ttindex.clear_index(index)
        project_ids = self.json_request.get('project_ids')
        if project_ids:
            if project_ids == 'all':
                self.project_keys = Project.query().fetch(keys_only=True)
            else:
                if type(project_ids) is not list:
                    raise HttpErrorException.bad_request('project ids must be list')
                for pro_id in project_ids:
                    pro = Project.get_by_id(pro_id)
                    if not pro:
                        raise HttpErrorException.bad_request('invalid project id given: ' + str(pro_id))
                    self.project_keys.append(pro.key)
            t = background_thread.BackgroundThread(target=self.index_project)
            t.start()

    def index_project(self, ):
        count = 1
        num = len(self.project_keys)
        log.info('Starting indexing')
        logservice.flush()
        for pro_key in self.project_keys:
            pro = pro_key.get()
            log.info('Index %s of %s projects', str(count), str(num))
            logservice.flush()
            indexes = pro.get_put_index()
            pro.index(indexes)
            docs = ndb.get_multi(pro.documents)
            docs.append(pro.distilled_document.get())
            for doc in docs:
                doc.index(indexes)
            children = ndb.get_multi(pro.children)
            for child in children:
                if child:
                    child.index_phrasings(indexes, index_children=True)
            count += 1
        log.info('Finished indexing')
        logservice.flush()