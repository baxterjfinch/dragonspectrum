function ConceptEventListener() {}

ConceptEventListener.events = {};
ConceptEventListener.events.con_nav = 'con_nav';
ConceptEventListener.events.con_new = 'con_new';
ConceptEventListener.events.con_del = 'con_del';
ConceptEventListener.events.con_mov = 'con_mov';

ConceptEventListener.link_btn = $("#copy_link");

/** NAVIGATION **
 * Event Listener for navigation events
 */
ConceptEventListener.NAV_DIRECTION_UP = 1;
ConceptEventListener.NAV_DIRECTION_DOWN = 2;
ConceptEventListener.NAV_DIRECTION_LEFT = 3;
ConceptEventListener.NAV_DIRECTION_RIGHT = 4;

ConceptEventListener.linked_concept_edit_error_message = 'Can not alter linked concept(s)';
ConceptEventListener.clip_client = null;

ConceptEventListener.activeMouseClick = function (concept) {
    ConceptEventListener.activate(concept, true, true);
};

ConceptEventListener.activeCollab = function (user, message) {
    var document = Document.get(message.user.document);
    user.setDocument(document);

    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    user.deactivateConcept();

    var link_id = transaction.getActionData().link;
    if (link_id) {
        var concept = Concept.get(link_id);
        user.setConceptId(link_id);
    } else {
        concept = Concept.get(transaction.getArtifactId());
        user.setConceptId(transaction.getArtifactId());
    }

    if (concept) {
        transaction.setArtifact(concept);
        user.setConcept(concept);
        user.setDocument(document);
        user.activateConcept();
    } else {
        user.setConcept(null);
    }
};

ConceptEventListener.activateSummernote = function (concept) {
    ConceptEventListener.activate(concept, true, false, true);
};

ConceptEventListener.activateContextMenu = function (concept) {
    ConceptEventListener.activate(concept, true, true);
};

ConceptEventListener.activeTVS = function (concept) {
    ConceptEventListener.activate(concept, false, true);
};

ConceptEventListener.activeShortcutUp = function () {
    return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_UP);
};

ConceptEventListener.activeShortcutDown = function () {
    return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_DOWN);
};

ConceptEventListener.activeShortcutLeft = function () {
    return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_LEFT);
};

ConceptEventListener.activeShortcutRight = function () {
    return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_RIGHT);
};

ConceptEventListener.activeByDirection = function (direction, concept) {
    if (!concept)
        concept = Concept.getCurrent();

    if (Document.getCurrent().getState() == Document.STATE_SUMMARY)
        return ConceptEventListener.activeByDirectionSummary(direction, concept);

    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION)
        return ConceptEventListener.activeByDirectionPresentation(direction, concept);

    if (direction == ConceptEventListener.NAV_DIRECTION_UP) {
        if (concept.isFirstSibling()) {
            concept = concept.getParent();
        } else {
            concept = concept.getPreviousSibling();
            while (concept.hasChildren() && concept.isExpanded())
                concept = concept.getLastChild();
        }
        if (concept.isRoot())
            return false;
        if (!concept.isCrawlable(Project.getCurrentDocument()))
            return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_UP, concept);
    } else if (direction == ConceptEventListener.NAV_DIRECTION_DOWN) {
        if (concept.hasChildren() && concept.isExpanded()) {
            concept = concept.getFirstChild();
        } else if (concept.isLastSibling()) {
            concept = concept.getParent();
            while (!concept.isRoot() && concept.isLastSibling())
                concept = concept.getParent();
            if (concept.isRoot())
                return false;
            concept = concept.getNextSibling();
        } else {
            concept = concept.getNextSibling();
        }
        if (!concept.isCrawlable(Project.getCurrentDocument()))
            return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_DOWN, concept);
    } else if (direction == ConceptEventListener.NAV_DIRECTION_LEFT) {
        if (concept.isParent() && concept.isExpanded()) {
            ConceptEventListener.collapseShortcut(concept);
            return false;
        }
        if (concept.getParent().isRoot())
            return false;
        concept = concept.getParent();
        if (!concept.isCrawlable(Project.getCurrentDocument()))
            return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_LEFT, concept);
    } else if (direction == ConceptEventListener.NAV_DIRECTION_RIGHT) {
        if (!concept.hasChildren())
            return false;
        if (!concept.isExpanded()) {
            ConceptEventListener.expandShortcut(concept);
            return false;
        }
        concept = concept.getFirstChild();
        if (!concept.isCrawlable(Project.getCurrentDocument()))
            return ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_RIGHT, concept);
    } else {
        return false;
    }
    ConceptEventListener.activate(concept, true, true);
    return concept;
};

