/** @class
 *
 * @property {Concept||Project] parent - Concept's parent
 * @property {Phrasing] distilled_phrasing - Concept's distlled phrasing
 * @property {Array<Phrasing>] phrasings - Concept's phrasings
 * @property {Array<SelectedPhrasings>] selected_phrasingss - Concept's selected phrasings
 * @property {Array<Crawlcontext>] crawlcontext - Concept's crawlcontext
 * @property {Array<Annotation>] annotations - Concept's annotations (comments)
 * @property {string] mediaId - Concept's meida id
 * @property {boolean] mediaReady - True if concept's media is ready for download
 * @property {string] mediaMineType - Concept's meida mine type
 * @property {string] mediaId - Concept's meida id
 * @property {Array<string>] operationsList - Concepts's permissions operations
 */
function Concept() {
    ProjectNode.call(this);
    this.id_real = null;
    this.project_id = null;
    this.parent = null;
    this.distilled_phrasing = null;
    this.phrasings = {};
    this.selected_phrasings = {};
    this.summary_selected_phrasings = {};
    this.presentation_selected_phrasings = {};
    this.selected_phrasings_by_doc_id = {};
    this.summary_selected_phrasings_by_doc_id = {};
    this.presentation_selected_phrasings_by_doc_id = {};
    this.crawlcontext = {};
    this.crawlcontext_by_doc_id = {};
    this.summary_crawlcontext = {};
    this.summary_crawlcontext_by_doc_id = {};
    this.presentation_crawlcontext = {};
    this.presentation_crawlcontext_by_doc_id = {};
    this.annotations = [];
    this.mediaId = null;
    this.mediaReady = null;
    this.mediaMineType = null;
    this.operations_list = ['admin', 'read', 'write', 'edit_children'];

    this.new = false;
    this.is_expanded = null;
    this.is_activated = false;

    this.init_index = null;
    this.link_proxies = [];
    this.is_new = false;
}

Concept.prototype = Object.create(ProjectNode.prototype);
Concept.prototype.constructor = Concept;

Concept.renderEngine = new DVSRender();
Concept.prime_attr = ['h p img ul ol'];
Concept.con_span_classes = 'concept';
Concept.con_active_classes = 'activate_concept';
Concept.img_active_classes = 'img-activated';
Concept.image_status = 'small';
Concept.con_phr_span_classes = 'phr_span';
Concept.con_phr_span_context_classes = 'concept_context';
Concept.con_phr_span_context_linked_classes = 'concept_link';
Concept.con_phr_span_context_url_classes = 'concept_url_link';
Concept.con_span_dbclick = null;
Concept.default_attr_engine = new AutoAttributeEngine();
Concept.more_icon_classes = 'fa fa-angle-double-right expand_child_inc';
Concept.loading_icon_classes = 'fa fa-spinner fa-spin expand_child_inc';
Concept.loading_queued_icon_classes = 'fa fa-clock-o expand_child_inc';
Concept.figure_classes = 'img-figure';
Concept.figure_caption_classes = 'caption';
Concept.figure_icon_classes = 'fa fa-2x fa-picture-o';
Concept.figure_icon_span_classes = 'concept-img-icon';
Concept.image_classes = 'concept-img';
Concept.more_icon_expand_animation_speed = 20;
Concept.children_expand_animation_speed = 100;
Concept.onActivate = null;
Concept.onDeactivate = null;
Concept.onRender = null;


Concept.active = null;
Concept.concepts = {};

/** @instance
 * Init function for concept
 *
 * @param {object} concept - phrasing options
 */
