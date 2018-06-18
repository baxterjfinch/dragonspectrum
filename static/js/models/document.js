/** @class
 * Document Base Class
 *
 * @property {string] title - Document title
 * @property {string] subtitle - Document subtitle
 * @property {string] author - Document author
 * @property {string] version - Document version
 * @property {string] date - Document date
 * @property {string] copyrightText - Document copyright text
 * @property {string] description - Document description
 * @property {Array<string>] operationsList - Document's permissions operations
 */
function Document() {
    SecureArtifact.call(this);
    this.state = null;
    this.title = null;
    this.subtitle = null;
    this.author = null;
    this.version = null;
    this.date = null;
    this.copyright_text = null;
    this.description = null;
    this.summary_document = null;
    this.presentation_document = null;
    this.view_state_selecter = null;
    this.published = null;
    this.operations_list = [
        'admin', 'read', 'write', 'manage_phrasings',
        'set_crawlcontext', 'annotation_read',
        'annotation_write', 'bookmark_read', 'bookmark_write'
    ];

    this.dvs_tab = null;
    this.dvs_div = null;
}

Document.prototype = Object.create(SecureArtifact.prototype);
Document.prototype.constructor = Document;

Document.documents = {};

Document.tab_classes = 'document_context';
Document.content_classes = 'tab-pane';

Document.document_tab = $("#document_tab");
Document.document_tab_content = $("#document_tab_content");

Document.STATE_TEXT = 'text';
Document.STATE_SUMMARY = 'summary';
Document.STATE_PRESENTATION = 'presentation';

/** @instance
 * Init function for document
 *
 * @param {object} document - Document options
 */
Document.prototype.initDocument = function (document) {
    this.initSecureArtifact(document);
    this.state = Document.STATE_TEXT;
    this.title = document.title;
    this.subtitle = document.subtitle;
    this.author = document.author;
    this.version = document.version;
    this.date = document.date;
    this.copyright_text = document.copyright_text;
    this.description = document.description;
    this.published = document.published;
    this.summary_published = document.summary_published;
    this.presentation_published = document.presentation_published;

    if (document.summary_document) {
        document.summary_document.document = this;
        this.summary_document = new SummaryDocument();
        this.summary_document.initSummaryDocument(document.summary_document);
    }

    if (document.presentation_document) {
        document.presentation_document.document = this;
        this.presentation_document = new PresentationDocument();
        this.presentation_document.initPresentationDocument(document.presentation_document);
    }

    Document.documents[this.getId()] = this;
};

Document.prototype.setState = function (state) {
    this.state = state;
};

Document.prototype.getState = function () {
    return this.state;
};

Document.prototype.setTitle = function (title) {
    this.title = title;
    this.refreshTitleTab();
};

Document.prototype.refreshTitleTab = function () {
    var a = this.getDvsTab().data('a');
    a.empty();
    a.append(this.getTitle());
    if (this.getPermissions().hasExplicitPermissions())
        a.append(Permission.security_icon);
};

Document.prototype.getTitle = function () {
    return this.title;
};

Document.prototype.setSubtitle = function (title) {
    this.subtitle = title;
};

Document.prototype.getSubtitle = function () {
    return this.subtitle;
};

Document.prototype.setAuthor = function (author) {
    this.author = author;
};

Document.prototype.getAuthor = function () {
    return this.author;
};

Document.prototype.setVersion = function (version) {
    this.version = version;
};

Document.prototype.getVersion = function () {
    return this.version;
};

Document.prototype.setDate = function (date) {
    this.date = date;
};

Document.prototype.getDate = function () {
    return this.date;
};

Document.prototype.setCopyright = function (text) {
    this.copyright_text = text;
};

Document.prototype.getCopyright = function () {
    return this.copyright_text;
};

Document.prototype.setDescription = function (description) {
    this.description = description;
};

Document.prototype.getDescription = function () {
    return this.description;
};

Document.prototype.getPublishedIndex = function (pub) {
    return this.published.indexOf(pub);
};

Document.prototype.removePublished = function (pub) {
    var index = this.getPublishedIndex(pub);
    if (index >= 0)
        this.published.splice(index, 1);
};

Document.prototype.addPublished = function (pub) {
    var exists = false;
    for (var i = 0; i < this.published.length; i++) {
        if (this.published[i].version_int == pub.version_int &&
                this.published[i].group == pub.group) {
            exists = true;
            break;
        }
    }
    if (!exists)
        this.published.push(pub);
};

