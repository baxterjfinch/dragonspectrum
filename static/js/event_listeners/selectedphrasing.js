function SelectedPhrasingEventListener() {}

SelectedPhrasingEventListener.events = {};

/** CREATE **
 * Event Listener for create events
 */
SelectedPhrasingEventListener.CHANGE_PHRASING_UP = 1;
SelectedPhrasingEventListener.CHANGE_PHRASING_DOWN = 2;

SelectedPhrasingEventListener.changeMouseClick = function () {

};

SelectedPhrasingEventListener.changeCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    var action_data = transaction.getActionData();

    Project.getConceptLoader().processCache();
    var phrasing = Phrasing.get(transaction.getArtifactId());
    if (phrasing) {
        var document = Document.get(action_data.document);
        var concept = phrasing.getConcept();
        transaction.setArtifact(phrasing);
        SelectedPhrasingEventListener.change(concept, phrasing, document, true, true, false);
        Project.renderAll();
    }
};

SelectedPhrasingEventListener.changeShortcutUp = function () {
    SelectedPhrasingEventListener.changeByDirection(
        SelectedPhrasingEventListener.CHANGE_PHRASING_UP);
};

SelectedPhrasingEventListener.changeShortcutDown = function () {
    SelectedPhrasingEventListener.changeByDirection(
        SelectedPhrasingEventListener.CHANGE_PHRASING_DOWN);
};

SelectedPhrasingEventListener.changeByDirection = function (direction, phrasing, phrasings) {
    if (Document.getCurrent().getState() == Document.STATE_SUMMARY) {
        SelectedPhrasingEventListener.changeSummaryByDirection(direction);
        return;
    }

    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION) {
        SelectedPhrasingEventListener.changePresentationByDirection(direction);
        return;
    }

    if (!Document.getCurrent().hasPermissionManagePhrasings()) {
        Notify.alert(Permission.failedManagePhrasingDocument);
        return;
    }

    var concept = Concept.getCurrent();
    var document = Document.getCurrent();
    if (!phrasing)
        phrasing = concept.getDocumentPhrasing(document);
    if (!phrasings)
        phrasings = concept.getPhrasings();

    var index = phrasings.indexOf(phrasing);
    if (direction == SelectedPhrasingEventListener.CHANGE_PHRASING_UP) {
        if (index == 0)
            phrasing = phrasings[phrasings.length - 1];
        else
            phrasing = phrasings[index - 1];
    } else if (direction == SelectedPhrasingEventListener.CHANGE_PHRASING_DOWN) {
        if (index == phrasings.length - 1)
            phrasing = phrasings[0];
        else
            phrasing = phrasings[index + 1];
    }

    if (phrasing.isDeleted()) {
        SelectedPhrasingEventListener.changeByDirection(direction, phrasing, phrasings);
        return
    }
    SelectedPhrasingEventListener.change(concept, phrasing, document, true, true, true);
    Project.renderAll();
};

SelectedPhrasingEventListener.change = function (concept, phrasing, document, notifyTVS, notifyPVS, notifyServer) {
    if (Document.getCurrent().getState() == Document.STATE_SUMMARY) {
        SelectedPhrasingEventListener.changeSummary(concept, phrasing, document, notifyTVS, notifyPVS, notifyServer);
        return;
    }

    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION) {
        SelectedPhrasingEventListener.changePresentation(concept, phrasing, document, notifyTVS, notifyPVS, notifyServer);
        return;
    }

    var sel_phr = concept.getSelectedPhrasingByDoc(document);
    if (sel_phr)
        sel_phr.setPhrasing(phrasing);
    if (document.isDistilled() && !concept.isLinked()) {
        concept.setDistilledPhrasing(phrasing);
    } else if (!sel_phr) {
        var dateTs = new Date().getTime();
        sel_phr = new SelectedPhrasing();
        sel_phr.setId(generateUUID1());
        sel_phr.setCreatedTs(dateTs);
        sel_phr.setModifiedTs(dateTs);
        sel_phr.setConcept(concept);
        sel_phr.setDocument(document);
        sel_phr.setPhrasing(phrasing);
        concept.addSelectedPhrasing(sel_phr);
    }

    if (notifyPVS) {
        PVS.loadConceptPhrasingList(concept);
    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.selectedphrasing + phrasing.getId(),
            data: {document: document.getId()},
            success: function (data) {
                if (data.selected_phrasing && sel_phr.getId() != data.selected_phrasing.id) {
                    var old_id = sel_phr.getId();
                    sel_phr.setId(data.selected_phrasing.id);
                    sel_phr.setCreatedTs(data.selected_phrasing.created_timestamp);
                    sel_phr.setModifiedTs(data.selected_phrasing.modified_timestamp);
                    concept.updateSelectedPhrasingId(old_id);
                }
            }
        }}, comms.post, false);
    }
};