Concept.prototype.initConcept = function (concept) {
    this.data = concept;
    // Linked concepts can be linked to the same concept
    // if so, we don't want to recreate the concept again.
    if (Concept.get(concept.id))
        return Concept.get(concept.id);

    this.initProjectNode(concept);
    this.parent = concept.parent;
    var i;

    var phr;
    for (i = 0; i < concept.phrasings.length; i++) {
        phr = new Phrasing();
        concept.phrasings[i].concept = this;
        concept.phrasings[i].originating_document = Document.get(concept.phrasings[i].originating_document);
        phr.initPhrasing(concept.phrasings[i]);
        this.phrasings[phr.getId()] = phr;
    }

    this.distilled_phrasing = this.getPhrasing(concept.distilled_phrasing);

    var sel_phr;
    for (i = 0; i < concept.selected_phrasings.length; i++) {
        sel_phr = new SelectedPhrasing();
        concept.selected_phrasings[i].concept = this;
        var doc = Document.get(concept.selected_phrasings[i].document);
        if (!doc) {
            // This is a linked concept
            doc = new Document();
            doc.setId(concept.selected_phrasings[i].document);
        }
        concept.selected_phrasings[i].document = doc;
        concept.selected_phrasings[i].phrasing = this.getPhrasing(concept.selected_phrasings[i].phrasing);
        sel_phr.initSelectedPhrasing(concept.selected_phrasings[i]);
        this.selected_phrasings[sel_phr.getId()] = sel_phr;
        if (concept.selected_phrasings[i].document)
            this.selected_phrasings_by_doc_id[sel_phr.getDocument().getId()] = sel_phr;
    }

    for (i = 0; i < concept.summary_selected_phrasings.length; i++) {
        sel_phr = new SummarySelectedPhrasing();
        concept.summary_selected_phrasings[i].concept = this;
        doc = SummaryDocument.get(concept.summary_selected_phrasings[i].document);
        concept.summary_selected_phrasings[i].document = doc;
        concept.summary_selected_phrasings[i].phrasing = this.getPhrasing(concept.summary_selected_phrasings[i].phrasing);
        sel_phr.initSummarySelectedPhrasing(concept.summary_selected_phrasings[i]);
        this.summary_selected_phrasings[sel_phr.getId()] = sel_phr;
        if (concept.summary_selected_phrasings[i].document)
            this.summary_selected_phrasings_by_doc_id[sel_phr.getDocument().getId()] = sel_phr;
    }

    for (i = 0; i < concept.presentation_selected_phrasings.length; i++) {
        sel_phr = new PresentationSelectedPhrasing();
        concept.presentation_selected_phrasings[i].concept = this;
        doc = PresentationDocument.get(concept.presentation_selected_phrasings[i].document);
        concept.presentation_selected_phrasings[i].document = doc;
        concept.presentation_selected_phrasings[i].phrasing = this.getPhrasing(concept.presentation_selected_phrasings[i].phrasing);
        sel_phr.initPresentationSelectedPhrasing(concept.presentation_selected_phrasings[i]);
        this.presentation_selected_phrasings[sel_phr.getId()] = sel_phr;
        if (concept.presentation_selected_phrasings[i].document)
            this.presentation_selected_phrasings_by_doc_id[sel_phr.getDocument().getId()] = sel_phr;
    }

    var crawl;
    for (i = 0; i < concept.crawlcontext.length; i++) {
        crawl = new CrawlContext();
        concept.crawlcontext[i].concept = this;
        doc = Document.get(concept.crawlcontext[i].document);
        if (!doc) {
            // This is a linked concept
            doc = new Document();
            doc.setId(concept.crawlcontext[i].document);
        }
        concept.crawlcontext[i].document = doc;
        crawl.initCrawlContext(concept.crawlcontext[i]);
        this.crawlcontext[crawl.getId()] = crawl;
        if (concept.crawlcontext[i].document)
            this.crawlcontext_by_doc_id[crawl.getDocument().getId()] = crawl;
    }

    for (i = 0; i < concept.summary_crawlcontext.length; i++) {
        crawl = new SummaryCrawlContext();
        concept.summary_crawlcontext[i].concept = this;
        doc = SummaryDocument.get(concept.summary_crawlcontext[i].document);
        concept.summary_crawlcontext[i].document = doc;
        crawl.initSummaryCrawlContext(concept.summary_crawlcontext[i]);
        this.summary_crawlcontext[crawl.getId()] = crawl;
        if (concept.summary_crawlcontext[i].document)
            this.summary_crawlcontext_by_doc_id[crawl.getDocument().getId()] = crawl;
    }

    for (i = 0; i < concept.presentation_crawlcontext.length; i++) {
        crawl = new PresentationCrawlContext();
        concept.presentation_crawlcontext[i].concept = this;
        doc = PresentationDocument.get(concept.presentation_crawlcontext[i].document);
        concept.presentation_crawlcontext[i].document = doc;
        crawl.initPresentationCrawlContext(concept.presentation_crawlcontext[i]);
        this.presentation_crawlcontext[crawl.getId()] = crawl;
        if (concept.presentation_crawlcontext[i].document)
            this.presentation_crawlcontext_by_doc_id[crawl.getDocument().getId()] = crawl;
    }

    this.mediaId = concept.mediaId;
    this.mediaReady = concept.mediaReady;
    this.mediaMineType = concept.mediaMineType;
    this.init_index = concept.index;
    this.is_deleted = concept.deleted;
    this.project_id = concept.project;

    Concept.concepts[this.getId()] = this;
};

Concept.prototype.updateId = function (old_id) {
    if (Concept.concepts.hasOwnProperty(old_id))
        delete Concept.concepts[old_id];
    Concept.concepts[this.getId()] = this;
};

Concept.prototype.finalize = function () {
    Concept.concepts[this.getId()] = this;
    var i;
    var attrs = this.getAttributes();
    for (i = 0; i < attrs.length; i++) {
        this.attributes_by_doc_id[attrs[i]] = attrs[i];
    }

    var selected_phrasing = this.getSelectedPhrasings();
    for (i = 0; i < selected_phrasing.length; i++) {
        this.selected_phrasings_by_doc_id[selected_phrasing[i].getDocument().getId()] = selected_phrasing[i];
    }

    var crawlcontexts = this.getCrawlContexts();
    for (i = 0; i < crawlcontexts.length; i++) {
        this.crawlcontext_by_doc_id[crawlcontexts[i].getDocument().getId()] = crawlcontexts[i];
    }
};

