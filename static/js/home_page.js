var project_page = false;

function initialize(server_data) {
    Page.initialize(server_data);
    Shortcut.initialize();

    console.debug(server_data);

    var user = new User();
    user.initCurrentUser(server_data.user);

    show_spectra_count();

    NavigationBar.initialize();
    Page.sendAnalytics();
    init_project_toolbar();

    ProjectTable.initialize();
    ProjectTable.loadUserProjects();
    LibrarySearch.initialize();

    Shortcut.set('project_table');

    if (!get_user().tour_home_complete) {
        show_guided_tour_offering();
    }
}

function init_project_toolbar() {
    $("#new_project_tb").click(function () {
        ProjectEventListener.createMouseClick();
    });

    $("#import_project_tb").click(function () {
        ProjectEventListener.importMouseClick();
    });
    $("#delete_project_tb").click(function () {
        ProjectTable.deleteCheckedProjects();
    });
    $("#perms_project_tb").click(function () {
        ProjectEventListener.setPermissionsHomePageMouseClick();
    });

    $("#refresh_project_tb").click(ProjectTable.loadUserProjects);
}

$(window).resize(function () {
});

//function logout() {
//    var request_data = {"status": "logout", "user": get_user().username};
//    $.ajax({
//        async: true,
//        type: "POST",
//        url: ACCOUNT_URLS.login,
//        contentType: "application/json",
//        data: request_data,
//        success: function (data, textStatus, jqXHR) {
//            $.removeCookie('auth_token', {path: STATIC_URLS.root});
//            $.removeCookie('auth_user', {path: STATIC_URLS.root});
//            $.removeCookie('user', {path: STATIC_URLS.root});
//            $(location).attr('href', ARTIFACT_URLS.project_library);
//        }
//    });
//}

window.onerror = function (message, url, line) {
    log.error('Window Error:', '\nmessage: ', message, '\nurl: ', url, '\nline: ', line);
};

function play_guided_tour() {

    // disable the shortcuts while the guided tour is running
    Shortcut.pause();

    // drop the guided tour offering if it's active
    $('#guided-tour-offering').click();

    bootstro.start('', {
        finishButtonText: 'Finish',
        items: [
            {
                selector: "#search_input",
                title: "Project Search",
                content: "Search within all Projects available to you.",
                placement: "bottom",
                step: 0
            },
            {
                selector: "#tvs-buttons",
                title: "Project Actions",
                content: "<p><i class='fa fa-plus'></i> Create a new Project.</p>" +
                    "<p><i class='fa fa-upload'></i> Import a Project.</p>" +
                    "<p><i class='fa fa-times'></i> Delete the selected Project.</p>" +
                    "<p><i class='fa fa-shield'></i> Configure Project Security Sharing.</p>" +
                    "<p><i class='fa fa-refresh'></i> Refresh the Project list.</p>",
                placement: "bottom",
                step: 1
            },
            {
                selector: "#my-tab",
                title: "My Projects",
                content: "This tab will contain all projects owned by you.",
                placement: "bottom",
                step: 2
            },
            {
                selector: "#shared-tab",
                title: "Shared With Me",
                content: "This tab will contain all projects shared with you.",
                placement: "bottom",
                step: 3
            },
            {
                selector: "#world-tab",
                title: "Shared With World",
                content: "This tab will contain all projects shared to the world.",
                placement: "bottom",
                step: 4
            },
            {
                selector: "#help_dropdown",
                title: "Help",
                content: "<p>For more information and help, please see the <i class='fa fa-life-saver'></i> Help Menu where you can:</p>" +
                    "<p><i class='fa fa-youtube-play'></i> Watch Tutorial Videos</p>" +
                    "<p><i class='fa fa-info-circle'></i> Open the User Guide</p>" +
                    "<p><i class='fa fa-road'></i> Re-run this guided tour</p>",
                placement: "bottom",
                step: 5
            }

        ],
        onStep: function(parms) {
            if (parms.idx == 5) {
                mark_guided_tour_complete();
            }
        },
        onExit: function(parms) {
            // got to reload the shortcuts (keybindings)!
            Shortcut.unpause()
        }
    });
}

function show_guided_tour_offering() {

    $.smallBox({
        title : "New User!",
        content : "<p id='guided-tour-offering'>It appears that you are a new user.  We recommend a quick guided tour to improve your experience.</p>" +
            "<p class='text-align-right'>" +
            "<a href='javascript:void(0);' onclick='play_guided_tour()' class='btn btn-primary btn-sm'>OK</a> " +
            "<a href='javascript:void(0);' class='btn btn-danger btn-sm'>Ignore</a>" +
            "<a id='guided-tour-ignore-link' href='javascript:void(0);' onclick='mark_guided_tour_complete()' class='btn btn-danger btn-sm btn-link'>Don't show this again</a>" +
            "</p>",
        color: "rgba(41, 97, 145, 0.925)",
        timeout: 30000,
        icon : "fa fa-bell swing animated"
    });
}

function mark_guided_tour_complete() {
    post_to_server(ACCOUNT_URLS.tour_home_complete, null, true);
}

function show_spectra_count () {
    console.log(User.getCurrent().spectra_count)
}
