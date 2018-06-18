function DocumentEventListener () {}

/** CREATE **
 * Event Listener for create events
 */
DocumentEventListener.createCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    DocumentEventListener.create(transaction.getActionData().document, false, false);
    transaction.setArtifact(Document.get(transaction.getActionData().document.id));
};

DocumentEventListener.createMouseClick = function () {
    DocumentEventListener.showCreateDocumentModal();
};

DocumentEventListener.createShortcut = function () {
    DocumentEventListener.showCreateDocumentModal();
};

DocumentEventListener.showCreateDocumentModal = function () {
    DocumentPropertiesModal.clearInputs();
    DocumentPropertiesModal.show(
        function (values) {
            DocumentPropertiesModal.hide();
            DocumentEventListener.create(values, true, true);
        }
    );
};

DocumentEventListener.create = function (values, activate, notifyServer) {
    function create_new_doc (data) {
        var document = new Document();
        document.initDocument(data);
        Document.addDocumentTab(document);
        Project.addDocument(document);
        if (activate)
             DocumentEventListener.activate(document, true, true);
    }

    if (notifyServer) {
        comms.put({
            url: ARTIFACT_URLS.document,
            async: false,  // Don't want users to make any actions till
            data: {        // we get the Document Id from the server.
                project: Project.getId(),
                title: values.title,
                subtitle: values.subtitle,
                author: values.author,
                version: values.version,
                date: values.date,
                copyright: values.copyright,
                description: values.description
            },
            success: function (data) {
                create_new_doc(data);
            }
        })
    } else {
        create_new_doc(values);
    }
};

/** EDIT **
 * Event Listener for edit events
 */
DocumentEventListener.editMouseCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var document = Document.get(transaction.getArtifactId());
    transaction.setArtifact(document);
    DocumentEventListener.edit(transaction.getActionData().values, document, false);
};

DocumentEventListener.editMouseClick = function (document) {
    DocumentEventListener.showEditModel(document);
};

DocumentEventListener.editShortcut = function () {
    DocumentEventListener.showEditModel(Project.getCurrentDocument());
};

DocumentEventListener.showEditModel = function (document) {
    if (!document.hasPermissionWrite()) {
        Notify.alert(Permission.failedEditDocument);
        return;
    }

    DocumentPropertiesModal.setInputs({
        title: document.getTitle(),
        subtitle: document.getSubtitle(),
        author: document.getAuthor(),
        version: document.getVersion(),
        date: document.getDate(),
        copyright: document.getCopyright(),
        description: document.getDescription()
    });
    DocumentPropertiesModal.show(
        function (values) {
            DocumentPropertiesModal.hide();
            DocumentEventListener.edit(values, document, true);
        }, true);
};

DocumentEventListener.edit = function (new_values, document, notifyServer) {
    var ajax_data = {};
    if (new_values.title != null &&new_values.title != document.getTitle()) {
        ajax_data.title = new_values.title;
        document.setTitle(new_values.title);
    }

    // Only notify the server of the field that changed
    if (new_values.subtitle != null && new_values.subtitle != document.getSubtitle()) {
        ajax_data.subtitle = new_values.subtitle;
        document.setSubtitle(new_values.subtitle);
    }

    if (new_values.author != null && new_values.author != document.getAuthor()) {
        ajax_data.author = new_values.author;
        document.setAuthor(new_values.author);
    }

    if (new_values.version != null && new_values.version != document.getVersion()) {
        ajax_data.version = new_values.version;
        document.setVersion(new_values.version);
    }

    if (new_values.date != null && new_values.date != document.getDate()) {
        ajax_data.date = new_values.date;
        document.setDate(new_values.date);
    }

    if (new_values.copyright != null && new_values.copyright != document.getCopyright()) {
        ajax_data.copyright = new_values.copyright;
        document.setCopyright(new_values.copyright);
    }

    if (new_values.description != null && new_values.description != document.getDescription()) {
        ajax_data.description = new_values.description;
        document.setDescription(new_values.description);
    }

    if (notifyServer) {
        comms.queue({
                url: ARTIFACT_URLS.document + document.getId(),
                data: ajax_data
            }, comms.post, false);
    }

    PVS.setDocumentProperties(document);
};

