function PrintRenderObj() {
    DVSRenderObj.call(this);
}

PrintRenderObj.prototype = Object.create(DVSRenderObj.prototype);
PrintRenderObj.prototype.constructor = PrintRenderObj;

function PrintRender() {
    this.type = 'print';
    this.att_engine = null;
}

PrintRender.prototype.getType = function ()  {
    return this.type;
};

PrintRender.prototype._render_text_span = function (phrasing, print_render) {
    print_render.phr_text_span = $('<span></span>');
    print_render.phr_text_span.append(phrasing.getText() + ' ');
};

PrintRender.prototype.render_text_span = function (concept, doc) {
    this._render_text_span(concept.getDocumentPhrasing(doc), concept.print_render);
};

PrintRender.prototype._render_header = function (concept, print_render) {
    var hl = concept.getDepth() + 1;
    if (hl > 6)
        hl = 6;
    print_render.header = $('<h' + hl + '></h' + hl + '>');
    print_render.header_level = hl;
    print_render.phr_span.children().detach();
    print_render.phr_span.append(print_render.header);
    // Always need to reset this
    print_render.header.append(print_render.phr_text_span.detach());
};

PrintRender.prototype._render_paragraph = function (print_render) {
    print_render.p = $('<p></p>');
    print_render.p.append(print_render.span.children().detach());
    print_render.span.append(print_render.p);
    print_render.phr_span.empty();
    print_render.phr_span.append(print_render.phr_text_span.detach());
};

PrintRender.prototype._render_ordered_list = function (print_render) {
    print_render.ol = $('<ol></ol>');
    print_render.ol.append(print_render.children_span.detach());
    print_render.ol.append(print_render.parent_children_span.detach());
    print_render.span.append(print_render.ol);
};

PrintRender.prototype._render_unordered_list = function (print_render) {
    print_render.ul = $('<ul></ul>');
    print_render.ul.append(print_render.children_span.detach());
    print_render.ul.append(print_render.parent_children_span.detach());
    print_render.span.append(print_render.ul);
};

PrintRender.prototype._render_list_item = function (print_render) {
    if (!print_render.li)
        print_render.li = $('<li></li>');
    print_render.li.detach();
    print_render.li.append(print_render.phr_span.children().detach());
    print_render.phr_span.append(print_render.li.detach());
};

PrintRender.prototype._clean_up_list = function (print_render) {
    if (print_render.li) {
        print_render.li.remove();
        print_render.li = null;
    }
};

PrintRender.prototype._render_image = function (concept, doc, print_render) {
    print_render.img_figure = $('<figure></figure>');
    print_render.img_figure.addClass(Concept.figure_classes);
    print_render.phr_span.append(print_render.img_figure);

    print_render.img_icon_span = $('<span></span>');
    var image_icon = $('<i></i>');
    image_icon.addClass(Concept.figure_icon_classes);
    print_render.img_icon_span.append(image_icon);
    print_render.img_icon_span.addClass(Concept.figure_icon_span_classes);
    print_render.img_icon_span.hide();
    print_render.img_figure.append(print_render.img_icon_span);

    print_render.img = $('<img>');
    print_render.img.attr('alt', concept.getDocumentPhrasing(doc).getText());
    print_render.img.attr('src', ARTIFACT_URLS.media_download + concept.getRequestId());
    print_render.img.addClass(Concept.image_classes);
    if (Concept.image_status == 'small')
        print_render.img.addClass('img-small');
    else if (Concept.image_status == 'large')
        print_render.img.addClass('img-full');
    else if (Concept.image_status == 'no_image')
        print_render.img.hide();
    print_render.img_figure.append(print_render.img);

    print_render.img_caption = $('<figcaption></figcaption>');
    print_render.img_caption.addClass(Concept.figure_caption_classes);
    print_render.img_figure.append(print_render.img_caption);
    print_render.img_caption.append(print_render.phr_text_span.detach());
};

PrintRender.prototype._render_none = function (print_render) {
    var text_span = print_render.phr_text_span.detach();
    print_render.phr_span.empty();
    print_render.phr_span.append(text_span);
};

