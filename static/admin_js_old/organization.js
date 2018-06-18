var _organizations;
var _current_organization;

function load_orgaizations() {
    if (is_user_super_admin()) {
        comms.get({
            async: false,
            url: ACCOUNT_URLS.organization,
            success: function (data) {
                _organizations = data;
            }
        });
        _current_organization = _organizations[0].id;
    } else {
        comms.get({
            async: false,
            url: ACCOUNT_URLS.organization,
            success: function (data) {
                _organizations = [data];
            }
        });
        _current_organization = _organizations[0].id;
    }
}

function insert_organization_list() {
    for (var i = 0; i < _organizations.length; i++) {
        correct_organization_missing_data(_organizations[i]);

    }

    var organization_selector = ('\
<form class="form-horizontal" role="form">\
<div class="form-group">\
    <label class="control-label" for="organization_selector">Organizations</label>\
        <div>\
            <select class="form-control" id="organization_selector"> \
    ');

    for (var i = 0; i < _organizations.length; i++) {
        organization_selector = organization_selector.concat('<option value="' + _organizations[i].id + '">' +
            _organizations[i].name + '</option>');

    }

    organization_selector = organization_selector.concat('</select> <div class="btn-group"> \
<button type="button" class="btn btn-xs" onclick="show_create_new_organization()"><i class="fa fa-plus"></i></button> \
<button type="button" class="btn btn-xs" onclick="delete_organization()"><i class="fa fa-minus"></i></button> \
<button type="button" class="btn btn-xs" onclick="show_organization_info()"><i class="fa fa-info-circle"></i></button>\
</div></div></div></form>');

    $("#organization_list").html(organization_selector);
    $("#organization_selector").change(function() {
        _current_organization = this.value;
        fill_organization_data();

    });

    fill_organization_data();

}

function add_to_organization_list(org) {
    $("#organization_selector").append(new Option(org.name, org.id));

}

function remove_organization_from_list(org) {
    $("#organization_selector option[value='" + org.id + "']").remove();
    $("#organization_selector").change();

}

// There are other functions that will try to read this data, if it is not
// present then we will create a place holder so that we don't error out
// later
function correct_organization_missing_data(org) {
    if (org['id'] == null) {
        org['id'] = "None";
    }

    if (org['description'] == null) {
        org['description'] = "None";
    }

    if (org['domain'] == null) {
        org['domain'] = "None";
    }

    if (org['owner'] == null) {
        org['owner'] = "None";
    }

    if (org['webpage'] == null) {
        org['webpage'] = "None";
    }

    if (org['point_of_contact'] == null) {
        org['point_of_contact'] = "None";
    }

    if (org['email'] == null) {
        org['email'] = "None";
    }

    if (org['phone'] == null) {
        org['phone'] = "None";
    }

    if (org['fax'] == null) {
        org['fax'] = "None";
    }

    if (org['account_type'] == null) {
        org['account_type'] = "None";
    }

}

function show_create_new_organization() {
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("Create New Organization");

    $("#modal_content").show().html('\
<form class="form-horizontal" id="modal_document" role="form"> \
    <div class="form-group"> \
        <label class="control-label" for="id">ID (no whitespace)</label> \
        <div> \
            <input class="form-control" type="text" id="id"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="name">Name</label> \
        <div> \
            <input class="form-control" type="text" id="name"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="account_type">Account Type</label> \
        <div> \
            <input class="form-control" type="text" id="account_type"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="point_of_contact">Point of contact</label> \
        <div> \
            <input class="form-control" type="text" id="point_of_contact"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="domain">Domain</label> \
        <div> \
            <input class="form-control" type="text" id="domain"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="owner">Owner</label> \
        <div> \
            <input class="form-control" type="text" id="owner"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="webpage">Webpage</label> \
        <div> \
            <input class="form-control" type="text" id="webpage"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="email">Email</label> \
        <div> \
            <input class="form-control" type="text" id="email"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="phone">Phone</label> \
        <div> \
            <input class="form-control" type="text" id="phone"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="fax">Fax</label> \
        <div> \
            <input class="form-control" type="text" id="fax"> \
        </div> \
    </div> \
    <div class="form-group"> \
        <label class="control-label" for="description">Description</label> \
        <div> \
            <textarea class="form-control" rows=\"7\" class=\"input-block-level\" id=\"description\"></textarea> \
        </div> \
    </div>\
</form>');

    $("#modal_save_button").show().html('\
<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button> \
<button id="organization_save" class="btn btn-primary">Save</button>\
    ');

    $('#modal_dialog').on('shown.bs.modal', function () {
        $('#id').focus();
    });

    $("#organization_save").on("click", function() {
        create_new_organization();
    });

}

