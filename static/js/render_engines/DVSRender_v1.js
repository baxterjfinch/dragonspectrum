function AutoAttributeEngine() {}

AutoAttributeEngine.prototype = {
    is_list_item: function (concept, doc) {
        var par = concept.getParent();
        var attribute = par.getDocumentAttribute(doc);
        return this.is_ordered_list(par, attribute, doc) || this.is_unordered_list(par, attribute, doc);
    },

    is_ordered_list: function (concept, attribute, doc) {
        if (!attribute)
            attribute = concept.getDocumentAttribute(doc);
        if (attribute && attribute.isNoList())
            return false;
        if (attribute && attribute.isOrderedList())
            return true;
        if (attribute && attribute.isUnorderedList())
            return false;
        if (concept.isRoot())
            return false;
        var par = concept.getParent();
        return !!(concept.isParent() && this.is_list_item(concept, doc) &&
            par.getDvsRender().isRenderedOrderedList());
    },

    is_unordered_list: function (concept, attribute, doc) {
        if (!attribute)
            attribute = concept.getDocumentAttribute(doc);
        if (attribute && attribute.isNoList())
            return false;
        if (attribute && attribute.isUnorderedList())
            return true;
        if (attribute && attribute.isOrderedList())
            return false;
        if (concept.isRoot())
            return false;
        var par = concept.getParent();
        return !!(concept.isParent() && this.is_list_item(concept, doc) &&
            par.getDvsRender().isRenderedUnorderedList());
    },

    is_header: function (concept, attribute, doc) {
        if (!concept.isParent() || (concept.isLinked() || concept.isChildOfLinked()))
            return false;
        if (attribute && attribute.isNoHeader())
            return false;
        var children = concept.getChildren();
        if (children.length == 0)
            return false;
        if (concept.getDocumentPhrasing(doc).getWordCount() > 7)
            return false;
        var count = 0;
        for (var i = 0; i < children.length; i++)
            if (!children[i].isParent())
                return false;
            else
                count++;
        return count > 1;
    },

    is_paragraph: function (concept) {
        var par = concept.getParent();
        var parDvsRender = par.getDvsRender();
        if (parDvsRender.isRenderedList() || concept.getDvsRender().isRenderedList())
            return false;
        if (concept.isParent())
            return true;
        var children = par.getChildren();
        for (var i = 0; i < children.length; i++) {
            if (children[i] == concept)
                break;
            if (children[i].isParent())
                return true;
        }
        return !(parDvsRender.getCurrentRenderedAttribute() == Attribute.PARAGRAPH)
    },

    calculate_attribute: function (concept, attribute, doc) {
        if (this.is_header(concept, attribute, doc))
            return Attribute.HEADER;
        if (this.is_paragraph(concept))
            return Attribute.PARAGRAPH;
        return Attribute.NONE;
    },

    get_attr: function (concept, attribute, doc) {
        if (attribute && attribute.isHeader())
            return Attribute.HEADER;
        if (attribute && attribute.isParagraph())
            return Attribute.PARAGRAPH;
        if (attribute && attribute.isImage())
            return Attribute.IMAGE;
        return this.calculate_attribute(concept, attribute, doc);
    }
};

function DVSRender() {
    this.version = '0.0.1';
    this.type = 'dvs';
    this.att_engine = null;
}