PrintRender.prototype._render = function (concept, doc, att_engine) {
    // Debug statment, only comment out from debug console
    //console.log(concept.get_phrase(doc_id).text);

//        if (concept.get_phrase(doc_id).text == 'Python has various kinds of string literals:')
//            console.log(concept.get_phrase(doc_id).text);

    var print_render = new PrintRenderObj();
    // concept.cur_render_obj = print_render; // Set this for the auto attr engine
    this.att_engine = new AutoAttributeEngine();
    var attribute = concept.getDocumentAttribute(doc);

    var order_list = false;
    var unorder_list = false;

    if (!attribute || (attribute && !attribute.isNoList())) {
        if (!attribute || (attribute && !attribute.isUnorderedList())) {
            if ((attribute && attribute.isOrderedList()) ||
                    (concept.isParent() && this.att_engine.is_ordered_list(concept.getParent(), null, doc)))
                order_list = true;
        }

        if (!attribute || (attribute && !attribute.isOrderedList())) {
            if ((attribute && attribute.isUnorderedList()) ||
                    (concept.isParent() && this.att_engine.is_unordered_list(concept.getParent(), null, doc)))
                unorder_list = true;
        }
    }

    print_render.render_as_order_list = order_list;
    print_render.render_as_unorder_list = unorder_list;

    var attr = this.att_engine.get_attr(concept, attribute, doc);

    concept.print_render = print_render;

    print_render.span = $('<span></span>');
    print_render.span.addClass(Concept.con_span_classes);
    if (!concept.isCrawlable(doc))
        print_render.span.hide();

    print_render.phr_span = $('<span></span>');
    print_render.phr_span.addClass(Concept.con_phr_span_classes);
    print_render.span.append(print_render.phr_span);

    print_render.children_span = $('<span></span>');
    print_render.children_span.addClass('children_span');
    print_render.span.append(print_render.children_span);

    print_render.parent_children_span = $('<span></span>');
    print_render.parent_children_span.addClass('parent_children_span');
    print_render.span.append(print_render.parent_children_span);

    this._render_text_span(concept.getDocumentPhrasing(doc), print_render);

    print_render.phr_span.append(print_render.phr_text_span.detach());
    if (attr == Attribute.HEADER)
        this._render_header(concept, print_render);
    else if (attr == Attribute.PARAGRAPH)
        this._render_paragraph(print_render);
    else if (attr == Attribute.IMAGE)
        this._render_image(concept, doc, print_render);
    else if (attr == Attribute.NONE)
        this._render_none(print_render);
    if (order_list)
        this._render_ordered_list(print_render);
    else if (unorder_list)
        this._render_unordered_list(print_render);
    if (this.att_engine.is_list_item(concept, doc))
        this._render_list_item(print_render);
    else
        this._clean_up_list(print_render);
};

PrintRender.prototype.render = function (concept, doc, att_engine) {
    if (!doc)
        doc = Document.getCurrent();
    this._render(concept, doc, att_engine);
};

PrintRender.prototype.process_root = function (project, doc) {
    var print_render = new PrintRenderObj();
    print_render.span = $('<span></span>');
    print_render.children_span = $('<span></span>');
    print_render.parent_children_span = $('<span></span>');
    print_render.span.append(print_render.children_span);
    print_render.span.append(print_render.parent_children_span);

    project.print_render = print_render;

    var attr = project.getDocumentAttribute(doc);

    if (attr && attr.isUnorderedList()) {
        if (print_render.ol) {
            print_render.span.append(print_render.ol.children().detach());
            print_render.ol.remove();
        }
        if (!print_render.ul)
            print_render.ul = $('<ul></ul>');
        print_render.ul.append(print_render.children_span.detach());
        print_render.ul.append(print_render.parent_children_span.detach());
        print_render.span.append(print_render.ul);
        print_render.setCurrentRenderedAttribute(Attribute.UNORDERED_LIST);
    } else if (attr && attr.isOrderedList()) {
        if (print_render.ul) {
            print_render.span.append(print_render.ul.children().detach());
            print_render.ul.remove();
        }
        if (!print_render.ol)
            print_render.ol = $('<ol></ol>');
        print_render.ol.append(print_render.children_span.detach());
        print_render.ol.append(print_render.parent_children_span.detach());
        print_render.span.append(print_render.ol);
        print_render.setCurrentRenderedAttribute(Attribute.ORDERED_LIST);
    } else {
        if (print_render.ul) {
            print_render.span.append(print_render.ul.children().detach());
            print_render.ul.remove();
        }
        if (print_render.ol) {
            print_render.span.append(print_render.ol.children().detach());
            print_render.ol.remove();
        }
        print_render.setCurrentRenderedAttribute(Attribute.NONE);
    }
};