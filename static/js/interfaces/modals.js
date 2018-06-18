function CreateImageModal() {}

CreateImageModal.modal = $('#create-concept-image-modal');
CreateImageModal.save_btn = $('#save-create-concept-image-btn');
CreateImageModal.upload_btn = $('#upload-create-concept-image-btn');
CreateImageModal.url_input = $('#image_concept_url');
CreateImageModal.file_input = $('#file_input');
CreateImageModal.file_input_init = false;
CreateImageModal.image_filename_span = $('#image_filename');

CreateImageModal.form = $('#create-concept-image-submite-form');
CreateImageModal.progress_div = $('#create-concept-image-upload-progress');
CreateImageModal.progressbar = $('#create-concept-image-progress-bar');
CreateImageModal.progressbar_text = $('#create-concept-image-progress-bar-text');

CreateImageModal.uploadCallback = null;
CreateImageModal.uploadDoneCallback = null;
CreateImageModal.selected_files = [];

CreateImageModal.show = function (urlCB, uploadCB, uploadDoneCB) {
    CreateImageModal.save_btn.unbind(); // Make sure we don't have a double binding
    CreateImageModal.save_btn.click(function () {
        if (urlCB)
            urlCB(CreateImageModal.getURL());
    });

    CreateImageModal.uploadCallback = uploadCB;
    CreateImageModal.uploadDoneCallback = uploadDoneCB;

    CreateImageModal.modal.on('shown.bs.modal', CreateImageModal._onShow);
    CreateImageModal.modal.on('hidden.bs.modal', CreateImageModal._onHide);

    CreateImageModal.form.removeClass('hidden');
    CreateImageModal.progress_div.addClass('hidden');

    CreateImageModal.modal.modal('show');
};

CreateImageModal.save = function () {
    CreateImageModal.save_btn.click();
};

CreateImageModal.startUpload = function () {
    CreateImageModal.upload_btn.click();
};

CreateImageModal._setupFileInput = function () {
    if (CreateImageModal.file_input_init)
        return;
    CreateImageModal.file_input_init = true;
    CreateImageModal.file_input.bootstrapFileInput();
    CreateImageModal.file_input.fileupload({
        progressall: function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            CreateImageModal.progressbar.css('width', progress + '%');
            CreateImageModal.progressbar_text.html(progress + '% Complete');
        },
        done: function (e, data) {
            if (CreateImageModal.uploadDoneCallback)
                CreateImageModal.uploadDoneCallback();
        },
        add: function (e, data) {
            Shortcut.set('upload_image');
            CreateImageModal.selected_files = data.files;
            CreateImageModal.save_btn.addClass('hidden');
            CreateImageModal.upload_btn.removeClass('hidden');
            CreateImageModal.image_filename_span.html(data.files[0].name);
            CreateImageModal.upload_btn.unbind();
            data.context = CreateImageModal.upload_btn.click(function () {
                data.startUpload = function () {
                    CreateImageModal.form.addClass('hidden');
                    CreateImageModal.progress_div.removeClass('hidden');
                    data.submit();
                };
                if (CreateImageModal.uploadCallback)
                    CreateImageModal.uploadCallback(data);
            });
        }
    });
    CreateImageModal.file_input.fileupload('option', {
        dataType: 'json',
        maxNumberOfFiles: 1,
        singleFileUploads: true,
        maxFileSize: 10000000 // 10MB
    });
};

CreateImageModal.getURL = function () {
    return CreateImageModal.url_input.val();
};

CreateImageModal.setURL = function (url) {
    CreateImageModal.url_input.val(url);
};

CreateImageModal.clearFiles = function () {
    CreateImageModal.selected_files.splice(0, CreateImageModal.selected_files.length);
    CreateImageModal.image_filename_span.html('');
};

CreateImageModal.getFiles = function () {
    return CreateImageModal.selected_files;
};

CreateImageModal._onShow = function () {
    CreateImageModal._setupFileInput();
    CreateImageModal.url_input.focus(function () {
        Shortcut.set('create_image_modal');
        CreateImageModal.save_btn.removeClass('hidden');
        CreateImageModal.upload_btn.addClass('hidden');
        CreateImageModal.clearFiles();
    });

    setTimeout(function () {
        CreateImageModal.url_input.focus();
    }, 1);
};

CreateImageModal._onHide = function () {
    Shortcut.set('dvs');
    CreateImageModal.clearFiles();
    CreateImageModal.save_btn.unbind();
    CreateImageModal.url_input.val('');
};

CreateImageModal.hide = function () {
    CreateImageModal.modal.modal('hide');

};

function CreateLinkModal() {}

CreateLinkModal.name = 'create_link_concept';
CreateLinkModal.modal = $('#create-concept-linked-modal');
CreateLinkModal.form = $('#create-concept-linked-form');
CreateLinkModal.progress_dev = $('#create-concept-link-progress');
CreateLinkModal.save_btn = $('#save-create-concept-linked-btn');
CreateLinkModal.id_input = $('#linked-concept-input');

CreateLinkModal.show = function (cb) {
    CreateLinkModal.save_btn.unbind(); // Make sure we don't have a double binding
    CreateLinkModal.save_btn.click(function () {
        CreateLinkModal.form.addClass('hidden');
        CreateLinkModal.progress_dev.removeClass('hidden');
        if (cb)
            cb(CreateLinkModal.getLinkId());
    });

    CreateLinkModal.modal.on('shown.bs.modal', CreateLinkModal._onShow);
    CreateLinkModal.modal.on('hidden.bs.modal', CreateLinkModal._onHide);

    CreateLinkModal.modal.modal('show');
};

CreateLinkModal.save = function () {
    CreateLinkModal.save_btn.click();
};

CreateLinkModal.getLinkId = function () {
    return CreateLinkModal.id_input.val();
};

CreateLinkModal.setLinkId = function (url) {
    CreateLinkModal.id_input.val(url);
};

CreateLinkModal._onShow = function () {
    Shortcut.set('create_link_concept');
    setTimeout(function () {
        CreateLinkModal.id_input.focus();
    }, 1);
};

CreateLinkModal._onHide = function () {
    Shortcut.set('dvs');
    CreateLinkModal.form.removeClass('hidden');
    CreateLinkModal.progress_dev.addClass('hidden');
    CreateLinkModal.setLinkId('');
};

CreateLinkModal.hide = function () {
    CreateLinkModal.modal.modal('hide');

};

function DocumentPropertiesModal() {}

DocumentPropertiesModal.name = 'document_properties_modal';
DocumentPropertiesModal.modal = $('#create-document-modal');
DocumentPropertiesModal.modal_title = $('#create-document-label');
DocumentPropertiesModal.title_input = $('#create-document-modal-title');
DocumentPropertiesModal.subtitle_input = $('#create-document-modal-subtitle');
DocumentPropertiesModal.author_input = $('#create-document-modal-author');
DocumentPropertiesModal.version_input = $('#create-document-modal-version');
DocumentPropertiesModal.date_input = $('#create-document-modal-date');
DocumentPropertiesModal.copyright_input = $('#create-document-modal-copyright');
DocumentPropertiesModal.description_input = $('#create-document-modal-description');
DocumentPropertiesModal.save_btn = $('#save-create-document-btn');

DocumentPropertiesModal.setTitle = function (value) {
    DocumentPropertiesModal.title_input.val(value);
};

DocumentPropertiesModal.getTitle = function () {
    return DocumentPropertiesModal.title_input.val();
};

DocumentPropertiesModal.setSubtitle = function (value) {
    DocumentPropertiesModal.subtitle_input.val(value);
};

DocumentPropertiesModal.getSubtitle = function () {
    return DocumentPropertiesModal.subtitle_input.val();
};

DocumentPropertiesModal.setAuthor = function (value) {
    DocumentPropertiesModal.author_input.val(value);
};

DocumentPropertiesModal.getAuthor = function () {
    return DocumentPropertiesModal.author_input.val();
};

DocumentPropertiesModal.setVersion = function (value) {
    DocumentPropertiesModal.version_input.val(value);
};

DocumentPropertiesModal.getVersion = function () {
    return DocumentPropertiesModal.version_input.val();
};

DocumentPropertiesModal.setDate = function (value) {
    DocumentPropertiesModal.date_input.val(value);
};

DocumentPropertiesModal.getDate = function () {
    return DocumentPropertiesModal.date_input.val();
};

