function PresentationSlide() {
    this.parent = null;
    this.slides = [];
    this.concept = null;
    this.document = null;
    this.bullets = [];
    this.renderObj = null;
    this.is_continue = false;
    this.is_image = false;
}

PresentationSlide.slides = {};

PresentationSlide.prototype.initialize = function (parent, concept, document) {
    this.parent = parent;
    this.concept = concept;
    this.document = document;
    PresentationSlide.addSlide(this);
};

PresentationSlide.prototype.setParent = function (parent) {
    this.parent = parent;
};

PresentationSlide.prototype.getParent = function () {
    return this.parent;
};

PresentationSlide.prototype.addSlide = function (slide, index) {
    if (index)
        this.slides.splice(index, 0, slide);
    else
        this.slides.push(slide);
};

PresentationSlide.prototype.getSlides = function () {
    return this.slides;
};

PresentationSlide.prototype.setConcept = function (concept) {
    this.concept = concept;
};

PresentationSlide.prototype.getConcept = function () {
    return this.concept;
};

PresentationSlide.prototype.setDocument = function (document) {
    this.document = document;
};

PresentationSlide.prototype.getDocument = function () {
    return this.document;
};

PresentationSlide.prototype.addBullet = function (b) {
    this.bullets.push(b);
};

PresentationSlide.prototype.getBullet = function () {
    return this.bullets;
};

PresentationSlide.prototype.setRenderObj = function (renderObj) {
    this.renderObj = renderObj;
};

PresentationSlide.prototype.getRenderObj = function (renderObj) {
    return this.renderObj;
};

PresentationSlide.prototype.setIsContinue = function (flag) {
    this.is_continue = flag;
};

PresentationSlide.prototype.isContinue = function () {
    return this.is_continue;
};

PresentationSlide.prototype.setIsImage = function (flag) {
    this.is_image = flag;
};

PresentationSlide.prototype.isImage = function () {
    return this.is_image;
};

PresentationSlide.addSlide = function (slide) {
    var document = slide.getDocument();
    if (!PresentationSlide.slides[document.getId()])
        PresentationSlide.slides[document.getId()] = [];
    PresentationSlide.slides[document.getId()].push(slide);
};

PresentationSlide.getSlides = function (document) {
    if (!document)
        return [];
    if (!PresentationSlide.slides[document.getId()])
        PresentationSlide.slides[document.getId()] = [];
    return PresentationSlide.slides[document.getId()];
};

PresentationSlide.clearSlides = function (document) {
    var slides = PresentationSlide.slides[document.getId()];
    if (slides) {
        for (var i = 0; i < slides.length; i++) {
            slides[i].getConcept().removePresentationSlide(document);
        }
    }

    PresentationSlide.slides[document.getId()] = [];
};