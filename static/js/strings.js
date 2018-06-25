// Static URL Paths
var BASE_STATIC_URL = '';
var STATIC_URLS = {
    root: '/',
    presentation_background: '/images/presentation_background.jpg',
    webworker_server: BASE_STATIC_URL + '/js/webworker_server.js'
};


// Account URL Paths
var BASE_ACCOUNT_URL = '/account';
var ACCOUNT_URLS = {
    login: BASE_ACCOUNT_URL + '/login/',
    logout: BASE_ACCOUNT_URL + '/login/',
    login_disabled: BASE_ACCOUNT_URL + '/login/disabled/',
    register: BASE_ACCOUNT_URL + '/register/',
    register_disabled: BASE_ACCOUNT_URL + '/register/disabled/',
    username_available: BASE_ACCOUNT_URL + '/username/available/',
    username_email: BASE_ACCOUNT_URL + '/username/email/',
    password_reset: BASE_ACCOUNT_URL + '/password/reset/',
    billing: BASE_ACCOUNT_URL + '/billing/',
    profile: BASE_ACCOUNT_URL + '/profile/',
    verify_email: BASE_ACCOUNT_URL + '/verify/email/',
    unverified: BASE_ACCOUNT_URL + '/unverified/',
    locked: BASE_ACCOUNT_URL + '/locked/',
    expired: BASE_ACCOUNT_URL + '/expired/',
    disabled: BASE_ACCOUNT_URL + '/disabled/',
    organization: BASE_ACCOUNT_URL + '/organization/',
    group: BASE_ACCOUNT_URL + '/group/',
    group_admin: BASE_ACCOUNT_URL + '/group/admin/',
    user: BASE_ACCOUNT_URL + '/',
    tour_home_complete: BASE_ACCOUNT_URL + '/tour-home-complete',
    tour_project_complete: BASE_ACCOUNT_URL + '/tour-project-complete'
//    admin: BASE_ACCOUNT_URL + '/admin/'
};

// Artifact URL Paths
var BASE_ARTIFACT_URL = '';
var ARTIFACT_URLS = {
    project_library: BASE_ARTIFACT_URL + '/',
    project_open: BASE_ARTIFACT_URL + '/project/open/',
    project_close: BASE_ARTIFACT_URL + '/project/close/',
    project_users: BASE_ARTIFACT_URL + '/project/users/',
    project_import: BASE_ARTIFACT_URL + '/project/import/',
    project_restore: BASE_ARTIFACT_URL + '/project/restore/',
    project: BASE_ARTIFACT_URL + '/project/',
    concept: BASE_ARTIFACT_URL + '/concept/',
    concept_children: BASE_ARTIFACT_URL + '/concept/children/',
    phrasing: BASE_ARTIFACT_URL + '/phrasing/',
    document: BASE_ARTIFACT_URL + '/document/',
    summary_document: BASE_ARTIFACT_URL + '/document/summary/',
    presentation_document: BASE_ARTIFACT_URL + '/document/presentation/',
    summary_selectedphrasing: BASE_ARTIFACT_URL + '/selectedphrasing/summary/',
    presentation_selectedphrasing: BASE_ARTIFACT_URL + '/selectedphrasing/presentation/',
    selectedphrasing: BASE_ARTIFACT_URL + '/selectedphrasing/',
    summary_crawlcontext: BASE_ARTIFACT_URL + '/crawlcontext/summary/',
    presentation_crawlcontext: BASE_ARTIFACT_URL + '/crawlcontext/presentation/',
    crawlcontext: BASE_ARTIFACT_URL + '/crawlcontext/',
    marker: BASE_ARTIFACT_URL + '/marker/',
    media_download: BASE_ARTIFACT_URL + '/media/download/',
    media_upload: BASE_ARTIFACT_URL + '/media/upload/',
    search_project: BASE_ARTIFACT_URL + '/search/project/',
    search_library: BASE_ARTIFACT_URL + '/search/library/',
    search_reindex: BASE_ARTIFACT_URL + '/search/reindex/',
    channel_users: BASE_ARTIFACT_URL + '/channel/users/',
    channel_token: BASE_ARTIFACT_URL + '/channel/token/',
    channel_ping: BASE_ARTIFACT_URL + '/channel/ping/',
    annotation: BASE_ARTIFACT_URL + '/marker/annotation/',
    chat: BASE_ARTIFACT_URL + '/chat/',
    publish_document: '/background/project/publish/',
    summary_publish_document: '/background/summary/publish/',
    presentation_publish_document: '/background/presentation/publish/'
};

// Artifact URL Paths
var BASE_PAYMENT_URL = '/payment';
var PAYMENT_URLS = {
    checkout: BASE_PAYMENT_URL + '/checkout/',
    coupon_admin: BASE_PAYMENT_URL + '/coupon/admin/',
    coupon: BASE_PAYMENT_URL + '/coupon/',
    paymentplan: BASE_PAYMENT_URL + '/paymentplan/'
};

// Admin URL Paths
var BASE_ADMIN_URL = '/admin';
var ADMIN_URLS = {
    admin: BASE_ADMIN_URL + '/'
};

var ENGLISH_ARTICLES = [
        'a',
        'an',
        'the',
        'some',
        'any',
        'either',
];