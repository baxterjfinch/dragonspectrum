function get_orgnazition_users() {
    var org = get_current_organization();
    var users = null;
    comms.get({
        async: false,
        url: ACCOUNT_URLS.user,
        data: {
            organization_id: org.id,
            organization_users: "all"
        },
        success: function (data) {
            users = data;
        }
    });
    org["users"] = users;
    return users;
}

function insert_user_toolbar() {
     var user_toolbar = (' \
<div class="btn-group">\
<button type="button" class="btn btn-xs" onclick="show_create_new_user()"><i class="fa fa-plus"></i></button>\
<button type="button" class="btn btn-xs" onclick="delete_user()"><i class="fa fa-minus"></i></button>\
<button type="button" class="btn btn-xs" onclick="show_user_info()"><i class="fa fa-info-circle"></i></button>\
</div>\
        ');

    $("#user_toolbar").html(user_toolbar);

}

function fill_user_table() {
    $("#user_table").html('');
    var users = get_orgnazition_users();
    var table = ('\
<thead>\
    <tr>\
        <th>Username</th>\
        <th>First Name</th>\
        <th>Last Name</th>\
        <th>email</th>\
        <th>Registered Date</th>\
    </tr>\
</thead>\
<tbody>\
    ');

    for (var i = 0; i < users.length; i++) {
        table = table.concat('\
        <tr id="' + users[i].username + '">\
            <td>' + users[i].username + '</td>\
            <td>' + users[i].first_name + '</td>\
            <td>' + users[i].last_name + '</td>\
            <td>' + users[i].email + '</td>\
            <td>' + users[i].registration_date + '</td>\
        </tr>\
        ');

    }

    table = table.concat('</tbody></table>');

    $("#user_table").html(table);

    $('#user_table').on('click', 'tbody tr', function (event) {
        highlight_user_row(event);
        set_selected_user(event);

    });

}

function add_user_to_table(user) {
    $("#user_table > tbody:first").prepend('\
        <tr id="' + user.username + '">\
            <td>' + user.username + '</td>\
            <td>' + user.first_name + '</td>\
            <td>' + user.last_name + '</td>\
            <td>' + user.email + '</td>\
            <td>' + user.registration_date + '</td>\
        </tr>');

}

function highlight_user_row(event) {
    $(event.currentTarget).addClass('highlight').siblings().removeClass('highlight');
}

var _selected_user = null;
function set_selected_user(event) {
    _selected_user = event.currentTarget.id;
    var su = _selected_user;

}

function get_selected_user() {
    if (_selected_user == null) {
        return null;
    }

    var org = get_current_organization();
    for (var i = 0; i < org.users.length; i++) {
        if (org.users[i].username == _selected_user) {
            return org.users[i];

        }

    }

    return null;

}

function show_create_new_user() {
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("Create New User");
    $("#modal_content").show().html('\
        <form role="form">\
            <div class="row">\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div class="form-group">\
                        <input type="text" class="form-control input-lg" id="first-name" placeholder="First Name">\
                    </div>\
                </div>\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div class="form-group">\
                        <input type="text" class="form-control input-lg" id="last-name" placeholder="Last Name">\
                    </div>\
                </div>\
            </div>\
            <div class="row">\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div id="username-div" class="form-group">\
                        <input type="text" class="form-control input-lg" id="username" placeholder="Username">\
                    </div>\
                </div>\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div id="username-taken-div" class="form-group hidden">\
                        Username is unavailable\
                    </div>\
                </div>\
            </div>\
            <div class="row">\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div id="password-div" class="form-group">\
                        <input type="password" class="form-control input-lg" id="password" placeholder="Password">\
                    </div>\
                </div>\
                <div id="confirm-pass-div" class="col-xs-12 col-sm-6 col-md-6">\
                    <div class="form-group">\
                        <input type="password" class="form-control input-lg" id="confirm-password" placeholder="Confirm Password">\
                    </div>\
                </div>\
            </div>\
            <div id="email-div" class="form-group">\
                <input type="email" class="form-control input-lg" id="email" placeholder="Email">\
            </div>\
            <div class="row">\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div id="phone-number-div" class="form-group">\
                        <input type="text" class="form-control input-lg" id="phone_number" placeholder="Phone Number">\
                    </div>\
                </div>\
                <div class="col-xs-12 col-sm-6 col-md-6">\
                    <div id="cell-phone-number-div" class="form-group">\
                        <input type="text" class="form-control input-lg" id="cell_phone" placeholder="Cell Phone">\
                    </div>\
                </div>\
            </div>\
            <div class="form-group">\
                <input type="text" onfocus="(this.type=\'date\')" class="form-control input-lg" id="birthday" placeholder="Birthday">\
            </div>\
            <div class="form-group">\
                <input type="text" class="form-control input-lg" id="street-address1" placeholder="Street Address">\
            </div>\
            <div class="form-group">\
                <input type="text" class="form-control input-lg" id="street-address2" placeholder="Street Address line 2">\
            </div>\
            <div class="row">\
                <div class="col-xs-12 col-sm-7 col-md-7">\
                    <div class="form-group">\
                        <input type="text" class="form-control input-lg" id="city" placeholder="City">\
                    </div>\
                </div>\
                <div class="col-xs-12 col-sm-2 col-md-2">\
                    <div class="form-group">\
                        <input type="text" class="form-control input-lg" id="state" placeholder="State">\
                    </div>\
                </div>\
                <div class="col-xs-12 col-sm-3 col-md-3">\
                    <div class="form-group">\
                        <input type="text" class="form-control input-lg" id="zip-code" placeholder="Zip Code">\
                    </div>\
                </div>\
            </div>\
            <div class="form-group">\
                <input type="text" class="form-control input-lg" id="coupon" placeholder="Coupon">\
            </div>\
        </form>\
');

    $("#modal_save_button").show().html('\
        <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button> \
        <button id="user_save" class="btn btn-primary">Save</button>\
    ');

    $('#modal_dialog').on('shown.bs.modal', function () {
        $('#username').focus();
    });

    $("#user_save").on("click", function () {
        $("#modal_dialog").modal("hide");
        create_new_user();
    });

    $("#first-name").bind("change paste keyup", check_first_name);
    $("#last-name").bind("change paste keyup", check_last_name);
    $("#username").bind("change paste keyup", check_if_username_available);
    $("#password").bind("change paste keyup", check_if_passwords_match);
    $("#confirm-password").bind("change paste keyup", check_if_passwords_match);
    $("#email").bind("change paste keyup", validate_email);
    $("#phone_number").bind("change paste keyup", validate_phone);
    $("#cell_phone").bind("change paste keyup", validate_cell_phone);
    $("#register").click(function (e) {
        e.preventDefault();
        create_new_user();
    });

}