Concept.prototype.setNew = function (flag) {
    this.is_new = flag;
};

Concept.prototype.isNew = function () {
    return this.is_new;
};

Concept.prototype.getRealId = function () {
    return this.id_real;
};

Concept.prototype.setParent = function (parent) {
    this.parent = parent;
};

Concept.prototype.getParent = function () {
    if (this.parent)
        return this.parent;
    return Project.getProject();
};

Concept.prototype.getLinkedProjectId = function () {
    return this.project_id;
};

Concept.prototype.addLinkProxy = function (link) {
    if (this.link_proxies.indexOf(link) < 0)
        this.link_proxies.push(link);
};

Concept.prototype.removeLinkProxy = function (link) {
    var index = this.link_proxies.indexOf(link);
    if (index >= 0)
        this.link_proxies.splice(index, 1);
};

Concept.prototype.getLinkProxies = function () {
    return this.link_proxies;
};

Concept.prototype.getPathToRoot = function () {
    var path = [];
    var par = this;
    while (!par.isRoot()) {
        path.unshift(par.getId());
        par = par.getParent();
    }
    return path;
};

Concept.prototype.isRoot = function () {
    return false;
};

Concept.prototype.setAnnotations = function (annos) {
    this.annotations = annos;
};

Concept.prototype.addAnnotation = function (anno) {
    this.annotations.push(anno);
};

Concept.prototype.getAnnotations = function () {
    return this.annotations;
};

Concept.prototype.addSelectedPhrasing = function (sel_phr) {
    this.selected_phrasings[sel_phr.getId()] = sel_phr;
    this.selected_phrasings_by_doc_id[sel_phr.getDocument().getId()] = sel_phr;
};

Concept.prototype.updateSelectedPhrasingId = function (old_id) {
    var sel_phr = this.getSelectedPhrasing(old_id);
    if (sel_phr) {
        delete this.selected_phrasings[old_id];
        this.selected_phrasings[sel_phr.getId()] = sel_phr;
    }
};

Concept.prototype.getSelectedPhrasings = function () {
    var self = this;
    return Object.keys(this.selected_phrasings).map(function(key){
        return self.selected_phrasings[key];
    });
};

Concept.prototype.getSelectedPhrasing = function (id) {
    if (this.selected_phrasings.hasOwnProperty(id))
        return this.selected_phrasings[id];
    return null;
};

Concept.prototype.getSelectedPhrasingByDocId = function (id) {
    if (this.selected_phrasings_by_doc_id.hasOwnProperty(id))
        return this.selected_phrasings_by_doc_id[id];
    return null;
};

Concept.prototype.getSelectedPhrasingByDoc = function (doc) {
    return this.getSelectedPhrasingByDocId(doc.getId());
};

Concept.prototype.getSelectedPhrasingByPhr = function (phr) {
    var sel_phrs = this.getSelectedPhrasings();
    var phrasings = [];
    for (var i = 0; i < sel_phrs.length; i++)
        if (sel_phrs[i].getPhrasing() == phr)
            phrasings.push(sel_phrs[i]);
    return phrasings;
};

Concept.prototype.removeSelectedPhrasing = function (sel_phr) {
    if (this.selected_phrasings.hasOwnProperty(sel_phr.getId()))
        delete this.selected_phrasings[sel_phr.getId()];
    if (this.selected_phrasings_by_doc_id.hasOwnProperty(sel_phr.getDocument().getId()))
        delete this.selected_phrasings_by_doc_id[sel_phr.getDocument().getId()];
};

Concept.prototype.addSummarySelectedPhrasing = function (sel_phr) {
    this.summary_selected_phrasings[sel_phr.getId()] = sel_phr;
    this.summary_selected_phrasings_by_doc_id[sel_phr.getDocument().getId()] = sel_phr;
};

Concept.prototype.updateSummarySelectedPhrasingId = function (old_id) {
    var sel_phr = this.getSummarySelectedPhrasing(old_id);
    if (sel_phr) {
        delete this.summary_selected_phrasings[old_id];
        this.summary_selected_phrasings[sel_phr.getId()] = sel_phr;
    }
};

Concept.prototype.getSummarySelectedPhrasings = function () {
    var self = this;
    return Object.keys(this.summary_selected_phrasings).map(function(key){
        return self.summary_selected_phrasings[key];
    });
};

Concept.prototype.getSummarySelectedPhrasing = function (id) {
    if (this.summary_selected_phrasings.hasOwnProperty(id))
        return this.summary_selected_phrasings[id];
    return null;
};

Concept.prototype.getSummarySelectedPhrasingByDocId = function (id) {
    if (this.summary_selected_phrasings_by_doc_id.hasOwnProperty(id))
        return this.summary_selected_phrasings_by_doc_id[id];
    return null;
};