Document.prototype.getPublished = function () {
    return this.published;
};

Document.prototype.getSummaryPublishedIndex = function (pub) {
    return this.summary_published.indexOf(pub);
};

Document.prototype.removeSummaryPublished = function (pub) {
    var index = this.getSummaryPublishedIndex(pub);
    if (index >= 0)
        this.summary_published.splice(index, 1);
};

Document.prototype.getSummaryPublished = function () {
    return this.summary_published;
};

Document.prototype.addSummaryPublished = function (pub) {
    var exists = false;
    for (var i = 0; i < this.summary_published.length; i++) {
        if (this.summary_published[i].version_int == pub.version_int &&
                this.summary_published[i].group == pub.group) {
            exists = true;
            break;
        }
    }
    if (!exists)
        this.summary_published.push(pub);
};

Document.prototype.getPresentationPublishedIndex = function (pub) {
    return this.presentation_published.indexOf(pub);
};

Document.prototype.removePresentationPublished = function (pub) {
    var index = this.getPresentationPublishedIndex(pub);
    if (index >= 0)
        this.presentation_published.splice(index, 1);
};

Document.prototype.addPresentationPublished = function (pub) {
    var exists = false;
    for (var i = 0; i < this.presentation_published.length; i++) {
        if (this.presentation_published[i].version_int == pub.version_int &&
                this.presentation_published[i].group == pub.group) {
            exists = true;
            break;
        }
    }
    if (!exists)
        this.presentation_published.push(pub);
};

Document.prototype.getPresentationPublished = function () {
    return this.presentation_published;
};


Document.prototype.setSummaryDocument = function (doc) {
    this.summary_document = doc;
};

Document.prototype.getSummaryDocument = function () {
    return this.summary_document;
};

Document.prototype.setPresentationDocument = function (doc) {
    this.presentation_document = doc;
};

Document.prototype.getPresentationDocument = function () {
    return this.presentation_document;
};

Document.prototype.clearPropteries = function () {
    this.setTitle('');
    this.setSubtitle('');
    this.setAuthor('');
    this.setCopyright('');
    this.setDate('');
    this.setVersion('');
    this.setDescription('');
};

Document.prototype.isDistilled = function () {
    return Project.getDistilledDocument() == this;
};

Document.prototype.setDvsTab = function (tab) {
    this.dvs_tab = tab;
};

Document.prototype.getDvsTab = function () {
    return this.dvs_tab;
};

Document.prototype.setDvsDiv = function (div) {
    this.dvs_div = div;
};

Document.prototype.getDvsDiv = function () {
    return this.dvs_div;
};

Document.prototype.isCurrent = function () {
    return Project.getCurrentDocument() == this;
};

Document.prototype.getSharedURL = function (nav) {
    var url = location.origin + ARTIFACT_URLS.project + Project.getId() + '?doc=' + this.getRequestId();
    if (nav) {
        url += '&nav=true';
    } else {
        url += '&nav=false';
    }
    return url
};

Document.prototype.getParentPermissions = function () {
    var parent_permissions = [];
    if (!this.isDistilled())
        parent_permissions.push(Project.getDistilledDocument().getPermissions().getPermissions());
    parent_permissions.push(Project.getPermissions().getPermissions());
    return parent_permissions;
};

Document.prototype.getAlternativeOperation = function (operation) {
    if (operation == 'manage_phrasings' || operation == 'annotation_write' ||
        operation == 'bookmark_write' || operation == 'set_crawlcontext') {
        operation = 'write';
    } else if (operation == 'annotation_read' || operation == 'bookmark_read') {
        operation = 'read';
    }

    return operation;
};

Document.prototype.hasPermissionManagePhrasings = function (user) {
    return SecureArtifact.hasPermission(this, user, 'manage_phrasings');
};

Document.prototype.hasPermissionAnnotationWrite = function (user) {
    return SecureArtifact.hasPermission(this, user, 'annotation_write');
};

Document.prototype.hasPermissionAnnotationRead = function (user) {
    return SecureArtifact.hasPermission(this, user, 'annotation_read');
};

Document.prototype.setViewStateSelector = function (vs) {
    this.view_state_selecter = vs;
};

Document.prototype.getViewStateSelector = function () {
    return this.view_state_selecter;
};

Document.prototype.showViewStateSelector = function () {
    if (this.view_state_selecter)
        this.view_state_selecter.removeClass('hidden');
};

Document.prototype.hideViewStateSelecter = function () {
    if (this.view_state_selecter)
        this.view_state_selecter.addClass('hidden');
};

