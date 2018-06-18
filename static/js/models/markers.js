/** @class
 * Annotation Base Class
 *
 * @property {string] tr - Annotation id
 * @property {string] tr_comment - Annotation id
 * @property {string] concept_id - Annotation id
 * @property {string] concept - Annotation id
 * @property {string] path - Annotation id
 * @property {string] document_id - Annotation id
 * @property {string] path - Annotation id
 * @property {string] comments - Annotation id
 * @property {string] tableBody - Annotation id
 * @property {string] is_active - Annotation id
 * @property {string] isHighLighted - Annotation id
 * @property {string] isNew - Annotation id
 * @property {string] isHidden - Annotation id
 */
function Annotation() {
    Artifact.call(this);
    this.tr = $('<tr></tr>');
    this.tr_comment = null;
    this.concept_id = null;
    this.concept = null;
    this.path = [];
    this.document = null;
    this.comments = null;
    this.tableBody = [];
    this.is_new = false;
}

Annotation.name = 'annotation';
Annotation.prototype = Object.create(Artifact.prototype);
Annotation.prototype.constructor = Annotation;

Annotation.prototype.initAnnotation = function (anno, concept) {
    if (anno)
        this.initArtifact(anno);
    var self = this;
    if (!anno) {
        this.isNew = true;
        anno = {
            comments: [{
                username: get_user().username,
                comment: Annotation.new_comment
            }],
            id: 'new',
            modified_timestamp: new Date().getTime(),
            document: Document.getCurrent().getId()
        };
        if (concept)
            anno.path = concept.getPathToRoot();
    }

    this.document = Document.get(anno.document);
    this.path = anno.path;

    if (concept) {
        this.concept = concept;
        concept.addAnnotation(this);
        this.concept_id = concept.getRequestId();
    } else {
        this.concept_id = anno.concept;
    }

    this.comments = anno.comments;

    var tr;
    var buttons_td;
    var goto_btn;
    var username;
    var comment;

    this.tr.addClass(Annotation.anno_table_tr_classes);
    this.tr.data('anno', this);

    buttons_td = $('<td></td>');
    buttons_td.addClass(Annotation.buttons_td_classes);
    this.tr.append(buttons_td);

    goto_btn = $('<button></button>');
    goto_btn.addClass(Annotation.goto_btn_classes);
    goto_btn.attr('title', Annotation.goto_btn_title);
    goto_btn.append(Annotation.goto_btn_text);
    goto_btn.click(function () {
        function goto_concept_callback() {
            Concept.activateConceptById(self.concept_id, null, function () {
                goto_btn.html(Annotation.goto_btn_text);
            });
        }
        goto_btn.html('<i class="' + Annotation.goto_btn_spinner_classes + '"></i>');

        if (self.concept) {
            ConceptEventListener.activeMouseClick(self.concept);
            goto_btn.html(Annotation.goto_btn_text);
        } else {
            goto_concept_callback();
        }
    });
    buttons_td.append(goto_btn);

    username = $('<td></td>');
    username.addClass(Annotation.username_anno_table_td);
    username.append(anno.comments[0].username);
    this.tr.append(username);

    this.tr_comment = $('<td></td>');
    this.tr_comment.addClass(Annotation.comment_anno_table_td);
    this.tr_comment.append(anno.comments[0].comment);
    this.tr.append(this.tr_comment);

    this.tr_delete = $('<i></i>');
    this.tr_delete.addClass(Annotation.delete_btn_classes);
    this.tr_delete.attr('title', Annotation.delete_btn_title);
    this.tr_delete.click(Annotation.deleteAnnotationEventHanlder);
    this.tr.append(this.tr_delete);

    var c = Annotation.getByConceptId(this.concept_id);
    if (c) {
        if (c.length > 0)
            c[0].tr.after(this.tr);
        else
            Annotation.anno_table.append(this.tr);
    } else {
        Annotation.anno_table.append(this.tr);
    }

    this.tr.click(function () {
        if (Annotation.current_anno)
            Annotation.current_anno.deactivate();
        if (self.concept)
            self.concept.activateAnnotations(false);
        self.activate();
    });

    for (var i = 0; i < anno.comments.length; i++) {
        tr = $('<tr></tr>');
        tr.addClass(Annotation.reply_table_tr_classes);

        username = $('<td></td>');
        username.addClass(Annotation.username_reply_table_tb);
        username.append(anno.comments[i].username);
        tr.append(username);

        comment = $('<td></td>');
        comment.addClass(Annotation.comment_reply_table_tb);
        comment.append(anno.comments[i].comment);
        tr.append(comment);
        this.tableBody.push(tr);
    }

    Annotation.anno_list.push(this);
    if (!this.is_new) {
        Annotation.anno_dict_by_id[this.id] = this;
        Annotation.rebuildParentDictionary();
    }
    var con_annos = Annotation.getByConceptId(this.concept_id);
    if (con_annos) {
        var add = true;
        for (i = 0 ; i < con_annos.length; i++) {
            if (con_annos[i].id == this.id) {
                add = false;
                break;
            }
        }
        if (add)
            con_annos.push(this);
    } else {
        Annotation.anno_dict_by_con_id[this.concept_id] = [this];
    }

    Annotation.anno_dict_by_con_id[this.concept_id].sort(function (a, b) {
        return b.modified_ts - a.modified_ts;
    });

    if (!this.document || this.document.getId() != Document.getCurrent().getId())
        this.hide();

//        Annotation.rebuildParentDictionary();
    Project.renderAll();

    return this;
};