/** ACTIVATE **
 * Event Listener for edit events
 */
DocumentEventListener.ACTIVATE_LEFT = 1;
DocumentEventListener.ACTIVATE_RIGHT = 2;

DocumentEventListener.activateCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var document = Document.get(transaction.getArtifactId());
    transaction.setArtifact(document);

    user.deactivateConcept();
    user.setDocument(document);
    user.activateConcept();
};

DocumentEventListener.activateMouseClick = function (document) {
    var cur_doc = Document.getCurrent();
    cur_doc.hideViewStateSelecter();
    Project.setCurrentDocument(document);
    document.showViewStateSelector();
    Project.renderAll();
    PVS.setDocumentProperties(document);
    PVS.loadConceptPhrasingList(Concept.getCurrent());
    Annotation.changeDocument(document);

    comms.debounce({
        url: ARTIFACT_URLS.document + document.getId(),
        data: {'active_document': true}},
        comms.post, 'doc_chg', 500);
};

DocumentEventListener.activateShortcutLeft = function () {
    DocumentEventListener.activateByDirection(DocumentEventListener.ACTIVATE_LEFT);
};

DocumentEventListener.activateShortcutRight = function () {
    DocumentEventListener.activateByDirection(DocumentEventListener.ACTIVATE_RIGHT);
};

DocumentEventListener.activateByDirection = function (direction, document) {
    if (!document)
        document = Project.getCurrentDocument();
    var documents = Project.getDocuments();
    var index = documents.indexOf(document);
    if (direction == DocumentEventListener.ACTIVATE_LEFT) {
        if (index == 0) {
            document = documents[documents.length - 1];
        } else {
            document = documents[index - 1];
        }
    } else if (direction == DocumentEventListener.ACTIVATE_RIGHT) {
        if (index == documents.length - 1) {
            document = documents[0];
        } else  {
            document = documents[index + 1];
        }
    } else {
        throw 'no or invalid activation direction'
    }

    if (document.isDeleted()) {
        DocumentEventListener.activateByDirection(direction, document);
    }

    DocumentEventListener.activate(document);
};

DocumentEventListener.activate = function (document) {
    document.getDvsTab().children().click();
};

/** DELETE **
 * Event Listener for delete events
 */

DocumentEventListener.confirm_deletion_message = 'Are you sure you want to delete this document?';

DocumentEventListener.deleteCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var document = Document.get(transaction.getArtifactId());
    transaction.setArtifact(document);
    DocumentEventListener.del(document, true, false);
};

DocumentEventListener.deleteMouseClick = function (document) {
    if (!document.hasPermissionWrite()) {
        Notify.alert(Permission.failedDeleteDocument);
        return;
    }

    Notify.confirm(DocumentEventListener.confirm_deletion_message, function (results) {
        if (results)
            DocumentEventListener.del(document, true, true);
    });
};

DocumentEventListener.deleteShortcut = function () {
    var document = Document.getCurrent();
    if (!document.hasPermissionWrite()) {
        Notify.alert(Permission.failedDeleteDocument);
        return;
    }

    Notify.confirm(DocumentEventListener.confirm_deletion_message, function (results) {
        if (results)
            DocumentEventListener.del(document, true, true);
    });
};

DocumentEventListener.del = function (document, notifyTVS, notifyServer) {
    if (document.isDistilled()) {
        Notify.notify('You can not delete the distilled document');
        return;
    }

    if (document == Project.getCurrentDocument())
        DocumentEventListener.activateShortcutLeft();

    var annos = Annotation.getByDocument(document);
    for (var i = 0; i < annos.length; i++) {
        if (notifyServer)
            annos[i].del();
        else
            annos[i].remove();
    }

    document.setDeleted(true);
    document.getDvsTab().hide();
    Document.remove(document);

    if (notifyServer) {
        comms.queue({url: ARTIFACT_URLS.document + document.getId()}, comms.delete, false);
    }
};

/** CHANGE STATE TEXT **
 * Event Listener for state changes to text
 */
DocumentEventListener.setStateTextMouseClick = function (doc) {
    DocumentEventListener.setStateText(doc, true, true, true);
};

