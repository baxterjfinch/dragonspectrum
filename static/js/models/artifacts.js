/** @class
 * Artifacts Base Class
 *
 * @property {Date] created_ts - Date artifact was created
 * @property {Date] modified_ts - Date artifact was last modified
 */
function Artifact() {
    this.id = null;
    this.created_ts = null;
    this.modified_ts = null;
}

/** @instance
 * Init function for artifacts
 *
 * @param {object} art - The dictionary contianing the artifact details
 */
Artifact.prototype.initArtifact = function (art) {
    this.id = art.id;
    this.created_ts = art.created_ts;
    this.modified_ts = art.modified_ts;
};

Artifact.prototype.setId = function (id) {
    return this.id = id;
};

Artifact.prototype.getId = function () {
    return this.id;
};

Artifact.prototype.getRequestId = function () {
    return this.id;
};

Artifact.prototype.setCreatedTs = function (ts) {
    this.created_ts = ts;
};

Artifact.prototype.getCreatedTs = function () {
    return this.created_ts;
};

Artifact.prototype.getCreatedDate = function () {
    return new Date(this.created_ts);
};

Artifact.prototype.getCreatedDateString = function () {
    return new Date(this.created_ts).toLocaleString();
};

Artifact.prototype.setModifiedTs = function (ts) {
    this.modified_ts= ts;
};

Artifact.prototype.getModifiedTs = function () {
    return this.modified_ts;
};

Artifact.prototype.getModifiedDate = function () {
    return new Date(this.modified_ts);
};

Artifact.prototype.getModifiedDateString = function () {
    return new Date(this.modified_ts).toLocaleString();
};

Artifact.prototype.modified = function () {
    this.modifiedTs = new Date().getTime();
};

Artifact.prototype.toDict = function () {
    var d = {};
    d.id = this.getRequestId();
    d.created_ts = this.getCreatedTs();
    d.modified_ts = this.getModifiedTs();
    d.project = Project.getId();

    return d;
};

/** @class
 * SecureArtifacts Base Class
 *
 * @property {Array<User>] owner - Ownsers of the artifact
 * @property {Permission] permissions - Artifact's permissions
 * @property {Array<Permission>] parentPerms - Artifact's parent permissions
 * @property {Array<string>] operationsList - Artifact's permissions operations
 */
function SecureArtifact() {
    Artifact.call(this);
    this.owner = null;
    this.permissions = null;
    this.parent_permissions = null;
    this.organization = null;
    this.operations_list = [];

    this.is_deleted = false;
}

SecureArtifact.prototype = Object.create(Artifact.prototype);
SecureArtifact.prototype.constructor = SecureArtifact;

/** @instance
 * Init function for secure artifacts
 *
 * @param {object} art - The dictionary contianing the artifact details
 */
SecureArtifact.prototype.initSecureArtifact = function (art) {
    this.initArtifact(art);
    this.owner = art.owner;
    this.permissions = new Permission();
    this.permissions.initPermissions(this, art.permissions);
    this.parent_permissions = art.parent_permissions;
    this.organization = art.organization;
};

SecureArtifact.prototype.setOwners = function (owners) {
    this.owner = owners;
};

SecureArtifact.prototype.getOwners = function () {
    return this.owner;
};

SecureArtifact.prototype.setPermissions = function (perms) {
    this.permissions = perms;
};

SecureArtifact.prototype.getPermissions = function () {
    return this.permissions;
};

SecureArtifact.prototype.getParentPermissions = function () {
    // This must be overriden
};

SecureArtifact.prototype.setOrganization = function (org) {
    this.organization = org;
};

SecureArtifact.prototype.getOrganization = function () {
    return this.organization;
};

SecureArtifact.prototype.getOperationList = function () {
    return this.operations_list;
};

SecureArtifact.prototype.setDeleted = function (flag) {
    this.is_deleted = flag;
};

SecureArtifact.prototype.isDeleted = function () {
    return this.is_deleted;
};