/********* Annotation Static Variables Start **************/
Annotation.anno_list = [];
Annotation.anno_dict_by_id = {};
Annotation.anno_dict_by_con_id = {};
Annotation.anno_parent_dict_by_con_id = {};
Annotation.current_anno = null;
Annotation.current_anno_con = null;
Annotation.new_anno = null;
Annotation.enableInput = true;
Annotation.enableNewAnnoBtn = true;

// Annotation Styling
Annotation.anno_table_tr_classes = 'anno_tr';
Annotation.buttons_td_classes = 'anno-buttons anno-tbl-col';
Annotation.goto_btn_classes = 'btn btn-default btn-xs goto-btn';
Annotation.goto_btn_spinner_classes = 'fa fa-spinner fa-spin';
Annotation.delete_btn_classes = 'fa fa-times-circle anno-delete-item';
Annotation.delete_btn_title = 'Delete Comment';
Annotation.username_anno_table_td = 'anno-table-username anno-tbl-col';
Annotation.comment_anno_table_td = 'anno-table-comment anno-tbl-col';
Annotation.reply_table_tr_classes = 'anno_tr';
Annotation.username_reply_table_tb = 'anno-reply-table-username';
Annotation.comment_reply_table_tb = 'anno-reply-table-comment';
Annotation.active_classes = 'activated-anno-tr';
Annotation.highlight_classes = 'highlight-anno-tr';
Annotation.anno_icon_classes = 'fa fa-comment anno-icon';
Annotation.anno_icon_multi_classes = 'fa fa-comments anno-icon';
Annotation.anno_parent_icon_classes = 'fa fa-comment anno-parent-icon';
Annotation.anno_parent_multi_icon_classes = 'fa fa-comments anno-parent-icon';

// Annotation Strings
Annotation.new_comment = 'New Comment';
Annotation.goto_btn_text = '<i class="fa fa-arrow-circle-right"></i>';
Annotation.goto_btn_title = 'Goto Concept';
Annotation.comment_send_btn_reply_html = '<i class="fa fa-reply"></i>';
Annotation.comment_send_btn_first_html = '<i class="fa fa-plus"></i>';
Annotation.comment_input_first_placementholder = 'Enter Comment';
Annotation.comment_input_reply_placementholder = 'Enter Reply';