DocumentPropertiesModal.setCopyright = function (value) {
    DocumentPropertiesModal.copyright_input.val(value);
};

DocumentPropertiesModal.getCopyright = function () {
    return DocumentPropertiesModal.copyright_input.val();
};

DocumentPropertiesModal.setDescription = function (value) {
    DocumentPropertiesModal.description_input.val(value);
};

DocumentPropertiesModal.getDescription = function () {
    return DocumentPropertiesModal.description_input.val();
};

DocumentPropertiesModal.show = function (saveCB, editMode) {
    DocumentPropertiesModal.save_btn.unbind(); // Make sure we don't have a double binding
    DocumentPropertiesModal.save_btn.click(function () {
        if (saveCB)
            saveCB(DocumentPropertiesModal.getInputs());
    });

    DocumentPropertiesModal.modal.on('shown.bs.modal', DocumentPropertiesModal._onShow);
    DocumentPropertiesModal.modal.on('hidden.bs.modal', DocumentPropertiesModal._onHide);

    if (editMode)
        DocumentPropertiesModal.modal_title.html('Edit Document Properties');
    else
        DocumentPropertiesModal.modal_title.html('Create New Document');

    DocumentPropertiesModal.modal.modal('show');
};

DocumentPropertiesModal.save = function () {
    DocumentPropertiesModal.save_btn.click();
};

DocumentPropertiesModal._onShow = function () {
    Shortcut.set('document_properties_modal');
    DocumentPropertiesModal.title_input.focus();
};

DocumentPropertiesModal._onHide = function () {
    Shortcut.reset();
};

DocumentPropertiesModal.hide = function () {
    DocumentPropertiesModal.modal.modal('hide');
    DocumentPropertiesModal.save_btn.unbind();
    DocumentPropertiesModal.clearInputs();
};

DocumentPropertiesModal.getInputs = function () {
    return {
        title: DocumentPropertiesModal.getTitle(),
        subtitle: DocumentPropertiesModal.getSubtitle(),
        author: DocumentPropertiesModal.getAuthor(),
        version: DocumentPropertiesModal.getVersion(),
        date: DocumentPropertiesModal.getDate(),
        copyright: DocumentPropertiesModal.getCopyright(),
        description: DocumentPropertiesModal.getDescription()
    }
};

DocumentPropertiesModal.setInputs = function (data) {
    DocumentPropertiesModal.setTitle(((data != null) ? data.title : ''));
    DocumentPropertiesModal.setSubtitle(((data != null) ? data.subtitle : ''));
    DocumentPropertiesModal.setAuthor(((data != null) ? data.author : ''));
    DocumentPropertiesModal.setVersion(((data != null) ? data.version : ''));
    DocumentPropertiesModal.setDate(((data != null) ? data.date : ''));
    DocumentPropertiesModal.setCopyright(((data != null) ? data.copyright : ''));
    DocumentPropertiesModal.setDescription(((data != null) ? data.description : ''));
};

DocumentPropertiesModal.clearInputs = function () {
    DocumentPropertiesModal.setTitle('');
    DocumentPropertiesModal.setSubtitle('');
    DocumentPropertiesModal.setAuthor('');
    DocumentPropertiesModal.setVersion('');
    DocumentPropertiesModal.setDate('');
    DocumentPropertiesModal.setCopyright('');
    DocumentPropertiesModal.setDescription('');
};

function PermissionSettingsModal() {}

PermissionSettingsModal.modal = $('#permissions-settings-modal');
PermissionSettingsModal.title = $('#permissions-settings-label');
PermissionSettingsModal.groupTheadTR = $('#permissions-settings-group-thread-tr');
PermissionSettingsModal.groupTbody = $('#permissions-settings-group-tbody');
PermissionSettingsModal.groupSearchInput = $('#permissions-settings-group-search');
PermissionSettingsModal.addGroupBtn = $('#permissions-settings-add-group');
PermissionSettingsModal.permTableHeader = $('#permissions-settings-permission-table-header');
PermissionSettingsModal.permTbody = $('#permissions-settings-perm-tbody');
PermissionSettingsModal.permThead = $('#permissions-settings-perm-thead');
PermissionSettingsModal.is_showing = false;
PermissionSettingsModal.initialized = false;
PermissionSettingsModal.artifact = null;
PermissionSettingsModal.operationList = null;
PermissionSettingsModal.groupAddedCB = null;
PermissionSettingsModal.permAddedCB = null;
PermissionSettingsModal.permRemoveCB = null;
PermissionSettingsModal.currentGroup = null;
PermissionSettingsModal.current_pers_table_group = null;

PermissionSettingsModal.green_checkmark = '<i class="fa fa-check" style="color:green"></i>';
PermissionSettingsModal.red_checkmark = '<i class="fa fa-check" style="color:red"></i>';
PermissionSettingsModal.green_deny = '<i class="fa fa-ban" style="color:green"></i>';
PermissionSettingsModal.red_deny = '<i class="fa fa-ban" style="color:red"></i>';
PermissionSettingsModal.inherited_green_checkmark = '<i class="fa fa-check" style="color:green; opacity:0.5"></i>';
PermissionSettingsModal.inherited_red_checkmark = '<i class="fa fa-check" style="color:red; opacity:0.5"></i>';
PermissionSettingsModal.inherited_green_deny = '<i class="fa fa-ban" style="color:green; opacity:0.5"></i>';
PermissionSettingsModal.inherited_red_deny = '<i class="fa fa-ban" style="color:red; opacity:0.5"></i>';

PermissionSettingsModal.show = function (title, artifact, groupAddedCB, groupRemoveCB,
                                         permAddedCB, permRemovedCB, editable) {
    PermissionSettingsModal.artifact = artifact;
    PermissionSettingsModal.operationList = artifact.getOperationList();
    PermissionSettingsModal.groupAddedCB = groupAddedCB;
    PermissionSettingsModal.groupRemoveCB = groupRemoveCB;
    PermissionSettingsModal.permAddedCB = permAddedCB;
    PermissionSettingsModal.permRemoveCB = permRemovedCB;
    PermissionSettingsModal.editable = editable;

    PermissionSettingsModal.title.html(title);

    Group.fetchAll(false);

    if (!PermissionSettingsModal.initialized) {
        PermissionSettingsModal.initialized = true;

        PermissionSettingsModal.groupSearchInput.typeahead({
                limit: 10
            }, {
                name: 'groups',
                displayKey: 'value',
                source: PermissionSettingsModal.typeaheadQueryMatch
            }
        );

        var currentSelectedGroup;
        PermissionSettingsModal.groupSearchInput.on('typeahead:selected', function(event, datum) {
            currentSelectedGroup = datum.group;
        });

        PermissionSettingsModal.addGroupBtn.click(function () {
            var inputValue = PermissionSettingsModal.groupSearchInput.val();
            if (!currentSelectedGroup || currentSelectedGroup.getName() != inputValue) {
                currentSelectedGroup = Group.getByName(inputValue);
            }

            if (!currentSelectedGroup) {
                Notify.alert('Please enter a valid group');
                return;
            }

            PermissionSettingsModal.groupAddedCB(currentSelectedGroup);
            PermissionSettingsModal.groupSearchInput.val('');
            PermissionSettingsModal.refresh();
            PermissionSettingsModal.buildPermissionTableTableBody(currentSelectedGroup);
        });

        // enable popovers
        $("a[data-toggle=popover]").popover();
    }

    if (editable) {
        PermissionSettingsModal.groupSearchInput.prop('disabled', false);
        PermissionSettingsModal.addGroupBtn.prop('disabled', false);
    } else {
        PermissionSettingsModal.groupSearchInput.prop('disabled', true);
        PermissionSettingsModal.addGroupBtn.prop('disabled', true);
    }

    PermissionSettingsModal.permTableHeader.html('');
    PermissionSettingsModal.permThead.addClass('hidden');
    PermissionSettingsModal.permTbody.empty();
    PermissionSettingsModal.current_pers_table_group = null;
    PermissionSettingsModal.refresh();

    PermissionSettingsModal.modal.on('shown.bs.modal', PermissionSettingsModal._onShow);
    PermissionSettingsModal.modal.on('hidden.bs.modal', PermissionSettingsModal._onHide);

    PermissionSettingsModal.modal.modal('show');
};

