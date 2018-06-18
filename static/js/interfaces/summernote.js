function SummerNote () {
    this.caret_pos = null;
    this.range = null;
    this.counter = 0;
    this.mode = null;
    this.parent = null;
    this.concept = null;
    this.summary = null;
    this.span = null;
    this.start_text = null;
    this.air_mode = true;
    this.editable_span = null;
    this.height = 50;
    this.changed = false;
    this.toolbar = [
        ['style', ['bold', 'italic', 'underline', 'clear']],
        ['font', ['strikethrough']],
        ['color', ['color']]
    ]
}

SummerNote.name = 'summernote';
SummerNote.summernote = null;
SummerNote.removing_summernote = false;

SummerNote.prototype.initialize = function (parent, concept, start_text) {
    this.span = $('<span></span>');
    this.start_text = start_text;
    this.concept = concept;
    concept.summernote = SummerNote.summernote;
    this.render();
};

SummerNote.prototype.get_span = function () {
    return this.span;
};

SummerNote.prototype.set_mode = function (mode) {
    this.mode = mode;
};

SummerNote.prototype.get_mode = function () {
    return this.mode;
};

SummerNote.prototype.getConcept = function () {
    return this.concept;
};

SummerNote.prototype._get_caret = function () {
    try {
        var element = $('.note-editable')[0];
        if (!element)
            return;
        var caretOffset = {};
        var doc = element.ownerDocument || element.document;
        var win = doc.defaultView || doc.parentWindow;
        var range = win.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        caretOffset.start = preCaretRange.toString().length;
        preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset.end = preCaretRange.toString().length;
        return caretOffset;
    } catch (e) {
        // do nothing
    }
};

SummerNote.prototype.save_caret = function () {
    if (SummerNote.summernote) {
        SummerNote.summernote.caret_set = false;
        SummerNote.summernote.caret_pos = SummerNote.summernote._get_caret();
    }
};

SummerNote.prototype._get_caret_node = function (node, offset_data) {
    if (node.nodeName == '#text') {
        if (offset_data.cur_offset + node.data.length >= offset_data.total_offset.start ||
                offset_data.cur_offset + node.data.length >= offset_data.total_offset.end) {
            if (offset_data.cur_offset + node.data.length >= offset_data.total_offset.start &&
                    !offset_data.start_found) {
                offset_data.start_child = node;
                offset_data.start_offset = offset_data.total_offset.start - offset_data.cur_offset;
                offset_data.start_found = true;
            }
            if (offset_data.cur_offset + node.data.length >= offset_data.total_offset.end &&
                !offset_data.end_found) {
                offset_data.end_child = node;
                offset_data.end_offset = offset_data.total_offset.end - offset_data.cur_offset;
                offset_data.end_found = true;
            }
            if (offset_data.start_found && offset_data.end_found)
                return true;
        }
        offset_data.cur_offset += node.data.length;
    }
    for (var i = 0; i < node.childNodes.length; i++) {
        if (SummerNote.summernote._get_caret_node(node.childNodes[i], offset_data))
            return true;
    }
    return false;
};

SummerNote.prototype._set_caret = function (caretOffset) {
    if (!caretOffset)
        return;
    var cur_caretOffset = SummerNote.summernote._get_caret();
    if (cur_caretOffset && cur_caretOffset.start == caretOffset.start && cur_caretOffset.end == caretOffset.end)
        return;
    var element = $('.note-editable')[0];
    if (!element)
        return;
    var range = document.createRange();
    var sel = window.getSelection();
    var offset_data = {
        start_child: null,
        end_child: null,
        start_offset: 0,
        end_offset: 0,
        cur_offset: 0,
        total_offset: caretOffset,
        start_found: false,
        end_found: false
    };
    for (var i = 0; i < element.childNodes.length; i++) {
        if (SummerNote.summernote._get_caret_node(element.childNodes[i], offset_data))
            break;
    }
    range.setStart(offset_data.start_child, offset_data.start_offset);
    range.setEnd(offset_data.end_child, offset_data.end_offset);
    sel.removeAllRanges();
    sel.addRange(range);
};

SummerNote.prototype.set_caret = function () {
    SummerNote.summernote._set_caret(SummerNote.summernote.caret_pos);
};

SummerNote._strip_unwanted_tags = function (str) {
    str = str.replace(/<p>/gi, "");
    str = str.replace(/<\/p>/gi, "");
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return str;
};

SummerNote.prototype.get_text = function () {
    if (!this.summary)
        return null;
    return SummerNote._strip_unwanted_tags(this.summary.code().trim());
};

SummerNote.prototype.onpaste = function (e) {
    SummerNote.summernote.changed = true;
};

SummerNote.prototype.onkeyup = function (e) {
    if (SummerNote.summernote.get_text().trim() != "") {
        $(".note-editable").removeClass("note-editable-block");
    } else {
        $(".note-editable").addClass("note-editable-block");
    }
    SummerNote.summernote.changed = true;
    SummerNote.summernote.save_caret();
};

SummerNote.prototype._render = function () {
    console.debug('Rendering Summernote');
    var self = this;
    if (!this.summary) {
        this.summary = $('<span></span>');
        this.span.append(this.summary.detach());
        this.span.append('&nbsp;');
        this.span.mouseup(SummerNote.summernote.save_caret);
        this.span.focusout(SummerNote.summernote.save_caret);
        this.span.focusin(function (e) {
            SummerNote.summernote._set_caret(SummerNote.summernote.caret_pos);
        });
        this.summary.summernote({
            focus: true,
            airPopover: this.toolbar,
            airMode: this.air_mode,
            onpaste: this.onpaste,
            onkeyup: this.onkeyup,
            onChange: this.onkeyup
        });
        if (this.start_text)
            this.summary.code(this.start_text);
    }
};