DVSRender.prototype = {

    getType: function () {
        return this.type;
    },

    _render_text_span: function (concept, doc, dvsRender) {
        if (!dvsRender.phr_text_span) {
            dvsRender.phr_text_span = $('<span></span>');
            dvsRender.phr_span.click(function () {
                ConceptEventListener.activeMouseClick(concept);
            });
        } else {
            dvsRender.phr_text_span.children().detach();
            dvsRender.phr_text_span.empty();
        }
        if (concept.summernote === 'undefined' || concept.summernote == null) {
            dvsRender.phr_text_span.append(concept.getDocumentPhrasing(doc).getText() + ' ');
        } else {
            dvsRender.phr_text_span.append(concept.summernote.get_span());
        }
    },

    render_text_span: function (concept, doc) {
        this._render_text_span(concept, doc, concept.getDvsRender());
    },

    _render_header: function (concept, dvsRender) {
        var hl = concept.getDepth() + 1;
        if (hl > 6)
            hl = 6;
        if (!dvsRender.header || hl != dvsRender.header_level) {
            dvsRender.header = $('<h' + hl + '></h' + hl + '>');
            dvsRender.header_level = hl;
        }
        dvsRender.phr_span.children().detach();
        dvsRender.phr_span.append(dvsRender.header);
        // Always need to reset this
        dvsRender.header.append(dvsRender.phr_text_span.detach());
    },

    _render_paragraph: function (concept, dvsRender) {
        dvsRender.p = $('<p></p>');
        dvsRender.p.append(dvsRender.span.children().detach());
        dvsRender.span.append(dvsRender.p);
        dvsRender.span.append(dvsRender.parent_children_span.detach());
        dvsRender.phr_span.children().detach();
        dvsRender.phr_span.append(dvsRender.phr_text_span.detach());
    },

    _render_ordered_list: function (concept, dvsRender) {
        dvsRender.ol = $('<ol></ol>');
        dvsRender.ol.append(dvsRender.children_span.detach());
        dvsRender.ol.append(dvsRender.parent_children_span.detach());
        dvsRender.span.append(dvsRender.ol);
    },

    _render_unordered_list: function (concept, dvsRender) {
        dvsRender.ul = $('<ul></ul>');
        dvsRender.ul.append(dvsRender.children_span.detach());
        dvsRender.ul.append(dvsRender.parent_children_span.detach());
        dvsRender.span.append(dvsRender.ul);
    },

    _render_list_item: function (concept, dvsRender, doc) {
        if (!dvsRender.li)
            dvsRender.li = $('<li></li>');
        dvsRender.li.detach();
        dvsRender.li.append(dvsRender.phr_span.children().detach());
        dvsRender.phr_span.append(dvsRender.li.detach());
        if (this.att_engine.is_ordered_list(concept.getParent(), null, doc)) {
            dvsRender.setRenderdOrderedListItem(true);
            dvsRender.setRenderedUnorderedListItem(false);
        } else if (this.att_engine.is_unordered_list(concept.getParent(), null, doc)) {
            dvsRender.setRenderedUnorderedListItem(true);
            dvsRender.setRenderdOrderedListItem(false);
        }
    },

    _clean_up_list: function (dvsRender) {
        if (dvsRender.li) {
            dvsRender.li.remove();
            dvsRender.li = null;
        }
        dvsRender.setRenderdOrderedListItem(false);
        dvsRender.setRenderedUnorderedListItem(false);
    },

    _render_image: function (concept, doc, dvsRender) {

        if (!dvsRender.img_figure) {
            dvsRender.img_figure = $('<figure></figure>');
            dvsRender.img_figure.addClass(Concept.figure_classes);
        }
        dvsRender.phr_span.append(dvsRender.img_figure);

        if (!dvsRender.img_icon_span) {
            dvsRender.img_icon_span = $('<span></span>');
            var image_icon = $('<i></i>');
            image_icon.addClass(Concept.figure_icon_classes);
            dvsRender.img_icon_span.append(image_icon);
            dvsRender.img_icon_span.addClass(Concept.figure_icon_span_classes);
            if (concept.isLinked() || concept.isChildOfLinked())
                dvsRender.img_icon_span.attr('src', ARTIFACT_URLS.media_download + concept.getRequestId());
            else
                dvsRender.img_icon_span.attr('src', ARTIFACT_URLS.media_download + concept.getRequestId());
            dvsRender.img_icon_span.dblclick(DVS.showImageLightBox);
            if (Concept.image_status != 'no_image')
                dvsRender.img_icon_span.hide();
            dvsRender.img_figure.append(dvsRender.img_icon_span);
        }

        if (!dvsRender.img) {
            dvsRender.img = $('<img>');
            dvsRender.img.attr('alt', concept.getDocumentPhrasing(doc).getText());
            if (concept.isLinked() || concept.isChildOfLinked())
                dvsRender.img.attr('src', ARTIFACT_URLS.media_download + concept.getRequestId());
            else
                dvsRender.img.attr('src', ARTIFACT_URLS.media_download + concept.getRequestId());
            dvsRender.img.addClass(Concept.image_classes);
            if (Concept.image_status == 'small')
                dvsRender.img.addClass('img-small');
            else if (Concept.image_status == 'large')
                dvsRender.img.addClass('img-full');
            else if (Concept.image_status == 'no_image')
                dvsRender.img.hide();
            dvsRender.img.dblclick(DVS.showImageLightBox);
            dvsRender.img_figure.append(dvsRender.img);
        }

        if (!dvsRender.img_caption) {
            dvsRender.img_caption = $('<figcaption></figcaption>');
            dvsRender.img_caption.addClass(Concept.figure_caption_classes);
            dvsRender.img_figure.append(dvsRender.img_caption);
        }
        dvsRender.img_caption.append(dvsRender.phr_text_span.detach());
    },

    _render_none: function (concept, dvs_render) {
        var text_span = dvs_render.phr_text_span.detach();
        dvs_render.phr_span.empty();
        dvs_render.phr_span.append(text_span);
    },

    render: function (concept, doc) {
        // Debug statment, only comment out from debug console
        //console.log(concept.get_phrase(doc_id).text);

        if (concept.isDeleted())
            return;

        var dvsRender = concept.getDvsRender();
        var re_render = false;
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

        dvsRender.render_as_order_list = order_list;
        dvsRender.render_as_unorder_list = unorder_list;

        var attr = this.att_engine.get_attr(concept, attribute, doc);

        if (!dvsRender.span) {
            dvsRender.span = $('<span></span>');
            dvsRender.span.addClass(Concept.con_span_classes);
            if (!concept.isCrawlable(doc))
                dvsRender.span.hide();
            else
                dvsRender.span.show();
            dvsRender.span[0].concept = concept;
        } else {
            if (!concept.isCrawlable(doc))
                dvsRender.span.hide();
            else
                dvsRender.span.show();
            re_render = true;
        }

        if (TVS.inUse()) {
            var crawlcontext = concept.getDocumentCrawlContext(doc);
            var node = concept.getTvsNode();
            if (crawlcontext && node)
                node.select(crawlcontext.getCrawl())
        }

        if (!dvsRender.phr_span) {
            dvsRender.phr_span = $('<span></span>');
            dvsRender.phr_span.addClass(Concept.con_phr_span_classes);
            if (concept.isLinked() || concept.isChildOfLinked())
                dvsRender.phr_span.addClass(Concept.con_phr_span_context_linked_classes);
            else
                dvsRender.phr_span.addClass(Concept.con_phr_span_context_classes);
            dvsRender.phr_span.data('concept', concept);
            dvsRender.phr_span[0].concept = concept;
            dvsRender.span.append(dvsRender.phr_span);
        }

//        if (concept.isParent() && !dvsRender.more_icon) {
//            dvsRender.more_icon = $('<i></i>');
//            dvsRender.more_icon.addClass(Concept.more_icon_classes);
//            dvsRender.more_icon[0].concept = concept;
//            dvsRender.more_icon.click(function () {
//                ConceptEventListener.expandMouseClick(concept);
//            });
//            if (concept.isExpanded())
//                dvsRender.more_icon.hide();
//            dvsRender.span.append(dvsRender.more_icon);
//        } else if (!concept.isParent() && dvsRender.more_icon) {
//            dvsRender.more_icon.detach();
//            dvsRender.more_icon = null;
//        }

        if (concept.isParent()) {
            console.log("queued: " + concept.isQueuedLoading());
            console.log("loading: " + concept.isBeingFetched());

            if (!dvsRender.more_icon) {
                dvsRender.queued_icon = $('<i></i>');
                dvsRender.queued_icon.addClass(concept.loading_queued_icon_classes);
                dvsRender.span.append(dvsRender.queued_icon);

                dvsRender.loading_icon = $('<i></i>');
                dvsRender.loading_icon.addClass(concept.loading_icon_classes);
                dvsRender.span.append(dvsRender.loading_icon);

                dvsRender.more_icon = $('<i></i>');
                dvsRender.more_icon.addClass(Concept.more_icon_classes);
                dvsRender.more_icon[0].concept = concept;
                dvsRender.more_icon.click(function () {
                    ConceptEventListener.expandMouseClick(concept);
                });
                dvsRender.span.append(dvsRender.more_icon);
            }

            if (concept.isQueuedLoading()) {
                dvsRender.queued_icon.show();
                dvsRender.loading_icon.hide();
                dvsRender.loading_icon.hide();
            } else if (concept.isBeingFetched()) {
                dvsRender.queued_icon.hide();
                dvsRender.more_icon.show();
                dvsRender.loading_icon.hide();
            } else {
                dvsRender.queued_icon.hide();
                dvsRender.more_icon.hide();
                dvsRender.loading_icon.show();
            }
        }

        var child_ann_num = Annotation.conceptHasChildrenAnnotation(concept, doc);
        if (child_ann_num > 0) {
            if (!dvsRender.anno_parent_icon) {
                dvsRender.anno_parent_icon = $('<sub></sub>');
                dvsRender.anno_parent_icon.attr('id', concept.getId());
                dvsRender.anno_parent_icon.addClass('anno-parent');
                dvsRender.anno_parent_icon[0].concept = concept;
                dvsRender.anno_parent_icon.append($('<i></i>'));
            }
            if (child_ann_num > 1) {
                dvsRender.anno_parent_icon.children().removeClass(Annotation.anno_parent_icon_classes);
                dvsRender.anno_parent_icon.children().addClass(Annotation.anno_parent_multi_icon_classes);
            } else {
                dvsRender.anno_parent_icon.children().removeClass(Annotation.anno_parent_multi_icon_classes);
                dvsRender.anno_parent_icon.children().addClass(Annotation.anno_parent_icon_classes);
            }

            dvsRender.anno_parent_icon[0].concept = concept;
            // TODO: add click event to activate Concept
//            dvs_render.anno_icon.click();
            if (concept.isExpanded())
                dvsRender.anno_parent_icon.hide();
        } else if (dvsRender.anno_parent_icon) {
            dvsRender.anno_parent_icon.detach();
            dvsRender.anno_parent_icon = null;
        }

        var num_anno = Annotation.conceptHasAnnotation(concept, doc);
        if (num_anno) {
            if (!dvsRender.anno_icon) {
                dvsRender.anno_icon = $('<sup></sup>');
                dvsRender.anno_icon.attr('id', concept.getId());
                dvsRender.anno_icon[0].concept = concept;
                dvsRender.anno_icon.append($('<i></i>'));
                dvsRender.anno_icon[0].concept = concept;
            }
            if (num_anno > 1) {
                dvsRender.anno_icon.children().removeClass(Annotation.anno_icon_classes);
                dvsRender.anno_icon.children().addClass(Annotation.anno_icon_multi_classes);
            } else {
                dvsRender.anno_icon.children().removeClass(Annotation.anno_icon_multi_classes);
                dvsRender.anno_icon.children().addClass(Annotation.anno_icon_classes);
            }
        } else if (dvsRender.anno_icon) {
            dvsRender.anno_icon.detach();
            dvsRender.anno_icon = null;
        }

        if (!dvsRender.children_span) {
            dvsRender.children_span = $('<span></span>');
            dvsRender.children_span.addClass('children_span');
            // TODO: This if should only be checking crawlcontext
            if (!concept.isExpanded())
                dvsRender.children_span.hide();
            dvsRender.children_span[0].concept = concept;
            dvsRender.span.append(dvsRender.children_span);
        } else {
            // TODO: This if should only be checking crawlcontext
            if (!concept.isExpanded())
                dvsRender.children_span.hide();
        }

        if (!dvsRender.parent_children_span) {
            dvsRender.parent_children_span = $('<span></span>');
            dvsRender.parent_children_span.addClass('parent_children_span');
            // TODO: This if should only be checking crawlcontext
            if (!concept.isExpanded())
                dvsRender.parent_children_span.hide();
            dvsRender.parent_children_span[0].concept = concept;
            dvsRender.span.append(dvsRender.parent_children_span);
        } else {
            // TODO: This if should only be checking crawlcontext
            if (!concept.isExpanded())
                dvsRender.parent_children_span.hide();
        }

        if (!concept.isParent()) {
            dvsRender.children_span.empty();
            dvsRender.parent_children_span.empty();
        }

        this._render_text_span(concept, doc, dvsRender);

        if (re_render) {
            var child = dvsRender.span.children();
            if (child.length > 1 && (child[1].nodeName == 'UL' || child[1].nodeName == 'OL' || child[0].nodeName == 'P')) {
                dvsRender.span.children().detach();
                dvsRender.span.append(dvsRender.phr_span.detach());
                dvsRender.span.append(dvsRender.children_span.detach());
                dvsRender.span.append(dvsRender.parent_children_span.detach());
                dvsRender.p = null; // Just set them all to null as it should be faster than three if/else statements
                dvsRender.ul = null;
                dvsRender.ol = null;
            }
        }


        dvsRender.phr_span.append(dvsRender.phr_text_span.detach());
        if (attr == Attribute.HEADER)
            this._render_header(concept, dvsRender);
        else if (attr == Attribute.PARAGRAPH)
            this._render_paragraph(concept, dvsRender);
        else if (attr == Attribute.IMAGE)
            this._render_image(concept, doc, dvsRender);
        else if (attr == Attribute.NONE)
            this._render_none(concept, dvsRender);
        if (order_list)
            this._render_ordered_list(concept, dvsRender);
        else if (unorder_list)
            this._render_unordered_list(concept, dvsRender);
        if (this.att_engine.is_list_item(concept, doc))
            this._render_list_item(concept, dvsRender, doc);
        else
            this._clean_up_list(dvsRender);
        dvsRender.setCurrentRenderedAttribute(attr);
        dvsRender.cleanup(attr);
        if (dvsRender.more_icon) {
            dvsRender.phr_text_span.after(dvsRender.more_icon.detach());
            if (concept.isExpanded())
                dvsRender.more_icon.hide();
        }
        if (dvsRender.anno_parent_icon) {
            dvsRender.phr_text_span.after(dvsRender.anno_parent_icon.detach());
            if (concept.isExpanded())
                dvsRender.anno_parent_icon.hide();
        }
        if (dvsRender.anno_icon) {
            dvsRender.phr_text_span.after(dvsRender.anno_icon.detach());
        }

        dvsRender.setIsRendered(true);
    },

    process_root: function (project, doc) {
        var attr = project.getDocumentAttribute(doc);
        var dvsRender = project.getDvsRender();
        if (attr && attr.isUnorderedList()) {
            if (dvsRender.ol) {
                dvsRender.span.append(dvsRender.ol.children().detach());
                dvsRender.ol.detach();
            }
            if (!dvsRender.ul)
                dvsRender.ul = $('<ul></ul>');
            dvsRender.ul.append(dvsRender.children_span.detach());
            dvsRender.ul.append(dvsRender.parent_children_span.detach());
            dvsRender.span.append(dvsRender.ul);
            dvsRender.setCurrentRenderedAttribute(Attribute.UNORDERED_LIST);
        } else if (attr && attr.isOrderedList()) {
            if (dvsRender.ul) {
                dvsRender.span.append(project.ul.children().detach());
                dvsRender.ul.detach();
            }
            if (!dvsRender.ol)
                dvsRender.ol = $('<ol></ol>');
            dvsRender.ol.append(dvsRender.children_span.detach());
            dvsRender.ol.append(dvsRender.parent_children_span.detach());
            dvsRender.span.append(dvsRender.ol);
            dvsRender.setCurrentRenderedAttribute(Attribute.ORDERED_LIST);
        } else {
            if (dvsRender.ul) {
                dvsRender.span.append(dvsRender.ul.children().detach());
                dvsRender.ul.detach();
            }
            if (dvsRender.ol) {
                dvsRender.span.append(dvsRender.ol.children().detach());
                dvsRender.ol.detach();
            }
            dvsRender.setCurrentRenderedAttribute(Attribute.NONE);
        }
    }
};