PermissionSettingsModal.addGroupBtnTrigger = function () {
    if (PermissionSettingsModal.groupSearchInput.is(':focus'))
        PermissionSettingsModal.addGroupBtn.click();
};

PermissionSettingsModal.typeaheadQueryMatch = function (q, cb) {
    var matches, substrRegex;
    matches = [];
    substrRegex = new RegExp(q, 'i');
    $.each(Group.getAll(), function (i, group) {
        if (substrRegex.test(group.getName())) {
            matches.push({ value: group.getName(), group: group});
        }
    });
    cb(matches);
};

PermissionSettingsModal.getArtifact = function () {
    return PermissionSettingsModal.artifact;
};

PermissionSettingsModal.refresh = function () {
    PermissionSettingsModal.buildGroupTableThead();
    PermissionSettingsModal.buildGroupTableTbody(
        PermissionSettingsModal.artifact.getInheritedPermissions(),
        PermissionSettingsModal.artifact.getPermissions().getPermissions());
    if (PermissionSettingsModal.current_pers_table_group) {
        PermissionSettingsModal.buildPermissionTableTableBody(
            PermissionSettingsModal.current_pers_table_group
        );
    }
};

PermissionSettingsModal.buildGroupTableThead = function () {
    // Clear the table
    PermissionSettingsModal.groupTheadTR.empty();

    PermissionSettingsModal.groupTheadTR.append($('<th></th>'));
    PermissionSettingsModal.groupTheadTR.append($('<th></th>'));
    PermissionSettingsModal.groupTheadTR.append($('<th>Group</th>'));
    var tb = $('<th></th>');
    for (var i = 0; i < PermissionSettingsModal.operationList.length; i++) {
        if (PermissionSettingsModal.operationList[i] == 'bookmark_read' ||
                PermissionSettingsModal.operationList[i] == 'bookmark_write')
            continue;
        tb.append(Permission.names[PermissionSettingsModal.operationList[i]]);
        PermissionSettingsModal.groupTheadTR.append(tb);
        tb = $('<th></th>');
    }
};

PermissionSettingsModal.buildGroupTableTbody = function (inherited_perms, perms) {
    // Clear the table
    PermissionSettingsModal.groupTbody.empty();

    var inherited_group_ids = Permission.getGroupIdsFromPermissions(inherited_perms);
    var perms_group_ids = Permission.getGroupIdsFromPermissions(perms);
    var group_ids = Util.union(inherited_group_ids, perms_group_ids);
    var op_list = PermissionSettingsModal.operationList;

    if (group_ids.length > 0) {
        var tr;
        var td;
        var group;
        var inherited;
        for (var i = 0; i < group_ids.length; i++) {
            tr = $('<tr></tr>');

            group = Group.get(group_ids[i]);
            inherited = perms_group_ids.indexOf(group.getId()) < 0;

            // If group is null, then the group is hidden to the user
            // Or is the user has permission to edit the settings
            if (group && PermissionSettingsModal.editable) {
                // Group deletion button
                if (inherited) {
                    tr.append($('<td></td>'));
                } else {
                    td = $('<td></td>');
                    td.data('group', group);
                    td.click(function (e) {
                        var grp = $(e.currentTarget).data('group');
                        if (PermissionSettingsModal.current_pers_table_group == grp)
                            PermissionSettingsModal.clearPermissionsTableBody();
                        PermissionSettingsModal.groupRemoveCB(grp);
                        PermissionSettingsModal.refresh();
                    });
                    td.append('<i class="fa fa-times"></i>');
                    tr.append(td);
                }

                // Group edit button
                td = $('<td></td>');
                td.data('group', group);
                if (inherited) {
                    tr.addClass('perms-modal-inherited-tr');
                    td.click(function (e) {
                        // We add the inhertied groups to the artifact on click
                        var grp = $(e.currentTarget).data('group');
                        PermissionSettingsModal.groupAddedCB(grp);
                        PermissionSettingsModal.refresh();
                        PermissionSettingsModal.buildPermissionTableTableBody(grp);
                    });
                } else {
                    td.click(function (e) {
                        PermissionSettingsModal.buildPermissionTableTableBody(
                            $(e.currentTarget).data('group'));
                    });
                }
                td.append('<i class="fa fa-pencil"></i>');
                tr.append(td);
            } else {
                // Hidden Groups do not have any buttons
                // Or user does not have permission to edit the settings
                tr.append($('<td></td>'));
                tr.append($('<td></td>'));
            }

            // Group name
            td = $('<td></td>');
            if (!group)
                td.append('Hidden Group');
            else
                td.append(group.getName());
            tr.append(td);

            // Group permission checkmarks
            for (var j = 0; j < op_list.length; j++) {
                if (op_list[j] == 'bookmark_read' || op_list[j] == 'bookmark_write')
                    continue;
                td = $('<td></td>');
                td.append(PermissionSettingsModal.getPermissionCheckmarks(
                    perms, inherited_perms, group, op_list[j]));
                tr.append(td);
            }

            PermissionSettingsModal.groupTbody.append(tr);
        }
    }

};

PermissionSettingsModal.getPermissionCheckmarks = function (perms, inherited_perms, group, operation) {
    var checkmark_html = '';

    var document_perm = Permission.getGroupPermission(perms, group, operation, false);
    var required_document_perm = Permission.getGroupPermission(perms, group, operation, true);
    var inherited_document_perm = Permission.getGroupPermission(inherited_perms, group, operation, false);
    var inherited_required_document_perm = Permission.getGroupPermission(inherited_perms, group, operation, true);

    if (document_perm == 'allow') {
        checkmark_html = checkmark_html.concat(PermissionSettingsModal.green_checkmark);
    } else if (document_perm == 'deny') {
        checkmark_html = checkmark_html.concat(PermissionSettingsModal.green_deny);
    } else {
        if (inherited_document_perm == 'allow') {
            checkmark_html = checkmark_html.concat(PermissionSettingsModal.inherited_green_checkmark);
        } else if (inherited_document_perm == 'deny') {
            checkmark_html = checkmark_html.concat(PermissionSettingsModal.inherited_green_deny);
        }
    }

    if (required_document_perm == 'allow') {
        checkmark_html = checkmark_html.concat(PermissionSettingsModal.red_checkmark);
    } else if (required_document_perm == 'deny') {
        checkmark_html = checkmark_html.concat(PermissionSettingsModal.red_deny);
    } else {
        if (inherited_required_document_perm == 'allow') {
            checkmark_html = checkmark_html.concat(PermissionSettingsModal.inherited_red_checkmark);
        } else if (inherited_required_document_perm == 'deny') {
            checkmark_html = checkmark_html.concat(PermissionSettingsModal.inherited_red_deny);
        }
    }

    return checkmark_html;
};

PermissionSettingsModal.clearPermissionsTableBody = function () {
    PermissionSettingsModal.permTbody.empty();
    PermissionSettingsModal.permThead.addClass('hidden');
    PermissionSettingsModal.permTableHeader.html('');
    PermissionSettingsModal.current_pers_table_group = null;
};

PermissionSettingsModal.buildPermissionTableTableBody = function (group) {
    PermissionSettingsModal.clearPermissionsTableBody();
    PermissionSettingsModal.current_pers_table_group = group;
    PermissionSettingsModal.currentGroup = group;
    PermissionSettingsModal.permTableHeader.html('Permissions for ' + group.getName());
    PermissionSettingsModal.permThead.removeClass('hidden');

    var op_list = PermissionSettingsModal.artifact.getOperationList();
    var perms = PermissionSettingsModal.artifact.getPermissions().getPermissions();

    var tr;
    var td;

    for (var i = 0; i < op_list.length; i++) {
        if (op_list[i] == 'bookmark_read' || op_list[i] == 'bookmark_write')
            continue;
        tr = $('<tr></tr>');

        td = $('<td></td>');
        td.append(Permission.names[op_list[i]]);
        tr.append(td);

        td = $('<td></td>');
        td.append(PermissionSettingsModal.getRadioButtons(perms, group, op_list[i], false));
        tr.append(td);

        td = $('<td></td>');
        td.append(PermissionSettingsModal.getRadioButtons(perms, group, op_list[i], true));
        tr.append(td);

        PermissionSettingsModal.permTbody.append(tr);
    }

};