// Annotation DOM objects
Annotation.anno_panel = $('#anno_panel');
Annotation.anno_table = $('#pvs_annos_table_body');
Annotation.comment_table = $('#pvs_comments_table_body');
Annotation.comment_input = $('#comment_input');
Annotation.del_cur_btn = $('#del_cur_anno_btn');
Annotation.create_new_btn = $('#crt_new_anno_btn');
Annotation.dvs_document = $('#document_tab_content');
Annotation.comment_send_btn = $('#comment_input_send');
Annotation.thread_scroll = $('#comment-view');
/********* Annotation Static Variables End ****************/

/********* Annotation Instance Functions Start ************/
Annotation.prototype.setConcept = function (concept) {
    this.concept = concept;
};

Annotation.prototype.getModifiedTs = function () {
    return this.modified_ts;
};

Annotation.prototype.hide = function () {
    this.tr.hide();
};

Annotation.prototype.show = function () {
    this.tr.show();
};

Annotation.prototype.activate = function () {
    this.tr.addClass(Annotation.active_classes);
    if (this.isHighLighted)
        this.tr.removeClass(Annotation.highlight_classes);
    this.isActive = true;

    Annotation.current_anno = this;
    if (Annotation.current_anno_con && Annotation.current_anno_con.getId() != this.concept_id)
        Annotation.current_anno_con.deactivateAnnotations();
    Annotation.current_anno_con = this.concept;

    Annotation.comment_table.append(this.tableBody);

    // scroll comments to this
    Annotation.anno_panel.scrollTop(this.tr.position().top - 20);
    Annotation.disableReplyInput(false);
};

Annotation.prototype.highlight = function () {
    this.tr.addClass(Annotation.highlight_classes);
    this.isHighLighted = true;
};

Annotation.prototype.deactivate = function () {
    Annotation.comment_table.children().detach();
    this.tr.removeClass(Annotation.active_classes);
    if (this.isHighLighted)
        this.tr.addClass(Annotation.highlight_classes);
    this.isActive = false;
};

Annotation.prototype.unhighlight = function () {
    this.tr.removeClass(Annotation.highlight_classes);
    this.isHighLighted = false;
};

Annotation.prototype.reactivate = function () {
    this.deactivate();
    this.activate();
};

Annotation.prototype.addComment = function (comment) {
    if (this.isNew) {
        this.comments = [];
        this.tr_comment.empty();
        this.tr_comment.append(comment.comment);
        this.tableBody = [];
        this.isNew = false;
        Annotation.new_anno = null;
        Annotation.comment_send_btn.html(Annotation.comment_send_btn_reply_html);
        Annotation.comment_input.attr('placeholder', Annotation.comment_input_reply_placementholder);
        Annotation.rebuildParentDictionary();
    }
    this.comments.push(comment);

    var tr = $('<tr></tr>');
    tr.addClass(Annotation.reply_table_tr_classes);

    var username = $('<td></td>');
    username.addClass(Annotation.username_reply_table_tb);
    username.append(comment.username);
    tr.append(username);

    var comt = $('<td></td>');
    comt.addClass(Annotation.comment_reply_table_tb);
    comt.append(comment.comment);
    tr.append(comt);
    this.tableBody.push(tr);

    if (this.isActive)
        this.reactivate();

    this.modified_ts = new Date().getTime();

    Annotation.order();
    Project.renderAll();
};

Annotation.prototype.saveComment = function (comment_text) {
    var comment = {
        username: get_user().username,
        comment: comment_text
    };

    this.addComment(comment);
    Annotation.clearAndBlurInput();

    var self = this;
    var ajaxRequest = {
        url: ARTIFACT_URLS.annotation + this.id,
        data: {
            comment: comment.comment,
            concept: this.concept_id,
            document: this.document.getId(),
            token_id: get_channel_token_id()
        },
        success: function (data) {
            self.id = data.id;
            Annotation.anno_dict_by_id[self.id] = self;
        }
    };

    if (this.comments.length == 1)
        comms.queue(ajaxRequest, comms.put, false);
    else
        comms.queue(ajaxRequest, comms.post, false);

    return this;
};

