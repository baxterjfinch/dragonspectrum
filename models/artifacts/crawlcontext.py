from artifact import Artifact
from google.appengine.ext import ndb

__all__ = [
    'CrawlContext',
    'SummaryCrawlContext',
    'PresentationCrawlContext',
]


class CrawlContext(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='Document', required=True)
    crawl = ndb.BooleanProperty(required=True)

    def to_dict(self):
        d = super(CrawlContext, self).to_dict()
        if d['concept']:
            d['concept'] = d['concept'].id()
        if d['document']:
            d['document'] = d['document'].id()
        return d


class SummaryCrawlContext(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='SummaryDocument', required=True)
    crawl = ndb.BooleanProperty(required=True)

    def to_dict(self):
        d = super(SummaryCrawlContext, self).to_dict()
        if d['concept']:
            d['concept'] = d['concept'].id()
        if d['document']:
            d['document'] = d['document'].id()
        return d


class PresentationCrawlContext(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='PresentationDocument', required=True)
    crawl = ndb.BooleanProperty(required=True)

    def to_dict(self):
        d = super(PresentationCrawlContext, self).to_dict()
        if d['concept']:
            d['concept'] = d['concept'].id()
        if d['document']:
            d['document'] = d['document'].id()
        return d