PermissionSettingsModal.getRadioButtons = function (perms, group, operation, required) {
    var perm = Permission.getGroupPermission(perms, group, operation, required);

    var span = $('<span></span>');
    var label;

    function build_label (check_perm, name, default_check) {
        label = $('<label></label>');
        label.addClass('radio-inline');

        var input = $('<input></input>');
        if (required) {
            input.attr('type', 'checkbox');
        } else {
            input.attr('type', 'radio');
        }
        input.attr('name', 'radio_' + operation);

        input.click(function (e) {
            var checked = $(e.currentTarget).prop('checked');
            if (checked) {
                if (required)
                    PermissionSettingsModal.permAddedCB(group, operation,  'required', check_perm);
                else
                    PermissionSettingsModal.permAddedCB(group, operation,  'shared', check_perm);
            } else {
                if (required)
                    PermissionSettingsModal.permRemoveCB(group, operation,  'required');
                else
                    PermissionSettingsModal.permRemoveCB(group, operation,  'shared');
            }
            PermissionSettingsModal.refresh();
        });

        label.append(input);
        var checked = false;
        if (perm == check_perm || default_check) {
            checked = true;
            input.prop('checked', true);
        }

        label.append(name);

        span.append(label);
        return checked;
    }

    if (required) {
        build_label('allow', 'Required')
    } else {
        var checked = true;
        if (build_label('allow', 'Allow', false))
            checked = false;
        if (PermissionSettingsModal.artifact.canInherit()) {
            if (build_label('deny', 'Deny', false))
                checked = false;
        } else {
            if (build_label('deny', 'Deny', checked))
                checked = false;
        }
        if (PermissionSettingsModal.artifact.canInherit())
            build_label('inherit', 'Inherit', checked);
    }
    return span;
};

PermissionSettingsModal.isShowing = function () {
    return PermissionSettingsModal.is_showing
};

PermissionSettingsModal._onShow = function () {
    Shortcut.set('permissions_modal');
    PermissionSettingsModal.is_showing = true;
};

PermissionSettingsModal._onHide = function () {
    Shortcut.reset();
    PermissionSettingsModal.groupSearchInput.val('');
    PermissionSettingsModal.clearPermissionsTableBody();
    PermissionSettingsModal.is_showing = false;
};

PermissionSettingsModal.hide = function () {
    PermissionSettingsModal.modal.modal('hide');

};

function ProjectRestoreModal() {}

ProjectRestoreModal.modal = $('#project-restore-modal');
ProjectRestoreModal.form = $('#restore_project');
ProjectRestoreModal.restoring_message = $('#restoring-message');
ProjectRestoreModal.restored_message = $('#restored-message');
ProjectRestoreModal.close_btn = $('#project-restore-close-btn');
ProjectRestoreModal.open_btn = $('#project-restore-open-btn');
ProjectRestoreModal.file_input = $('.fileinput');

ProjectRestoreModal.show = function (saveCB) {

    ProjectRestoreModal.file_input.unbind();
    ProjectRestoreModal.file_input.change(function () {
        if (saveCB)
            saveCB(event.target.files[0]);
    });

    ProjectRestoreModal.hideOpenButton();
    ProjectRestoreModal.showCloseButton();
    ProjectRestoreModal.modal.on('shown.bs.modal', ProjectRestoreModal._onShow);
    ProjectRestoreModal.modal.on('hidden.bs.modal', ProjectRestoreModal._onHide);
    ProjectRestoreModal.modal.modal('show');
};

ProjectRestoreModal.hideForm = function () {
    ProjectRestoreModal.form.addClass('hidden');
};

ProjectRestoreModal.showForm = function () {
    ProjectRestoreModal.form.removeClass('hidden');
};

ProjectRestoreModal.hideRestoringMessage = function () {
    ProjectRestoreModal.restoring_message.addClass('hidden');
};

ProjectRestoreModal.showRestoringMessage = function () {
    ProjectRestoreModal.restoring_message.removeClass('hidden');
};

ProjectRestoreModal.hideRestoredMessage = function () {
    ProjectRestoreModal.restored_message.addClass('hidden');
    ProjectRestoreModal.open_btn.addClass('hidden');
};

ProjectRestoreModal.showRestoredMessage = function () {
    ProjectRestoreModal.restored_message.removeClass('hidden');
    ProjectRestoreModal.open_btn.removeClass('hidden');
};

ProjectRestoreModal.setProjectOpenCallback = function (cb) {
    ProjectRestoreModal.open_btn.unbind();
    ProjectRestoreModal.open_btn.click(function (e) {
        cb();
        e.stopPropagation();
        return false;
    });
};

ProjectRestoreModal.showCloseButton = function () {
    ProjectRestoreModal.close_btn.removeClass('hidden');
};

ProjectRestoreModal.hideCloseButton = function () {
    ProjectRestoreModal.close_btn.addClass('hidden');
};

ProjectRestoreModal.showOpenButton = function () {
    ProjectRestoreModal.open_btn.removeClass('hidden');
};

ProjectRestoreModal.hideOpenButton = function () {
    ProjectRestoreModal.open_btn.addClass('hidden');
};

ProjectRestoreModal.open = function () {
    ProjectRestoreModal.open_btn.click();
};

ProjectRestoreModal._onShow = function () {
    Shortcut.set('restore_project_modal');
};

ProjectRestoreModal._onHide = function () {
    ProjectRestoreModal.hideOpenButton();
    ProjectRestoreModal.showCloseButton();
    Shortcut.reset();
    ProjectRestoreModal.file_input.unbind();
    ProjectRestoreModal.showForm();
    ProjectRestoreModal.hideRestoringMessage();
    ProjectRestoreModal.hideRestoredMessage();
    ProjectRestoreModal.open_btn.unbind();
};

ProjectRestoreModal.hide = function () {
    ProjectRestoreModal.modal.modal('hide');
};

function ProjectCreateModal() {}

ProjectCreateModal.modal = $('#project-create-modal');
ProjectCreateModal.title_input = $('#project-create-title-input');
ProjectCreateModal.create_btn = $('#project-create-create-btn');

ProjectCreateModal.show = function (createCB) {
    ProjectCreateModal.create_btn.unbind();
    ProjectCreateModal.create_btn.click(function () {
        var title = ProjectCreateModal.title_input.val();
        if (title.trim() != '') {
            if (createCB)
                createCB(title);
        }
    });

    ProjectCreateModal.modal.on('shown.bs.modal', ProjectCreateModal._onShow);
    ProjectCreateModal.modal.on('hidden.bs.modal', ProjectCreateModal._onHide);
    ProjectCreateModal.modal.modal('show');
};

ProjectCreateModal.create = function () {
    ProjectCreateModal.create_btn.click();
};

ProjectCreateModal._onShow = function () {
    Shortcut.set('create_project_modal');
    ProjectCreateModal.title_input.focus();
};

ProjectCreateModal._onHide = function () {
    Shortcut.reset();
    ProjectCreateModal.title_input.val('');
    ProjectCreateModal.create_btn.unbind();
};

ProjectCreateModal.hide = function () {
    ProjectCreateModal.modal.modal('hide');
};

function ProjectPropertiesModal() {}

ProjectPropertiesModal.modal = $('#project-properties-modal');
ProjectPropertiesModal.title_input = $('#project-properties-title-input');
ProjectPropertiesModal.save_btn = $('#project-properties-btn');

ProjectPropertiesModal.show = function (createCB, title) {
    ProjectPropertiesModal.title_input.val(title);

    ProjectPropertiesModal.save_btn.unbind();
    ProjectPropertiesModal.save_btn.click(function () {
        var title = ProjectPropertiesModal.title_input.val();
        if (title.trim() != '') {
            if (createCB)
                createCB(title);
        }
    });

    ProjectPropertiesModal.modal.on('shown.bs.modal', ProjectPropertiesModal._onShow);
    ProjectPropertiesModal.modal.on('hidden.bs.modal', ProjectPropertiesModal._onHide);
    ProjectPropertiesModal.modal.modal('show');
};

ProjectPropertiesModal.save = function () {
    ProjectPropertiesModal.save_btn.click();
};

ProjectPropertiesModal._onShow = function () {
    Shortcut.set('project_properties_modal');
    ProjectPropertiesModal.title_input.focus();
};

ProjectPropertiesModal._onHide = function () {
    Shortcut.reset();
    ProjectPropertiesModal.title_input.val('');
    ProjectPropertiesModal.save_btn.unbind();
};

