function NavigationBar () {}

NavigationBar.initialize = function () {
    NavigationBar.initializeProjectMenu();
    NavigationBar.initializeDocumentMenu();
    NavigationBar.initializeConceptMenu();
    NavigationBar.initializePhrasingMenu();
    NavigationBar.initializeViewMenu();
    NavigationBar.initializeUserMenu();
};

/**
 * Project Menu Items
 */
NavigationBar.project_create = $("#nar_bar_create_project");
NavigationBar.project_import = $("#nar_bar_import_project");
NavigationBar.project_backup = $("#nar_bar_backup_project");
NavigationBar.project_restore = $("#nar_bar_restore_project");
NavigationBar.project_rename = $("#nar_bar_rename_project");
NavigationBar.project_delete = $("#nar_bar_delete_project");
NavigationBar.project_security = $("#nav_bar_project_security");
NavigationBar.project_abstract = $("#nar_bar_exort_abstract");
NavigationBar.project_persentation = $("#nar_bar_exort_presentation");
NavigationBar.project_print = $("#nar_bar_exort_print");
NavigationBar.spectra_class = $("#spectra-class");

NavigationBar.initializeProjectMenu = function () {
    NavigationBar.project_create.click(function () {
        ProjectEventListener.createMouseClick();
    });

    NavigationBar.project_import.click(function () {
        ProjectEventListener.importMouseClick();
    });

    NavigationBar.project_backup.click(function () {
        if (NavigationBar.isDisabled($(this).parent()))
            return;
        BackupEventListener.backupMouseClick();
    });

    NavigationBar.project_restore.click(function () {
        BackupEventListener.restoreMouseClick();
    });

    NavigationBar.project_security.click(function () {
        if (Page.isProjectPage()) {
            ProjectEventListener.setPermissionsMouseClick();
        } else {
            var projects = ProjectTable.getCurrentTableCheckProjects();
            if (projects.length != 1) {
                Notify.alert.warning('You must select one project');
                return;
            }
            ProjectEventListener.setPermissionsHomePageMouseClick(projects[0]);
        }
    });

    if (Page.isProjectPage()) {
        NavigationBar.project_rename.click(function () {
            ProjectEventListener.renameMouseClick();
        });

        NavigationBar.project_delete.click(function () {
            ProjectEventListener.deleteMouseClick();
        });

        NavigationBar.project_abstract.click(function () {
//            show_abstract_export_menu();
        });

        NavigationBar.project_persentation.css('opacity', 0.5);
        NavigationBar.project_persentation.click(function () {
            // TODO
        });

        NavigationBar.project_print.click(function () {
            if (NavigationBar.isDisabled($(this).parent()))
                return;
            DocumentEventListener.printMouseClick(Document.getCurrent());
        });
    } else {
        NavigationBar.project_rename.addClass('hidden');
        NavigationBar.project_delete.addClass('hidden');
        NavigationBar.project_abstract.addClass('hidden');
        NavigationBar.project_persentation.addClass('hidden');
        NavigationBar.project_print.addClass('hidden');
    }

    var userspectra = get_user().spectra_count;
    $("#spectra-class").html(userspectra);
};

/**
 * Document Menu Items
 */
NavigationBar.document_new = $("#nav_bar_create_document");
NavigationBar.document_edit = $("#nav_bar_edit_document");
NavigationBar.document_delete = $("#nav_bar_delete_document");
NavigationBar.document_security = $("#nav_bar_document_security");

NavigationBar.initializeDocumentMenu = function () {
    NavigationBar.document_new.click(function () {
        DocumentEventListener.createMouseClick();
    });

    NavigationBar.document_edit.click(function () {
        DocumentEventListener.editMouseClick(Document.getCurrent());
    });

    NavigationBar.document_delete.click(function () {
        DocumentEventListener.deleteMouseClick(Document.getCurrent());
    });

    NavigationBar.document_security.click(function () {
        DocumentEventListener.setPermissionsMouseClick(Document.getCurrent());
    });
};

/**
 * Concept Menu Items
 */

NavigationBar.concept_new = $("#nav_bar_create_concept");
NavigationBar.concept_new_image = $("#nav_bar_create_image_concept");
NavigationBar.concept_new_link = $("#nav_bar_create_linked_concept");
NavigationBar.concept_delete = $("#nav_bar_delete_concept");
NavigationBar.concept_security = $("#nav_bar_concept_security");
NavigationBar.concept_copy_link = $("#nav_bar_copy_concept_link");

NavigationBar.initializeConceptMenu = function () {
    NavigationBar.concept_new.click(function () {
        ConceptEventListener.createShortcut();
    });

    NavigationBar.concept_new_image.click(function () {
        ConceptEventListener.createImageShortcut();
    });

    NavigationBar.concept_new_link.click(function () {
        ConceptEventListener.createLinkShortcut();
    });

    NavigationBar.concept_delete.click(function () {
        ConceptEventListener.deleteShortCut();
    });

    NavigationBar.concept_security.click(function () {
        ConceptEventListener.setPermissionsMouseClick(Concept.getCurrent());
    });

    NavigationBar.concept_copy_link.click(function () {
//        ConceptEventListener.deleteShortCut();
    });

};

/**
 * Phrasing Menu Items
 */

NavigationBar.phrasing_new = $('#nav_bar_create_phrasing');
NavigationBar.phrasing_edit = $('#nav_bar_edit_phrasing');

NavigationBar.initializePhrasingMenu = function () {
    NavigationBar.phrasing_new.click(function () {
        PhrasingEventListener.createMouseClick(Concept.getCurrent());
    });

    NavigationBar.phrasing_edit.click(function () {
        PhrasingEventListener.editMouseClick(Concept.getCurrent());
    });
};

/**
 * View Menu Items
 */

NavigationBar.view_toggle_image = $('#nav_bar_toggle_image');

NavigationBar.initializeViewMenu = function () {
    NavigationBar.view_toggle_image.click(function () {
        DVS.toggleImages();
    });
};

/**
 * View Menu Items
 */

NavigationBar.user_user = $("#nar_bar_user");
NavigationBar.user_admin = $("#nar_bar_user_admin");
NavigationBar.user_logout = $("#nar_bar_user_logout");

NavigationBar.initializeUserMenu = function () {
    NavigationBar.user_user.click(function () {
        location.href = ACCOUNT_URLS.profile + User.getCurrent().getUserName();
    });

    if (User.getCurrent().isAdmin()) {
        NavigationBar.user_admin.click(function () {
            window.open(ADMIN_URLS.admin);
        });
    } else {
        NavigationBar.user_admin.addClass('hidden');
    }

    NavigationBar.user_logout.click(function () {
        logout();
    });
};

NavigationBar.isDisabled = function (item) {
    return item.hasClass("disabled");
};