ConceptEventListener.activeByDirectionSummary = function (direction, concept) {
    var doc = Document.getCurrent().getSummaryDocument();

    var render_array = AbstractRender.getRenderArray();
    var index = render_array.indexOf(concept);

    if (index < 0)
        concept = render_array[render_array.length - 1];

    if (direction == ConceptEventListener.NAV_DIRECTION_UP) {
        if (index == 0)
            index = render_array.length - 1;
        else
            index--;

        concept = render_array[index];

        if (!concept.getSummaryCrawlContextByDocId(doc.getId(), false))
            return ConceptEventListener.activeByDirectionSummary(ConceptEventListener.NAV_DIRECTION_UP, concept);
    } else if (direction == ConceptEventListener.NAV_DIRECTION_DOWN) {
        if (index == render_array.length - 1)
            index = 0;
        else
            index++;

        concept = render_array[index];

        if (!concept.getSummaryCrawlContextByDocId(doc.getId(), false))
            return ConceptEventListener.activeByDirectionSummary(ConceptEventListener.NAV_DIRECTION_DOWN, concept);
    } else if (direction == ConceptEventListener.NAV_DIRECTION_LEFT) {
        if (index == 0)
            index = render_array.length - 1;
        else
            index--;

        concept = render_array[index];

        if (!concept.getSummaryCrawlContextByDocId(doc.getId(), false))
            return ConceptEventListener.activeByDirectionSummary(ConceptEventListener.NAV_DIRECTION_LEFT, concept);
    } else if (direction == ConceptEventListener.NAV_DIRECTION_RIGHT) {
        if (index == render_array.length - 1)
            index = 0;
        else
            index++;

        concept = render_array[index];

        if (!concept.getSummaryCrawlContextByDocId(doc.getId(), false))
            return ConceptEventListener.activeByDirectionSummary(ConceptEventListener.NAV_DIRECTION_RIGHT, concept);
    } else {
        return false;
    }
    ConceptEventListener.activate(concept, true, true);
    return concept;
};

ConceptEventListener.activeByDirectionPresentation = function (direction, concept) {
    if (direction == ConceptEventListener.NAV_DIRECTION_UP) {
        PresentationRender.root_renderObj.div.jmpress('prev');
    } else if (direction == ConceptEventListener.NAV_DIRECTION_DOWN) {
        PresentationRender.root_renderObj.div.jmpress('next');
    }

//    ConceptEventListener.activate(concept, true, true);
    return concept;
};

ConceptEventListener.reactivate = function () {
    var concept = Concept.getCurrent();
    if (concept) {
        concept.deactivate();
        concept.activate();
        var parent = concept.getParent();
        while (!parent.isRoot()) {
            ConceptEventListener.expand(parent, true, false);
            parent = parent.getParent();
        }
    } else {
        var children = Project.getProject().getChildren();
        if (children.length > 0) {
            ConceptEventListener.activate(children[0], true, true);
        }
    }
};

ConceptEventListener.activate = function (concept, notifyTVS, notifyServer, skipSummernoteCheck) {
    if (!Page.navActive())
        return;

    var currentConcept = Concept.getCurrent();

    if (currentConcept && currentConcept.summernote && currentConcept.summernote.concept == concept) {
        return;
    }

    if (!skipSummernoteCheck && currentConcept && currentConcept.summernote) {
        ConceptEventListener.finalizeCreateSummerNote();
        ConceptEventListener.cancelSummerNote();
    }

    concept.activate();

    PVS.setConceptProperties(concept);
    PVS.loadConceptPhrasingList(concept);
    DVS.updateScrollPosition(concept);

    ConceptEventListener.link_btn.attr('data-clipboard-text', concept.getId() + '_' + Document.getCurrent().getId());

    if (notifyTVS && TVS.inUse()) {
        concept.getTvsNode().activate();
        TVS.updateScrollPosition(concept);
    }

    if (notifyServer && !concept.isNew()) {
        comms.debounce(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {
                activated: true,
                link: ((concept.isLinked()) ? concept.getId() : null),
                document: Document.getCurrent().getId()
            }
        }}, comms.post, ConceptEventListener.events.con_nav, 1000);
    }
};

/** EXPAND **
 * Event Listener for expand events
 */
ConceptEventListener.expandMouseClick = function (concept) {
    ConceptEventListener.expand(concept, true, true);
};

ConceptEventListener.expandContextMenu = function (concept) {
    ConceptEventListener.expand(concept, true, true);
};

ConceptEventListener.expandShortcut = function (concept) {
    if (!concept)
        concept = Concept.getCurrent();
    ConceptEventListener.expand(concept, true, true);
};

ConceptEventListener.expandTree = function (concept) {
    ConceptEventListener.expand(concept, false, true);
};

ConceptEventListener.expandNoNav = function (concept) {
    ConceptEventListener.expand(concept, false, false);
};

ConceptEventListener.expand = function (concept, notifyTVS, notifyServer) {
    concept.setExpanded(true);

    if (notifyTVS && TVS.inUse()) {
        concept.getTvsNode().expand(true);
    }

    if (notifyServer && !concept.isNew()) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {expand: true, link: ((concept.isLinked()) ? concept.getId() : null)}
        }});
    }
};

/** COLLAPSE **
 * Event Listener for collapse events
 */
ConceptEventListener.collapseMouseClick = function (concept) {
    ConceptEventListener.collapse(concept, true, true);
};

ConceptEventListener.collapseContextMenu = function (concept) {
    ConceptEventListener.collapse(concept, true, true);
};

ConceptEventListener.collapseShortcut = function () {
    ConceptEventListener.collapse(Concept.getCurrent(), true, true);
};

ConceptEventListener.collapseTVS = function (concept) {
    ConceptEventListener.collapse(concept, false, true);
};

ConceptEventListener.collapseCollab = function (transaction) {

};

ConceptEventListener.collapse = function (concept, notifyTVS, notifyServer) {
    concept.setExpanded(false);

    if (notifyTVS && TVS.inUse()) {
        concept.getTvsNode().expand(false);
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {collapse: true, link: ((concept.isLinked()) ? concept.getId() : null)}
        }});
    }
};

/** CREATE **
 * Event Listener for create events
 */