DocumentEventListener.setStateText = function (doc, notifyTVS, notifyDVS, notifyServer) {
    console.debug('Showing Document Text');
    Shortcut.set('dvs');
    doc.getViewStateSelector().html('<i class="fa fa-fw fa-file-text-o"></i> <span class="caret small-caret"></span>');
    doc.setState(Document.STATE_TEXT);
    SummaryDocument.hideWordCountSlider();
    PresentationDocument.hideSlideCountSlider();
    Project.renderAll();
    PVS.loadConceptPhrasingList(Concept.getCurrent());

    DVS.scrollbar.css("overflow-y", "auto");

    $('.text_pub_context').removeClass('hidden');
    $('.sum_pub_context').addClass('hidden');
    $('.pre_pub_context').addClass('hidden');
};

/** CHANGE STATE SUMMARY **
 * Event Listener for state changes to text
 */
DocumentEventListener.setStateSummaryMouseClick = function (doc) {
    DocumentEventListener.setStateSummary(doc, true, true, true);
};

DocumentEventListener.setStateSummary = function (doc, notifyTVS, notifyDVS, notifyServer) {
    console.debug('Showing Document Summary');
    Shortcut.set('dvs');
    doc.getViewStateSelector().html('<i class="fa fa-fw fa-magic"></i> <span class="caret small-caret"></span>');
    doc.setState(Document.STATE_SUMMARY);

    SummaryDocument.showWordCountSlider();
    PresentationDocument.hideSlideCountSlider();

    DVS.scrollbar.css("overflow-y", "auto");

    $('.text_pub_context').addClass('hidden');
    $('.sum_pub_context').removeClass('hidden');
    $('.pre_pub_context').addClass('hidden');

    var sum_doc = doc.getSummaryDocument();
    function render_summary () {
        SummaryDocument.initSlider(sum_doc);
        sum_doc.setRunning(false);
        Project.renderAll();
        PVS.loadConceptPhrasingList(Concept.getCurrent());
    }

    if (sum_doc == null) {
        comms.put(function () {return {
            url: ARTIFACT_URLS.summary_document,
            data: {document: doc.getRequestId()},
            success: function (data) {
                sum_doc = new SummaryDocument();
                data.document = doc;
                sum_doc.initSummaryDocument(data);
                doc.setSummaryDocument(sum_doc);
                render_summary();
            }
        }})
    } else {
        render_summary();
    }
};

/** CHANGE STATE PRESENTATION **
 * Event Listener for state changes to text
 */
DocumentEventListener.setStatePresentationMouseClick = function (doc) {
    DocumentEventListener.setStatePresentation(doc, true, true, true);
};

DocumentEventListener.setStatePresentation = function (doc, notifyTVS, notifyDVS, notifyServer) {
    console.debug('Showing Document Presentation');
    Shortcut.set('dvs_pres');
    doc.getViewStateSelector().html('<i class="fa fa-fw fa-file-powerpoint-o"></i> <span class="caret small-caret"></span>');
    doc.setState(Document.STATE_PRESENTATION);

    SummaryDocument.hideWordCountSlider();
    PresentationDocument.showSlideCountSlider();
    PresentationDocument.presentation_settings_button.unbind("click").bind("click", function() {
        PresentationDocument.togglePresentationSettings();
    });

    DVS.scrollbar.css("overflow-y", "hidden");

    $('.text_pub_context').addClass('hidden');
    $('.sum_pub_context').addClass('hidden');
    $('.pre_pub_context').removeClass('hidden');

    var pres_doc = doc.getPresentationDocument();
    function render_presentation () {
        PresentationRender.current_concept = null;
        PresentationDocument.initSlider(pres_doc);
        pres_doc.setRunning(false);
        Project.renderAll();
        PVS.loadConceptPhrasingList(Concept.getCurrent());
    }

    if (pres_doc == null) {
        comms.put(function () {return {
            url: ARTIFACT_URLS.presentation_document,
            data: {document: doc.getRequestId()},
            success: function (data) {
                pres_doc = new PresentationDocument();
                data.document = doc;
                pres_doc.initPresentationDocument(data);
                doc.setPresentationDocument(pres_doc);
                render_presentation();
            }
        }})
    } else {
        render_presentation();
    }
};