Document.prototype.toDict = function () {
    var d = SecureArtifact.prototype.toDict.call(this);
    d.title = this.getTitle();
    d.subtitle = this.getSubtitle();
    d.copyright_text = this.getCopyright();
    d.author = this.getAuthor();
    d.date = this.getDate();
    d.description = this.getDescription();
    d.version = this.getVersion();
    return d;
};

Document.add = function (document) {
    Document.documents[document.getId()] = document;
};

Document.remove = function (document) {
    delete Document.documents[document.getId()]
};

Document.get = function (id) {
    if (Document.documents.hasOwnProperty(id))
        return Document.documents[id];
    return null;
};

Document.getCurrent = function () {
    return Project.getCurrentDocument();
};

Document.getAll = function () {
    return Object.keys(Document.documents).map(function (key) {
        return Document.documents[key];
    });
};

Document.getOrCreate = function (doc) {
    if (Document.documents.hasOwnProperty(doc.id))
        return Document.documents[doc.id];
    var document = new Document();
    document.initDocument(doc);
    return document;
};

Document._createDocumentTab = function (doc, isActive) {
    var li = $('<li></li>');
    if (isActive)
        li.addClass('active');
    var a = $('<a></a>');
    li.data('a', a);
    a.data('document', doc);
    a.attr('id', doc.getId() + '-dts');
    a.attr('href', '#document-pane-' + doc.getId());
    a.attr('data-toggle', 'tab');
    a.append(doc.getTitle());

    var div = $('<div></div>');
    div.addClass('btn-group doc-type-selector');

    var button = $('<button></button>');
    button.addClass('btn btn-info btn-xs dropdown-toggle hidden');
    button.attr('data-toggle', 'dropdown');
    button.html('<i class="fa fa-fw fa-file-text-o"></i> <span class="caret small-caret"></span>');
    div.append(button);
    doc.setViewStateSelector(button);

    var dul = $('<ul></ul>');
    dul.addClass('dropdown-menu');
    dul.attr('role', 'menu');
    div.append(dul);

    var dli = $('<li></li>');
    var da = $('<a></a>');
    da.attr('href', '#');
    da.append('<i class="fa fa-fw fa-file-text-o"></i> Document Text');
    da.click(function () {
        DocumentEventListener.setStateTextMouseClick(doc);
    });
    dli.append(da);
    dul.append(dli);

    dli = $('<li></li>');
    da = $('<a></a>');
    da.attr('href', '#');
    da.append('<i class="fa fa-fw fa-magic"></i> Summary / Abstract');
    da.click(function () {
        DocumentEventListener.setStateSummaryMouseClick(doc);
    });
    dli.append(da);
    dul.append(dli);

    dli = $('<li></li>');
    da = $('<a></a>');
    da.attr('href', '#');
    da.append('<i class="fa fa-fw fa-file-powerpoint-o"></i> Presentation');
    da.click(function () {
        DocumentEventListener.setStatePresentationMouseClick(doc);
    });
    dli.append(da);
    dul.append(dli);

    a.append(' ');
    a.append(div);

    if (doc.getPermissions().hasExplicitPermissions())
        a.append(Permission.security_icon);
    a.click(function (e) {
        e.preventDefault();

        if (Document.getCurrent() != doc) {
            $(this).tab('show');
            DocumentEventListener.activateMouseClick(doc);
            CollaborationUser.activateAll();
            DocumentChat.changeDocument(doc);
            DocumentEventListener.setStateText(doc, true, true, true);
        }
    });
    a.addClass(Document.tab_classes);
    li.append(a);

    return li;
};

Document._createDocumentContent = function (doc, isActive) {
    var div = $('<div></div>');
    div.data('document', doc);
    div.attr('id', 'document-pane-' + doc.getId());
    div.addClass(Document.content_classes);
    if (isActive)
        div.addClass('active');
    div.attr('data-toggle', 'pill');
    return div;
};

Document.addDocumentTab = function (doc, active) {
    var tab = Document._createDocumentTab(doc, active);
    var div = Document._createDocumentContent(doc, active);

    doc.setDvsTab(tab);
    doc.setDvsDiv(div);

    Document.document_tab.append(tab);
    Document.document_tab_content.append(div);
};

