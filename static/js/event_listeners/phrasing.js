function PhrasingEventListener() {}

PhrasingEventListener.events = {};
PhrasingEventListener.events.phr_new = 'phr_new';
PhrasingEventListener.events.phr_del = 'phr_del';
PhrasingEventListener.events.phr_edt = 'phr_edt';

/** CREATE **
 * Event Listener for create events
 */
PhrasingEventListener.createMouseClick = function (concept) {
    ConceptEventListener.activeMouseClick(concept);
    PhrasingEventListener.createSummerNote(concept);
};

PhrasingEventListener.createCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    var action_data = transaction.getActionData();

    Project.getConceptLoader().processCache();
    var concept = Concept.get(action_data.concept);
    if (concept) {
        var document = Document.get(action_data.document);
        action_data.phrasing.concept = concept;

        var phrasing = new Phrasing();
        phrasing.initPhrasing(action_data.phrasing);
        transaction.setArtifact(phrasing);
        concept.addPhrasing(phrasing);
        SelectedPhrasingEventListener.change(concept, phrasing, document, true, true, false);
        Project.renderAll();
    }
};

PhrasingEventListener.createContextMenu = function (concept) {
    ConceptEventListener.activateContextMenu(concept);
    PhrasingEventListener.createSummerNote(concept);
};

PhrasingEventListener.createShortcut = function () {
    PhrasingEventListener.createSummerNote(Concept.getCurrent());
};

PhrasingEventListener.pres_new_element = null;
PhrasingEventListener.pres_new_summernote = null;
PhrasingEventListener.createPresentationSummernote = function (element) {
    var concept = element.data('concept');
    if (concept) {
        Project.disableRender();
        Shortcut.set('pres_new_phr_summernote');

        var doc = Document.getCurrent().getPresentationDocument();

        var summernote = $('<span></span>');
        PhrasingEventListener.pres_new_element = element;
        PhrasingEventListener.pres_summernote = summernote;
        element.after(summernote);
        element.addClass('hidden');

        var sel_phr = concept.getPresentationSelectedPhrasingByDoc(doc);
        if (sel_phr) {
            var text = sel_phr.getPhrasing().getText();
        } else {
            text = concept.getPresentationDocumentPhrasing(doc).getText();
            if (text.length > 100)
                text = Util.distill_phrase(text);
        }

        summernote.summernote({
            focus: true,
            airMode: true,
            airPopover: [
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['font', ['strikethrough']],
                ['color', ['color']]
            ]
        });

        summernote.code(text);
        document.execCommand('selectAll', false, null);
    }
};

PhrasingEventListener.finalizeCreatePresentationSummernote = function () {
    if (PhrasingEventListener.pres_summernote) {
        var summernote = PhrasingEventListener.pres_summernote;
        var element = PhrasingEventListener.pres_new_element;
        var concept = element.data('concept');
        var pres_doc = Document.getCurrent().getPresentationDocument();
        var dateTs = new Date().getTime();
        var username = User.getCurrent().getUserName();
        var text = SummerNote._strip_unwanted_tags(summernote.code().trim());

        var phrasing = new Phrasing();
        phrasing.setId(Util.generateUUID1());
        phrasing.setCreatedTs(dateTs);
        phrasing.setModifiedTs(dateTs);
        phrasing.setOwners([username]);
        phrasing.setPermissions(new Permission());
        phrasing.setText(text);
        phrasing.setConcept(concept);
        concept.addPhrasing(phrasing);

        var sel_phr = concept.getPresentationSelectedPhrasingByDoc(pres_doc);
        if (sel_phr) {
            sel_phr.setPhrasing(phrasing);
        } else {
            sel_phr = new PresentationSelectedPhrasing();
            sel_phr.setId(Util.generateUUID1());
            sel_phr.setCreatedTs(dateTs);
            sel_phr.setModifiedTs(dateTs);
            sel_phr.setConcept(concept);
            sel_phr.setDocument(pres_doc);
            sel_phr.setPhrasing(phrasing);
            concept.addPresentationSelectedPhrasing(sel_phr);
        }

        Project.renderAll();
        PVS.loadConceptPhrasingList(concept);

        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing,
            data: {
                text: text,
                concept: concept.getRequestId(),
                document: pres_doc.getDocument().getId(),
                presentation: true
            },
            success: function (data) {
                console.log(data);
                var old_id = phrasing.getId();
                phrasing.setId(data.phrasing.id);
                phrasing.setCreatedTs(data.phrasing.created_timestamp);
                phrasing.setModifiedTs(data.phrasing.modified_timestamp);
                concept.updatePhrasingId(old_id);

                if (data.selected_phrasing && sel_phr.getId() != data.selected_phrasing.id) {
                    old_id = sel_phr.getId();
                    sel_phr.setId(data.selected_phrasing.id);
                    sel_phr.setCreatedTs(data.selected_phrasing.created_timestamp);
                    sel_phr.setModifiedTs(data.selected_phrasing.modified_timestamp);
                    concept.updatePresentationSelectedPhrasingId(old_id);
                }

            }
        }}, comms.put, false);

        PhrasingEventListener.pres_summernote = null;

        Project.enableRender();
        Shortcut.set('dvs_pres');
        Project.renderAll();
    }
};

