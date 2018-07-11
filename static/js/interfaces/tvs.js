function TVS () {}

TVS.in_use = false;
TVS.tree = $("#tree");
TVS.tvs = $('#tvs');
TVS.scrollbar = $("#scrollbar-tv");
TVS.root = null;

/**
 * TVS Toolbar buttons
 */
TVS.toolbar_new_btn = $('#tvs-tool-bar-new');
TVS.toolbar_del_btn = $('#tvs-tool-bar-del');
TVS.toolbar_indent_btn = $('#tvs-tool-bar-indent');
TVS.toolbar_outdent_btn = $('#tvs-tool-bar-outdent');
TVS.toolbar_move_up_btn = $('#tvs-tool-bar-move-up');
TVS.toolbar_move_down_btn = $('#tvs-tool-bar-move-down');
TVS.toolbar_expand_btn = $('#tvs-tool-bar-expand');
TVS.toolbar_collapse_btn = $('#tvs-tool-bar-collapse');
TVS.toolbar_security_btn = $('#tvs-tool-bar-security');

TVS.initialize = function () {
    TVS.in_use = true;
    var options = {
        checkbox: true,
        selectmode: 3,
        clickFolderMode: 1,
        keyboard: false,
        autoFocus: false,
        onCustomRender: TVS._onCustomRender,
        onSelect: TVS._onSelect,
        onPostInit: TVS._onPostInit,
        onActivate: TVS._onActivate,
        onExpand: TVS._onExpand,
        onRender: TVS._onRender
    };

    TVS.tree.dynatree(options);
    TVS.setRoot(TVS.tree.dynatree('getRoot'));
    Project.getProject().setTvsNode(TVS.getRoot());

    TVS.toolbar_new_btn.click(function () {
        ConceptEventListener.createMouseClick();
    });
    TVS.toolbar_del_btn.click(function () {
        ConceptEventListener.deleteMouseClick();
    });
    TVS.toolbar_indent_btn.click(function () {
        ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_RIGHT)
    });
    TVS.toolbar_outdent_btn.click(function () {
        ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_LEFT)
    });
    TVS.toolbar_move_up_btn.click(function () {
        ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_UP)
    });
    TVS.toolbar_move_down_btn.click(function () {
        ConceptEventListener.moveByDirection(Concept.getCurrent(), ConceptEventListener.MOVE_DIRECTION_DOWN)
    });
    TVS.toolbar_expand_btn.click(function () {
        ConceptEventListener.expandMouseClick(Concept.getCurrent());
    });
    TVS.toolbar_collapse_btn.click(function () {
        ConceptEventListener.collapseMouseClick(Concept.getCurrent());
    });
    TVS.toolbar_security_btn.click(function () {
        ProjectEventListener.setPermissionsMouseClick(Concept.getCurrent());
    });
    TVS.setProjectSecurityIconColor(Project.getProject().getPermissions().hasExplicitPermissions());
};

TVS.setProjectSecurityIconColor = function (flag) {
    if (flag)
        TVS.toolbar_security_btn.addClass('perms-set');
    else
        TVS.toolbar_security_btn.removeClass('perms-set');
};

TVS.inUse = function () {
    return TVS.in_use;
};

TVS.setRoot = function (root) {
    TVS.root = root;
};

TVS.getRoot = function () {
    return TVS.root;
};

TVS.redraw = function () {
    TVS.getRoot().render();
    TVS.updateScrollPosition();

    $('.activate_concept_bullet').removeClass('activate_concept_bullet');
    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION && PresentationRender.current_slide) {
        var bullets = PresentationRender.current_slide.getBullet();
        for (var b = 0; b < bullets.length; b++) {
            $('#' + bullets[b].getId() + '-tvs').addClass('activate_concept_bullet');
        }
    }
};

TVS.createNode = function (concept) {
    var parent = concept.getParent();
    var parentTvsNode = parent.getTvsNode();
    if (!parentTvsNode)
        throw 'parent does not have a tvsNode';

    var document = Document.getCurrent();
    var crawlcontext = concept.getDocumentCrawlContext(document);

    var next_concept = concept.getNextSibling();

    var tvsNode = parentTvsNode.addChild({
        title: concept.getDocumentPhrasing(document),
        idFolder: concept.isParent(),
        icon: false,
        expand: false,
        concept: concept,
        select: ((crawlcontext != null) ? crawlcontext.getCrawl() : true)
    }, ((next_concept) ? next_concept.getTvsNode() : null));

    concept.setTvsNode(tvsNode);
};

/**
 * TVS Callback functions
 */
