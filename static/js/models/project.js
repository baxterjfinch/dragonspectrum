/** @class
 *
 * @property {Concept||Project] parent - Concept's parent
 * @property {Phrasing] distilledPhrasing - Concept's distlled phrasing
 * @property {Array<Phrasing>] phrasings - Concept's phrasings
 * @property {Array<SelectedPhrasings>] selectedPhrasings - Concept's selected phrasings
 * @property {Array<Crawlcontext>] crawlcontext - Concept's crawlcontext
 * @property {Array<Annotation>] annotations - Concept's annotations (comments)
 * @property {string] mediaId - Concept's meida id
 * @property {boolean] mediaReady - True if concept's media is ready for download
 * @property {string] mediaMineType - Concept's meida mine type
 * @property {string] mediaId - Concept's meida id
 * @property {Array<string>] operationsList - Concepts's permissions operations
 */
function Project() {
    ProjectNode.call(this);
    this.pw_modified_ts = null;
    this.title = null;
    this.distilled_document = null;
    this.current_document = null;
    this.documents = {};
    this.import_url = null;
    this.project_score = 0;
    this.user_vote = null;
    this.operations_list = ['admin', 'read', 'write', 'delete', 'edit_children'];

    this.is_owned = false;
    this.is_shared = false;
    this.is_world_shared = false;

    this.table_row = {};
}

Project.prototype = Object.create(ProjectNode.prototype);
Project.prototype.constructor = Project;

Project.in_user = false;
Project.project = null;
Project.projects = [];
Project.projects_by_id = {};
Project.currentDocument = null;
Project.concepts = {};
Project.conceptLoader = null;
Project.renderEngine = null;
Project.render_enabled = true;


/** @instance
 * Init function for project
 *
 * @param {object} project - project options
 * @param {object} conceptLoaderConfigs - concept loader configurations
 */
Project.prototype.initProject = function (project, conceptLoaderConfigs, loadDvs) {
    this.initProjectNode(project);
    this.title = project.title;
    this.is_parent = true;

    var doc;
    for (var i = 0; i < project.documents.length; i++) {
        doc = new Document();
        doc.initDocument(
            project.documents[i]);
        this.addDocument(doc);
    }

    this.distilled_document  = this.getDocument(project.distilled_document);
    this.current_document = this.distilled_document;
    this.import_url = project.inportURL;
    this.project_score = project.project_score;
    this.user_vote = project.user_vote;
    this.pw_modified_ts = project.pw_modified_ts;

    if (project.shared)
        this.is_shared = true;
    else if (project.world_shared)
        this.is_world_shared = true;
    else
        this.is_owned = true;

    if (loadDvs) {
        Project.in_user = true;
        Project.conceptLoader = new ChildLoader();
        Project.conceptLoader.initialize(conceptLoaderConfigs, this);
        Project.renderEngine = new DVSRender();
        Project.project = this;
    }

    Project.projects.push(this);
    Project.projects_by_id[this.getId()] = this;
};

Project.prototype.isRoot = function () {
    return true;
};

Project.prototype.setTitle = function (title) {
    this.title = title;
};

Project.prototype.getTitle = function () {
    return this.title;
};

Project.prototype.setDistilledDocument = function (doc) {
    this.distilled_document = doc;
};

Project.prototype.getDistilledDocument = function () {
    return this.distilled_document;
};

Project.prototype.setCurrentDocument = function (doc) {
    this.current_document = doc;
};

Project.prototype.getCurrentDocument = function () {
    return this.current_document;
};

Project.prototype.setDocuments = function (docs) {
    this.documents = docs
};

Project.prototype.getDocuments = function () {
    var self = this;
    return Object.keys(this.documents).map(function(key){
        return self.documents[key];
    }).sort(function (a, b) {
        return a.getCreatedTs() - b.getCreatedTs();
    });
};

Project.prototype.addDocument = function (doc) {
    this.documents[doc.getId()] = doc;
};

Project.prototype.getDocument = function (id) {
    if (this.documents.hasOwnProperty(id))
        return this.documents[id];
    return null;
};

Project.prototype.setInputURL = function (url) {
    this.import_url = url;
};

Project.prototype.getImportURL = function () {
    return this.import_url;
};