Document.initDocumentTabs = function () {
    // Make sure all the current tabs are cleared out.
    Document.document_tab.val('');
    Document.document_tab_content.val('');

    var distilledDoc = Project.getDistilledDocument();
    Document.addDocumentTab(distilledDoc, true);
    var dvsRender = Project.getDvsRender();
    distilledDoc.getDvsDiv().append(dvsRender.span);

    var documents = Project.getDocuments();
    for (var i = 0; i < documents.length; i++) {
        if (!documents[i].isDistilled()) {
            Document.addDocumentTab(documents[i], false);
        }
    }
};


function SummaryDocument() {
    Artifact.call(this);
    this.document = null;
    this.word_count = null;
    this.current_word_count = null;
    this.is_running = false;
    this.is_complete = true;
}

SummaryDocument.prototype = Object.create(Artifact.prototype);
SummaryDocument.prototype.constructor = SummaryDocument;

SummaryDocument.summary_documents = {};
SummaryDocument.crawlcontext_state = {};

SummaryDocument.paragraph_word_count_divider = 300;

SummaryDocument.word_count_slider = $("#summary-slider");
SummaryDocument.summary_slider_handle = $("#summary-slider-handle");
SummaryDocument.summary_progress = $("#summary-progress");
SummaryDocument.summary_slider_progress = $("#summary-slider-progress");
SummaryDocument.word_count_slider_well = $('#summary-well');
SummaryDocument.word_count = $("#summary-word-count");
SummaryDocument.summary_current_word_count = $("#summary-current-word-count");

SummaryDocument.prototype.initSummaryDocument = function (doc) {
    this.initArtifact(doc);
    this.document = doc.document;
    this.word_count = doc.word_count;

    SummaryDocument.summary_documents[doc.id] = this;
};

SummaryDocument.prototype.setDocument = function (doc) {
    this.document = doc;
};

SummaryDocument.prototype.getDocument = function () {
    return this.document;
};

SummaryDocument.prototype.setWordCount = function (count) {
    this.word_count = count;
};

SummaryDocument.prototype.getWordCount = function () {
    return this.word_count;
};

SummaryDocument.prototype.setRunning = function (flag) {
    this.is_running = flag;
};

SummaryDocument.prototype.isRunning = function () {
    return this.is_running;
};

SummaryDocument.prototype.setComplete = function (flag) {
    if (this.is_complete == flag) {
        return;
    }

    this.is_complete = flag;
    if (flag) {
        SummaryDocument.summary_progress.hide();
    } else {
        SummaryDocument.summary_progress.show();
    }
};

SummaryDocument.prototype.isComplete = function () {
    return this.is_complete;
};

SummaryDocument.prototype.setCurrentWordCount = function (wc) {
    this.current_word_count = wc;
};

SummaryDocument.prototype.getCurrentWordCount = function () {
    return this.current_word_count;
};

SummaryDocument.prototype.updateWordCount = function (count) {
    if (!count)
        count = this.getCurrentWordCount();
    SummaryDocument.summary_current_word_count.text(count);
    this.setCurrentWordCount(count);
    var max = this.getWordCount();
    var perc = count / max;
    this.setSummaryProgress(perc);
};

SummaryDocument.prototype.summaryComplete = function (count) {
    SummaryDocument.clearCrawlcontextState();
    this.setSummaryProgress(1);
    this.setComplete(true);
};

SummaryDocument.prototype.setSummaryProgress = function (percentage) {
    setTimeout(function() {
        var position = SummaryDocument.summary_slider_handle.position();
        var left = position.left;
        var n_perc = left * percentage;
        SummaryDocument.summary_slider_progress.css('width', n_perc + 'px');
    }, 10);
};

SummaryDocument.prototype._getNextTreeColumn = function (concept_array, col) {
    var ary = [];
    var element;
    if (concept_array.length == 0)
        return null;
    for (var i = 0; i < concept_array.length; i++) {
        if (concept_array[i].isRoot() && col == 0) {
            element = [];
            element.push(concept_array[i]);
            element.push(0);
            ary.push(element);
        } else if (concept_array[i].getDepth() + 1 == col) {
            element = [];
            element.push(concept_array[i]);
            element.push(0);
            ary.push(element);
        }
    }
    return ((ary.length > 0) ? ary : null);
};

SummaryDocument.prototype._getNextImportantChild = function (parent) {
    var children = parent[0].getChildren();
    if (children.length == 0) {
        return null;
    } else if (children.length <= parent[1]) {
        return null;
    } else {
        parent[1] += 1;
        return children[parent[1] - 1];
    }
};

