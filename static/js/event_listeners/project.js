function ProjectEventListener() {}

/** CREATE **
 * Event Listener for creating events
 */
ProjectEventListener.createShortcut = function () {
    ProjectCreateModal.show(function (title) {
        ProjectEventListener.create(title);
    });
};

ProjectEventListener.createMouseClick = function () {
    ProjectCreateModal.show(function (title) {
        ProjectEventListener.create(title);
    });
};

ProjectEventListener.create = function (title) {
    var project = {};
    var document = {};

    document.title = 'Outline';
    document.subtitle = 'Outline Document';
    document.author = get_user().display_name;
    document.version = 'v0.1';
    document.date = new Date().getFullYear().toString();

    project.title = title;
    project.distilled_document = document;

    comms.put({
        url: ARTIFACT_URLS.project,
        data: project,
        success: function (data) {
            var url = location.origin + ARTIFACT_URLS.project + data.id;
            if (typeof ProjectTable == 'function')
                ProjectTable.loadUserProjects();
            Notify.confirm('Open new project?', function (flag) {
                if (flag)
                    window.open(url, "_blank");
            })
        }
    })
};

/** CREATE **
 * Event Listener for creating events
 */
ProjectEventListener.renameMouseClick = function () {
    var project = Project.getProject();
    if (!project.hasPermissionWrite()) {
        Notify.alert.warning('You do not have permission to rename this project');
        return;
    }

    ProjectPropertiesModal.show(function (title) {
        ProjectEventListener.rename(project, title, true);
    }, project.getTitle());
};

ProjectEventListener.renameCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    ProjectEventListener.rename(Project.getProject(), transaction.getActionData().title, false);
};

ProjectEventListener.rename = function (project, title, notifyServer) {
    project.setTitle(title);
    document.title = title;

    if (notifyServer) {
        comms.post({
            url: ARTIFACT_URLS.project + Project.getRequestId(),
            data: {title: title}
        })
    }
};

/** UpVote **
 * Event Listener for upvoting
 */
ProjectEventListener.upvoteMouseClick = function () {
    var project = Project.getProject();
    if (!project.hasPermissionWrite()) {
        Notify.alert.warning('You do not have permission to Up Vote this project');
        return;
    }

    ProjectEventListener.upvote(project, null, true);
};

ProjectEventListener.upvoteCollab = function (user, message) {
    // TODO: This will need tested after UI is put in
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    ProjectEventListener.upvote(Project.getProject(), transaction.getActionData().project_score, false);
};

ProjectEventListener.upvote = function (project, project_score, call_back, notifyServer) {
    project.setProjectScore(project.getProjectScore()+1);
    if (call_back) {
        call_back();
    }
    if (notifyServer) {
        comms.post({
            url: ARTIFACT_URLS.project + project.getRequestId(),
            data: {up_vote: true},
            success: function (data) {
                project.setProjectScore(data.project_score);
                project.user_vote = data.user_vote;
                if (call_back) {
                    call_back();
                }
            }
        })
    } else {
        project.setProjectScore(project_score);
    }
    var userspectra = User.getCurrent().spectra_count;
    $("#spectra-class").html(userspectra);
};

/** DownVote **
 * Event Listener for downvoting
 */
ProjectEventListener.downvoteMouseClick = function () {
    var project = Project.getProject();
    if (!project.hasPermissionWrite()) {
        Notify.alert.warning('You do not have permission to Down Vote this project');
        return;
    }

    ProjectEventListener.downvote(project, null, true);
};

ProjectEventListener.downvoteCollab = function (user, message) {
    // TODO: This will need tested after UI is put in
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    ProjectEventListener.downvote(Project.getProject(), transaction.getActionData().project_score, false);
};

ProjectEventListener.downvote = function (project, project_score, call_back, notifyServer) {
    if (notifyServer) {
        comms.post({
            url: ARTIFACT_URLS.project + project.getRequestId(),
            data: {down_vote: true},
            success: function (data) {
                project.setProjectScore(data.project_score);
                project.user_vote = data.user_vote;
                call_back();
            }
        })
    } else {
        project.setProjectScore(project_score);
    }
    var userspectra = get_user().spectra_count;
    $("#spectra-class").html(userspectra);
};