Project.prototype.setProjectScore = function (project_score) {
    this.project_score = project_score;
};

Project.prototype.getProjectScore = function () {
    return this.project_score;
};

Project.prototype.getProjectWideModifiedTs = function () {
    return this.pw_modified_ts;
};

Project.prototype.getProjectWideModifiedDate = function () {
    return new Date(this.pw_modified_ts);
};

Project.prototype.getProjectWideModifiedDateString = function () {
    return new Date(this.pw_modified_ts).toLocaleString();
};

Project.prototype.isShared = function () {
    return this.is_shared;
};

Project.prototype.isWorldShared = function () {
    return this.is_world_shared;
};

Project.prototype.addTableRow = function (table, row) {
    this.table_row[table] = row;
};

Project.prototype.getTableRow = function (table) {
    if (this.table_row.hasOwnProperty(table))
        return this.table_row[table];
    return null;
};

Project.prototype.isExpanded = function () {
    return true;
};

Project.prototype.getURL = function () {
    return ARTIFACT_URLS.project + this.getRequestId();
};

Project.prototype.getParentPermissions = function () {
    return [];
};

Project.prototype.canInherit = function () {
    return false;
};

Project.prototype.getDepth = function () {
    return 0;
};

Project.prototype.toDict = function () {
    var d = ProjectNode.prototype.toDict.call(this);

    d.version = 2;
    d.id = this.getRequestId();
    d.title = this.getTitle();
    d.created_ts = this.getCreatedTs();
    d.modified_ts = this.getModifiedTs();
    d.distilled_document = this.getDistilledDocument().toDict();

    d.documents = [];
    for (var i = 0; i < this.documents.length; i++)
        d.documents.push(this.documents[i].toDict());

    return d;
};

Project.get = function (id) {
    if (Project.projects_by_id.hasOwnProperty(id))
        return Project.projects_by_id[id];
    return null;
};

Project._getOrderedConcepts = function (parent, array) {
    array.push(parent);
    var children = parent.getChildren();
    for (var i = 0; i < children.length; i++)
        Project._getOrderedConcepts(children[i], array);
};

// Return all concepts in depth first order
Project.getOrderedConcepts = function () {
    var concepts = [];
    Project._getOrderedConcepts(Project.project, concepts);
    return concepts;
};

Project.inUse = function () {
    return Project.in_user;
};

Project.getProject = function () {
    return Project.project;
};

Project.getProjects = function () {
    return Project.projects;
};

Project.remove = function (project) {
    var index = Project.projects.indexOf(project);
    if (index >= 0)
        Project.projects.splice(index, 1);
};

Project.getId = function () {
    return Project.project.getId();
};

Project.getRequestId = function () {
    return Project.project.getRequestId();
};

Project.getTitle = function () {
    return Project.project.getTitle();
};

Project.getDistilledDocument = function () {
    return Project.project.distilled_document ;
};

Project.setCurrentDocument = function (document) {
    Project.project.current_document = document;
    if (Page.isProjectPage())
        document.getDvsDiv().append(Project.project.getDvsRender().span);
};

Project.getCurrentDocument = function () {
    return Project.project.current_document;
};

Project.addDocument = function (doc) {
    Project.project.addDocument(doc);
};

Project.getDocuments = function () {
    return Project.project.getDocuments();
};

Project.addConcept = function (concept) {
    Project.concepts[concept.getId()] = concept;
};

Project.removeConcept = function (concept) {
    if (Project.concepts.hasOwnProperty(concept.getId()))
        delete Project.concepts[concept.getId()];
};

Project.getConceptLoader = function () {
    return this.conceptLoader;
};

Project.getDvsRender = function () {
    return Project.project.getDvsRender();
};

Project.getPermissions = function () {
    return Project.project.getPermissions();
};

Project.getParentPermissions = function () {
    return Project.project.getParentPermissions();
};

Project._renderSummary = function (doc) {
    var paragraph_count = parseInt(doc.getCurrentWordCount() / SummaryDocument.paragraph_word_count_divider);
    var temp = doc.getCurrentWordCount() % SummaryDocument.paragraph_word_count_divider;
    if (temp > 0)
        paragraph_count++;

    AbstractRender.render(paragraph_count, Project.project, doc);
    doc.getDocument().getDvsDiv().children().detach();
    doc.getDocument().getDvsDiv().append(Project.project.getSummaryRender().span);

    return true;
};


