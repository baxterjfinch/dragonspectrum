function PVS() {}

PVS.pvs = $('#pvs');
PVS.pvs_tabs = $('.pvs_tabs');
PVS.pvs_tabs_links = $('.pvs-tabs li a');
PVS.pvs_toggle_btn = $("#pvs-toggle");
PVS.pvs_toggle_btn_icon = $('#pvs-toggle > i');
PVS.properties_view = $("#properties_view");
PVS.properties_view_div = $("#properties_view > div");
PVS.properties_view_div_min = '0px';
PVS.properties_view_div_max = '163px';
PVS.pvs_tabs_content = $('#pvs-tabs-content');

PVS.toggle_image_btn = $("#toggle_image");
PVS.group_chat_input = $('#grp_chat_input');
PVS.edit_mode_icon = $("#edit-mode");

PVS.document_tab = $('#document_pvs_tab');
PVS.document_properties_table = $('#doc_prop_body');

PVS.concept_tab = $('#concept_pvs_tab');
PVS.concept_properties_table = $('#con_prop_body');

PVS.phrasing_tab = $('#phrasing_pvs_tab');
PVS.phrasing_table = $('#pvs_phrasing_table');
PVS.phrasing_properties_table = $('#phr_prop_body');

PVS.collaboration_tab = $('#collaboration_pvs_tab');
PVS.comments_tab = $('#comments_pvs_tab');
PVS.search_tab = $('#search_pvs_tab');

PVS.min_height = 27;
PVS.height = PVS.min_height;
PVS.is_open = false;
PVS.current_tab = null;

PVS.initialize = function () {
    // Setup the click events for the PVS tabs
    PVS.pvs_tabs_links.click(function (e) {
        e.preventDefault();
        PVS.handlePvsTabClick($(this));
    });

    // Setup the click events for PVS buttons
    PVS.pvs_toggle_btn.click(function () {
        PVS.toggleOpenState();
    });
    PVS.toggle_image_btn.click(function () {
        DVS.toggleImages();
    });

    // Setup Group chat
    PVS.group_chat_input.focus(function () {
        Shortcut.set('document_chat');
    });
    PVS.group_chat_input.blur(function () {
        Shortcut.set('dvs');
    });

    // Setup Annotations
    Annotation.initPvs();
};

PVS.handlePvsTabClick = function (tab_link) {
    // if open and current tab clicked: close
    if (PVS.is_open && tab_link.attr('id') == PVS.current_tab) {
        PVS.close();
    } else {
        tab_link.tab('show');
        PVS.open();
        PVS.current_tab = tab_link.attr('id');
    }
};

PVS.loadConceptPhrasingList = function (concept) {
    var tbody = PVS.phrasing_table.children('tbody');
    tbody.empty();

    var phrasings = concept.getPhrasings();
    var document = Document.getCurrent();
    var current_phrasing = concept.getDocumentPhrasing(document);
    var row;
    var sel_col;
    var phr_col;
    var btn_col;
    var btn_div;
    for (var i = 0; i < phrasings.length; i++) {
        var phrase = phrasings[i].getText();
        if (phrase.trim() == '' && concept.getDocumentAttribute(
                Project.getCurrentDocument()).isImage())
            phrase = '&lt;&lt;no caption&gt;&gt;';

        row = $('<tr></tr>');
        sel_col = $('<td ></td>');
        sel_col.attr('width', 5);
        if (phrasings[i] == current_phrasing)
            sel_col.html('<i class="fa fa-check"></i>');
        row.append(sel_col);

        phr_col = $('<td></td>');
        phr_col.attr('id', phrasings[i].getId());
        phr_col.html(phrase);
        row.append(phr_col);

        // FIXME: this button is not showing up, I don't know what is it for so I can't fix it.
        btn_col = $('<td></td>');
        row.append(btn_col);

        btn_div = $('<div></div>');
        btn_div.addClass('btn-group pvs-phrasing-action-buttons');
        btn_col.append(btn_div);

        tbody.append(row);
    }
    PVS.setPhrasingProperties(current_phrasing);
};

