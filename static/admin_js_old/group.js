function get_orgnazition_groups() {
    var org = get_current_organization();
    var groups;
    comms.get({
        async: false,
        url: ACCOUNT_URLS.group,
        data: {
            organization: org.id,
            organization_groups: 'all',
            hidden: true
        },
        success: function (data) {
            groups = data;
        }
    });
    org["groups"] = groups;
    return groups;

}

function get_organization_group_ids(org) {
    if (org == null) {
        org = get_current_organization();
    }
    if (org['groups'] == null) {
        return null;

    }

    var group_list = [];
    for (var i = 0; i < org['groups'].length; i++) {
        group_list.push(org['groups'][i].id);

    }

    return group_list;

}

function get_organization_group_names(org) {
    if (org == null) {
        org = get_current_organization();
    }
    if (org['groups'] == null) {
        return null;

    }

    var group_list = [];
    for (var i = 0; i < org['groups'].length; i++) {
        group_list.push(org['groups'][i]['name']);

    }

    return group_list;

}

function get_organization_group_by_id(org, group_id){
    if (org == null) {
        org = get_current_organization();
    }
    if (org['groups'] == null) {
        return null;
    }
    for (var i = 0; i < org['groups'].length; i++) {
        if (org['groups'][i]['id'] == group_id){
            return org['groups'][i];
        }
    }
    return null;
}

function get_organization_group_by_name(org, group_name){
    if (org == null) {
        org = get_current_organization();
    }
    if (org['groups'] == null) {
        return null;

    }

    for (var i = 0; i < org['groups'].length; i++) {
        if (org['groups'][i]['name'] == group_name){
            return org['groups'][i];
        }

    }

    return null;
}

function is_user_group_admin(group_id, user) {
    if (group_id == 'super_admin') {
        return false;
    }
    var group = get_organization_group_by_id(null, group_id);
    if (group.hasOwnProperty('admins')) {
        for (var i = 0; i < group.admins.length; i++) {
            if (group.admins[i] == user.username) {
                return true;
            }
        }
    }
    return false;
}

function user_in_group(user, group_id) {
    for (var i = 0; i < user.groups.length; i++) {
        if (user.groups[i] == group_id) {
            return true;
        }

    }

    return false;

}

function insert_group_toolbar() {
    var user_toolbar = (' \
<div class="btn-group">\
<button type="button" class="btn btn-xs" onclick="show_create_group()"><i class="fa fa-plus"></i></button>\
<button type="button" class="btn btn-xs" onclick="delete_group()"><i class="fa fa-minus"></i></button>\
<button type="button" class="btn btn-xs" onclick=""><i class="fa fa-info-circle"></i></button>\
</div>\
        ');

    $("#group_toolbar").html(user_toolbar);

}

function fill_group_table() {
    $("#group_table").html('');
    var groups = get_orgnazition_groups();
    var table = ('\
<thead>\
    <tr>\
        <th>Name</th>\
        <th>Creation Date</th>\
        <th>Description</th>\
    </tr>\
</thead>\
<tbody>\
    ');

    for (var i = 0; i < groups.length; i++) {
        table = table.concat('\
        <tr id="' + groups[i].id + '">\
            <td>' + groups[i].name + '</td>\
            <td>' + groups[i].created_ts + '</td>\
            <td>' + groups[i].description + '</td>\
        </tr>\
        ');

    }

    table = table.concat('</tbody>');

    $("#group_table").html(table);

    $('#group_table').on('click', 'tbody tr', highlight_group_row);

}


function add_group_to_table(group) {
    $("#group_table > tbody:first").prepend('\
        <tr id="' + group.id + '">\
            <td>' + group.name + '</td>\
            <td>' + group.created_ts + '</td>\
            <td>' + group.description + '</td>\
        </tr>');

}

var _selected_group = null;
function highlight_group_row(event) {
    $(event.currentTarget).addClass('highlight').siblings().removeClass('highlight');
    _selected_group = event.currentTarget.id;
}

function show_create_group() {
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("Create New Group");

    $("#modal_content").show().html('\
<form class="form-horizontal" id="modal_document" role="form"> \
    <div class="form-group"> \
        <label class="control-label" for="username">Group Name</label> \
        <div> \
            <input class="form-control" type="text" id="group_name"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="discription">Description</label> \
        <div> \
            <input class="form-control" type="text" id="description"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="hidden">Hidden Group</label> \
        <div> \
            <input class="form-control" type="checkbox" id="hidden"> \
        </div> \
    </div>\
</form>');

    $("#modal_save_button").show().html('\
<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button> \
<button id="group_save" class="btn btn-primary">Save</button>\
    ');

    $('#modal_dialog').on('shown.bs.modal', function () {
        $('#group_name').focus();
    });

    $("#group_save").on("click", function () {
        create_new_group();
    });

}

function create_new_group() {
    var group_name = $("#group_name").val();
    var description = $("#description").val() || "N/A";
    var hidden = $("#hidden").is(":checked");

    var org = get_current_organization();

    $("#modal_dialog").modal("hide");
    $("#modal_label").hide();
    $("#modal_content").hide();
    $("#modal_save_button").hide();

    var group_request = {"command": "new", "name": group_name, "description": description,
        "organization": org.id, "hidden":hidden, "return": 'group_dict'};

    var group = null;
    comms.put({
        async: false,
        url: ACCOUNT_URLS.group,
        data: group_request,
        success: function (data) {
            group = data;
        }
    });

    org.groups.push(group);
    add_group_to_table(group);

}

function delete_group() {
    if (_selected_group == null) {
        return;
    }
    queued_send_to_server('DELETE', 'grp_del', ACCOUNT_URLS.group_admin + _selected_group, null,
        refresh_organization_data, null);
}

function remove_group_form_org(org, group_id) {
    for (var i = 0; i < org.groups.length; i++) {
        if (org.groups[i]['id'] == group_id) {
            org.groups.splice(i, 1);
        }
    }
}

function add_user_to_group() {
    var group = get_organization_group_by_name(null, $("#group_search").val());
    $('#group_search').val('');
    var user = get_selected_user();
    var user_request = {"group_id": group['id'], "add": "group"};
    post_to_server(ACCOUNT_URLS.user + user.username, user_request, true);
    add_group_to_user_object(user, group);
    $("#group_table_div").html(build_user_group_table(get_user_group_ids(null), get_user_group_names(null)));
}

function remove_user_to_group(event) {
    var user = get_selected_user();
    var user_request = {"group_id": event.parentElement.id, "remove": "group"};
    post_to_server(ACCOUNT_URLS.user + user.username, user_request, true);
    remove_group_from_user_object(user, event.parentElement.id);
    $("#group_table_div").html(build_user_group_table(get_user_group_ids(null), get_user_group_names(null)));
}