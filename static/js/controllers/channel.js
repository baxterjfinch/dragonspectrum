function Channel () {}

Channel.in_use = false;
Channel.connected = false;
Channel.connected_count = 0;
Channel.channel = null;
Channel.socket = null;
Channel.token = null;
Channel.client_id = null;
Channel.reconnect = true;
Channel.reconnect_count = 0;

/**
 * Gets the users channel client id
 * @returns {null|*}
 */
Channel.getClientId = function () {
    return Channel.client_id;
};

/**
 * Initialize the collaboration channel
 */
Channel.initialize = function () {
    Channel.in_use = true;
    Channel._getTokenFromServer(function (status) {
        if (status)
                Channel._open();
            else
                Channel._reconnect();
    })
};

/**
 * Gets a new channel token from the server.
 * If the server returns a token it is save and if a
 * callback is given. It will call the callback passing true.
 * If there is an error, than it will pass false to the callback
 * @param callback - function to call once the request is finished
 * @private
 */
Channel._getTokenFromServer = function (callback) {
    comms.get({
        url: ARTIFACT_URLS.channel_token + '?nocache=' + Util.generateUUID1(),
        success: function (data) {
            Channel.token = data.token;
            Channel.client_id = data.client_id;
            if (callback)
                callback(true);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Could not get channel token from server. %O: %O: %s',
                jqXHR.status, errorThrown, jqXHR.getResponseHeader('reason'));
            if (callback)
                callback(false);
        }
    })
};

/**
 * Private function for opening a new channel to the server
 * @private
 */
Channel._open = function () {
    if (Channel.connected)
        Channel.close();
    Channel.channel = new goog.appengine.Channel(Channel.token);
    Channel.socket = Channel.channel.open();
    Channel.socket.onopen = Channel._onOpened;
    Channel.socket.onmessage = Channel._onMessage;
    Channel.socket.onerror = Channel._onError;
    Channel.socket.onclose = Channel._onClose;
};

/**
 * Private function for closing the channel to the server
 * @private
 */
Channel._close = function () {
    if (!Channel.connected)
        return;
    Channel.socket.close()
};

/**
 * Google's callback for when the channel is opened.
 * @private
 */
Channel._onOpened = function () {
    Channel.connected = true;
    Channel.reconnect_count = 0;
    Channel.connected_count++;
    console.debug('Channel Opened: %s', Channel.connected_count);
};

/**
 * Google's callback for when we received a message over the channel
 *
 * If the message contains an "channel_op" this it is treated as
 * a channel specific operation, such as adding and removing other
 * channel users or pinging the server.
 *
 * If the message contains a transaction or chat, than it is then passed
 * onto the Collaboration Event Listener.
 *
 * @param message
 * @private
 */
Channel._onMessage = function (message) {
    message = JSON.parse(message.data);
    console.debug('Channel Message: %O', message);
    if (message.channel_op) {
        if (message.channel_op == 'ping') {
            comms.post({url: ARTIFACT_URLS.channel_ping})
        } else if (message.channel_op == 'valid_users') {
            CollaborationTable.validUsers(message.users)
        } else if (message.channel_op == 'remove_user') {
            CollaborationTable.removeUser(CollaborationUser.get(message.user));
        } else {
            console.warn('unknown channel_po');
        }
    } else if (message.transaction || message.chat) {
        if (message.user.client_id == Channel.getClientId())
            return;
        CollaborationEventListener.event(message);
    } else {
        console.warn('unknown channel message');
    }
};

/**
 * Google's callback for channel errors
 * We don't handle anything here as Channel.onClose
 * is always called right after this.
 * @param error
 * @private
 */
Channel._onError = function (error) {
    console.error('Channel Error: %O', error);
};

/**
 * Google's callback for when the channel is closed
 *
 * If "Channel.reconnect" is true we will reopen the channel
 * @private
 */
Channel._onClose = function () {
    if (Channel.reconnect)
        console.warn('Channel Closed');
    else
        console.debug('Channel Closed');
    Channel.connected = false;
    if (Channel.reconnect)
        Channel._reconnect();
};

/**
 * This function will attempted to reconnect the channel. If it
 * fails it will automatically retry following the pattern below
 *
 * The first 5 attempts are done one after another with no delay.
 * The next 5 are done with a one second delay between attempts
 * The next 50 are done with five seconds delay between attempts
 * After 60 attempts (about 5 minutes) it will stop.
 * @private
 */
Channel._reconnect = function () {
    if (Channel.reconnect_count == 0) {
        console.warn('Channel closed, reconnecting');
        Channel.reconnect_count++;
        Channel._getTokenFromServer(function (status) {
            if (status)
                Channel._open();
            else
                Channel._reconnect();
        })
    } else if (Channel.reconnect_count < 5) {
        console.warn('Channel failed to reconnected, trying again. Attempt: %s', Channel.reconnect_count);
        Channel.reconnect_count++;
        Channel._getTokenFromServer(function (status) {
            if (status)
                Channel._open();
            else
                Channel._reconnect();
        })
    } else if (Channel.reconnect_count < 10) {
        console.warn('Channel failed to reconnected, trying again in one second. Attempt: %s', Channel.reconnect_count);
        setTimeout(function () {
            Channel.reconnect_count++;
            Channel._getTokenFromServer(function (status) {
                if (status)
                Channel._open();
            else
                Channel._reconnect();
            })
        }, 1000);
    } else if (Channel.reconnect_count < 60) {
        console.warn('Channel failed to reconnected, trying again in five second. Attempt: %s', Channel.reconnect_count);
        setTimeout(function () {
            Channel.reconnect_count++;
            Channel._getTokenFromServer(function (status) {
                if (status)
                Channel._open();
            else
                Channel._reconnect();
            })
        }, 5000);
    } else {
        console.error('Channel Failed to reconnect, ending attempts.');
    }
};

/**
 * Returns true if the channel is in use (initiated)
 *
 * This does not mean if it is connected, use "Channel.isConnected" for that
 * @returns {boolean|*}
 */
Channel.inUse = function () {
    return Channel.in_use;
};

/**
 * Returns true if the channel is connected
 * @returns {boolean|*}
 */
Channel.isConnected = function () {
    return Channel.connected;
};

/** @namespace message.channel_op */