ProjectPropertiesModal.hide = function () {
    ProjectPropertiesModal.modal.modal('hide');
};

function ProjectImportModal() {}

ProjectImportModal.modal = $('#project-import-modal');
ProjectImportModal.url_input = $('#project-import-url');
ProjectImportModal.file_input = $('.fileinput');
ProjectImportModal.import_btn = $('#project-import-btn');
ProjectImportModal.open_btn = $('#project-open-btn');
ProjectImportModal.open_btn_visable = false;
ProjectImportModal.form = $('#project-import-form');
ProjectImportModal.status = $('#project-import-status');
ProjectImportModal.progress_bar = $('#project-import-progress-bar');
ProjectImportModal.error_message = $('#project-import-error-message');
ProjectImportModal.success_message = $('#project-import-success-message');
ProjectImportModal.is_showen = false;
ProjectImportModal.hide_callback = null;

ProjectImportModal.show = function (urlCB, fileCB) {

    ProjectImportModal.import_btn.unbind();
    ProjectImportModal.open_btn.unbind();

    ProjectImportModal.import_btn.click(function () {
        var url = ProjectImportModal.url_input.val();
        if (url.trim() != '')
            if (urlCB)
                urlCB(url);
        return false;
    });

    ProjectRestoreModal.file_input.change(function (event) {
        if (fileCB)
            fileCB(event.target.files[0]);
        return false;
    });

    // Make sure everything has been reset
    ProjectImportModal.showForm();
    ProjectImportModal.hideStatus();
    ProjectImportModal.hideErrorMessage();
    ProjectImportModal.hideSuccessMessage();
    ProjectImportModal.setProgressBar(2);
    ProjectImportModal.hideOpenButton();
    ProjectImportModal.showImportButton();

    ProjectImportModal.modal.on('shown.bs.modal', ProjectImportModal._onShow);
    ProjectImportModal.modal.on('hidden.bs.modal', ProjectImportModal._onHide);

    ProjectImportModal.modal.modal('show');
};

ProjectImportModal.create = function () {
    ProjectImportModal.import_btn.click();
};

ProjectImportModal.open = function () {
    if (ProjectImportModal.open_btn_visable)
        ProjectImportModal.open_btn.click();
};

ProjectImportModal.showImportButton = function () {
    ProjectImportModal.import_btn.removeClass('hidden');
};

ProjectImportModal.hideImportButton = function () {
    ProjectImportModal.import_btn.addClass('hidden');
};

ProjectImportModal.showOpenButton = function () {
    Shortcut.set('imported_project_modal');
    ProjectImportModal.open_btn_visable = true;
    ProjectImportModal.open_btn.removeClass('hidden');
};

ProjectImportModal.hideOpenButton = function () {
    ProjectImportModal.open_btn_visable = false;
    ProjectImportModal.open_btn.addClass('hidden');
};

ProjectImportModal.setOpenButtonCallback = function (cb) {
    ProjectImportModal.open_btn.unbind();
    ProjectImportModal.open_btn.click(function () {
        if (cb)
            cb();
        return false;
    });
} ;

ProjectImportModal.hideForm = function () {
    ProjectImportModal.form.addClass('hidden');
};

ProjectImportModal.showForm = function () {
    ProjectImportModal.form.removeClass('hidden');
};

ProjectImportModal.hideStatus = function () {
    ProjectImportModal.status.addClass('hidden');
};

ProjectImportModal.showStatus = function () {
    ProjectImportModal.status.removeClass('hidden');
};

ProjectImportModal.showErrorMessage = function (msg) {
    ProjectImportModal.error_message.empty();
    ProjectImportModal.error_message.append(msg);
    ProjectImportModal.error_message.removeClass('hidden');
};

ProjectImportModal.hideErrorMessage = function () {
    ProjectImportModal.error_message.addClass('hidden');
};

ProjectImportModal.showSuccessMessage = function (msg) {
    ProjectImportModal.success_message.empty();
    ProjectImportModal.success_message.append(msg);
    ProjectImportModal.success_message.removeClass('hidden');
};

ProjectImportModal.hideSuccessMessage = function () {
    ProjectImportModal.success_message.addClass('hidden');
};

ProjectImportModal.setProgressBar = function (width) {
    console.debug('Status Bar: %s', width);
    ProjectImportModal.progress_bar.css('width', width + '%');
};

ProjectImportModal.isShown = function () {
    return ProjectImportModal.is_showen;
};

ProjectImportModal._onShow = function () {
    Shortcut.set('import_project_modal');
    ProjectImportModal.is_showen = true;
    ProjectImportModal.url_input.focus();
};

ProjectImportModal.setHiddenCallback = function (cb) {
    ProjectImportModal.hide_callback = cb;
};

ProjectImportModal._onHide = function () {
    Shortcut.reset();
    ProjectImportModal.is_showen = false;
    ProjectImportModal.url_input.val('');
    ProjectImportModal.import_btn.unbind();

    if (ProjectImportModal.hide_callback)
        ProjectImportModal.hide_callback();
    ProjectImportModal.hide_callback = null;
};

ProjectImportModal.hide = function () {
    ProjectImportModal.modal.modal('hide');
};

function ConceptShareURLModal() {}

ConceptShareURLModal.modal = $('#concept-share-url-modal');
ConceptShareURLModal.url_input = $('#concept-share-url-url');
ConceptShareURLModal.navigation_checkbox = $('#concept-share-url-navigation');
ConceptShareURLModal.limit_checkbox = $('#concept-share-url-limit-depth');
ConceptShareURLModal.depth_selector = $('#concept-share-url-depth');
ConceptShareURLModal.copy_btn = $('#concept-share-url-copy-btn');
ConceptShareURLModal.clip_client = null;

ConceptShareURLModal.show = function (concept) {
    var nav = null;
    var depth = null;
    var limit = null;

    var url = concept.getSharedURL(nav, depth, limit);
    ConceptShareURLModal.url_input.val(url);
    ConceptShareURLModal.copy_btn.attr('data-clipboard-text', url);

    ConceptShareURLModal.navigation_checkbox.click(function (e) {
        nav = $(e.currentTarget).is(':checked');
        var url = concept.getSharedURL(nav, depth, limit);
        ConceptShareURLModal.url_input.val(url);
        ConceptShareURLModal.copy_btn.attr('data-clipboard-text', url);
    });

    ConceptShareURLModal.limit_checkbox.click(function (e) {
        limit = $(e.currentTarget).is(':checked');
        var url = concept.getSharedURL(nav, depth, limit);
        ConceptShareURLModal.url_input.val(url);
        ConceptShareURLModal.copy_btn.attr('data-clipboard-text', url);
    });

    ConceptShareURLModal.depth_selector.change(function (e) {
        depth = $(this).val();
        var url = concept.getSharedURL(nav, depth, limit);
        ConceptShareURLModal.url_input.val(url);
        ConceptShareURLModal.copy_btn.attr('data-clipboard-text', url);
    });

    ConceptShareURLModal.modal.on('shown.bs.modal', ConceptShareURLModal._onShow);
    ConceptShareURLModal.modal.on('hidden.bs.modal', ConceptShareURLModal._onHide);

    ConceptShareURLModal.modal.modal('show');

    // Analytics
    comms.post({url: ARTIFACT_URLS.concept + concept.getRequestId(), data: {shared: true}});
};

ConceptShareURLModal._onShow = function () {
    Shortcut.pause();
    if (!ConceptShareURLModal.clip_client) {
        ConceptShareURLModal.clip_client = new ZeroClipboard(document.getElementById("concept-share-url-copy-btn"));
        ConceptShareURLModal.clip_client.on('ready', function (readyEvent) {
            ConceptShareURLModal.clip_client.on('aftercopy', function (event) {
                Notify.alert('Share URL Copied to Clipboard.');
            });
        });
    }
};

ConceptShareURLModal._onHide = function () {
    Shortcut.unpause();
};

ConceptShareURLModal.hide = function () {
    ConceptShareURLModal.modal.modal('hide');
};

function DocumentShareURLModal() {}

DocumentShareURLModal.modal = $('#document-share-url-modal');
DocumentShareURLModal.url_input = $('#document-share-url-url');
DocumentShareURLModal.navigation_checkbox = $('#document-share-url-navigation');
DocumentShareURLModal.copy_btn = $('#document-share-url-copy-btn');