Concept.prototype.getSummarySelectedPhrasingByDoc = function (doc) {
    return this.getSummarySelectedPhrasingByDocId(doc.getId());
};

Concept.prototype.getSummarySelectedPhrasingByPhr = function (phr) {
    var sel_phrs = this.getSummarySelectedPhrasings();
    var phrasings = [];
    for (var i = 0; i < sel_phrs.length; i++)
        if (sel_phrs[i].getPhrasing() == phr)
            phrasings.push(sel_phrs[i]);
    return phrasings;
};

Concept.prototype.removeSummarySelectedPhrasing = function (sel_phr) {
    if (this.summary_selected_phrasings.hasOwnProperty(sel_phr.getId()))
        delete this.summary_selected_phrasings[sel_phr.getId()];
    if (this.summary_selected_phrasings_by_doc_id.hasOwnProperty(sel_phr.getDocument().getId()))
        delete this.summary_selected_phrasings_by_doc_id[sel_phr.getDocument().getId()];
};

Concept.prototype.addPresentationSelectedPhrasing = function (sel_phr) {
    this.presentation_selected_phrasings[sel_phr.getId()] = sel_phr;
    this.presentation_selected_phrasings_by_doc_id[sel_phr.getDocument().getId()] = sel_phr;
};

Concept.prototype.updatePresentationSelectedPhrasingId = function (old_id) {
    var sel_phr = this.getPresentationSelectedPhrasing(old_id);
    if (sel_phr) {
        delete this.presentation_selected_phrasings[old_id];
        this.presentation_selected_phrasings[sel_phr.getId()] = sel_phr;
    }
};

Concept.prototype.getPresentationSelectedPhrasings = function () {
    var self = this;
    return Object.keys(this.presentation_selected_phrasings).map(function(key){
        return self.presentation_selected_phrasings[key];
    });
};

Concept.prototype.getPresentationSelectedPhrasing = function (id) {
    if (this.presentation_selected_phrasings.hasOwnProperty(id))
        return this.presentation_selected_phrasings[id];
    return null;
};

Concept.prototype.getPresentationSelectedPhrasingByDocId = function (id) {
    if (this.presentation_selected_phrasings_by_doc_id.hasOwnProperty(id))
        return this.presentation_selected_phrasings_by_doc_id[id];
    return null;
};

Concept.prototype.getPresentationSelectedPhrasingByDoc = function (doc) {
    return this.getPresentationSelectedPhrasingByDocId(doc.getId());
};

Concept.prototype.getPresentationSelectedPhrasingByPhr = function (phr) {
    var sel_phrs = this.getPresentationSelectedPhrasings();
    var phrasings = [];
    for (var i = 0; i < sel_phrs.length; i++)
        if (sel_phrs[i].getPhrasing() == phr)
            phrasings.push(sel_phrs[i]);
    return phrasings;
};

Concept.prototype.removePresentationSelectedPhrasing = function (sel_phr) {
    if (this.presentation_selected_phrasings.hasOwnProperty(sel_phr.getId()))
        delete this.presentation_selected_phrasings[sel_phr.getId()];
    if (this.presentation_selected_phrasings_by_doc_id.hasOwnProperty(sel_phr.getDocument().getId()))
        delete this.presentation_selected_phrasings_by_doc_id[sel_phr.getDocument().getId()];
};

Concept.prototype.addPhrasing = function (phrasing) {
    this.phrasings[phrasing.getId()] = phrasing;
};

Concept.prototype.updatePhrasingId = function (old_id) {
    var phrasing = this.getPhrasing(old_id);
    if (phrasing) {
        delete this.phrasings[old_id];
        this.phrasings[phrasing.getId()] = phrasing;
    }
};

Concept.prototype.removePhrasing = function (phrasing) {
    if (this.phrasings.hasOwnProperty(phrasing.getId()))
        delete this.phrasings[phrasing.getId()];
};

Concept.prototype.getPhrasing = function (id) {
    if (this.phrasings.hasOwnProperty(id))
        return this.phrasings[id];
    return null;
};

Concept.prototype.getPhrasings = function () {
    var self = this;
    return Object.keys(this.phrasings).map(function(key){
        return self.phrasings[key];
    }).sort(function (a, b) {
        return a.getCreatedTs() - b.getCreatedTs();
    });
};

Concept.prototype.getDocumentPhrasing = function (doc, skip_state_check) {
    if (!skip_state_check && doc.getState() == Document.STATE_SUMMARY)
        return this.getSummaryDocumentPhrasing(doc);
    else if (!skip_state_check && doc.getState() == Document.STATE_PRESENTATION)
        return this.getPresentationDocumentPhrasing(doc);

    if (!this.isRoot() && this.isChildOfLinked()) {
        return this.getLinkedParent().getDocumentPhrasing(doc, this);
    } else {
        var sel_phr = this.getSelectedPhrasingByDoc(doc);
        if (sel_phr)
            return sel_phr.getPhrasing();
        else
            return this.getDistilledPhrasing();
    }
};