TVS._onCustomRender = function (tvsNode) {
    var icon = '';
    var document = Document.getCurrent();
    var concept = tvsNode.data.concept;
    var attribute = concept.getDocumentAttribute(document);
    var dvsRender = concept.getDvsRender();
    var title = concept.getDocumentPhrasing(document).getText();
    var cscore = concept.getConceptScore();

    if (concept.user_vote !== null) {
        console.log("*************************" + concept.user_vote.direction);
    }

    if (concept.user_vote !== null && concept.user_vote.direction === "up") {
        $(tvsNode).find("#change-vote-up-" + concept.id).addClass("up");
    } else {
        $(tvsNode).find("#change-vote-down-" + concept.id).addClass("down");
    }

    // main icon
    if (concept.isQueuedLoading()) {
        icon = '<i class="fa fa-clock-o"></i>';
    } else if (concept.isBeingFetched()) {
        icon = '<i class="fa fa-spinner fa-spin"></i>';
    } else if (concept.isLinked() || concept.isChildOfLinked()) {
        icon = '<i class="fa fa-link tvs-icon"></i>';
    } else if (dvsRender.isRenderedHeader()) {
        icon = '<i class="fa fa-header tvs-icon"></i>';
    } else if (dvsRender.isRenderedOrderedList()) {
        icon = '<i class="fa fa-list-ol tvs-icon"></i>';
    } else if (dvsRender.isRenderedUnorderedList()) {
        icon = '<i class="fa fa-list-ul tvs-icon"></i>';
    } else if (dvsRender.isRenderedOrderedListItem()) {
        icon = '<strong>#</strong>';
    } else if (dvsRender.isRenderedUnorderedListItem()) {
        icon = '<i class="fa fa-circle tvs-icon"></i>';
    } else if (dvsRender.isRenderedParagraph()) {
        icon = '<a id="cscorer"></a>';
    } else if (concept.isParent()) {
        icon = '<i class="fa fa-files-o tvs-icon"></i>';
    } else if (attribute && attribute.isImage()) {
        icon = '<i class="fa fa-picture-o tvs-icon"></i>';
    } else {
        icon = '<i class="fa fa-comments tvs-icon"></i>';
    }

    // security icon
    var sec_icon = '';
    if (concept.getPermissions().hasExplicitPermissions())
        sec_icon = Permission.security_icon;

    if (attribute && attribute.isImage() && title.trim() == '') {
        title = 'Image';
    }

    var users = CollaborationUser.get_by_concept(concept);
    var user_classes = '';
    if (users)
        for (var i = 0; i < users.length; i++)
            user_classes += users[i].getClassSpan() + ' ';


    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION)
        var classes = 'presentation_span';
    else
        classes = 'node_context';

    return ' ' + '<i class="fa fa-chevron-circle-up concept-up"  data-concept="' + concept.id + '"' + 'id="change-vote-up-' + concept.id + '" onclick="ConceptEventListener.upvoteMouseClick(this)" ></i>' +
        '<span id="cscore-' + concept.id + '">' + cscore + '</span>' + '<i class="fas fa-chevron-circle-down concept-down" data-concept="' + concept.id + '"' + 'id="change-vote-down-' + concept.id +  '"  onclick="ConceptEventListener.downvoteMouseClick(this)" ></i>' + ' ' +
        '<a class="' + classes + ' ' + user_classes + '" id="' + concept.getId() + '-tvs" class="dynatree-title" href="#">' + title + '</a>';
};

TVS._onSelect = function (select, tvsNode, over_ride_summary) {
    var concept = tvsNode.data.concept;
    var doc = Document.getCurrent();
    if (doc.getState() == Document.STATE_SUMMARY) {
        if (over_ride_summary) {
            var crawlcontext = concept.getSummaryCrawlContextByDocId(doc.getSummaryDocument().getId());
            if (crawlcontext)
                SummaryCrawlcontextEventListener.toggleState(crawlcontext);
        }
    } else if (doc.getState() == Document.STATE_PRESENTATION) {
        if (over_ride_summary) {
            crawlcontext = concept.getPresentationCrawlContextByDocId(doc.getPresentationDocument().getId());
            if (crawlcontext)
                PresentationCrawlcontextEventListener.toggleState(crawlcontext);
        }
    } else {
        if (select) {
            CrawlcontextEventListener.showTvsMouseClick(tvsNode.data.concept);
        } else {
            CrawlcontextEventListener.hideTvsMouseClick(tvsNode.data.concept);
        }
    }
};

TVS._onPostInit = function (inReloading, isError) {

};

TVS._onActivate = function (tvsNode) {
    var concept = tvsNode.data.concept;
    if (concept.isActivated())
        return;

    ConceptEventListener.activeTVS(concept);

    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION) {
        if (concept.pres_heading)
            PresentationRender.root_renderObj.div.jmpress('select', '#' + concept.getId() + '-slide');
        else if (concept.pres_li)
            PresentationRender.root_renderObj.div.jmpress('select', '#' + concept.getParent().getId() + '-slide');
    }
};