SummaryDocument.prototype.generateCrawlContext = function (cb) {
    if (this.isRunning())
        return;
    this.setRunning(true);
    this.setComplete(false);

    var self = this;
    var concept_array = Project.getOrderedConcepts();
    var col = 0; // The current column number of the tree;
    var col_array; // Array of the nodes in column "col"
    var cwc = 0; // Current word count
    var wc = 0; // temp word count
    var index = 0; // index of our col_array
    var nic; // This will be the next important child;
    var crawlcontext;
    var doc_crawlcontext;

    // Reset all temp crawlcontext
    var temp_crawlcontext = SummaryCrawlContext.getByDocument(this);
    if (temp_crawlcontext) {
        for (var i = 0; i < temp_crawlcontext.length; i++) {
            if (temp_crawlcontext[i].isTemp())
                temp_crawlcontext[i].setCrawl(false);
            temp_crawlcontext[i].setRendered(false);
        }
    }

    while ((col_array = this._getNextTreeColumn(concept_array, col)) != null) {
        index = 0;
        while (col_array.length > 0) {
            nic = this._getNextImportantChild(col_array[index]);


            if (nic == null) { // If there is not next important child then we remove the node from the array
                col_array.splice(index, 1);
                index -= 1; // Because we remove the element from the array

            } else {
                function check_word_count(next_con, cc) {
                    wc = next_con.getSummaryDocumentPhrasing(self).getWordCount();

                    // We want to stop if we reach our word count, but we don't want to count headers
                    // so even if the header puts us over the word count, one if its children may not.
                    var attribute = next_con.getDocumentAttribute(Document.getCurrent());
                    if (((wc + cwc) <= self.getWordCount() && ((attribute && !attribute.isImage()) || !attribute))
                            || (attribute && attribute.isHeader())) {
                        cc.setCrawl(true);
                        cc.setRendered(true);
                        if (cc.isTemp())
                            SummaryDocument.setCrawlcontextState(cc, SummaryCrawlContext.STATE_AUTO_SELECTED);
                        if (!attribute || (attribute && !attribute.isHeader())) {
                            cwc += wc;
                            self.updateWordCount(cwc);
                        }

                        if (next_con.isParent() && next_con.getChildren().length == 0) {
                            Project.getConceptLoader().processCache();
                            Project.getConceptLoader().queue([
                                {con: next_con, priority: true}
                            ], function () {
                                Project.getConceptLoader().processCache();
                                self.setRunning(false);
                                Project.renderAll();
                            }, null, null, true);

                            return false;
                        }
                        return true;
                    }

                    if ((cwc) > (self.getWordCount() * 0.9) ) {
                        self.setRunning(false);
                        return false;
                    }
                    return true;
                }

                crawlcontext = nic.getSummaryCrawlContextByDocId(this.getId());
                if (crawlcontext && !crawlcontext.isTemp()) {
                    if (crawlcontext.getCrawl()) {
                        SummaryDocument.setCrawlcontextState(crawlcontext, SummaryCrawlContext.STATE_USER_SELECTED);
                        if (!check_word_count(nic, crawlcontext)) {
                            cb();
                            return;
                        }
                    } else {
                        SummaryDocument.setCrawlcontextState(crawlcontext, SummaryCrawlContext.STATE_USER_UNSELECTED);
                    }
                } else {
                    if (!crawlcontext) {
                        crawlcontext = new SummaryCrawlContext();
                        crawlcontext.setId(Util.generateUUID1());
                        crawlcontext.setDocument(this);
                        crawlcontext.setConcept(nic);
                        crawlcontext.setCrawl(false);
                        crawlcontext.setTemp(true);
                        nic.addSummaryCrawlContext(crawlcontext);
                    }

                    SummaryDocument.setCrawlcontextState(crawlcontext, SummaryCrawlContext.STATE_AUTO_UNSELECTED);
                    doc_crawlcontext = nic.getCrawlContextByDocId(this.getDocument().getId());
                    if (!doc_crawlcontext || doc_crawlcontext.getCrawl()) {
                        if (!check_word_count(nic, crawlcontext)) {
                            cb();
                            return;
                        }
                    }
                }
            }

            if (index + 1 == col_array.length)
                index = 0;
            else
                index++;
        }
        col++;
    }

    this.setRunning(false);
    cb();
};

SummaryDocument.get = function (id) {
    return SummaryDocument.summary_documents[id];
};

SummaryDocument.setCrawlcontextState = function (crawlcontext, state) {
    SummaryDocument.crawlcontext_state[crawlcontext.getId()] = state;
};

