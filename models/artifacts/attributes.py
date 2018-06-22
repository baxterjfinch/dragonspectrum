from google.appengine.ext import ndb
from artifact import Artifact

__all__ = [
    'Attributes',
]

HEADER = 'h'
NOHEADER = 'noh'
PARAGRAPH = 'p'
ORDERED_LIST = 'ol'
UNORDERED_LIST = 'ul'
NOLIST = 'nol'
LIST_ITEM = 'li'
IMAGE = 'img'
NONE = 'none'


class Attributes(Artifact):
    concept = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='Document', required=True)
    attributes = ndb.StringProperty(repeated=True)

    def delete(self):
        self.key.delete()

    def has_attribute(self, attr):
        if attr in self.attributes:
            return True
        return False

    def is_header(self):
        return self.has_attribute(HEADER)

    def is_no_header(self):
        return self.has_attribute(NOHEADER)

    def is_paragraph(self):
        return self.has_attribute(PARAGRAPH)

    def is_ordered_list(self):
        return self.has_attribute(ORDERED_LIST)

    def is_unordered_list(self):
        return self.has_attribute(UNORDERED_LIST)

    def is_no_list(self):
        return self.has_attribute(NOLIST)

    def is_list(self):
        return self.is_ordered_list() or self.is_unordered_list()

    def is_image(self):
        return self.has_attribute(IMAGE)

    def to_dict(self):
        d = super(Attributes, self).to_dict()
        if d['concept']:
            d['concept'] = d['concept'].id()
        if d['document']:
            d['document'] = d['document'].id()
        return d
