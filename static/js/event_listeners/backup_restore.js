function BackupEventListener () {}


BackupEventListener.backupMouseClick = function () {
    BackupEventListener.backup();
};

BackupEventListener.backup = function () {
    Project.getConceptLoader().load_all(BackupEventListener._backup);
};

BackupEventListener._backup = function () {
    var backup_dict = Project.getProject().toDict();

    var image_base64_data = [];

    function get_image_data (parent) {
        if (!parent)
            return;
        var children = parent.children;
        if (!children)
            return;
        for (var i = 0; i < children.length; i++) {
            if (children[i].is_media) {
                image_base64_data.push({
                    base64: children[i].imageBase64,
                    content_type: children[i].content_type,
                    id: children[i].id
                });
                delete children[i]['imageBase64'];
            }
            get_image_data(children[i]);
        }
    }

    get_image_data(backup_dict);

    var zip = new JSZip(null, null);
    zip.file("project.json", JSON.stringify(backup_dict), null);
    var img = zip.folder('images');
    for (var i = 0; i < image_base64_data.length; i++) {
        img.file(image_base64_data[i]['id'], image_base64_data[i]['base64'], {base64: true})
    }
    saveAs(zip.generate({type:"blob"}), backup_dict['title'] + ".tt");
};

BackupEventListener.restoreMouseClick = function () {
    BackupEventListener.restore();
};

BackupEventListener.restore = function () {
    ProjectRestoreModal.show(BackupEventListener._restore);
};

BackupEventListener._restore = function (file) {
    var fileReader = new FileReader();

    fileReader.onload = function(fileLoadedEvent) {
        var textAreaFileContents = document.getElementById (
            "textAreaFileContents"
        );
        var data_url = fileLoadedEvent.target.result;
        var base64 = data_url.substring(data_url.lastIndexOf(',') + 1, data_url.length);

        ProjectRestoreModal.hideForm();
        ProjectRestoreModal.showRestoringMessage();
        ProjectRestoreModal.hideCloseButton();

        comms.put({
            url: ARTIFACT_URLS.project_restore,
            data: {
                command: "restore",
                base64: base64
            },
            success: function (data) {
                console.debug(data);
                var statusChecker = new StatusChecker(
                    ARTIFACT_URLS.project_restore + '?restore_results_id=' + data.restore_id,
                function (status_data) {
                    console.debug('Restore Status: %O', status_data);
                    if (status_data.results != 'none') {
                        statusChecker.stop();

                        if (typeof ProjectTable == 'function')
                            ProjectTable.loadUserProjects();

                        ProjectRestoreModal.showOpenButton();
                        ProjectRestoreModal.showCloseButton();
                        ProjectRestoreModal.setProjectOpenCallback(function () {
                            var url = location.origin + '/project/' + status_data.results;
                            window.open(url, '_blank');
                            ProjectRestoreModal.hide();
                        });
                        ProjectRestoreModal.hideRestoringMessage();
                        ProjectRestoreModal.showRestoredMessage();
                    }
                });
                statusChecker.start();
            }
        });
    };

    fileReader.readAsDataURL(file);
};