Concept.prototype.getSummaryDocumentPhrasing = function (doc) {
    if (typeof doc.getSummaryDocument == 'function')
        doc = doc.getSummaryDocument();
    if (!this.isRoot() && this.isChildOfLinked()) {
        return this.getLinkedParent().getSummaryDocumentPhrasing(doc, this);
    } else {
        var sel_phr = this.getSummarySelectedPhrasingByDoc(doc);
        if (sel_phr)
            return sel_phr.getPhrasing();
        else
            return this.getDocumentPhrasing(doc.getDocument(), true);
    }
};

Concept.prototype.getPresentationDocumentPhrasing = function (doc) {
    if (typeof doc.getPresentationDocument == 'function')
        doc = doc.getPresentationDocument();
    if (!this.isRoot() && this.isChildOfLinked()) {
        return this.getLinkedParent().getPresentationDocumentPhrasing(doc, this);
    } else {
        var sel_phr = this.getPresentationSelectedPhrasingByDoc(doc);
        if (sel_phr)
            return sel_phr.getPhrasing();
        else
            return this.getDocumentPhrasing(doc.getDocument(), true);
    }
};

Concept.prototype.setDistilledPhrasing = function (phrasing) {
    this.distilled_phrasing = phrasing;
};

Concept.prototype.getDistilledPhrasing = function () {
    return this.distilled_phrasing;
};

Concept.prototype.addCrawlContext = function (crawlcontext) {
    this.crawlcontext[crawlcontext.getId()] = crawlcontext;
    this.crawlcontext_by_doc_id[crawlcontext.getDocument().getId()] = crawlcontext;
};

Concept.prototype.setCrawlContexts = function (crawlcontexts) {
    for (var i = 0; i < crawlcontexts.length; i ++)
        this.addCrawlContext(crawlcontexts);
};

Concept.prototype.getCrawlContexts = function () {
    var self = this;
    return Object.keys(this.crawlcontext).map(function(key){
        return self.crawlcontext[key];
    });
};

Concept.prototype.getCrawlContext = function (id) {
    if (this.crawlcontext.hasOwnProperty(id))
        return this.crawlcontext[id];
    return null;
};

Concept.prototype.removeCrawlContext = function (crawlcontext) {
    delete this.crawlcontext[crawlcontext.getId()];
    delete this.crawlcontext_by_doc_id[crawlcontext.getDocument().getId()];
};

Concept.prototype.getCrawlContextByDocId = function (id) {
    if (this.crawlcontext_by_doc_id.hasOwnProperty(id))
        return this.crawlcontext_by_doc_id[id];
    return null;
};

Concept.prototype.getDocumentCrawlContext = function (doc) {
    if (!this.isRoot() && this.isChildOfLinked()) {
        return this.getLinkedParent().getCrawlContextByDocId(doc.getId(), this);
    } else {
        if (doc.getState() == Document.STATE_SUMMARY) {
            var crawlcontext = this.getSummaryCrawlContextByDocId(doc.getSummaryDocument().getId());
            if (crawlcontext)
                return crawlcontext

        } else if (doc.getState() == Document.STATE_PRESENTATION) {
            crawlcontext = this.getPresentationCrawlContextByDocId(doc.getPresentationDocument().getId());
            if (crawlcontext)
                return crawlcontext
        }

        crawlcontext = this.getCrawlContextByDocId(doc.getId());
        if (crawlcontext)
            return crawlcontext;

        doc = Project.getDistilledDocument();
        crawlcontext = this.getCrawlContextByDocId(doc.getId());
        if (crawlcontext)
            return crawlcontext;
    }
    return null;
};

Concept.prototype.updateCrawlContextId = function (old_id) {
    var crawlcontext = this.crawlcontext[old_id];
    delete this.crawlcontext[old_id];
    this.crawlcontext[crawlcontext.getId()] = crawlcontext;
};

Concept.prototype.isCrawlable = function (doc) {
    var crawlcontext = this.getDocumentCrawlContext(doc);
    if (crawlcontext) {
        return crawlcontext.getCrawl();
    } else {
        return true; // Default
    }
};

Concept.prototype.isCrawlableByDocId = function (id, default_value) {
    var crawlcontext = this.getCrawlContextByDocId(id);
    if (crawlcontext) {
        return crawlcontext.getCrawl();
    } else {
        if (typeof(default_value) != 'undefined')
            return default_value;
        return true;
    }
};

Concept.prototype.isParentsCrawlable = function (doc) {
    var parent = this.getParent();
    while (!parent.isRoot()) {
        if (!parent.isCrawlable(doc))
            return false;
        parent = parent.getParent();
    }
    return true;
};

Concept.prototype.addSummaryCrawlContext = function (crawlcontext) {
    this.summary_crawlcontext[crawlcontext.getId()] = crawlcontext;
    this.summary_crawlcontext_by_doc_id[crawlcontext.getDocument().getId()] = crawlcontext;
};

