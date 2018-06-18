var an_token;

var _channel_token_id = null;

function get_channel_token_id() {
    return _channel_token_id;
}

var post_to_server_error;
function post_to_server(url, message, async) {
    var results = null;
    var error = 1;

    if (message != null && typeof(get_channel_token_id) != 'undefined') {
        message['token_id'] = get_channel_token_id();
    }
    if (message)
        message['an_token'] = an_token;

    $.ajax({
        async: async,
        type: "POST",
        url: url,
        contentType: "application/json",
        data: JSON.stringify(message),
        error: function (jqXHR, textStatus, errorThrown) {
            log.error('\nURL: ', this.url, '\nReason: ', jqXHR.getResponseHeader('reason'),
                '\nTextStatus: ', textStatus, '\nErrorThrown: ', errorThrown,
                '\nRequest Data: ', JSON.stringify(message));
            if (jqXHR.status == 401) {
                $(location).attr('href', ACCOUNT_URLS.login);
            }
            post_to_server_error = jqXHR.getResponseHeader('reason');
            error = -1;
        },
        success: function (data, textStatus, jqXHR) {
            results = jqXHR.responseText;
        }
    });
    if (!async && results != null && results != '') {
        return JSON.parse(results);
    } else if (!async) {
        return error;
    }
}

function get_from_server(type, url, message, callback, callbackarg) {
    if (type != 'GET') {
        send_to_server(type, url, message, callback, callbackarg);
        return;
    }
    if (message != null && typeof(get_channel_token_id) != 'undefined') {
        message['token_id'] = get_channel_token_id();
    }
    if (message)
        message['an_token'] = an_token;
    $.ajax({
        async: true,
        type: type,
        url: url,
        contentType: "application/json",
        data: message,
        abort: function (stat) {
            log.error("abort: ", stat);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.getResponseHeader('reason') != 'invalid coupon code') {
                log.error('\nURL: ', this.url, '\nReason: ', jqXHR.getResponseHeader('reason'),
                    '\nTextStatus: ', textStatus, '\nErrorThrown: ', errorThrown,
                    '\nRequest Data: ', JSON.stringify(message));
            }
            if (jqXHR.status == 401) {
                $(location).attr('href', ACCOUNT_URLS.login);
            }
            if (callback != null) {
                callback('failed', jqXHR.getResponseHeader('reason'));
            }
        },
        success: function (data, textStatus, jqXHR) {
            if (callback != null) {
                callback(JSON.parse(jqXHR.responseText), callbackarg);
            }
        }
    });
}

function send_to_server(type, url, message, callback, callbackarg) {
    if (type == 'GET') {
        get_from_server(type, url, message, callback, callbackarg);
        return;
    }
    message['token_id'] = get_channel_token_id();
    message['an_token'] = an_token;
    $.ajax({
        async: true,
        type: type,
        url: url,
        contentType: "application/json",
        data: JSON.stringify(message),
        abort: function (stat) {
            log.error("abort: ", stat);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            log.error('\nURL: ', this.url, '\nReason: ', jqXHR.getResponseHeader('reason'),
                '\nTextStatus: ', textStatus, '\nErrorThrown: ', errorThrown,
                '\nRequest Data: ', JSON.stringify(message));
            if (jqXHR.status == 401) {
                $(location).attr('href', ACCOUNT_URLS.login);
            }
        },
        success: function (data, textStatus, jqXHR) {
            if (callback != null) {
                callback(JSON.parse(jqXHR.responseText), callbackarg);
            }
        }
    });
}

var _sync_timer;
var _synced = true;
function set_sync_stats(flag) {
    if (flag) {
        _sync_timer = setTimeout(function () {
            _synced = true;
            $('#sync-status').html('<i title="All changes saved." class="fa fa-cloud fa-inverse synchronized"></i>');
        }, 500);
    } else {
        if (_sync_timer)
            clearTimeout(_sync_timer);
        _synced = false;
        $('#sync-status').html('<i title="Saving changes..." class="fa fa-cloud-upload fa-inverse synchronizing"></i>')
    }
}

