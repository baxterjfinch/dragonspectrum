from artifact import Artifact
from google.appengine.ext import ndb
from google.appengine.api import memcache

__all__ = [
    'PublishDocument',
    'PublishSummary',
    'PublishPresentation',
]


class PublishEntity(Artifact):
    html = ndb.TextProperty()
    document = ndb.KeyProperty()
    group = ndb.KeyProperty()
    version = ndb.StringProperty()
    version_int = ndb.IntegerProperty()
    owner = ndb.KeyProperty(repeated=True)
    organization = ndb.KeyProperty()

    memcache_namespace = None

    def cache(self, latest=False):
        memcache.set('%s-%s-%s' % (self.document.id(), self.group.id(), self.version),
                     self, namespace=self.memcache_namespace)
        if latest:
            memcache.set('%s-%s-%s' % (self.document.id(), self.group.id(), 'latest'),
                         self, namespace=self.memcache_namespace)

    def delete_memcache(self):
        memcache.delete('%s-%s-%s' % (self.document.id(), self.group.id(), self.version),
                        namespace=self.memcache_namespace)
        memcache.delete('%s-%s-%s' % (self.document.id(), self.group.id(), 'latest'),
                        namespace=self.memcache_namespace)

    def to_dict(self, html=True):
        d = super(PublishEntity, self).to_dict()
        d['document'] = self.document.id()
        d['group'] = self.group.id()
        d['owner'] = []

        for owner in self.owner:
            d['owner'].append(owner.id())
        if d['organization']:
            d['organization'] = d['organization'].id()
        if not html:
            del d['html']

        return d

    @classmethod
    def get(cls, document, group, version):
        p = memcache.get('%s-%s-%s' % (document.id, group.id, version), namespace=cls.memcache_namespace)
        if p is None:
            pubs = cls.get_published(document, group=group)
            if len(pubs) != 0:
                if version == 'latest':
                    largest = pubs[0]
                    for pub in pubs:
                        if pub.version_int > largest.version_int:
                            largest = pub
                    p = largest
                else:
                    for pub in pubs:
                        if pub.version == version:
                            p = pub
                            break
            if p:
                p.cache(latest=True if version == 'latest' else False)
        return p

    @classmethod
    def get_published(cls, doc, group=None):
        return []

    @classmethod
    def _pre_delete_hook(cls, key):
        pub = key.get()
        if pub:
            pub.delete_memcache()
            doc = pub.document.get()
            if doc:
                if pub.key in doc.published:
                    doc.published.remove(pub.key)
                    doc.put()

    @staticmethod
    def get_largest_version(pubs):
        if len(pubs) > 0:
            largest = pubs[0]
            for pub in pubs:
                if pub.version_int > largest.version_int:
                    largest = pub
            return largest.version_int
        return None


class PublishDocument(PublishEntity):
    memcache_namespace = 'document_publish'

    @classmethod
    def get_published(cls, doc, group=None):
        return doc.get_published(group=group)


class PublishSummary(PublishEntity):
    word_count = ndb.IntegerProperty()
    memcache_namespace = 'summary_publish'

    @classmethod
    def get_published(cls, doc, group=None):
        return doc.get_summary_published(group=group)


class PublishPresentation(PublishEntity):
    slide_count = ndb.IntegerProperty()
    min_bullet = ndb.IntegerProperty()
    max_bullet = ndb.IntegerProperty()
    memcache_namespace = 'presentation_publish'

    @classmethod
    def get_published(cls, doc, group=None):
        return doc.get_presentation_published(group=group)
