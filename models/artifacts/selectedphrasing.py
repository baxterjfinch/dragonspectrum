import logging

from google.appengine.ext import ndb

from artifact import Artifact

__all__ = [
    'SelectedPhrasing',
    'SummarySelectedPhrasing',
    'PresentationSelectedPhrasing',
]


log = logging.getLogger('tt')


class SelectedPhrasing(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='Document', required=True)
    phrasing = ndb.KeyProperty(kind='Phrasing', required=True)

    def to_dict(self):
        d = super(SelectedPhrasing, self).to_dict()
        if self.concept:
            d['concept'] = d['concept'].id()
        if self.document:
            d['document'] = d['document'].id()
        if self.phrasing:
            d['phrasing'] = d['phrasing'].id()
        return d


class SummarySelectedPhrasing(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='SummaryDocument', required=True)
    phrasing = ndb.KeyProperty(kind='Phrasing', required=True)

    def to_dict(self):
        d = super(SummarySelectedPhrasing, self).to_dict()
        if self.concept:
            d['concept'] = d['concept'].id()
        if self.document:
            d['document'] = d['document'].id()
        if self.phrasing:
            d['phrasing'] = d['phrasing'].id()
        return d


class PresentationSelectedPhrasing(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='PresentationDocument', required=True)
    phrasing = ndb.KeyProperty(kind='Phrasing', required=True)

    def to_dict(self):
        d = super(PresentationSelectedPhrasing, self).to_dict()
        if self.concept:
            d['concept'] = d['concept'].id()
        if self.document:
            d['document'] = d['document'].id()
        if self.phrasing:
            d['phrasing'] = d['phrasing'].id()
        return d