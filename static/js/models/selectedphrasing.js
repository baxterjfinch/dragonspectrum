/** @class
 * SelectedPhrasing Base Class
 *
 * @property {Concept] concept - Concept the attribute belongs to
 * @property {Document] document - Document attribute is for
 * @property {Phrasing] phrasing - Phrasing for the document
 */
function SelectedPhrasing() {
    Artifact.call(this);
    this.concept = null;
    this.document = null;
    this.phrasing = null;
}

SelectedPhrasing.prototype = Object.create(Artifact.prototype);
SelectedPhrasing.prototype.constructor = SelectedPhrasing;

SelectedPhrasing.selected_phrasings = {};

/** @instance
 * Init function for selectedphrasing
 *
 * @param {object} selectedphrasing - SelectedPhrasing options
 */
SelectedPhrasing.prototype.initSelectedPhrasing = function (selectedphrasing) {
    this.initArtifact(selectedphrasing);
    this.concept = selectedphrasing.concept;
    this.document = selectedphrasing.document;
    this.phrasing = selectedphrasing.phrasing;
    SelectedPhrasing.selected_phrasings[this.getId()] = this;
};

SelectedPhrasing.prototype.setConcept = function (concept) {
    this.concept = concept;
};

SelectedPhrasing.prototype.getConcept = function () {
    return this.concept;
};

SelectedPhrasing.prototype.setDocument = function (document) {
    this.document = document;
};

SelectedPhrasing.prototype.getDocument = function () {
    return this.document;
};

SelectedPhrasing.prototype.setPhrasing = function (phrasing) {
    this.phrasing = phrasing;
};

SelectedPhrasing.prototype.getPhrasing = function () {
    return this.phrasing;
};

SelectedPhrasing.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);

    if (this.artifact)
        d.concept = this.artifact.getRequestId();
    if (this.document)
        d.document = this.document.getRequestId();
    if (this.phrasing)
    d.phrasing = this.phrasing.getRequestId();

    return d;
};


function SummarySelectedPhrasing() {
    Artifact.call(this);
    this.concept = null;
    this.document = null;
    this.phrasing = null;
}

SummarySelectedPhrasing.prototype = Object.create(Artifact.prototype);
SummarySelectedPhrasing.prototype.constructor = SummarySelectedPhrasing;

SummarySelectedPhrasing.selected_phrasings = {};

SummarySelectedPhrasing.prototype.initSummarySelectedPhrasing = function (selectedphrasing) {
    this.initArtifact(selectedphrasing);
    this.concept = selectedphrasing.concept;
    this.document = selectedphrasing.document;
    this.phrasing = selectedphrasing.phrasing;
    SummarySelectedPhrasing.selected_phrasings[this.getId()] = this;
};

SummarySelectedPhrasing.prototype.setConcept = function (concept) {
    this.concept = concept;
};

SummarySelectedPhrasing.prototype.getConcept = function () {
    return this.concept;
};

SummarySelectedPhrasing.prototype.setDocument = function (document) {
    this.document = document;
};

SummarySelectedPhrasing.prototype.getDocument = function () {
    return this.document;
};

SummarySelectedPhrasing.prototype.setPhrasing = function (phrasing) {
    this.phrasing = phrasing;
};

SummarySelectedPhrasing.prototype.getPhrasing = function () {
    return this.phrasing;
};

SummarySelectedPhrasing.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);

    if (this.artifact)
        d.concept = this.artifact.getRequestId();
    if (this.document)
        d.document = this.document.getRequestId();
    if (this.phrasing)
    d.phrasing = this.phrasing.getRequestId();

    return d;
};

function PresentationSelectedPhrasing() {
    Artifact.call(this);
    this.concept = null;
    this.document = null;
    this.phrasing = null;
}

PresentationSelectedPhrasing.prototype = Object.create(Artifact.prototype);
PresentationSelectedPhrasing.prototype.constructor = PresentationSelectedPhrasing;

PresentationSelectedPhrasing.selected_phrasings = {};

PresentationSelectedPhrasing.prototype.initPresentationSelectedPhrasing = function (selectedphrasing) {
    this.initArtifact(selectedphrasing);
    this.concept = selectedphrasing.concept;
    this.document = selectedphrasing.document;
    this.phrasing = selectedphrasing.phrasing;
    PresentationSelectedPhrasing.selected_phrasings[this.getId()] = this;
};

PresentationSelectedPhrasing.prototype.setConcept = function (concept) {
    this.concept = concept;
};

PresentationSelectedPhrasing.prototype.getConcept = function () {
    return this.concept;
};

PresentationSelectedPhrasing.prototype.setDocument = function (document) {
    this.document = document;
};

PresentationSelectedPhrasing.prototype.getDocument = function () {
    return this.document;
};

PresentationSelectedPhrasing.prototype.setPhrasing = function (phrasing) {
    this.phrasing = phrasing;
};

PresentationSelectedPhrasing.prototype.getPhrasing = function () {
    return this.phrasing;
};

PresentationSelectedPhrasing.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);

    if (this.artifact)
        d.concept = this.artifact.getRequestId();
    if (this.document)
        d.document = this.document.getRequestId();
    if (this.phrasing)
    d.phrasing = this.phrasing.getRequestId();

    return d;
};