Project._renderPresentation = function (doc) {
    PresentationRender.render(Project.project.getPresentationSlide(doc), doc);
    doc.getDocument().getDvsDiv().children().detach();
    var wrapper_div = $('<div></div>');
    wrapper_div.attr('id', 'pres_wrapper');

    var position = 'relative';
    if (DVS.document_text.hasClass('full-screen')) {
        position = 'inherit';
    }
    wrapper_div.css('position', position);

    wrapper_div.append(Project.project.getPresentationSlide(doc).getRenderObj().div);
    doc.getDocument().getDvsDiv().append(wrapper_div);
    return true;
};

Project._renderAll = function (parent, doc) {
    var children = parent.getChildren();
    if (children == null || children.length == 0) {
        parent.updateChildrenSpans();
        return;
    }

    for (var i = 0; i < children.length; i++) {
        children[i].render(doc, Concept.renderEngine);
        Project._renderAll(children[i], doc);
    }
    parent.updateChildrenSpans();
};

Project.renderAll = function () {
    if (!Project.render_enabled) {
        console.debug('Rendering Disabled');
        return;
    }

    console.debug('Rendering');
    var doc = Project.project.getCurrentDocument();
    var doc_state = doc.getState();
    Project.renderEngine.process_root(Project.project, doc);

    if (doc_state == Document.STATE_SUMMARY) {
        Project._renderAll(Project.project, doc);
        var summary_document = doc.getSummaryDocument();
        summary_document.generateCrawlContext(function () {
            if (!summary_document.isRunning()) {
                summary_document.summaryComplete();
            }
            Project._renderSummary(summary_document);
        });
    } else if (doc_state == Document.STATE_PRESENTATION) {
        Project._renderAll(Project.project, doc);
        var presentation_document = doc.getPresentationDocument();
        presentation_document.generateSlides(function () {
            if (!presentation_document.isRunning()) {
                PresentationRender.hideModal();
                presentation_document.presentationComplete();
            }
            Project._renderPresentation(presentation_document);

            $('.step').each(function (index) {
                $(this).attr('data-slide-index', index + 1);
            });
        });
        DVS.resizeDVS();
    } else { // doc_state == Document.STATE_TEXT
        if (doc.getDvsDiv() && !(Page.isWorldPage() || Page.isConceptPage())) {
            doc.getDvsDiv().children().detach();
            doc.getDvsDiv().append(Project.project.getDvsRender().span);
        }
        Project._renderAll(Project.project, doc);
    }

    if (Project.project.getChildren().length == 0)
        show_new_project_instructions();

    if (Project.project.getChildren().length > 0)
        $('#empty-project-info').click();

    if (SummerNote.summernote)
        setTimeout(function () {SummerNote.summernote.focus()}, 20);

    if (TVS.inUse())
        TVS.redraw();

    DVS.updateScrollPosition();
};

Project._renderPrint = function (parent, document, printRender) {
    var i;
    var children = parent.getChildren();

    if (children == null || children.length == 0)
        return;

    for (i = 0; i < children.length; i++) {
        children[i].render(document, printRender);
        Project._renderPrint(children[i], document, printRender);
    }

    var children_span = parent.print_render.children_span;
    var parent_children_span = parent.print_render.parent_children_span;
    children_span.children().detach();
    parent_children_span.children().detach();
    i = 0;
    for (i; i < children.length; i++) {
        if (children[i].isParent())
            break;
        children_span.append(children[i].print_render.span);
    }
    for (i; i < children.length; i++) {
        parent_children_span.append(children[i].print_render.span);
    }
};

Project.enableRender = function () {
    Project.render_enabled = true;
};

Project.disableRender = function () {
    Project.render_enabled = false;
};

Project.renderPrint = function (document) {
    if (!document)
        document = Document.getCurrent();
    var printRender = new PrintRender();
    printRender.process_root(Project.project, document);
    Project._renderPrint(Project.project, document, printRender)
};

