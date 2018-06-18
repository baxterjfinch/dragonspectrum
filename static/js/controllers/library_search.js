function LibrarySearch () {}

LibrarySearch.search_input = $('#search_input');
LibrarySearch.search_btn = $('#search_btn');
LibrarySearch.clear_btn = $('#clear_search_btn');
LibrarySearch.searching_message = $('#searching-message');
LibrarySearch.no_results_message = $('#no-results-message');

LibrarySearch.initialize = function () {
    LibrarySearch.search_btn.unbind();
    LibrarySearch.hideNoResultsMessage();
    LibrarySearch.search_btn.click(function () {
        var query = LibrarySearch.search_input.val();
        if (query.trim() != '')
            LibrarySearch.search(query);
    });

    LibrarySearch.clear_btn.unbind();
    LibrarySearch.clear_btn.click(function () {
        LibrarySearch.clearSearch();
    });

    LibrarySearch.search_input.focus(function () {
        Shortcut.set('search');
    });

    LibrarySearch.search_input.blur(function () {
        Shortcut.set('project_table');
    });
};

LibrarySearch.showSearchingMessage = function () {
    LibrarySearch.searching_message.removeClass('hidden');
};

LibrarySearch.hideSearchingMessage = function () {
    LibrarySearch.searching_message.addClass('hidden');
};

LibrarySearch.showNoResultsMessage = function () {
    LibrarySearch.no_results_message.removeClass('hidden');
};

LibrarySearch.hideNoResultsMessage = function () {
    LibrarySearch.no_results_message.addClass('hidden');
};

LibrarySearch.triggerSearch = function () {
    LibrarySearch.search_btn.click();
};

LibrarySearch.clearSearch = function () {
    LibrarySearch.search_input.val('');
    LibrarySearch.search_input.blur();
    LibrarySearch.hideNoResultsMessage();
    ProjectTable.hideSearchTab();
    ProjectTable.hideAllSearchProjects();
};

LibrarySearch.focusSearch = function () {
    LibrarySearch.search_input.focus();
};

LibrarySearch.search = function (query) {
    ProjectTable.hideAllSearchProjects();
    LibrarySearch.showSearchingMessage();
    LibrarySearch.hideNoResultsMessage();
    setTimeout(function () {
        ProjectTable.showSearchTab();
    }, 1);

    comms.post({
        url: ARTIFACT_URLS.search_library,
        data: {query: {'all': query, 'return': 'project_ids'}},
        success: function (data) {
            var project_ids = data.projects;
            var projects = [];
            var project;
            for (var i = 0; i < project_ids.length; i++) {
                project = Project.get(project_ids[i]);
                if (project)
                    projects.push(project);
            }

            if (project_ids.length == 0)
                LibrarySearch.showNoResultsMessage();
            LibrarySearch.hideSearchingMessage();
            ProjectTable.showSearchProjects(projects);
        }
    })
};