import re
import copy
import time
import logging

from google.appengine.ext import ndb
from google.appengine.api import memcache

import server
from server import config
from server.httperrorexception import HttpErrorException
from models.account.organization import Group
from models.analytic import Analytics


log = logging.getLogger('tt')
DATETIME_FORMATE = '%m/%d/%Y %H:%M:%S'


__all__ = [
    'MemcacheException',
    'BadIdException',
    'BrokenKeyException',
    'PermissionNotFoundException',
    'BadRuleException',
    'BadOperationException',
    'MissingKeyException',
    'CorruptedArtifactException',
    'Artifact',
    'SecureArtifact',
    'Permission',
    'ProjectNode',
]


class MemcacheException(Exception):
    pass


class BadIdException(Exception):
    pass


class BrokenKeyException(Exception):
    pass


class PermissionNotFoundException(Exception):
    pass


class BadRuleException(Exception):
    pass


class BadOperationException(Exception):
    pass


class MissingKeyException(Exception):
    pass


class CorruptedArtifactException(Exception):
    pass


class Artifact(ndb.Model):
    project = ndb.KeyProperty(kind='Project')
    created_ts = ndb.DateTimeProperty(auto_now_add=True)
    modified_ts = ndb.DateTimeProperty(auto_now=True)
    corrupted = ndb.BooleanProperty(default=False)

    @classmethod
    def create_key(cls, id_=None):
        return ndb.Key(cls.__name__, id_ if id_ else server.create_uuid())

    @staticmethod
    def create_uuid():
        return server.create_uuid()

    @staticmethod
    def valid_id(id_):
        # 32 characters for normal id 65 for linked_concept
        if not isinstance(id_, basestring) or (len(id_) != 32 and len(id_) != 65):
            return False
        # noinspection PyTypeChecker
        return True if (re.match(r'([a-fA-F\d]{32})', id_) or
                        re.match(r'([a-fA-F\d]{32}-[a-fA-F\d]{32})', id_)) else False

    @staticmethod
    def is_key_list(list_):
        if not isinstance(list_, list):
            raise ValueError('list_ is not a list')
        for item in list_:
            if not isinstance(item, ndb.Key):
                return False
        return True

    @property
    def node_type(self):
        return 'Artifact'

    @property
    def id(self):
        return self.key.id()

    def get_parent(self):
        pass

    def to_dict(self, *args, **kwargs):
        d = super(Artifact, self).to_dict(*args, **kwargs)
        d['id'] = self.key.id()
        if 'project' in d and d['project']:
            d['project'] = d['project'].id()

        d['created_ts'] = time.mktime(self.created_ts.timetuple()) * 1000
        d['modified_ts'] = time.mktime(self.modified_ts.timetuple()) * 1000
        return d


