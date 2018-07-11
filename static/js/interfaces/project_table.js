function ProjectTable () {}

ProjectTable.USER = 'user';
ProjectTable.USER_SIDEBAR = $('#my_project_table_side');
ProjectTable.USER_RANKED_SIDEBAR = $('#my_project_table_side_ranked');
ProjectTable.SHARED = 'shared';
ProjectTable.WORLD_SHARED = 'world_shared';
ProjectTable.SEARCH = 'search';
ProjectTable.RANK = 'rank';

ProjectTable.my_table_body = $('#my-project-table-body');
ProjectTable.my_table_body_side = $('#my-project-table-body-side');
ProjectTable.my_table_body_ranked = $('#my-project-table-body-ranked');
ProjectTable.shared_table_body = $('#shared-project-table-body');
ProjectTable.world_table_body = $('#world-project-table-body');
ProjectTable.search_table_body = $('#search-project-table-body');
ProjectTable.recent_posts_table = $('#recent-posts-table');

ProjectTable.check_all_my = $('#check-all-project-my');
ProjectTable.check_all_shared = $('#check-all-project-shared');
ProjectTable.check_all_world = $('#check-all-project-world');
ProjectTable.check_all_search = $('#check-all-project-search');

ProjectTable.current_tab = null;
ProjectTable.my_tab = $('#my-tab');
ProjectTable.shared_tab = $('#shared-tab');
ProjectTable.world_tab = $('#world-tab');
ProjectTable.search_tab = $('#search-tab');

ProjectTable.checkbox_column_classes = 'project-checkbox';
ProjectTable.voter_column_classes = 'project-voter';
ProjectTable.score_column_classes = 'project-score';
ProjectTable.title_column_classes = 'project-title';
ProjectTable.owner_column_classes = 'project-owner';
ProjectTable.date_column_classes = 'project-date';

ProjectTable.is_loading_project = false;

ProjectTable.initialize = function () {
    ProjectTable.current_tab = ProjectTable.USER;

    ProjectTable.my_tab.children().click(function () {
        ProjectTable.current_tab = ProjectTable.USER;
    });

    ProjectTable.shared_tab.children().click(function () {
        ProjectTable.current_tab = ProjectTable.SHARED;
    });

    ProjectTable.world_tab.children().click(function () {
        ProjectTable.current_tab = ProjectTable.WORLD_SHARED;
    });

    ProjectTable.search_tab.children().click(function () {
        ProjectTable.current_tab = ProjectTable.SEARCH;
    });

    ProjectTable.check_all_my.click(function (e) {
        ProjectTable.toggleCheckAll(ProjectTable.USER, $(e.currentTarget).is(':checked'));
    });

    ProjectTable.check_all_shared.click(function (e) {
        ProjectTable.toggleCheckAll(ProjectTable.SHARED, $(e.currentTarget).is(':checked'));
    });

    ProjectTable.check_all_world.click(function (e) {
        ProjectTable.toggleCheckAll(ProjectTable.WORLD_SHARED, $(e.currentTarget).is(':checked'));
    });

    ProjectTable.check_all_search.click(function (e) {
        ProjectTable.toggleCheckAll(ProjectTable.SEARCH, $(e.currentTarget).is(':checked'));
    });
};

ProjectTable.loadTables = function (projects) {
    ProjectTable.clearUserTable();
    ProjectTable.clearUserSideTable();
    ProjectTable.clearUserSideTableRanked();
    ProjectTable.clearRecentPostsProfileTable();
    ProjectTable.clearSharedTable();
    ProjectTable.clearWorldShareTable();
    ProjectTable.clearSearchTable();

    for (var i = 0; i < projects.length; i++) {
        if (projects[i].isShared()) {
            ProjectTable.addToSharedTable(projects[i]);
        } else if (projects[i].isWorldShared()) {
            ProjectTable.addToWorldSharedTable(projects[i]);
        } else {
            ProjectTable.addToUserTable(projects[i]);
            ProjectTable.addToUserSideTable(projects[i]);
            ProjectTable.addToUserSideTableRanked(projects[i]);
            ProjectTable.addToUserProfileTable(projects[i]);
        }

        ProjectTable.addToSearchTable(projects[i]);
    }
};

