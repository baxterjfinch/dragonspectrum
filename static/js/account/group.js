function Group() {
    this.id = null;
    this.name = null;
    this.active = null;
    this.admins = [];
    this.created_timestamp = null;
    this.description = null;
    this.modified_timestamp = null;
    this.organization = null;
}

Group.groups = {};
Group.groupName = null;
Group.group_names = null;
Group.fetched_all = false;

Group.prototype.initGroup = function (group) {
    this.id = group.id;
    this.name = group.name;
    this.active = group.active;
    this.admins = group.admins;
    this.created_timestamp = group.created_ts;
    this.description = group.description;
    this.modified_timestamp = group.modified_ts;
    this.organization = group.organization;

    Group.groups[this.getId()] = this;
};

Group.prototype.setId = function (id) {
    this.id = id;
};

Group.prototype.getId = function () {
    return this.id;
};

Group.prototype.setName = function (name) {
    this.name = name;
};

Group.prototype.getName = function () {
    return this.name;
};

Group.prototype.setActive = function (flag) {
    this.active = flag;
};

Group.prototype.getActive = function () {
    return this.active;
};

Group.prototype.setAdmins = function (admins) {
    this.admins = admins;
};

Group.prototype.getAdmins = function () {
    return this.admins;
};

Group.prototype.setCreatedTs = function (ts) {
    this.created_timestamp = ts;
};

Group.prototype.getCreatedTs = function () {
    return this.created_timestamp;
};

Group.prototype.setDescription = function (description) {
    this.description = description;
};

Group.prototype.getDescription = function () {
    return this.description;
};

Group.prototype.setModifiedTs = function (ts) {
    this.modified_timestamp = ts;
};

Group.prototype.getModifiedTs = function () {
    return this.modified_timestamp;
};

Group.prototype.setOrganization = function (org) {
    this.orgaization = org;
};

Group.prototype.getOrganization = function () {
    return this.orgaization;
};

Group.get = function (id) {
    var group = Group.groups[id];
    if (!group) {
        Group.fetchAll(false);
        group = Group.groups[id];
    }
    return group;
};

Group.getByName = function (name) {
    if (!Group.fetched_all)
        Group.fetchAll(false);
    var groups = Group.getAll();
    for (var i = 0; i < groups.length; i++)
        if (groups[i].getName() == name)
            return groups[i];
    return null;
};

Group.getAll = function () {
    if (!Group.fetched_all)
        Group.fetchAll(false);
    var groups = [];
    $.each(Group.groups, function (id, group) {
        groups.push(group);
    });
    return groups;
};

Group.getAllNames = function () {
    if (Group.group_names)
        return Group.group_names;
    if (!Group.fetched_all)
        Group.fetchAll(false);

    var names = [];
    $.each(Group.groups, function (id, group) {
        names.push(group.getName());
    });
    Group.group_names = names;
    return names;
};

Group.getOrCreate = function (group) {
    var grp = Group.get(group.id);
    if (grp)
        return Group.get(group.id);
    grp = new Group();
    grp.initGroup(group);
    return grp;
};

Group.getNameById = function (id) {
    if (Group.groupName == null)
        Group.fetchAll(false);

    if (Group.groups.hasOwnProperty(id))
        return Group.groups[id];
    return null;
};

Group.fetchAll = function (async) {
    if (!Page.isProjectPage())
        return null;
    if (async == null)
        async = true;
    comms.get({
        async: async,
        url: ACCOUNT_URLS.group,
        data: {
            organization: User.getCurrent().getOrganization(),
            organization_groups: 'all'
        },
        success: function (data) {
            var group;
            for (var i = 0; i < data.length; i++) {
                group = new Group();
                group.initGroup(data[i]);
            }
            Group.fetched_all = true;
        }
    })
};

Group.isHidden = function (group_id, perms) {
    if (perms.hasOwnProperty('hidden'))
        if (perms.indexOf(group_id) >= 0)
            return true;
    return false;
};