ConceptEventListener.createMouseClick = function () {
    ConceptEventListener.createSummerNote();
};

ConceptEventListener.createShortcut = function () {
    ConceptEventListener.createSummerNote();
};

ConceptEventListener.createContextMenu = function (concept) {
    ConceptEventListener.activateContextMenu(concept);
    ConceptEventListener.createSummerNote();
};

ConceptEventListener.createCollab = function (user, message) {
    var new_concept;
    var parent = Concept.get(message.transaction.action_data.concept.parent);
    if (!parent && message.transaction.action_data.concept.parent == Project.getId())
        parent = Project.getProject();

    var data = message.transaction.action_data.concept;
    if (parent) {
        var next_sibling = Concept.get(message.transaction.action_data.next_sibling);
        var index = null;
        if (next_sibling && parent)
            index = parent.indexOfChild(next_sibling);

        if (data.link.length > 0) {
            if (data.link.length > 0) {
                for (var j = 0; j < data.link.length; j++) {
                    if (data.link[j].parent == parent.getId()) {
                        var link_data = data.link[j];
                    }
                }
                data.is_linked = true;
            }
        }

        data.parent = parent;
        new_concept = new Concept();
        new_concept.initConcept(data);

        if (data.is_linked) {
            link_data.parent = parent;
            link_data.concept = new_concept;

            var link = new LinkProxy();
            link.initLinkProxy(link_data);
            new_concept = link;
        }

        parent.addChild(new_concept, index);
        parent.setBeingFetched(false);
        parent.setLoaded(true);
        parent.setIsParent(true);
        if (TVS.inUse())
            TVS.createNode(new_concept);

        Project.renderAll();
        ConceptEventListener.reactivate();
    }

    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    transaction.setArtifact(new_concept);
    user.deactivateConcept();
    user.setConcept(new_concept);
    user.activateConcept();
};

ConceptEventListener.createSummerNote = function () {
    var currentConcept = Concept.getCurrent();

    if (currentConcept && !currentConcept.isRoot() && currentConcept.isChildOfLinked()) {
        Notify.alert(ConceptEventListener.linked_concept_edit_error_message);
        return;
    }

    if (currentConcept)
        var parent = currentConcept.getParent();
    else
        parent = Project.getProject();

    if (!parent.hasPermissionEditChildren()) {
        Notify.alert(Permission.failedCreateConcept);
        return;
    }

    var dateTs = new Date().getTime();
    var distilledDocument = Project.getDistilledDocument();
    var username = User.getCurrent().getUserName();

    var concept = new Concept();
    concept.setNew(true);
    concept.setId(Util.generateUUID1() + '-new');
    concept.setParent(parent);
    concept.setCreatedTs(dateTs);
    concept.setModifiedTs(dateTs);
    concept.setOwners([username]);
    concept.setPermissions(new Permission());
    concept.setDvsRender(new DVSRenderObj());

    var permission = new Permission();
    permission.setArtifact(concept);
    permission.initPermissionSettings();
    concept.setPermissions(permission);

    var phrasing = new Phrasing();
    phrasing.setId(Util.generateUUID1() + '-new');
    phrasing.setCreatedTs(dateTs);
    phrasing.setModifiedTs(dateTs);
    phrasing.setOwners([username]);
    phrasing.setText('New Concept');
    phrasing.setConcept(concept);
    concept.addPhrasing(phrasing);
    concept.setDistilledPhrasing(phrasing);

    permission = new Permission();
    permission.setArtifact(phrasing);
    permission.initPermissionSettings();
    phrasing.setPermissions(permission);

    var crawlcontext = new CrawlContext();
    crawlcontext.setId(Util.generateUUID1() + '-new');
    crawlcontext.setCreatedTs(dateTs);
    crawlcontext.setModifiedTs(dateTs);
    crawlcontext.setDocument(distilledDocument);
    crawlcontext.setCrawl(true);
    crawlcontext.setConcept(concept);
    concept.addCrawlContext(crawlcontext);

    var nextSibling = ((currentConcept != null) ? currentConcept.getNextSibling() : null);
    var index;
    if (nextSibling) {
        index = parent.indexOfChild(nextSibling);
        parent.addChild(concept, index);
    } else {
        parent.addChild(concept);
    }

    Shortcut.set('summernote');
    SummerNote.create(concept, '', 'new_con');
    Project.renderAll();
    concept.summernote.focus();

    if (TVS.inUse()) {
        TVS.createNode(concept);
    }

    ConceptEventListener.activateSummernote(concept);
};

ConceptEventListener.finalizeAndCancelCreateSummerNote = function () {
    ConceptEventListener.finalizeCreateSummerNote();
    ConceptEventListener.cancelSummerNote();
};