Concept.prototype.setSummaryCrawlContexts = function (crawlcontexts) {
    for (var i = 0; i < crawlcontexts.length; i ++)
        this.addSummaryCrawlContext(crawlcontexts);
};

Concept.prototype.getSummaryCrawlContexts = function () {
    var self = this;
    return Object.keys(this.summary_crawlcontext).map(function(key){
        return self.summary_crawlcontext[key];
    });
};

Concept.prototype.getSummaryCrawlContext = function (id) {
    if (this.summary_crawlcontext.hasOwnProperty(id))
        return this.summary_crawlcontext[id];
    return null;
};

Concept.prototype.isSummaryCrawlableByDocId = function (id, default_value) {
    var crawlcontext = this.getSummaryCrawlContextByDocId(id);
    if (crawlcontext) {
        return crawlcontext.isRendered();
    } else {
        if (typeof(default_value) != 'undefined')
            return default_value;
        return true;
    }
};

Concept.prototype.removeSummaryCrawlContext = function (crawlcontext) {
    delete this.summary_crawlcontext[crawlcontext.getId()];
    delete this.summary_crawlcontext_by_doc_id[crawlcontext.getDocument().getId()];
};

Concept.prototype.getSummaryCrawlContextByDocId = function (id) {
    if (this.summary_crawlcontext_by_doc_id.hasOwnProperty(id))
        return this.summary_crawlcontext_by_doc_id[id];
    return null;
};

Concept.prototype.updateSummaryCrawlContextId = function (old_id) {
    var crawlcontext = this.summary_crawlcontext[old_id];
    delete this.summary_crawlcontext[old_id];
    this.summary_crawlcontext[crawlcontext.getId()] = crawlcontext;
};

Concept.prototype.addPresentationCrawlContext = function (crawlcontext) {
    this.presentation_crawlcontext[crawlcontext.getId()] = crawlcontext;
    this.presentation_crawlcontext_by_doc_id[crawlcontext.getDocument().getId()] = crawlcontext;
};

Concept.prototype.setPresentationCrawlContexts = function (crawlcontexts) {
    for (var i = 0; i < crawlcontexts.length; i ++)
        this.addPresentationCrawlContext(crawlcontexts);
};

Concept.prototype.getPresentationCrawlContexts = function () {
    var self = this;
    return Object.keys(this.presentation_crawlcontext).map(function(key){
        return self.presentation_crawlcontext[key];
    });
};

Concept.prototype.getPresentationCrawlContext = function (id) {
    if (this.presentation_crawlcontext.hasOwnProperty(id))
        return this.presentation_crawlcontext[id];
    return null;
};

Concept.prototype.isPresentationCrawlableByDocId = function (id, default_value) {
    var crawlcontext = this.getPresentationCrawlContextByDocId(id);
    if (crawlcontext) {
        return crawlcontext.isRendered();
    } else {
        if (typeof(default_value) != 'undefined')
            return default_value;
        return true;
    }
};

Concept.prototype.removePresentationCrawlContext = function (crawlcontext) {
    delete this.presentation_crawlcontext[crawlcontext.getId()];
    delete this.presentation_crawlcontext_by_doc_id[crawlcontext.getDocument().getId()];
};

Concept.prototype.getPresentationCrawlContextByDocId = function (id) {
    if (this.presentation_crawlcontext_by_doc_id.hasOwnProperty(id))
        return this.presentation_crawlcontext_by_doc_id[id];
    return null;
};

Concept.prototype.updatePresentationCrawlContextId = function (old_id) {
    var crawlcontext = this.presentation_crawlcontext[old_id];
    delete this.presentation_crawlcontext[old_id];
    this.presentation_crawlcontext[crawlcontext.getId()] = crawlcontext;
};

Concept.prototype.loadSubChildren = function () {
//    if (Document.getCurrent().getState() == Document.STATE_PRESENTATION) {
//        var pres_doc = Document.getCurrent().getPresentationDocument();
//        if (PresentationSlide.getSlides(pres_doc).length >= pres_doc.slide_count) {
//            return;
//        }
//    }

    var children = this.getChildren();
    var queue = [];
    for (var i = 0; i < children.length; i++) {
        if (children[i].isParent())
            queue.push({con: children[i], priority: true})
    }
//    Project.getConceptLoader().queue(queue, Project.renderAll);
    Project.getConceptLoader().queue(queue);
};