class SecureArtifact(Artifact):
    owner = ndb.KeyProperty(kind='User', repeated=True)
    permissions = ndb.KeyProperty(kind='Permission')
    parent_perms = ndb.KeyProperty(kind='Permission', repeated=True)
    organization = ndb.KeyProperty(kind='Organization')
    operations_list = None

    # Temps
    user = None

    @property
    def node_type(self):
        return 'SecureArtifact'

    def is_operation(self, permission):
        if permission in self.operations_list:
            return True
        return False

    def get_operations_list(self):
        return self.operations_list

    def get_alternative_perm(self, perm):
        return None

    def refresh_permission_inheritance(self, inherited_perms=None):
        perm_obj = self.permissions.get()
        operations_list = self.get_operations_list()

        permissions = {}
        for op in operations_list:
            permissions[op] = {"shared": {}, "required": {}}

        parent_perm = ndb.get_multi(self.parent_perms)
        parent_perm.append(perm_obj)

        for pp in parent_perm:
            for op in operations_list:
                pop = op

                if op not in pp.permissions:
                    pop = self.get_alternative_perm(op)
                if pop is None:
                    continue

                for group in pp.permissions[pop]['shared'].keys():
                    permissions[op]['shared'][group] = pp.permissions[pop]['shared'][group]

                for group in pp.permissions[pop]['required'].keys():
                    permissions[op]['required'][group] = pp.permissions[pop]['required'][group]

        perm_obj.calculated_permissions = permissions

    def get_permission_object(self):
        perm = self.permissions.get()

        if perm.calculated_permissions is None:
            self.refresh_permission_inheritance()

        return perm

    # Add new or replace existing permission
    def add_group_perm(self, group, operation, rule, required=False):
        if rule not in config.permission_rules:
            raise ValueError(str(rule) + ' is not a real rule')
        if not self.is_operation(operation):
            raise ValueError(str(operation) + ' is not an operation')

        if isinstance(group, Group):
            group_id = group.key.id()
        elif isinstance(group, ndb.Key):
            group_id = group.id()
            group = Group.get_by_id(group.id())
        elif isinstance(group, basestring):
            group = Group.get_by_id(group)
            if group is None:
                raise ValueError('invalid group id')
            group_id = group.key.id()
        else:
            raise ValueError('Need Group, Group key, or Group id')

        perm = self.get_permission_object()
        perm.old_permissions = copy.deepcopy(perm.calculated_permissions)

        if rule == 'inherit' or rule == 'none':  # inherit and none is the same as no rule at all
            self.remove_group_perm(group, operation, required)
        else:
            if required:
                if rule == 'deny':
                    raise ValueError('you can not set deny on required operations')
                perm.permissions[operation]['required'][group_id] = rule
            else:
                perm.permissions[operation]['shared'][group_id] = rule

        if self.node_type == 'Project':
            if self.key not in group.artifacts:
                group.artifacts.append(self.key)
                group.put()

        perm.calculated_permissions = None
        perm.put()
        return self.permissions

    def remove_group_perm(self, group, operation, required=False):
        if not self.is_operation(operation):
            raise ValueError(str(operation) + ' is not an operation')
        if isinstance(group, Group):
            group_id = group.key.id()
        elif isinstance(group, ndb.Key):
            group_id = group.id()
        elif isinstance(group, basestring):
            group = Group.get_by_id(group)
            if group is None:
                raise ValueError('invalid group id')
            group_id = group
        else:
            raise TypeError()

        perm = self.get_permission_object()
        if not perm.old_permissions:
            perm.old_permissions = copy.deepcopy(perm.calculated_permissions)
        if required:
            if group_id in perm.permissions[operation]['required']:
                del perm.permissions[operation]['required'][group_id]
        else:
            if group_id in perm.permissions[operation]['shared']:
                del perm.permissions[operation]['shared'][group_id]

        if self.node_type == 'Project':
            if not self.has_group_perms(group):
                if self.key in group.artifacts:
                    group.artifacts.remove(self.key)
                    group.put()

        perm.calculated_permissions = None
        perm.put()
        return perm

    def has_group_perms(self, group):
        perm_obj = self.permissions.get()
        for operation in self.get_operations_list():
            if group.key.id() in perm_obj.permissions[operation]['shared']:
                return True
            if group.key.id() in perm_obj.permissions[operation]['required']:
                return True
        return False

    def get_groups(self):
        perm_obj = self.permissions.get()
        groups = []
        for operation in self.get_operations_list():
            for group_id in perm_obj.permissions[operation]['shared'].keys():
                if group_id not in groups:
                    groups.append(Group.get_by_id(group_id))
            for group_id in perm_obj.permissions[operation]['required'].keys():
                if group_id not in groups:
                    groups.append(Group.get_by_id(group_id))
        return groups

    def get_group_perm(self, group, permission=None, required=False):
        if isinstance(group, Group):
            group_id = group.key.id()
        elif isinstance(group, ndb.Key):
            group_id = group.id()
        elif isinstance(group, basestring):
            group = Group.get_by_id(group)
            if group is None:
                raise BadIdException('Invalid Group ID: ' + str(group))
            group_id = group
        else:
            raise TypeError()

        perm = self.get_permission_object()
        group_perm = None

        if permission is None:
            for p in perm.permissions.keys():
                if required:
                    if group_id in perm.permissions[p]['required']:
                        group_perm[perm] = {'required': {group_id: perm.permissions[p][group_id]}}
                else:
                    if group_id in perm.permissions[p]['shared']:
                        group_perm[perm] = {'shared': {group_id: perm.permissions[p][group_id]}}
        else:
            if permission not in perm.permissions:
                raise PermissionNotFoundException('Permission ' + str(permission) + ' not found')
            elif required:
                if group_id in perm.permissions[permission]['required']:
                    return perm.permissions[permission]['required'][group_id]
            else:
                if group_id in perm.permissions[permission]['shared']:
                    return perm.permissions[permission]['shared'][group_id]
        return group_perm

    def had_permission(self, user, operation):
        perm_obj = self.get_permission_object()
        return self.has_permission(user, operation, permissions=perm_obj.old_permissions)

    def has_permission(self, user, operation, permissions=None):
        if user.is_world_user() and operation != 'read':
            return False

        if self.is_owner(user):
            return True

        if self.organization is not None:
            if self.organization.get().is_admin(user):
                return True

        if user.is_super_admin:
            return True

        user_groups = user.groups
        user_groups_id_list = server.get_ids_from_key_list(user_groups)

        perm_obj = self.get_permission_object()
        if not permissions:
            permissions = perm_obj.calculated_permissions

        # Check required permissions first
        required_operation_perm = permissions[operation]['required']
        if len(required_operation_perm.keys()) > 0:
            if not server.is_sub_list(required_operation_perm.keys(), user_groups_id_list):
                return False

        # Check share permissions next
        shared_operation_perm = permissions[operation]['shared']
        if len(shared_operation_perm.keys()) > 0:
            if not server.has_intersection(user_groups_id_list, shared_operation_perm.keys()):
                return False
            groups = server.get_intersection(user_groups_id_list, shared_operation_perm.keys())
            for group in groups:
                if shared_operation_perm[group] == 'allow':
                    return True
        else:
            return False
        return False

    def has_permission_read(self, user):
        return self.has_permission(user, 'read')

    def has_permission_write(self, user):
        return self.has_permission(user, 'write')

    def has_permission_admin(self, user):
        return self.has_permission(user, 'admin')

    def had_permission_read(self, user):
        return self.had_permission(user, 'read')

    def had_permission_write(self, user):
        return self.had_permission(user, 'write')

    def had_permission_admin(self, user):
        return self.had_permission(user, 'admin')

    def is_owner(self, user):
        if user.key in self.owner:
            return True

        return False

    # TODO: this needs to be in the base handler and not in Artifact
    def validate_add_perm_request(self, request, user):
        if not self.has_permission_admin(user):
            raise HttpErrorException.forbidden()
        if not request.get('group_id') and not Artifact.valid_id(request.get('group_id')):
            raise HttpErrorException.bad_request('invalid group id')
        if not request.get('operation'):
            raise HttpErrorException.bad_request('no operation given')

        required = False
        if request.get('type'):
            if request.get('type') != 'shared' and request.get('type') != 'required':
                raise HttpErrorException.bad_request('invalid type')
            else:
                if request.get('type') == 'required':
                    required = True
        else:
            raise HttpErrorException.bad_request('no type given')

        group = Group.get_by_id(request.get('group_id'))
        if not group:
            raise HttpErrorException.bad_request('invalid group_id')

        return group, required

    # TODO: this needs to be in the base handler and not in Artifact
    def validate_rm_perm_request(self, request, user):
        if not self.has_permission_admin(user):
            raise HttpErrorException.forbidden()
        if not request.get('operation'):
            raise HttpErrorException.bad_request('no operation given')

        required = False
        if request.get('type'):
            if request.get('type') != 'shared' and request.get('type') != 'required':
                raise HttpErrorException.bad_request('invalid type')
            else:
                if request.get('type') == 'required':
                    required = True
        else:
            raise HttpErrorException.bad_request('no type givin')

        group = Group.get_by_id(request.get('group_id'))
        if not group:
            raise HttpErrorException.bad_request('invalid group_id')

        return group, required

    # TODO: this needs to be in the base handler and not in Artifact
    def validate_rm_group_request(self, request, user):
        if not self.has_permission_admin(user):
            raise HttpErrorException.forbidden()
        if not Artifact.valid_id(request.get('remove_group')) and not request.get('remove_group') == 'world':
            raise HttpErrorException.bad_request('invalid group id')

        group = Group.get_by_id(request.get('remove_group'))
        if not group:
            raise HttpErrorException.bad_request('invalid group id')

        return group

    def record_analytic(self, action, analyitc_session, reference=None, project=None, meta_data=None):
        if project and type(project) is not ndb.Key:
            project = project.key

        analytic = Analytics.new(
            artifact=self.key,
            artifact_owners=self.owner,
            project=project if project else self.project,
            action=action,
        )

        if analyitc_session:
            analytic.analytic_session = analyitc_session.key
        if self.organization:
            analytic.artifact_organization = self.organization
        if reference:
            analytic.reference = reference
        if meta_data:
            analytic.meta_data = meta_data

        analytic.put()

    def to_dict(self, user):
        d = super(SecureArtifact, self).to_dict()
        del d['parent_perms']

        perm = self.permissions.get()
        if not perm:
            self.corrupted = True
            self.put()
            raise CorruptedArtifactException('Concept has no permission object')

        d['permissions'] = Permission.remove_hidden_groups(user, perm.permissions)

        if d['organization']:
            d['organization'] = d['organization'].id()

        d['owner'] = []
        for owner in self.owner:
            d['owner'].append(owner.id())

        return d


