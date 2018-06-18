function AttributeEventListener () {}

AttributeEventListener.toggleHeaderContextMenu = function (concept) {
    ConceptEventListener.activateContextMenu(concept);
    AttributeEventListener.toggleHeader();
};

AttributeEventListener.toggleHeaderShortCut = function () {
    AttributeEventListener.toggleHeader();
};

AttributeEventListener.toggleHeader = function () {
    var concept = Concept.getCurrent();
    if (!concept)
        return;
    var document = Document.getCurrent();
    var attribute = concept.getDocumentAttributeById(document.getId());

    if (attribute) {
        if (attribute.isHeader())
            AttributeEventListener.setNoHeader(attribute, true, true, true);
        else
            AttributeEventListener.setHeader(attribute, true, true, true);
    } else {
        AttributeEventListener.create(concept, document, Attribute.HEADER, true, true, true);
    }
};

AttributeEventListener.setHeaderCollab = function (concept, transaction) {
    var action_data = transaction.getActionData();
    transaction.setArtifact(concept);
    var document = Document.get(action_data.document);
    var attribute = concept.getDocumentAttributeById(document.getId());
    if (!attribute) {
        AttributeEventListener.create(concept, document,
            Attribute.HEADER, true, true, false);
    } else {
        AttributeEventListener.setHeader(attribute, true, true, false);
    }
};

AttributeEventListener.setHeader = function (attribute, notifyDvs, notifyTvs, notifyServer) {
    if (attribute.isImage())
            return;
    if (attribute.isNoHeader())
        attribute.removeNoHeader();
    attribute.setHeader();

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {

    }

    var concept = attribute.getConcept();
    if (notifyServer && !concept.isNew()) {
        comms.queue(function () {
            if (concept.isRoot())
                var url = ARTIFACT_URLS.project + concept.getRequestId();
            else
                url = ARTIFACT_URLS.concept + concept.getRequestId();
            return {
                url: url,
                data: {
                    add_attribute: Attribute.HEADER,
                    document: attribute.getDocument().getRequestId()
                }
            }
        }, comms.post, false);
    }
};

AttributeEventListener.setNoHeaderCollab = function (concept, transaction) {
    var action_data = transaction.getActionData();
    transaction.setArtifact(concept);
    var document = Document.get(action_data.document);
    var attribute = concept.getDocumentAttributeById(document.getId());
    if (!attribute) {
        AttributeEventListener.create(concept, document,
            Attribute.NOHEADER, true, true, false);
    } else {
        AttributeEventListener.setNoHeader(attribute, true, true, false);
    }
};

AttributeEventListener.setNoHeader = function (attribute, notifyDvs, notifyTvs, notifyServer) {
    if (attribute.isImage())
            return;
    if (attribute.isHeader())
        attribute.removeHeader();
    attribute.setNoHeader();

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {

    }

    var concept = attribute.getConcept();
    if (notifyServer && !concept.isNew()) {
        comms.queue(function () {
            if (concept.isRoot())
                var url = ARTIFACT_URLS.project + concept.getRequestId();
            else
                url = ARTIFACT_URLS.concept + concept.getRequestId();
            return {
                url: url,
                data: {
                    add_attribute: Attribute.NOHEADER,
                    document: attribute.getDocument().getRequestId()
                }
            }
        }, comms.post, false);
    }
};

AttributeEventListener.toggleOrderedListConceptMenu = function (concept) {
    ConceptEventListener.activateContextMenu(concept);
    AttributeEventListener.toggleOrderedList();
};

AttributeEventListener.toggleOrderedListShortCut = function () {
    AttributeEventListener.toggleOrderedList();
};

AttributeEventListener.toggleOrderedList = function () {
    var concept = Concept.getCurrent();
    if (!concept)
        return;
    var parent = concept.getParent();
    var document = Document.getCurrent();
    var attribute = parent.getDocumentAttributeById(document.getId());

    if (attribute) {
        if (attribute.isOrderedList())
            AttributeEventListener.setNoList(attribute, true, true, true);
        else
            AttributeEventListener.setOrderedList(attribute, true, true, true);
    } else {
        AttributeEventListener.create(parent, document, Attribute.ORDERED_LIST, true, true, true);
    }
};

AttributeEventListener.setOrderedListCollab = function (concept, transaction) {
    var action_data = transaction.getActionData();
    transaction.setArtifact(concept);
    var document = Document.get(action_data.document);
    var attribute = concept.getDocumentAttributeById(document.getId());
    if (!attribute) {
        AttributeEventListener.create(concept, document,
            Attribute.ORDERED_LIST, true, true, false);
    } else {
        AttributeEventListener.setOrderedList(attribute, true, true, false);
    }
};

AttributeEventListener.setOrderedList = function (attribute, notifyDvs, notifyTvs, notifyServer) {
    if (attribute.isNoList())
        attribute.removeNoList();
    if (attribute.isUnorderedList())
        attribute.removeUnorderedList();
    attribute.setOrderedList();

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {

    }

    var concept = attribute.getConcept();
    if (notifyServer && !concept.isNew()) {
        comms.queue(function () {
            if (concept.isRoot())
                var url = ARTIFACT_URLS.project + concept.getRequestId();
            else
                url = ARTIFACT_URLS.concept + concept.getRequestId();
            return {
                url: url,
                data: {
                    add_attribute: Attribute.ORDERED_LIST,
                    document: attribute.getDocument().getRequestId()
                }
            }
        }, comms.post, false);
    }
};

