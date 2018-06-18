function org_login_btn_cb(btn) {
    log_into_org_admin_panel(btn.id);
}

function log_into_org_admin_panel(org_id) {
    window.open(get_admin_url('index', org_id), '_blank');
}

var org_datatable;
function load_org_table(orgs) {
    $('#organization_table').dataTable({
        bAutoWidth: false,
        bDestroy : true,
        aoColumns : [
            {"sWidth": "3px"},
            {"sWidth": "100px"},
            {"sWidth": "100px"},
            {"sWidth": "100px"},
            {"sWidth": "100px"},
            {"sWidth": "100px"},
            {"sWidth": "100px"},
            {"sWidth": "100px"}
        ]
    });
    org_datatable = $('#organization_table').DataTable();
    var row;
    var log_btn;
    var create; // create date
    for (var i = 0; i < orgs.length; i++) {
        log_btn = $('<a></a>');
        log_btn.addClass('btn btn-primary btn-xs org_log_btn');
        log_btn.attr('href', 'javascript:void(0);');
        log_btn.attr('id', orgs[i].id);
        log_btn.append($('<i class="fa fa-sign-in"></i>'));
        create = new Date(orgs[i].created_ts * 1000).toLocaleString();
        row = [log_btn[0].outerHTML, orgs[i].id, orgs[i].name, orgs[i].email, orgs[i].phone, orgs[i].domain, orgs[i].webpage, create];
        org_datatable.row.add(row).draw();
    }
    $('.org_log_btn').on('click', function (e) {
        org_login_btn_cb(this);
    });
//    org_datatable.fnAdjustColumnSizing();
}

function create_org_user(form) {
    $('#new_org_modal').modal('hide');
    var values = form_to_dict(form);

    var request = {
        id: values.id.trim(),
        name: values.name.trim(),
        account_type: values.account_type.trim(),
        point_of_contact: values.point_of_contact.trim(),
        domain: values.domain.trim(),
        webpage: values.webpage.trim(),
        owner: values.owner.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        fax: values.fax.trim(),
        description: values.description.trim()
    };

    form[0].reset();
    $.ajax({
        async: true,
        type: "PUT",
        url: ACCOUNT_URLS.organization,
        contentType: "application/json",
        data: JSON.stringify(request),
        error: function (jqXHR, textStatus, errorThrown) {
            $.smallBox({
                title: 'There was an error while trying to create new organization',
                content: jqXHR.status + ': ' + errorThrown + ': ' + jqXHR.getResponseHeader('reason'),
                color: '#A65858',
                iconSmall: "fa fa-thumbs-down bounce animated"
            });
        },
        success: function (data, textStatus, jqXHR) {
            $.smallBox({
                title: 'Organization Created',
                color: '#00CC11',
                iconSmall: "fa fa-thumbs-up bounce animated",
                timeout: 2000
            });
            load_new_org(data);
        }
    });
}

function load_new_org(org) {
    var log_btn = $('<a></a>');
    log_btn.addClass('btn btn-primary btn-xs org_log_btn');
    log_btn.attr('href', 'javascript:void(0);');
    log_btn.attr('id', org.id);
    log_btn.append($('<i class="fa fa-sign-in"></i>'));
    var create = new Date(org.created_ts * 1000).toLocaleString();
    var row = [log_btn[0].outerHTML, org.id, org.name, org.email, org.phone, org.domain, org.webpage, create];
    org_datatable.row.add(row).draw();
    $('.org_log_btn').on('click', function (e) {
        org_login_btn_cb(this);
    });
}

function initialize_org_table () {
    if (tt_org) {

    } else {
        $('#org_table').onresize = function () {
            org_datatable.fnAdjustColumnSizing();
        };
        get_from_server('GET', get_admin_url('organization', null), null, load_org_table);

        $('#new_org_form').validate({
            rules: {
                id: {
                    required: true
                },
                name: {
                    required: true
                }
            },
            messages: {
                id: {
                    required: 'Organization id is required'
                },
                name: {
                    required: 'Organization Name is required'
                }
            },
            errorPlacement : function(error, element) {
                error.insertAfter(element.parent());
            },
            submitHandler: function (form) {
                try {
                    create_org_user($(form));
                } catch(e) {
                    console.error('failed to create org: %s', e.message);
                }
            }
        });
    }
}