class Permission(Artifact):
    artifact = ndb.KeyProperty(required=True)
    permissions = ndb.JsonProperty()
    old_permissions = None
    calculated_permissions = None

    # FIXME: This should not be a static method
    @staticmethod
    def remove_hidden_groups(user, permission):
        if not user.organization or user.is_admin:
            return permission

        org = user.organization.get()

        not_finished = True
        fake_ids_mapping = {}
        fake_ids = []

        while not_finished:
            for op in permission:
                for group_id in permission[op]['shared']:
                    group = ndb.Key('Group', group_id)

                    if org.is_hidden_group(group) and not user.in_group(group):
                        if group_id in fake_ids_mapping:
                            fake_id = fake_ids_mapping[group_id]
                        else:
                            fake_id = memcache.get(str(group_id) + '_fake_id')

                            if fake_id is None:
                                fake_id = server.create_uuid()
                                memcache.add(key=str(group_id) + '_fake_id', value=fake_id)

                            fake_ids_mapping[group_id] = fake_id
                            fake_ids.append(fake_id)

                        permission[op]['shared'][fake_id] = permission[op]['shared'][group_id]
                        del permission[op]['shared'][group_id]
                        break

                for group_id in permission[op]['required']:
                    group = ndb.Key('Group', group_id)

                    if org.is_hidden_group(group) and not user.in_group(group):
                        if group_id in fake_ids_mapping:
                            fake_id = fake_ids_mapping[group_id]
                        else:
                            fake_id = server.create_uuid()
                            fake_ids_mapping[group_id] = fake_id
                            fake_ids.append(fake_id)

                        permission[op]['required'][fake_id] = permission[op]['required'][group_id]
                        del permission[op]['required'][group_id]
                        break

            not_finished = False

        if len(fake_ids) > 0:
            permission['hidden'] = fake_ids

        return permission

    @staticmethod
    def get_hidden_group_id(group_id):
        fake_id = memcache.get(str(group_id) + '_fake_id')
        if fake_id is None:
            fake_id = server.create_uuid()
            memcache.add(key=str(group_id) + '_fake_id', value=fake_id, time=config.memcache_fake_id_timeout)
        return fake_id

    @staticmethod
    def init_perm_struct(art_perm):
        perms = {}
        for perm in art_perm:
            perms[perm] = {'shared': {}, 'required': {}}
        return perms

    def to_dict(self, user):
        d = super(Permission, self).to_dict()
        d['id'] = self.key.id()
        d['artifact'] = d['artifact'].id()
        return d


