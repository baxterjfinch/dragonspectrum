function ProjectSearch () {}


ProjectSearch.search_input = $('#search_input');
ProjectSearch.search_btn = $('#search_btn');
ProjectSearch.clear_btn = $('#clear_search_btn');
ProjectSearch.no_resaults_message = $('#no-results-message');

ProjectSearch.initialize = function () {
    ProjectSearch.search_btn.unbind();
    ProjectSearch.search_btn.click(function () {
        var query = ProjectSearch.search_input.val();
        if (query.trim() != '')
            ProjectSearch.search(query);
    });

    ProjectSearch.clear_btn.unbind();
    ProjectSearch.clear_btn.click(function () {
        ProjectSearch.clearSearch();
    });

    ProjectSearch.search_input.focus(function () {
        Shortcut.set('search');
    });

    ProjectSearch.search_input.blur(function () {
        Shortcut.set('dvs');
    });
};

ProjectSearch.clearSearch = function () {
    ProjectSearch.search_input.val('');
    ProjectSearch.search_input.blur();
    PVS.hideSearchTab();
    PhrasingTable.showSearchingMessage();
    PhrasingTable.hideNoResultsMessage();
    PhrasingTable.clearPhrasingTable();
};

ProjectSearch.focusSearch = function () {
    ProjectSearch.search_input.focus();
};

ProjectSearch.triggerSearch = function () {
    ProjectSearch.search_btn.click();
};

ProjectSearch.search = function (query) {
    PhrasingTable.clearPhrasingTable();
    PhrasingTable.hideNoResultsMessage();
    PVS.selectSearchTab();

    comms.post({
        url: ARTIFACT_URLS.search_project,
        data: {query: {string: query, pro: Project.getId()}},
        success: function (data) {
            PhrasingTable.hideSearchingMessage();
            if (data.concepts.length == 0) {
                PhrasingTable.showNoResultsMessage();
            } else {
                PhrasingTable.loadTables(data.concepts);
            }
        }
    })
};