DocumentShareURLModal.show = function (documment) {
    var nav = true;

    var url = documment.getSharedURL(nav);
    DocumentShareURLModal.url_input.val(url);
    DocumentShareURLModal.copy_btn.attr('data-clipboard-text', url);

    DocumentShareURLModal.navigation_checkbox.click(function (e) {
        nav = $(e.currentTarget).is(':checked');
        var url = documment.getSharedURL(nav);
        DocumentShareURLModal.url_input.val(url);
        DocumentShareURLModal.copy_btn.attr('data-clipboard-text', url);
    });

    DocumentShareURLModal.modal.on('shown.bs.modal', DocumentShareURLModal._onShow);
    DocumentShareURLModal.modal.on('hidden.bs.modal', DocumentShareURLModal._onHide);

    DocumentShareURLModal.modal.modal('show');

    // Analytics
    comms.post({url: ARTIFACT_URLS.document + documment.getRequestId(), data: {shared: true}});
};

DocumentShareURLModal._onShow = function () {
    Shortcut.pause();
    if (!DocumentShareURLModal.clip_client) {
        DocumentShareURLModal.clip_client = new ZeroClipboard(document.getElementById("document-share-url-copy-btn"));
        DocumentShareURLModal.clip_client.on('ready', function (readyEvent) {
            DocumentShareURLModal.clip_client.on('aftercopy', function (event) {
                Notify.alert('Share URL Copied to Clipboard.');
            });
        });
    }
};

DocumentShareURLModal._onHide = function () {
    Shortcut.unpause();
};

DocumentShareURLModal.hide = function () {
    DocumentShareURLModal.modal.modal('hide');
};

function DocumentPublishModal() {
}

DocumentPublishModal.modal = $('#publish-modal');
DocumentPublishModal.publish_world_btn = $('#publish-world');
DocumentPublishModal.publish_org_btn = $('#publish-org');
DocumentPublishModal.publish_btn = $('#publish-btn');
DocumentPublishModal.groupSearchInput = $('#publish-group-search');
DocumentPublishModal.addGroupBtn = $('#publish-add-group');
DocumentPublishModal.version_input = $('#publish-version');
DocumentPublishModal.publish_tboby = $('#publish-tbody');
DocumentPublishModal.publish_table = $('#publish-table');
DocumentPublishModal.warning_msg = $('#publish-warning-message');
DocumentPublishModal.initialized = false;
DocumentPublishModal.document = null;
DocumentPublishModal.showing = false;

DocumentPublishModal.show = function (document, cb) {
    DocumentPublishModal.document = document;

    if (!DocumentPublishModal.initialized) {
        DocumentPublishModal.initialized = true;

        DocumentPublishModal.groupSearchInput.typeahead({
                limit: 10
            }, {
                name: 'groups',
                displayKey: 'value',
                source: DocumentPublishModal.typeaheadQueryMatch
            }
        );

        var currentSelectedGroup;
        DocumentPublishModal.groupSearchInput.on('typeahead:selected', function (event, datum) {
            currentSelectedGroup = datum.group;
        });

        DocumentPublishModal.publish_btn.click(function () {
            var inputValue = DocumentPublishModal.groupSearchInput.val();
            if (!currentSelectedGroup || currentSelectedGroup.getName() != inputValue) {
                currentSelectedGroup = Group.getByName(inputValue);
            }

            if (!currentSelectedGroup) {
                Notify.alert('Please enter a valid group');
                return false;
            }

            DocumentPublishModal.publish(currentSelectedGroup.getId());
            return false;
        });

        var user = User.getCurrent();
        var org = user.getOrganization();
        if (org) {
            DocumentPublishModal.publish_org_btn.removeClass('hidden');
            DocumentPublishModal.publish_org_btn.html(org);
            DocumentPublishModal.publish_org_btn.click(function () {
                DocumentPublishModal.groupSearchInput.val(Group.getByName(org).getName());
                return false;
            });
        }

        DocumentPublishModal.publish_world_btn.click(function () {
            DocumentPublishModal.groupSearchInput.val('World Share');
            return false;
        });

        // enable popovers
        $("a[data-toggle=popover]").popover();

        DocumentPublishModal.modal.on('shown.bs.modal', DocumentPublishModal._onShow);
        DocumentPublishModal.modal.on('hidden.bs.modal', DocumentPublishModal._onHide);
    }

    DocumentPublishModal.load_table();


    DocumentPublishModal.modal.modal('show');
};

DocumentPublishModal.load_table = function () {
    DocumentPublishModal.publish_tboby.empty();
    var pubs = DocumentPublishModal.document.getPublished();
    pubs.sort(function (a, b) {return b.version_int - a.version_int});
    if (pubs.length > 0)
        DocumentPublishModal.publish_table.removeClass('hidden');
    else
        DocumentPublishModal.publish_table.addClass('hidden');
    for (var i = 0; i < pubs.length; i++) {
        var group = Group.get(pubs[i].group);
        var tr = $('<tr></tr>');

        var td = $('<td></td>');
        var link_btn = $('<a></a>');
        link_btn.addClass('btn btn-default btn-sm');
        var url = '/p/' + DocumentPublishModal.document.getId() + '/' + group.getId() + '/?v=' + pubs[i].version;
        link_btn.attr('href', url);
        link_btn.attr('target', '_blank');
        link_btn.append('<i class="fa fa-link"></i>');
        td.append(link_btn);

        var delete_btn = $('<button></button>');
        delete_btn.attr('id', pubs[i].id);
        delete_btn.data('pub', pubs[i]);
        delete_btn.addClass('btn btn-default btn-sm');
        delete_btn.append('<i class="fa fa-times"></i>');

        delete_btn.click(function () {
            var self = this;
            comms.delete({
                url: '/document/publish/' + $(self).attr('id'),
                success: function () {
                    DocumentPublishModal.document.removePublished($(self).data('pub'));
                    if (pubs.length == 0)
                        DocumentPublishModal.publish_table.addClass('hidden');
                    DocumentPublishModal.load_table();
                }
            });

        });

        td.append(delete_btn);
        tr.append(td);

        td = $('<td></td>');
        td.append(group.getName());
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].version);
        tr.append(td);

        td = $('<td></td>');
        td.append(new Date(pubs[i].created_ts).toLocaleString());
        tr.append(td);
        DocumentPublishModal.publish_tboby.append(tr);
    }
};

DocumentPublishModal.publish = function (group) {
    var version = DocumentPublishModal.version_input.val();
    DocumentPublishModal.version_input.val('');
    DocumentPublishModal.warning_msg.addClass('hidden');

    var tr = $('<tr></tr>');
    var td = $('<td></td>');
    td.attr('colspan', 4);
    td.append('<i class="fa fa-flash color-pulse"></i> <strong>Document is being rendered for publication</strong> <span id="presentation-progress" class="color-pulse">Please wait... <i class="fa fa-spinner fa-spin"></i></span>');
    tr.append(td);
    DocumentPublishModal.publish_tboby.prepend(tr);
    DocumentPublishModal.publish_table.removeClass('hidden');

    function finished (data) {
        if (data == '400-1') {
            DocumentPublishModal.warning_msg.html('Group does not have permission to read this document');
            DocumentPublishModal.warning_msg.removeClass('hidden');
            DocumentPublishModal.load_table();
        } else if (data == '400-2') {
            DocumentPublishModal.warning_msg.html('Version Already Taken');
            DocumentPublishModal.warning_msg.removeClass('hidden');
            DocumentPublishModal.load_table();
        } else if (data == '400-3') {
            DocumentPublishModal.warning_msg.html('Invalid Version Name');
            DocumentPublishModal.warning_msg.removeClass('hidden');
            DocumentPublishModal.load_table();
        } else {
            console.log(data);
            DocumentPublishModal.document.addPublished(data);
            DocumentPublishModal.load_table();
        }
    }

    if (version.trim() == '' || version == null)
        DocumentEventListener.publish(DocumentPublishModal.document, group, null, finished);
    else
        DocumentEventListener.publish(DocumentPublishModal.document, group, version, finished);

};

DocumentPublishModal.typeaheadQueryMatch = function (q, cb) {
    var matches, substrRegex;
    matches = [];
    substrRegex = new RegExp(q, 'i');
    $.each(Group.getAll(), function (i, group) {
        if (substrRegex.test(group.getName())) {
            matches.push({value: group.getName(), group: group});
        }
    });
    cb(matches);
};

