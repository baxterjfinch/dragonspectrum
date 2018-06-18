/** @class
 * Phrasing Base Class
 *
 * @property {Concept] concept - Concept the phrasing blongs to
 * @property {Document] originating_document - Document Phrasing was
 *      orgainaly created for
 * @property {string] text - phrasing's text
 * @property {Array<string>] operationsList - Artifact's permissions operations
 */
function Phrasing() {
    SecureArtifact.call(this);
    this.concept = null;
    this.originating_document_perms = null;
    this.text = null;
    this.operations_list = ['admin', 'read', 'write'];
}

Phrasing.prototype = Object.create(SecureArtifact.prototype);
Phrasing.prototype.constructor = Phrasing;

Phrasing.phrasings = {};

/** @instance
 * Init function for phrasing
 *
 * @param {object} phrasing - phrasing options
 */
Phrasing.prototype.initPhrasing = function (phrasing) {
    this.initSecureArtifact(phrasing);
    this.concept = phrasing.concept;
    this.originating_document_perms = phrasing.originating_document_perms;
    this.text = phrasing.text;
    Phrasing.phrasings[this.getId()] = this;
};

Phrasing.prototype.secureDelete = function () {
    this.text = '';
    this.originating_document_perms = null;
    delete Phrasing.phrasings[this.getId()];
};

Phrasing.prototype.finalize = function () {
    Phrasing.phrasings[this.getId()] = this;
};

Phrasing.prototype.setConcept = function (concept) {
    this.concept = concept;
};

Phrasing.prototype.getConcept = function () {
    return this.concept;
};

Phrasing.prototype.setOriginatingDocumentPermissions = function (originating_document) {
    this.originating_document_perms = originating_document;
};

Phrasing.prototype.getOriginatingDocumentPermissions = function () {
    return this.originating_document_perms;
};

Phrasing.prototype.setText = function (text) {
    this.text = text;
};

Phrasing.prototype.getText = function () {
    return this.text;
};

Phrasing.prototype.removeArticles = function(text) {
    if (!text)
        text = this.getText();
    var x;
    var y;
    var word;
    var articles;
    var regex_str;
    var regex;
    var cleansed_string = text;

    // Split out all the individual words in the phrase
    var words = cleansed_string.match(/[^\s]+|\s+[^\s+]$/g);

    // Review all the words
    for(x=0; x < words.length; x++) {
        // For each word, check all the stop words
        for(y=0; y < ENGLISH_ARTICLES.length; y++) {
            // Get the current word
            word = words[x].replace(/\s+|[^a-z]+/ig, "");   // Trim the word and remove non-alpha

            // Get the stop word
            articles = ENGLISH_ARTICLES[y];

            // If the word matches the stop word, remove it from the keywords
            if(word.toLowerCase() == articles) {
                // Build the regex
                regex_str = "^\\s*"+articles+"\\s*$";      // Only word
                regex_str += "|^\\s*"+articles+"\\s+";     // First word
                regex_str += "|\\s+"+articles+"\\s*$";     // Last word
                regex_str += "|\\s+"+articles+"\\s+";      // Word somewhere in the middle
                regex = new RegExp(regex_str, "ig");

                // Remove the word from the keywords
                cleansed_string = cleansed_string.replace(regex, " ");
            }
        }
    }
    return cleansed_string.replace(/^\s+|\s+$/g, "");
};

Phrasing.prototype.getWordCount = function (text) {
    if (!text)
        text = this.getText();
    var words = text.split(' ');
    var count = 0;
    for (var i = 0; i < words.length; i++)
        if (words[i].trim() != '')
            count++;
    return count;
};

Phrasing.prototype.render = function () {
    Concept.renderEngine.render_text_span(this.concept, this.document);
};

Phrasing.prototype.getParentPermissions = function () {
    var parent_permissions = this.getConcept().getParentPermissions();
    parent_permissions.unshift(this.getOriginatingDocumentPermissions());
    return parent_permissions;
};

Phrasing.prototype.toDict = function () {
    var d = Artifact.prototype.toDict.call(this);

    // d.originating_document_perms = this.originating_document_perms;
    d.text = this.text;

    return d;
};

Phrasing.get = function (id) {
    if (Phrasing.phrasings.hasOwnProperty(id))
        return Phrasing.phrasings[id];
    return null;
};