PhrasingEventListener.cancelCreatePresentationSummerNote = function () {
    if (PhrasingEventListener.pres_summernote) {
        PhrasingEventListener.pres_summernote = null;
        Project.enableRender();
        Shortcut.set('dvs_pres');
        Project.renderAll();
    }
};

PhrasingEventListener.createSummerNote = function (concept) {
    if (!Document.getCurrent().hasPermissionManagePhrasings(User.getCurrent())) {
        Notify.alert(Permission.failedManagePhrasingDocument);
        return;
    }
    Shortcut.set('create_phrasing_summernote');
    var document = Document.getCurrent();
    var phrasing = concept.getDocumentPhrasing(document);
    SummerNote.create(concept, phrasing.getText());
    Project.renderAll();
    concept.summernote.focus();
    concept.summernote.select_all_text();
};

PhrasingEventListener.finalizeAndCancelCreateSummerNote = function () {
    PhrasingEventListener.finalizeCreateSummerNote();
    PhrasingEventListener.cancelCreateSummerNote();
};

PhrasingEventListener.finalizeCreateSummerNote = function () {
    if (!SummerNote.summernote)
        return;
    var text = SummerNote.summernote.get_text();
    if (text.trim() == '') {
        PhrasingEventListener.cancelCreateSummerNote();
        return;
    }

    var concept = SummerNote.summernote.getConcept();
    var document = Document.getCurrent();
    var dateTs = new Date().getTime();
    var username = User.getCurrent().getUserName();
    SummerNote.remove();


    var phrasing = new Phrasing();
    phrasing.setId(Util.generateUUID1());
    phrasing.setCreatedTs(dateTs);
    phrasing.setModifiedTs(dateTs);
    phrasing.setOwners([username]);
    phrasing.setPermissions(new Permission());
    phrasing.setText(text);
    phrasing.setConcept(concept);
    concept.addPhrasing(phrasing);

    var sum_doc;
    if (document.getState() == Document.STATE_SUMMARY) {
        sum_doc = document.getSummaryDocument();
        var sel_phr = concept.getSelectedPhrasingByDoc(sum_doc);
        if (sel_phr)
            sel_phr.setPhrasing(phrasing);

        sel_phr = new SummarySelectedPhrasing();
        sel_phr.setId(Util.generateUUID1());
        sel_phr.setCreatedTs(dateTs);
        sel_phr.setModifiedTs(dateTs);
        sel_phr.setConcept(concept);
        sel_phr.setDocument(sum_doc);
        sel_phr.setPhrasing(phrasing);
        concept.addSummarySelectedPhrasing(sel_phr);
    } else if (document.getState() == Document.STATE_PRESENTATION) {
        var pres_doc = document.getPresentationDocument();
        sel_phr = concept.getSelectedPhrasingByDoc(pres_doc);
        if (sel_phr)
            sel_phr.setPhrasing(phrasing);

        sel_phr = new PresentationSelectedPhrasing();
        sel_phr.setId(Util.generateUUID1());
        sel_phr.setCreatedTs(dateTs);
        sel_phr.setModifiedTs(dateTs);
        sel_phr.setConcept(concept);
        sel_phr.setDocument(pres_doc);
        sel_phr.setPhrasing(phrasing);
        concept.addPresentationSelectedPhrasing(sel_phr);
    } else {
        sel_phr = concept.getSelectedPhrasingByDoc(document);
        if (sel_phr)
            sel_phr.setPhrasing(phrasing);

        if (document.isDistilled() && !concept.isLinked()) {
            concept.setDistilledPhrasing(phrasing);
        } else if (!sel_phr) {
            sel_phr = new SelectedPhrasing();
            sel_phr.setId(Util.generateUUID1());
            sel_phr.setCreatedTs(dateTs);
            sel_phr.setModifiedTs(dateTs);
            sel_phr.setConcept(concept);
            sel_phr.setDocument(document);
            sel_phr.setPhrasing(phrasing);
            concept.addSelectedPhrasing(sel_phr);
        }
    }

    Project.renderAll();
    PVS.loadConceptPhrasingList(concept);

    comms.queue(function () { return {
        url: ARTIFACT_URLS.phrasing,
        data: {
            text: text,
            concept: concept.getRequestId(),
            document: document.getId(),
            summary: !!sum_doc
        },
        success: function (data) {
            console.log(data);
            var old_id = phrasing.getId();
            phrasing.setId(data.phrasing.id);
            phrasing.setCreatedTs(data.phrasing.created_timestamp);
            phrasing.setModifiedTs(data.phrasing.modified_timestamp);
            concept.updatePhrasingId(old_id);

            if (data.selected_phrasing && sel_phr.getId() != data.selected_phrasing.id) {
                old_id = sel_phr.getId();
                sel_phr.setId(data.selected_phrasing.id);
                sel_phr.setCreatedTs(data.selected_phrasing.created_timestamp);
                sel_phr.setModifiedTs(data.selected_phrasing.modified_timestamp);
                if (!!sum_doc)
                    concept.updateSummarySelectedPhrasingId(old_id);
                else
                    concept.updateSelectedPhrasingId(old_id);
            }

        }
    }}, comms.put, false);
};