SecureArtifact.prototype.isOwner = function (user) {
    for (var i = 0; i < this.owner.length; i++)
        if (this.owner[i] == user.getUserName())
            return true;
    return false;
};

SecureArtifact.prototype.canInherit = function () {
    return true;
};

SecureArtifact.prototype.getInheritedPermissions = function () {
    var op_list = this.getOperationList();

    // Get the parents permissions
    var parent_perms = this.getParentPermissions().reverse();

    // Setup our new permissions object
    var cal_perms = {hidden: []};
    for (var i = 0; i < op_list.length; i++)
        cal_perms[op_list[i]] = {shared: {}, required: {}};

    var converted_op;
    for (i = 0; i < parent_perms.length; i++) {
        for (var j = 0; j < op_list.length; j++) {
            converted_op = op_list[j];
            // Check if the parent has the operation and if not get the alternative
            // example (Project's write is an alternative for documents write_annoations)
            if (!parent_perms[i].hasOwnProperty(converted_op))
                converted_op = this.getAlternativeOperation(converted_op);

            // Copy the parents permissions into our new perms object overriding pervious
            // permissions for both shared and required
            $.each(parent_perms[i][converted_op]['shared'], function (groupId, perm) {
                cal_perms[op_list[j]]['shared'][groupId] = perm;
            });
            $.each(parent_perms[i][converted_op]['required'], function (groupId, perm) {
                cal_perms[op_list[j]]['required'][groupId] = perm;
            });
        }
        if (parent_perms[i].hasOwnProperty('hidden')) {
            for (var k = 0; i < parent_perms[i]['hidden'].length; i++) {
                if (cal_perms['hidden'].indexOf(parent_perms[i]['hidden'][k]) < 0)
                    cal_perms['hidden'].push(parent_perms[i]['hidden'][k]);
            }
        }
    }

    return cal_perms;
};

SecureArtifact.prototype.getAlternativeOperation = function (operation) {
    return operation;
};

SecureArtifact.prototype.calculatedPermissions = function () {
    var op_list = this.getOperationList();
    var inhered_permissions = this.getInheritedPermissions();

    var permissions = [inhered_permissions, this.getPermissions().getPermissions()];

    // Setup our new permissions object
    var cal_perms = {};
    for (var i = 0; i < op_list.length; i++)
        cal_perms[op_list[i]] = {shared: {}, required: {}};

    var converted_op;
    for (i = 0; i < permissions.length; i++) {
        for (var j = 0; j < op_list.length; j++) {
            converted_op = op_list[j];
            // Check if the inherired has the operation and if not get the alternative
            // example (Project's write is an alternative for documents write_annoations)
            if (!permissions[i].hasOwnProperty(converted_op))
                converted_op = this.getAlternativeOperation(converted_op);

            // Copy the parents permissions into our new perms object overriding pervious
            // permissions for both shared and required
            $.each(permissions[i][converted_op]['shared'], function (groupId, perm) {
                cal_perms[op_list[j]]['shared'][groupId] = perm;
            });
            $.each(permissions[i][converted_op]['required'], function (groupId, perm) {
                cal_perms[op_list[j]]['required'][groupId] = perm;
            });
        }
    }

    this.getPermissions().setCalculatedPermissions(cal_perms);
};

SecureArtifact.prototype.hasPermissionRead = function (user) {
    return SecureArtifact.hasPermission(this, user, 'read');
};

SecureArtifact.prototype.hasPermissionWrite = function (user) {
    return SecureArtifact.hasPermission(this, user, 'write');
};

SecureArtifact.prototype.hasPermissionAdmin = function (user) {
    return SecureArtifact.hasPermission(this, user, 'admin');
};

SecureArtifact.prototype.toDict = function () {
    return Artifact.prototype.toDict.call(this);
};

