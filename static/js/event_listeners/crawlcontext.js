function CrawlcontextEventListener () {}

CrawlcontextEventListener.hideToggleShortcut = function () {
    console.debug('CrawlcontextEventListener.hideToggleShortcut');
    var document = Document.getCurrent();
    var concept = Concept.getCurrent();
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    if (!crawlcontext) {
        CrawlcontextEventListener.create(concept, document, false, true, true, true);
        return;
    }
    if (crawlcontext.getCrawl())
        CrawlcontextEventListener.hide(crawlcontext, false, true, true);
    else
        CrawlcontextEventListener.show(crawlcontext, false, true, true);
};

CrawlcontextEventListener.hideTvsMouseClick = function (concept) {
    console.debug('CrawlcontextEventListener.hideTvsMouseClick');
    var document = Document.getCurrent();
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    if (!crawlcontext)
        CrawlcontextEventListener.create(concept, document, false, true, true, true);
    else
        CrawlcontextEventListener.hide(crawlcontext, false, true, true);
};

CrawlcontextEventListener.hideShortcut = function (concept) {
    console.debug('CrawlcontextEventListener.hideShortcut');
    var document = Document.getCurrent();
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    if (!crawlcontext)
        CrawlcontextEventListener.create(concept, document, false, true, true, true);
    else
        CrawlcontextEventListener.hide(crawlcontext, true, true, true);
};

CrawlcontextEventListener.hideCollab = function (user, message) {
    console.debug('CrawlcontextEventListener.hideCollab');
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var action_data = transaction.getActionData();

    var document = Document.get(action_data.document);
    var concept = Concept.get(action_data.concept);
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    var notifyTvs = document == Document.getCurrent();
    if (!crawlcontext)
        CrawlcontextEventListener.create(concept, document, false, notifyTvs, true, false);
    else
        CrawlcontextEventListener.hide(crawlcontext, notifyTvs, true, false);
};

CrawlcontextEventListener.hide = function (crawlcontext, notifyTvs, notifyDvs, notifyServer) {
    console.debug('CrawlcontextEventListener.hide');
    if (!crawlcontext.getCrawl())
        return;
    crawlcontext.setCrawl(false);

    if (notifyTvs) {
        crawlcontext.getConcept().getTvsNode().select(false);
    }

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getId(), crawl: false}
        }}, comms.post);
    }
};

CrawlcontextEventListener.showTvsMouseClick = function (concept) {
    console.debug('CrawlcontextEventListener.showTvsMouseClick');
    var document = Document.getCurrent();
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    if (!crawlcontext)
        CrawlcontextEventListener.create(concept, document, true, true, true, true);
    else
        CrawlcontextEventListener.show(crawlcontext, false, true, true);
};

CrawlcontextEventListener.showShortcut = function (concept) {
    console.debug('CrawlcontextEventListener.showTvsMouseClick');
    var document = Document.getCurrent();
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    if (!crawlcontext) {
        CrawlcontextEventListener.create(concept, document, true, true, true, true);
        return;
    }
    CrawlcontextEventListener.show(crawlcontext, true, true, true);
};

CrawlcontextEventListener.showCollab = function (user, message) {
    console.debug('CrawlcontextEventListener.showCollab');
    var transaction = new Transaction();
    message.transaction.user = user;
    transaction.initializeTransaction(message.transaction);
    var action_data = transaction.getActionData();

    var document = Document.get(action_data.document);
    var concept = Concept.get(action_data.concept);
    var crawlcontext = concept.getCrawlContextByDocId(document.getId());
    var notifyTvs = document == Document.getCurrent();
    if (!crawlcontext)
        CrawlcontextEventListener.create(concept, document, true, notifyTvs, true, false);
    else
        CrawlcontextEventListener.show(crawlcontext, notifyTvs, true, false);
};

CrawlcontextEventListener.show = function (crawlcontext, notifyTvs, notifyDvs, notifyServer) {
    console.debug('CrawlcontextEventListener.show');
    if (crawlcontext.getCrawl())
        return;

    crawlcontext.setCrawl(true);

    if (notifyTvs) {
        crawlcontext.getConcept().getTvsNode().select(true);
    }

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getId(), crawl: true}
        }}, comms.post, false);
    }
};

CrawlcontextEventListener.create = function (concept, document, crawl, notifyTvs, notifyDvs, notifyServer) {
    console.debug('CrawlcontextEventListener.create');
    var dateTs = new Date().getTime();

    var crawlcontext = new CrawlContext();
    crawlcontext.setId(Util.generateUUID1());
    crawlcontext.setCreatedTs(dateTs);
    crawlcontext.setModifiedTs(dateTs);
    crawlcontext.setConcept(concept);
    crawlcontext.setDocument(document);
    crawlcontext.setCrawl(crawl);
    concept.addCrawlContext(crawlcontext);

    if (notifyTvs) {
        crawlcontext.getConcept().getTvsNode().select(crawl);
    }

    if (notifyDvs) {
        Project.renderAll();
    }

    if (notifyServer) {
        comms.queue(function () {return {
            url: ARTIFACT_URLS.crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getId(), crawl: crawl},
            success: function (data) {
                var old_id = crawlcontext.getId();
                crawlcontext.setId(data.id);
                crawlcontext.setCreatedTs(data.created_ts);
                crawlcontext.setModifiedTs(data.modified_ts);
                crawlcontext.getConcept().updateCrawlContextId(old_id);
            }
        }}, comms.post, false);
    }
};


