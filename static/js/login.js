function login() {
    var username = $("#username").val();
    var password = $("#password").val();
    var request_data = {"status": "login", "username": username, "password": password};

    var results = post_to_server(ACCOUNT_URLS.login, request_data, false);
    console.log(results);
    if (results['status'] == 'success') {
        window.location.replace(ARTIFACT_URLS.project_library);
    } else  if (results['status'] == 'disabled'){
        window.location.replace(ACCOUNT_URLS.login_disabled);
    } else {
        $('#bad-login-alert').removeClass('hidden');
    }
    return false;
}

function register() {
    $(location).attr('href', ACCOUNT_URLS.register);
}

window.onload = function() {
    $("#forgot_username").click(function() {
        tt_notify.prompt("What is your email address?", function (result) {
            if (result === null) {
                return;
            } else if (result.trim() == '') {
                tt_notify.alert('Please fill in a email');
            } else {
                get_from_server('GET', ACCOUNT_URLS.username_email, {'email': result}, null, null)
                tt_notify.alert('Please checkyou email for your username');
            }
        });
    });
    $("#forgot_password").click(function () {
        var username = $("#username").val();
        if (username.trim() == '') {
            tt_notify.alert('Please fill in your username');
            return;
        }
        if (post_to_server(ACCOUNT_URLS.login, {'username': username, 'reset_password': true}, false) == -1) {
            tt_notify.alert('There was a problem with resetting your password, ' +
                'please make sure your username is correct. ' +
                'If you continue to have trouble logging in please contact support.'
            );
        } else {
            tt_notify.alert('Please check your email for password reset link');
        }
    });

    if ($('#browser').text() != 'CHROME') {
        $('#non-std-browser-msg').removeClass('hidden');
    }
};