SummaryDocument.getCrawlcontextState = function (crawlcontext) {
    return SummaryDocument.crawlcontext_state[crawlcontext.getId()];
};

SummaryDocument.clearCrawlcontextState = function () {
    SummaryDocument.crawlcontext_state = {};
};

SummaryDocument.showWordCountSlider = function () {
    SummaryDocument.word_count_slider_well.removeClass('hidden');
};

SummaryDocument.hideWordCountSlider = function () {
    SummaryDocument.word_count_slider_well.addClass('hidden');
};

SummaryDocument.initSlider = function (doc) {
    SummaryDocument.word_count.text(doc.getWordCount());
    SummaryDocument.word_count_slider.slider({
        value: doc.getWordCount(),
        min: 100,
        max: 2500,
        step: 50,
        slide: function (event, ui) {
            SummaryDocument.word_count.text(ui.value);
            doc.setWordCount(ui.value);
            Project.renderAll();
            Util.debounce('summary-slider', 500, function () {
                SummaryDocument.summary_slider_handle.blur();
            });
        }
    });
    $("#amount").val("$" + SummaryDocument.word_count_slider.slider("value"));
};


function PresentationDocument() {
    Artifact.call(this);
    this.document = null;
    this.slides = [];
    this.slide_count = 15;
    this.min_bullet = 4;
    this.max_bullet = 6;
    this.is_running = false;
    this.is_complete = true;
}

PresentationDocument.prototype = Object.create(Artifact.prototype);
PresentationDocument.prototype.constructor = PresentationDocument;

PresentationDocument.presentation_documents = {};

PresentationDocument.slide_count_slider = $("#presentation-slider");
PresentationDocument.slide_count_slider_bullet = $("#presentation-slider-bullet");
PresentationDocument.presentation_slider_handle = $("#presentation-slider-handle");
PresentationDocument.presentation_slider_bullet_handle = $("#presentation-slider-bullet-handle");
PresentationDocument.presentation_progress = $("#presentation-progress");
PresentationDocument.presentation_slider_progress = $("#presentation-slider-progress");
PresentationDocument.presentation_slider_bullet_progress = $("#presentation-slider-bullet-progress");
PresentationDocument.slide_count_slider_well = $('#presentation-well');
PresentationDocument.slide_count = $(".presentation-slide-count");
PresentationDocument.presentation_current_slide_count = $(".presentation-current-slide-count");
PresentationDocument.presentation_current_bullet_min = $("#presentation-slider-bullet-min");
PresentationDocument.presentation_current_bullet_max = $("#presentation-slider-bullet-max");

PresentationDocument.presentation_settings_button = $("#presentation-settings-button");
PresentationDocument.presentation_settings = $("#presentation-settings");

PresentationDocument.prototype.initPresentationDocument = function (doc) {
    this.initArtifact(doc);
    this.document = doc.document;

    PresentationDocument.presentation_documents[doc.id] = this;
};

PresentationDocument.prototype.setDocument = function (document) {
    this.document = document;
};

PresentationDocument.prototype.getDocument = function () {
    return this.document;
};

PresentationDocument.prototype.addSlide = function (slide, index) {
    if (index != null)
        this.slides.splice(index, 0, slide);
    else
        this.slides.push(slide);
};

PresentationDocument.prototype.getSlides = function () {
    return this.slides;
};

PresentationDocument.prototype.setSlideCount = function (count) {
    this.slide_count = count;
};


PresentationDocument.prototype.getSlideCount = function () {
    return this.slide_count;
};

PresentationDocument.prototype.setRunning = function (flag) {
    this.is_running = flag;
};

PresentationDocument.prototype.isRunning = function () {
    return this.is_running;
};

PresentationDocument.prototype.setComplete = function (flag) {
    if (this.is_complete == flag) {
        return;
    }

    this.is_complete = flag;
    if (flag) {
//        PresentationDocument.presentation_progress.hide();
    } else {
//        PresentationDocument.presentation_progress.show();
    }
};

PresentationDocument.prototype.isComplete = function () {
    return this.is_complete;
};

PresentationDocument.prototype.updateSlideCount = function (count) {
    if (!count)
        count = this.getSlides().length;
    PresentationDocument.presentation_current_slide_count.text(count);
    var max = this.getSlideCount();
    var perc = count / max;
    this.setPresentationProgress(perc);
};

PresentationDocument.prototype.presentationComplete = function (count) {
    this.setPresentationProgress(1);
    this.setComplete(true);
};