function SummaryCrawlcontextEventListener () {}

SummaryCrawlcontextEventListener.toggleState = function (crawlcontext) {
    var state = SummaryDocument.getCrawlcontextState(crawlcontext);
    if (state) {
        if (crawlcontext.isTemp() && crawlcontext.getCrawl() && state == SummaryCrawlContext.STATE_AUTO_SELECTED)
            return;
        if (crawlcontext.isTemp() && !crawlcontext.getCrawl() && state == SummaryCrawlContext.STATE_AUTO_UNSELECTED)
            return;
        if (!crawlcontext.isTemp() && crawlcontext.getCrawl() && state == SummaryCrawlContext.STATE_USER_SELECTED)
            return;
        if (!crawlcontext.isTemp() && !crawlcontext.getCrawl() && state == SummaryCrawlContext.STATE_USER_UNSELECTED)
            return;
    }

    console.warn('Changing crawlcontext state');
    if (crawlcontext.isTemp()) {
//        if (crawlcontext.getCrawl())
//            SummaryCrawlcontextEventListener.setUnSelected(crawlcontext, true, true, true);
//        else
            SummaryCrawlcontextEventListener.setSelected(crawlcontext, true, true, true);
    } else if (crawlcontext.getCrawl()) {
        SummaryCrawlcontextEventListener.setUnSelected(crawlcontext, true, true, true);
    } else {
        SummaryCrawlcontextEventListener.setTemp(crawlcontext, true, true, true);
    }
};

SummaryCrawlcontextEventListener.setSelected = function (crawlcontext, notifyDvs, notifyTvs, notifyServer) {
    crawlcontext.setCrawl(true);
    crawlcontext.setTemp(false);

    if (notifyServer) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.summary_crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getDocument().getId(), crawl: true, temp: false}
        }});
    }
};

SummaryCrawlcontextEventListener.setUnSelected = function (crawlcontext, notifyDvs, notifyTvs, notifyServer) {
    crawlcontext.setCrawl(false);
    crawlcontext.setTemp(false);

    if (notifyServer) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.summary_crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getDocument().getId(), crawl: false, temp: false}
        }});
    }
};

SummaryCrawlcontextEventListener.setTemp = function (crawlcontext, notifyDvs, notifyTvs, notifyServer) {
    crawlcontext.setCrawl(false);
    crawlcontext.setTemp(true);

    if (notifyServer) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.summary_crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getDocument().getId(), crawl: false, temp: true}
        }});
    }
};

function PresentationCrawlcontextEventListener () {}

PresentationCrawlcontextEventListener.toggleState = function (crawlcontext) {
    console.warn('Changing crawlcontext state');
    if (crawlcontext.isTemp()) {
        PresentationCrawlcontextEventListener.setSelected(crawlcontext, true, true, true);
    } else if (crawlcontext.getCrawl()) {
        PresentationCrawlcontextEventListener.setUnSelected(crawlcontext, true, true, true);
    } else {
        PresentationCrawlcontextEventListener.setTemp(crawlcontext, true, true, true);
    }
};

PresentationCrawlcontextEventListener.setSelected = function (crawlcontext, notifyDvs, notifyTvs, notifyServer) {
    crawlcontext.setCrawl(true);
    crawlcontext.setTemp(false);

    if (notifyServer) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.presentation_crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getDocument().getId(), crawl: true, temp: false}
        }});
    }
};

PresentationCrawlcontextEventListener.setUnSelected = function (crawlcontext, notifyDvs, notifyTvs, notifyServer) {
    crawlcontext.setCrawl(false);
    crawlcontext.setTemp(false);

    if (notifyServer) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.presentation_crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getDocument().getId(), crawl: false, temp: false}
        }});
    }
};

PresentationCrawlcontextEventListener.setTemp = function (crawlcontext, notifyDvs, notifyTvs, notifyServer) {
    crawlcontext.setCrawl(false);
    crawlcontext.setTemp(true);

    if (notifyServer) {
        Project.renderAll();
    }

    if (notifyTvs && TVS.inUse()) {
        TVS.redraw();
    }

    if (notifyServer) {
        comms.post(function () {return {
            url: ARTIFACT_URLS.presentation_crawlcontext + crawlcontext.getConcept().getRequestId(),
            data: {document_id: crawlcontext.getDocument().getDocument().getId(), crawl: false, temp: true}
        }});
    }
};