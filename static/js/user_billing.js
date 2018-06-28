var home_page = false;
var profile_page = true;
var billing = false;
var currently_selected_plan_id;
var checkout_jwt;
var checkout_ready = false;

function initialize() {
    log.debug("test data: %O", server_data);
    if (server_data == null) {
        log.error('no server data given');
    }

    var user = new User();
    user.initCurrentUser(JSON.parse(server_data.user));

    $("#save").click(function (e) {
        e.preventDefault();
        update_user_profile();
    });
    $("#projects_nav").click(function () {
        location.href = ARTIFACT_URLS.project_library;
    });
    $("#profile_nav").click(function () {
        location.href =ACCOUNT_URLS.profile + get_user().username;
    });
    $("#subscribe").click(checkout);
}

function on_plan_selection_change(e) {
    checkout_ready = false;
    currently_selected_plan_id = $(this).find(':selected')[0].id;
}

function get_jwt_callback(jwt, argvs) {
    checkout_jwt = jwt;
    checkout_ready = true;
}

function checkout() {
}

function successHandler(result) {

}

function failureHandler(result) {

}