Annotation.prototype.remove = function () {
    this.tr.remove();
    delete Annotation.anno_dict_by_id[this.id];
    var index = Annotation.anno_list.indexOf(this);
    if (index >= 0)
        Annotation.anno_list.splice(index, 1);

    var annos = Annotation.getByConceptId(this.concept_id);
    if (annos) {
        for (var i = 0; i < annos.length; i++) {
            if (this.id == annos[i].id) {
                annos.splice(i, 1);
                break;
            }
        }
    }

    if (this.isActive) {
        Annotation.comment_table.children().detach();
    }

    if (this.concept) {
        var con_annos = this.concept.getAnnotations();
        index = con_annos.indexOf(this);
        if (index >= 0)
            con_annos.splice(index, 1);
    }
    Annotation.rebuildParentDictionary();
    Project.renderAll();
};

Annotation.prototype.del = function () {
    this.remove();

    if (this.isNew)
        return;
    comms.delete({url: ARTIFACT_URLS.annotation + this.id});
};
/********* Annotation Instance Functions End **************/

/********* Annotation Static Functions Start **************/
Annotation.initPvs = function () {
    Annotation.comment_send_btn.click(Annotation.saveReplyInput);

    Annotation.comment_input.focus(function () {
        Shortcut.set('annotation');
    });

    Annotation.comment_input.blur(function () {
        Shortcut.set('dvs');
    });

    Annotation.create_new_btn.click(Annotation.newFromCurrentConcept);
    Annotation.comment_input.attr('placeholder', Annotation.comment_input_reply_placementholder);
    Annotation.disableReplyInput(true);
};

Annotation.get = function (id) {
    if (Annotation.anno_dict_by_id.hasOwnProperty(id))
    return Annotation.anno_dict_by_id[id];
    return null;
};

Annotation.disableNewButton = function (flag) {
    if (flag) {
        Annotation.create_new_btn.addClass('disabled');
    } else {
        Annotation.create_new_btn.removeClass('disabled');
    }
};

Annotation.disableReplyInput = function (flag) {
    if (flag) {
        Annotation.comment_input.prop('disabled', true);
        Annotation.comment_send_btn.prop('disabled', true);
    } else if (Annotation.enableInput) {
        Annotation.comment_input.prop('disabled', false);
        Annotation.comment_send_btn.prop('disabled', false);
    }
};

Annotation.disable = function (flag) {
    Annotation.disableNewButton(flag);
    Annotation.disableReplyInput(flag);
};

Annotation.checkDocumentPermission = function (doc, fetch) {
    if (!doc)
        doc = Project.getCurrentDocument();
    if (!fetch)
        fetch = false;

    if (!doc.hasPermissionAnnotationWrite()) {
        var annos = Annotation.getByDocument(doc.getId());
        for (var i = 0; i < annos.length; i++)
            annos[i].remove();
        if (doc.id == Document.getCurrent().getId())
            Annotation.disable(true);
    } else if (fetch && !Annotation.documentHasAnnotations(doc.getId())) {
        Annotation.fetchFromServer(doc.getId());
    }

    if (doc.getId() == Document.getCurrent().getId()) {
        if (doc.hasPermissionAnnotationWrite()) {
            Annotation.enableInput = true;
            Annotation.enableNewAnnoBtn = true;
            Annotation.disableNewButton(false);
        } else {
            Annotation.enableInput = false;
            Annotation.enableNewAnnoBtn = false;
            Annotation.disableNewButton(true);
        }
    }
};

Annotation.getByConceptId = function (id) {
    if (Annotation.anno_dict_by_con_id.hasOwnProperty(id))
            return Annotation.anno_dict_by_con_id[id];
        return null;
};

Annotation.changeDocument = function (doc) {
    Annotation.comment_table.children().detach();
    for (var i = 0; i < Annotation.anno_list.length; i++) {
        if (Annotation.anno_list[i].document == doc)
            Annotation.anno_list[i].show();
        else
            Annotation.anno_list[i].hide();
    }
    Annotation.checkDocumentPermission(doc);
};

