import logging
import datetime

from google.appengine.ext import ndb
from cerberus import handlers as cerberus_handlers

from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException
from models.artifacts import CrawlContext, Concept, Document, \
    ChannelToken, Transaction, SummaryCrawlContext, PresentationCrawlContext

__all__ = [
    'CrawlContextHandler',
    'SummaryCrawlContextHandler',
    'PresentationCrawlContextHandler',
]


log = logging.getLogger('tt')


class CrawlContextHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, concept_id=None):
        if not concept_id and not Concept.valid_id(concept_id):
            raise HttpErrorException.bad_request('invalid concept id')

        concept = Concept.get_by_id(concept_id)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not self.json_request.get('document_id') and not Document.valid_id(self.json_request.get('document_id')):
            raise HttpErrorException.bad_request('invalid document id')

        document = Document.get_by_id(self.json_request.get('document_id'))
        if not document:
            raise HttpErrorException.bad_request('invalid document  id')
        if not document.has_permission_set_crawlcontext(self.user):
            raise HttpErrorException.forbidden()

        project = document.project.get()
        if not isinstance(self.json_request.get('crawl'), bool):
            raise HttpErrorException.bad_request('invalid crawl')

        crawlcontexts = ndb.get_multi(concept.crawlcontext)
        for crawl in crawlcontexts:
            if crawl.document == document.key:
                crawl.crawl = self.json_request.get('crawl')
                crawl.put()
                crawlcontext = crawl
                break
        else:
            crawl = CrawlContext(
                key=CrawlContext.create_key(),
                project=project.key,
                document=document.key,
                crawl=self.json_request.get('crawl')
            )
            crawl.put()
            concept.crawlcontext.append(crawl.key)
            concept.put()
            crawlcontext = crawl

        project.pw_modified_ts = datetime.datetime.now()
        project.put()

        self.get_analytic_session()
        if crawl.crawl:
            concept.record_analytic('con_cc_t', self.analytic_session)
        else:
            concept.record_analytic('con_cc_f', self.analytic_session)

        action = 'con_hid'
        if self.json_request.get('crawl'):
            action = 'con_shw'

        action_data = {
            'concept': concept.key.id(),
            'document': document.key.id()
        }

        trans = Transaction(action=action, user=self.user.key, artifact=crawlcontext.key,
                            project=project.key, document=document, action_data=action_data)
        trans.put()

        self.get_channel_token()
        channel_tokens = ChannelToken.get_by_project_key(project.key, self.user_channel_token)
        channel_tokens = ChannelToken.remove_unauthorized_users(channel_tokens, [concept, document])
        message = {
            'user': self.get_user_channel_data(),
            'transaction': trans.to_dict(self.user)
        }
        ChannelToken.broadcast_message(channel_tokens, message)

    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()


class SummaryCrawlContextHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, concept_id=None):
        if not concept_id and not Concept.valid_id(concept_id):
            raise HttpErrorException.bad_request('invalid concept id')

        concept = Concept.get_by_id(concept_id)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not self.json_request.get('document_id') and not Document.valid_id(self.json_request.get('document_id')):
            raise HttpErrorException.bad_request('invalid document id')

        document = Document.get_by_id(self.json_request.get('document_id'))
        if not document:
            raise HttpErrorException.bad_request('invalid document  id')
        if not document.has_permission_set_crawlcontext(self.user):
            raise HttpErrorException.forbidden()

        if document.summary_document is None:
            raise HttpErrorException.bad_request('document has not summary')
        summary_document = document.summary_document.get()
        if document.summary_document is None:
            raise HttpErrorException.bad_request('document has not summary')

        project = document.project.get()
        if not isinstance(self.json_request.get('crawl'), bool):
            raise HttpErrorException.bad_request('invalid crawl')

        crawlcontexts = ndb.get_multi(concept.summary_crawlcontext)

        temp = self.json_request.get('temp', None)
        if temp is None:
            raise HttpErrorException.bad_request('no temp giving')

        if temp:
            for crawl in crawlcontexts:
                if crawl.document == document.key:
                    concept.summary_crawlcontext.remove(crawl.key)
                    concept.put()
                    crawl.key.delete()
                    break

        else:
            for crawl in crawlcontexts:
                if crawl.document == summary_document.key:
                    crawl.crawl = self.json_request.get('crawl')
                    crawl.put()
                    break
            else:
                crawl = SummaryCrawlContext(
                    key=SummaryCrawlContext.create_key(),
                    project=project.key,
                    document=document.key,
                    crawl=self.json_request.get('crawl')
                )
                crawl.put()

                concept.summary_crawlcontext.append(crawl.key)
                concept.put()

        project.pw_modified_ts = datetime.datetime.now()
        project.put()

    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()


class PresentationCrawlContextHandler(AuthorizationRequestHanlder):
    @cerberus_handlers.enable_json(True)
    @cerberus_handlers.exception_callback
    def post(self, concept_id=None):
        if not concept_id and not Concept.valid_id(concept_id):
            raise HttpErrorException.bad_request('invalid concept id')

        concept = Concept.get_by_id(concept_id)
        if not concept:
            raise HttpErrorException.bad_request('invalid concept id')
        if not self.json_request.get('document_id') and not Document.valid_id(self.json_request.get('document_id')):
            raise HttpErrorException.bad_request('invalid document id')

        document = Document.get_by_id(self.json_request.get('document_id'))
        if not document:
            raise HttpErrorException.bad_request('invalid document  id')
        if not document.has_permission_set_crawlcontext(self.user):
            raise HttpErrorException.forbidden()

        if document.presentation_document is None:
            raise HttpErrorException.bad_request('document has not summary')

        presentation_document = document.presentation_document.get()
        if document.presentation_document is None:
            raise HttpErrorException.bad_request('document has not summary')

        project = document.project.get()
        if not isinstance(self.json_request.get('crawl'), bool):
            raise HttpErrorException.bad_request('invalid crawl')

        temp = self.json_request.get('temp', None)
        if temp is None:
            raise HttpErrorException.bad_request('no temp giving')

        crawlcontexts = ndb.get_multi(concept.presentation_crawlcontext)
        if temp:
            for crawl in crawlcontexts:
                if crawl.document == presentation_document.key:
                    concept.presentation_crawlcontext.remove(crawl.key)
                    concept.put()
                    crawl.key.delete()
                    break

        else:
            for crawl in crawlcontexts:
                if crawl.document == presentation_document.key:
                    crawl.crawl = self.json_request.get('crawl')
                    crawl.put()
                    break
            else:
                crawl = PresentationCrawlContext(
                    key=PresentationCrawlContext.create_key(),
                    project=project.key,
                    document=presentation_document.key,
                    crawl=self.json_request.get('crawl')
                )
                crawl.put()

                concept.presentation_crawlcontext.append(crawl.key)
                concept.put()

        project.pw_modified_ts = datetime.datetime.now()
        project.put()

    def on_authentication_fail(self, method):
        raise HttpErrorException.unauthorized()
