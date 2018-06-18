
function LinkProxy() {
    this.id = null;
    this.created_ts = null;
    this.modified_ts = null;
    this.concept = null;
    this.parent = null;
    this.document = null;
    this.distilled_document = null;
    this.project_id = null;
    this.init_index = null;
    this.is_deleted = false;
    this.is_expanded = null;
    this.is_activated = false;
    this.node = null;
}

LinkProxy.prototype.initLinkProxy = function (link) {
    this.id = link.id;
    this.created_ts = link.created_ts;
    this.modified_ts = link.modified_ts;
    this.project_id = link.project;
    this.parent = link.parent;
    this.concept = link.concept;
    this.document = link.document;
    this.distilled_document = link.distilled_document;
    this.init_index = link.index;
    this.setDvsRender(new DVSRenderObj());
    this.concept.addLinkProxy(this);
    Concept.add(this);
};

LinkProxy.prototype.setNew = function (flag) {
    this.is_new = flag;
};

LinkProxy.prototype.isNew = function () {
    return this.is_new;
};

LinkProxy.prototype.setId = function (id) {
    return this.id = id;
};

LinkProxy.prototype.updateId = function (old_id) {
    if (Concept.concepts[old_id] != null)
        delete Concept.concepts[old_id];
    Concept.concepts[this.getId()] = this;
};

LinkProxy.prototype.getId = function () {
    return this.id;
};

LinkProxy.prototype.getRequestId = function () {
    return this.concept.getId();
};

LinkProxy.prototype.setCreatedTs = function (ts) {
    this.created_ts = ts;
};

LinkProxy.prototype.getCreatedTs = function () {
    return this.created_ts;
};

LinkProxy.prototype.getCreatedDate = function () {
    return new Date(this.created_ts);
};

LinkProxy.prototype.getCreatedDateString = function () {
    return new Date(this.created_ts).toLocaleString();
};

LinkProxy.prototype.setModifiedTs = function (ts) {
    this.modified_ts= ts;
};

LinkProxy.prototype.getModifiedTs = function () {
    return this.modified_ts;
};

LinkProxy.prototype.getModifiedDate = function () {
    return new Date(this.modified_ts);
};

LinkProxy.prototype.getModifiedDateString = function () {
    return new Date(this.modified_ts).toLocaleString();
};

LinkProxy.prototype.modified = function () {
    this.modifiedTs = new Date().getTime();
};

LinkProxy.prototype.getOrganization = function () {
    return this.concept.organization;
};

LinkProxy.prototype.setConcept = function (concept) {
    this.concept = concept;
};

LinkProxy.prototype.getConcept = function () {
    return this.concept;
};

LinkProxy.prototype.getLinkedProjectId = function () {
    return this.concept.getLinkedProjectId();
};

LinkProxy.prototype.setParent = function (parent) {
    this.parent = parent;
};

LinkProxy.prototype.getParent = function () {
    if (this.parent)
        return this.parent;
    return Project.getProject();
};

LinkProxy.prototype.getPathToRoot = function () {
    var path = [];
    var par = this;
    while (!par.isRoot()) {
        path.unshift(par.getId());
        par = par.getParent();
    }
    return path;
};

LinkProxy.prototype.isRoot = function () {
    return false;
};

LinkProxy.prototype.setAnnotations = function (annos) {
    this.concept.setAnnotations(annos);
};

LinkProxy.prototype.getAnnotations = function () {
    return this.concept.getAnnotations();
};

LinkProxy.prototype.addSelectedPhrasing = function (sel_phr) {
    return this.concept.addSelectedPhrasing(sel_phr);
};

LinkProxy.prototype.updateSelectedPhrasingId = function (old_id) {
    return this.concept.updateSelectedPhrasingId(old_id);
};

LinkProxy.prototype.getSelectedPhrasings = function () {
    return this.concept.getSelectedPhrasings();
};

LinkProxy.prototype.getSelectedPhrasing = function (id) {
    return this.concept.getSelectedPhrasing(id);
};

LinkProxy.prototype.getSelectedPhrasingByDocId = function (id, concept) {
    if (concept)
        return concept.getSelectedPhrasingByDocId(id);
    return this.concept.getSelectedPhrasingByDocId(id);
};