ConceptEventListener.finalizeCreateSummerNote = function () {
    if (!SummerNote.summernote)
        return;
    var text = SummerNote.summernote.get_text();
    if (text.trim() == '') {
        ConceptEventListener.cancelSummerNote();
        return;
    }

    var concept = SummerNote.summernote.getConcept();
    SummerNote.remove();

    var phrasing = concept.getDistilledPhrasing();
    phrasing.setText(text);
    concept.summernote = null;
    Project.renderAll();

    var distilledDocument = Project.getDistilledDocument();
    var parent = concept.getParent();
    var nextSibling = concept.getNextSibling();
    var attribute = concept.getDocumentAttribute(distilledDocument);
    var attribute_list = [];
    if (attribute)
        attribute_list = attribute.getAttributes();

    comms.queue(function () { return{
        url: ARTIFACT_URLS.concept,
        data: {
            project: Project.getId(),
            parent: parent.getRequestId(),
            nextSibling: ((nextSibling != null) ? nextSibling.getRequestId() : null),
            phrasing_text: concept.getDistilledPhrasing().getText(),
            attributes: attribute_list
        },
        success: function (data) {
            var old_id = concept.getId();
            concept.setId(data.id);
            concept.updateId(old_id);

            concept.setNew(false);

            concept.setCreatedTs(data.created_timestamp);
            concept.setModifiedTs(data.modified_timestamp);

            phrasing.setId(data.phrasings[0].id);
            phrasing.setCreatedTs(data.phrasings[0].created_timestamp);
            phrasing.setModifiedTs(data.phrasings[0].modified_timestamp);

            var crawlcontext = concept.getCrawlContexts()[0];
            crawlcontext.setId(data.crawlcontext[0].id);
            crawlcontext.setCreatedTs(data.crawlcontext[0].created_timestamp);
            crawlcontext.setModifiedTs(data.crawlcontext[0].modified_timestamp);
            Project.renderAll();
            if (TVS.inUse())
                TVS.redraw();

        }
    }}, comms.put, false);

    // Can't notify the server as the concept will still have its client generated id
    ConceptEventListener.activate(concept, true, false, true);
    ConceptEventListener.createSummerNote();
};

ConceptEventListener.cancelSummerNote = function () {
    if (!SummerNote.summernote)
        return;
    var concept = SummerNote.summernote.getConcept();
    SummerNote.remove();
    ConceptEventListener.del(concept, true, false);
};

ConceptEventListener.create = function (concept, parent, beforeSibling, notifyServer) {

};

/** CREATE IMAGE **
 * Event Listener for create image events
 */
ConceptEventListener.createImageSummernote = function () {
    ConceptEventListener.cancelSummerNote();
    ConceptEventListener.showCreateImageModal();
};

ConceptEventListener.createImageShortcut = function () {
    ConceptEventListener.showCreateImageModal();
};

ConceptEventListener.createImageCollab = function (transaction) {

};

ConceptEventListener.showCreateImageModal = function () {
    var concept = Concept.getCurrent();

    if (concept && !concept.isRoot() && concept.isChildOfLinked()) {
        Notify.alert(ConceptEventListener.linked_concept_edit_error_message);
        return;
    }

    if (concept)
        var parent = concept.getParent();
    else
        parent = Project.getProject();
    if (!parent.hasPermissionEditChildren()) {
        Notify.alert(Permission.failedCreateConcept);
        return;
    }

    CreateImageModal.show(
        ConceptEventListener.urlCreateImage,
        ConceptEventListener._uploadCreateImageModal,
        ConceptEventListener._uploadDoneCreateImageModal
    );
};

ConceptEventListener.cancelCreateImageModal = function () {
    CreateImageModal.hide();
};


ConceptEventListener._uploadCreateImageModal = function (fileUploader) {
    var dateTs = new Date().getTime();
    var currentConcept = Concept.getCurrent();
    if (currentConcept)
        var parent = currentConcept.getParent();
    else
        parent = Project.getProject();
    var distilledDocument = Project.getDistilledDocument();
    var username = User.getCurrent().getUserName();

    var concept = new Concept();
    concept.setNew(true);
    concept.setId(Util.generateUUID1() + '-new');
    concept.setParent(parent);
    concept.setCreatedTs(dateTs);
    concept.setModifiedTs(dateTs);
    concept.setOwners([username]);
    concept.setPermissions(new Permission());
    concept.setDvsRender(new DVSRenderObj());

    var phrasing = new Phrasing();
    phrasing.setId(Util.generateUUID1() + '-new');
    phrasing.setCreatedTs(dateTs);
    phrasing.setModifiedTs(dateTs);
    phrasing.setOwners([username]);
    phrasing.setPermissions(new Permission());
    phrasing.setText('');
    phrasing.setConcept(concept);
    concept.addPhrasing(phrasing);
    concept.setDistilledPhrasing(phrasing);

    var crawlcontext = new CrawlContext();
    crawlcontext.setId(Util.generateUUID1() + '-new');
    crawlcontext.setCreatedTs(dateTs);
    crawlcontext.setModifiedTs(dateTs);
    crawlcontext.setDocument(distilledDocument);
    crawlcontext.setCrawl(true);
    crawlcontext.setConcept(concept);
    concept.addCrawlContext(crawlcontext);

    var attr = new Attribute();
    attr.setId(Util.generateUUID1() + '-new');
    attr.setCreatedTs(dateTs);
    attr.setModifiedTs(dateTs);
    attr.setConcept(concept);
    attr.setDocument(distilledDocument);
    attr.setAttributes(['img']);
    concept.addAttribute(attr);

    var nextSibling = ((currentConcept != null) ? currentConcept.getNextSibling() : null);
    var index;
    if (nextSibling) {
        index = parent.indexOfChild(nextSibling);
        parent.addChild(concept, index);
    } else {
        parent.addChild(concept);
    }

    if (TVS.inUse())
        TVS.createNode(concept);

    comms.queue(function () {return {
        url: ARTIFACT_URLS.concept,
        data: {
            project: Project.getId(),
            parent: parent.getRequestId(),
            nextSibling: ((nextSibling != null) ? nextSibling.getRequestId() : null),
            phrasing_text: phrasing.getText(),
            attributes: attr.getAttributes()
        },
        success: function (data) {
            concept.setNew(false);
            concept.setId(data.id);
            concept.setCreatedTs(data.created_timestamp);
            concept.setModifiedTs(data.modified_timestamp);

            phrasing.setId(data.phrasings[0].id);
            phrasing.setCreatedTs(data.phrasings[0].created_timestamp);
            phrasing.setModifiedTs(data.phrasings[0].modified_timestamp);

            crawlcontext.setId(data.crawlcontext[0].id);
            crawlcontext.setCreatedTs(data.crawlcontext[0].created_timestamp);
            crawlcontext.setModifiedTs(data.crawlcontext[0].modified_timestamp);

            attr.setId(data.attributes[0].id);
            attr.setCreatedTs(data.attributes[0].created_timestamp);
            attr.setModifiedTs(data.attributes[0].modified_timestamp);

            fileUploader.url = ARTIFACT_URLS.media_upload + concept.getId();
            fileUploader.startUpload();
        }
    }}, comms.put, false);
};