PhrasingEventListener.cancelCreateSummerNote = function () {
    if (!SummerNote.summernote)
        return;
    var concept = SummerNote.summernote.getConcept();
    SummerNote.remove();
    ConceptEventListener.activate(concept, true, false);
    Project.renderAll();
};

PhrasingEventListener.create = function (concept, notifyTVS, notifyServer) {

};

/** EDIT **
 * Event Listener for edit events
 */
PhrasingEventListener.editMouseClick = function (concept) {
    ConceptEventListener.activeMouseClick(concept);
    PhrasingEventListener.editSummerNote(concept);
};

PhrasingEventListener.editContextMenu = function (concept) {
    ConceptEventListener.activateContextMenu(concept);
    PhrasingEventListener.editSummerNote(concept);
};

PhrasingEventListener.editCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    var action_data = transaction.getActionData();
    Project.getConceptLoader().processCache();
    var phrasing = Phrasing.get(transaction.getArtifactId());
    if (phrasing) {
        transaction.setArtifact(phrasing);
        phrasing.setText(action_data.text);
        Project.renderAll();
    }
};

PhrasingEventListener.editShortcut = function () {
    PhrasingEventListener.editSummerNote(Concept.getCurrent(), true, true);
};

PhrasingEventListener.editSummerNote = function (concept) {
    var document = Document.getCurrent();
    var attribute = concept.getDocumentAttribute(document);
    var phrasing = concept.getDocumentPhrasing(document);
    if (attribute && attribute.isImage() && phrasing.getText() == '') {
        PhrasingEventListener.createSummerNote(concept);
        return;
    }

    if (!phrasing.hasPermissionWrite()) {
        Notify.alert(Permission.failedEditPhrasing);
        return;
    }

    Shortcut.set('edit_phrasing_summernote');
    SummerNote.create(concept, phrasing.getText());
    Project.renderAll();
    concept.summernote.focus();
    concept.summernote.set_cursor_to_end();
};

PhrasingEventListener.finalizeAndCancelEditSummerNote = function () {
    PhrasingEventListener.finalizeEditSummerNote();
    PhrasingEventListener.cancelEditSummerNote();
};

