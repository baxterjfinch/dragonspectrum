function DVS() {}

DVS.buttonGap = 9;
DVS.dvs = $("#dvs");
DVS.container = $("#dvs-tabs-container");
DVS.scrollbar = $("#scrollbar-dv");
DVS.document_text = $('#document_text');

DVS.toggleImages = function () {
    var images = $(".concept-img");
    var image_icon = $(".concept-img-icon");
    if (Concept.image_status == 'small') {
        Concept.image_status = 'large';
        images.removeClass('img-small').addClass('img-full');
    } else if (Concept.image_status == 'large') {
        Concept.image_status = 'no_image';
        images.hide();
        image_icon.show();
    } else {
        Concept.image_status = 'small';
        images.removeClass('img-full').addClass('img-small');
        images.show();
        image_icon.hide();
    }
    DVS.updateScrollPosition();
};

DVS.showImageLightBox = function (img) {
    img.stopPropagation();
    Shortcut.set('dvs_lightbox');
    var lightbox = $('<div id="lightbox"></div>');
    lightbox.addClass('lightbox');
    var new_img = $('<img>');
    new_img.attr('src', $(this).attr('src'));
    new_img.click(function (e) {
        $(this).parent().remove();
        Shortcut.set('dvs');
    });
    lightbox.append(new_img);
    lightbox.click(function (e) {
        $(this).remove();
        Shortcut.set('dvs');
    });
    $('body').append(lightbox);
};
DVS.showImageLightBox.name = 'dvs_lightbox';

DVS.closeImageLightbox = function () {
    $('#lightbox').remove();
    Shortcut.set('dvs');
};

DVS.hide = function () {
    DVS.dvs.addClass('hidden');
    DVS.container.addClass('hidden');
};

DVS.show = function () {
    DVS.dvs.removeClass('hidden');
    DVS.container.removeClass('hidden');
};

// TODO: Move this to the right place
var _pvsHeight = $("#pvs-container");
var _collab_container = $('collaboration-container');
var _collab_height = null;

function get_collab_container_hight() {
    if (!_collab_height)
        _collab_height = _collab_container.outerHeight();
    if (_collab_height === null)
        return 0;
    return _collab_height;
}

DVS.updateScrollPosition = function (concept) {
    if (!concept)
        concept = Concept.getCurrent();

    if (!concept)
        return;

    setTimeout(function () {
        var dvsNode = concept.getDvsRender().phr_span;
        if (!concept.isCrawlable(Project.getCurrentDocument())) {
            return;
        }

        var collabHeight = get_collab_container_hight();

        var tabsHeight = DVS.container.outerHeight();
        var upperDivs = _pvsHeight.outerHeight() + collabHeight + tabsHeight;

        var dvsScrollPosition = DVS.scrollbar.scrollTop();
        var dvsHeight = DVS.scrollbar.innerHeight();
        var idPosition = dvsNode.position(); //temp just for use calculating idTop below
        var idTop = idPosition === null ? 0 : idPosition.top - upperDivs;

        var nodeHeight = dvsNode.outerHeight();
        if (nodeHeight != 0) {
            var idBottom = idTop + nodeHeight;
        } else {
            idBottom = idTop + dvsNode.children().outerHeight();
        }

        // 20% of viewport height
        var contextPadding = dvsHeight * 0.2;

        // selected concept is above current window
        var newPosition;
        if (idTop < contextPadding) {
            newPosition = dvsScrollPosition + (idTop - contextPadding);
            DVS.scrollbar.stop(true, true);
            DVS.scrollbar.filter(':not(:animated)').animate({ scrollTop: newPosition }, 250);
        }
        // selected concept is below current window
        else if (idBottom + contextPadding > dvsHeight) {
            newPosition = dvsScrollPosition + idBottom - (dvsHeight - contextPadding);
            DVS.scrollbar.stop(true, true);
            DVS.scrollbar.filter(':not(:animated)').animate({ scrollTop: newPosition }, 250);
        }
    }, 20);
};

DVS.focus = function () {
    DVS.dvs.focus();
};

DVS.resizeDVS = function () {
    if (Page.isProjectPage()) {
        var dvs_height = calc_dvs_height();
        DVS.scrollbar.css("max-height", dvs_height);
        DVS.scrollbar.css("height", dvs_height);

        if (TVS.inUse()) {
            var tvs = $("#tvs");
            var scrollbar_tv = $('#scrollbar-tv');
            var tvsToolbar = $('#tvs-toolbar');
            var tvs_height = calc_tvs_height();
            var tvs_scroll_height = calc_tvs_height() - tvs.offset().top + tvsToolbar.height();
            tvs.css("height", tvs_height);
            tvs.css("max-height", tvs_height);
            scrollbar_tv.css("height", tvs_scroll_height);
            scrollbar_tv.css("max-height", tvs_scroll_height);
        }

        if (Document.getCurrent().getState() == Document.STATE_PRESENTATION) {
            var pres_doc = Document.getCurrent().getPresentationDocument();
            if (!pres_doc.isRunning())
                pres_doc.presentationComplete();
            else
                pres_doc.updateSlideCount();

            var wrapper_div = $('#pres_wrapper');
            wrapper_div.height(dvs_height - 95 - PresentationDocument.slide_count_slider_well.height()-30);
            wrapper_div.width(DVS.document_text.width()-60);

            var dim = DVS.getSlideDimensions();

            // 20% spacing betwixt slides
            PresentationRender.data_y_inc = dim.h * 1.2;

            $('.step').css('width', dim.w).css('height', dim.h);

        } else if (Document.getCurrent().getState() == Document.STATE_SUMMARY) {
            Document.getCurrent().getSummaryDocument().updateWordCount();
        }

    } else if (Page.isWorldPage() || Page.isConceptPage()) {
        // TODO CHECK/FIX WORLD PAGES
        height = get_height_from_bottom(DVS.scrollbar);
        DVS.scrollbar.css("max-height", height);
        DVS.scrollbar.css("height", height);

        if (TVS.inUse()) {
            height = get_height_from_bottom(DVS.scrollbar);
            DVS.scrollbar.css("max-height", height);
            height = get_height_from_bottom(TVS.tvs);
            $(TVS.tvs).css("height", height);
        }
    }
};

DVS.getSlideDimensions = function () {
    return DVS.calcSlideDimensions(DVS.document_text.outerWidth(), DVS.document_text.outerHeight(), 16/9);
};

DVS.calcSlideDimensions = function(win_w, win_h, aspectRatio) {
    var w = 900;
    var h = 400;
    if (!aspectRatio) {
        aspectRatio = 4/3;
    }

    var win_aspect = win_w/win_h;
    var margin_upper = (Math.min(500, win_w)/500) * 0.9;
    var margin_factor = Math.max(margin_upper, 0.875);
    var margin_vert_addition = 0.05;

   if (win_aspect > aspectRatio) {
        // constrain H
        h = win_h * (margin_factor + margin_vert_addition);
        w = h * aspectRatio;
    } else {
        // constrain W
        w = win_w * margin_factor;
        h = w/aspectRatio;
    }

//    console.log('W: %s, H: %s', w, h);

    return {
        "w": w,
        "h": h
    };
};