ConceptEventListener._uploadDoneCreateImageModal = function () {
    CreateImageModal.hide();
    Project.renderAll();
};

ConceptEventListener.urlCreateImage = function (url) {
    var dateTs = new Date().getTime();
    var currentConcept = Concept.getCurrent();
    if (currentConcept)
        var parent = currentConcept.getParent();
    else
        parent = Project.getProject();
    var distilledDocument = Project.getDistilledDocument();
    var username = User.getCurrent().getUserName();

    var concept = new Concept();
    concept.setNew(true);
    concept.setId(Util.generateUUID1() + '-new');
    concept.setParent(parent);
    concept.setCreatedTs(dateTs);
    concept.setModifiedTs(dateTs);
    concept.setOwners([username]);
    concept.setPermissions(new Permission());
    concept.setDvsRender(new DVSRenderObj());

    var phrasing = new Phrasing();
    phrasing.setId(Util.generateUUID1() + '-new');
    phrasing.setCreatedTs(dateTs);
    phrasing.setModifiedTs(dateTs);
    phrasing.setOwners([username]);
    phrasing.setPermissions(new Permission());
    phrasing.setText('');
    phrasing.setConcept(concept);
    concept.addPhrasing(phrasing);
    concept.setDistilledPhrasing(phrasing);

    var crawlcontext = new CrawlContext();
    crawlcontext.setId(Util.generateUUID1() + '-new');
    crawlcontext.setCreatedTs(dateTs);
    crawlcontext.setModifiedTs(dateTs);
    crawlcontext.setDocument(distilledDocument);
    crawlcontext.setCrawl(true);
    crawlcontext.setConcept(concept);
    concept.addCrawlContext(crawlcontext);

    var attr = new Attribute();
    attr.setId(Util.generateUUID1() + '-new');
    attr.setCreatedTs(dateTs);
    attr.setModifiedTs(dateTs);
    attr.setConcept(concept);
    attr.setDocument(distilledDocument);
    attr.setAttributes(['img']);
    concept.addAttribute(attr);

    var nextSibling = ((currentConcept != null) ? currentConcept.getNextSibling() : null);
    var index;
    if (nextSibling) {
        index = parent.indexOfChild(nextSibling);
        parent.addChild(concept, index);
    } else {
        parent.addChild(concept);
    }

    if (TVS.inUse())
        TVS.createNode(concept);

    comms.queue(function () {return{
        url: ARTIFACT_URLS.concept,
        data: {
            project: Project.getId(),
            parent: parent.getRequestId(),
            nextSibling: ((nextSibling != null) ? nextSibling.getRequestId() : null),
            phrasing_text: phrasing.getText(),
            attributes: attr.getAttributes(),
            media_url: url
        },
        success: function (data) {
            concept.setNew(false);
            var old_id = concept.getId();
            concept.setId(data.id);
            concept.updateId(old_id);
            concept.setCreatedTs(data.created_timestamp);
            concept.setModifiedTs(data.modified_timestamp);

            phrasing.setId(data.phrasings[0].id);
            phrasing.setCreatedTs(data.phrasings[0].created_timestamp);
            phrasing.setModifiedTs(data.phrasings[0].modified_timestamp);

            crawlcontext.setId(data.crawlcontext[0].id);
            crawlcontext.setCreatedTs(data.crawlcontext[0].created_timestamp);
            crawlcontext.setModifiedTs(data.crawlcontext[0].modified_timestamp);

            attr.setId(data.attributes[0].id);
            attr.setCreatedTs(data.attributes[0].created_timestamp);
            attr.setModifiedTs(data.attributes[0].modified_timestamp);

            CreateImageModal.hide();
            Project.renderAll();
        }
    }}, comms.put, false);
};

ConceptEventListener.createImage = function (concept, parent, beforeSibling, notifyServer) {

};

/** CREATE LINK **
 * Event Listener for create link events
 */
ConceptEventListener.createLinkSummernote = function () {
    ConceptEventListener.cancelSummerNote();
    ConceptEventListener.showCreateLinkModal();
};

ConceptEventListener.createLinkShortcut = function () {
    ConceptEventListener.showCreateLinkModal();
};