PresentationDocument.prototype.setPresentationProgress = function (percentage) {
    setTimeout(function() {
        var position = PresentationDocument.presentation_slider_handle.position();
        var left = position.left;
        var n_perc = left * percentage;
        PresentationDocument.presentation_slider_progress.css('width', n_perc + 'px');
        PresentationRender.generation_modal_prog.css('width', percentage * 100 + '%');
    }, 10);
};

PresentationDocument.prototype._getNextTreeColumn = function (concept_array, col) {
    var ary = [];
    var element;
    if (concept_array.length == 0)
        return null;
    for (var i = 0; i < concept_array.length; i++) {
        if (concept_array[i].isRoot() && col == 0) {
            element = [];
            element.push(concept_array[i]);
            element.push(0);
            ary.push(element);
        } else if (!concept_array[i].isRoot() && concept_array[i].getDepth() + 1 == col) {
            element = [];
            element.push(concept_array[i]);
            element.push(0);
            ary.push(element);
        }
    }
    return ((ary.length > 0) ? ary : null);
};

PresentationDocument.prototype._getNextImportantChild = function (parent) {
    var children = parent[0].getChildren();
    if (children.length == 0) {
        return null;
    } else if (children.length <= parent[1]) {
        return null;
    } else {
        parent[1] += 1;
        return children[parent[1] - 1];
    }
};

PresentationDocument.prototype.generateSlides = function (cb) {
    if (this.isRunning())
        return;
    this.setRunning(true);
    this.setComplete(false);

    var self = this;
    var concept_array = Project.getOrderedConcepts();
    var col = 0; // The current column number of the tree;
    var col_array; // Array of the nodes in column "col"
    var index = 0; // index of our col_array
    var nic; // This will be the next important child;
    var crawlcontext;
    var doc_crawlcontext;
    var slide;
    var parent;
    var parent_slide;

    // Reset all temp crawlcontext
    var temp_crawlcontext = PresentationCrawlContext.getByDocument(self);
    if (temp_crawlcontext) {
        for (var i = 0; i < temp_crawlcontext.length; i++) {
            if (temp_crawlcontext[i].isTemp())
                temp_crawlcontext[i].setCrawl(false);
            temp_crawlcontext[i].setRendered(false);
        }
    }

    PresentationSlide.clearSlides(self);
    self.slides = [];

    slide = new PresentationSlide();
    slide.initialize(null, Project.getProject(), self);
    Project.getProject().setPresentationSlide(slide, self);
    self.addSlide(slide);

    while ((col_array = self._getNextTreeColumn(concept_array, col)) != null) {
        index = 0;
        while (col_array.length > 0) {
            nic = self._getNextImportantChild(col_array[index]);


            if (nic == null) { // If there is not next important child then we remove the node from the array
                col_array.splice(index, 1);
                index -= 1; // Because we remove the element from the array

            } else {
                function create_slide(next_con, cc) {
                    var attribute = next_con.getDocumentAttribute(Document.getCurrent());
                    if (((attribute && attribute.isImage()) ||
                            next_con.isParent()) &&
                        next_con.isParentsCrawlable(self.getDocument())) {

                        var children = next_con.getChildren().slice();
                        if (next_con.isParent() && children.length == 0) {
                            PresentationRender.showModal();
                            Project.getConceptLoader().processCache();
                            Project.getConceptLoader().queue([
                                {con: next_con, priority: true}
                            ], function () {
                                Project.getConceptLoader().processCache();
                                self.setRunning(false);
                                Project.renderAll();
                            }, null, null, true);

                            return false;
                        }

                        if ((!attribute || (attribute && !attribute.isImage())) && children.length < self.min_bullet) {
                            return true;
                        }

                        cc.setCrawl(true);
                        cc.setRendered(true);

                        parent = next_con.getParent();
                        parent_slide = parent.getPresentationSlide(self);

                        var is_image = false;
                        if (attribute && attribute.isImage()) {
                            is_image = true;
                            var num_slide = 1;
                        } else {
                            for (i = 0; i < children.length; i++) {
                                var attr = children[i].getDocumentAttribute(Document.getCurrent());
                                if (attr && attr.isImage()){
                                    children.splice(i, 1);
                                    i--;
                                }
                            }

                            num_slide = 0;
                            num_slide += parseInt(children.length / self.max_bullet);
                            var remainder = children.length % self.max_bullet;
                            if (remainder >= self.min_bullet)
                                num_slide++;
                        }

                        if (num_slide == 0) {
                            cc.setCrawl(false);
                            cc.setRendered(false);
                        } else {
                            for (i = 0; i < num_slide; i++) {
                                slide = new PresentationSlide();
                                slide.initialize(parent_slide, next_con, self);
                                next_con.setPresentationSlide(slide, self);
                                parent_slide.addSlide(slide);
                                self.addSlide(slide);
                                slide.setIsImage(is_image);
                                if (i > 0)
                                    slide.setIsContinue(true);

                                for (var j = i * self.max_bullet; j < (i * self.max_bullet) + self.max_bullet &&
                                    j < children.length; j++) {
                                    slide.addBullet(children[j]);
                                }

                                self.updateSlideCount(self.getSlides().length - 1);

                                if (self.getSlides().length == self.getSlideCount() + 1) {
                                    self.setRunning(false);
                                    return false;
                                }
                            }
                        }
                    }
                    return true;
                }

                crawlcontext = nic.getPresentationCrawlContextByDocId(self.getId());
                if (crawlcontext && !crawlcontext.isTemp()) {
                    if (crawlcontext.getCrawl()) {
                        if (!create_slide(nic, crawlcontext)) {
                            cb();
                            return;
                        }
                    }
                } else {
                    if (!crawlcontext) {
                        crawlcontext = new PresentationCrawlContext();
                        crawlcontext.setId(Util.generateUUID1());
                        crawlcontext.setDocument(self);
                        crawlcontext.setConcept(nic);
                        crawlcontext.setCrawl(false);
                        crawlcontext.setTemp(true);
                        nic.addPresentationCrawlContext(crawlcontext);
                    }

                    doc_crawlcontext = nic.getCrawlContextByDocId(self.getDocument().getId());
                    if (!doc_crawlcontext || doc_crawlcontext.getCrawl()) {
                        if (!create_slide(nic, crawlcontext)) {
                            cb();
                            return;
                        }
                    }
                }
            }

            if (index + 1 == col_array.length)
                index = 0;
            else
                index++;
        }
        col++;
    }

    self.setRunning(false);
    cb();
};