/** IMPORT **
 * Event Listener for import events
 */
ProjectEventListener.importShortcut = function () {
    ProjectImportModal.show(
        ProjectEventListener.importUrl,
        ProjectEventListener.importFile
    );
};

ProjectEventListener.importMouseClick = function () {
    ProjectImportModal.show(
        ProjectEventListener.importUrl,
        ProjectEventListener.importFile
    );
};

ProjectEventListener.importUrl = function (url) {
    function is_wikipedia_url(u) {
        return u.replace('http://', '')
                  .replace('https://', '')
                  .replace('www.', '')
                  .split(/[/?#]/)[0]
                  .indexOf('wikipedia') != -1;
    }

    var ajax_data = {};
    ajax_data.url = url;
    if (is_wikipedia_url(url))
        ajax_data.command = 'import wikipedia';
    else
        ajax_data.command = 'import website';

    ProjectEventListener.import(ARTIFACT_URLS.project_import, ajax_data);
};

ProjectEventListener.importFile = function (file) {
    var fileReader = new FileReader();
    var title = file.name;
    var file_type = file.type;

    fileReader.onload = function(fileLoadedEvent) {
        var text = fileLoadedEvent.target.result;

        if (file_type == 'text/html') {
            var ajax_data = {"command": "import html", "html": text, 'title': title};
        } else if (file_type == 'text/plain') {
            ajax_data = {"command": "import text", "text": text, "title": title};
        }

        ProjectEventListener.import(ARTIFACT_URLS.project_import, ajax_data);
    };

    fileReader.readAsText(file);
};

ProjectEventListener.import = function (url ,ajax_data) {
    var use_modal = true;
    ProjectImportModal.setHiddenCallback(function () {
        use_modal = false;
    });

    comms.put({
        url: url,
        data: ajax_data,
        success: function (data) {
            console.debug('Import ID: %s', data.importer_id);

            ProjectImportModal.hideForm();
            ProjectImportModal.showStatus();
            ProjectImportModal.hideImportButton();

            var statusChecker = new StatusChecker(
                    ARTIFACT_URLS.project_import + '?' + "importer_status_id=" + data.importer_id,
                function (status_data) {
                    if (status_data.error) {
                        console.error('Error: %s Reason: %s', status_data.error, status_data.reason);
                        statusChecker.stop();
                        if (use_modal)
                            ProjectImportModal.showErrorMessage(status_data.reason);
                        else
                            Notify.alert.error('Error importing project: %s', status_data.reason);
                    } else if (status_data.status == 'not started') {
                        console.debug('Importer not started')
                    } else if (status_data.status == 'running') {
                        console.debug('Importer Running: %O', status_data.data);
                        if (use_modal)
                            ProjectImportModal.setProgressBar(
                                (status_data.data.tag_processed / status_data.data.tag_count) * 100);
                    } else if (status_data.status == 'finished') {
                        console.debug('Importer Finished');
                        statusChecker.stop();

                        if (typeof ProjectTable == 'function')
                            ProjectTable.loadUserProjects();

                        if (use_modal) {
                            ProjectImportModal.setOpenButtonCallback(function () {
                                ProjectImportModal.hide();
                                window.open(location.origin + ARTIFACT_URLS.project + status_data.project, "_blank");
                            });
                            ProjectImportModal.showOpenButton();
                            ProjectImportModal.setProgressBar(100);
                            ProjectImportModal.showSuccessMessage('Completed');
                        } else {
                            Notify.alert.success('Project Import Complete');
                        }
                    } else if (status_data.status == 'unknowen') {
                        console.debug('Importer status unknowen');
                        if (statusChecker.getCount() == 5) {
                            statusChecker.stop();
                            if (use_modal)
                                ProjectImportModal.showErrorMessage('There was a problem importing you project');
                            else
                                Notify.alert.error('Error importing project');
                        } else {
                            statusChecker.incCount();
                        }
                    }
                }
            );
            statusChecker.start();
        }
    });
};

/** Delete **
 * Event Listener for delete events
 */

ProjectEventListener.confirm_deletion_message = 'Are you sure you want to delete this project?';

ProjectEventListener.deleteMouseClick = function () {
    Notify.confirm(ProjectEventListener.confirm_deletion_message, function (results) {
        if (results)
            ProjectEventListener.del(Project.getProject(), true);
    });
};

ProjectEventListener.deleteMouseClickHomePage = function (project) {
    ProjectEventListener.del(project, false);
};

ProjectEventListener.deleteCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);

    if (transaction.getArtifactId() == Project.getId()) {
        $('body').empty().html('<div class="alert alert-danger">This project ' +
            'has been deleted by another user</div>');
        Shortcut.pause();
    }
};