ConceptEventListener.createLinkCollab = function (user, message) {
    var new_concept;
    var parent = Concept.get(message.transaction.action_data.parent);
    if (!parent && message.transaction.action_data.parent == Project.getId())
        parent = Project.getProject();

    if (parent) {
        var data = message.transaction.action_data.concept;
        var link_data;
        data.is_linked = true;

        for (var i = 0; i < data.link.length; i++) {
            if (data.link[i].parent == parent.getId()) {
                link_data = data.link[i];
                break;
            }
        }

        var next_sibling = Concept.get(message.transaction.action_data.next_sibling);
        var index = null;
        if (next_sibling && parent)
            index = parent.indexOfChild(next_sibling);

        data.parent = parent;
        new_concept = new Concept();
        new_concept.initConcept(data);

        if (data.is_linked) {
            link_data.parent = parent;
            link_data.concept = new_concept;

            var link = new LinkProxy();
            link.initLinkProxy(link_data);
            new_concept = link;
        }

        parent.addChild(new_concept, index);
        parent.setBeingFetched(false);
        parent.setLoaded(true);
        parent.setIsParent(true);
        if (TVS.inUse())
            TVS.createNode(new_concept);

        Project.renderAll();
        ConceptEventListener.reactivate();
    }

    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    transaction.setArtifact(new_concept);

    Project.getConceptLoader().queue([{con: new_concept, priority: true}], Project.renderAll);
};

ConceptEventListener.showCreateLinkModal = function () {
    var concept = Concept.getCurrent();

    if (concept && concept.isChildOfLinked()) {
        Notify.alert(ConceptEventListener.linked_concept_edit_error_message);
        return;
    }

    if (concept)
        var parent = concept.getParent();
    else
        parent = Project.getProject();
    if (!parent.hasPermissionEditChildren()) {
        Notify.alert(Permission.failedCreateConcept);
        return;
    }

    CreateLinkModal.show(ConceptEventListener.createLinkModal);
};

ConceptEventListener.cancelCreateLinkModal = function () {
    CreateLinkModal.hide();
};

ConceptEventListener.createLinkModal = function (link_id) {
    var concept_id = link_id.substring(0, link_id.indexOf('_'));
    var document_id = link_id.substring(link_id.indexOf('_') + 1, link_id.length);

    var currentConcept = Concept.getCurrent();
    var parent = currentConcept.getParent();
    var next_sibling = currentConcept.getNextSibling();

    var children = parent.getChildren();
    for (var i = 0; i < children.length; i++) {
        if (children[i].getRequestId() == concept_id) {
            Notify.alert('You can not link the same concept twice under the same parent');
            ConceptEventListener.cancelCreateLinkModal();
            return;
        }
    }

    comms.queue(function () {return{
        url: ARTIFACT_URLS.concept + concept_id,
        data: {
            parent: parent.getRequestId(),
            document: document_id,
            next_sibling: ((next_sibling != null) ? next_sibling.getRequestId() : null),
            link_concept: true
        },
        success: function (data) {
            console.debug(data);
            var new_concept = new Concept();
            new_concept.initConcept(data);

            var link_data;
            for (var i = 0; i < data.link.length; i++) {
                if (data.link[i].parent == parent.getRequestId())
                    link_data = data.link[i];
            }

            link_data.parent = parent;
            link_data.concept = new_concept;

            var link = new LinkProxy();
            link.initLinkProxy(link_data);

            if (next_sibling) {
                parent.addChild(link, parent.indexOfChild(next_sibling));
            } else {
                parent.addChild(link);
            }

            if (TVS.inUse())
                TVS.createNode(link);

            CreateLinkModal.hide();
            Project.renderAll();
            ConceptEventListener.activate(link, true, true);

            Project.getConceptLoader().queue([{con: link, priority: true}], Project.renderAll);
        }
    }}, comms.post, false);
};

/** DELETE **
 * Event Listener for delete events
 */

ConceptEventListener.confirm_deletion_message = 'Are you sure you want to delete this concept?';

ConceptEventListener.deleteShortCut = function () {
    var concept = Concept.getCurrent();
    if (!concept.hasPermissionWrite()) {
        Notify.alert(Permission.failedDeleteConcept);
        return
    }

    Notify.confirm(ConceptEventListener.confirm_deletion_message, function (results) {
        if (results)
            ConceptEventListener.del(concept, true, true);
    });
};

ConceptEventListener.deleteContextMenu = function (concept) {
    if (!concept.hasPermissionWrite()) {
        Notify.alert(Permission.failedDeleteConcept);
        return
    }

    Notify.confirm(ConceptEventListener.confirm_deletion_message, function (results) {
        if (results)
            ConceptEventListener.del(concept, true, true);
    });
};

ConceptEventListener.deleteMouseClick = function () {
    var concept = Concept.getCurrent();
    if (!concept.hasPermissionWrite()) {
        Notify.alert(Permission.failedDeleteConcept);
        return
    }

    Notify.confirm(ConceptEventListener.confirm_deletion_message, function (results) {
        if (results)
            ConceptEventListener.del(concept, true, true);
    });
};

ConceptEventListener.deleteCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var action_data = transaction.getActionData();
    Project.getConceptLoader().processCache();

    if (action_data.link)
        var concept = Concept.get(action_data.link);
    else
        concept = Concept.get(transaction.getArtifactId());

    if (concept)
        ConceptEventListener.del(concept, true, false);
};

