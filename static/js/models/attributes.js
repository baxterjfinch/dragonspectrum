/** @class
 * Attribute Base Class
 *
 * @property {Concept] concept - Concept the attribute belongs to
 * @property {Document] document - Document attribute is for
 */
function Attribute() {
    Artifact.call(this);
    this.concept = null;
    this.document = null;
    this.attributes = [];
}

Attribute.prototype = Object.create(Artifact.prototype);
Attribute.prototype.constructor = Attribute;

Attribute.HEADER = 'h';
Attribute.NOHEADER = 'noh';
Attribute.PARAGRAPH = 'p';
Attribute.ORDERED_LIST = 'ol';
Attribute.UNORDERED_LIST = 'ul';
Attribute.NOLIST = 'nol';
Attribute.LIST_ITEM = 'li';
Attribute.IMAGE = 'img';
Attribute.NONE = 'none';

/** @instance
 * Init function for attribute
 *
 * @param {object} attribute - Attribute's properties
 */
Attribute.prototype.initAttribute = function (attribute) {
    this.initArtifact(attribute);
    this.artifact = attribute.artifact;
    this.document = attribute.document;
    this.attributes = attribute.attributes;
};

Attribute.prototype.setConcept = function (concept) {
    this.artifact = concept;
};

Attribute.prototype.getConcept = function () {
    return this.artifact;
};

Attribute.prototype.setDocument = function (document) {
    this.document = document;
};

Attribute.prototype.getDocument = function () {
    return this.document;
};

Attribute.prototype.setAttributes = function (attributes) {
    this.attributes = attributes;
};

Attribute.prototype.getAttributes = function () {
    return this.attributes;
};

Attribute.prototype.hasAttribute = function (attr) {
    return this.attributes.indexOf(attr) >= 0;
};

Attribute.prototype.isHeader = function () {
    return this.hasAttribute(Attribute.HEADER);
};

Attribute.prototype.setHeader = function () {
    this.add(Attribute.HEADER);
};

Attribute.prototype.removeHeader = function () {
    this.remove(Attribute.HEADER);
};

Attribute.prototype.isNoHeader = function () {
    return this.hasAttribute(Attribute.NOHEADER);
};

Attribute.prototype.setNoHeader = function () {
    this.add(Attribute.NOHEADER);
};

Attribute.prototype.removeNoHeader = function () {
    this.remove(Attribute.NOHEADER);
};

Attribute.prototype.isParagraph = function () {
    return this.hasAttribute(Attribute.PARAGRAPH);
};

Attribute.prototype.isImage = function () {
    return this.hasAttribute(Attribute.IMAGE);
};

Attribute.prototype.isOrderedList = function () {
    return this.hasAttribute(Attribute.ORDERED_LIST);
};

Attribute.prototype.setOrderedList = function () {
    return this.add(Attribute.ORDERED_LIST);
};

Attribute.prototype.removeOrderedList = function () {
    return this.remove(Attribute.ORDERED_LIST);
};

Attribute.prototype.isUnorderedList = function () {
    return this.hasAttribute(Attribute.UNORDERED_LIST);
};

Attribute.prototype.setUnorderedList = function () {
    return this.add(Attribute.UNORDERED_LIST);
};

Attribute.prototype.removeUnorderedList = function () {
    return this.remove(Attribute.UNORDERED_LIST);
};

Attribute.prototype.isNoList = function () {
    return this.hasAttribute(Attribute.NOLIST);
};

Attribute.prototype.setNoList = function () {
    return this.add(Attribute.NOLIST);
};

Attribute.prototype.removeNoList = function () {
    return this.remove(Attribute.NOLIST);
};


Attribute.prototype.isList = function () {
    return this.isOrderedList() || this.isUnorderedList();
};

Attribute.prototype.add = function (attr) {
    if (this.hasAttribute(attr))
        return;
    this.attributes.push(attr);
};

Attribute.prototype.remove = function (attr) {
    if (!this.hasAttribute(attr))
        return;
    this.attributes.splice(this.attributes.indexOf(attr), 1);
};

Attribute.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);
    if (this.artifact)
        d.artifact = this.artifact.getRequestId();
    if (this.document)
        d.document = this.document.getRequestId();
    d.attributes = this.attributes;

    return d;
};