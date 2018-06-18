/** @class
 * CrawlContext Base Class
 *
 * @property {Concept] concept - Concept the attribute belongs to
 * @property {Document] document - Document attribute is for
 * @property {boolean] crawl - Whether to crawl on document
 */
function CrawlContext() {
    Artifact.call(this);
    this.concept = null;
    this.document = null;
    this.crawl = true;
}

CrawlContext.prototype = Object.create(Artifact.prototype);
CrawlContext.prototype.constructor = CrawlContext;

CrawlContext.crawlcontext = {};
CrawlContext.crawlcontext_by_doc = {};

/** @instance
 * Init function for crawlcontext
 *
 * @param {object} crawlcontext - Attribute options
 */
CrawlContext.prototype.initCrawlContext = function (crawlcontext) {
    this.initArtifact(crawlcontext);
    this.concept = crawlcontext.concept;
    this.document = crawlcontext.document;
    if (this.document) {
        if (!CrawlContext.crawlcontext_by_doc[this.document.getId()])
            CrawlContext.crawlcontext_by_doc[this.document.getId()] = [this];
        else
            CrawlContext.crawlcontext_by_doc[this.document.getId()].push(this);
    }
    this.crawl = crawlcontext.crawl;
    CrawlContext.crawlcontext[this.getId()] = this;
};

CrawlContext.prototype.finalize = function () {
    CrawlContext.crawlcontext[this.getId()] = this;
};

CrawlContext.prototype.setConcept = function (concept) {
    this.concept = concept;
};

CrawlContext.prototype.getConcept = function () {
    return this.concept;
};

CrawlContext.prototype.setDocument = function (document) {
    this.document = document;
    if (this.document) {
        if (!CrawlContext.crawlcontext_by_doc[this.document.getId()])
            CrawlContext.crawlcontext_by_doc[this.document.getId()] = [this];
        else
            CrawlContext.crawlcontext_by_doc[this.document.getId()].push(this);
    }
};

CrawlContext.prototype.getDocument = function () {
    return this.document;
};

CrawlContext.prototype.setCrawl = function (flag) {
    this.crawl = flag;
};

CrawlContext.prototype.getCrawl = function () {
    return this.crawl;
};

CrawlContext.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);
    d.concept = this.concept.getRequestId();
    d.document = this.document.getRequestId();
    d.crawl = this.crawl;

    return d;
};

CrawlContext.get = function (id) {
    return CrawlContext.crawlcontext[id];
};

CrawlContext.getByDocument = function (doc) {
    return CrawlContext.crawlcontext_by_doc[doc.getId()];
};


function SummaryCrawlContext() {
    Artifact.call(this);
    this.concept = null;
    this.summary_document = null;
    this.crawl = true;
    this.is_rendered = false;
    this.is_temp = false;
}

SummaryCrawlContext.prototype = Object.create(Artifact.prototype);
SummaryCrawlContext.prototype.constructor = SummaryCrawlContext;

SummaryCrawlContext.crawlcontext = {};
SummaryCrawlContext.crawlcontext_by_doc = {};

SummaryCrawlContext.STATE_USER_SELECTED = 1;
SummaryCrawlContext.STATE_USER_UNSELECTED = 1;
SummaryCrawlContext.STATE_AUTO_SELECTED = 1;
SummaryCrawlContext.STATE_AUTO_UNSELECTED = 1;

SummaryCrawlContext.prototype.initSummaryCrawlContext = function (crawlcontext) {
    this.initArtifact(crawlcontext);
    this.concept = crawlcontext.concept;
    this.summary_document = crawlcontext.document;
    if (this.summary_document) {
        if (!SummaryCrawlContext.crawlcontext_by_doc[this.summary_document.getId()])
            SummaryCrawlContext.crawlcontext_by_doc[this.summary_document.getId()] = [this];
        else
            SummaryCrawlContext.crawlcontext_by_doc[this.summary_document.getId()].push(this);
    }
    this.crawl = crawlcontext.crawl;
    SummaryCrawlContext.crawlcontext[this.getId()] = this;
};

SummaryCrawlContext.prototype.finalize = function () {
    SummaryCrawlContext.crawlcontext[this.getId()] = this;
};

SummaryCrawlContext.prototype.setConcept = function (concept) {
    this.concept = concept;
};

SummaryCrawlContext.prototype.getConcept = function () {
    return this.concept;
};

SummaryCrawlContext.prototype.setDocument = function (document) {
    this.summary_document = document;
    if (this.summary_document) {
        if (!SummaryCrawlContext.crawlcontext_by_doc[this.summary_document.getId()])
            SummaryCrawlContext.crawlcontext_by_doc[this.summary_document.getId()] = [this];
        else
            SummaryCrawlContext.crawlcontext_by_doc[this.summary_document.getId()].push(this);
    }
};