PresentationDocument.showSlideCountSlider = function () {
    PresentationDocument.slide_count_slider_well.removeClass('hidden');
};

PresentationDocument.hideSlideCountSlider = function () {
    PresentationDocument.slide_count_slider_well.addClass('hidden');
};

PresentationDocument.togglePresentationSettings = function () {
    PresentationDocument.presentation_settings.toggle();
    DVS.resizeDVS();
};

PresentationDocument.initSlider = function (doc) {
    PresentationDocument.slide_count.text(doc.getSlideCount());
    PresentationDocument.slide_count_slider.slider({
        value: doc.getSlideCount(),
        range: "min",
        min: 1,
        max: 100,
        step: 1,
        change: function (event, ui) {
            PresentationDocument.slide_count.text(ui.value);
            doc.setSlideCount(ui.value);
            Project.renderAll();
            Util.debounce('presentation-slider', 500, function () {
                PresentationDocument.presentation_slider_handle.blur();
            });
        },
        slide: function (event, ui) {
            PresentationDocument.slide_count.text(ui.value);
        }
    });

    PresentationDocument.presentation_current_bullet_min.html(doc.min_bullet);
    PresentationDocument.presentation_current_bullet_max.html(doc.max_bullet);

    PresentationDocument.slide_count_slider_bullet.slider({
        range: true,
        values: [doc.min_bullet, doc.max_bullet],
        min: 1,
        max: 15,
        step: 1,
        change: function (event, ui) {
            console.log('min: %s, max: %s', ui.values[0], ui.values[1]);
            doc.min_bullet = ui.values[0];
            doc.max_bullet = ui.values[1];
            PresentationDocument.presentation_current_bullet_min.html(doc.min_bullet);
            PresentationDocument.presentation_current_bullet_max.html(doc.max_bullet);
            Project.renderAll();
            Util.debounce('presentation-slider', 500, function () {
                $('.ui-slider-handle').blur();
            });
        },
        slide: function (event, ui) {
            PresentationDocument.presentation_current_bullet_min.html(ui.values[0]);
            PresentationDocument.presentation_current_bullet_max.html(ui.values[1]);
        }
    });
    $("#amount").val("$" + PresentationDocument.slide_count_slider.slider("value"));
};

PresentationDocument.get = function (id) {
    return PresentationDocument.presentation_documents[id];
};