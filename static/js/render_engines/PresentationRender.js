function PresentationRender () {}

PresentationRender.data_x = 0;
PresentationRender.data_y = 0;
PresentationRender.data_y_inc = 525;
PresentationRender.root_renderObj = null;
PresentationRender.current_concept = null;
PresentationRender.current_slide = null;

PresentationRender.generation_modal = $('#presentation-gen-modal');
PresentationRender.generation_modal_cancel = $('#presentation-gen-modal-cancel');
PresentationRender.generation_modal_prog = $('#presentation-gen-modal-prog');
PresentationRender.generation_modal_prog_label = $('#presentation-gen-modal-progress-bar-label');
PresentationRender.current_slide_num_span = $('#current-slide-num');

PresentationRender.continued = ' <small class="continued">Continued</small>';

PresentationRender.generation_modal_cancel.click(function () {
    PresentationRender.cancel();
});

PresentationRender.cancel = function () {
    DocumentEventListener.setStateTextMouseClick(Document.getCurrent());
    PresentationRender.hideModal();
};

PresentationRender.showModal = function () {
    PresentationRender.generation_modal.modal('show');
    Shortcut.pause();
};

PresentationRender.hideModal = function () {
    PresentationRender.generation_modal.modal('hide');
    Shortcut.unpause();
};

PresentationRender.setProgBarLabelText = function (text) {
    PresentationRender.generation_modal_prog_label.html(text);
};