ProjectEventListener.del = function (project, close_window) {
    comms.delete({
        url: ARTIFACT_URLS.project + project.getRequestId(),
        success: function () {
            if (close_window) {
                setTimeout(function () {
                    window.close();
                }, 600);
            }
        }
    });
};

/** PERMISSION **
 * Event Listener for permission change events
 */
ProjectEventListener.setPermissionsMouseClick = function () {
    ProjectEventListener.showPermissionsModal(Project.getProject());
};

ProjectEventListener.setPermissionsHomePageShortcut = function () {
    ProjectEventListener.setPermissionsHomePage();
};

ProjectEventListener.setPermissionsHomePageMouseClick = function () {
    ProjectEventListener.setPermissionsHomePage();
};

ProjectEventListener.setPermissionsHomePage = function () {
    var checked_projects = ProjectTable.getCurrentTableCheckProjects();
        if (checked_projects.length == 0) {
            Notify.alert.warning('No project selected');
            return;
        }

        if (checked_projects.length > 1) {
            Notify.alert.warning('You must selected only one project');
            return;
        }

        ProjectEventListener.showPermissionsModal(checked_projects[0]);
};

ProjectEventListener.showPermissionsModal = function (project) {
    PermissionSettingsModal.show(
        'Project Security Settings',
        project,
        function (group) {ProjectEventListener.addGroup(project, group, true, true, true)},
        function (group) {ProjectEventListener.removeGroup(project, group, true, true, true)},
        function (group, op, type, perm) {ProjectEventListener.addPerm(project, group, op, type, perm, true, true, true)},
        function (group, op, type) {ProjectEventListener.removePerm(project, group, op, type, true, true, true)},
        project.hasPermissionAdmin()
    )
};

ProjectEventListener.addGroup = function (project, group, notifyTvs, notifyDvs, notifyServer) {
    project.getPermissions().addPermission('read', group, 'allow', false);

    if (notifyTvs && TVS.inUse()) {
        TVS.setProjectSecurityIconColor(project.getPermissions().hasExplicitPermissions());
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.project + project.getRequestId(),
            data: {
                type: 'shared',
                operation: 'read',
                group_id: group.getId(),
                permission: 'allow'
            }
        }, comms.post);
    }
};

ProjectEventListener.removeGroupCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var project = Project.getProject();
    transaction.setArtifact(project);
    var action_data = transaction.getActionData();
    var group = Group.get(action_data.group);
    if (!group)
        group = action_data.group;

    var perms = project.getPermissions();
    if (action_data.hidden) {
        var hidden = perms.getPermissions()['hidden'];
        if (!hidden) {
            hidden = [];
            perms.getPermissions()['hidden'] = hidden;
        }
        hidden.push(action_data.group);
    }

    ProjectEventListener.removeGroup(project, group, true, true, false);

    if (!project.hasPermissionRead(User.getCurrent()))
        project.secureDelete();

    if (PermissionSettingsModal.isShowing() &&
        PermissionSettingsModal.getArtifact() == project)
        PermissionSettingsModal.refresh();
};