SecureArtifact.hasPermission = function (artifact, user, operation) {
    if (user == null)
        user = User.getCurrent();

    // Anonymous (world) users can only have read permissions
    if (user.isAnonymous() && operation != 'read')
        return false;

    if (artifact.isOwner(user))
        return true;

    if (user.isSuperAdmin())
        return true;

    // if this artifact belongs to an organization. The org's admin always have permission
    if (artifact.getOrganization(artifact) != null && user.isOrgAdmin(artifact))
        return true;

    var userGroups = user.getGroups();
    var userGroupIds = [];
    for (var i = 0; i < userGroups.length; i++)
        userGroupIds.push(userGroups[i].getId());

    // Fetch the calculated permissions (inherited permissions + artifact's permissions)
    artifact.calculatedPermissions();
    var permissions = artifact.getPermissions().getCalculatedPermissions();

    // Required permissions requires the user to be in every group
    var required_operation_group = Util.getKeys(permissions[operation]['required']);
    if (required_operation_group.length > 0)
        // If user is not in every group in the required permissions, than we fail the test.
        if (!Util.isSubSet(required_operation_group, userGroupIds))
            return false;

    // Shared permissions only reqires the user to be allows in one or more groups
    var shared_operation_group = Util.getKeys(permissions[operation]['shared']);
    if (shared_operation_group.length > 0) {
        var interSection = Util.intersect(shared_operation_group, userGroupIds);
        if (interSection.length <= 0 )
            return false;
        for (i = 0; i < interSection.length; i++)
            if (permissions[operation]['shared'][interSection[i]] == 'allow')
                return true;
    }

    // If we reach this point than, the user is not a owner, admin, or has any of the
    // artifacts permissoin so we fail the test.
    return false;
};

/** @class
 * ProjectNode Base Class
 *
 * @property {Array<Concept>] children - children concepts
 * @property {Array<Attribute>] attributes - Render Attributes
 */
function ProjectNode() {
    SecureArtifact.call(this);
    this.children = [];
    this.node = null;
    this.is_parent = false;
    this.attributes = [];
    this.attributes_by_doc_id = {};

    this.is_queued_loading = false;
    this.is_being_fetched = false;
    this.is_loaded = false;
    this.dvs_render = null;
    this.summary_render = null;
    this.deleted_children = [];
    this.presentation_slides = {};
}

ProjectNode.prototype = Object.create(SecureArtifact.prototype);
ProjectNode.prototype.constructor = ProjectNode;

/** @instance
 * Init function for project node
 *
 * @param {object} node - The dictionary contianing the project node details
 */
ProjectNode.prototype.initProjectNode = function (node) {
    this.initSecureArtifact(node);
    var i;

    var attr;
    for (i = 0; i < node.attributes.length; i++) {
        attr = new Attribute();
        node.attributes[i].artifact = this;
        var doc = Document.get(node.attributes[i].document);
        if (!doc) {
            doc = new Document();
            doc.setId(node.attributes[i].document);
        }
        node.attributes[i].document = doc;

        attr.initAttribute(node.attributes[i]);
        this.attributes.push(attr);
        if (attr.getDocument())
            this.attributes_by_doc_id[attr.getDocument().getId()] = attr;
    }

    this.is_parent = node.is_parent;
    this.setDvsRender(new DVSRenderObj());
    this.setSummaryRender(new SummaryRenderObj());
};

ProjectNode.prototype.setTvsNode = function (node) {
    this.node = node;
};

ProjectNode.prototype.getTvsNode = function () {
    return this.node;
};

ProjectNode.prototype.setDvsRender = function (dvsRender) {
    this.dvs_render = dvsRender;
};

ProjectNode.prototype.getDvsRender = function () {
    return this.dvs_render;
};

ProjectNode.prototype.setSummaryRender = function (summaryRender) {
    this.summary_render = summaryRender;
};

ProjectNode.prototype.getSummaryRender = function () {
    if (!this.summary_render)
        this.setSummaryRender(new SummaryRenderObj());
    return this.summary_render;
};

ProjectNode.prototype.setAttributes = function (attrs) {
    this.attributes = attrs;
    this.attributes_by_doc_id = {};
    for (var i = 0; i < attrs.length; i++) {
        this.attributes_by_doc_id[attrs[i].getDocument().getId()] = attrs[i];
    }
};

