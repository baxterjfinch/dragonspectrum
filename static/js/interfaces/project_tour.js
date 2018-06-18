function play_guided_tour() {

    // close the PVS to help with tour dialog placement
    PVS.close();

    // disable the shortcuts while the guided tour is running
    Shortcut.pause();

    bootstro.start('', {
        finishButtonText: 'Finish',
        items: [
            {
                selector: "#tvs",
                title: "Tree View",
                content: "<p>This is the Tree View, where you will see all of the project Concepts arranged in a tree.</p>" +
                    "<p><i class='fa fa-check-square-o'></i> Check or un-check the <em>Concept visibility checkbox</em> to show or hide the Concept in the current Document.</p>" +
                    "<p>Click the <i class='fa fa-plus-square-o'></i> or <i class='fa fa-minus-square-o'></i> to expand or collapse a node in the tree.</p>" +
                    "<p>In the tree, Concept types are identified by the following icons:" +
                    "<p><i class='fa fa-file-o'></i> General Concept</p>" +
                    "<p><i class='fa fa-header'></i> Heading</p>" +
                    "<p><i class='fa fa-paragraph'></i> Paragraph (Concept with children)</p>" +
                    "<p><i class='fa fa-link'></i> Linked Concept</p>" +
                    "<p><i class='fa fa-list-ul'></i> Unordered list</p>" +
                    "<p><i class='fa fa-list-ol'></i> Ordered list</p>" +
                    "<p><i class='fa fa-shield security-icon'></i> Concept with an explicit security configuration</p>",
                placement: "right",
                step: 0
            },
            {
                selector: "#right-pane",
                title: "Document View",
                content: "<p>This is the Document View, where you will see the Project Concepts in a human readable, paragraph form.</p>" +
                    "<p><i class='fa fa-angle-double-right' style='color: cornflowerblue;'></i> Concept which has children below it.  Click on the double arrow icon to expand the child Concepts.</p>" +
                    "<p><i class='fa fa-comment' style='color: #00ace6;'></i> Concept with a comment</p>" +
                    "<p><i class='fa fa-comments' style='color: #00ace6;'></i> Concept with multiple comments</p>" +
                    "<p><i class='fa fa-comment' style='color: #d0d0d0;'></i> Concept with a comment below it which are not currently visible</p>" +
                    "<p><i class='fa fa-comments' style='color: #d0d0d0;'></i> Concept with multiple comments below it which are not currently visible</p>" +
                    "<p>To view a list of all comments for the current Document, click on the <button class='btn btn-default btn-xs' disabled='disabled'><i class='fa fa-comments' style='color: #428bca;'></i></button> Comments tab in the Properties View at the bottom of the screen <i class='fa fa-hand-o-down fa-flip-horizontal'></i></i></p>",
                placement: "left",
                step: 1
            },
            {
                selector: "#dvs-tabs-container",
                title: "Document Tabs",
                content: "<p>There's a tab for each Document in the Project.</p>" +
                    "<p><strong>Each Document targets a different audience</strong>, allowing you and your team to focus on the best phrasings for each audience.</p>" +
                    "<p><i class='fa fa-shield security-icon'></i> Document with an explicit security configuration</p>",
                placement: "bottom",
                step: 2
            },
            {
                selector: "#pvs",
                title: "Properties View",
                content: "<p>This is the Properties View, where you can view detailed information about the current Project.</p>" +
                    "<p><i class='fa fa-expand'></i> Click on one of the tabs or the the expand button on the far right to open the Properties View.</p>" +
                    "<p><i class='fa fa-folder-open-o' style='color:#428bca'></i> Document information</p>" +
                    "<p><i class='fa fa-file-o' style='color:#428bca'></i> Concept information</p>" +
                    "<p><i class='fa fa-file-text-o' style='color:#428bca'></i> Phrasing information" +
                    "<p><i class='fa fa-users' style='color:#428bca'></i> Collaborate with other users in the current Document</p>" +
                    "<p><i class='fa fa-comments' style='color:#428bca'></i> View Comments in the current Document</p>" +
                    "<p><i class='fa fa-cloud' style='color: lime;'></i> The status icon shows server update activity</p>",
                placement: "top",
                step: 3
            },
            {
                selector: "#help_dropdown",
                title: "Help",
                content: "<p>For more information and help, please see the <i class='fa fa-life-saver'></i> Help Menu where you can:</p>" +
                    "<p><i class='fa fa-info-circle'></i> View general info about thinkTank</p>" +
                    "<p><i class='fa fa-search'></i> Get help with search</p>" +
                    "<p><i class='fa fa-youtube-play'></i> Watch Tutorial Videos</p>" +
                    "<p><i class='fa fa-info-circle'></i> Open the User Guide</p>" +
                    "<p><i class='fa fa-road'></i> Re-run this guided tour</p>" +
                    "<p><i class='fa fa-keyboard-o'></i> View a list of keyboard shortcuts</p>",
                placement: "bottom",
                step: 4
            }

        ],
        onStep: function(parms) {
            if (parms.idx == 4) {
                mark_guided_tour_complete();
            }
        },
        onExit: function(parms) {
            // got to reload the shortcuts (keybindings)!
            Shortcut.unpause();
        }
    });
}

function show_guided_tour_offering() {

    $.smallBox({
        title : "New User!",
        content : "<p id='guided-tour-offering'>It appears that you are a new user.  We recommend a quick guided tour of the project page to improve your experience.</p>" +
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
    post_to_server(ACCOUNT_URLS.tour_project_complete, null, true);
}