ProjectEventListener.removeGroup = function (project, group, notifyTvs, notifyDvs, notifyServer) {
    project.getPermissions().removeGroup(group);

    if (notifyTvs && TVS.inUse()) {
        TVS.setProjectSecurityIconColor(project.getPermissions().hasExplicitPermissions());
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.project + project.getRequestId(),
            data: {
                remove_group: group.getId()
            }
        }, comms.post);
    }
};

ProjectEventListener.addPermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var project = Project.getProject();
    transaction.setArtifact(project);
    var action_data = transaction.getActionData();
    var group = Group.get(action_data.group);
    if (!group)
        group = action_data.group;

    var perms = project.getPermissions();
    if (action_data.hidden) {
        var hidden = perms.getPermissions()['hidden'];
        if (!hidden) {
            hidden = [];
            perms.getPermissions()['hidden'] = hidden;
        }
        hidden.push(action_data.group);
    }

    ProjectEventListener.addPerm(project, group, action_data.operation,
        action_data.type, action_data.permission, true, true, false);

    if (!project.hasPermissionRead(User.getCurrent()))
        project.secureDelete();

    if (PermissionSettingsModal.isShowing() &&
        PermissionSettingsModal.getArtifact() == project)
        PermissionSettingsModal.refresh();
};

ProjectEventListener.addPerm = function (project, group, operation, type, perm, notifyTvs, notifyDvs, notifyServer) {
    project.getPermissions().addPermission(operation, group, perm, (type != 'shared'));

    if (notifyTvs && TVS.inUse()) {
        TVS.setProjectSecurityIconColor(project.getPermissions().hasExplicitPermissions());
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.project + project.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId(),
                permission: perm
            }
        }, comms.post);
    }
};

ProjectEventListener.removePermCollab = function (user, message) {
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    Project.getConceptLoader().processCache();

    var project = Project.getProject();
    transaction.setArtifact(project);
    var action_data = transaction.getActionData();
    var group = Group.get(action_data.group);
    if (!group)
        group = action_data.group;

    var perms = project.getPermissions();
    if (action_data.hidden) {
        var hidden = perms.getPermissions()['hidden'];
        if (!hidden) {
            hidden = [];
            perms.getPermissions()['hidden'] = hidden;
        }
        hidden.push(action_data.group);
    }

    ProjectEventListener.addPerm(project, group, action_data.operation,
        action_data.type, true, true, false);

    if (!project.hasPermissionRead(User.getCurrent()))
        project.secureDelete();

    if (PermissionSettingsModal.isShowing() &&
        PermissionSettingsModal.getArtifact() == project)
        PermissionSettingsModal.refresh();
};

ProjectEventListener.removePerm = function (project, group, operation, type, notifyTvs, notifyDvs, notifyServer) {
    project.getPermissions().removePermission(operation, group, (type != 'shared'));

    if (notifyTvs && TVS.inUse()) {
        TVS.setProjectSecurityIconColor(project.getPermissions().hasExplicitPermissions());
    }

    if (notifyDvs) {

    }

    if (notifyServer) {
        comms.queue({
            url: ARTIFACT_URLS.project + project.getRequestId(),
            data: {
                type: type,
                operation: operation,
                group_id: group.getId()
            }
        }, comms.post);
    }
};


$(document).ready(function () {
  var trigger = $('.hamburger'),
      overlay = $('.overlay'),
     isClosed = false;

    trigger.click(function () {
      hamburger_cross();
    });

    function hamburger_cross() {

      if (isClosed == true) {
        overlay.hide();
        trigger.removeClass('is-open');
        trigger.addClass('is-closed');
        isClosed = false;
      } else {
        overlay.show();
        trigger.removeClass('is-closed');
        trigger.addClass('is-open');
        isClosed = true;
      }
  }

  $('[data-toggle="offcanvas"]').click(function () {
        $('#wrapper').toggleClass('toggled');
  });
});