ProjectTable.loadSideBarRankedTable = function (projects) {
    ProjectTable.clearUserSideTableRanked();
    for (var i = 0; i < projects.length; i++) {
        ProjectTable.addToUserSideTableRanked(projects[i]);
    }
};

ProjectTable.clearUserTable = function () {
    ProjectTable.my_table_body.empty();
};

ProjectTable.clearUserSideTable = function () {
    ProjectTable.my_table_body_side.empty();
};

ProjectTable.clearRecentPostsProfileTable = function () {
    ProjectTable.recent_posts_table.empty();
};

ProjectTable.clearUserSideTableRanked = function () {
    ProjectTable.my_table_body_ranked.empty();
};

ProjectTable.clearSharedTable = function () {
    ProjectTable.shared_table_body.empty();
};

ProjectTable.clearWorldShareTable = function () {
    ProjectTable.world_table_body.empty();
};

ProjectTable.clearSearchTable = function () {
    ProjectTable.search_table_body.empty();
};

ProjectTable.toggleCheckAll = function (table, checked) {
    var projects = Project.getProjects();
    var row;
    for (var i = 0; i < projects.length; i++) {
        row = projects[i].getTableRow(table);
        if (row) {
            if (checked)
                row.getCheckbox().prop('checked', true);
            else
                row.getCheckbox().prop('checked', false);
        }
    }
};

ProjectTable.buildTableRow = function (table, project) {
    var project_row = new ProjectTableRow();
    var tr = $('<tr></tr>');
    project_row.setTableRow(tr);

    var td = $('<td></td>');
    var checkbox = $('<input></input>');
    checkbox.attr('type', 'checkbox');
    td.addClass(ProjectTable.checkbox_column_classes);
    td.append(checkbox);
    tr.append(td);
    project_row.setCheckboxColumn(checkbox);

    td = $('<td></td>');
    var score = $('<a></a>');
    score.attr('href', project.getURL()); //This needs to be changed
    score.attr('target', '_blank');       //This needs to be changed
    score.append(project.getProjectScore());
    td.addClass(ProjectTable.score_column_classes);
    td.append(score);
    tr.append(td);
    project_row.setScoreColumn(score);

    td = $('<td></td>');
    var title = $('<a></a>');
    title.attr('href', project.getURL());
    title.attr('target', '_blank');
    title.append(project.getTitle());
    td.addClass(ProjectTable.title_column_classes);
    td.append(title);
    tr.append(td);
    project_row.setTitleColumn(title);

    td = $('<td></td>');
    var owner = $('<span></span>');
    owner.append(project.getOwners()[0]);
    td.addClass(ProjectTable.owner_column_classes);
    td.append(owner);
    tr.append(td);
    project_row.setOwnerColumn(owner);

    td = $('<td></td>');
    var last_modifed = $('<span></span>');
    last_modifed.append(project.getProjectWideModifiedDateString());
    td.addClass(ProjectTable.date_column_classes);
    td.append(last_modifed);
    tr.append(td);
    project_row.setLastModifiedColumn(last_modifed);

    td = $('<td></td>');
    var date_created = $('<span></span>');
    date_created.append(project.getCreatedDateString());
    td.addClass(ProjectTable.date_column_classes);
    td.append(date_created);
    tr.append(td);
    project_row.setDateCreatedColumn(date_created);

    project.addTableRow(table, project_row);

    return project_row;
};