function show_user_info() {
    var user = get_selected_user();
    if (user == null) {
        return;
    }
    var user_group_names = get_user_group_names(null);
    var user_group_ids = get_user_group_ids(null);
    var org_group_names = get_organization_group_names(null);
    var group_table_html = build_user_group_table(user_group_ids, user_group_names);

    $("#modal_dialog").modal("show");
    $("#modal_dialog_child").addClass("modal-dialog-permissions");
    $("#modal_label").show().html("User Information");
    $("#modal_content").show().html('\
    <div class="row"><div class="col-lg-12"><h4>User</h4>\
    <form class="form-horizontal" id="modal_document" role="form"> \
        <div class="form-group"> \
            <label class="control-label" for="username">Username</label> \
            <div> \
                <input class="form-control" type="text" id="username" value="' + user.username + '" disabled> \
            </div> \
        </div>\
        <div class="form-group"> \
            <label class="control-label" for="first_name">First name</label> \
            <div> \
                <input class="form-control" type="text" id="first_name" value="' + user.first_name + '" disabled> \
            </div> \
        </div> \
        <div class="form-group"> \
            <label class="control-label" for="last_name">Last Name</label> \
            <div> \
                <input class="form-control" type="text" id="last_name" value="' + user.last_name + '" disabled> \
            </div> \
        </div> \
        <div class="form-group"> \
            <label class="control-label" for="email">Email</label> \
            <div> \
                <input class="form-control" type="text" id="email" value="' + user.email + '" disabled> \
            </div> \
        </div> \
        <div class="form-group"> \
            <label class="control-label" for="email">Registration Date</label> \
            <div> \
                <input type="text" class="form-control"  id="email" value="' + user.registration_date + '" disabled> \
            </div> \
        </div> \
        <div class="checkbox"> \
                <input type="checkbox" id="is_admin" onchange="toggle_user_org_admin()"> Organization Administrator \
        </div> \
    </form></div></div>\
    <div class="row">\
        <div class="col-lg-12"><h4>Groups</h4>\
              <div id="group_table_div">\
                    ' + group_table_html + '\
              </div>\
              <div class="input-append">\
                  <input type="text" id="group_search">\
                  <button id="add_group" class="btn" type="button"><i class="fa fa-plus"></i></button>\
              </div>\
        </div>\
    </div>\
    ');

    $("#modal_save_button").show().html('<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>');

    $('#group_search').typeahead({
        limit: 10,
        local: org_group_names
    });

    $('#add_group').on('click', function (event) {
        event.stopPropagation();
        add_user_to_group();
    });

    if (is_admin(get_selected_user())) {
        $("#is_admin").prop('checked', true);
    }

    $('#modal_dialog').on('hidden.bs.modal', function () {
        $('#group_search').typeahead('destroy');
        $("#modal_dialog_child").removeClass("modal-dialog-permissions");
    });

}