DocumentPublishModal._onShow = function () {
    Shortcut.pause();
    DocumentPublishModal.showing = true;
    DocumentPublishModal.version_input.val('');
};

DocumentPublishModal._onHide = function () {
    Shortcut.unpause();
    DocumentPublishModal.showing = false;
    DocumentPublishModal.publish_tboby.empty();
    DocumentPublishModal.version_input.val('');
    DocumentPublishModal.warning_msg.addClass('hidden');
    DocumentPublishModal.groupSearchInput.val('');
};

DocumentPublishModal.hide = function () {
    DocumentPublishModal.modal.modal('hide');
};

function SummaryPublishModal() {
}

SummaryPublishModal.modal = $('#summary-publish-modal');
SummaryPublishModal.publish_world_btn = $('#summary-publish-world');
SummaryPublishModal.publish_org_btn = $('#summary-publish-org');
SummaryPublishModal.groupSearchInput = $('#summary-publish-group-search');
SummaryPublishModal.addGroupBtn = $('#summary-publish-add-group');
SummaryPublishModal.version_input = $('#summary-publish-version');
SummaryPublishModal.word_count_input = $('#summary-publish-word-count');
SummaryPublishModal.publish_tboby = $('#summary-publish-tbody');
SummaryPublishModal.publish_table = $('#summary-publish-table');
SummaryPublishModal.publish_btn = $('#sum-publish-btn');
SummaryPublishModal.warning_msg = $('#summary-publish-warning-message');
SummaryPublishModal.initialized = false;
SummaryPublishModal.document = null;
SummaryPublishModal.showing = false;

SummaryPublishModal.show = function (document, cb) {
    SummaryPublishModal.document = document;

    if (!SummaryPublishModal.initialized) {
        SummaryPublishModal.initialized = true;

        SummaryPublishModal.groupSearchInput.typeahead({
                limit: 10
            }, {
                name: 'groups',
                displayKey: 'value',
                source: SummaryPublishModal.typeaheadQueryMatch
            }
        );

        var currentSelectedGroup;
        SummaryPublishModal.groupSearchInput.on('typeahead:selected', function (event, datum) {
            currentSelectedGroup = datum.group;
        });

        SummaryPublishModal.publish_btn.click(function () {
            var inputValue = SummaryPublishModal.groupSearchInput.val();
            if (!currentSelectedGroup || currentSelectedGroup.getName() != inputValue) {
                currentSelectedGroup = Group.getByName(inputValue);
            }

            if (!currentSelectedGroup) {
                Notify.alert('Please enter a valid group');
                return false;
            }

            SummaryPublishModal.publish(currentSelectedGroup.getId());
            return false;
        });

        var user = User.getCurrent();
        var org = user.getOrganization();
        if (org) {
            SummaryPublishModal.publish_org_btn.removeClass('hidden');
            SummaryPublishModal.publish_org_btn.html(org);
            SummaryPublishModal.publish_org_btn.click(function () {
                SummaryPublishModal.groupSearchInput.val(Group.getByName(org).getName());
                return false;
            });
        }

        SummaryPublishModal.publish_world_btn.click(function () {
            SummaryPublishModal.groupSearchInput.val('World Share');
            return false;
        });

        // enable popovers
        $("a[data-toggle=popover]").popover();
    }

    SummaryPublishModal.load_table();

    SummaryPublishModal.modal.on('shown.bs.modal', SummaryPublishModal._onShow);
    SummaryPublishModal.modal.on('hidden.bs.modal', SummaryPublishModal._onHide);
    SummaryPublishModal.modal.modal('show');
};

SummaryPublishModal.load_table = function () {
    SummaryPublishModal.publish_tboby.empty();
    var pubs = SummaryPublishModal.document.getSummaryPublished();
    pubs.sort(function (a, b) {return b.version_int - a.version_int});
    if (pubs.length > 0)
        SummaryPublishModal.publish_table.removeClass('hidden');
    else
        SummaryPublishModal.publish_table.addClass('hidden');
    for (var i = 0; i < pubs.length; i++) {
        var group = Group.get(pubs[i].group);
        var tr = $('<tr></tr>');

        var td = $('<td></td>');
        var link_btn = $('<a></a>');
        link_btn.addClass('btn btn-default btn-sm');
        var url = '/p/s/' + SummaryPublishModal.document.getId() + '/' + group.getId() + '/?v=' + pubs[i].version;
        link_btn.attr('href', url);
        link_btn.attr('target', '_blank');
        link_btn.append('<i class="fa fa-link"></i>');
        td.append(link_btn);

        var delete_btn = $('<button></button>');
        delete_btn.attr('id', pubs[i].id);
        delete_btn.data('pub', pubs[i]);
        delete_btn.addClass('btn btn-default btn-sm');
        delete_btn.append('<i class="fa fa-times"></i>');

        delete_btn.click(function () {
            var self = this;
            comms.delete({
                url: '/summary/publish/' + $(self).attr('id'),
                success: function () {
                    SummaryPublishModal.document.removeSummaryPublished($(self).data('pub'));
                    if (pubs.length == 0)
                        SummaryPublishModal.publish_table.addClass('hidden');
                    SummaryPublishModal.load_table();
                }
            })
        });
        td.append(delete_btn);
        tr.append(td);

        td = $('<td></td>');
        td.append(group.getName());
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].version);
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].word_count);
        tr.append(td);

        td = $('<td></td>');
        td.append(new Date(pubs[i].created_ts).toLocaleString());
        tr.append(td);
        SummaryPublishModal.publish_tboby.append(tr);
    }
};

SummaryPublishModal.publish = function (group) {
    var version = SummaryPublishModal.version_input.val();
    SummaryPublishModal.version_input.val('');
    var sum_doc = SummaryPublishModal.document.getSummaryDocument();
    var word_count = sum_doc.getWordCount();
    SummaryPublishModal.warning_msg.addClass('hidden');

    var tr = $('<tr></tr>');
    var td = $('<td></td>');
    td.attr('colspan', 4);
    td.append('<i class="fa fa-flash color-pulse"></i> <strong>Summary is being rendered for publication</strong> <span id="presentation-progress" class="color-pulse">Please wait... <i class="fa fa-spinner fa-spin"></i></span>');
    tr.append(td);
    SummaryPublishModal.publish_tboby.prepend(tr);
    SummaryPublishModal.publish_table.removeClass('hidden');

    function finished (data) {
        if (data == '400-1') {
            SummaryPublishModal.warning_msg.html('Group does not have permission to read this document');
            SummaryPublishModal.warning_msg.removeClass('hidden');
            SummaryPublishModal.load_table();
        } else if (data == '400-2') {
            SummaryPublishModal.warning_msg.html('Version Already Taken');
            SummaryPublishModal.warning_msg.removeClass('hidden');
            SummaryPublishModal.load_table();
        } else if (data == '400-3') {
            SummaryPublishModal.warning_msg.html('Invalid Version Name');
            SummaryPublishModal.warning_msg.removeClass('hidden');
            SummaryPublishModal.load_table();
        } else {
            console.log(data);
            SummaryPublishModal.document.addSummaryPublished(data);
            SummaryPublishModal.load_table();
        }
    }

    if (version.trim() == '')
        DocumentEventListener.sumPublish(SummaryPublishModal.document, group, null, word_count, finished);
    else
        DocumentEventListener.sumPublish(SummaryPublishModal.document, group, version, word_count, finished);
};

SummaryPublishModal.typeaheadQueryMatch = function (q, cb) {
    var matches, substrRegex;
    matches = [];
    substrRegex = new RegExp(q, 'i');
    $.each(Group.getAll(), function (i, group) {
        if (substrRegex.test(group.getName())) {
            matches.push({value: group.getName(), group: group});
        }
    });
    cb(matches);
};

SummaryPublishModal._onShow = function () {
    Shortcut.pause();
    SummaryPublishModal.showing = true;
};

SummaryPublishModal._onHide = function () {
    Shortcut.unpause();
    SummaryPublishModal.showing = false;
    SummaryPublishModal.publish_tboby.empty();
    SummaryPublishModal.warning_msg.addClass('hidden');
    SummaryPublishModal.groupSearchInput.val('');
};