LinkProxy.prototype.getSelectedPhrasingByDoc = function (doc) {
    return this.getSelectedPhrasingByDocId(doc.getId());
};

LinkProxy.prototype.getSelectedPhrasingByPhr = function (phr) {
    return this.concept.getSelectedPhrasingByPhr(phr);
};

LinkProxy.prototype.removeSelectedPhrasing = function (sel_phr) {
    return this.concept.removeSelectedPhrasing(sel_phr);
};

LinkProxy.prototype.addSummarySelectedPhrasing = function (sel_phr) {
    return this.concept.addSummarySelectedPhrasing(sel_phr);
};

LinkProxy.prototype.updateSummarySelectedPhrasingId = function (old_id) {
    return this.concept.updateSummarySelectedPhrasingId(old_id);
};

LinkProxy.prototype.getSummarySelectedPhrasings = function () {
    return this.concept.getSummarySelectedPhrasings();
};

LinkProxy.prototype.getSummarySelectedPhrasing = function (id) {
    return this.concept.getSummarySelectedPhrasing(id);
};

LinkProxy.prototype.getSummarySelectedPhrasingByDocId = function (id, concept) {
    if (concept)
        return concept.getSummarySelectedPhrasingByDocId(id);
    return this.concept.getSummarySelectedPhrasingByDocId(id);
};

LinkProxy.prototype.getSummarySelectedPhrasingByDoc = function (doc) {
    return this.getSummarySelectedPhrasingByDocId(doc.getId());
};

LinkProxy.prototype.getSummarySelectedPhrasingByPhr = function (phr) {
    return this.concept.getSummarySelectedPhrasingByPhr(phr);
};

LinkProxy.prototype.removeSummarySelectedPhrasing = function (sel_phr) {
    return this.concept.removeSummarySelectedPhrasing(sel_phr);
};

LinkProxy.prototype.addPresentationSelectedPhrasing = function (sel_phr) {
    return this.concept.addPresentationSelectedPhrasing(sel_phr);
};

LinkProxy.prototype.updatePresentationSelectedPhrasingId = function (old_id) {
    return this.concept.updatePresentationSelectedPhrasingId(old_id);
};

LinkProxy.prototype.getPresentationSelectedPhrasings = function () {
    return this.concept.getPresentationSelectedPhrasings();
};

LinkProxy.prototype.getPresentationSelectedPhrasing = function (id) {
    return this.concept.getPresentationSelectedPhrasing(id);
};

LinkProxy.prototype.getPresentationSelectedPhrasingByDocId = function (id, concept) {
    if (concept)
        return concept.getPresentationSelectedPhrasingByDocId(id);
    return this.concept.getPresentationSelectedPhrasingByDocId(id);
};

LinkProxy.prototype.getPresentationSelectedPhrasingByDoc = function (doc) {
    return this.getPresentationSelectedPhrasingByDocId(doc.getId());
};

LinkProxy.prototype.getPresentationSelectedPhrasingByPhr = function (phr) {
    return this.concept.getPresentationSelectedPhrasingByPhr(phr);
};

LinkProxy.prototype.removePresentationSelectedPhrasing = function (sel_phr) {
    return this.concept.removePresentationSelectedPhrasing(sel_phr);
};

LinkProxy.prototype.addPhrasing = function (phrasing) {
    return this.concept.addPhrasing(phrasing);
};

LinkProxy.prototype.updatePhrasingId = function (old_id) {
    return this.concept.updatePhrasingId(old_id);
};

LinkProxy.prototype.removePhrasing = function (phrasing) {
    return this.concept.removePhrasing(phrasing);
};

LinkProxy.prototype.getPhrasing = function (id) {
    return this.concept.getPhrasing(id);
};

LinkProxy.prototype.getPhrasings = function () {
    return this.concept.getPhrasings();
};

