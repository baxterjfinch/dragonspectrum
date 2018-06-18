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

function getSlideDimensions () {
    var win_w = $(window).width();
    var win_h = $(window).height();
    var aspectRatio = 16 / 9;
    var w = 900;
    var h = 400;
    if (!aspectRatio) {
        aspectRatio = 4 / 3;
    }

    var win_aspect = win_w / win_h;
    var margin_upper = (Math.min(500, win_w) / 500) * 0.9;
    var margin_factor = Math.max(margin_upper, 0.875);
    var margin_vert_addition = 0.05;

    if (win_aspect > aspectRatio) {
        // constrain H
        h = win_h * (margin_factor + margin_vert_addition);
        w = h * aspectRatio;
    } else {
        // constrain W
        w = win_w * margin_factor;
        h = w / aspectRatio;
    }

    console.log('WA: %s, W: %s, H: %s', win_aspect, w, h);

    return {
        "w": w,
        "h": h
    };
}

var slides;
var data_y_inc = 525;
var presentation_div = $('#presentation-div');

function set_slide_dimensions() {
    presentation_div.jmpress('deinit');
    var wrapper_div = $('#pres_wrapper');
    wrapper_div.height($(document).height());
    wrapper_div.width($(document).width() - 60);

    var dim = getSlideDimensions();

    // 20% spacing betwixt slides
    data_y_inc = dim.h * 1.2;
    console.log('data-y: %s', data_y_inc);

    var data_y = 0;
    slides.css('width', dim.w).css('height', dim.h);
    slides.each(function (index, slide) {
        $(slide).attr('data-y', data_y);
        data_y += data_y_inc;
    });

    var maxWidth = dim.w * 0.85;
    var maxHeight = dim.h * 0.65;
    var images = $('.slide-img');
    images.css('max-width', maxWidth);
    images.css('max-height', maxHeight);
    images.css('min-height', 350);

    presentation_div.jmpress({fullscreen: true});
}

function isFullScreen () {
    return $($('#pres_wrapper')).hasClass("full-screen")
}

function toggleSlideShowDimensions (e) {
    var element = $('#pres_wrapper')[0];
    setTimeout(function () {
        if (isFullScreen()) {
            cancelSlideShow();
            $(element).removeClass("full-screen");
        } else {
            $('#pres_wrapper')
                .css('width', screen.width)
                .css('height', screen.height);
            $(element).addClass('full-screen');
        }
    }, 100);
}

function startSlideShow () {
    addFullScreenEventListeners();

    var element = $('#pres_wrapper')[0];
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function cancelSlideShow () {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }
}

var full_screen_listeners_active = false;
function addFullScreenEventListeners () {
    if (!full_screen_listeners_active) {
        full_screen_listeners_active = true;
        document.removeEventListener("fullscreenchange", toggleSlideShowDimensions);
        document.removeEventListener("webkitfullscreenchange", toggleSlideShowDimensions);
        document.removeEventListener("mozfullscreenchange", toggleSlideShowDimensions);
        document.removeEventListener("MSFullscreenChange", toggleSlideShowDimensions);
        document.addEventListener("fullscreenchange", toggleSlideShowDimensions);
        document.addEventListener("webkitfullscreenchange", toggleSlideShowDimensions);
        document.addEventListener("mozfullscreenchange", toggleSlideShowDimensions);
        document.addEventListener("MSFullscreenChange", toggleSlideShowDimensions);
    }
}

$(function () {
    slides = $('.step');

    presentation_div.jmpress({fullscreen: true});
    set_slide_dimensions();

    $(window).resize(function () {
        set_slide_dimensions();
    });

    $('#fullsceen-btn').click(function () {
        startSlideShow();
    });

    send_session_analytics();
});