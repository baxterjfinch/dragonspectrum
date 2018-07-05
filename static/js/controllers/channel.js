function Channel () {}

Channel.in_use = false;
Channel.user = null;
Channel.connected = false;
Channel.connected_count = 0;
Channel.channel = null;
Channel.socket = null;
Channel.channel_id = null;
Channel.reconnect = true;
Channel.reconnect_count = 0;

/**
 * Initialize the collaboration channel
 */
Channel.initialize = function (user) {
    Channel.in_use = true;
    Channel.user = user;
    Channel._getTokenFromServer(function () {
        Channel._open();
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
            Channel.auth_token = data.auth_token;
            Channel.channel_id = data.channel_id;
            if (callback)
                callback();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Could not get channel token from server. %O: %O: %s',
                jqXHR.status, errorThrown, jqXHR.getResponseHeader('reason'));
            if (callback)
                callback();
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

    firebase.auth().signInWithCustomToken(Channel.auth_token).catch(function(error) {
        console.log('Login Failed!', error.code);
        console.log('Error message: ', error.message);
    });

    Channel.channel = firebase.database().ref('collaboration/' + Channel.user.getId() + '/' + Channel.channel_id);

    Channel.channel.on('child_added', function(data) {
        Channel._onMessage(JSON.parse(data.val()));
    });

    // Channel.channel = new goog.appengine.Channel(Channel.auth_token);
    // Channel.socket = Channel.channel.open();
    // Channel.socket.onopen = Channel._onOpened;
    // Channel.socket.onmessage = Channel._onMessage;
    // Channel.socket.onerror = Channel._onError;
    // Channel.socket.onclose = Channel._onClose;
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
    console.debug('Channel Message: %O', message);

    if (message.channel_op) {
        if (message.channel_op === 'ping') {
            comms.post({url: ARTIFACT_URLS.channel_ping})
        } else if (message.channel_op === 'valid_users') {
            CollaborationTable.validUsers(message.users)
        } else if (message.channel_op === 'remove_user') {
            CollaborationTable.removeUser(CollaborationUser.get(message.user));
        } else {
            console.warn('unknown channel_po');
        }

    } else if (message.transaction || message.chat) {
        if (message.user.channel_id === Channel.channel_id) {
            return;
        }
        CollaborationEventListener.event(message);

    } else {
        console.warn('unknown channel message');
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