Annotation.getByDocument = function (doc) {
    var annos = [];
    for (var i = 0; i < Annotation.anno_list.length; i++) {
        if (Annotation.anno_list[i].document == doc.getId())
            annos.push(Annotation.anno_list[i]);
    }
    return annos;
};

Annotation.documentHasAnnotations = function (doc) {
    for (var i = 0; i < Annotation.anno_list.length; i++) {
        if (Annotation.anno_list[i].document == doc.getId())
            return true;
    }
    return false;
};

Annotation.change_document = function (doc) {
    Annotation.comment_table.children().detach();
    for (var i = 0; i < Annotation.anno_list.length; i++) {
        if (Annotation.anno_list[i].document == doc.getId())
            Annotation.anno_list[i].show();
        else
            Annotation.anno_list[i].hide();
    }
    Annotation.checkDocumentPermission(doc);
    Annotation.disableReplyInput(true);
};

Annotation.clearReplyInput = function () {
    if (Annotation.comment_input.val() == '')
        Annotation.clearAndBlurInput();
    else
        Annotation.comment_input.val('');
};

Annotation.clearAndBlurInput = function () {
    Annotation.comment_input.val('');
    Annotation.comment_input.blur();
};

Annotation.saveReplyInput = function () {
    var comment = Annotation.comment_input.val().trim();
    if (comment == '' || Annotation.current_anno == null)
        return;

    Annotation.current_anno.saveComment(comment);

    // scroll thread to bottom
    var scrollbar = Annotation.thread_scroll;
    Annotation.thread_scroll.scrollTop(scrollbar.prop("scrollHeight"));
};

Annotation.newFromCurrentConcept = function () {
    if (!Annotation.enableNewAnnoBtn) {
        Notify.alert('You do not have permission to create a comment');
        return;
    }
    PVS.selectCommentTab();
    if (Annotation.new_anno)
        Annotation.new_anno.del();
    var con = Concept.getCurrent();
    var anno = new Annotation();
    Annotation.new_anno = anno;
    anno.initAnnotation(null, con);
    if (Annotation.current_anno)
        Annotation.current_anno.deactivate();
    Annotation.comment_send_btn.html(Annotation.comment_send_btn_first_html);
    Annotation.comment_input.attr('placeholder', Annotation.comment_input_first_placementholder);
    anno.activate();
    Annotation.comment_input.focus();
};

Annotation.deleteAnnotationEventHanlder = function (e) {
    var tr = $(e.currentTarget).parent();
    var anno = tr.data('anno');
    anno.del();
};

Annotation.joinToConcepts = function () {
    var cur_con_id = Concept.getCurrent();
    if (cur_con_id)
        cur_con_id = cur_con_id.getId();

    var cur_doc_id = Document.getCurrent().getId();

    for (var i = 0; i < Annotation.anno_list.length; i++) {
        var concept = Concept.get(Annotation.anno_list[i].concept_id);
        if (concept && Annotation.anno_list[i].concept == null) {
            var con_anns = concept.getAnnotations();
            if (con_anns)
                con_anns.push(Annotation.anno_list[i]);
            else
                con_anns = [Annotation.anno_list[i]];
            Annotation.anno_list[i].concept = concept;
            if (cur_con_id == concept.getId() &&
                    Annotation.anno_list[i].document == cur_doc_id) {
                Annotation.anno_list[i].activate();
            }
        }
    }
};

Annotation.fetchFromServer = function (doc) {
    var anno;
    var url = ARTIFACT_URLS.annotation + Project.getId();
    if (doc)
        url += '?doc=' + doc.getId();
    comms.get({
        type: 'GET',
        url: url,
        success: function (annos) {
            for (var i = 0; i < annos.length; i++) {
                if (!Annotation.get(annos[i].id)) {
                    anno = new Annotation();
                    anno.initAnnotation(annos[i]);
                }
                Annotation.joinToConcepts();
                Annotation.order();
                ConceptEventListener.reactivate();
            }
        }
    });
};

