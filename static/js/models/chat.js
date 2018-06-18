function ChatMessage() {
    Artifact.call(this);
    this.document = null;
    this.user = null;
    this.message = null;

    this.tr = $('<tr></tr>');
    this.user_td = $('<td></td>');
    this.message_td = $('<td></td>');
    this.user_span = $('<span></span>');
    this.message_span = $('<span></span>');
    this.user_td.append(this.user_span);
    this.message_td.append(this.message_span);
    this.tr.append(this.user_td);
    this.tr.append(this.message_td);
}

ChatMessage.prototype = Object.create(Artifact.prototype);
ChatMessage.prototype.constructor = ChatMessage;

ChatMessage.message = {};
ChatMessage.tr_classes = 'chat-row';
ChatMessage.user_span_classes = 'chat-user';
ChatMessage.message_span_classes = 'chat-message';
ChatMessage.user_message_td_classes = 'chat-message-column';

ChatMessage.prototype.initChatMessage = function (message) {
    this.initArtifact(message);
    this.setDocument(message.document);
    this.setUser(message.user);
    this.setMessage(message.message);

    this.tr.addClass(ChatMessage.tr_classes);

    this.user_span.addClass(ChatMessage.user_span_classes);
    this.user_span.html(message.user.getUserName());

    this.message_span.addClass(ChatMessage.user_span_classes);
    this.message_td.addClass(ChatMessage.user_message_td_classes);
    this.message_span.html(this.getMessage());

    ChatMessage.message[this.getId()] = this;
};

ChatMessage.prototype.setDocument = function (document) {
    this.document = document;
};

ChatMessage.prototype.getDocument = function () {
    return this.document;
};

ChatMessage.prototype.setUser = function (user) {
    this.user = user;
};

ChatMessage.prototype.getUser = function () {
    return this.user;
};

ChatMessage.prototype.setMessage = function (msg) {
    this.message = msg;
};

ChatMessage.prototype.getMessage = function () {
    return this.message;
};

ChatMessage.prototype.getRow = function () {
    return this.tr;
};

ChatMessage.prototype.getUserSpan = function () {
    return this.user_span;
};

ChatMessage.prototype.getMessageSpan = function () {
    return this.message_span;
};

ChatMessage.add = function (message) {
    ChatMessage.message[message.getId()] = message;
};

ChatMessage.get = function (id) {
    if (ChatMessage.message.hasOwnProperty(id))
        return ChatMessage.message[id];
    return null;
};

function DocumentChat() {}

DocumentChat.name = 'document_chat';
DocumentChat.chat_window = $('#chat_messages');
DocumentChat.send_btn = $('#grp_chat_input_send');
DocumentChat.message_input = $('#grp_chat_input');
DocumentChat.chat_scroll = $('#doc_chat_view');

DocumentChat.message = {};

DocumentChat.initialize = function () {
    DocumentChat.send_btn.click(Document.sendBtnClick);
};

DocumentChat.collabMessage =function (user, message) {
    console.debug('Chat: %O Text: %O', user, message);
    var chatMessage = new ChatMessage();
    message.chat.document = Document.get(message.chat.document);
    message.chat.user = user;
    chatMessage.initChatMessage(message.chat);
    DocumentChat.addMessage(chatMessage);
    if (!PVS.isOpen() || !PVS.isCollabTabActive())
        DocumentChat.announce_msg(chatMessage);
};

DocumentChat.announce_msg = function (message) {
    if (message.getDocument() == Document.getCurrent()) {
        Notify.alert(message.getUser().getUserName() + ': ' + message.getMessage());
        play_audio('interface1');
    }
};

DocumentChat.clearChatWindow = function () {
    DocumentChat.chat_window.children().detach();
};

DocumentChat.changeDocument = function (document) {
    DocumentChat.clearChatWindow();
    if (DocumentChat.message[document.getId()]) {
        for (var i = 0; i < DocumentChat.message[document.getId()].length; i++)
            DocumentChat.chat_window.append(DocumentChat.message[document.getId()][i].getRow());
    }
};

DocumentChat.addMessage = function (message) {
    var document = message.getDocument();
    if (DocumentChat.message[document.getId()] && DocumentChat.message[document.getId()].length > 0) {
        for (var i = 0; i < DocumentChat.message[document.getId()].length; i++) {
            if (DocumentChat.message[document.getId()][i].getCreatedTs() > message.getCreatedTs()) {
                if (i == 0) {
                    DocumentChat.message[document.getId()].unshift(message);
                    DocumentChat.chat_window.prepend(message.getRow());
                } else {
                    DocumentChat.message[document.getId()].insert(i - 1, message);
                    DocumentChat.message[document.getId()][i - 1].getRow().before(message);
                }
                return;
            }
        }
    }

    if (DocumentChat.message[document.getId()] == null)
        DocumentChat.message[document.getId()] = [];

    DocumentChat.message[document.getId()].push(message);
    if (document.isCurrent())
        DocumentChat.chat_window.append(message.getRow());

    var chat_scroll = DocumentChat.chat_scroll;
    chat_scroll.scrollTop(chat_scroll.prop('scrollHeight'));
};

Document.sendBtnClick = function () {
    var text = DocumentChat.message_input.val();
    if (text.trim() == '')
        return;
    DocumentChat.message_input.val('');

    var dateTs = new Date().getTime();
    var message = new ChatMessage();
    message.initChatMessage({
        id: Util.generateUUID1(),
        create_ts: dateTs,
        modified_ts: dateTs,
        user: User.getCurrent(),
        document: Document.getCurrent(),
        message: text
    });

    DocumentChat.addMessage(message);

    comms.post({
        url: ARTIFACT_URLS.chat,
        data: {
            document: Document.getCurrent().getId(),
            msg: text
        }
    })
};

DocumentChat.reorderChatMessage = function () {
    DocumentChat.message.sort(function (msg1, msg2) {
        return msg1.getCreatedTs - msg2.getCreatedTs;
    });
};

DocumentChat.rebuildChatWindow = function () {
    DocumentChat.reorderChatMessage();
    DocumentChat.clearChatWindow();
    for (var i = 0; i < DocumentChat.message.length; i++) {
        DocumentChat.chat_window.append(DocumentChat.message[i].getRow());
    }
};

DocumentChat.fetchFromServer = function (message) {
//    comms.get({
//        url: ARTIFACT_URLS.chat,
//        data: {
//            document: Document.getCurrent().getId(),
//            before_date: ((message != null) ? message.getCreatedTs() : null)
//        },
//        success: function (data) {
//            var message;
//            for (var i = 0; i < data.length; i++) {
//                message = new ChatMessage();
//                data[i].document = Document.get(data[i].document);
//
//                message.initChatMessage(data[i]);
//                DocumentChat.addMessage(message);
//            }
//        }
//    })
};