SummaryPublishModal.hide = function () {
    SummaryPublishModal.modal.modal('hide');
};

function PresentationPublishModal() {
}

PresentationPublishModal.modal = $('#presentation-publish-modal');
PresentationPublishModal.publish_world_btn = $('#presentation-publish-world');
PresentationPublishModal.publish_org_btn = $('#presentation-publish-org');
PresentationPublishModal.publish_btn = $('#presentation-publish-btn');
PresentationPublishModal.groupSearchInput = $('#presentation-publish-group-search');
PresentationPublishModal.addGroupBtn = $('#presentation-publish-add-group');
PresentationPublishModal.version_input = $('#presentation-publish-version');
PresentationPublishModal.slide_count_input = $('#presentation-publish-slide-count');
PresentationPublishModal.min_bullet_input = $('#presentation-publish-min-bullet');
PresentationPublishModal.max_bullet_input = $('#presentation-publish-max-bullet');
PresentationPublishModal.publish_tboby = $('#presentation-publish-tbody');
PresentationPublishModal.publish_table = $('#presentation-publish-table');
PresentationPublishModal.warning_msg = $('#presentation-publish-warning-message');
PresentationPublishModal.initialized = false;
PresentationPublishModal.document = null;
PresentationPublishModal.showing = false;

PresentationPublishModal.show = function (document, cb) {
    PresentationPublishModal.document = document;

    if (!PresentationPublishModal.initialized) {
        PresentationPublishModal.initialized = true;

        PresentationPublishModal.groupSearchInput.typeahead({
                limit: 10
            }, {
                name: 'groups',
                displayKey: 'value',
                source: PresentationPublishModal.typeaheadQueryMatch
            }
        );

        var currentSelectedGroup;
        PresentationPublishModal.groupSearchInput.on('typeahead:selected', function (event, datum) {
            currentSelectedGroup = datum.group;
        });

        PresentationPublishModal.publish_btn.click(function () {
            var inputValue = PresentationPublishModal.groupSearchInput.val();
            if (!currentSelectedGroup || currentSelectedGroup.getName() != inputValue) {
                currentSelectedGroup = Group.getByName(inputValue);
            }

            if (!currentSelectedGroup) {
                Notify.alert('Please enter a valid group');
                return false;
            }

            PresentationPublishModal.publish(currentSelectedGroup.getId());
            return false;
        });

        var user = User.getCurrent();
        var org = user.getOrganization();
        if (org) {
            PresentationPublishModal.publish_org_btn.removeClass('hidden');
            PresentationPublishModal.publish_org_btn.html(org);
            PresentationPublishModal.publish_org_btn.click(function () {
                PresentationPublishModal.groupSearchInput.val(Group.getByName(org).getName());
                return false;
            });
        }

        PresentationPublishModal.publish_world_btn.click(function () {
            PresentationPublishModal.groupSearchInput.val('World Share');
            return false;
        });

        // enable popovers
        $("a[data-toggle=popover]").popover();
    }

    PresentationPublishModal.load_table();

    PresentationPublishModal.modal.on('shown.bs.modal', PresentationPublishModal._onShow);
    PresentationPublishModal.modal.on('hidden.bs.modal', PresentationPublishModal._onHide);
    PresentationPublishModal.modal.modal('show');
};

PresentationPublishModal.load_table = function () {
    PresentationPublishModal.publish_tboby.empty();
    var pubs = PresentationPublishModal.document.getPresentationPublished();
    pubs.sort(function (a, b) {return b.version_int - a.version_int});
    if (pubs.length > 0)
        PresentationPublishModal.publish_table.removeClass('hidden');
    else
        PresentationPublishModal.publish_table.addClass('hidden');
    for (var i = 0; i < pubs.length; i++) {
        var group = Group.get(pubs[i].group);
        var tr = $('<tr></tr>');

        var td = $('<td></td>');
        var link_btn = $('<a></a>');
        link_btn.addClass('btn btn-default btn-sm');
        var url = '/p/p/' + PresentationPublishModal.document.getId() + '/' + group.getId() + '/?v=' + pubs[i].version;
        link_btn.attr('href', url);
        link_btn.attr('target', '_blank');
        link_btn.append('<i class="fa fa-link"></i>');
        td.append(link_btn);

        var delete_btn = $('<button></button>');
        delete_btn.attr('id', pubs[i].id);
        delete_btn.data('pub', pubs[i]);
        delete_btn.addClass('btn btn-default btn-sm');
        delete_btn.append('<i class="fa fa-times"></i>');

        delete_btn.click(function () {
            var self = this;
            comms.delete({
                url: '/presentation/publish/' + $(self).attr('id'),
                success: function () {
                    PresentationPublishModal.document.removePresentationPublished($(self).data('pub'));
                    if (pubs.length == 0)
                        PresentationPublishModal.publish_table.addClass('hidden');
                    PresentationPublishModal.load_table();
                }
            })
        });
        td.append(delete_btn);
        tr.append(td);

        td = $('<td></td>');
        td.append(group.getName());
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].version);
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].slide_count);
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].min_bullet);
        tr.append(td);

        td = $('<td></td>');
        td.append(pubs[i].max_bullet);
        tr.append(td);

        td = $('<td></td>');
        td.append(new Date(pubs[i].created_ts).toLocaleString());
        tr.append(td);
        PresentationPublishModal.publish_tboby.append(tr);
    }
};

PresentationPublishModal.publish = function (group) {
    var version = PresentationPublishModal.version_input.val();
    var pre_doc = PresentationPublishModal.document.getPresentationDocument();
    PresentationPublishModal.version_input.val('');
    var slide_count = pre_doc.getSlideCount();
    var min_bullet = pre_doc.min_bullet;
    var max_bullet = pre_doc.max_bullet;
    PresentationPublishModal.warning_msg.addClass('hidden');

    var tr = $('<tr></tr>');
    var td = $('<td></td>');
    td.attr('colspan', 4);
    td.append('<i class="fa fa-flash color-pulse"></i> <strong>Presentation is being rendered for publication</strong> <span id="presentation-progress" class="color-pulse">Please wait... <i class="fa fa-spinner fa-spin"></i></span>');
    tr.append(td);
    PresentationPublishModal.publish_tboby.prepend(tr);
    PresentationPublishModal.publish_table.removeClass('hidden');

    function finished (data) {
        if (data == '400-1') {
            PresentationPublishModal.warning_msg.html('Group does not have permission to read this document');
            PresentationPublishModal.warning_msg.removeClass('hidden');
            PresentationPublishModal.load_table();
        } else if (data == '400-2') {
            PresentationPublishModal.warning_msg.html('Version Already Taken');
            PresentationPublishModal.warning_msg.removeClass('hidden');
            PresentationPublishModal.load_table();
        } else if (data == '400-3') {
            PresentationPublishModal.warning_msg.html('Invalid Version Name');
            PresentationPublishModal.warning_msg.removeClass('hidden');
            PresentationPublishModal.load_table();
        } else {
            console.log(data);
            PresentationPublishModal.document.addPresentationPublished(data);
            PresentationPublishModal.load_table();
        }
    }

    if (version.trim() == '')
        DocumentEventListener.presPublish(PresentationPublishModal.document, group, null,
            slide_count, min_bullet, max_bullet, finished);
    else
        DocumentEventListener.presPublish(PresentationPublishModal.document, group, version,
            slide_count, min_bullet, max_bullet, finished);
};

PresentationPublishModal.typeaheadQueryMatch = function (q, cb) {
    var matches;
    var substrRegex;
    matches = [];
    substrRegex = new RegExp(q, 'i');
    $.each(Group.getAll(), function (i, group) {
        if (substrRegex.test(group.getName())) {
            matches.push({value: group.getName(), group: group});
        }
    });
    cb(matches);
};

PresentationPublishModal._onShow = function () {
    Shortcut.pause();
    PresentationPublishModal.showing = true;
};

PresentationPublishModal._onHide = function () {
    Shortcut.unpause();
    PresentationPublishModal.showing = false;
    PresentationPublishModal.publish_tboby.empty();
    PresentationPublishModal.warning_msg.addClass('hidden');
    PresentationPublishModal.groupSearchInput.val('');
};

PresentationPublishModal.hide = function () {
    PresentationPublishModal.modal.modal('hide');
};

/** @namespace b.version_int */