function build_user_group_table(group_ids, group_names) {
    var group_list_html = ('');
    if (group_ids.length > 0) {
        group_list_html = ('\
            <table class="table table-bordered" id="project_group_table"><tr><td><div class="user_info_group_list">\
            <table class="table table-striped table-hover table-condensed">\
                    <col width="10">\
                    <col width="1*">\
                    <col width="10">\
                    <thead>\
                        <tr>\
                            <th>R</th>\
                            <th>Group</th>\
                            <th>Admin</th>\
                        </tr>\
                    </thead>\
                    <tbody>\
                ');

        for (var i = 0; i < group_ids.length; i++) {
            group_list_html = group_list_html.concat('\
                <tr id="' + group_ids[i] + '">\
                    <td onclick="remove_user_to_group(this)"><i class="fa fa-times"></i></td>\
                    <td>' + group_names[i] + '</td>\
                    <td><input type="checkbox" id="is_group_admin" onchange="toggle_user_group_admin(this)" ');
            if (is_user_group_admin(group_ids[i], get_selected_user())) {
                group_list_html = group_list_html.concat('checked');
            }
            group_list_html = group_list_html.concat('></td></tr>');


        }

        group_list_html = group_list_html.concat('</tbody></table></div></td></tr></table>');

    }

    return group_list_html;

}

function toggle_user_group_admin(event){
    var user = get_selected_user();
    var is_group_admin = event.checked;
    post_to_server('/account/group/admin/' + event.parentElement.parentElement.id, {'username': user.username,
        'is_group_admin': is_group_admin}, true);
    var group = get_organization_group_by_id(null, event.parentElement.parentElement.id);
    if (is_group_admin) {
        if (group.admins.indexOf(user.username) == -1) {
            group.admins.push(user.username);
        }
    } else {
        var index = group.admins.indexOf(user.username);
        if (index != -1) {
            group.admins.splice(index, 1);
        }
    }
}

function toggle_user_org_admin(){
    var user = get_selected_user();
    var is_admin = $("#is_admin").is(':checked');
    post_to_server('/account/organization/admin/' + get_current_organization_id(), {'username': user.username,
        'is_admin': is_admin}, true);
    user.is_admin = is_admin;
}

function get_user_group_names(user) {
    if (user == null) {
        user = get_selected_user();
    }
    var group_names = [];
    for (var i = 0; i < user['groups'].length; i++) {
        group_names.push(user['groups'][i]['name'])
    }
    return group_names;
}

function get_user_group_ids(user) {
    if (user == null) {
        user = get_selected_user();
    }
    var group_id = [];
    for (var i = 0; i < user['groups'].length; i++) {
        group_id.push(user['groups'][i]['id'])
    }
    return group_id;
}

function add_group_to_user_object(user, group) {
    user.groups.push(group);
}

function remove_group_from_user_object(user, group_id) {
    for (var i = 0; i < user.groups.length; i++) {
        if (user.groups[i]['id'] == group_id) {
            user.groups.splice(i, 1);
        }
    }
}

function create_new_user() {
    if (!first_name_valid) {
        bootbox.alert('Please fill in a valid First Name');
    } else if (!last_name_valid) {
        bootbox.alert('Please fill in a valid Last Name');
    } else if (!username_valid) {
        bootbox.alert('Please fill in a valid Username');
    } else if (!password_name_valid) {
        bootbox.alert('Please fill in a valid password');
    } else if (!email_name_valid) {
        bootbox.alert('Please fill in a valid Email');
    }else if (!phone_name_valid) {
        bootbox.alert('Please fill in a valid Phone Number');
    }else {
        var first_name = $("#first-name").val();
        var last_name = $("#last-name").val();
        var username = $("#username").val();
        var password = $("#password").val();
        var email = $("#email").val();
        var birthday = $("#birthday").val();
        var phone_number = $("#phone_number").val();
        var cell_phone_number = $("#cell_phone").val();
        var street_address1 = $("#street-address1").val();
        var street_address2 = $("#street-address2").val();
        var city = $("#city").val();
        var state = $("#state").val();
        var zip_code = $("#zip-code").val();

        var phone_numbers = {'Main': phone_number};
        if (cell_phone_number.trim() != '') {
            phone_numbers['Cell'] = cell_phone_number;
        }
        var request = {'username': username, 'first_name': first_name, 'last_name': last_name, 'password': password,
            'email': email, 'phone_numbers': phone_numbers, 'account_type': 'organization_user',
            'organization': get_current_organization_id()};
        if (street_address1.trim() != '') {
            var address = {'street1': street_address1};
            if (street_address2.trim() != '') {
                address['street2'] = street_address2
            }
            if (city.trim() != '') {
                address['city'] = city;
            }
            if (state.trim() != '') {
                address['state'] = state;
            }
            if (zip_code.trim() != '') {
                address['zip_code'] = zip_code;
            }
            request['address'] = address;
        }
        if (birthday.trim() != '') {
            request['birthday'] = birthday;
        }
        log.debug('Request: %O', request);
        var success = null;
        comms.put({
            async: false,
            url: ACCOUNT_URLS.user,
            data: request,
            success: function (data) {
                success = data
            }
        });
        log.debug('Server success: ' + success);
        if (success) {
            get_from_server('GET', ACCOUNT_URLS.user, {'user_info': username}, load_new_user_callback, null);
        }
    }
}

function load_new_user_callback(user, argv) {
    var org = get_current_organization();
    org.users.push(user);
    add_user_to_table(user);
}