PVS.setPhrasingProperties = function (phrasing) {
    PVS.phrasing_properties_table.empty();

    var row = $('<tr></tr>');
    var col1 = $('<td></td>');
    var col2 = $('<td></td>');
    col1.append('Owners');
    col2.append(phrasing.getOwners().join(' '));
    PVS.phrasing_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Created Date');
    col2.append(phrasing.getCreatedDateString());
    PVS.phrasing_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Modified Date');
    col2.append(phrasing.getModifiedDateString());
    PVS.phrasing_properties_table.append(row.append(col1).append(col2));
};

PVS.setConceptProperties = function (concept) {
    PVS.concept_properties_table.empty();

    var row = $('<tr></tr>');
    var col1 = $('<td></td>');
    var col2 = $('<td></td>');

    if (concept.isLinked()) {
        col1.append('Linked');
        col2.append('True');
        PVS.concept_properties_table.append(row.append(col1).append(col2));
        row = $('<tr></tr>');
        col1 = $('<td></td>');
        col2 = $('<td></td>');
    }

    col1.append('Owners');
    col2.append(concept.getOwners().join(' '));
    PVS.concept_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Created Date');
    col2.append(concept.getCreatedDateString());
    PVS.concept_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Modified Date');
    col2.append(concept.getModifiedDateString());
    PVS.concept_properties_table.append(row.append(col1).append(col2));
};

PVS.setDocumentProperties = function (document) {
    PVS.document_properties_table.empty();

    var row = $('<tr></tr>');
    var col1 = $('<td></td>');
    var col2 = $('<td></td>');
    col1.append('Title');
    col2.append(document.getTitle());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Subtitle');
    col2.append(document.getSubtitle());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Owners');
    col2.append(document.getOwners().join(' '));
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Created Date');
    col2.append(document.getCreatedDateString());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Modified Date');
    col2.append(document.getModifiedDateString());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Author');
    col2.append(document.getAuthor());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Date');
    col2.append(document.getDate());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Version');
    col2.append(document.getVersion());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Copyright');
    col2.append(document.getCopyright());
    PVS.document_properties_table.append(row.append(col1).append(col2));

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    col1.append('Description');
    col2.append(document.getDescription());
    PVS.document_properties_table.append(row.append(col1).append(col2));
};

PVS.activateTab = function (tab) {
    tab.click();
};

PVS.open = function () {

    PVS.pvs_toggle_btn_icon.removeClass('fa-expand fa-compress').addClass('fa-compress');
    PVS.is_open = true;
    PVS.height = 190;
    PVS.pvs_tabs_content.show();

    PVS.properties_view_div.css('height', PVS.properties_view_div_max);
    PVS.pvs.css("max-height", PVS.height + "px").css("height", PVS.height + "px");
    DVS.resizeDVS();
};

PVS.close = function () {
    PVS.pvs_toggle_btn_icon.removeClass('fa-expand fa-compress').addClass('fa-expand');

    PVS.is_open = false;
    PVS.pvs_tabs_content.hide();

    PVS.height = PVS.min_height;
    PVS.pvs.css("height", PVS.height + "px");
    PVS.properties_view_div.css('height', PVS.properties_view_div_min);
    DVS.resizeDVS();
};

PVS.isOpen = function () {
    return PVS.is_open;
};

PVS.showEditModel = function () {
    PVS.edit_mode_icon.show();
};

PVS.hideEditModel = function () {
    PVS.edit_mode_icon.hide();
};

PVS.hideSearchTab = function () {
    PVS.document_tab.children().click();
    PVS.close();
    PVS.search_tab.addClass('hidden');
};

PVS.selectSearchTab = function () {
    PVS.open();
    PVS.search_tab.removeClass('hidden');
    // if tab isn't active, then click it
    if (!PVS.search_tab.hasClass('active')) {
        PVS.search_tab.children().click()
    }
};

PVS.selectCommentTab = function () {
    PVS.open();
    PVS.comments_tab.removeClass('hidden');
    // if tab isn't active, then click it
    if (!PVS.comments_tab.hasClass('active')) {
        PVS.comments_tab.children().click()
    }
};

PVS.isCollabTabActive = function () {
    return PVS.collaboration_tab.parent().hasClass('active');
};

PVS.toggleOpenState = function () {
    if (PVS.is_open) {
        PVS.close();
    } else {
        PVS.open();
    }
};