LinkProxy.prototype.getDocumentPhrasing = function (doc, concept) {
    if (doc.getState() == Document.STATE_SUMMARY)
        return this.getSummaryDocumentPhrasing(doc);
    else if (doc.getState() == Document.STATE_PRESENTATION)
        return this.getPresentationDocumentPhrasing(doc);

    var sel_phr;
    var phrasing;

    if ((sel_phr = this.getSelectedPhrasingByDocId(doc.getId(), concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else if ((sel_phr = this.getSelectedPhrasingByDocId(this.document, concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else if ((sel_phr = this.getSelectedPhrasingByDocId(this.distilled_document, concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else {
        phrasing = this.getDistilledPhrasing(concept);
    }

    return phrasing;
};

LinkProxy.prototype.getSummaryDocumentPhrasing = function (doc, concept) {
    var sel_phr;
    var phrasing;

    if ((sel_phr = this.getSummarySelectedPhrasingByDocId(doc.getId(), concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else if ((sel_phr = this.getSelectedPhrasingByDocId(this.document, concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else if ((sel_phr = this.getSelectedPhrasingByDocId(this.distilled_document, concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else {
        phrasing = this.getDistilledPhrasing(concept);
    }

    return phrasing;
};

LinkProxy.prototype.getPresentationDocumentPhrasing = function (doc, concept) {
    var sel_phr;
    var phrasing;

    if ((sel_phr = this.getPresentationSelectedPhrasingByDocId(doc.getId(), concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else if ((sel_phr = this.getSelectedPhrasingByDocId(this.document, concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else if ((sel_phr = this.getSelectedPhrasingByDocId(this.distilled_document, concept)) !== null) {
        phrasing = sel_phr.getPhrasing();
    } else {
        phrasing = this.getDistilledPhrasing(concept);
    }

    return phrasing;
};

LinkProxy.prototype.setDistilledPhrasing = function (phrasing) {
    return this.concept.setDistilledPhrasing(phrasing);
};

LinkProxy.prototype.getDistilledPhrasing = function (concept) {
    if (concept)
        return concept.getDistilledPhrasing();
    return this.concept.getDistilledPhrasing();
};

LinkProxy.prototype.addCrawlContext = function (crawlcontext) {
    return this.concept.addCrawlContext(crawlcontext);
};

LinkProxy.prototype.setCrawlContexts = function (crawlcontexts) {
    for (var i = 0; i < crawlcontexts.length; i ++)
        this.addCrawlContext(crawlcontexts);
};

LinkProxy.prototype.getCrawlContexts = function () {
    return this.concept.getCrawlContexts();
};

LinkProxy.prototype.getCrawlContext = function (id) {
    return this.concept.getCrawlContext(id);
};

LinkProxy.prototype.getCrawlContextByDocId = function (id, concept) {
    if (concept)
        return concept.getCrawlContextByDocId(id);
    return this.concept.getCrawlContextByDocId(id);
};

LinkProxy.prototype.getDocumentCrawlContext = function (doc) {
    var crawlcontext;
    if ((crawlcontext = this.getCrawlContextByDocId(doc.getId())) !== null) {
    } else if ((crawlcontext = this.getCrawlContextByDocId(this.document)) !== null) {
    } else if ((crawlcontext = this.getCrawlContextByDocId(this.distilled_document)) !== null) {}
    return crawlcontext;
};

LinkProxy.prototype.isCrawlable = function (doc) {
    var crawlcontext = this.getDocumentCrawlContext(doc);
    if (crawlcontext) {
        return crawlcontext.getCrawl();
    } else {
        return true; // Default
    }
};

LinkProxy.prototype.isCrawlableByDocId = function (id) {
    var crawlcontext = this.getCrawlContextByDocId(id);
    if (crawlcontext) {
        return crawlcontext.getCrawl();
    } else {
        return true; // Default
    }
};

LinkProxy.prototype.isParentsCrawlable = function (doc) {
    var parent = this.getParent();
    while (!parent.isRoot()) {
        if (!parent.isCrawlable(doc))
            return false;
        parent = parent.getParent();
    }
    return true;
};

LinkProxy.prototype.addSummaryCrawlContext = function (crawlcontext) {
    return this.concept.addSummaryCrawlContext(crawlcontext);
};

LinkProxy.prototype.setSummaryCrawlContexts = function (crawlcontexts) {
    for (var i = 0; i < crawlcontexts.length; i ++)
        this.addSummaryCrawlContext(crawlcontexts);
};

LinkProxy.prototype.getSummaryCrawlContexts = function () {
    return this.concept.getSummaryCrawlContexts();
};

LinkProxy.prototype.getSummaryCrawlContext = function (id) {
    return this.concept.getSummaryCrawlContext(id);
};

LinkProxy.prototype.getSummaryCrawlContextByDocId = function (id, concept) {
    if (concept)
        return concept.getSummaryCrawlContextByDocId(id);
    return this.concept.getSummaryCrawlContextByDocId(id);
};

LinkProxy.prototype.getSummaryDocumentCrawlContext = function (doc) {
    var crawlcontext;
    if ((crawlcontext = this.getSummaryCrawlContextByDocId(doc.getId())) !== null) {
    } else if ((crawlcontext = this.getSummaryCrawlContextByDocId(this.document)) !== null) {
    } else if ((crawlcontext = this.getSummaryCrawlContextByDocId(this.distilled_document)) !== null) {}
    return crawlcontext;
};

LinkProxy.prototype.isSummaryCrawlableByDocId = function (id, default_value) {
    var crawlcontext = this.getSummaryCrawlContextByDocId(id);
    if (crawlcontext) {
        return crawlcontext.isRendered();
    } else {
        if (typeof(default_value) != 'undefined')
            return default_value;
        return true;
    }
};

LinkProxy.prototype.addPresentationCrawlContext = function (crawlcontext) {
    return this.concept.addPresentationCrawlContext(crawlcontext);
};

LinkProxy.prototype.setPresentationCrawlContexts = function (crawlcontexts) {
    for (var i = 0; i < crawlcontexts.length; i ++)
        this.addPresentationCrawlContext(crawlcontexts);
};

LinkProxy.prototype.getPresentationCrawlContexts = function () {
    return this.concept.getPresentationCrawlContexts();
};

LinkProxy.prototype.getPresentationCrawlContext = function (id) {
    return this.concept.getPresentationCrawlContext(id);
};

LinkProxy.prototype.getPresentationCrawlContextByDocId = function (id, concept) {
    if (concept)
        return concept.getPresentationCrawlContextByDocId(id);
    return this.concept.getPresentationCrawlContextByDocId(id);
};

LinkProxy.prototype.getPresentationDocumentCrawlContext = function (doc) {
    var crawlcontext;
    if ((crawlcontext = this.getPresentationCrawlContextByDocId(doc.getId())) !== null) {
    } else if ((crawlcontext = this.getPresentationCrawlContextByDocId(this.document)) !== null) {
    } else if ((crawlcontext = this.getPresentationCrawlContextByDocId(this.distilled_document)) !== null) {}
    return crawlcontext;
};

LinkProxy.prototype.isPresentationCrawlableByDocId = function (id, default_value) {
    var crawlcontext = this.getPresentationCrawlContextByDocId(id);
    if (crawlcontext) {
        return crawlcontext.isRendered();
    } else {
        if (typeof(default_value) != 'undefined')
            return default_value;
        return true;
    }
};

LinkProxy.prototype.setPresentationSlide = function (slide, document) {
    this.concept.setPresentationSlide(slide, document);
};

LinkProxy.prototype.getPresentationSlide = function (document) {
    this.concept.getPresentationSlide(document);
};

LinkProxy.prototype.loadSubChildren = function () {
    var children = this.getChildren();
    var queue = [];
    for (var i = 0; i < children.length; i++) {
        if (children[i].isParent())
            queue.push({con: children[i], priority: true})
    }
    Project.getConceptLoader().queue(queue, Project.renderAll);
};

LinkProxy.prototype.setExpanded = function (flag) {
    this.is_expanded = flag;
    var dvsRender = this.getDvsRender();
    if (flag) {
        if (dvsRender.more_icon)
            dvsRender.more_icon.hide(Concept.more_icon_expand_animation_speed);
        if (dvsRender.anno_parent_icon)
            dvsRender.anno_parent_icon.hide(Concept.more_icon_expand_animation_speed);
        dvsRender.parent_children_span.show(Concept.children_expand_animation_speed).css('display', 'inline');
        dvsRender.children_span.show(Concept.children_expand_animation_speed).css('display', 'inline');
        this.loadSubChildren();
    } else {
        dvsRender.parent_children_span.hide(Concept.children_expand_animation_speed);
        dvsRender.children_span.hide(Concept.children_expand_animation_speed);
        dvsRender.more_icon.show(Concept.more_icon_expand_animation_speed);
        if (dvsRender.anno_parent_icon)
            dvsRender.anno_parent_icon.show(Concept.more_icon_expand_animation_speed);
    }
};

LinkProxy.prototype.isExpanded = function () {
    return this.is_expanded;
};

LinkProxy.prototype.isParentsExpanded = function () {
    var parent = this.getParent();
    while (!parent.isRoot()) {
        if (!parent.isExpanded())
            return false;
        parent = parent.getParent();
    }
    return true;
};

LinkProxy.prototype.hasAnnotations = function () {
    return this.concept.hasAnnotations();
};

LinkProxy.prototype.setCurrentAttribute = function (attr, render_obj) {
    if (!render_obj)
        render_obj = this.dvs_render;
    render_obj.cur_attr = attr;
};

LinkProxy.prototype.getCurrentAttribute = function (render_obj) {
    if (!render_obj)
        render_obj = this.dvs_render;
    return render_obj.cur_attr;
};

LinkProxy.prototype.getDepth = function () {
    return this.getPathToRoot().length - 1;
};

LinkProxy.prototype.getDepthFromExpanded = function () {
    if (!this.isExpanded())
        return 0;
    var depth = 1;
    var parent = this.getParent();
    while (!parent.isRoot() && parent.isExpanded()) {
        depth++;
        parent = parent.getParent();
    }
    return depth;
};

LinkProxy.prototype.isFirstSibling = function () {
    return this.getParent().indexOfChild(this) == 0;
};

LinkProxy.prototype.isLastSibling = function () {
    return this.getParent().indexOfChild(this) == this.getParent().getChildren().length - 1;
};

LinkProxy.prototype.getPreviousSibling = function () {
    if (this.isFirstSibling())
        return null;
    var children = this.getParent().getChildren();
    var pre = children[children.indexOf(this) - 1];
    while (pre && pre.isDeleted())
        pre = pre.getPreviousSibling();
    return pre;
};

LinkProxy.prototype.getNextSibling = function () {
    if (this.isLastSibling())
        return null;
    var children = this.getParent().getChildren();
    var next = children[children.indexOf(this) + 1];
    while (next && next.isDeleted())
        next = next.getNextSibling();
    return next;
};

LinkProxy.prototype.isActivated = function () {
    return this.is_activated;
};

LinkProxy.prototype.setAnnotations = function (annos) {
    this.concept.setAnnotations(annos);
};

LinkProxy.prototype.addAnnotation = function (anno) {
    this.concept.addAnnotation(anno);
};

LinkProxy.prototype.getAnnotations = function () {
    return this.concept.getAnnotations();
};

LinkProxy.prototype.activate = function () {
    this.is_activated = true;
    var cur = Concept.getCurrent();
    if (cur)
        cur.deactivate();
    Concept.active = this;
    var dvsRender = this.getDvsRender();
    if (this.summernote) {
        // Do nothing (no highlight in edit mode)
    } else if (dvsRender.getCurrentRenderedAttribute() == Attribute.IMAGE) {
        dvsRender.img.addClass(Concept.img_active_classes);
        dvsRender.img_icon_span.children().addClass(Concept.con_active_classes);
    } else if (dvsRender.getCurrentRenderedAttribute() == Attribute.HEADER) {
        dvsRender.phr_text_span.addClass(Concept.con_active_classes);
    } else {
        dvsRender.phr_text_span.addClass(Concept.con_active_classes);
    }
    this.activateAnnotations(true);
    return this;
};

LinkProxy.prototype.activateAnnotations = function (act_first) {
    return this.concept.activateAnnotations(act_first);
};

LinkProxy.prototype.deactivate = function () {
    this.is_activated = false;
    var dvsRender = this.getDvsRender();
    if (this.summernote) {
        // Do nothing (no highlight in edit mode)
    } else if (dvsRender.getCurrentRenderedAttribute() == Attribute.IMAGE) {
        dvsRender.img.removeClass(Concept.img_active_classes);
        dvsRender.img_icon_span.children().removeClass(Concept.con_active_classes);
    } else if (dvsRender.getCurrentRenderedAttribute() == Attribute.HEADER) {
        dvsRender.phr_text_span.removeClass(Concept.con_active_classes);
    } else {
        dvsRender.phr_text_span.removeClass(Concept.con_active_classes);
    }
    if (this.hasAnnotations())
        this.deactivateAnnotations();
    return this;
};

LinkProxy.prototype.deactivateAnnotations = function () {
    return this.concept.deactivateAnnotations();
};

LinkProxy.prototype.move = function (target, hitMode) {
    var cur_par = this.getParent();
    if (hitMode == 'over') {
        cur_par.removeChild(this);
        cur_par._update_children_span();
        target.addChild(this);
        this.setParent(target);
//        cur_par = target;
    } else {
        cur_par.removeChild(this);
        var index = target.getParent().indexOfChild(target);
        if (hitMode == 'after')
            index++;
        if (cur_par != target.getParent()) {
            cur_par._update_children_span();
            cur_par  = target.getParent();
            this.setParent(cur_par);
        }
        cur_par.addChild(this, index);
    }
};

LinkProxy.prototype.remove = function () {
    var children = this.getChildren();
    if (children) {
        for (var i = 0; i < children.length; i++)
            children[i].remove();
    }
    this.getParent().removeChild(this);
    this.dvs_render.remove();
    Project.removeConcept(this);
};

LinkProxy.prototype.isVisable = function (doc) {
    return !(!this.isCrawlable(doc) && !this.isParentsCrawlable(doc) && !this.isParentsExpanded());
};

LinkProxy.prototype.render = function (doc, renderEngine) {
    if (!renderEngine)
        renderEngine = Concept.renderEngine;
    renderEngine.render(this, doc);
    if (Concept.renderEngine.getType() == 'dvs' && Page.isProjectPage()) {
//        var dvsRender = this.getDvsRender();
//        if (dvsRender.getCurrentRenderedAttribute() == Attribute.HEADER &&
//                !this.getDocumentAttribute(doc).isHeader())
//            toggle_con_header(this, doc, true);
    }
};

LinkProxy.prototype.getInitIndex = function () {
    return this.init_index;
};

LinkProxy.prototype.isLinked = function () {
    return true;
};

LinkProxy.prototype.getLinkedParent = function () {
    var parent = this.getParent();
    while (!parent.isRoot()) {
        if (parent.isLinked())
            return parent;
        parent = parent.getParent();
    }
    return null;
};

LinkProxy.prototype.isChildOfLinked = function () {
    return !!this.getLinkedParent();
};

LinkProxy.prototype.setParent = function (parent) {
    this.parent = parent;
};

LinkProxy.prototype.getParent = function () {
    if (this.parent)
        return this.parent;
    return Project.getProject();
};

LinkProxy.prototype.getInitIndex = function () {
    return this.init_index;
};

LinkProxy.prototype.setDvsRender = function (dvsRender) {
    this.dvs_render = dvsRender;
};

LinkProxy.prototype.getDvsRender = function () {
    return this.dvs_render;
};

LinkProxy.prototype.setSummaryRender = function (summaryRender) {
    this.summary_render = summaryRender;
};

LinkProxy.prototype.getSummaryRender = function () {
    if (!this.summary_render)
        this.setSummaryRender(new SummaryRenderObj());
    return this.summary_render;
};

LinkProxy.prototype.setTvsNode = function (node) {
    this.node = node;
};

LinkProxy.prototype.getTvsNode = function () {
    return this.node;
};

LinkProxy.prototype.setAttributes = function (attrs) {
    return this.concept.setAttributes(attrs);
};

LinkProxy.prototype.addAttribute = function (attr) {
    return this.concept.addAttribute(attr);
};

LinkProxy.prototype.getAttributes = function () {
    return this.concept.getAttributes;
};

LinkProxy.prototype.getDocumentAttributeById = function (doc_id, concept) {
    if (concept)
        return concept.getDocumentAttributeById(doc_id, true);
    return this.concept.getDocumentAttributeById(doc_id, true);
};

LinkProxy.prototype.getDocumentAttribute = function (doc, concept) {
    var attr = this.getDocumentAttributeById(doc.getId(), concept);
    if (!attr)
        attr = this.getDocumentAttributeById(this.document, concept);
        if (!attr)
            attr = this.getDocumentAttributeById(this.distilled_document, concept);
    return attr;
};

LinkProxy.prototype.isParent = function () {
    return this.concept.isParent();
};

LinkProxy.prototype.setIsParent = function (flag) {
    return this.concept.setIsParent(flag);
};

LinkProxy.prototype.setOwners = function (owners) {
    this.concept.setOwners(owners);
};

LinkProxy.prototype.isOwner = function (user) {
    return this.concept.isOwner(user);
};

LinkProxy.prototype.getOwners = function () {
    return this.concept.getOwners();
};

LinkProxy.prototype.setDeleted = function (flag) {
    this.is_deleted = flag;
};

LinkProxy.prototype.isDeleted = function () {
    return this.is_deleted;
};

LinkProxy.prototype.isChildrenLoaded = function () {
    return this.hasChildren();
};

LinkProxy.prototype.setChildren = function (children) {
    return this.concept.setChildren(children);
};

LinkProxy.prototype.hasChildren = function () {
    return this.concept.hasChildren();
};

LinkProxy.prototype.getLastChild = function () {
    return this.concept.getLastChild();
};

LinkProxy.prototype.addChild = function (child, index) {
    return this.concept.addChild(child, index);
};

LinkProxy.prototype.removeChild = function (child) {
    return this.concept.removeChild(child);
};

LinkProxy.prototype.indexOfChild = function (child) {
    return this.concept.indexOfChild(child);
};

LinkProxy.prototype.isChild = function (child) {
    return this.concept.indexOf(child) >= 0;
};

LinkProxy.prototype.getChildren = function () {
    return this.concept.getChildren();
};

LinkProxy.prototype.getLastChild = function () {
    return this.concept.getLastChild();
};

LinkProxy.prototype.getFirstChild = function () {
    return this.concept.getFirstChild();
};

LinkProxy.prototype.setQueuedLoading = function (flag) {
    return this.concept.setQueuedLoading(flag);
};

LinkProxy.prototype.isQueuedLoading = function () {
    return this.concept.isQueuedLoading();
};

LinkProxy.prototype.setBeingFetched = function (flag) {
    return this.concept.setBeingFetched(flag);
};

LinkProxy.prototype.isBeingFetched = function () {
    return this.concept.isBeingFetched();
};

LinkProxy.prototype.setLoaded = function (flag) {
    return this.concept.setLoaded(flag);
};

LinkProxy.prototype.isLoaded = function () {
    return this.concept.isLoaded();
};

LinkProxy.prototype.updateChildrenSpans = function () {
    var links = this.concept.getLinkProxies();
    for (var i = 0; i < links.length; i++)
        this.concept.updateChildrenSpans(links[i].getDvsRender());
};

LinkProxy.prototype.getPermissions = function () {
    return this.concept.getPermissions();
};

LinkProxy.prototype.canInherit = function () {
    return true;
};

LinkProxy.prototype.getParentPermissions = function () {
    var parent = this.getParent();
    var parent_permissions = [parent.getPermissions().getPermissions()];
    while (!parent.isRoot()) {
        parent = parent.getParent();
        parent_permissions.push(parent.getPermissions().getPermissions());
    }
    return parent_permissions;
};

LinkProxy.prototype.hasPermissionAdmin = function (user) {
    return SecureArtifact.hasPermission(this, user, 'admin');
};

LinkProxy.prototype.hasPermissionRead = function (user) {
    return SecureArtifact.hasPermission(this, user, 'read');
};

LinkProxy.prototype.hasPermissionWrite = function (user) {
    return SecureArtifact.hasPermission(this, user, 'write');
};

LinkProxy.prototype.hasPermissionEditChildren = function (user) {
    return SecureArtifact.hasPermission(this, user, 'edit_children');
};

LinkProxy.prototype.toDict = function () {
    var d = {};

    d.id = this.id;
    d.created_ts = this.created_ts;
    d.modified_ts = this.modified_ts;
    d.project_id = this.project;
    d.parent = this.parent;
    d.concept = this.concept.toDict();
    d.document = this.document;
    d.distilled_document = this.distilled_document;

    return d;
};