ConceptEventListener.del = function (concept, notifyTVS, notifyServer) {
    console.debug('Deleting Concept: %O', concept);

    concept.setDeleted(true);
    if (!ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_UP))
        ConceptEventListener.activeByDirection(ConceptEventListener.NAV_DIRECTION_DOWN);

    concept.getParent().deleteChild(concept);
    Project.renderAll();

    var annotations = Annotation.getByConceptId(concept.getId());
    if (annotations) {
        for (var i = 0; i < annotations.length; i++)
            annotations[i].del();
    }

    if (notifyTVS && TVS.inUse()) {
        concept.getTvsNode().remove();
    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId() + ((concept.isLinked() ? concept.getId() : ''))
        }}, comms.delete, false);
    }
};

/** MOVE **
 * Event Listener for MOVE events
 */
ConceptEventListener.MOVE_DIRECTION_UP = 1;
ConceptEventListener.MOVE_DIRECTION_DOWN = 2;
ConceptEventListener.MOVE_DIRECTION_LEFT = 3;
ConceptEventListener.MOVE_DIRECTION_RIGHT = 4;

ConceptEventListener.moveMouseClick = function (concept) {
    ConceptEventListener.activate(concept, true, true);
};

ConceptEventListener.moveCollab = function (user, message) {
    console.debug('con_mov: %O', message);

    Project.getConceptLoader().processCache();

    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    var concept;
    if (message.transaction.action_data.link)
        concept = Concept.get(message.transaction.action_data.link);
    else
        concept = Concept.get(message.transaction.artifact);
    if (message.transaction.action_data.new_parent == Project.getId())
        var new_parent = Project.getProject();
    else
        new_parent = Concept.get(message.transaction.action_data.new_parent);
    if (message.transaction.action_data.old_parent == Project.getId())
        var old_parent = Project.getProject();
    else
        old_parent = Concept.get(message.transaction.action_data.old_parent);
    var next_sibling = Concept.get(message.transaction.action_data.next_sibling);


    transaction.setArtifact(concept);

    if (old_parent && concept) {
        old_parent.removeChild(concept);
        if (old_parent.getChildren().length == 0) {
            old_parent.setIsParent(false);
            old_parent.setLoaded(false);
        }
    }

    var index = null;
    if (next_sibling && new_parent)
        index = new_parent.indexOfChild(next_sibling);


    if (!new_parent && concept) {
        ConceptEventListener.del(concept, true, false);
    } else if (new_parent && !concept) {
        if (new_parent.isLoaded()) {
            comms.get({
                url: ARTIFACT_URLS.concept + message.transaction.artifact,
                data: {json: true, children: false},
                success: function (data) {
                    Concept.addFromDict(data, new_parent, index);
                }
            });
        } else {
            new_parent.setIsParent(true);
            Project.getConceptLoader().queue({con: new_parent, priority: true});
        }
    } else {
        concept.setParent(new_parent);
        new_parent.addChild(concept, index);
        if (TVS.inUse()) {
            if (next_sibling)
                concept.getTvsNode().move(next_sibling.getTvsNode(), 'before');
            else
                concept.getTvsNode().move(new_parent.getTvsNode(), 'child');
        }
    }

    Project.renderAll();
    ConceptEventListener.reactivate();
};

ConceptEventListener.moveTVS = function (concept) {
    ConceptEventListener.activate(concept, false, true);
};

ConceptEventListener.moveShortcutUp = function () {
    ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_UP);
};

ConceptEventListener.moveShortcutDown = function () {
    ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_DOWN);
};

ConceptEventListener.moveShortcutLeft = function () {
    ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_LEFT);
};

ConceptEventListener.moveShortcutRight = function () {
    ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_RIGHT);
};

ConceptEventListener.moveByDirection = function (concept, direction) {
    var parent = concept.getParent();
    var nextSibling;
    if (direction == ConceptEventListener.MOVE_DIRECTION_UP) {
        if (concept.isFirstSibling())
            return;
        nextSibling = concept.getPreviousSibling();
    } else if (direction == ConceptEventListener.MOVE_DIRECTION_DOWN) {
        if (concept.isLastSibling())
            return;
        nextSibling = concept.getNextSibling().getNextSibling();
    } else if (direction == ConceptEventListener.MOVE_DIRECTION_LEFT) {
        if (parent.isRoot())
            return;
        nextSibling = parent.getNextSibling();
        parent = parent.getParent();
    } else if (direction == ConceptEventListener.MOVE_DIRECTION_RIGHT) {
        if (concept.isFirstSibling())
            return;
        parent = concept.getPreviousSibling();
    } else {
        throw 'No or invalid direction';
    }

    if (!concept.getParent().hasPermissionEditChildren() || !parent.hasPermissionEditChildren()) {
        Notify.alert(Permission.failedMoveConcept);
        return;
    }

    ConceptEventListener.move(concept, parent, nextSibling, true, true);
};

/**
 * Move the concept to the parent before the nextSibling
 *
 * @param {Concept} concept - the concept to be moved
 * @param {Concept/Project} parent - the parent to move the concept to
 * @param {Concept} nextSibling - the parent's child to place the concept before.
 *      If null concept is appended to the end of the parent's children
 * @param {boolean} notifyTVS - whether or not the TVS should be notified of this event
 * @param {boolean} notifyServer - whether or not the server should be notified of this event
 */