ProjectNode.prototype.addAttribute = function (attr) {
    this.attributes.push(attr);
    this.attributes_by_doc_id[attr.getDocument().getId()] = attr;
};

ProjectNode.prototype.removeAttribute = function (attr) {
    this.attributes.splice(this.attributes.indexOf(attr), 1);
    delete this.attributes_by_doc_id[attr.getDocument().getId()];
};

ProjectNode.prototype.getAttributes = function () {
    return this.attributes;
};

ProjectNode.prototype.getDocumentAttributeById = function (doc_id) {
    if (this.attributes_by_doc_id.hasOwnProperty(doc_id))
        return this.attributes_by_doc_id[doc_id];
    return null;
};

ProjectNode.prototype.getDocumentAttribute = function (doc, skipDistilled) {
    if (!this.isRoot() && this.isChildOfLinked()) {
        return this.getLinkedParent().getDocumentAttribute(doc, this);
    } else {
        var attr = this.getDocumentAttributeById(doc.getId());
        if (attr)
            return attr;
        if (!skipDistilled) {
            doc = Project.getDistilledDocument();
            attr = this.getDocumentAttributeById(doc.getId());
            if (attr)
                return attr;
        }
    }
    return null;
};

ProjectNode.prototype.isParent = function () {
    return this.is_parent;
};

ProjectNode.prototype.setIsParent = function (flag) {
    this.is_parent = flag;
};

ProjectNode.prototype.setChildren = function (children) {
    this.children = children;
};

ProjectNode.prototype.hasChildren = function () {
    return this.getChildren().length > 0;
};

ProjectNode.prototype.getLastChild = function () {
    if (!this.hasChildren())
        return null;
    return this.getChildren()[this.getChildren().length - 1];
};

ProjectNode.prototype.addChild = function (child, index) {
    this.is_parent = true;
    if (index != null)
        this.children.splice(index, 0, child);
    else
        this.children.push(child);
    this.is_parent = true;
};

ProjectNode.prototype.removeChild = function (child) {
    var index = this.indexOfChild(child);
    if (index >= 0)
        this.children.splice(index, 1);
    if (this.children.length == 0) {
        this.is_parent = false;
        this.is_expanded = false;
    }
};

ProjectNode.prototype.indexOfChild = function (child) {
    return this.children.indexOf(child);
};

ProjectNode.prototype.isChild = function (child) {
    return this.children.indexOf(child) >= 0;
};

ProjectNode.prototype.getChildren = function () {
    return this.children
};

ProjectNode.prototype.reloadChildren = function (children_ids) {
    var self = this;
    var children = this.getChildren();

    function load_child (id, index) {
        comms.get({
            url: ARTIFACT_URLS.concept + id,
            data: {json: true, children: false},
            success: function (data) {
                Concept.addFromDict(data, self, index);
                self.reloadChildren(children_ids);
            }
        });
    }

    function compare_child_list (data) {
        if (data)
            children_ids = data;

        var i;
        for (i = 0; i < children.length; i++) {
            if (children[i].getRequestId() != children_ids[i]) {
                load_child(children_ids[i], i);
            }
        }

        if (i != children_ids.length) {
            for (i; i < children_ids.length; i++) {
                load_child(children_ids[i], i);
            }
        }
    }

    if (!children_ids) {
        comms.get({
            url: ARTIFACT_URLS.concept_children + this.getRequestId(),
            success: function (data) {
                compare_child_list(data.children);
            }
        })
    } else {
        compare_child_list();
    }
};

ProjectNode.prototype.deleteChild = function (child) {
    var index = this.indexOfChild(child);
    if (index < 0)
        throw 'child is not a child of this parent';
    this.children.splice(index, 1);
    this.deleted_children.push({concept: child, index: index});
    if (this.children.length == 0)
        this.is_parent = false;
};

ProjectNode.prototype.getLastChild = function () {
    if (this.children.length > 0)
        return this.children[this.children.length - 1];
    return null;
};

