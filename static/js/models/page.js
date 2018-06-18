function Page () {}

Page.current = null;
Page.PROJECT = 'project';
Page.HOME = 'home';
Page.CONCEPT = 'concept';
Page.WORLD = 'world';

Page.analytic_id = null;
Page.debug_level = 0;
Page.navigation = true;
Page.limit_depth = false;
Page.max_depth = -1;
Page.console_debug = console.debug;
Page.console_info = console.info;
Page.console_warn = console.warn;
Page.console_error = console.error;

Page.initialize = function (data) {
    if (data.page == Page.PROJECT)
        Page.current = Page.PROJECT;
    else if (data.page == Page.HOME)
        Page.current = Page.HOME;
    else if (data.page == Page.CONCEPT)
        Page.current = Page.CONCEPT;
    else if (data.page == Page.WORLD)
        Page.current = Page.WORLD;

    Page.setDebugLevel(data.debug_level);
    Page.analytic_id = data.an_token;

    if (data.nav != null)
        Page.navigation = data.nav;
    if (data.limit_depth != null)
        Page.limit_depth = data.limit_depth;
    if (data.max_depth != null)
        Page.max_depth = data.max_depth;
};

Page.navActive = function () {
    return Page.navigation;
};

Page.depthLimited = function () {
    return Page.limit_depth;
};

Page.getDepthLimit = function () {
    return Page.max_depth;
};

Page.getDebugLevel = function () {
    return Page.debug_level;
};

Page.setDebugLevel = function (level) {
    Page.debug_level = level;
    if (Page.debug_level == 0) {
        console.debug = function () {};
        console.info = function () {};
        console.warn = function () {};
    } else if (Page.debug_level == 1) {
        console.debug = function () {};
        console.info = function () {};
        console.warning = Page.console_warning;
    } else if (Page.debug_level == 2) {
        console.debug = function () {};
    }
};

Page.sendAnalytics = function () {
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

    comms.post({url: '/analytic/', data: analytic});
};

Page.isProjectPage = function () {
    return Page.current == Page.PROJECT;
};

Page.isHomePage = function () {
    return Page.current == Page.HOME;
};

Page.isConceptPage = function () {
    return Page.current == Page.CONCEPT;
};

Page.isWorldPage = function () {
    return Page.current == Page.WORLD;
};

Page.getAnalyticId = function () {
    return Page.analytic_id;
};