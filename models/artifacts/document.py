import logging

from google.appengine.ext import ndb

import artifact
from server import ttindex

__all__ = [
    'Document',
    'SummaryDocument',
    'PresentationDocument',
]

log = logging.getLogger('tt')


class Document(artifact.SecureArtifact):
    title = ndb.StringProperty()
    subtitle = ndb.StringProperty()
    author = ndb.StringProperty()  # TODO: Is this really needed? if so should be User.key
    version = ndb.StringProperty()
    date = ndb.StringProperty()  # FIXME: This should be a datetime field
    copyright_text = ndb.StringProperty()
    description = ndb.StringProperty()
    summary_document = ndb.KeyProperty()
    presentation_document = ndb.KeyProperty()
    published = ndb.KeyProperty(repeated=True)
    summary_published = ndb.KeyProperty(repeated=True)
    presentation_published = ndb.KeyProperty(repeated=True)
    operations_list = ['admin', 'read', 'write', 'manage_phrasings', 'set_crawlcontext', 'annotation_read',
                       'annotation_write', 'bookmark_read', 'bookmark_write']

    def is_distilled_document(self):
        pro = self.project.get()
        if pro.distilled_document == self.key:
            return True
        return False

    def get_alternative_perm(self, perm):
        if (perm == 'manage_phrasings' or perm == 'set_crawlcontext' or
                perm == 'annotation_write' or perm == 'bookmark_write'):
            return 'write'
        if perm == 'annotation_read' or perm == 'bookmark_read':
            return 'read'
        return perm

    def get_parent(self):
        if self.is_distilled_document():
            return self.project.get()
        return self.project.get().distilled_document.get()

    def get_index_doc(self):
        fields = [
            ttindex.ATOMFIELD, 'typ', 'doc',
            ttindex.TEXTFIELD, 'title', self.title,
            ttindex.TEXTFIELD, 'sub_title', self.subtitle,
            ttindex.TEXTFIELD, 'auth', self.author,
            ttindex.TEXTFIELD, 'ver', self.version,
            ttindex.TEXTFIELD, 'date', self.date,
            ttindex.TEXTFIELD, 'cpr', self.copyright_text,
            ttindex.TEXTFIELD, 'dsc', self.description,
            ttindex.ATOMFIELD, 'pro', self.project.id(),
        ]
        return self.key.id(), fields

    def get_published(self, group=None):
        if group is None:
            return ndb.get_multi(self.published)

        gp = []
        pubs = ndb.get_multi(self.published)
        for pub in pubs:
            if pub is not None and pub.group == group.key:
                gp.append(pub)
        return gp

    def get_summary_published(self, group=None):
        if group is None:
            return ndb.get_multi(self.summary_published)

        gp = []
        pubs = ndb.get_multi(self.summary_published)
        for pub in pubs:
            if pub is not None and pub.group == group.key:
                gp.append(pub)
        return gp

    def get_presentation_published(self, group=None):
        if group is None:
            return ndb.get_multi(self.presentation_published)

        gp = []
        pubs = ndb.get_multi(self.presentation_published)
        for pub in pubs:
            if pub is not None and pub.group == group.key:
                gp.append(pub)
        return gp

    def index(self, index_):
        id_, fields = self.get_index_doc()
        ttindex.index_artifact(index_, id_, fields)

    def index_delete(self, indexes):
        ttindex.index_delete(indexes, self.key.id())

    def has_permission_bookmark_write(self, user):
        return self.has_permission(user, 'bookmark_write')

    def has_permission_bookmark_read(self, user):
        return self.has_permission(user, 'bookmark_read')

    def has_permission_annotation_read(self, user):
        return self.has_permission(user, 'annotation_read')

    def has_permission_annotation_write(self, user):
        return self.has_permission(user, 'annotation_write')

    def has_permission_set_crawlcontext(self, user):
        return self.has_permission(user, 'set_crawlcontext')

    def has_permission_manage_phrasings(self, user):
        return self.has_permission(user, 'manage_phrasings')

    @property
    def node_type(self):
        return 'Document'

    def to_dict(self, user):
        d = super(Document, self).to_dict(user)

        if self.summary_document:
            d['summary_document'] = self.summary_document.get()
            if d['summary_document']:
                d['summary_document'] = d['summary_document'].to_dict()
            else:
                logging.error('Found Dead Key: Document %s, SummaryDocument: %s' %
                              (self.id, self.summary_document.id()))
        else:
            d['summary_document'] = None

        if self.presentation_document:
            d['presentation_document'] = self.presentation_document.get()
            if d['presentation_document']:
                d['presentation_document'] = d['presentation_document'].to_dict()
            else:
                logging.error('Found Dead Key: Document %s, PresentationDocument: %s' %
                              (self.id, self.summary_document.id()))
        else:
            d['presentation_document'] = None

        d['published'] = []
        published = ndb.get_multi(self.published)
        for pub in published:
            if pub is not None:
                d['published'].append(pub.to_dict(html=False))

        d['summary_published'] = []
        published = ndb.get_multi(self.summary_published)
        for pub in published:
            if pub is not None:
                d['summary_published'].append(pub.to_dict(html=False))

        d['presentation_published'] = []
        published = ndb.get_multi(self.presentation_published)
        for pub in published:
            if pub is not None:
                d['presentation_published'].append(pub.to_dict(html=False))

        # Need to repair document parent permissions
        # This will need remove in the future after all
        # "old" documents are repaired
        if len(self.parent_perms) == 0:
            pro = self.project.get()
            if self.key == pro.distilled_document:
                self.parent_perms = [pro.permissions]
            else:
                self.parent_perms = [pro.permissions, pro.distilled_document.get().permissions]
            self.put()

        return d


class SummaryDocument(artifact.Artifact):
    document = ndb.KeyProperty()
    word_count = ndb.IntegerProperty(default=250)

    def to_dict(self):
        d = super(SummaryDocument, self).to_dict()

        d['document'] = None
        if self.document:
            d['document'] = self.document.id()

        return d


class PresentationDocument(artifact.Artifact):
    document = ndb.KeyProperty()
    word_count = ndb.IntegerProperty(default=250)

    def to_dict(self):
        d = super(PresentationDocument, self).to_dict()

        d['document'] = None
        if self.document:
            d['document'] = self.document.id()

        return d
