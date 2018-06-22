import re
from google.appengine.ext import ndb

from server import ttindex
from artifact import Artifact, SecureArtifact, Permission

import nltk
nltk.data.path.append('lib/nltk_data')

__all__ = [
    'Phrasing',
]


ENGLISH_ARTICLES = [
    'a',
    'an',
    'the',
    'some',
    'any',
    'either',
]


DISTILL_THRESHOLD = 12
ARTICLE_THRESHOLD = 9
CAPITALIZE_NONE = 0
CAPITALIZE_FIRST = 1
CAPITALIZE_TITLE = 2
CAPITALIZE_UPPER = 3
CAPITALIZE_LOWER = 4


class Phrasing(SecureArtifact):
    concept = ndb.KeyProperty(kind='Concept', required=True)
    originating_document = ndb.KeyProperty(kind='Document')
    text = ndb.TextProperty(required=True)
    operations_list = ['admin', 'read', 'write']

    def delete(self, concept, user):
        if self.key in concept.phrasings:
            concept.phrasings.remove(self.key)

        for sp in ndb.get_multi(concept.selected_phrasings):
            if sp.phrasing == self.key:
                concept.selected_phrasings.remove(sp.key)
                sp.key.delete()

        concept.put()
        projects = [concept.project.get()]

        sel_phr = ndb.get_multi(concept.selected_phrasings)
        for sp in sel_phr:
            if sp.phrasing == self.key:
                project = sp.document.project.get()
                if project not in projects:
                    projects.append(project)

        self.permissions.delete()
        self.key.delete()

        indexes = user.get_indexes(create_new=False)
        self.index_delete(indexes)

    def index_delete(self, indexes):
        ttindex.index_delete(indexes, self.key.id())

    # Phrasing do not keep their own parent_perm list, they just use their concept list instead.
    def refresh_permission_inheritance(self, inherited_perms=None):
        perm_obj = self.permissions.get()
        concept = self.concept.get()
        operations_list = self.get_operations_list()

        permissions = {}
        for op in operations_list:
            permissions[op] = {"shared": {}, "required": {}}

        parent_perm = ndb.get_multi(concept.parent_perms)
        parent_perm.append(concept.permissions.get())

        ori_doc = self.originating_document.get()
        if not ori_doc:
            ori_doc = self.project.get().distilled_document.get()

        parent_perm.append(ori_doc.permissions.get())
        parent_perm.append(perm_obj)

        for pp in parent_perm:
            for op in operations_list:
                if op not in pp.permissions:
                    op = self.get_alternative_perm(op)
                if op is None:
                    continue

                for group in pp.permissions[op]['shared'].keys():
                    permissions[op]['shared'][group] = pp.permissions[op]['shared'][group]

                for group in pp.permissions[op]['required'].keys():
                    permissions[op]['required'][group] = pp.permissions[op]['required'][group]

        perm_obj.calculated_permissions = permissions

    def get_parent(self):
        return self.concept.get()

    def get_index_doc(self, project=None, concept=None):
        if not concept:
            concept = self.concept.get()
        if not project:
            project = concept.project

        sel_phr = concept.get_selected_phrasing(phrasing=self)
        docs = ''

        for sp in sel_phr:
            docs += sp.document.id() + ' '

        fields = [
            ttindex.ATOMFIELD, 'typ', 'phr',
            ttindex.TEXTFIELD, 'phr', self.text,
            ttindex.ATOMFIELD, 'pro', project.id(),
            ttindex.ATOMFIELD, 'con', concept.key.id(),
            ttindex.DATEFIELD, 'date', self.created_ts,
        ]

        return self.key.id(), fields

    def index(self, index_, project=None, concept=None):
        id_, fields = self.get_index_doc(project=project, concept=concept)
        ttindex.index_artifact(index_, id_, fields)

    def get_word_count(self):
        words = self.text.split(' ')
        count = 0

        for word in words:
            if word.rstrip() != '':
                count += 1

        return count

    @staticmethod
    def index_multi(models, user):
        index = user.get_put_index()
        for m in models:
            if isinstance(m, Phrasing):
                m.index(index)

    @property
    def node_type(self):
        return 'Phrasing'

    def to_dict(self, user):
        d = super(Phrasing, self).to_dict(user)
        del d['originating_document']

        d['concept'] = d['concept'].id()
        ori_doc = self.originating_document.get()
        if not ori_doc:
            ori_doc = self.project.get().distilled_document.get()
        d['originating_document_perms'] = Permission.remove_hidden_groups(
            user, ori_doc.permissions.get().permissions)

        return d


def distill_with_threshold(text, capitalization=CAPITALIZE_FIRST):
    """
    Distill a string if over the defined threshold length (DISTILL_THRESHOLD).
    Will first try to make string shorter by removing articles, if still over ARTICLE_THRESHOLD, will distill
    :param text:
    :param capitalization: type of capitalization (CAPITALIZE_NONE, CAPITALIZE_FIRST, CAPITALIZE_TITLE,
    CAPITALIZE_UPPER, CAPITALIZE_LOWER)

    :return:
    """
    words = nltk.word_tokenize(text)
    count = len(words)

    if count > DISTILL_THRESHOLD:
        no_articles = remove_articles(words)
        if len(no_articles) > ARTICLE_THRESHOLD:
            text = distill_words(no_articles)
        else:
            text = " ".join(no_articles)

    text = text.strip()
    if not text:
        return ""

    return capitalize(text, capitalization)


def distill_text(text, capitalization=CAPITALIZE_FIRST):
    """
    Distill a string of text
    :param text:
    :return:
    """
    words = nltk.word_tokenize(text)
    distilled = distill_words(words)
    return capitalize(distilled, capitalization)


def capitalize(text, capitalization):
    if capitalization == CAPITALIZE_FIRST:
        output = text.capitalize()
    elif capitalization == CAPITALIZE_TITLE:
        output = text.title()
    elif capitalization == CAPITALIZE_UPPER:
        output = text.upper()
    elif capitalization == CAPITALIZE_LOWER:
        output = text.lower()
    else:
        output = text
    return output


def distill_words(words):
    """
    Distill list of words and output as string
    :param words:
    :return:
    """
    tagged_words = nltk.pos_tag(words)

    verb_count = 0
    noun_encountered = False
    dt_count = 0

    out = []
    for item in tagged_words:
        tag = item[1]
        word = item[0]

        # if we've already established some phrasing, we don't need any more _and_
        if tag == 'CC' and verb_count > 0 and noun_encountered:
            break

        # existential there, cardinal numbers, coordinating conjunctions
        if tag == 'EX' or tag == 'CD' or tag == 'CC':
            out.append(word)

        # determiner (the, some)
        if tag.startswith('DT'):
            out.append(word)
            dt_count += 1

        if tag == 'RB' or tag == 'MD':
            out.append(word)

        # all nouns
        if tag.startswith('N'):
            out.append(word)
            if verb_count > 1 and noun_encountered:
                break
            noun_encountered = True

        # all pronouns
        if tag.startswith('PR') or tag.startswith('PP'):
            out.append(word)
            noun_encountered = True

        # prepositions
        if tag.startswith('IN') and noun_encountered:
            out.append(word)

        # to
        if tag.startswith('TO'):
            out.append(word)

        # all verbs
        if tag.startswith('V'):
            out.append(word)
            verb_count += 1

        # all adjectives
        if tag.startswith('J'):
            out.append(word)

    return " ".join(out)


def remove_articles(words):
    out = []
    for word in words:
        if word not in ENGLISH_ARTICLES:
            out.append(word)
    return out
