var home_page = false;
var profile_page = true;
var billing = false;

function initialize() {
    log.info("test data: %O", server_data);
    if (server_data == null) {
        log.error('no server data given');
    }
    set_user(JSON.parse(server_data.user));
    $("#save").click(function (e) {
        e.preventDefault();
        update_user_profile();
    });
    $("#projects_nav").click(function () {
        location.href = '/';
    });
    $("#billing_nav").click(function () {
        location.href = '/user/billing/' + get_user().username;
    });
    $("#first-name").bind("paste keyup", function() {
        update_first_name = true;
    });
    $("#last-name").bind("paste keyup", function() {
        update_last_name = true;
    });
    $("#password").bind("paste keyup", function () {
        update_password = true;
        check_if_passwords_match();
    });
    $("#confirm-password").bind("paste keyup", function () {
        check_if_passwords_match();
    });
    $("#email").bind("paste keyup", function () {
        update_email = true;
    });
    $("#phone_number").bind("paste keyup", function () {
        update_main_phone = true;
    });
    $("#cell_phone").bind("paste keyup", function ()  {
        update_cell_phone = true;
    });
    $("#birthday").bind("paste keyup", function ()  {
        update_birthday = true;
    });
    $("#street-address1").bind("paste keyup", function ()  {
        update_address = true;
    });
    $("#street-address2").bind("paste keyup", function ()  {
        update_address = true;
    });
    $("#city").bind("paste keyup", function ()  {
        update_address = true;
    });
    $("#state").bind("paste keyup", function ()  {
        update_address = true;
    });
    $("#zip-code").bind("paste keyup", function ()  {
        update_address = true;
    });
}

var password_check_timeout;
var password_valid = false;
function check_if_passwords_match() {
    var password = $("#password");
    var confirm_password = $("#confirm-password");
    if (password_check_timeout != null) {
        clearTimeout(password_check_timeout);
    }
    password_check_timeout = setTimeout(function () {
        if (password.val() == confirm_password.val() &&
                confirm_password.val() != '' && password.val() != '') {
            $("#confirm-pass-div").removeClass('has-error');
            $("#password-div").removeClass('has-error');
            $("#confirm-pass-div").addClass('has-success');
            password_valid = true;
            $("#password-div").addClass('has-success');
        } else if (password.val() == '' && confirm_password.val() == ''){
            $("#confirm-pass-div").removeClass('has-success');
            $("#password-div").removeClass('has-success');
            $("#confirm-pass-div").removeClass('has-error');
            password_valid = false;
            $("#password-div").removeClass('has-error');
        }else {
            $("#confirm-pass-div").removeClass('has-success');
            $("#password-div").removeClass('has-success');
            $("#confirm-pass-div").addClass('has-error');
            password_valid = false;
            $("#password-div").addClass('has-error');
        }
    }, 500);

}

var update_first_name;
var update_last_name;
var update_password;
var update_email;
var update_main_phone;
var update_cell_phone;
var update_birthday;
var update_address;
function update_user_profile() {
    if (update_first_name) {
        change_user_first_name($("#first-name").val());
    }
    if (update_last_name) {
        change_user_last_name($("#last-name").val());
    }
    if (update_password) {
        if (password_valid) {
            change_user_password($("#password").val());
        } else {
            tt_notify.alert('Password is not valid');
        }
    }
    if (update_email) {
        change_user_email($("#email").val());
    }
    if (update_main_phone) {
        change_user_phone_number('main', $("#phone_number").val());
    }
    if (update_cell_phone) {
        change_user_phone_number('cell', $("#cell_number").val());
    }
    if (update_birthday) {
        change_user_birthday($("#birthday").val())
    }
    if (update_address) {
        change_user_address($("#street-address1").val(), $("#street-address2").val(),
                            $("#city").val(), $("#state").val(), $("#zip-code").val());
    }
}

window.onerror = function(message, url, line) {
    log.error('Window Error:', '\nmessage: ', message, '\nurl: ', url, '\nline: ', line);
};

window.onload = initialize;