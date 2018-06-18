var user_datatable;
function init_user_table() {
    user_datatable = $('#org_user_table').DataTable();
}

function load_user_table() {
    var row;
    var ll; // Last Login
    var reg; // register date
    var edit_btn;
    if (_users.length > 0)
        load_user_information_widget(_users[0]);
    for (var i = 0; i < _users .length; i++) {
        if (_users[i].last_login == 'never') {
            ll = 'never';
        } else {
            ll = new Date(_users[i].last_login * 1000).toLocaleString();
        }
        edit_btn = $('<button></button>');
        edit_btn.addClass('btn btn-primary btn-xs');
        edit_btn.attr('data-user-id', _users[i].id);
        edit_btn.attr('onclick', 'edit_user_btn_cb(this)');
        edit_btn.append('<i class="fa fa-pencil-square-o"></i>');
        reg = new Date(_users[i].registration_date * 1000).toLocaleString();
        row = [edit_btn[0].outerHTML, _users[i].id, _users[i].display_name, _users[i].full_name,
            _users[i].email, 'None', ll, reg];
        user_datatable.row.add(row).draw();
    }
}

function initialize_user_table () {
    init_user_table();
    if (_users.length == 0) {
        if (tt_org) {
            get_from_server('GET', get_admin_url('users', tt_org.id), null, load_user_table_cb);
        } else {
            get_from_server('GET', get_admin_url('users', null), null, load_user_table_cb);
        }
    } else {
        load_user_table();
    }
}

function load_user_table_cb(us) {
    _users = us;
    load_user_table();
}

function get_user_by_id(id) {
    for (var i = 0; i < _users.length; i++) {
        if (_users[i].id == id)
            return _users[i];
    }
    return null;
}

function edit_user_btn_cb(btn) {
    var user = get_user_by_id($(btn).attr('data-user-id'));
    if (user)
        load_user_information_widget(user);
}

var current_loaded_info_user;
function load_user_information_widget(user) {
    var user_info_form = $('#user_info_form');
    current_loaded_info_user = user;
    user_info_form.find('input[name="first_name"]').val(user.first_name);
    user_info_form.find('input[name="last_name"]').val(user.last_name);
    user_info_form.find('input[name="username"]').val(user.username);
    user_info_form.find('input[name="display_name"]').val(user.display_name);
    user_info_form.find('input[name="email"]').val(user.email);
    user_info_form.find('input[name="email2"]').val(user.email);
    var groups = [];
    for (var i = 0; i < user.groups.length; i++) {
        groups.push(user.groups[i].id + '--' + user.groups[i].name);
    }
    user_info_group_sel.select2('val', groups);
}

function create_new_user(form) {
    $('#new_user_modal').modal('hide');
    var values = form_to_dict(form);

    if (values.display_name.trim() == '') {
        values.display_name = values.first_name.trim() + ' ' + values.last_name.trim();
    }

    var request = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        username: values.username.trim(),
        display_name: values.display_name.trim(),
        password: values.password.trim(),
        email: values.email.trim(),
        phone_numbers: {'Main': values.phone.trim()}
    };

    if (window.tt_organization) {
        request.account_type = 'organization_user';
        request.organization = window.tt_organization.id;
    } else {
        throw 'User creatation of non organization accounts is not supported yet';
    }

    if (values.street1.trim() != '') {
        var address = {};
        address.street1 = values.street1.trim();
        address.street2 = values.street2.trim();
        address.city = values.city.trim();
        address.state = values.state.trim();
        address.zip_code = values.zip_code.trim();
        request.address = address;
    }

    if (values.birthday != '') {
        request.birthday = values.birthday;
    }

    form[0].reset();
    $.ajax({
        async: true,
        type: "PUT",
        url: ACCOUNT_URLS.user,
        contentType: "application/json",
        data: JSON.stringify(request),
        error: function (jqXHR, textStatus, errorThrown) {
            $.smallBox({
                title: 'There was an error while trying to create new group',
                content: jqXHR.status + ': ' + errorThrown + ': ' + jqXHR.getResponseHeader('reason'),
                color: '#A65858',
                iconSmall: "fa fa-thumbs-down bounce animated"
            });
        },
        success: function (data, textStatus, jqXHR) {
            $.smallBox({
                title: 'Group Created',
                color: '#00CC11',
                iconSmall: "fa fa-thumbs-up bounce animated",
                timeout: 2000
            });
            get_from_server('GET', get_admin_url('users', tt_org.id), {username: request.username} , load_new_user_callback);
        }
    });
}

function load_new_user_callback(user) {
    _users.push(user);
    var row;
    var ll; // Last Login
    var reg; // register date
    var edit_btn;
    if (user.last_login == 'never') {
        ll = 'never';
    } else {
        ll = new Date(user.last_login * 1000).toLocaleString();
    }
    edit_btn = $('<button></button>');
    edit_btn.addClass('btn btn-primary btn-xs');
    edit_btn.attr('data-user-id', user.id);
    edit_btn.attr('onclick', 'edit_user_btn_cb(this)');
    edit_btn.append('<i class="fa fa-pencil-square-o"></i>');
    reg = new Date(user.registration_date * 1000).toLocaleString();
    row = [edit_btn[0].outerHTML, user.id, user.display_name, user.full_name,
        user.email, 'None', ll, reg];
    user_datatable.row.add(row).draw();
}

