from google.appengine.ext import ndb

import artifact
from server import ttindex, create_uuid

__all__ = [
    'AnnotationComment',
    'Marker',
]


class AnnotationComment(ndb.Model):
    created_ts = ndb.DateTimeProperty(auto_now_add=True)
    modified_ts = ndb.DateTimeProperty(auto_now=True)
    ts = ndb.DateTimeProperty(auto_now_add=True)
    user = ndb.KeyProperty()
    comment = ndb.StringProperty()


class Marker(artifact.Artifact):
    # anno: Annotations
    # bkm: Bookmark
    organization = ndb.KeyProperty()
    type = ndb.StringProperty(choices=['anno', 'bkm'])
    document = ndb.KeyProperty()
    concept = ndb.KeyProperty()
    comments = ndb.StructuredProperty(AnnotationComment, repeated=True)

    def get_all_comments_index_doc(self):
        concept = self.concept.get()
        project = concept.project
        docs = []
        ids = []
        for comment in self.comments:
            fields = [
                ttindex.ATOMFIELD, 'typ', 'anno_reply',
                ttindex.ATOMFIELD, 'anno', self.key.id(),
                ttindex.TEXTFIELD, 'reply', comment.comment,
                ttindex.ATOMFIELD, 'pro', project.id(),
                ttindex.ATOMFIELD, 'con', concept.key.id(),
                ttindex.DATEFIELD, 'date', comment.created_ts,
            ]
            docs.append(fields)
            ids.append(self.key.id())
        return ids, docs

    def get_comment_index_doc(self, comment):
        concept = self.concept.get()
        project = concept.project
        fields = [
            ttindex.ATOMFIELD, 'typ', 'anno_reply',
            ttindex.ATOMFIELD, 'anno', self.key.id(),
            ttindex.TEXTFIELD, 'reply', comment.comment,
            ttindex.ATOMFIELD, 'pro', project.id(),
            ttindex.ATOMFIELD, 'doc', self.document.id(),
            ttindex.ATOMFIELD, 'con', concept.key.id(),
            ttindex.DATEFIELD, 'date', comment.created_ts,
        ]
        return create_uuid(), fields

    def index_all_comments(self, index_):
        ids, docs = self.get_all_comments_index_doc()
        ttindex.index_multi_artifact(index_, ids, docs)

    def index_comment(self, index_, comment):
        id_, doc = self.get_comment_index_doc(comment)
        ttindex.index_artifact(index_, id_, doc)

    def to_dict(self):
        d = super(Marker, self).to_dict()
        if self.organization:
            d['organization'] = self.organization.id()
        d['document'] = self.document.id()
        d['concept'] = self.concept.id()
        d['path'] = []
        concept = self.concept.get()
        if concept:
            perms = ndb.get_multi(concept.parent_perms)
            for perm in perms:
                d['path'].insert(0, perm.artifact.id())
        d['comments'] = []
        for comment in self.comments:
            d['comments'].append({'username': comment.user.get().username,
                                  'comment': comment.comment})
        return d