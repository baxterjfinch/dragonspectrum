import logging

from google.appengine.ext import ndb
from google.appengine.api import logservice
from google.appengine.api import background_thread
from cerberus import handlers as cerberus_handlers
from server.handlers import AuthorizationRequestHanlder
from server.httperrorexception import HttpErrorException

from models.artifacts import Project, Concept

__all__ = [
    'MigrationHandler',
]

log = logging.getLogger(__file__)


def _do_migration():
    log.info('Starting Datastore Migration')
    logservice.flush()
    projects = {}
    concept_count = Concept.query().count()
    concepts = Concept.query()
    index = 1
    logservice.flush()
    for concept in concepts.iter():
        if index % 50 == 0:
            log.info('%s concepts finished of %s' % (index, concept_count))
            logservice.flush()
        project = projects.get(concept.project.id(), None)
        if not project:
            project = concept.project.get()
            if not project:
                if len(concept.phrasings) > 0:
                    perms = []
                    phrasings = ndb.get_multi(concept.phrasings)
                    for phrase in phrasings:
                        if phrase:
                            perms.append(phrase.permissions)
                    ndb.delete_multi(concept.phrasings)
                    ndb.delete_multi(perms)

                if len(concept.selected_phrasings) > 0:
                    ndb.delete_multi(concept.selected_phrasings)

                if len(concept.attributes) > 0:
                    ndb.delete_multi(concept.attributes)

                if len(concept.crawlcontext) > 0:
                    ndb.delete_multi(concept.crawlcontext)

                if len(concept.linkes) > 0:
                    links = ndb.get_multi(concept.linkes)
                    for link in links:
                        if link:
                            link.delete(None, False, True)

                if concept.media_blob is not None:
                    concept.delete_media()

                concept.distilled_phrasing.delete()
                concept.permissions.delete()
                concept.key.delete()
                continue

            projects[project.key.id()] = project
            perm = project.permissions.get()
            if not perm.project:
                perm.project = project.key
                perm.put()
            for doc in project.documents:
                d = doc.get()
                perm = d.permissions.get()
                if not perm.project:
                    perm.project = project.key
                    perm.put()
            d = project.distilled_document.get()
            perm = d.permissions.get()
            if not perm.project:
                perm.project = project.key
                perm.put()
        _fix_artifacts(concept, project)
        index += 1
    log.info('Finished Datastore Migration')
    logservice.flush()


def _fix_artifacts(concept, project):
    try:
        if not concept:
            return
        if not concept.project:
            concept.project = project.key
        if concept.distilled_phrasing not in concept.phrasings:
            concept.phrasings.append(concept.distilled_phrasing)
        concept.corrupted = False

        for key in concept.phrasings:
            if not key:
                concept.phrasings.remove(key)

        phrasings = ndb.get_multi(concept.phrasings)
        for phrase in phrasings:
            phrase.corrupted = False
            if not phrase.project:
                phrase.project = project.key
            if not phrase.originating_document:
                phrase.originating_document = project.distilled_document
        ndb.put_multi(phrasings)

        for key in concept.selected_phrasings:
            if not key:
                concept.selected_phrasings.remove(key)

        selected_phrasings = ndb.get_multi(concept.selected_phrasings)
        for sp in selected_phrasings:
            sp.concept = concept.key
            sp.corrupted = False
            if not sp.project:
                sp.project = project.key
        ndb.put_multi(selected_phrasings)

        for key in concept.crawlcontext:
            if not key:
                concept.crawlcontext.remove(key)

        crawlcontext = ndb.get_multi(concept.crawlcontext)
        for cc in crawlcontext:
            cc.concept = concept.key
            cc.corrupted = False
            if not cc.project:
                cc.project = project.key
        ndb.put_multi(crawlcontext)

        perm = concept.permissions.get()
        if not perm.project:
            perm.project = project.key
            perm.put()

        for key in concept.attributes:
            if not key:
                concept.attributes.remove(key)

        attributes = ndb.get_multi(concept.attributes)
        for attr in attributes:
            attr.concept = concept.key
            if 'p' in attr.attributes:
                attr.attributes.remove('p')
                if len(attr.attributes) == 0:
                    attr.key.delete()
                    concept.attributes.remove(attr.key)
                    attributes.remove(attr)
            if 'li' in attr.attributes:
                attr.attributes.remove('li')
                if len(attr.attributes) == 0:
                    attr.key.delete()
                    concept.attributes.remove(attr.key)
                    attributes.remove(attr)
            attr.corrupted = False
            if not attr.project:
                attr.project = project.key
        ndb.put_multi(attributes)

        concept.put()
    except Exception as e:
        log.error('Error: %s' % e.message)
        log.error('Concept: %s' % concept.key.id())
        raise


class MigrationHandler(AuthorizationRequestHanlder):
    def get(self, script=None):
        log.info('Background request received %s' % script)
        if not self.user.is_super_admin:
            raise HttpErrorException.not_found()
        if script == 'migration':
            log.info('Starting migration thread')
            t = background_thread.BackgroundThread(target=_do_migration)
            t.start()
            log.info('Started migration thread')
        log.info('Background request ended')



# if parent.children.index(concept.key) == 0:
#     return_status = False
#     if parent.node_type == 'Concept':
#         attributes = ndb.get_multi(parent.attributes)
#         for attr in attributes:
#             if 'ul' in attr.attributes or 'ol' in attr.attributes:
#                 if 'ul' in attr.attributes:
#                     attr.attributes.remove('ul')
#                     if len(concept.attributes) > 0:
#                         concept.attributes[0].attributes.append('ul')
#                     else:
#                         concept.attributes.append(Attributes(
#                             key=Attributes.create_key(), project=project.key,
#                             document=project.distilled_document.key, attributes=['ul']).put()
#                         )
#                 if 'ol' in attr.attributes:
#                     attr.attributes.remove('ol')
#                     if len(concept.attributes) > 0:
#                         concept.attributes[0].attributes.append('ol')
#                     else:
#                         concept.attributes.append(Attributes(
#                             key=Attributes.create_key(), project=project.key,
#                             document=project.distilled_document.key, attributes=['ol']).put()
#                         )
#                 attr.put()
#                 if len(attr.attributes) == 0:
#                     attr.key.delete()
#                     parent.attributes.remove(attr.key)
#                     attributes.remove(attr)
#                 children = parent.children[1:]
#                 parent.children = [parent.children[0]]
#                 parent.put()
#                 if not concept.children or len(concept.children) == 0:
#                     concept.children = children
#                 else:
#                     concept.children += children
#                 for child in children:
#                     child.parent = concept.key
#                     child.put()
#                 break
#         ndb.put_multi(attributes)