function save_user_changes(form) {
    var values = form_to_dict(form);

    var request = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        display_name: values.display_name.trim(),
        email: values.email.trim(),
        groups: $('#user_info_group_sel').select2('val')
    };

    if (values.password.trim() != '')
        request.password = values.password.trim();

    $.ajax({
        async: true,
        type: "POST",
        url: ACCOUNT_URLS.user + current_loaded_info_user.id,
        contentType: "application/json",
        data: JSON.stringify(request),
        error: function (jqXHR, textStatus, errorThrown) {
            $.smallBox({
                title: 'There was an error while trying to save your changes',
                content: jqXHR.status + ': ' + errorThrown + ': ' + jqXHR.getResponseHeader('reason'),
                color: '#A65858',
                iconSmall: "fa fa-thumbs-down bounce animated"
            });
        },
        success: function (data, textStatus, jqXHR) {
            $.smallBox({
                title: 'Changes Saved',
                color: '#00CC11',
                iconSmall: "fa fa-thumbs-up bounce animated",
                timeout: 2000
            });
        }
    });
}

var user_info_group_sel;
function user_load_cb () {
    user_info_group_sel = $('#user_info_group_sel').select2({
        minimumInputLength: 2,
        dataType: 'jsonp',
        placeholder: 'Search Groups',
        quietMillis: 100,
        multiple: true,
        ajax: {
            url: '/account/group/search/',
            dataType: 'jsonp',
            data: function (term, page) {
                return {
                    term: term,
                    limit: 10,
                    organization: tt_org.id
                };
            },
            results: function (data, page) {
                var grps = [];
                for (var i = 0; i < data.length; i++) {
                    grps.push({id: data[i].id, text: data[i].name});
                }
                return {results: grps};
            },
            formatResult: function (group) {
                return '<div id="' + group.id + '">' + group.name + '</div>';
            },
            formatSelection: function (exercise) {
                return exercise.name;
            }
        },
        initSelection: function (element, callback) {
            var data = [];
            $(element.val().split(",")).each(function () {
                var group = this.split('--');
                data.push({id: group[0], text: group[1]});
            });
            callback(data);
        }
    });
    $('#new_user_form').validate({
        rules: {
            first_name: {
                required: true
            },
            last_name: {
                required: true
            },
            username: {
                required: true,
                rangelength: [3,75],
                remote: '/account/username/available/v2/'
            },
            password: {
                required: true,
                minlength: 6
            },
            password2: {
                required: true,
                equalTo: '#new_user_password'
            },
            email: {
                required: true,
                email: true
            },
            email2: {
                required: true,
                equalTo: '#new_user_email'
            },
            phone: {
                required: true
            }
        },
        messages: {
            first_name: {
                required: 'First name is required'
            },
            last_name: {
                required: 'Last name is required'
            },
            username: {
                required: 'Username is required',
                rangelength: "Username must be between 3 to 75 characters",
                remote: 'Username already taken'
            },
            password: {
                required: 'Password required',
                minlength: 'Password must be at least 6 characters'
            },
            password2: {
                required: 'Confirm password required',
                equalTo: 'Passwords do not match'
            },
            email: {
                required: 'Email address required',
                email: 'Must be a valid email address'
            },
            email2: {
                required: 'Please confirm your email address',
                equalTo: 'Email addresses do not match'
            },
            phone: {
                required: 'Phone number is required'
            }
        },
        errorPlacement : function(error, element) {
            error.insertAfter(element.parent());
        },
        submitHandler: function (form) {
            try {
                create_new_user($(form));
            } catch(e) {
                console.error('failed to create user: %s', e.message);
            }
        }
    });
    $('#user_info_form').validate({
        rules: {
            first_name: {
                required: true
            },
            last_name: {
                required: true
            },
            username: {
                required: true,
                rangelength: [3,20],
                remote: '/account/username/available/v2/'
            },
            password: {
                minlength: 6
            },
            password2: {
                equalTo: '#user_info_password'
            },
            email: {
                required: true,
                email: true
            },
            email2: {
                required: true,
                equalTo: '#user_info_email'
            }
        },
        messages: {
            first_name: {
                required: 'First name is required'
            },
            last_name: {
                required: 'Last name is required'
            },
            username: {
                required: 'Username is required',
                rangelength: "Username must be between 3 to 20 characters",
                remote: 'Username already taken'
            },
            password: {
                minlength: 'Password must be at least 6 characters'
            },
            password2: {
                equalTo: 'Passwords do not match'
            },
            email: {
                required: 'Email address required',
                email: 'Must be a valid email address'
            },
            email2: {
                required: 'Please confirm your email address',
                equalTo: 'Email addresses do not match'
            }
        },
        errorPlacement : function(error, element) {
            error.insertAfter(element.parent());
        },
        submitHandler: function (form) {
            try {
                save_user_changes($(form));
            } catch(e) {
                console.error('failed to edit user: %s', e.message);
            }
        }
    });
    initialize_user_table();
}