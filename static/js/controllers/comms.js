function comms () {}

comms._queued_ajax = [];
comms._debounce_ajax = {};
comms._is_queue_running = false;
comms._sync_timer = null;
comms._synced = true;
comms._channel_token_id = null;

/**
 * Set the queue running state
 *
 * @param {boolean} flag - true if the queue is running, else false
 */
comms._setIsQueueRunning = function (flag) {
    comms._is_queue_running = flag;
};

/**
 * Get the queue running state
 *
 * @returns {boolean} - true if the queue is running, else false
 */
comms.isQueueRunning = function () {
    return comms._is_queue_running;
};

/**
 * Set the syncing to server status indecator
 *
 * @param {boolean} flag - true if the syncing to server, else false
 */
comms.setSyncStatus = function (flag) {
    if (flag) {
        comms._sync_timer = setTimeout(function () {
            comms._synced = true;
            $('#sync-status').html('<i title="All changes saved." class="fa fa-cloud ' +
                'fa-inverse synchronized"></i>');
        }, 500);
    } else {
        if (comms._sync_timer)
            clearTimeout(comms._sync_timer);
        comms._synced = false;
        $('#sync-status').html('<i title="Saving changes..." class="fa fa-cloud-upload ' +
            'fa-inverse synchronizing"></i>')
    }
};

/**
 * Preform a GET request to the server
 *
 * @param {object/function} ajax - Jquery ajax request object
 */
comms.get = function (ajax) {
    if (typeof(ajax) == 'function')
        ajax = ajax();
    ajax.type = 'GET';
    $.ajax(comms._prepareRequest(ajax));
};

/**
 * Preform a PUT request to the server
 *
 * @param {object/function} ajax - Jquery ajax request object
 */
comms.put = function (ajax) {
    if (typeof(ajax) == 'function')
        ajax = ajax();
    ajax.type = 'PUT';
    $.ajax(comms._prepareRequest(ajax));
};

/**
 * Preform a POST request to the server
 *
 * @param {object/function} ajax - Jquery ajax request object
 */
comms.post = function (ajax) {
    if (typeof(ajax) == 'function')
        ajax = ajax();
    ajax.type = 'POST';
    $.ajax(comms._prepareRequest(ajax));
};

/**
 * Preform a DELETE request to the server
 *
 * @param {object} ajax - Jquery ajax request object
 */
comms.delete = function (ajax) {
    if (typeof(ajax) == 'function')
        ajax = ajax();
    ajax.type = 'DELETE';
    ajax = comms._prepareRequest(ajax);
    // The default options set contextTYpe to json. Need to override that for delete
    ajax.contentType = 'text/plain';
    $.ajax(ajax);
};

/**
 * Debounce (Throttle) requests to the server so that only the last request made is actully sent to the
 * server. This is good for things like navigation event or form validation were you don't want every
 * request to hit the server and you only care about the lastest one.
 *
 * For more information (http://remysharp.com/2010/07/21/throttling-function-calls/)
 *
 * @param {object} ajax - Jquery ajax request object
 * @param {function} methodFunction - comms request method (eg. comms.post)
 * @param {string} id - id for this event. Calls to this function
 * with different ids will not effiect each other.
 * @param {int} delay - setTimeout deplay (1000 == 1 second)
 */
comms._debounce_inc = 0;
comms.debounce = function (ajax, methodFunction, id, delay) {
    if (comms._debounce_ajax.hasOwnProperty(id)) {
        clearTimeout(comms._debounce_ajax[id].timer);
        delete comms._debounce_ajax[id];
    }

    var container = {};
    container.inc = comms._debounce_inc++;
    container.func = function () {
        delete comms._debounce_ajax[id];
        methodFunction(ajax);
    };
    container.timer = setTimeout(container.func, delay);
    comms._debounce_ajax[id]  = container;
};

comms.flushDebounce = function () {
    var debounce_list = [];
    $.each(comms._debounce_ajax, function (id, container) {
        clearTimeout(container.timer);
        debounce_list.push(container);
    });

    if (debounce_list.length > 0) {
        debounce_list.sort(function (a, b) {
            return a.inc - b.inc;
        });

        for (var i = 0; i < debounce_list.length; i++)
            debounce_list[i].func();
    }
};