PhrasingEventListener.finalizeEditSummerNote = function () {
    if (!SummerNote.summernote)
        return;
    var text = SummerNote.summernote.get_text();
    if (text.trim() == '') {
        PhrasingEventListener.cancelEditSummerNote();
        return;
    }

    var concept = SummerNote.summernote.getConcept();
    var document = Document.getCurrent();
    var phrasing = concept.getDocumentPhrasing(document);
    phrasing.setText(text);
    SummerNote.remove();
    Project.renderAll();
    PVS.setPhrasingProperties(phrasing);
    PVS.loadConceptPhrasingList(concept);

    comms.queue(function () { return {
        url: ARTIFACT_URLS.phrasing + phrasing.getId(), data: {text: text}
    }}, comms.post, false);
};

PhrasingEventListener.cancelEditSummerNote = function () {
    if (!SummerNote.summernote)
        return;
    var concept = SummerNote.summernote.getConcept();
    SummerNote.remove();
    ConceptEventListener.activate(concept, true, false);
    Project.renderAll();
};

PhrasingEventListener.pres_edit_element = null;
PhrasingEventListener.pres_edit_summernote = null;
PhrasingEventListener.editPresentationSummernote = function (element) {
    var concept = element.data('concept');
    if (concept) {
        Project.disableRender();
        Shortcut.set('pres_edit_phr_summernote');

        var doc = Document.getCurrent().getPresentationDocument();

        var summernote = $('<span></span>');
        PhrasingEventListener.pres_edit_element = element;
        PhrasingEventListener.pres_edit_summernote = summernote;
        element.after(summernote);
        element.addClass('hidden');

        var sel_phr = concept.getPresentationSelectedPhrasingByDoc(doc);
        if (sel_phr) {
            var text = sel_phr.getPhrasing().getText();
        } else {
            text = concept.getPresentationDocumentPhrasing(doc).getText();
            if (text.length > 100)
                text = Util.distill_phrase(text);
        }

        summernote.summernote({
            focus: true,
            airMode: true,
            airPopover: [
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['font', ['strikethrough']],
                ['color', ['color']]
            ]
        });

        summernote.code(text);
        var el = $('.note-editable')[0];
        if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(false);
            textRange.select();
        }
    }
};

PhrasingEventListener.finalizeEditPresentationSummernote = function () {
    if (PhrasingEventListener.pres_edit_summernote) {
        var summernote = PhrasingEventListener.pres_edit_summernote;
        var element = PhrasingEventListener.pres_edit_element;
        var concept = element.data('concept');
        var pres_doc = Document.getCurrent().getPresentationDocument();
        var text = SummerNote._strip_unwanted_tags(summernote.code().trim());

        var phrasing = concept.getDocumentPhrasing(pres_doc.getDocument());
        phrasing.setText(text);

        PVS.loadConceptPhrasingList(concept);

        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing + phrasing.getId(), data: {text: text}
        }}, comms.post, false);

        PhrasingEventListener.pres_edit_summernote = null;

        Project.enableRender();
        Shortcut.set('dvs_pres');
        Project.renderAll();
    }
};

PhrasingEventListener.cancelEditPresentationSummerNote = function () {
    if (PhrasingEventListener.pres_edit_summernote) {
        PhrasingEventListener.pres_edit_summernote = null;
        Project.enableRender();
        Shortcut.set('dvs_pres');
        Project.renderAll();
    }
};

/** DELETE **
 * Event Listener for delete events
 */

PhrasingEventListener.confirm_deletion_message = 'Are you sure you want to delete this phrasing?';

PhrasingEventListener.deleteMouseClick = function (phrasing) {

};

PhrasingEventListener.deleteCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    Project.getConceptLoader().processCache();
    var phrasing = Phrasing.get(transaction.getArtifactId());
    if (phrasing) {
        transaction.setArtifact(phrasing);
        PhrasingEventListener.del(phrasing, true, true, false);
        Project.renderAll();
    }
};

PhrasingEventListener.deletePVS = function (phrasing) {

};

PhrasingEventListener.deleteShortcut = function () {
    var phrasing = Concept.getCurrent().getDocumentPhrasing(Project.getCurrentDocument());
    if (!phrasing.hasPermissionWrite()) {
        Notify.alert(Permission.failedDeletePhrasing);
        return;
    }

    Notify.confirm(PhrasingEventListener.confirm_deletion_message, function (results) {
        if (results) {
            PhrasingEventListener.del(phrasing, true, true, true);
            Project.renderAll();
        }
    });
};

