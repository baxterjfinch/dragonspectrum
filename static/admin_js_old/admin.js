function initialize() {
    log.debug('initializing');
    get_user();
    insert_nav_bar();
    load_orgaizations();
    if (is_user_super_admin()) {
        insert_organization_list();
    } else {
        fill_organization_data();
    }
    insert_user_toolbar();
    insert_group_toolbar();
    insert_project_toolbar();
    if(is_user_super_admin()){
        var start_date = new Date();
        var start_picker = $('#start_picker1');
        var end_picker = $('#end_picker1');
        start_picker.datetimepicker();
        start_picker.data("DateTimePicker").setStartDate(start_date);
        end_picker.datetimepicker();
        end_picker.data("DateTimePicker").setStartDate(start_date);
        start_picker.on("change.dp",function (e) {
                   end_picker.data("DateTimePicker").setStartDate(e.date);
        });
        end_picker.on("change.dp",function (e) {
           start_picker.data("DateTimePicker").setEndDate(e.date);
        });
    }
}

function insert_nav_bar() {
    var nav_bar_html = ('\
<nav class="navbar navbar-inverse" role="navigation">\
    <div class="navbar-header">\
        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">\
            <span class="sr-only">Toggle navigation</span>\
            <span class="icon-bar"></span>\
            <span class="icon-bar"></span>\
            <span class="icon-bar"></span>\
        </button>\
        <a id="show_properties_view" class="navbar-brand" href="#">thinkTank</a>\
    </div>\
    <div class="collapse navbar-collapse">\
        <ul class="nav navbar-nav">\
            <li><a id="user_settings_nav">User/Org Settings</a></li>\
            <li><a id="server_settings_nav">Server Settings</a></li>\
        </ul>\
        <ul class="nav navbar-nav navbar-right">\
            <li class="dropdown">\
                <a id="user_dropdown" class="dropdown-toggle" data-toggle="dropdown" href="#">\
                    <span id="nav_bar_user_name"></span>\
                    <b class="caret"></b>\
                </a>\
                <ul class="dropdown-menu">\
                    <li><a id="nar_bar_user" href="#">Account</a></li>\
                    <li class="divider"></li>\
                    <li><a id="nar_bar_user_logout" href="#">Log out</a></li>\
                </ul>\
            </li>\
        </ul>\
    </div>\
</nav>\
            ');

    $("#nav_bar").html(nav_bar_html);
    $("#nav_bar_user_name").html($.cookie('auth_user'));
    $("#user_settings_nav").click(function() {
        $("#user_settings").removeClass('hidden');
        $("#server_settings").addClass('hidden');
    });

    if (is_user_super_admin()){
        $("#server_settings_nav").click(function () {
            $("#server_settings").removeClass('hidden');
            $("#user_settings").addClass('hidden');
            init_settings_page();
        });
    } else {
        $("#server_settings_nav").hide()
    }

    $("#nar_bar_user_logout").click(logout);

}

var settings_page_init = false;
function init_settings_page() {
    if (settings_page_init) {
        return;
    }
    settings_page_init = true;
    get_from_server('GET', PAYMENT_URLS.coupon_admin, {'coupon_types': true}, fill_coupon_engine_select, null);
    get_from_server('GET', PAYMENT_URLS.paymentplan, null, fill_payment_plan_table, null);
    $("#save_coupon").click(function (e) {
        e.stopPropagation();
        create_coupon();
        return false;
    });
}

function logout() {
    var request_data = {"status": "logout", "user": $.cookie('auth_user')};
    $.ajax({
        async: true,
        type: "POST",
        url: ACCOUNT_URLS.login,
        contentType: "application/json",
        data: JSON.stringify(request_data),
        success: function (data, textStatus, jqXHR) {
            $.removeCookie('auth_token', {path: STATIC_URLS.root});
            $.removeCookie('auth_user', {path: STATIC_URLS.root});
            $(location).attr('href', ARTIFACT_URLS.project_library);
        }
    });
}

window.onerror = function myErrorHandler(errorMsg, url, line) {
    log.error('Window Error:', '\nmessage: ', errorMsg, '\nurl: ', url, '\nline: ', line);
}

// This is the starting point for the JavaScript
window.onload = initialize;