ConceptEventListener.move = function (concept, parent, nextSibling, notifyTVS, notifyServer) {
    var currentParent = concept.getParent();

    if ((!currentParent.isRoot() && currentParent.isLinked()) ||
            (!currentParent.isRoot() && currentParent.isChildOfLinked()) ||
            (!parent.isRoot() && parent.isLinked()) ||
            (!parent.isRoot() && parent.isChildOfLinked())) {
        Notify.alert(ConceptEventListener.linked_concept_edit_error_message);
        return;
    }

    currentParent.removeChild(concept);
    concept.setParent(parent);
    parent.addChild(concept, ((nextSibling != null) ? parent.indexOfChild(nextSibling) : null));
    Project.renderAll();

    if (notifyTVS && TVS.inUse()) {
        if (nextSibling)
            concept.getTvsNode().move(nextSibling.getTvsNode(), 'before');
        else
            concept.getTvsNode().move(parent.getTvsNode(), 'child');
    }

    if (!parent.isRoot())
        ConceptEventListener.expandShortcut(parent);

    if (notifyServer && !concept.isNew()) {
        comms.queuedDebounce(function () { return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {
                parent: parent.getRequestId(),
                nextSibling: ((nextSibling != null) ? nextSibling.getRequestId() : null),
                link: ((concept.isLinked()) ? concept.getId() : null)
            }
        }}, comms.post, concept.getRequestId(), 2500);
    }
};

/** PERMISSION **
 * Event Listener for permission change events
 */
ConceptEventListener.setPermissionsMouseClick = function (concept) {
    ConceptEventListener.showPermissionsModal(concept);
};

ConceptEventListener.showPermissionsModal = function (concept) {
    PermissionSettingsModal.show(
        'Concept Security Settings',
        concept,
        function (group) {ConceptEventListener.addGroup(concept, group, true, true, true)},
        function (group) {ConceptEventListener.removeGroup(concept, group, true, true, true)},
        function (group, op, type, perm) {ConceptEventListener.addPerm(concept, group, op, type, perm, true, true, true)},
        function (group, op, type) {ConceptEventListener.removePerm(concept, group, op, type, true, true, true)},
        concept.hasPermissionAdmin()
    )
};

ConceptEventListener.addGroup = function (concept, group, notifyTvs, notifyDvs, notifyServer) {
    concept.getPermissions().addPermission('read', group, 'allow', false);

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {
                type: 'shared',
                operation: 'read',
                group_id: group.getId(),
                permission: 'allow'
            }
        }}, comms.post, false);
    }
};

ConceptEventListener.removeGroupCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var action_data = transaction.getActionData();
    var concept = Concept.get(transaction.getArtifactId());
    if (concept) {
        transaction.setArtifact(concept);
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = concept.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        ConceptEventListener.removeGroup(concept, group, true, true, false);

        if (!concept.hasPermissionRead(User.getCurrent()))
            concept.secureDelete();

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == concept)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    } else {
        var parent = Concept.get(action_data.parent);
        if (!parent && action_data.parent == Project.getId())
            parent = Project.getProject();
        if (parent && !parent.isLoaded()) {
            parent.reloadChildren();
        }
    }
};

ConceptEventListener.removeGroup = function (concept, group, notifyTvs, notifyDvs, notifyServer) {
    concept.getPermissions().removeGroup(group);

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {
                remove_group: group.getId()
            }
        }}, comms.post, false);
    }
};

ConceptEventListener.addPermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var action_data = transaction.getActionData();
    var concept = Concept.get(transaction.getArtifactId());
    if (concept) {
        transaction.setArtifact(concept);
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = concept.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        ConceptEventListener.addPerm(concept, group, action_data.operation,
            action_data.type, action_data.permission, true, true, false);

        if (!concept.hasPermissionRead(User.getCurrent()))
            concept.secureDelete();

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == concept)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    } else {
        var parent = Concept.get(action_data.parent);
        if (!parent && action_data.parent == Project.getId())
            parent = Project.getProject();
        if (parent && !parent.isLoaded()) {
            parent.reloadChildren();
        }
    }
};

ConceptEventListener.addPerm = function (concept, group, operation, type, perm, notifyTvs, notifyDvs, notifyServer) {
    concept.getPermissions().addPermission(operation, group, perm, (type != 'shared'));

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId(),
                permission: perm
            }
        }}, comms.post, false);
    }
};

ConceptEventListener.removePermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var action_data = transaction.getActionData();
    var concept = Concept.get(transaction.getArtifactId());
    if (concept) {
        transaction.setArtifact(concept);
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = concept.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        ConceptEventListener.addPerm(concept, group, action_data.operation,
            action_data.type,true, true, false);

        if (!concept.hasPermissionRead(User.getCurrent()))
            concept.secureDelete();

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == concept)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    } else {
        var parent = Concept.get(action_data.parent);
        if (!parent && action_data.parent == Project.getId())
            parent = Project.getProject();
        if (parent && !parent.isLoaded()) {
            parent.reloadChildren();
        }
    }
};

ConceptEventListener.removePerm = function (concept, group, operation, type, notifyTvs, notifyDvs, notifyServer) {
    concept.getPermissions().removePermission(operation, group, (type != 'shared'));

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.concept + concept.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId()
            }
        }}, comms.post, false);
    }
};

ConceptEventListener.openLinkConcept = function (link) {
    var url = location.origin + ARTIFACT_URLS.project + link.getLinkedProjectId() + '?active_concept=' + link.getRequestId();
    window.open(url, '_blank');
};


/** For PyCharm **/
/** @namespace message.transaction.action_data.old_parent */
/** @namespace message.transaction.action_data.new_parent */