/** PERMISSION **
 * Event Listener for permission change events
 */
DocumentEventListener.setPermissionsMouseClick = function (document) {
    DocumentEventListener.showPermissionsModal(document);
};

DocumentEventListener.showPermissionsModal = function (document) {
    PermissionSettingsModal.show(
        'Document Security Settings',
        document,
        function (group) {DocumentEventListener.addGroup(document, group, true, true)},
        function (group) {DocumentEventListener.removeGroup(document, group, true, true)},
        function (group, op, type, perm) {DocumentEventListener.addPerm(document, group, op, type, perm, true, true)},
        function (group, op, type) {DocumentEventListener.removePerm(document, group, op, type, true, true)},
        document.hasPermissionAdmin()
    )
};

DocumentEventListener.addGroup = function (document, group, notifyDvs, notifyServer) {
    document.getPermissions().addPermission('read', group, 'allow', false);

    if (notifyDvs) {
        document.refreshTitleTab();
    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.document + document.getRequestId(),
            data: {
                type: 'shared',
                operation: 'read',
                group_id: group.getId(),
                permission: 'allow'
            }
        }, comms.post, false);
    }
};

DocumentEventListener.removeGroupCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var document = Document.get(transaction.getArtifactId());
    if (document) {
        transaction.setArtifact(document);
        var action_data = transaction.getActionData();
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = document.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        DocumentEventListener.removeGroup(document, group, true, false);

        if (!document.hasPermissionRead(User.getCurrent())) {
            document.clearPropteries();
            DocumentEventListener.del(document, true, false);
        }

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == document)
            PermissionSettingsModal.refresh();
    } else {
        comms.get({
            url: ARTIFACT_URLS.document + transaction.getArtifactId(),
            success: function (data) {
                DocumentEventListener.create(data, false, false);
                transaction.setArtifact(Document.get(data.id));
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status != 403) {
                    console.debug('%O: %O: %s', jqXHR.status, errorThrown, jqXHR.getResponseHeader('reason'));
                    if (Page.getDebugLevel() >= 4) {
                        alert('There was an error, please check your console for logs');
                    }
                }
            }

        })
    }
};

DocumentEventListener.removeGroup = function (document, group, notifyDvs, notifyServer) {
    document.getPermissions().removeGroup(group);

    if (notifyDvs) {
        document.refreshTitleTab();
    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.document + document.getRequestId(),
            data: {
                remove_group: group.getId()
            }
        }, comms.post, false);
    }
};

DocumentEventListener.addPermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var document = Document.get(transaction.getArtifactId());
    if (document) {
        transaction.setArtifact(document);
        var action_data = transaction.getActionData();
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = document.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        DocumentEventListener.addPerm(document, group, action_data.operation,
            action_data.type, action_data.permission, true, false);

        if (!document.hasPermissionRead(User.getCurrent())) {
            document.clearPropteries();
            DocumentEventListener.del(document, true, false);
        }

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == document)
            PermissionSettingsModal.refresh();
    } else {
        comms.get({
            url: ARTIFACT_URLS.document + transaction.getArtifactId(),
            success: function (data) {
                DocumentEventListener.create(data, false, false);
                transaction.setArtifact(Document.get(data.id));
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status != 403) {
                    console.debug('%O: %O: %s', jqXHR.status, errorThrown, jqXHR.getResponseHeader('reason'));
                    if (Page.getDebugLevel() >= 4) {
                        alert('There was an error, please check your console for logs');
                    }
                }
            }

        })
    }
};

DocumentEventListener.addPerm = function (document, group, operation, type, perm, notifyDvs, notifyServer) {
    document.getPermissions().addPermission(operation, group, perm, (type != 'shared'));

    if (notifyDvs) {
        document.refreshTitleTab();
    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.document + document.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId(),
                permission: perm
            }
        }, comms.post, false);
    }
};