var _webworker_server = null;
var _post_queue = [];
var _nav_event = null;
var _post_queue_running = false;
var count = 0;
function queued_send_to_server(type, msg_type, url, message, callback, callbackarg) {
    if (_webworker_server == null) {
        _webworker_server = new Worker(location.origin + STATIC_URLS.webworker_server);
        _webworker_server.addEventListener('message', _queued_send_to_server);
    }
    var data = {'type': type, 'url': url, 'message': message, 'callback': callback, 'callbackarg': callbackarg};
    if (msg_type == 'nav_event') {
        _nav_event = data
    } else {
        data['count'] = count;
        _post_queue.unshift(data);
        count += 1;
    }
    if (!_post_queue_running) {
        _post_queue_running = true;
        if (msg_type != 'nav_event')
            set_sync_stats(false);
        _webworker_server.postMessage(null);
    }
}

function _queued_send_to_server() {
    var data;
    if (_post_queue.length > 0) {
        data = _post_queue.pop();
    } else if (_nav_event != null) {
        data = _nav_event;
        _nav_event = null;
    } else {
        return; // Nothing to do
    }
    if (data.message != null && typeof get_channel_token_id == 'function') {
        data.message['token_id'] = get_channel_token_id();
    }
    if (data.message)
        data.message['an_token'] = an_token;
    var contentType = "application/json";
    if (data.type == 'DELETE') {
        $.ajax({
            async: true,
            type: data.type,
            url: data.url,
            contentType: 'text/plain',
            error: function (jqXHR, textStatus, errorThrown) {
                log.error('\nURL: ', this.url, '\nReason: ', jqXHR.getResponseHeader('reason'),
                    '\nTextStatus: ', textStatus, '\nErrorThrown: ', errorThrown,
                    '\nRequest Data: ', JSON.stringify(data.message));
                if (jqXHR.status == 401) {
                    $(location).attr('href', ACCOUNT_URLS.login);
                }
                if (_post_queue.length > 0 || _nav_event != null) {
                    _webworker_server.postMessage(null);
                } else {
                    _post_queue_running = false;
                    set_sync_stats(true);
                }
            },
            success: function (suc_data, textStatus, jqXHR) {
                if (_post_queue.length > 0 || _nav_event != null) {
                    _webworker_server.postMessage(null);
                } else {
                    _post_queue_running = false;
                    set_sync_stats(true);
                }
                if (data.callback != null) {
                    if (jqXHR.responseText == null || jqXHR.responseText == '') {
                        data.callback(null, data.callbackarg);
                    } else {
                        data.callback(JSON.parse(jqXHR.responseText), data.callbackarg);
                    }
                }
            }
        });
    } else {
        $.ajax({
            async: true,
            type: data.type,
            url: data.url,
            contentType: contentType,
            data: JSON.stringify(data.message),
            error: function (jqXHR, textStatus, errorThrown) {
                log.error('\nURL: ', this.url, '\nReason: ', jqXHR.getResponseHeader('reason'),
                    '\nTextStatus: ', textStatus, '\nErrorThrown: ', errorThrown,
                    '\nRequest Data: ', JSON.stringify(data.message));
                if (jqXHR.status == 401) {
                    $(location).attr('href', ACCOUNT_URLS.login);
                }
                if (_post_queue.length > 0 || _nav_event != null) {
                    _webworker_server.postMessage(null);
                } else {
                    _post_queue_running = false;
                    set_sync_stats(true);
                }
            },
            success: function (suc_data, textStatus, jqXHR) {
                if (_post_queue.length > 0 || _nav_event != null) {
                    _webworker_server.postMessage(null);
                } else {
                    _post_queue_running = false;
                    set_sync_stats(true);
                }
                if (data.callback != null) {
                    if (jqXHR.responseText == null || jqXHR.responseText == '') {
                        data.callback(null, data.callbackarg);
                    } else {
                        data.callback(JSON.parse(jqXHR.responseText), data.callbackarg);
                    }
                }
            }
        });
    }
}