function create_new_organization() {
    var id = $("#id").val();
    var name = $("#name").val();
    var account_type = $("#account_type").val();
    var domain = $("#domain").val();
    var point_of_contact = $("#point_of_contact").val();
    var owner = $("#owner").val();
    var webpage = $("#webpage").val();
    var email = $("#email").val();
    var phone = $("#phone").val();
    var fax = $("#fax").val();
    var description = $("#description").val();

    $("#modal_dialog").modal("hide");
    var date = new Date();
    var org_request = {
        "name": name,
        "account_type": account_type,
        "domain": domain,
        "point_of_contact": point_of_contact,
        "owner": owner,
        "webpage": webpage,
        "email": email,
        "phone": phone,
        "fax": fax,
        "description": description,
        "id": id,
        'admins': [],
        'created_ts': date.getTime(),
        'modified_ts': date.getTime(),
        'groups': [{
            'active': true,
            'admins': [],
            'created_ts': date.getTime(),
            'modified_ts': date.getTime(),
            'id': generateUUID1(),
            'name': name,
            'description': name + '\'s organization group',
            'organization': id
        }]
    };

    comms.put({
        async: false,
        url: ACCOUNT_URLS.organization,
        data: org_request
    });
    _organizations.push(org_request);
    add_to_organization_list(org_request);
    $("#organization_selector").val(org_request.id);
    _current_organization = org_request.id;
    fill_organization_data();
}

function delete_organization() {
//    bootbox.confirm("Are you sure?", function (result) {
//        if (result) {
//            var cur_org = get_current_organization();
//            var org_request = {"command": "delete", "organization_id": cur_org.id};
//            var results = put_to_server(ACCOUNT_URLS.organization, org_request, false);
//            if (results["failed"] == null) {
//                for (var i = 0; i < _organizations.length; i++) {
//                    if (_organizations[i].id == _current_organization) {
//                        remove_organization_from_list(_organizations[i]);
//                        _organizations.splice(i, 1);
//                        break;
//
//                    }
//
//                }
//                $("#organization_selector option[value='" + cur_org.id + "']").remove();
//
//            } else {
//                alert("Failed to delete Organization: " + results["failed"]);
//            }
//
//        }
//    });
}

function show_organization_info() {
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("Create New Document");
    var org = get_current_organization();
    var date = new Date();
    var year = date.getFullYear();
    // TODO: it may be better to create an html file for this and not take up
    // so much room here. What do you think?
    $("#modal_content").show().html('\
<form class="form-horizontal" id="modal_document"> \
    <div class="control-group"> \
        <label class="control-label" for="id">ID (no whitespace)</label> \
        <div class="controls"> \
            <input type="text" id="id" value="' + org.id + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="name">Name</label> \
        <div class="controls"> \
            <input type="text" id="name" value="' + org.name + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="account_type">Account Type</label> \
        <div class="controls"> \
            <input type="text" id="account_type" value="' + org.account_type + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="domain">Domain</label> \
        <div class="controls"> \
            <input type="text" id="domain" value="' + org.domain + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="owner">Owner</label> \
        <div class="controls"> \
            <input type="text" id="owner" value="' + org.owner + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="webpage">Webpage</label> \
        <div class="controls"> \
            <input type="text" id="webpage" value="' + org.webpage + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="email">Email</label> \
        <div class="controls"> \
            <input type="text" id="email" value="' + org.email + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="phone">Phone</label> \
        <div class="controls"> \
            <input type="text" id="phone" value="' + org.phone + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="fax">Fax</label> \
        <div class="controls"> \
            <input type="text" id="fax" value="' + org.fax + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="account_create_time">Account Create Time</label> \
        <div class="controls"> \
            <input type="text" id="fax" value="' + org.created_ts + '" disabled> \
        </div> \
    </div> \
    <div class="control-group"> \
        <label class="control-label" for="description">Description</label> \
        <div class="controls"> \
            <textarea rows=\"7\" class=\"input-block-level\" id=\"description\" disabled>' + org.description + ' \
            </textarea> \
        </div> \
    </div>\
</form>');

    $("#modal_save_button").show().html('<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>');

    $('#modal_dialog').on('shown.bs.modal', function () {
        $('#name').focus();
    })
    $("#organization_save").attr("onclick", "return create_new_organiation(this)");

}

function fill_organization_data() {
    fill_user_table();
    fill_group_table();
    fill_project_table();

}

function refresh_organization_data(data, args) {
    fill_organization_data();
}

function get_current_organization() {
    for (var i = 0; i < _organizations.length; i++) {
        if (_organizations[i].id == _current_organization) {
            return _organizations[i];

        }

    }

    return null;
}

function get_current_organization_id() {
    var org = get_current_organization();
    if (org != null) {
        return org['id'];
    }
    return null;
}