AttributeEventListener.toggleUnorderedListContextMenu = function (concept) {
    ConceptEventListener.activateContextMenu(concept);
    AttributeEventListener.toggleUnorderedList();
};

AttributeEventListener.toggleUnorderedListShortCut = function () {
    AttributeEventListener.toggleUnorderedList();
};

AttributeEventListener.toggleUnorderedList = function () {
    var concept = Concept.getCurrent();
    if (!concept)
        return;
    var parent = concept.getParent();
    var document = Document.getCurrent();
    var attribute = parent.getDocumentAttributeById(document.getId());

    if (attribute) {
        if (attribute.isUnorderedList())
            AttributeEventListener.setNoList(attribute, true, true, true);
        else
            AttributeEventListener.setUnorderedList(attribute, true, true, true);
    } else {
        AttributeEventListener.create(parent, document, Attribute.UNORDERED_LIST, true, true, true);
    }
};

AttributeEventListener.setUnorderedListCollab = function (concept, transaction) {
    var action_data = transaction.getActionData();
    transaction.setArtifact(concept);
    var document = Document.get(action_data.document);
    var attribute = concept.getDocumentAttributeById(document.getId());
    if (!attribute) {
        AttributeEventListener.create(concept, document,
            Attribute.UNORDERED_LIST, true, true, false);
    } else {
        AttributeEventListener.setUnorderedList(attribute, true, true, false);
    }
};

AttributeEventListener.setUnorderedList = function (attribute, notifyDvs, notifyTvs, notifyServer) {
    if (attribute.isNoList())
        attribute.removeNoList();
    if (attribute.isOrderedList())
        attribute.removeOrderedList();
    attribute.setUnorderedList();

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {

    }

    var concept = attribute.getConcept();
    if (notifyServer && !concept.isNew()) {
        comms.queue(function () {
            if (concept.isRoot())
                var url = ARTIFACT_URLS.project + concept.getRequestId();
            else
                url = ARTIFACT_URLS.concept + concept.getRequestId();
            return {
                url: url,
                data: {
                    add_attribute: Attribute.UNORDERED_LIST,
                    document: attribute.getDocument().getRequestId()
                }
            }
        }, comms.post, false);
    }
};

AttributeEventListener.setNoListCollab = function (concept, transaction) {
    var action_data = transaction.getActionData();
    transaction.setArtifact(concept);
    var document = Document.get(action_data.document);
    var attribute = concept.getDocumentAttributeById(document.getId());
    if (!attribute) {
        AttributeEventListener.create(concept, document,
            Attribute.NOLIST, true, true, false);
    } else {
        AttributeEventListener.setNoList(attribute, true, true, false);
    }
};

AttributeEventListener.setNoList = function (attribute, notifyDvs, notifyTvs, notifyServer) {
    if (attribute.isOrderedList())
        attribute.removeOrderedList();
    if (attribute.isUnorderedList())
        attribute.removeUnorderedList();
    attribute.setNoList();

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {

    }

    var concept = attribute.getConcept();
    if (notifyServer && !concept.isNew()) {
        comms.queue(function () {
            if (concept.isRoot())
                var url = ARTIFACT_URLS.project + concept.getRequestId();
            else
                url = ARTIFACT_URLS.concept + concept.getRequestId();
            return {
                url: url,
                data: {
                    add_attribute: Attribute.NOLIST,
                    document: attribute.getDocument().getRequestId()
                }
            }
        }, comms.post, false);
    }
};

AttributeEventListener.create = function (concept, document, attr, notifyDvs, notifyTvs, notifyServer) {
    var dateTs = new Date().getTime();

    var attribute = new Attribute();
    attribute.setId(Util.generateUUID1());
    attribute.setCreatedTs(dateTs);
    attribute.setModifiedTs(dateTs);
    attribute.setConcept(concept);
    attribute.setDocument(document);
    attribute.add(attr);
    concept.addAttribute(attribute);

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {

    }

    if (notifyServer && (!concept.isRoot() && !concept.isNew())) {
        comms.queue(function () {
            if (concept.isRoot())
                var url = ARTIFACT_URLS.project + concept.getRequestId();
            else
                url = ARTIFACT_URLS.concept + concept.getRequestId();
            return {
                url: url,
                data: {
                    add_attribute: attr,
                    document: document.getRequestId()
                },
                success: function (data) {
                    attribute.setId(data.id);
                    attribute.setCreatedTs(data.created_ts);
                    attribute.setModifiedTs(data.modified_ts);
                }
            }
        }, comms.post, false);
    }
};

AttributeEventListener.addCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var concept = Concept.get(transaction.getArtifactId());
    if (!concept && transaction.getArtifactId() == Project.getId())
        concept = Project.getProject();

    if (concept) {
        transaction.setArtifact(concept);
        var action_data = transaction.getActionData();
        var attr = action_data.attribute;

        switch (attr) {
            case Attribute.HEADER:
                AttributeEventListener.setHeaderCollab(concept, transaction);
                break;
            case Attribute.NOHEADER:
                AttributeEventListener.setNoHeaderCollab(concept, transaction);
                break;
            case Attribute.ORDERED_LIST:
                AttributeEventListener.setOrderedListCollab(concept, transaction);
                break;
            case Attribute.UNORDERED_LIST:
                AttributeEventListener.setUnorderedListCollab(concept, transaction);
                break;
            case Attribute.NOLIST:
                AttributeEventListener.setNoListCollab(concept, transaction);
                break;
            default:
                console.error('unknown attribute from collaboration!');
        }
    }
};