Annotation.order = function () {
    var list = [];
    var key, i, j;
    for (key in Annotation.anno_dict_by_con_id) {
        if (Annotation.anno_dict_by_con_id.hasOwnProperty(key) && Annotation.anno_dict_by_con_id[key].length != 0) {
            list.push(Annotation.anno_dict_by_con_id[key]);
        }
    }

    for (i = 0; i < list.length; i++) {
        list[i].sort(function (a, b) {
            return b.modified_ts - a.modified_ts;
        })
    }

    list.sort(function (a, b) {
            return b[0].modified_ts - a[0].modified_ts;
    });

    Annotation.anno_table.children().detach();
    for (i = 0; i < list.length; i++) {
        for (j = 0; j < list[i].length; j++) {
            Annotation.anno_table.append(list[i][j].tr);
        }
    }
};

Annotation.rebuildParentDictionary = function () {
    var depth;
    var i, j;
    var annos = Annotation.anno_list;
    Annotation.anno_parent_dict_by_con_id = {};
    for (j = 0; j < annos.length; j++) {
        depth = annos[j].path.length - 1;
        for (i = 0; i < annos[j].path.length - 1; i++) {
            if (Annotation.anno_parent_dict_by_con_id.hasOwnProperty(annos[j].path[i])) {
                Annotation.anno_parent_dict_by_con_id[annos[j].path[i]].push({anno: annos[j].id, depth: depth, document: annos[j].document});
            } else {
                Annotation.anno_parent_dict_by_con_id[annos[j].path[i]] = [
                    {anno: annos[j].id, depth: depth, document: annos[j].document}
                ];
            }
            depth--;
        }
    }
};

Annotation.conceptHasAnnotation = function (concept, doc) {
    var count = 0;
    if (Annotation.anno_dict_by_con_id.hasOwnProperty(concept.getId())) {
        if (doc) {
            var annos = Annotation.anno_dict_by_con_id[concept.getId()];
            for (var i = 0; i < annos.length; i++) {
                if (annos[i].document == doc)
                    count++;
            }
            return count;
        } else {
            return Annotation.anno_dict_by_con_id[concept.getId()].length;
        }
    }
    return count;
};

Annotation.conceptHasChildrenAnnotation = function (concept, doc) {
    if (Annotation.anno_parent_dict_by_con_id.hasOwnProperty(concept.getId())) {
        if (doc) {
            var annos = Annotation.anno_parent_dict_by_con_id[concept.getId()];
            var count = 0;
            for (var i = 0; i < annos.length; i++) {
                if (annos[i].document == doc)
                    count++;
            }
            return count;
        } else {
            return Annotation.anno_parent_dict_by_con_id[concept.getId()].length;
        }
    }
    return -1;
};
/********* Annotation Static Functions End ****************/

/********* Annotation Collaborations Callbacks Start ******/
Annotation.col_new_ann = function (user, message) {
    var anno_dict = message.transaction.action_data.annotation;
    var anno = new Annotation();

    var con = Concept.get(anno_dict.concept);
    if (con)
        anno.initAnnotation(anno_dict, con);
    else
        anno.initAnnotation(anno_dict, null);
    Annotation.rebuildParentDictionary();
    Annotation.order();
    Project.renderAll();
};

Annotation.col_new_comment = function (user, message) {
    message = message.transaction.action_data;
    var anno = Annotation.get(message.id);
    if (anno) {
        anno.addComment({username: user.getUserName(), comment: message.comment});
        Annotation.order();
    } else {
        console.error('could not find annotation');
    }
};

Annotation.col_del = function (user, message) {
    message = message.transaction.action_data;
    var anno = Annotation.get(message.id);
    if (anno)
        anno.remove();
    else
        console.error('could not find annotation');
    Annotation.rebuildParentDictionary();
    Annotation.order();
    Project.renderAll();
};

/********* Annotation Collaborations Callbacks End ********/