ProjectNode.prototype.getFirstChild = function () {
    if (this.children.length > 0)
        return this.children[0];
    return null;
};

ProjectNode.prototype.setQueuedLoading = function (flag) {
    this.is_queued_loading = flag;
};

ProjectNode.prototype.isQueuedLoading = function () {
    return this.is_queued_loading;
};

ProjectNode.prototype.setBeingFetched = function (flag) {
    this.is_being_fetched = flag;
};

ProjectNode.prototype.isBeingFetched = function () {
    return this.is_being_fetched;
};

ProjectNode.prototype.setLoaded = function (flag) {
    this.is_loaded = flag;
};

ProjectNode.prototype.isLoaded = function () {
    return this.is_loaded;
};

ProjectNode.prototype.updateChildrenSpans = function (dvsRender) {
    var children = this.getChildren();
    if (!dvsRender)
        dvsRender = this.getDvsRender();
    if (!this.isParent() || !children || dvsRender.children_span == null) {
        if (dvsRender) {
            if (dvsRender.children_span)
                dvsRender.children_span.children().detach();
            if (dvsRender.parent_children_span)
                dvsRender.parent_children_span.children().detach();
        }
        return;
    }

    dvsRender.children_span.children().detach();
    dvsRender.parent_children_span.children().detach();

    var i = 0;
    for (i; i < children.length; i++) {
        if (children[i].isDeleted())
            continue;
        if (children[i].isParent())
            break;
        dvsRender.children_span.append(children[i].getDvsRender().span);
    }
    for (i; i < children.length; i++) {
        if (children[i].isDeleted())
            continue;
        dvsRender.parent_children_span.append(children[i].getDvsRender().span);
    }
};

ProjectNode.prototype.setPresentationSlide = function (slide, document) {
    this.presentation_slides[document.getId()] = slide;
};

ProjectNode.prototype.getPresentationSlide = function (document) {
    return this.presentation_slides[document.getId()];
};

ProjectNode.prototype.removePresentationSlide = function (document) {
    if (this.presentation_slides[document.getId()])
        delete this.presentation_slides[document.getId()];
};

ProjectNode.prototype.hasPermissionEditChildren = function (user) {
    return SecureArtifact.hasPermission(this, user, 'edit_children');
};

ProjectNode.prototype.toDict = function () {
    var d = SecureArtifact.prototype.toDict.call(this);

    var i;
    d.attributes = [];
    for (i = 0; i < this.attributes.length; i++)
        d.attributes.push(this.attributes[i].toDict());

    d.children = [];
    for (i = 0; i < this.children.length; i++)
        d.children.push(this.children[i].toDict());

    return d;
};

/** @class
 * SecureArtifacts Base Class
 *
 * @property {Artifact] artifact - Arifact this permission belongs to
 * @property {object] permissions - Arifact's permissions
 * @property {object] calculatedPermissions - Arifact's calcutlated
 * permissions (includes inherited perms)
 */
function Permission() {
//    Artifact.call(this);
    this.artifact = null;
    this.permissions = null;
    this.calculated_permissions = null;
}

//Permission.prototype = Object.create(Artifact.prototype);
//Permission.prototype.constructor = Permission;

Permission.security_icon = ' <sup><i class="fa fa-shield security-icon"></i></sup>';

// Failed Permission Check Strings
Permission.failedCreateConcept = 'You do not have permission to add children to this parent';
Permission.failedMoveConcept = 'You do not have permission to change parents';
Permission.failedDeleteConcept = 'You do not have permission to delete this concept';

Permission.failedEditDocument = 'You do not have permission to edit this document';
Permission.failedDeleteDocument = 'You do not have permission to delete this document';
Permission.failedManagePhrasingDocument = 'You do not have permission to manage phrasing for this document';

Permission.failedDeletePhrasing = 'You do not have permission to delete this phrasing';
Permission.failedEditPhrasing = 'You do not have permission to edit this phrasing';

