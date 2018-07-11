from google.appengine.ext import ndb

from artifact import SecureArtifact, Permission

__all__ = [
    'ArtifactNotFoundException',
    'Transaction',
    'ACTIONS',
]


class ArtifactNotFoundException(Exception):
    pass


ACTIONS = [
    # Project
    'pro_perm_add',
    'pro_perm_rmv',
    'pro_grp_rmv',
    'pro_new',
    'pro_del',
    'pro_title',
    'pro_attr_add',
    'pro_attr_chg',
    'pro_attr_rmv',
    'pro_up_vote',
    'pro_down_vote',

    # Document
    'doc_new',
    'doc_del',
    'doc_perm_add',
    'doc_perm_rmv',
    'doc_grp_rmv',
    'doc_edit',
    'doc_act',
    'doc_published',
    'sum_published',
    'pres_published',

    # Concept
    'con_act',
    'con_new',
    'con_del',
    'con_mov',
    'con_hid',
    'con_shw',
    'con_lnk',
    'con_attr_add',
    'con_attr_rmv',
    'con_attr_chg',
    'con_perm_add',
    'con_perm_rmv',
    'con_grp_rmv',

    # LinkedConcept
    'lnk_new',
    'lnk_del',
    'lnk_mov',
    'lnk_perm_add',
    'lnk_perm_rmv',
    'lnk_grp_rmv',

    # Phrasing
    'phr_new',
    'phr_del',
    'phr_edt',
    'phr_chg',
    'phr_perm_add',
    'phr_perm_rmv',
    'phr_grp_rmv',

    # Annotation
    'anno_new',
    'anno_del',
    'anno_rply',
]


class Transaction(SecureArtifact):
    user = ndb.KeyProperty()
    artifact = ndb.KeyProperty()
    action = ndb.StringProperty(choices=ACTIONS)
    action_data = ndb.JsonProperty()
    undone = ndb.BooleanProperty(default=False)

    def __init__(self, *args, **kwargs):
        document = None
        if 'document' in kwargs:
            document = kwargs['document']
            del kwargs['document']

        super(Transaction, self).__init__(*args, **kwargs)
        self.key = Transaction.create_key()

        if self.artifact:
            art = self.artifact.get()

            if 'project' in kwargs:
                self.project = kwargs['project']
            elif art.project:
                self.project = art.project

            if hasattr(art, 'operations_list'):
                self.owner = art.owner
                self.operations_list = art.operations_list
                perm = art.get_permission_object()

            elif document:
                self.organization = document.organization
                self.owner = document.owner
                self.operations_list = document.operations_list
                perm = document.get_permission_object()

            else:
                return

            perms = Permission(
                key=Permission.create_key(),
                permissions=perm.calculated_permissions,
                project=self.project,
                artifact=self.key
            )
            perms.put()
            self.permissions = perms.key

    def undo(self):
        artifact = self.artifact.get()
        if not artifact:
            raise ArtifactNotFoundException()
        artifact.undo_trans(self)

    def to_dict(self, user):
        d = super(Transaction, self).to_dict(user)
        if self.user:
            d['user'] = self.user.id()
        if self.artifact:
            d['artifact'] = self.artifact.id()
        if self.organization:
            d['organization'] = self.organization.id()

        d['owner'] = []
        for o in self.owner:
            d['owner'].append(o.id())

        return d
