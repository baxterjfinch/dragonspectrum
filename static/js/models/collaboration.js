function CollaborationUser () {
    this.channel_id = null;
    this.username = null;
    this.display_name = null;
    this.color = null;

    this.table_row = null;
}

CollaborationUser.users = [];
CollaborationUser.users_by_channel_id = {};
CollaborationUser.users_by_concept_id = {};

CollaborationUser.prototype.initialize = function (data) {
    console.debug('New Collab User: %O', data);
    this.channel_id = data.channel_id;
    this.username = data.username;
    this.display_name = data.display_name;
    this.color = data.color;
    if (data.link_id && data.link_id !== '') {
        this.concept = Concept.get(data.link_id);
        this.concept_id = data.link_id;
    } else {
        this.concept = Concept.get(data.concept);
        this.concept_id = data.concept;
    }
    this.document = Document.get(data.document);

    this.color_class_span = 'collab-' + this.channel_id + '-color-span';
    this.color_class_image = 'collab-' + this.channel_id + '-color-image';

    var head = $("head");

    this.style_span = $('<style></style>');
    this.style_span.attr('type', 'text/css');
    this.style_span.html('.' + this.color_class_span + ' {background-color: ' + this.color + ';' +
        'box-shadow:  0 0 2px 2px ' + this.color + ';}');
    head.append(this.style_span);

    this.style_image = $('<style></style>');
    this.style_image.attr('type', 'text/css');
    this.style_image.html('.' + this.color_class_image + ' {border:5px solid ' + this.color + ';' +
        'box-shadow:  0 0 2px 2px ' + this.color + ';}');
    head.append(this.style_image);

    CollaborationUser.add(this);
};

CollaborationUser.prototype.setUserName = function (username) {
    this.username = username;
};

CollaborationUser.prototype.getUserName = function () {
    return this.username;
};

CollaborationUser.prototype.setDisplayName = function (display_name) {
    this.display_name = display_name;
};

CollaborationUser.prototype.getDisplayName = function () {
    return this.display_name;
};

CollaborationUser.prototype.setColor = function (color) {
    this.color = color;
};

CollaborationUser.prototype.getColor = function () {
    return this.color;
};

CollaborationUser.prototype.setConcept = function (concept) {
    this.concept = concept;
};

CollaborationUser.prototype.getConcept = function () {
    return this.concept;
};

CollaborationUser.prototype.setConceptId = function (id) {
    this.concept_id = id;
};


CollaborationUser.prototype.getConceptId = function () {
    return this.concept_id;
};

CollaborationUser.prototype.setDocument = function (document) {
    if (this.getTableRow() && Document.getCurrent() != document) {
        this.getTableRow().css('color', '#aaaaaa');
        this.getTableRow().css('background-color', '#ffffff');
    } else if (this.getTableRow()) {
        this.getTableRow().css('color', '');
        this.getTableRow().css('background-color', this.getColor());
    }
    this.document = document;
};

CollaborationUser.prototype.getDocument = function () {
    return this.document;
};

CollaborationUser.prototype.setTableRow = function (tr) {
    this.table_row = tr;
};

CollaborationUser.prototype.getClassSpan = function () {
    return this.color_class_span;
};

CollaborationUser.prototype.getClassImage = function () {
    return this.color_class_image;
};

CollaborationUser.prototype.getTableRow = function () {
    return this.table_row;
};

CollaborationUser.prototype.activateConcept = function () {
    if (this.getDocument() !== Document.getCurrent())
            return;

    var concept = this.getConcept();
    if (!concept)
        return;

    var dvsRender = concept.getDvsRender();
    if (dvsRender.isRendered()) {
        var attribute = concept.getDocumentAttribute(this.getDocument());
        if (attribute && attribute.isImage()) {
            dvsRender.img.addClass(this.getClassImage());
            dvsRender.img_icon_span.children().addClass(this.getClassImage());
        } else {
            dvsRender.phr_text_span.addClass(this.getClassSpan());
        }

        if (CollaborationUser.users_by_concept_id[concept.getId()])
            CollaborationUser.users_by_concept_id[concept.getId()].push(this);
        else
            CollaborationUser.users_by_concept_id[concept.getId()] = [this];

        if (TVS.inUse()) {
            $('#' + concept.getId() + '-tvs').addClass(this.getClassSpan());
        }
    }
};

CollaborationUser.prototype.deactivateConcept = function () {
    if (!this.getDocument())
        return;

    var concept = this.getConcept();
    if (concept) {
        var dvsRender = concept.getDvsRender();
        if (dvsRender.isRendered()) {
            var attribute = concept.getDocumentAttribute(this.getDocument());
            if (attribute && attribute.isImage()) {
                dvsRender.img.removeClass(this.getClassImage());
                dvsRender.img_icon_span.children().removeClass(this.getClassImage());
            } else {
                dvsRender.phr_text_span.removeClass(this.getClassSpan());
            }
        }

        if (CollaborationUser.users_by_concept_id[concept.getId()]) {
            var index = CollaborationUser.users_by_concept_id[concept.getId()].indexOf(this);
            if (index >= 0)
                CollaborationUser.users_by_concept_id[concept.getId()].splice(index, 1);
        }

        if (TVS.inUse()) {
            $('#' + concept.getId() + '-tvs').removeClass(this.getClassSpan());
        }
    }
};

CollaborationUser.get = function (channel_id) {
    return CollaborationUser.users_by_channel_id[channel_id];
} ;

CollaborationUser.getAll = function () {
    return CollaborationUser.users;
};

CollaborationUser.add = function (user) {
    CollaborationUser.users.push(user);
    CollaborationUser.users_by_channel_id[user.channel_id] = user;
    var concept = user.getConcept();
    if (concept) {
        if (CollaborationUser.users_by_concept_id[concept.getId()])
            CollaborationUser.users_by_concept_id[concept.getId()].push(user);
        else
            CollaborationUser.users_by_concept_id[concept.getId()] = [user];
    }
};

CollaborationUser.remove = function (user) {
    var index = CollaborationUser.users.indexOf(user);
    if (index >= 0)
        CollaborationUser.users.splice(index, 1);

    if (CollaborationUser.users_by_channel_id[user.channel_id] != null)
        delete CollaborationUser.users_by_channel_id[user.channel_id]
};

CollaborationUser.activateAll = function () {
    var users = CollaborationUser.getAll();
    var concept;

    for (var i = 0; i < users.length; i++) {
        if (users[i].getConcept() == null) {
            concept = Concept.get(users[i].getConceptId());
            if (concept)
                users[i].setConcept(concept);
        }
        users[i].deactivateConcept();
        users[i].activateConcept();
        // Sets the collab table colors
        users[i].setDocument(users[i].getDocument());
    }
};