ProjectTable.buildSideTableRow = function (table, project) {

    var project_row = new ProjectTableRow();
    var tr = $('<tr></tr>');
    project_row.setTableRow(tr);
    tr.addClass('table-rows');
    var td = $('<td></td>');

    var upvote_icon = $('<i></i>');
    upvote_icon.addClass('fa fa-chevron-circle-up');
    td.append(upvote_icon);
    td.append($('<br>'));

    var downvote_icon = $('<i></i>');

    td.append(downvote_icon);
    downvote_icon.addClass('fa fa-chevron-circle-down');
    var vote = $('<a></a>');
    vote.attr('type', 'checkbox');
    td.addClass(ProjectTable.voter_column_classes);
    tr.append(td);
    project_row.setVoterColumn(vote);

    td = $('<td></td>');
    var score = $('<a></a>');
    score.attr('href', project.getURL()); //This needs to be changed
    score.attr('target', '_blank');       //This needs to be changed
    score.append(project.getProjectScore());
    td.addClass(ProjectTable.score_column_classes);
    td.append(score);
    tr.append(td);
    project_row.setScoreColumn(score);

    td = $('<td></td>');
    var title = $('<a></a>');
    title.attr('href', project.getURL());
    title.attr('target', '_blank');
    title.addClass('recent-posts-title');
    title.append(project.getTitle());
    td.addClass(ProjectTable.title_column_classes);
    td.append(title);
    tr.append(td);
    project_row.setTitleColumn(title);

    td = $('<td></td>');
    var owner = $('<span></span>');
    owner.append(project.getOwners()[0]);
    td.addClass(ProjectTable.owner_column_classes);
    td.append(owner);
    tr.append(td);
    project_row.setOwnerColumn(owner);

    td = $('<td></td>');
    var date_created = $('<span></span>');
    date_created.append(project.getCreatedDateString());
    td.addClass(ProjectTable.date_column_classes);
    td.append(date_created);
    tr.append(td);
    project_row.setDateCreatedColumn(date_created);

    project.addTableRow(table, project_row);

    function update_colors () {
        if (project.user_vote !== null && project.user_vote.direction === "up") {
            upvote_icon.addClass('up');
            downvote_icon.removeClass('down');
        } else if (project.user_vote !== null && project.user_vote.direction === "down") {
            upvote_icon.removeClass('up');
            downvote_icon.addClass('down');
        } else {
            upvote_icon.removeClass('up');
            downvote_icon.removeClass('down');
        }
    }
    update_colors();


    upvote_icon.click(function (){
        ProjectEventListener.upvote(project, null, function () {
            score.empty();
            score.append(project.getProjectScore());
            update_colors();
        }, true);
    });

    downvote_icon.click(function (){
        ProjectEventListener.downvote(project, null, function () {
            score.empty();
            score.append(project.getProjectScore());
            update_colors();
        }, true);
    });

    return project_row;

};


ProjectTable.buildSideTableRankedRow = function (table, project) {

    var project_row = new ProjectTableRow();
    var tr = $('<tr></tr>');
    project_row.setTableRow(tr);

    var td = $('<td></td>');

    var upvote_icon = $('<i></i>');
    upvote_icon.addClass('fa fa-chevron-circle-up');
    td.append(upvote_icon);
    td.append($('<br>'));

    var downvote_icon = $('<i></i>');

    td.append(downvote_icon);
    downvote_icon.addClass('fa fa-chevron-circle-down');
    var vote = $('<a></a>');
    vote.attr('type', 'checkbox');
    td.addClass(ProjectTable.voter_column_classes);
    tr.append(td);
    project_row.setVoterColumn(vote);

    td = $('<td></td>');
    var score = $('<a></a>');
    score.attr('href', project.getURL()); //This needs to be changed
    score.attr('target', '_blank');       //This needs to be changed
    score.append(project.getProjectScore());
    td.addClass(ProjectTable.score_column_classes);
    td.append(score);
    tr.append(td);
    project_row.setScoreColumn(score);

    td = $('<td></td>');
    var title = $('<a></a>');
    title.attr('href', project.getURL());
    title.attr('target', '_blank');
    title.append(project.getTitle());
    td.addClass(ProjectTable.title_column_classes);
    td.append(title);
    tr.append(td);
    project_row.setTitleColumn(title);

    td = $('<td></td>');
    var owner = $('<span></span>');
    owner.append(project.getOwners()[0]);
    td.addClass(ProjectTable.owner_column_classes);
    td.append(owner);
    tr.append(td);
    project_row.setOwnerColumn(owner);

    td = $('<td></td>');
    var date_created = $('<span></span>');
    date_created.append(project.getCreatedDateString());
    td.addClass(ProjectTable.date_column_classes);
    td.append(date_created);
    tr.append(td);
    project_row.setDateCreatedColumn(date_created);

    project.addTableRow(table, project_row);

    function update_colors () {
        if (project.user_vote !== null && project.user_vote.direction === "up") {
            upvote_icon.addClass('up');
            downvote_icon.removeClass('down');
        } else if (project.user_vote !== null && project.user_vote.direction === "down") {
            upvote_icon.removeClass('up');
            downvote_icon.addClass('down');
        } else {
            upvote_icon.removeClass('up');
            downvote_icon.removeClass('down');
        }
    }
    update_colors();


    upvote_icon.click(function (){
        ProjectEventListener.upvote(project, null, function () {
            score.empty();
            score.append(project.getProjectScore());
            update_colors();
        }, true);
    });

    downvote_icon.click(function (){
        ProjectEventListener.downvote(project, null, function () {
            score.empty();
            score.append(project.getProjectScore());
            update_colors();
        }, true);
    });

    return project_row;

};