comms.debounce_queue_timer = null;
comms.queuedDebounce = function (ajax, methodFunction, id, delay) {
    set_sync_stats(false);

    if (comms._queued_ajax.length > 0 && comms._queued_ajax[0].id == id) {
        clearTimeout(comms.debounce_queue_timer);
        comms._queued_ajax.splice(0, 1);
    }

    var container = {};
    container.ajax = ajax;
    container.methodFunction = methodFunction;
    container.id = id;
    comms._queued_ajax.unshift(container);
    comms.debounce_queue_timer = setTimeout(function () {
        if (!comms.isQueueRunning()) {
            console.debug('COMMS Queue: starting');
            comms.processQueue();
        }
    }, delay);
};

/**
 * Queues the ajax request to the server. Use this if the order of the request matters. The request are
 * placed in a queue and are only sent after the last request is fully completed.
 *
 * ajax.complete is overridden by this function.
 *
 * @param {object} ajax - Jquery ajax request object
 * @param {function} methodFunction - comms request method (eg. comms.post)
 * @param {boolean} flushDebounce - clear any pending debounces (comms.debounce)
 */
comms.queue = function (ajax, methodFunction, flushDebounce) {
    set_sync_stats(false);

    if (flushDebounce)
        comms.flushDebounce();

    comms._queued_ajax.unshift({ajax: ajax, methodFunction: methodFunction});
    if (!comms.isQueueRunning()) {
        console.debug('COMMS Queue: starting');
        comms.processQueue();
    }
};

/**
 * Starts the queue processing.
 *
 * Pops a ajax request object off the queue and passes it to Jquery.ajax. Once the request has
 * completed it will process the next ajax request on the queue.
 */
comms.processQueue = function () {
    if (comms._queued_ajax.length > 0) {
        console.debug('COMMS Queue: %s', comms._queued_ajax.length);
        set_sync_stats(false);
        comms._setIsQueueRunning(true);
        var request = comms._queued_ajax.pop();
        var method = request.methodFunction;
        var ajax = request.ajax;
        if (typeof(ajax) == 'function')
            ajax = ajax();
        ajax['complete'] = function () {
            comms.processQueue();
        };
        method(ajax);
    } else {
        console.debug('COMMS Queue: finished');
        comms._setIsQueueRunning(false);
        set_sync_stats(true);
    }
};

/**
 * Prepare the request and set default options
 */
comms._prepareRequest = function (ajax) {
    if (ajax.async == null)
        ajax.async = true;
    if (!ajax.error)
        ajax.error = comms.handleError;
    if (!ajax.contentType)
        ajax.contentType = 'application/json';
    if (!ajax.data)
        ajax.data = {};

    ajax.data.an_token = Page.getAnalyticId();
    ajax.data.client_id = Channel.getClientId();

    if (Channel.inUse())
        ajax.data.token_id = get_channel_token_id();
    if (Project.inUse())
        ajax.data.project = Project.getId();

    if (ajax.type != 'GET')
        ajax.data = JSON.stringify(ajax.data);

    if (ajax.type == 'DELETE') {
        delete ajax.data;
        ajax.contentType = 'text/plain';
        if (ajax.url.indexOf('?') >= 0)
            ajax.url += '&client_id=' + Channel.getClientId();
        else
            ajax.url += '?client_id=' + Channel.getClientId();
        if (Page.isProjectPage())
            ajax.url += '&project=' + Project.getId();
        ajax.url += '&an_token=' + Page.getAnalyticId();
    }

    return ajax;
};

/**
 * Default ajax error handler.
 * Prints error message to the logger
 */
comms.handleError = function (jqXHR, textStatus, errorThrown) {
    console.error('%O: %O: %s', jqXHR.status, errorThrown, jqXHR.getResponseHeader('reason'));
    if (Page.getDebugLevel() >= 4) {
        alert('There was an error, please check your console for logs');
    }
};