PresentationRender._render = function (slide, doc, index) {
    var concept = slide.getConcept();
    var renderObj = new PresentationRenderObj();
    slide.setRenderObj(renderObj);

    renderObj.div.addClass('step');
    renderObj.div.on('enterStep', function () {
        var shouldBeHash = "#/" + concept.getId() + '-slide';
		if(window.history && window.history.pushState) {
			if(window.location.hash !== shouldBeHash) {
				window.history.pushState({}, '', shouldBeHash);
			}
		} else {
			if(window.location.hash !== shouldBeHash) {
				window.location.hash = shouldBeHash;
			}
		}
        PresentationRender.current_concept = concept;
        PresentationRender.current_slide = slide;

        PresentationRender.current_slide_num_span.html(renderObj.div.data('slide-index'));

        var cur_con = Concept.getCurrent();
        if (concept.isChild(cur_con))
            ConceptEventListener.activeMouseClick(cur_con);
        else
            ConceptEventListener.activeMouseClick(concept);
        if (!concept.isExpanded())
            ConceptEventListener.expandMouseClick(concept);
        if (TVS.inUse())
            TVS.redraw();

        PhrasingEventListener.finalizeEditPresentationSummernote();
        PhrasingEventListener.finalizeCreatePresentationSummernote();
    }).on('leaveStep', function (event) {

    });

    renderObj.div.attr('id', concept.getId() + '-slide');
    renderObj.div.attr('data-y', PresentationRender.data_y);
    renderObj.div.addClass('pres_slide');
    PresentationRender.data_y += PresentationRender.data_y_inc;
    PresentationRender.root_renderObj.div.append(renderObj.div);

    var heading_span = $('<span></span>');
    renderObj.heading.append(heading_span);
    heading_span.addClass('presentation_span');
    heading_span.data('concept', concept);

    var parent = concept.getParent();
    if (parent.isRoot() && slide.isImage()) {
        text = Util.distillWithThreshold(parent.getTitle(), Util.CAPITALIZE_TITLE);
    } else {
        if (slide.isImage()) {
            var sel_phr = parent.getPresentationSelectedPhrasingByDoc(doc);
            if (sel_phr) {
                var text = sel_phr.getPhrasing().getText();
            } else {
                phrasing = parent.getPresentationDocumentPhrasing(doc);
                text = Util.distillWithThreshold(phrasing.getText(), Util.CAPITALIZE_TITLE);
            }
        } else {
            sel_phr = concept.getPresentationSelectedPhrasingByDoc(doc);
            if (sel_phr) {
                text = sel_phr.getPhrasing().getText();
            } else {
                phrasing = concept.getPresentationDocumentPhrasing(doc);
                text = Util.distillWithThreshold(phrasing.getText(), Util.CAPITALIZE_TITLE);
            }
        }

        if (phrasing && (text != phrasing.text)) {
            // set the tooltip text as the original (non-distilled) phrasing
            heading_span.data('toggle', 'tooltip').data('placement', 'bottom').data('container', 'body');
            heading_span.attr('title', phrasing.text);
        }

        if (slide.isContinue())
            text += this.continued;

        heading_span.append(text);
    }

    if (concept.pres_heading && concept.pres_heading.hasClass(Concept.con_active_classes))
        heading_span.addClass(Concept.con_active_classes);

    concept.pres_heading = heading_span;

    if (slide.isImage()) {
        sel_phr = concept.getPresentationSelectedPhrasingByDoc(doc);
        if (sel_phr) {
            text = sel_phr.getPhrasing().getText();
        } else {
            var phrasing = concept.getPresentationDocumentPhrasing(doc);
            text = Util.distillWithThreshold(phrasing.getText(), Util.CAPITALIZE_FIRST);
        }
        var caption = renderObj.caption;
        caption.append(text);

        var imageContainer = $('<center></center>');
        imageContainer.addClass('slide-image');
        var img = $('<img>');
        img.attr('src', ARTIFACT_URLS.media_download + concept.getRequestId());
        var slideDim = DVS.getSlideDimensions();
        var maxWidth = slideDim.w * 0.85;
        var maxHeight = slideDim.h * 0.65;
        img.css('max-width', maxWidth);
        img.css('max-height', maxHeight);
        img.css('min-height', 350);

        imageContainer.append(img);
        imageContainer.append(caption);
        renderObj.slide_span.append(imageContainer);
        renderObj.listUL.remove();
    } else {
        var bullets = slide.getBullet();
        var li;
        for (var i = 0; i < bullets.length; i++) {
            var crawlcontext = bullets[i].getPresentationCrawlContext(doc);
            if (!crawlcontext) {
                crawlcontext = new PresentationCrawlContext();
                crawlcontext.setId(Util.generateUUID1());
                crawlcontext.setDocument(doc);
                crawlcontext.setConcept(bullets[i]);
                crawlcontext.setCrawl(true);
                crawlcontext.setRendered(true);
                crawlcontext.setTemp(true);
                bullets[i].addPresentationCrawlContext(crawlcontext);
            }

            if (crawlcontext.getCrawl()) {
                var span = $('<span></span>');

                span.addClass('presentation_span');
                li = $('<li></li>');
                li.append(span);

                sel_phr = bullets[i].getPresentationSelectedPhrasingByDoc(doc);
                if (sel_phr) {
                    text = sel_phr.getPhrasing().getText();
                } else {
                    phrasing = bullets[i].getPresentationDocumentPhrasing(doc);
                    text = Util.distillWithThreshold(phrasing.getText(), Util.CAPITALIZE_FIRST);
                }
                span.append(text);

                if (phrasing && (text != phrasing.text)) {
                    // set the tooltip text as the original (non-distilled) phrasing
                    span.data('toggle', 'tooltip').data('placement', 'bottom').data('container', 'body');
                    span.attr('title', phrasing.text);
                }
                span.data('concept', bullets[i]);

                bullets[i].pres_li = li;
                renderObj.listUL.append(bullets[i].pres_li);
            }
        }

        renderObj.listUL.attr('data-bullet-count', slide.getBullet().length);
    }

    var children_slide = slide.getSlides();
    for (var j = 0; j < children_slide.length; j++) {
        PresentationRender._render(children_slide[j], doc);
    }
};


PresentationRender.render = function (rootslide, doc) {
    PresentationRender.data_y = 0;
    PresentationRender.root_renderObj = new PresentationRenderObj();
    rootslide.setRenderObj(PresentationRender.root_renderObj);

    var slides = rootslide.getSlides();
    for (var i = 0; i < slides.length; i++) {
        PresentationRender._render(slides[i], doc, i);
    }

    PresentationRender.root_renderObj.div.jmpress({
        fullscreen: true,
        keyboard: false
    });

    var cur_concept = Concept.getCurrent();
    if (cur_concept.pres_heading)
        PresentationRender.root_renderObj.div.jmpress('select', '#' + cur_concept.getId() + '-slide');
    else if (cur_concept.pres_li)
        PresentationRender.root_renderObj.div.jmpress('select', '#' + cur_concept.getParent().getId() + '-slide');

};