SelectedPhrasingEventListener.changeSummaryByDirection = function (direction, phrasing, phrasings) {
    if (!Document.getCurrent().hasPermissionManagePhrasings()) {
        Notify.alert(Permission.failedManagePhrasingDocument);
        return;
    }

    var concept = Concept.getCurrent();
    var document = Document.getCurrent();
    var sum_document = document.getSummaryDocument();

    if (!phrasing)
        phrasing = concept.getSummaryDocumentPhrasing(sum_document);
    if (!phrasings)
        phrasings = concept.getPhrasings();

    var index = phrasings.indexOf(phrasing);
    if (direction == SelectedPhrasingEventListener.CHANGE_PHRASING_UP) {
        if (index == 0)
            phrasing = phrasings[phrasings.length - 1];
        else
            phrasing = phrasings[index - 1];
    } else if (direction == SelectedPhrasingEventListener.CHANGE_PHRASING_DOWN) {
        if (index == phrasings.length - 1)
            phrasing = phrasings[0];
        else
            phrasing = phrasings[index + 1];
    }

    if (phrasing.isDeleted()) {
        SelectedPhrasingEventListener.changeSummaryByDirection(direction, phrasing, phrasings);
        return
    }
    SelectedPhrasingEventListener.changeSummary(concept, phrasing, document, true, true, true);
    Project.renderAll();
};

SelectedPhrasingEventListener.changePresentationByDirection = function (direction, phrasing, phrasings) {
    if (!Document.getCurrent().hasPermissionManagePhrasings()) {
        Notify.alert(Permission.failedManagePhrasingDocument);
        return;
    }

    var concept = Concept.getCurrent();
    var document = Document.getCurrent();
    var sum_document = document.getPresentationDocument();

    if (!phrasing)
        phrasing = concept.getPresentationDocumentPhrasing(sum_document);
    if (!phrasings)
        phrasings = concept.getPhrasings();

    var index = phrasings.indexOf(phrasing);
    if (direction == SelectedPhrasingEventListener.CHANGE_PHRASING_UP) {
        if (index == 0)
            phrasing = phrasings[phrasings.length - 1];
        else
            phrasing = phrasings[index - 1];
    } else if (direction == SelectedPhrasingEventListener.CHANGE_PHRASING_DOWN) {
        if (index == phrasings.length - 1)
            phrasing = phrasings[0];
        else
            phrasing = phrasings[index + 1];
    }

    if (phrasing.isDeleted()) {
        SelectedPhrasingEventListener.changePresentationByDirection(direction, phrasing, phrasings);
        return
    }
    SelectedPhrasingEventListener.changePresentation(concept, phrasing, document, true, true, true);
    Project.renderAll();
};

SelectedPhrasingEventListener.changeSummary = function (concept, phrasing, document, notifyTVS, notifyPVS, notifyServer) {
    var sum_document = document.getSummaryDocument();

    var sel_phr = concept.getSummarySelectedPhrasingByDoc(sum_document);
    if (sel_phr)
        sel_phr.setPhrasing(phrasing);

    if (!sel_phr) {
        var dateTs = new Date().getTime();
        sel_phr = new SummarySelectedPhrasing();
        sel_phr.setId(generateUUID1());
        sel_phr.setCreatedTs(dateTs);
        sel_phr.setModifiedTs(dateTs);
        sel_phr.setConcept(concept);
        sel_phr.setDocument(sum_document);
        sel_phr.setPhrasing(phrasing);
        concept.addSelectedPhrasing(sel_phr);
    }

    if (notifyPVS) {
        PVS.loadConceptPhrasingList(concept);
    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.summary_selectedphrasing + phrasing.getId(),
            data: {document: document.getId()},
            success: function (data) {
                console.debug('New Selected Phrasing: %O', data);
                if (data.selected_phrasing && sel_phr.getId() != data.selected_phrasing.id) {
                    var old_id = sel_phr.getId();
                    sel_phr.setId(data.selected_phrasing.id);
                    sel_phr.setCreatedTs(data.selected_phrasing.created_timestamp);
                    sel_phr.setModifiedTs(data.selected_phrasing.modified_timestamp);
                    concept.updateSelectedPhrasingId(old_id);
                }
            }
        }}, comms.post, false);
    }
};

SelectedPhrasingEventListener.changePresentation = function (concept, phrasing, document, notifyTVS, notifyPVS, notifyServer) {
    var sum_document = document.getPresentationDocument();

    var sel_phr = concept.getPresentationSelectedPhrasingByDoc(sum_document);
    if (sel_phr)
        sel_phr.setPhrasing(phrasing);

    if (!sel_phr) {
        var dateTs = new Date().getTime();
        sel_phr = new PresentationSelectedPhrasing();
        sel_phr.setId(generateUUID1());
        sel_phr.setCreatedTs(dateTs);
        sel_phr.setModifiedTs(dateTs);
        sel_phr.setConcept(concept);
        sel_phr.setDocument(sum_document);
        sel_phr.setPhrasing(phrasing);
        concept.addSelectedPhrasing(sel_phr);
    }

    if (notifyPVS) {
        PVS.loadConceptPhrasingList(concept);
    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.presentation_selectedphrasing + phrasing.getId(),
            data: {document: document.getId()},
            success: function (data) {
                console.debug('New Selected Phrasing: %O', data);
                if (data.selected_phrasing && sel_phr.getId() != data.selected_phrasing.id) {
                    var old_id = sel_phr.getId();
                    sel_phr.setId(data.selected_phrasing.id);
                    sel_phr.setCreatedTs(data.selected_phrasing.created_timestamp);
                    sel_phr.setModifiedTs(data.selected_phrasing.modified_timestamp);
                    concept.updateSelectedPhrasingId(old_id);
                }
            }
        }}, comms.post, false);
    }
};

/** @namespace data.summary_selected_phrasing */
/** @namespace data.presentation_selected_phrasing */
/** @namespace data.selected_phrasing */