SummerNote.prototype.render = function () {
    this._render();
};

SummerNote.prototype.focus = function () {
    if (!this.editable_span || !this.editable_span.length)
        this.editable_span = $('.note-editable');
    if (this.editable_span.is(':focus')) {
        return;
    }
    var empty = false;
    if (this.summary.code().trim() == '') {
        empty = true;
        this.summary.code('.');
    }
    this.editable_span.focus();
    if (empty)
        this.summary.code('');
};

SummerNote.prototype.destory = function () {
    console.debug('Destroying Summernote');
    this.summary.destroy();
    this.span.remove();
    this.concept.summernote = null;
    $('.note-popover').remove();
};

SummerNote.prototype.set_cursor_to_end = function () {
    var el = $('.note-editable')[0];
    if (typeof window.getSelection != "undefined"
        && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
};

SummerNote.prototype.select_all_text = function () {
    document.execCommand('selectAll',false,null)
};

SummerNote.create = function (concept, start_text, mode) {
    console.debug('Creating Summernote');
    PVS.showEditModel();
    if (SummerNote.summernote) {
        SummerNote.remove();
    }
    SummerNote.summernote = new SummerNote();
    var par = concept.getParent();
    SummerNote.summernote.initialize(par, concept, start_text);

    if (mode == "new_con") {
        var wrapper = SummerNote.summernote.span;
        wrapper.append(SummerNote.createNewConceptButtons());
    }

    SummerNote.summernote.set_mode(mode);
    SummerNote.summernote.focus();

    if (start_text == '') {
        setTimeout(function () {
            $(".note-editable").addClass("note-editable-block");
        }, 10);
    }
};

SummerNote.createNewConceptButtons = function () {
    var button_group = $("<div></div>");
    button_group.prop("id", "new-concept-buttons");
    button_group.addClass("btn-group");

    var image_btn = $("<button></button>");
    image_btn.prop("type", "button");
    image_btn.prop("data-toggle", "tooltip");
    image_btn.prop("title", "Create Image Concept");
    image_btn.addClass("btn btn-xs btn-default");
    image_btn.append('<i class="fa fa-image"></i>');
    image_btn.click(function (e) {
        e.stopPropagation();
        ConceptEventListener.createImageSummernote();
        return false;
    });
    button_group.append(image_btn);

    var link_btn = $("<button></button>");
    link_btn.prop("type", "button");
    link_btn.prop("data-toggle", "tooltip");
    link_btn.prop("title", "Create Linked Concept");
    link_btn.addClass("btn btn-xs btn-default");
    link_btn.append('<i class="fa fa-link"></i>');
    link_btn.click(function (e) {
        e.stopPropagation();
        ConceptEventListener.createLinkSummernote();
        return false;
    });
    button_group.append(link_btn);

    return button_group;
};

SummerNote.remove = function () {
    console.debug('Removing Summernote');
    PVS.hideEditModel();
    if (!SummerNote.summernote)
        return;
    if (SummerNote.removing_summernote)
        return;
    var summer = SummerNote.summernote;
    SummerNote.summernote = null;
    SummerNote.removing_summernote = true;
    summer.destory();
    summer = null;
    Shortcut.set('dvs');
    SummerNote.removing_summernote = false;
};

//Namespace management idea from http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/
(function( cursorManager ) {

    //From: http://www.w3.org/TR/html-markup/syntax.html#syntax-elements
    var voidNodeTags = ['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'MENUITEM', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR', 'BASEFONT', 'BGSOUND', 'FRAME', 'ISINDEX'];

    //From: http://stackoverflow.com/questions/237104/array-containsobj-in-javascript
    var array_contains = function(arry, obj) {
        var i = arry.length;
        while (i--) {
            if (arry[i] === obj) {
                return true;
            }
        }
        return false;
    };

    //Basic idea from: http://stackoverflow.com/questions/19790442/test-if-an-element-can-contain-text
    function canContainText(node) {
        if(node.nodeType == 1) { //is an element node
            return !array_contains(voidNodeTags, node.nodeName);
        } else { //is not an element node
            return false;
        }
    }

    function getLastChildElement(el){
        var lc = el.lastChild;
        while(lc.nodeType != 1) {
            if(lc.previousSibling)
                lc = lc.previousSibling;
            else
                break;
        }
        return lc;
    }

    //Based on Nico Burns's answer
    cursorManager.setEndOfContenteditable = function(contentEditableElement)
    {

        while(getLastChildElement(contentEditableElement) &&
            canContainText(getLastChildElement(contentEditableElement))) {
            contentEditableElement = getLastChildElement(contentEditableElement);
        }

        var range,selection;
        if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
        {
            range = document.createRange();//Create a range (a range is a like the selection but invisible)
            range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
            range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
            selection = window.getSelection();//get the selection object (allows you to change selection)
            selection.removeAllRanges();//remove any selections already made
            selection.addRange(range);//make the range you have just created the visible selection
        }
        else if(document.selection)//IE 8 and lower
        {
            range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
            range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
            range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
            range.select();//Select the range (make it the visible selection
        }
    }

}( window.cursorManager = window.cursorManager || {}));