class ProjectNode(SecureArtifact):
    parent = ndb.KeyProperty()  # TODO: Need to start storing project as parent instead of None for top level Concepts
    children = ndb.KeyProperty(repeated=True)
    attributes = ndb.KeyProperty(kind='Attributes', repeated=True)

    render_object = None

    def add_attribute(self, attribute, document_key):
        atts = ndb.get_multi(self.attributes)
        for att in atts:
            if att.document == document_key:
                att.attributes.append(attribute)
                att.put()
                break

    def get_attr(self, doc_key):
        attrs = ndb.get_multi(self.attributes)
        for attr in attrs:
            if attr.document == doc_key:
                return attr

        if self.node_type == 'Project':
            pro = self
        else:
            pro = self.project.get()

        if pro.distilled_document != doc_key:
            return self.get_attr(pro.distilled_document)
        else:
            return None

    def get_attr_by_doc(self, doc):
        attrs = ndb.get_multi(self.attributes)
        for attr in attrs:
            if attr.document == doc.key:
                return attr

        if self.project != doc.project:
            return None

        if self.node_type == 'Project':
            pro = self
        else:
            pro = self.project.get()

        if pro.distilled_document != doc.key:
            return self.get_attr(pro.distilled_document)
        else:
            return None

    def has_attr(self, attr, doc_key):
        attribute = self.get_attr(doc_key)
        if not attribute:
            return False
        return attr in attribute.attributes

    def is_image(self, doc_key):
        return self.has_attr('img', doc_key)

    def num_of_children(self, user=None):
        return len(self.get_children(user=user))

    def get_concept_index(self, concept):
        index = 0
        for child in self.get_children():
            if child.id == concept.key.id():
                break
            index += 1
        return index

    def get_concept_index_adjusted(self, user, concept):
        index = 0
        children = self.get_children()

        for child in children:
            if child is not None:
                if child.key == concept.key:
                    break

                if child.has_permission_read(user):
                    index += 1

        return index

    def get_next_sibling_for_col_user(self, con, user):
        children = self.get_children()
        index = children.index(con)

        if index == len(children) - 1:
            return None

        index += 1
        while not children[index].has_permission(user, 'read'):
            index += 1
            if index == len(children):
                return None

        return children[index]

    def get_prev_sibling_for_col_user(self, con, user):
        children = self.get_children()
        index = children.index(con)
        if index == 0:
            return None

        index -= 1
        while not children[index].has_permission(user, 'read'):
            index -= 1

            if index <= 0:
                return None

        return children[index]

    def adjust_col_index(self, user, index, parent=None):
        if not parent:
            if not self.parent:
                parent = self.project.get()
            else:
                parent = self.parent.get()

        adjusted_index = index

        children = parent.get_children()
        for child in children:
            if child == self:
                break

            if not child.has_permission(user, 'read'):
                adjusted_index -= 1

        return adjusted_index

    def adjust_index(self, index, request_user):
        children = self.get_children()

        if index is None:
            index = len(children) + 1

        new_index = 0
        cur_index = 0

        children = ndb.get_multi(self.children)
        for child in children:
            if cur_index == index:
                break

            if child is not None:
                if not child.has_permission(request_user, 'read'):
                    new_index += 1
                else:
                    new_index += 1
                    cur_index += 1

            else:
                new_index += 1
                cur_index += 1

        return new_index

    def get_parent(self):
        if self.node_type == 'Project':
            return None

        if self.parent is not None:
            return self.parent.get()
        else:
            return self.project.get()

    def _check_children_dups(self):
        if len(self.children) != len(set(self.children)):
            cs = set()
            self.children = [x for x in self.children if not (x in cs or cs.add(x))]
            return True
        return False

    def get_children(self, user=None):
        children = ndb.get_multi(self.children)

        if not user:
            return children

        c = []
        for child in children:
            if child and child.has_permission_read(user):
                c.append(child)

        return c

    def is_parent(self, user=None):
        return len(self.get_children(user=user)) > 0

    def has_permission_edit_children(self, user):
        return self.has_permission(user, 'edit_children')

    @property
    def node_type(self):
        return 'ProjectNode'

    def to_dict(self, user, keep_dist=None):
        d = super(ProjectNode, self).to_dict(user)

        del d['children']

        children = self.get_children(user)
        d['is_parent'] = len(children) > 0

        d['attributes'] = []

        attributes = ndb.get_multi(self.attributes)
        index = 0

        for attribute in attributes:
            if attribute is None:
                continue
            else:
                doc = attribute.document.get()

                if not doc:
                    continue
                elif doc.has_permission(user, 'read') or doc.key.id() == keep_dist:
                    d['attributes'].append(attribute.to_dict())

            index += 1

        return d