Permission.names = {
    read: 'Read',
    write: 'Write',
    admin: 'Admin',
    delete: 'Delete',
    edit_children: 'Edit Children',
    manage_phrasings: 'Set Selected Phrasing',
    set_crawlcontext: 'Set Concept Visibility',
    annotation_read: 'Read Comments',
    annotation_write: 'Write Comments',
    bookmark_read: 'Bookmark Read',
    bookmark_write: 'Bookmark Write'
};

/** @instance
 * Init function for permissions
 *
 * @param {Artifact} artifact - Arifact this permission belongs to
 * @param {Artifact} perms - Permisssions options
 */
Permission.prototype.initPermissions = function (artifact, perms) {
//    this.initArtifact(this);
    this.artifact = artifact;
    this.permissions = perms;
};

Permission.prototype.setArtifact = function (art) {
    this.artifact = art;
};

Permission.prototype.getArtifact = function () {
    return this.artifact;
};

Permission.prototype.setPermissions = function (perms) {
    this.permissions = perms;
};

Permission.prototype.getPermissions= function () {
    return this.permissions;
};

Permission.prototype.initPermissionSettings =function () {
    this.permissions = {};
    var ops = this.artifact.getOperationList();
    for (var i = 0; i < ops.length; i++)
        this.permissions[ops[i]] = {shared: {}, required: {}};
};

Permission.prototype.addPermission = function (operation, group, perm, required) {
    if (!!group.getId)
        group = group.getId();
    if (required)
        var type = 'required';
    else
        type = 'shared';

    if (!this.permissions.hasOwnProperty(operation))
        this.permissions[operation] = {shared: {}, required: {}};

    this.permissions[operation][type][group] = perm;
};

Permission.prototype.removePermission = function (operation, group, required) {
    if (!!group.getId)
        group = group.getId();
    if (required)
        var type = 'required';
    else
        type = 'shared';

    if (!this.permissions.hasOwnProperty(operation))
        return;
    if (this.permissions[operation][type].hasOwnProperty(group))
        delete this.permissions[operation][type][group];
};

Permission.prototype.removeGroup = function (group) {
    if (!!group.getId)
        group = group.getId();
    var perms = this.permissions;

    $.each(perms, function (operation) {
        $.each(perms[operation]['shared'], function (group_id) {
            if (group_id = group)
                delete perms[operation]['shared'][group_id];
        });
        $.each(perms[operation]['required'], function (group_id) {
            if (group_id = group)
                delete perms[operation]['required'][group_id];
        });
    });
};

Permission.prototype.setCalculatedPermissions = function (perms) {
    this.calculated_permissions = perms;
};

Permission.prototype.getCalculatedPermissions = function () {
    return this.calculated_permissions;
};

Permission.prototype.hasExplicitPermissions = function () {
    for (var op in this.permissions) {
        if (this.permissions.hasOwnProperty(op)) {
            for (var group_id in this.permissions[op]['shared']) {
                if (this.permissions[op]['shared'].hasOwnProperty(group_id)) {
                    return true;
                }
            }
            for (group_id in this.permissions[op]['required']) {
                if (this.permissions[op]['required'].hasOwnProperty(group_id)) {
                    return true;
                }
            }
        }
    }
    return false;
};

Permission.getGroupIdsFromPermissions = function (perms) {
    var groups = [];

    function addGroup (group) {
        if (groups.indexOf(group) < 0)
            groups.push(group);
    }

    $.each(perms, function (key, value) {
        if (key != 'hidden') {
            $.each(value['shared'], function (group_id) {
                addGroup(group_id);
            });
            $.each(value['required'], function (group_id) {
                addGroup(group_id);
            });
        }
    });

    return groups;
};

Permission.getGroupPermission = function (permission, group, operation, required) {
        if (permission.hasOwnProperty(operation)) {
            if (required) {
                if (permission[operation]['required'].hasOwnProperty(group.getId())) {
                    return permission[operation]['required'][group.getId()];
                }
            } else {
                if (permission[operation]['shared'].hasOwnProperty(group.getId())) {
                    return permission[operation]['shared'][group.getId()];
                }
            }
    }
    return null;
};