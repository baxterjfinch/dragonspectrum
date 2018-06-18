var tt_org;
var _users = [];
var _groups;

function sort_groups_db(grp1, grp2) {
    if (grp1.name < grp2.name)
        return -1;
    if (grp1.name > grp2.name)
        return 1;
    return 0;
}

function initialize_admin_panel () {
    tt_org = window.tt_organization;
    _groups = window.tt_groups;
    if (_groups)
        _groups.sort(sort_groups_db);
}