TVS._onExpand = function (flag, tvsNode) {
    var concept = tvsNode.data.concept;
    if (flag) {
        if (concept.isExpanded())
            return;
        ConceptEventListener.expandTree(concept);
    } else {
        if (!concept.isExpanded())
            return;
        ConceptEventListener.collapseTVS(concept);
    }
};

TVS._onRender = function (tvsNode, nodeSpan) {
    var concept = tvsNode.data.concept;
    var doc = Document.getCurrent();

    if (doc.getState() == Document.STATE_SUMMARY) {

        $(nodeSpan).find('.dynatree-checkbox').unbind();
        $(nodeSpan).find('.dynatree-checkbox').click(function () {
            if ($(nodeSpan).hasClass('dynatree-selected')) {
                $(nodeSpan).removeClass('dynatree-selected');
                TVS._onSelect(false, tvsNode, true);
            } else {
                $(nodeSpan).addClass('dynatree-selected');
                TVS._onSelect(true, tvsNode, true);
            }
        });

        var crawlcontext = concept.getSummaryCrawlContextByDocId(doc.getSummaryDocument().getId());
        if (crawlcontext) {
            if (crawlcontext.isTemp()) {
                $(nodeSpan).addClass('summ-auto');
            } else {
                if (crawlcontext.getCrawl() && !crawlcontext.isRendered())
                    $(nodeSpan).addClass('summ-over');
            }
            tvsNode.select(crawlcontext.getCrawl());
        } else {
            crawlcontext = new SummaryCrawlContext();
            crawlcontext.setId(Util.generateUUID1());
            crawlcontext.setDocument(doc.getSummaryDocument());
            crawlcontext.setConcept(concept);
            crawlcontext.setCrawl(false);
            crawlcontext.setTemp(true);
            concept.addSummaryCrawlContext(crawlcontext);
            $(nodeSpan).addClass('summ-auto');
            tvsNode.select(false);
        }
    } else if (doc.getState() == Document.STATE_PRESENTATION) {
        $(nodeSpan).find('.dynatree-checkbox').unbind();
        $(nodeSpan).find('.dynatree-checkbox').click(function () {
            if ($(nodeSpan).hasClass('dynatree-selected')) {
                $(nodeSpan).removeClass('dynatree-selected');
                TVS._onSelect(false, tvsNode, true);
            } else {
                $(nodeSpan).addClass('dynatree-selected');
                TVS._onSelect(true, tvsNode, true);
            }
        });

        $(nodeSpan).find('.presentation_span').data('concept', concept);

        crawlcontext = concept.getPresentationCrawlContextByDocId(doc.getPresentationDocument().getId());
        if (crawlcontext) {
            if (crawlcontext.isTemp()) {
                $(nodeSpan).addClass('summ-auto');
            } else {
                if (crawlcontext.getCrawl() && !crawlcontext.isRendered())
                    $(nodeSpan).addClass('summ-over');
            }
            tvsNode.select(crawlcontext.getCrawl());
        } else {
            crawlcontext = new PresentationCrawlContext();
            crawlcontext.setId(Util.generateUUID1());
            crawlcontext.setDocument(doc.getPresentationDocument());
            crawlcontext.setConcept(concept);
            crawlcontext.setCrawl(false);
            crawlcontext.setTemp(true);
            concept.addPresentationCrawlContext(crawlcontext);
            $(nodeSpan).addClass('summ-auto');
            tvsNode.select(false);
        }
    }
};

TVS.previous_concept_node = null;
TVS.updateScrollPosition = function (concept) {
    if (!concept)
        concept = Concept.getCurrent();

    if (!concept)
        return;

    var node = $('#' + concept.getId() + '-tvs');
    if (!node || node.length == 0)
        return;
    var node_top = node.position().top;
    var tv_scroll_top = TVS.scrollbar.scrollTop();
    var tv_top = TVS.scrollbar.position().top;
    var tv_height = TVS.scrollbar.innerHeight();
    var tv_total_height = tv_top + tv_height;
    var context_padding = tv_height * 0.2;

    if (node_top < (tv_top + context_padding)) {
        if (node_top > 0)
            var difference = (tv_top + context_padding) - node_top;
        else
            difference = (tv_top + context_padding) + (node_top * -1);

        TVS.scrollbar.animate({scrollTop: tv_scroll_top - difference}, 0);
    } else if (node_top > (tv_total_height - context_padding)) {
        difference = node_top - (tv_total_height - context_padding);
        TVS.scrollbar.animate({scrollTop: tv_scroll_top + difference}, 0);
    }
};