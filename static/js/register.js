var username_check_timeout;
var password_check_timeout;
var email_check_timeout;
var phone_check_timeout;
var cell_phone_check_timeout;
var coupon_check_timeout;

var first_name_valid = false;
var last_name_valid = false;
var username_valid = false;
var password_name_valid = false;
var email_name_valid = false;
var phone_name_valid = false;
var coupon_valid = false;

function initialize() {
//    $("#payment_plan").bind("change", set_selected_plan_id);
    $("#first-name").bind("change paste keyup", check_first_name);
    $("#last-name").bind("change paste keyup", check_last_name);
    $("#username").bind("change paste keyup", check_if_username_available);
    $("#password").bind("change paste keyup", check_if_passwords_match);
    $("#confirm-password").bind("change paste keyup", check_if_passwords_match);
    $("#email").bind("change paste keyup", validate_email);
    $("#phone_number").bind("change paste keyup", validate_phone);
    $("#cell_phone").bind("change paste keyup", validate_cell_phone);
    $("#coupon").bind("paste keyup", validate_coupon);
    $("#register").click(function (e) {
        e.preventDefault();
        register_user();
    });
}

var selected_plan_id;
function set_selected_plan_id() {
    selected_plan_id = $(this).id;
}

function check_first_name() {
    if ($("#first-name") != '') {
        first_name_valid = true;
    } else {
        first_name_valid = false;
    }
}

function check_last_name() {
    if ($("#last-name") != '') {
        last_name_valid = true;
    } else {
        last_name_valid = false;
    }
}

function check_if_username_available(username) {
    var username_input = $("#username");
    var username_div = $("#username-div");
    if (username_check_timeout != null) {
        clearTimeout(username_check_timeout);
    }
    if (username_input.val().trim() == '') {
        username_div.removeClass('has-success');
        username_div.removeClass('has-error');
        username_valid = false;
        $("#username-taken-div").addClass('hidden');
        return;
    }
    username_check_timeout = setTimeout(function () {
        get_from_server('GET', ACCOUNT_URLS.username_available + username_input.val(), null,
            check_if_username_available_callback, null);
    }, 500);
}

function check_if_username_available_callback(result, argv) {
    var username_input = $("#username");
    var username_div = $("#username-div");
    if (result['username'] != 'available' && username_input.val() != '') {
        username_div.removeClass('has-error');
        username_div.addClass('has-success');
        username_valid = true;
        $("#username-taken-div").addClass('hidden');
    } else if (username_input.val() == '') {
        username_div.removeClass('has-success');
        username_div.removeClass('has-error');
        username_valid = false;
        $("#username-taken-div").addClass('hidden');
    } else {
        username_div.removeClass('has-success');
        username_div.addClass('has-error');
        username_valid = false;
        $("#username-taken-div").removeClass('hidden');
    }
}

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
            password_name_valid = true;
            $("#password-div").addClass('has-success');
        } else if (password.val() == '' && confirm_password.val() == ''){
            $("#confirm-pass-div").removeClass('has-success');
            $("#password-div").removeClass('has-success');
            $("#confirm-pass-div").removeClass('has-error');
            password_name_valid = false;
            $("#password-div").removeClass('has-error');
        }else {
            $("#confirm-pass-div").removeClass('has-success');
            $("#password-div").removeClass('has-success');
            $("#confirm-pass-div").addClass('has-error');
            password_name_valid = false;
            $("#password-div").addClass('has-error');
        }
    }, 500);

}

function validate_email() {
    var email = $("#email");
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email_check_timeout != null) {
        clearTimeout(email_check_timeout);
    }
    email_check_timeout = setTimeout(function () {
        if (re.test(email.val())) {
            $("#email-div").removeClass('has-error');
            $("#email-div").addClass('has-success');
            email_name_valid = true;
        } else if (email.val() == '') {
            $("#email-div").removeClass('has-success');
            $("#email-div").removeClass('has-error');
            email_name_valid = false;
        } else {
            $("#email-div").removeClass('has-success');
            $("#email-div").addClass('has-error');
            email_name_valid = false;
        }
    }, 500);
}

function validate_phone() {
    var phone = $("#phone_number");
    if (phone_check_timeout != null) {
        clearTimeout(phone_check_timeout);
    }
    phone_check_timeout = setTimeout(function () {
        var stripped = phone.val().replace(/[\(\)\.\-\ ]/g, '');
        if (!isNaN(parseInt(stripped)) && stripped.length == 10) {
            $("#phone-number-div").removeClass('has-error');
            $("#phone-number-div").addClass('has-success');
            phone_name_valid = true;
        } else if (stripped == '') {
            $("#phone-number-div").removeClass('has-success');
            $("#phone-number-div").removeClass('has-error');
            phone_name_valid = false;
        } else {
            $("#phone-number-div").removeClass('has-success');
            $("#phone-number-div").addClass('has-error');
            phone_name_valid = false;
        }
    }, 500);
}

