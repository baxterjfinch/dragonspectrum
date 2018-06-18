function send_session_analytics() {
    var navigator = window.navigator;
    var analytic = {};
    if (navigator.hasOwnProperty('appCodeName'))
        analytic.app_code_name = navigator.appCodeName;
    if (navigator.hasOwnProperty('appName'))
        analytic.app_name = navigator.appName;
    if (navigator.hasOwnProperty('appVersion'))
        analytic.app_version = navigator.appVersion;
    if (navigator.hasOwnProperty('cookieEnabled'))
        analytic.cookie_enabled = navigator.cookieEnabled;
    if (navigator.hasOwnProperty('doNotTrack'))
        analytic.do_not_track = navigator.doNotTrack;
    if (navigator.hasOwnProperty('geolocation'))
        analytic.geolocation = navigator.geolocation;
    if (navigator.hasOwnProperty('language'))
        analytic.language = navigator.language;
    else if (navigator.hasOwnProperty('systemLanguage'))
        analytic.language = navigator.systemLanguage;
    if (navigator.hasOwnProperty('platform'))
        analytic.platform = navigator.platform;
    if (navigator.hasOwnProperty('product'))
        analytic.product = navigator.product;
    if (navigator.hasOwnProperty('vender'))
        analytic.vender = navigator.vender;

    analytic.plugins = [];
    for (var i = 0; i < navigator.plugins.length; i++) {
        analytic.plugins.push(navigator.plugins[i].name);
    }

    analytic.an_token = an_token;

    $.ajax({
        type: 'POST',
        url: '/analytic/',
        data: JSON.stringify(analytic),
        contentType: 'application/json'
    })
}

$(function () {
    send_session_analytics();
});