PhrasingEventListener.del = function (phrasing, notifyTVS, notifyPVS, notifyServer) {
    if (phrasing == phrasing.getConcept().getDistilledPhrasing()) {
        Notify.notify('You can not delete the distilled phrasing');
        return;
    }

    var concept = phrasing.getConcept();
    var sel_phrs = concept.getSelectedPhrasingByPhr(phrasing);
    for (var i = 0; i < sel_phrs.length; i++)
        concept.removeSelectedPhrasing(sel_phrs[i]);
    phrasing.setDeleted(true);

    if (notifyPVS) {
        PVS.loadConceptPhrasingList(concept);
    }

    if (notifyTVS) {
        // TODO
    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing + phrasing.getId()
        }}, comms.delete, false);
    }
};

/** PERMISSION **
 * Event Listener for permission chnage events
 */
PhrasingEventListener.setPermissionsMouseClick = function (phrasing) {
    PhrasingEventListener.showPermissionsModal(phrasing);
};

PhrasingEventListener.showPermissionsModal = function (phrasing) {
    PermissionSettingsModal.show(
        'Phrasing Security Settings',
        phrasing,
        function (group) {PhrasingEventListener.addGroup(phrasing, group, true, true)},
        function (group) {PhrasingEventListener.removeGroup(phrasing, group, true, true)},
        function (group, op, type, perm) {PhrasingEventListener.addPerm(phrasing, group, op, type, perm, true, true)},
        function (group, op, type) {PhrasingEventListener.removePerm(phrasing, group, op, type, true, true)},
        phrasing.hasPermissionAdmin()
    )
};

PhrasingEventListener.addGroup = function (phrasing, group, notifyDvs, notifyServer) {
    phrasing.getPermissions().addPermission('read', group, 'allow', false);

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing + phrasing.getRequestId(),
            data: {
                type: 'shared',
                operation: 'read',
                group_id: group.getId(),
                permission: 'allow'
            }
        }}, comms.post, false);
    }
};

PhrasingEventListener.removeGroupCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var phrasing = Phrasing.get(transaction.getArtifactId());
    if (phrasing) {
        transaction.setArtifact(phrasing);
        var action_data = transaction.getActionData();
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = phrasing.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        PhrasingEventListener.removeGroup(phrasing, group, true, true, false);

        if (!phrasing.hasPermissionRead(User.getCurrent()))
            phrasing.secureDelete();

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == phrasing)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    }
};

PhrasingEventListener.removeGroup = function (phrasing, group, notifyDvs, notifyServer) {
    phrasing.getPermissions().removeGroup(group);

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing + phrasing.getRequestId(),
            data: {
                remove_group: group.getId()
            }
        }}, comms.post, false);
    }
};

PhrasingEventListener.addPermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var phrasing = Phrasing.get(transaction.getArtifactId());
    if (phrasing) {
        transaction.setArtifact(phrasing);
        var action_data = transaction.getActionData();
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = phrasing.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        PhrasingEventListener.addPerm(phrasing, group, action_data.operation,
            action_data.type, action_data.permission, true, true, false);

        if (!phrasing.hasPermissionRead(User.getCurrent()))
            phrasing.secureDelete();

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == phrasing)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    }
};

PhrasingEventListener.addPerm = function (phrasing, group, operation, type, perm, notifyDvs, notifyServer) {
    phrasing.getPermissions().addPermission(operation, group, perm, (type != 'shared'));

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing + phrasing.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId(),
                permission: perm
            }
        }}, comms.post, false);
    }
};

PhrasingEventListener.removePermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var phrasing = Phrasing.get(transaction.getArtifactId());
    if (phrasing) {
        transaction.setArtifact(phrasing);
        var action_data = transaction.getActionData();
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = phrasing.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        PhrasingEventListener.addPerm(phrasing, group, action_data.operation,
            action_data.type,true, true, false);

        if (!phrasing.hasPermissionRead(User.getCurrent()))
            phrasing.secureDelete();

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == phrasing)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    }
};

PhrasingEventListener.removePerm = function (phrasing, group, operation, type, notifyDvs, notifyServer) {
    phrasing.getPermissions().removePermission(operation, group, (type != 'shared'));

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue(function () { return {
            url: ARTIFACT_URLS.phrasing + phrasing.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId()
            }
        }}, comms.post, false);
    }
};