function validate_cell_phone() {
    var phone = $("#cell_phone");
    if (cell_phone_check_timeout != null) {
        clearTimeout(cell_phone_check_timeout);
    }
    cell_phone_check_timeout = setTimeout(function () {
        var stripped = phone.val().replace(/[\(\)\.\-\ ]/g, '');
        if (!isNaN(parseInt(stripped)) && stripped.length == 10) {
            $("#cell-phone-number-div").removeClass('has-error');
            $("#cell-phone-number-div").addClass('has-success');
        } else if (stripped == '') {
            $("#cell-phone-number-div").removeClass('has-success');
            $("#cell-phone-number-div").removeClass('has-error');
        } else {
            $("#cell-phone-number-div").removeClass('has-success');
            $("#cell-phone-number-div").addClass('has-error');
        }
    }, 500);
}

function validate_coupon(e) {
    var coupon_code = $("#coupon").val().trim();
    var coupon_message = $("#coupon_message");
    if (coupon_check_timeout != null) {
        clearTimeout(coupon_check_timeout);
    }
    if (coupon_code == '') {
        $("#coupon_div").removeClass('has-success');
        $("#coupon_div").removeClass('has-error');
        coupon_message.addClass('hidden');
        coupon_valid = true;
        return;
    }
    coupon_check_timeout = setTimeout(function () {
        get_from_server('GET', PAYMENT_URLS.coupon + coupon_code, null, validate_coupon_callback,
            {'stripped': coupon_code});
    }, 1000);
}

function validate_coupon_callback(coupon, argv) {
    log.debug(coupon);
    log.debug(argv);
    var stripped;
    var error_msg;
    var valid = true;
    if (coupon == 'failed' && argv == 'invalid coupon code') {
        error_msg = 'Invalid coupon code';
        valid = false;
    }  else if (coupon == 'failed') {
        log.error('problem getting coupon: %s', argv);
        valid = false;
    } else if (!coupon['active']) {
        error_msg = 'Coupon is not active';
        valid = false;
    } else {
        stripped = argv['stripped'];
    }
    var coupon_message = $("#coupon_message");
    if (valid && stripped != '') {
        $("#coupon_div").removeClass('has-error');
        $("#coupon_div").addClass('has-success');
        coupon_message.html('Valid Coupon');
        coupon_message.removeClass('hidden');
        coupon_valid = true;
    } else if (stripped == '') {
        $("#coupon_div").removeClass('has-success');
        $("#coupon_div").removeClass('has-error');
        coupon_message.addClass('hidden');
        coupon_valid = true;
    } else {
        $("#coupon_div").removeClass('has-success');
        $("#coupon_div").addClass('has-error');
        coupon_message.html(error_msg);
        coupon_message.removeClass('hidden');
        coupon_valid = false;
    }
}

function register_user() {
    var alert_error = $("#alert-error");
    if (!first_name_valid) {
        alert_error.html('Please fill in a valid First Name');
        alert_error.removeClass('hidden');
    } else if (!last_name_valid) {
        alert_error.html('Please fill in a valid Last Name');
        alert_error.removeClass('hidden');
    } else if (!username_valid) {
        alert_error.html('Please fill in a valid Username');
        alert_error.removeClass('hidden');
    } else if (!password_name_valid) {
        alert_error.html('Please fill in a valid password');
        alert_error.removeClass('hidden');
    } else if (!email_name_valid) {
        alert_error.html('Please fill in a valid Email');
        alert_error.removeClass('hidden');
    }else if (!phone_name_valid) {
        alert_error.html('Please fill in a valid Phone Number');
        alert_error.removeClass('hidden');
    } else if (!$("#t-n-c").prop('checked')) {
        alert_error.html('You must agree to out Terms and Conditions before you can register');
        alert_error.removeClass('hidden');
    }else {
        alert_error.addClass('hidden');
        var payment_plan = $("#payment_plan")[0].selectedOptions[0].id;
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
        var coupon = $("#coupon").val();

        var phone_numbers = {'main': phone_number};
        if (cell_phone_number.trim() != '') {
            phone_numbers['cell'] = cell_phone_number;
        }
        var request = {
            'merchant': 'google_wallet',
            'username': username,
            'first_name': first_name,
            'last_name': last_name,
            'password': password,
            'email': email,
            'phone_numbers': phone_numbers,
            'payment_plan': payment_plan
        };
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
        if (coupon.trim() != '') {
            request['coupon_code'] = coupon;
        }
        if (birthday.trim() != '') {
            request['birthday'] = birthday;
        }

        comms.put({
            async: false,
            url: ACCOUNT_URLS.register,
            data: request
        });

        window.location.replace(PAYMENT_URLS.checkout);
    }
}
