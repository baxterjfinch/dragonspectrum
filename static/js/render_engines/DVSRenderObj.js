function DVSRenderObj() {
    this.is_rendered = false;
    this.cur_attr = null;
    this.render_as_order_list = false;
    this.render_as_unorder_list = false;

    this.span = null;
    this.phr_span = null;
    this.phr_text_span = null;
    this.children_span = null;
    this.parent_children_span = null;
    this.more_icon = null;
    this.anno_parent_icon = null;
    this.anno_icon = null;

    // attr pointers
    this.header = null;
    this.header_level = null;
    this.p = null;
    this.ol = null;
    this.ul = null;
    this.li = null;

    // image pointers
    this.img_figure = null;
    this.img_icon_span = null;
    this.img = null;
    this.img_caption = null;
}

DVSRenderObj.prototype.setIsRendered = function (flag) {
    this.is_rendered = flag;
};

DVSRenderObj.prototype.isRendered = function () {
    return this.is_rendered;
};

DVSRenderObj.prototype.setCurrentRenderedAttribute = function (attr) {
    this.cur_attr = attr;
};

DVSRenderObj.prototype.getCurrentRenderedAttribute = function () {
    return this.cur_attr;
};

DVSRenderObj.prototype.isRenderedHeader = function () {
    return this.getCurrentRenderedAttribute() == Attribute.HEADER;
};

DVSRenderObj.prototype.isRenderedParagraph = function () {
    return this.getCurrentRenderedAttribute() == Attribute.PARAGRAPH;
};

DVSRenderObj.prototype.isRenderedOrderedList = function () {
    return this.render_as_order_list;
};

DVSRenderObj.prototype.isRenderedUnorderedList = function () {
    return this.render_as_unorder_list;
};

DVSRenderObj.prototype.isRenderedList = function () {
    return this.isRenderedOrderedList() || this.isRenderedUnorderedList();
};

DVSRenderObj.prototype.setRenderdOrderedListItem = function (flag) {
    this.render_ordered_item = flag;
};

DVSRenderObj.prototype.isRenderedOrderedListItem = function () {
    return this.render_ordered_item;
};

DVSRenderObj.prototype.setRenderedUnorderedListItem = function (flag) {
    this.render_unordered_item = flag;
};

DVSRenderObj.prototype.isRenderedUnorderedListItem = function () {
    return this.render_unordered_item;
};

DVSRenderObj.prototype.isRenderedListItem = function () {
    return this.isRenderedOrderedListItem() || this.isRenderedUnorderedListItem();
};

DVSRenderObj.prototype.isRenderedImage = function () {
    return this.getCurrentRenderedAttribute() == Attribute.IMAGE;
};

DVSRenderObj.prototype.isRenderedNone = function () {
    return this.getCurrentRenderedAttribute() == Attribute.NONE;
};

// Clean up our dom pointers from attr changes
DVSRenderObj.prototype.cleanup = function (attr) {
    // We can skip image concepts as they will never change
    if (attr == Attribute.IMAGE)
        return;
    if (attr == Attribute.HEADER) {
        this.p = null;
        this.ol = null;
        this.ul = null;
    } else if (attr == Attribute.PARAGRAPH) {
        if (this.header) {
            this.header.detach();
            this.header = null;
        }
        this.header_level = null;
        this.ol = null;
        this.ul = null;
    } else if (attr == Attribute.ORDERED_LIST) {
        if (this.header) {
            this.header.detach();
            this.header = null;
        }
        this.header_level = null;
        this.p = null;
        this.ul = null;
    } else if (attr == Attribute.UNORDERED_LIST) {
        if (this.header) {
            this.header.detach();
            this.header = null;
        }
        this.header_level = null;
        this.p = null;
        this.ol = null;
    } else if (attr == Attribute.LIST_ITEM) {
        if (this.header) {
            this.header.detach();
            this.header = null;
        }
        this.header_level = null;
        this.p = null;
        this.ol = null;
        this.ul = null;
    } else if (attr == Attribute.NONE) {
        if (this.header) {
            this.header.detach();
            this.header = null;
        }
        this.header_level = null;
        this.p = null;
        this.ol = null;
        this.ul = null;
    }
};

DVSRenderObj.prototype.remove = function () {
    if (this.span)
        this.span.detach();
    if (this.phr_span)
        this.phr_span.detach();
    if (this.phr_text_span)
        this.phr_text_span.detach();
    if (this.children_span)
        this.children_span.detach();
    if (this.parent_children_span)
        this.parent_children_span.detach();
    if (this.more_icon)
        this.more_icon.detach();
    if (this.anno_parent_icon)
        this.anno_parent_icon.detach();
    if (this.anno_icon)
        this.anno_icon.detach();
    if (this.header)
        this.header.detach();
    if (this.p)
        this.p.detach();
    if (this.ol)
        this.ol.detach();
    if (this.ul)
        this.ul.detach();
    if (this.li)
        this.li.detach();
    if (this.img_figure)
        this.img_figure.detach();

    this.span = null;
    this.phr_span = null;
    this.phr_text_span = null;
    this.children_span = null;
    this.parent_children_span = null;
    this.more_icon = null;
    this.anno_parent_icon = null;
    this.anno_icon = null;
    this.header = null;
    this.header_level = null;
    this.p = null;
    this.ol = null;
    this.ul = null;
    this.li = null;
    this.img_figure = null;
    this.img_icon_span = null;
    this.img = null;
    this.img_caption = null;
};