SummaryCrawlContext.prototype.getDocument = function () {
    return this.summary_document;
};

SummaryCrawlContext.prototype.setCrawl = function (flag) {
    this.crawl = flag;
};

SummaryCrawlContext.prototype.getCrawl = function () {
    return this.crawl;
};

SummaryCrawlContext.prototype.setRendered = function (flag) {
    this.is_rendered = flag;
};

SummaryCrawlContext.prototype.isRendered = function () {
    return this.is_rendered;
};

SummaryCrawlContext.prototype.setTemp = function (flag) {
    this.is_temp = flag;
};

SummaryCrawlContext.prototype.isTemp = function () {
    return this.is_temp;
};

SummaryCrawlContext.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);
    d.concept = this.concept.getRequestId();
    d.summary_document = this.summary_document.getRequestId();
    d.crawl = this.crawl;

    return d;
};

SummaryCrawlContext.get = function (id) {
    return SummaryCrawlContext.crawlcontext[id];
};

SummaryCrawlContext.getByDocument = function (doc) {
    return SummaryCrawlContext.crawlcontext_by_doc[doc.getId()];
};

function PresentationCrawlContext() {
    Artifact.call(this);
    this.concept = null;
    this.presentation_document = null;
    this.crawl = true;
    this.is_rendered = false;
    this.is_temp = false;
}

PresentationCrawlContext.prototype = Object.create(Artifact.prototype);
PresentationCrawlContext.prototype.constructor = PresentationCrawlContext;

PresentationCrawlContext.crawlcontext = {};
PresentationCrawlContext.crawlcontext_by_doc = {};

PresentationCrawlContext.STATE_USER_SELECTED = 1;
PresentationCrawlContext.STATE_USER_UNSELECTED = 1;
PresentationCrawlContext.STATE_AUTO_SELECTED = 1;
PresentationCrawlContext.STATE_AUTO_UNSELECTED = 1;

PresentationCrawlContext.prototype.initPresentationCrawlContext = function (crawlcontext) {
    this.initArtifact(crawlcontext);
    this.concept = crawlcontext.concept;
    this.presentation_document = crawlcontext.document;
    if (this.presentation_document) {
        if (!PresentationCrawlContext.crawlcontext_by_doc[this.presentation_document.getId()])
            PresentationCrawlContext.crawlcontext_by_doc[this.presentation_document.getId()] = [this];
        else
            PresentationCrawlContext.crawlcontext_by_doc[this.presentation_document.getId()].push(this);
    }
    this.crawl = crawlcontext.crawl;
    PresentationCrawlContext.crawlcontext[this.getId()] = this;
};

PresentationCrawlContext.prototype.finalize = function () {
    PresentationCrawlContext.crawlcontext[this.getId()] = this;
};

PresentationCrawlContext.prototype.setConcept = function (concept) {
    this.concept = concept;
};

PresentationCrawlContext.prototype.getConcept = function () {
    return this.concept;
};

PresentationCrawlContext.prototype.setDocument = function (document) {
    this.presentation_document = document;
    if (this.presentation_document) {
        if (!PresentationCrawlContext.crawlcontext_by_doc[this.presentation_document.getId()])
            PresentationCrawlContext.crawlcontext_by_doc[this.presentation_document.getId()] = [this];
        else
            PresentationCrawlContext.crawlcontext_by_doc[this.presentation_document.getId()].push(this);
    }
};

PresentationCrawlContext.prototype.getDocument = function () {
    return this.presentation_document;
};

PresentationCrawlContext.prototype.setCrawl = function (flag) {
    this.crawl = flag;
};

PresentationCrawlContext.prototype.getCrawl = function () {
    return this.crawl;
};

PresentationCrawlContext.prototype.setRendered = function (flag) {
    this.is_rendered = flag;
};

PresentationCrawlContext.prototype.isRendered = function () {
    return this.is_rendered;
};

PresentationCrawlContext.prototype.setTemp = function (flag) {
    this.is_temp = flag;
};

PresentationCrawlContext.prototype.isTemp = function () {
    return this.is_temp;
};

PresentationCrawlContext.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);
    d.concept = this.concept.getRequestId();
    d.presentation_document = this.presentation_document.getRequestId();
    d.crawl = this.crawl;

    return d;
};

PresentationCrawlContext.get = function (id) {
    return PresentationCrawlContext.crawlcontext[id];
};

PresentationCrawlContext.getByDocument = function (doc) {
    return PresentationCrawlContext.crawlcontext_by_doc[doc.getId()];
};