ProjectTable.addToUserSideTable = function (project) {
  var row = project.getTableRow(ProjectTable.USER_SIDEBAR);
  if (!row)
      row = ProjectTable.buildSideTableRow(ProjectTable.USER_SIDEBAR, project);
    ProjectTable.my_table_body_side.append(row.getTableRow());
};

ProjectTable.addToUserSideTableRanked = function (project) {
  var row = project.getTableRow(ProjectTable.USER_RANKED_SIDEBAR);
  if (!row)
      row = ProjectTable.buildSideTableRankedRow(ProjectTable.USER_RANKED_SIDEBAR, project);
    ProjectTable.my_table_body_ranked.append(row.getTableRow());
};

ProjectTable.addToUserProfileTable = function (project) {
  var row = project.getTableRow(ProjectTable.USER_RANKED_SIDEBAR);
  if (!row)
      row = ProjectTable.buildSideTableRankedRow(ProjectTable.USER_RANKED_SIDEBAR, project);
    ProjectTable.recent_posts_table.append(row.getTableRow());
};

ProjectTable.addToUserTable = function (project) {
    var row = project.getTableRow(ProjectTable.USER);
    if (!row)
        row = ProjectTable.buildTableRow(ProjectTable.USER, project);
    ProjectTable.my_table_body.append(row.getTableRow());

};

ProjectTable.addToSharedTable = function (project) {
    var row = project.getTableRow(ProjectTable.SHARED);
    if (!row)
        row = ProjectTable.buildTableRow(ProjectTable.SHARED, project);
    ProjectTable.shared_table_body.append(row.getTableRow());
};

ProjectTable.addToWorldSharedTable = function (project) {
    var row = project.getTableRow(ProjectTable.WORLD_SHARED);
    if (!row)
        row = ProjectTable.buildTableRow(ProjectTable.WORLD_SHARED, project);
    ProjectTable.world_table_body.append(row.getTableRow());
};

ProjectTable.addToSearchTable = function (project) {
    var row = project.getTableRow(ProjectTable.SEARCH);
    if (!row)
        row = ProjectTable.buildTableRow(ProjectTable.SEARCH, project);
    row.hide();
    ProjectTable.search_table_body.append(row.getTableRow());
};

ProjectTable.showSearchTab = function () {
    ProjectTable.search_tab.removeClass('hidden');
    ProjectTable.search_tab.children()[0].click()
};

ProjectTable.hideSearchTab = function () {
    ProjectTable.search_tab.addClass('hidden');
    ProjectTable.my_tab.children()[0].click();
};

ProjectTable.showSearchProjects = function (projects) {
    for (var i = 0; i < projects.length; i++)
        projects[i].getTableRow(ProjectTable.SEARCH).show();
};

ProjectTable.hideSearchProjects = function (projects) {
    for (var i = 0; i < projects.length; i++)
        projects[i].getTableRow(ProjectTable.SEARCH).hide();
};

ProjectTable.hideAllSearchProjects = function () {
    var projects = Project.getProjects();
    for (var i = 0; i < projects.length; i++)
        projects[i].getTableRow(ProjectTable.SEARCH).hide();
};

ProjectTable.loadUserProjects = function () {
    var project_refresh_btn = $("#refresh_project_tb");
    project_refresh_btn.html('<i class="fa fa-spinner fa-spin"></i>');
    if (ProjectTable.is_loading_project)
        return;
    ProjectTable.is_loading_project = true;
    console.debug('Loading user projects');
    ProjectTable.is_loading_project = true;
    Project.getUserProjects(User.getCurrent(), function (projects) {
        ProjectTable.loadTables(projects);
        ProjectTable.is_loading_project = false;
        project_refresh_btn.html('<i class="fa fa-refresh"></i>');
    });
};