DocumentEventListener.removePermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var document = Document.get(transaction.getArtifactId());
    if (document) {
        transaction.setArtifact(document);
        var action_data = transaction.getActionData();
        var group = Group.get(action_data.group);
        if (!group)
            group = action_data.group;

        var perms = document.getPermissions();
        if (action_data.hidden) {
            var hidden = perms.getPermissions()['hidden'];
            if (!hidden) {
                hidden = [];
                perms.getPermissions()['hidden'] = hidden;
            }
            hidden.push(action_data.group);
        }

        DocumentEventListener.addPerm(document, group, action_data.operation,
            action_data.type, true, false);

        if (!document.hasPermissionRead(User.getCurrent())) {
            document.clearPropteries();
            DocumentEventListener.del(document, true, false);
        }

        if (PermissionSettingsModal.isShowing() &&
            PermissionSettingsModal.getArtifact() == document)
            PermissionSettingsModal.refresh();

        Project.renderAll();
    } else {
        comms.get({
            url: ARTIFACT_URLS.document + transaction.getArtifactId(),
            success: function (data) {
                DocumentEventListener.create(data, false, false);
                transaction.setArtifact(Document.get(data.id));
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status != 403) {
                    console.debug('%O: %O: %s', jqXHR.status, errorThrown, jqXHR.getResponseHeader('reason'));
                    if (Page.getDebugLevel() >= 4) {
                        alert('There was an error, please check your console for logs');
                    }
                }
            }

        })
    }
};

DocumentEventListener.removePerm = function (document, group, operation, type, notifyDvs, notifyServer) {
    document.getPermissions().removePermission(operation, group, (type != 'shared'));

    if (notifyDvs) {
        document.refreshTitleTab();
    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.document + document.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId()
            }
        }, comms.post, false);
    }
};


/** PRINT **
 * Event Listener for print events
 */
DocumentEventListener.printMouseClick = function (document) {
    DocumentEventListener.print(document);
};

DocumentEventListener.printShortCut = function () {
    var document = Document.getCurrent();
    DocumentEventListener.print(document);
};

DocumentEventListener.print = function (document) {
    var print_window = window.open("", document.getTitle(), " resizable=yes, width=820, height=800");

    if (print_window == null) {
        Notify.alert("Please check you popup blocker, it could be clocking the print window");
    }

    print_window.document.write(
        '<!DOCTYPE HTML> \
<html style="overflow-y:auto"> \
<head>     \
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type">     \
    <meta content="utf-8" http-equiv="encoding">     \
    <title>' + document.getTitle() + '</title>     \
    <meta name="viewport" content="width=device-width, initial-scale=1.0">     \
    <link href="/lib/bootstrap/css/bootstrap.css" rel="stylesheet">     \
    <link href="/lib/font-awesome/css/font-awesome.min.css" rel="stylesheet">     \
    <link href="/css/style.css" rel="stylesheet">    \
    <style type="text/css" media="print">\
             .dontprint {         \
             display: none; }     \
             </style> \
 </head>\
<body style="margin-top:15px"> \
    <div class="dontprint">\
        <span class="col-lg-12">\
            <button onclick="return print_document()"><i class="fa fa-print"></i></button>\
            <span id="loading"><i class="fa fa-spinner fa-lg fa-spin"></i> Loading... Please Wait</span> \
        </span> \
    </div> \
    <div class="container-liquid">\
        <span class="col-lg-12"> \
        <div id="doc" class="row-fluid" style="margin-left:15px; margin-right:15px"> \
        </div> \
        </span> \
    </div>\
</body> \
<script src="/lib/jquery/jquery.js" type="text/javascript"></script> \
<script src="/lib/jquery/jquery-ui.custom.js" type="text/javascript"></script> \
<script src="/lib/bootstrap/js/bootstrap.js"></script> \
<script>\
    function print_document(){\
        window.print()\
    }\
</script>\
</html>');

    Project.getConceptLoader().load_all(function () {
        Project.renderPrint(document);
        $(print_window.document.getElementById("doc")).append(Project.getProject().print_render.span);
        print_window.document.getElementById("loading").innerHTML = "";
    }, null);
};


/** PUBLISH **
 * Event Listener for publish events
 */
DocumentEventListener.publishCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var document = Document.get(transaction.getArtifactId());
    transaction.setArtifact(document);

    document.published.push(transaction.getActionData().publish);

    if (DocumentPublishModal.showing)
        DocumentPublishModal.load_table();
};