Project.finalizePageSetup = function (act_con) {
//    init_chat();
    Project.project.dvs_render.span = $('<span></span>');
    Project.project.dvs_render.children_span = $('<span></span>');
    Project.project.dvs_render.parent_children_span = $('<span></span>');
    Project.project.dvs_render.span.append(Project.project.dvs_render.children_span);
    Project.project.dvs_render.span.append(Project.project.dvs_render.parent_children_span);

    Document.initDocumentTabs();
    Document.getCurrent().showViewStateSelector();
    Project.renderAll();

    if (Page.isWorldPage() || Page.isConceptPage())
        $('#document_text').append(Project.project.getDvsRender().span);

    var children = Project.project.getChildren();
    if (Page.navActive() && children.length > 0)
        ConceptEventListener.activate(children[0], true, true);

    var queue = [];
    for (var i = 0; i < children.length; i++) {
        if (children[i].isParent())
            queue.push({con: children[i], priority: true})
    }

    Project.getConceptLoader().queue(queue, function () {
        if (Page.isProjectPage())
            Annotation.fetchFromServer();
        Project.renderAll();
        if (act_con)
            Concept.activateConceptById(act_con);
    });

    PVS.setDocumentProperties(Project.getCurrentDocument());
    DVS.resizeDVS();
};

Project.setupPage = function (children, act_con) {
    document.title = Project.project.getTitle();
    document.getElementById("pscorer").innerHTML = Project.project.getProjectScore();

    if (Page.isProjectPage())
        TVS.initialize();
    var loader = Project.getConceptLoader();
    loader.stay_ahead = false;
    var link_data;

    if (children && children.length > 0) {
            var parent = Project.project;
            for (var i = 0; i < children.length; i++) {
                var data = children[i];
                if (data.link.length > 0) {
                    if (data.link.length > 0) {
                        for (var j = 0; j < data.link.length; j++) {
                            if (data.link[i].parent == parent.getId()) {
                                link_data = data.link[j];
                            }
                        }
                        data.is_linked = true;
                    }
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

                parent.addChild(new_concept, i);
                parent.setBeingFetched(false);
                parent.setLoaded(true);
                if (TVS.inUse())
                    TVS.createNode(new_concept);

                if (Page.depthLimited())
                    if (new_concept.getDepth() >= Page.getDepthLimit())
                        new_concept.setIsParent(false);

                Project.renderAll();
                ConceptEventListener.reactivate();
            }
        Project.renderAll();
        Project.finalizePageSetup();
    } else {
        loader.queue([{con: Project.project, priority: true}], function () {
            Project.finalizePageSetup(act_con);
        });
    }

    $('#presentation-fullscreen-button').click(function () {
        Util.startSlideShow();
    });

    var downvote_icon = $("#voter_down");
    var downvote_class = $("fa fa-chevron-circle-down");
    var upvote_icon = $("#voterrrrr_up");
    var upvote_class = $("fa fa-chevron-circle-up");
    var total_score = $("#pscorer");

    downvote_icon.click(function (){
      ProjectEventListener.downvote(Project.project, null, function () {
          total_score.empty();
          total_score.append(Project.project.getProjectScore());
          Project.project.user_vote = "direction:down";
          if (Project.project.user_vote.direction != "down") {
            $( "div.voting-buttons-div i" ).removeClass("up");
            $( "div.voting-buttons-div i" ).addClass("down");
          }
      }, true);
    });

    upvote_icon.click(function (){
      ProjectEventListener.upvote(Project.project, null, function () {
          total_score.empty();
          total_score.append(Project.project.getProjectScore());
          Project.project.user_vote = "direction:up";
          if (Project.project.user_vote.direction != "up") {
            $( "div.voting-buttons-div i" ).removeClass("down");
            $( "div.voting-buttons-div i" ).addClass("up");
          }
      }, true);
    });
};

Project.getUserProjects = function (user, cb) {
    Project.projects = [];
    Project.projects_by_id = {};

    var project;
    comms.get({
        url: ARTIFACT_URLS.project,
        data: {'type': 'json'},
        success: function (data) {
            for (var i = 0; i < data.length; i++) {
                project = new Project();
                project.initProject(data[i], null, false)
            }

            if (cb)
                cb(Project.projects);
        }
    })
};