Concept.prototype.setExpanded = function (flag) {
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

Concept.prototype.isExpanded = function () {
    return this.is_expanded;
};

Concept.prototype.isParentsExpanded = function () {
    var parent = this.getParent();
    while (!parent.isRoot()) {
        if (!parent.isExpanded())
            return false;
        parent = parent.getParent();
    }
    return true;
};

Concept.prototype.hasAnnotations = function () {
    return this.getAnnotations().length > 0
};

Concept.prototype.setCurrentAttribute = function (attr, render_obj) {
    if (!render_obj)
        render_obj = this.dvs_render;
    render_obj.cur_attr = attr;
};

Concept.prototype.getCurrentAttribute = function (render_obj) {
    if (!render_obj)
        render_obj = this.dvs_render;
    return render_obj.cur_attr;
};

Concept.prototype.getDepth = function () {
    return this.getPathToRoot().length - 1;
};

Concept.prototype.getDepthFromExpanded = function () {
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

Concept.prototype.isFirstSibling = function () {
    return this.getParent().indexOfChild(this) == 0;
};

Concept.prototype.isLastSibling = function () {
    return this.getParent().indexOfChild(this) == this.getParent().getChildren().length - 1;
};

Concept.prototype.getPreviousSibling = function () {
    if (this.isFirstSibling())
        return null;
    var children = this.getParent().getChildren();
    return children[children.indexOf(this) - 1];
};

Concept.prototype.getNextSibling = function () {
    if (this.isLastSibling())
        return null;
    var children = this.getParent().getChildren();
    return children[children.indexOf(this) + 1];
};

Concept.prototype.isActivated = function () {
    return this.is_activated;
};

Concept.prototype.activate = function () {
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

    if (Document.getCurrent().getState() == Document.STATE_SUMMARY) {
        var summaryRender = this.getSummaryRender();
        if (!this.summernote) {
            summaryRender.span.addClass(Concept.con_active_classes);
        }
    } else if (Document.getCurrent().getState() == Document.STATE_PRESENTATION) {
//        if (this.pres_heading)
//            this.pres_heading.addClass(Concept.con_active_classes);
//        if (this.pres_li)
//            this.pres_li.addClass(Concept.con_active_classes);
    }

    this.activateAnnotations(true);
    return this;
};

Concept.prototype.activateAnnotations = function (act_first) {
    var annos = this.getAnnotations();
    var i;
    if (annos.length == 0) {
        annos = Annotation.getByConceptId(this.getId());
        if (annos) {
            this.setAnnotations(annos);
            for (i = 0; i < annos.length; i++)
                annos[i].setConcept(this);
        }
    } else {
        var latest = null;
        for (i = 0; i < annos.length; i++) {
            annos[i].highlight();
            if (!latest || latest.getModifiedTs() < annos[i].getModifiedTs())
                latest = annos[i];
        }
        if (act_first)
            latest.activate();
    }
};

Concept.prototype.deactivate = function () {
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

    $('.' + Concept.con_active_classes).removeClass(Concept.con_active_classes);

    this.makeCallback = true;
    if (this.hasAnnotations())
        this.deactivateAnnotations();
    return this;
};

Concept.prototype.deactivateAnnotations = function () {
    var annos = this.getAnnotations();
    if (annos.length > 0) {
        for (var i = 0; i < annos.length; i++) {
            annos[i].unhighlight();
            annos[i].deactivate();
        }
    }
};

Concept.prototype.move = function (target, hitMode) {
    var cur_par = this.getParent();
    if (hitMode == 'over') {
        cur_par.removeChild(this);
        cur_par.updateChildrenSpans();
        target.addChild(this);
        this.setParent(target);
//        cur_par = target;
    } else {
        cur_par.removeChild(this);
        var index = target.getParent().indexOfChild(target);
        if (hitMode == 'after')
            index++;
        if (cur_par != target.getParent()) {
            cur_par.updateChildrenSpans();
            cur_par  = target.getParent();
            this.setParent(cur_par);
        }
        cur_par.addChild(this, index);
    }
};

Concept.prototype.secureDelete = function () {
    delete Concept.concepts[this.getId()];
    this.parent.removeChild(this);
    if (TVS.inUse()) {
        var node = this.getTvsNode();
        if (node)
            node.remove();
    }

    this.permissions.setPermissions(null);
    this.permissions = null;

    for (i = 0; i < this.annotations.length; i++)
        this.annotations[i].remove();

    var i;
    var phrasings = this.getPhrasings();
    for (i = 0; i < phrasings.length; i++)
        phrasings[i].secureDelete();

    var children = this.getChildren();
    for (i = 0; i < children.length; i++)
        children[i].secureDelete();
};

Concept.prototype.remove = function () {
    var children = this.getChildren();
    if (children) {
        for (var i = 0; i < children.length; i++)
            children[i].remove();
    }
    this.getParent().removeChild(this);
    this.dvs_render.remove();
    Project.removeConcept(this);
};

Concept.prototype.isVisable = function (doc) {
    return !(!this.isCrawlable(doc) && !this.isParentsCrawlable(doc) && !this.isParentsExpanded());
};

Concept.prototype.render = function (doc, renderEngine) {
    if (!renderEngine)
        renderEngine = Concept.renderEngine;

    renderEngine.render(this, doc);
    if (renderEngine.getType() == 'dvs' && Page.isProjectPage()) {
//        var dvs_render = this.getDvsRender();
//        if (dvsRender.getCurrentRenderedAttribute() == Attribute.HEADER && !this.getDocumentAttribute(doc).isHeader())
//            toggle_con_header(this, doc, true);
    }
};

Concept.prototype.getInitIndex = function () {
    return this.init_index;
};

Concept.prototype.isLinked = function () {
    return false;
};

Concept.prototype.getLinkedParent = function () {
    var parent = this.getParent();
    while (!parent.isRoot()) {
        if (parent.isLinked())
            return parent;
        parent = parent.getParent();
    }
    return null;
};

Concept.prototype.isChildOfLinked = function () {
    return !!this.getLinkedParent();
};

Concept.prototype.getParentPermissions = function () {
    var parent = this.getParent();
    var parent_permissions = [parent.getPermissions().getPermissions()];
    while (!parent.isRoot()) {
        parent = parent.getParent();
        parent_permissions.push(parent.getPermissions().getPermissions());
    }
    return parent_permissions;
};

Concept.prototype.getSharedURL = function (nav, depth, limit) {
    var url = location.origin + ARTIFACT_URLS.concept + this.getRequestId() + '?doc=' + Document.getCurrent().getRequestId();
    if (nav)
        url += '&nav=true';
    if (depth)
        url += '&depth=' + depth;
    if (limit)
        url += '&limit_depth=true';
    return url
};

Concept.prototype.toDict = function () {
    var d = ProjectNode.prototype.toDict.call(this);

    d.parent = this.parent.getRequestId();
    d.distilled_phrasing = this.distilled_phrasing.toDict();
    d.phrasings = [];

    var i;
    var phrasings = this.getPhrasings();
    for (i = 0; i < phrasings.length; i++)
        d.phrasings.push(phrasings[i].toDict());

    d.selected_phrasings = [];
    var selected_phrasings = this.getSelectedPhrasings();
    for (i = 0; i < selected_phrasings.length; i++)
        d.selected_phrasings.push(selected_phrasings[i].toDict());

    d.crawlcontexts = [];
    d.crawlcontexts = [];
    var crawlcontexts = this.getCrawlContexts();
    for (i = 0; i < crawlcontexts.length; i++)
        d.crawlcontexts.push(crawlcontexts[i].toDict());

    d.is_media = false;
    var attr = this.getDocumentAttribute(Document.getCurrent());
    if (attr && attr.isImage()) {
        d.is_media = true;
        comms.get({
            async: false,
            url: ARTIFACT_URLS.media_download + this.getRequestId(),
            data: {type: 'base64'},
            success: function (data) {
                d.imageBase64 = data.base64;
                d.content_type = data.content_type;
            }
        });
    }

    return d;
};

Concept.add = function (concept) {
    Concept.concepts[concept.getId()] = concept;
};

Concept.addFromDict = function (data, parent, index) {
    if (data.link.length > 0) {
        for (var i = 0; i < data.link.length; i++) {
            if (data.link[i].parent == parent.getId()) {
                var link_data = data.link[i];
            }
        }
        data.is_linked = true;
    }

    data.parent = parent;
    var new_concept = new Concept();
    new_concept.initConcept(data);

    if (data.is_linked) {
        link_data.parent = parent;
        link_data.concept = new_concept;

        var link = new LinkProxy();
        link.initLinkProxy(link_data);
        new_concept = link;
    }

    parent.addChild(new_concept, index);
    parent.setBeingFetched(false);
    parent.setLoaded(true);
    parent.setIsParent(true);
    if (TVS.inUse())
        TVS.createNode(new_concept);

    Project.renderAll();
    ConceptEventListener.reactivate();
};

Concept.get = function (id) {
    if (Concept.concepts.hasOwnProperty(id))
        return Concept.concepts[id];
    return null;
};

Concept.getAll = function () {
    return Object.keys(Concept.concepts).map(function(key){
        return Concept.concepts[key];
    });
};

Concept.getCurrent = function () {
    return Concept.active;
};

// TODO: Move this to concept_loader
Concept.activateConceptById = function (id, path, cb) {
    Project.getConceptLoader().processCache();
    var concept = Concept.get(id);
    if (concept) {
        ConceptEventListener.activeMouseClick(concept);
        if (cb)
            cb();
    } else {
        function activate_concept_callback() {
            Project.getConceptLoader().processCache();
            if (path.length == 1) {
                Project.renderAll();
                ConceptEventListener.activeMouseClick(Concept.get(id));
                if (cb)
                    cb();
            } else {
                var con_id = path.splice(0, 1)[0];
                concept = Concept.get(con_id);
//                if (!concept.getParent().isRoot())
//                    ConceptEventListener.expandMouseClick(concept.getParent());
                Project.conceptLoader.queue(
                    [{con: concept, priority: true}], activate_concept_callback);
            }
        }
        if (!path) {
            comms.get({
                url: ARTIFACT_URLS.concept + id,
                data: {parent_list: true},
                success: function (parent_list) {
                    path = parent_list;
                    path.push(id);
                    activate_concept_callback();
                }
            });
        } else {
            path = path.slice(0);
            activate_concept_callback();
        }
    }
};
