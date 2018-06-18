var group_datatable;
function init_group_table() {
    group_datatable = $('#org_group_table').DataTable({
        "columnDefs": [
            {
                "targets": [0],
                "visible": false,
                "searchable": false
            }
        ]
    });

    $('#org_group_table tbody').on('click', 'tr', function () {
        if ($(this).hasClass('dt_selected')) {
            $(this).removeClass('dt_selected');
        }
        else {
            group_datatable.$('tr.dt_selected').removeClass('dt_selected');
            $(this).addClass('dt_selected');
        }
    } );

    $('#delete_group_btn').click( function () {
        var id = group_datatable.row('.dt_selected').data()[0];
        group_datatable.row('.dt_selected').remove().draw(false);
        queued_send_to_server('DELETE', 'grp_del', ACCOUNT_URLS.group_admin + id, null, null, null);
    } );
}

function load_group_table() {
    var row;
    var cd; // created date
    if (_groups.length > 0)
        load_group_information_widget(_groups[0]);
    for (var i = 0; i < _groups.length; i++) {
        cd = new Date(_groups[i].created_ts * 1000).toLocaleString();
        row = [_groups[i].id, _groups[i].name, _groups[i].description, cd];
//        row = [_groups[i].id, edit_btn[0].outerHTML, _groups[i].name, _groups[i].description, cd];
        group_datatable.row.add(row).draw();
    }
}

function initialize_group_table() {
    init_group_table();
    if (_groups.length == 0) {
        if (tt_org) {
            get_from_server('GET', get_admin_url('groups', tt_org.id), null, load_group_table_cb);
        } else {
            get_from_server('GET', get_admin_url('groups', null), null, load_group_table_cb);
        }
    } else {
        load_group_table();
    }
}

function load_group_table_cb(gs) {
    _groups = gs;
    load_group_table();
}

function get_groups_by_id(id) {
    for (var i = 0; i < _groups.length; i++) {
        if (_groups[i].id == id)
            return _groups[i];
    }
    return null;
}

function edit_group_btn_cb(btn) {
    var group = get_group_by_id($(btn).attr('data-group-id'));
    if (group)
        load_group_information_widget(group);
}

var current_loaded_info_group;
function load_group_information_widget(group) {
    var group_info_form = $('#group_info_form');
    current_loaded_info_group = group;
    group_info_form.find('input[name="name"]').val(group.name);
    group_info_form.find('input[name="description"]').val(group.description);
}

function create_new_group(form) {
    $('#new_group_modal').modal('hide');
    var values = form_to_dict(form);

    var request = {
        "command": "new",
        "name": values.name,
        "description": values.description,
        "hidden": values.hidden_group == 'on',
        "return": 'group_dict'
    };

    if (window.tt_organization) {
        request.organization = window.tt_organization.id;
    } else {
        throw 'Group creatation of non organization accounts is not currently supported';
    }

    form[0].reset();
    $.ajax({
        async: true,
        type: "PUT",
        url: ACCOUNT_URLS.group,
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
            load_new_group(data);
        }
    });
}

function load_new_group(group) {
    _groups.push(group);
    var cd = new Date(group.created_ts * 1000).toLocaleString();
    group_datatable.row.add([group.id, group.name, group.description, cd]).draw();
//    group_datatable.row.add([groups.id, edit_btn[0].outerHTML, group.name, group.description, cd]).draw();
}

function save_group_changes(form) {
    var values = form_to_dict(form);

    var request = {
        name: values.name.trim(),
        description: values.description.trim(),
        hidden: values.hidden_group
    };

    $.ajax({
        async: true,
        type: "POST",
        url: ACCOUNT_URLS.group + current_loaded_info_group.id,
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

function group_load_cb () {
    $('#new_group_form').validate({
        rules: {
            name: {
                required: true
            }
        },
        messages: {
            name: {
                required: 'First name is required'
            }
        },
        errorPlacement : function(error, element) {
            error.insertAfter(element.parent());
        },
        submitHandler: function (form) {
            try {
                create_new_group($(form));
            } catch(e) {
                console.error('failed to create group: %s', e.message);
            }
        }
    });
    initialize_group_table();
}