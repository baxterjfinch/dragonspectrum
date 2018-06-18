from artifact import Artifact
from google.appengine.ext import ndb

__all__ = [
    'ChatMessage',
]


class ChatMessage(Artifact):
    user = ndb.KeyProperty()
    document = ndb.KeyProperty(kind='Document', required=True)
    message = ndb.StringProperty()

    def to_dict(self):
        d = super(ChatMessage, self).to_dict()
        d['user'] = self.user.id()
        if self.document:
            d['document'] = self.document.id()
            d['type'] = 'doc_chat'

        return d