DocumentEventListener.publish = function (document, group, version, completed_callback) {
    if (version) {
        var url = ARTIFACT_URLS.publish_document + Project.getId() + '/' + document.getId() +
            '/' + group + '/?version=' + version
    } else {
        url = ARTIFACT_URLS.publish_document + Project.getId() + '/' + document.getId() +
            '/' + group + '/';
    }

    comms.get(function () {return {
        url: url,
        success: function (data) {
            var statusChecker = new StatusChecker('/document/publish/status/' + data.id,
            function (status_data) {
                console.debug('Restore Status: %O', status_data);
                if (status_data != 404) {
                    statusChecker.stop();
                    completed_callback(status_data);
                } else if (status_data.error && status_data.error == 500) {
                    statusChecker.stop();
                    console.error('Publish Error');
                }
            });
            statusChecker.setReportError(true);
            statusChecker.start();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 400) {
                var reason = jqXHR.getResponseHeader('reason');
                if (reason == 'Group does not have permission to read the document') {
                    completed_callback('400-1');
                } else if (reason == 'version name already taken') {
                    completed_callback('400-2');
                } else if (reason == 'invalid version given') {
                    completed_callback('400-3');
                }
            }
        }
    }});
};

DocumentEventListener.sumPublish = function (document, group, version, world_count, completed_callback) {
    if (version) {
        var url = ARTIFACT_URLS.summary_publish_document + Project.getId() + '/' +
            document.getId() + '/' + group + '/?version=' + version + '&word_count=' + world_count
    } else {
        url = ARTIFACT_URLS.summary_publish_document + Project.getId() + '/' +
            document.getId() + '/' + group + '?word_count=' + world_count;
    }

    comms.get(function () {return {
        url: url,
        success: function (data) {
            var statusChecker = new StatusChecker('/document/publish/status/' + data.id,
            function (status_data) {
                console.debug('Restore Status: %O', status_data);
                if (status_data != 404) {
                    statusChecker.stop();
                    completed_callback(status_data);
                } else if (status_data.error && status_data.error == 500) {
                    statusChecker.stop();
                    console.error('Summary Publish Error');
                }
            });
            statusChecker.setReportError(true);
            statusChecker.start();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 400) {
                var reason = jqXHR.getResponseHeader('reason');
                if (reason == 'Group does not have permission to read the document') {
                    completed_callback('400-1');
                } else if (reason == 'version name already taken') {
                    completed_callback('400-2');
                } else if (reason == 'invalid version given') {
                    completed_callback('400-3');
                }
            }
        }
    }});
};

DocumentEventListener.presPublish = function (document, group, version, slide_count, min_bullet, max_bullet, completed_callback) {
    if (version) {
        var url = ARTIFACT_URLS.presentation_publish_document + Project.getId() + '/' +
            document.getId() + '/' + group + '/?version=' + version + '&slide_count=' + slide_count +
            '&min_bullet=' + min_bullet + '&max_bullet=' + max_bullet
    } else {
        url = ARTIFACT_URLS.presentation_publish_document + Project.getId() + '/' +
            document.getId() + '/' + group + '?slide_count=' + slide_count +
            '&min_bullet=' + min_bullet + '&max_bullet=' + max_bullet;
    }

    comms.get(function () {return {
        url: url,
        success: function (data) {
            var statusChecker = new StatusChecker('/document/publish/status/' + data.id,
            function (status_data) {
                console.debug('Restore Status: %O', status_data);
                if (status_data != 404) {
                    statusChecker.stop();
                    completed_callback(status_data);
                } else if (status_data.error && status_data.error == 500) {
                    statusChecker.stop();
                    console.error('Presentation Publish Error');
                }
            });
            statusChecker.setReportError(true);
            statusChecker.start();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 400) {
                var reason = jqXHR.getResponseHeader('reason');
                if (reason == 'Group does not have permission to read the document') {
                    completed_callback('400-1');
                } else if (reason == 'version name already taken') {
                    completed_callback('400-2');
                } else if (reason == 'invalid version given') {
                    completed_callback('400-3');
                }
            }
        }
    }});
};