ProjectTable.getCurrentTableCheckProjects = function () {
    return ProjectTable.getCheckedProjects(ProjectTable.current_tab);
};

ProjectTable.getCheckedProjects = function (table) {
    var checked_projects = [];
    var projects = Project.getProjects();
    for (var i = 0; i < projects.length; i++) {
        var table_row = projects[i].getTableRow(table);
        if (table_row && table_row.getCheckbox().is(':checked')) {
            checked_projects.push(projects[i]);
        }
    }
    return checked_projects;
};

ProjectTable.deleteCheckedProjectsShortcut = function () {
    Notify.confirm('Are you sure you want to delete these projects?', function (result) {
        if (result) {
            ProjectTable.deleteCheckedProjects();
        }
    });
};

ProjectTable.deleteCheckedProjects = function () {
    Notify.confirm('Are you sure you want to delete these projects?', function (result) {
        if (result) {
            var projects = ProjectTable.getCurrentTableCheckProjects();
            for (var i = 0; i < projects.length; i++) {
                ProjectEventListener.deleteMouseClickHomePage(projects[i]);
                var row = projects[i].getTableRow(ProjectTable.USER);
                if (row)
                    row.getTableRow().remove();
                row = projects[i].getTableRow(ProjectTable.SHARED);
                if (row)
                    row.getTableRow().remove();
                row = projects[i].getTableRow(ProjectTable.WORLD_SHARED);
                if (row)
                    row.getTableRow().remove();
                row = projects[i].getTableRow(ProjectTable.SEARCH);
                if (row)
                    row.getTableRow().remove();
            }

            for (i = 0; i < projects.length; i++)
                Project.remove(projects[i]);
        }
    });
};


function ProjectTableRow () {
    this.tr = null;
    this.checkbox_td = null;
    this.vote_td = null;
    this.score_td = null;
    this.title_td = null;
    this.owner_td = null;
    this.last_modified_td = null;
    this.date_created_td = null;
}

ProjectTableRow.prototype.setTableRow = function (tr) {
    this.tr = tr;
};

ProjectTableRow.prototype.getTableRow = function () {
    return this.tr;
};

ProjectTableRow.prototype.setCheckboxColumn = function (checkbox) {
    this.checkbox_td = checkbox;
};

ProjectTableRow.prototype.getCheckbox = function () {
    return this.checkbox_td;
};

ProjectTableRow.prototype.setVoterColumn = function (vote) {
    this.vote_td = vote;
};

ProjectTableRow.prototype.getVoterColumn = function () {
    return this.vote_td;
};
ProjectTableRow.prototype.setScoreColumn = function (score) {
    this.score_td = score;
};

ProjectTableRow.prototype.getScoreColumn = function () {
    return this.score_td;
};

ProjectTableRow.prototype.setVoterColumn = function (vote) {
    this.vote_td = vote;
};

ProjectTableRow.prototype.getVoterColumn = function () {
    return this.vote_td;
};
ProjectTableRow.prototype.setScoreColumn = function (score) {
    this.score_td = score;
};

ProjectTableRow.prototype.getScoreColumn = function () {
    return this.score_td;
};

ProjectTableRow.prototype.setTitleColumn = function (name) {
    this.title_td = name;
};

ProjectTableRow.prototype.getTitleColumn = function () {
    return this.title_td;
};

ProjectTableRow.prototype.setOwnerColumn = function (owner) {
    this.owner_td = owner;
};

ProjectTableRow.prototype.getOwnerColumn = function () {
    return this.owner_td;
};

ProjectTableRow.prototype.setLastModifiedColumn = function (ts) {
    this.last_modified_td = ts;
};

ProjectTableRow.prototype.getLastModifiedColumn = function () {
    return this.last_modified_td;
};

ProjectTableRow.prototype.setDateCreatedColumn = function (ts) {
    this.date_created_td = ts;
};

ProjectTableRow.prototype.getDateCreatedColumn = function () {
    return this.date_created_td;
};

ProjectTableRow.prototype.hide = function () {
    this.tr.addClass('hidden');
};

ProjectTableRow.prototype.show = function () {
    this.tr.removeClass('hidden');
};
