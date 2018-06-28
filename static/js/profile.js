var home_page = false;
var profile_page = true;
var billing = false;

function initialize() {
    log.info("test data: %O", server_data);
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
        location.href = '/';
    });
    $("#billing_nav").click(function () {
        location.href = '/user/billing/' + user.getUserName();
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
        var confirm_pass_div = $("#confirm-pass-div");
        var password_div = $("#password-div");

        if (password.val() === confirm_password.val() &&
                confirm_password.val() !== '' && password.val() !== '') {
            confirm_pass_div.removeClass('has-error');
            password_div.removeClass('has-error');
            confirm_pass_div.addClass('has-success');
            password_valid = true;
            password_div.addClass('has-success');
        } else if (password.val() === '' && confirm_password.val() === ''){
            confirm_pass_div.removeClass('has-success');
            password_div.removeClass('has-success');
            confirm_pass_div.removeClass('has-error');
            password_valid = false;
            password_div.removeClass('has-error');
        }else {
            confirm_pass_div.removeClass('has-success');
            password_div.removeClass('has-success');
            confirm_pass_div.addClass('has-error');
            password_valid = false;
            password_div.addClass('has-error');
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
    var user = User.getCurrent();
    if (update_first_name) {
        user.setFirstName($("#first-name").val());
    }
    if (update_last_name) {
        user.setLastName($("#last-name").val());
    }
    if (update_password) {
        if (password_valid) {
            user.setPassword($("#password").val());
        } else {
            tt_notify.alert('Password is not valid');
        }
    }
    if (update_email) {
        user.setEmail($("#email").val());
    }
    if (update_main_phone) {
        user.setPhoneNumber('main', $("#phone_number").val());
    }
    if (update_cell_phone) {
        user.setPhoneNumber('cell', $("#cell_number").val());
    }
    if (update_birthday) {
        user.setBirthday($("#birthday").val());
    }
    if (update_address) {
        user.setAddress($("#street-address1").val(), $("#street-address2").val(),
                            $("#city").val(), $("#state").val(), $("#zip-code").val());
    }

    user.save();
}

window.onerror = function(message, url, line) {
    log.error('Window Error:', '\nmessage: ', message, '\nurl: ', url, '\nline: ', line);
};

window.onload = initialize;