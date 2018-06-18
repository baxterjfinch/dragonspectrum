var _user = null;

function set_user(user) {
    _user = user;
}

function get_user() {
    if (_user == null) {
        comms.get({
            async: false,
            url: ACCOUNT_URLS.user,
            data: {user_info: $.cookie('user')},
            success: function (data) {
                _user = data;
            }
        });
    }
    return _user;
}

function is_anonymous_user() {
    return (_user.username == 'anonymous')
}

function get_current_user_groups() {
    return _user.groups;
}

function is_org_user() {
    return (get_user_organization_id() != null);
}

function get_user_organization_id() {
    return get_user()["organization"];
}

function get_cur_user_group_names() {
    var user = get_user();
    var group_names = [];
    for (var i = 0; i < user['groups'].length; i++) {
        group_names.push(user['groups'][i]['name'])
    }
    return group_names;
}

function remove_organization_from_group_id(group_id) {
    if (group_id == null || get_user().organization == null) {
        return null;
    }
    var index = group_id.lastIndexOf(get_user().organization);
    if (index > 0) {
        return group_id.substring(0, index-1);
    }
    return group_id;
}

function get_current_user_perms() {
    var results = null;
    comms.get({
        async: false,
        url: ACCOUNT_URLS.user,
        data: {
            user_perms: _user.username
        },
        success: function (data) {
            results = data;
        }
    });
    if (results['failed'] == null) {
        return results;
    }
    return null;
}

function is_user_admin() {
    if (_user == null) {
        return null;
    }
    return (_user['is_admin'])
}

function is_admin(user) {
    return (user['is_admin'])
}

function is_user_super_admin() {
    return (_user['is_super_admin'])
}

function is_super_admin(user) {
    return (user['is_super_admin'])
}

function current_user_has_permission(permission, artifact) {
    var user_perms = get_current_user_perms();
}

function change_user_first_name(first_name) {
    _user['first_name'] = first_name;
    post_to_server(ACCOUNT_URLS.user + _user.username, {'first_name': first_name}, true);
}

function change_user_last_name(last_name) {
    _user['last_name'] = last_name;
    post_to_server(ACCOUNT_URLS.user + _user.username, {'last_name': last_name}, true);
}

function change_user_password(password) {
    post_to_server(ACCOUNT_URLS.user + _user.username, {'password': password}, true);
}

function change_user_email(email) {
    _user['email'] = email;
    post_to_server(ACCOUNT_URLS.user + _user.username, {'email': email}, true);
}

function change_user_phone_number(type, number) {
    post_to_server(ACCOUNT_URLS.user + _user.username, {'phone_type': type, 'phone_number': number}, true);
}

function change_user_birthday(birthday) {
    _user['birthday'] = birthday;
    post_to_server(ACCOUNT_URLS.user + _user.username, {'birthday': birthday}, true);
}

function change_user_address(street1, street2, city, state, zip_code) {
    var address = {'street1': street1};
    if (street2.trim() != '') {
        address['street2'] = street2
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
    _user['address'] = address;
    post_to_server(ACCOUNT_URLS.user + _user.username, {'address': address}, true);
}