function load_context_menu() {
    // Document tab context menu
    $.contextMenu({
        selector: ".document_context",
        items: {
            new: {name: "New Document <kbd class='shortcut'>CTRL+ALT+D</kbd>", icon: "new", callback: function () {
                DocumentEventListener.createMouseClick();
            }},
            del: {name: "Delete Document", icon: "del", callback: function () {
                DocumentEventListener.deleteMouseClick($(this).data('document'));
            }},
            edit: {name: "Edit Document Properties", icon: "pencil", callback: function () {
                DocumentEventListener.editMouseClick($(this).data('document'));
            }},
            separator1: "-----",
            permissions: {name: "Document Security", icon: "shield", callback: function () {
                DocumentEventListener.setPermissionsMouseClick($(this).data('document'));
            }},
            share_url: {name: "Share URL", icon: "world", callback: function (key, opt) {
                DocumentShareURLModal.show($(this).data('document'));
            }},
            publish: {name: "Publish Document", className:"text_pub_context"
                    , icon: "world", callback: function (key, opt) {
                DocumentPublishModal.show($(this).data('document'), function () {});
            }},
            summary_publish: {name: "Publish Summary", className:"sum_pub_context hidden",
                icon: "world", callback: function (key, opt) {
                    SummaryPublishModal.show($(this).data('document'), function () {});
            }},
            presentation_publish: {name: "Publish Presentation", className:"pre_pub_context hidden",
                    icon: "world", callback: function (key, opt) {
                PresentationPublishModal.show($(this).data('document'), function () {});
            }}
        }
    });

    function get_concept(context) {
        var concept = context.data('concept');
        if (!concept)
            concept = Concept.get(context.attr('id').substring(0, 32));
        return concept;
    }

    var concept_context_items = {
        new: {name: "New Concept <kbd class='shortcut'>ENTER</kbd>", icon: "new", callback: function (key, opt) {
            ConceptEventListener.createContextMenu(get_concept($(this)));
        }},
        del: {name: "Delete Concept <kbd class='shortcut'>DELETE</kbd>", icon: "del", callback: function (key, opt) {
            ConceptEventListener.deleteContextMenu(get_concept($(this)));
        }},
        separator1: "-----",
        expand: {name: "Expand Children <kbd class='shortcut'>RIGHT</kbd>", icon: "expand-children", callback: function (key, opt) {
            ConceptEventListener.expandContextMenu(get_concept($(this)));
        }},
        collapse: {name: "Collapse Children <kbd class='shortcut'>LEFT</kbd>", icon: "collapse-children", callback: function (key, opt) {
            ConceptEventListener.collapseContextMenu(get_concept($(this)));
        }},
        separator2: "-----",
        new_phrasing: {name: "New Phrasing <kbd class='shortcut'>SHIFT+ENTER</kbd>", icon: "new", callback: function (key, opt) {
            PhrasingEventListener.createContextMenu(get_concept($(this)));
        }},
        edit_phrasing: {name: "Edit Phrasing <kbd class='shortcut'>ESC</kbd>", icon: "pencil", callback: function (key, opt) {
            PhrasingEventListener.editContextMenu(get_concept($(this)));
        }},
        separator3: "-----",
        comment: {name: "Add Comment <kbd class='shortcut'>CTRL+ALT+C</kbd>", icon: "comment", callback: function (key, opt) {
            ConceptEventListener.activateContextMenu(get_concept($(this)));
            Annotation.newFromCurrentConcept();
        }},
        separator4: "-----",
        header: {name: "Toggle Heading <kbd class='shortcut'>CTRL+H</kbd>", icon: "header", callback: function (key, opt) {
            AttributeEventListener.toggleHeaderContextMenu(get_concept($(this)));
        }},
        olist: {name: "Toggle Ordered List <kbd class='shortcut'>CTRL+O</kbd>", icon: "ordered-list", callback: function (key, opt) {
            AttributeEventListener.toggleOrderedListConceptMenu(get_concept($(this)));
        }},
        ulist: {name: "Toggle Bullet List <kbd class='shortcut'>CTRL+U</kbd>", icon: "unordered-list", callback: function (key, opt) {
            AttributeEventListener.toggleUnorderedListContextMenu(get_concept($(this)));
        }},
        separator5: "-----",
        permissions: {name: "Concept Security", icon: "shield", callback: function (key, opt) {
            ConceptEventListener.setPermissionsMouseClick(get_concept($(this)));
        }},
        share_url: {name: "Share URL", icon: "world", callback: function (key, opt) {
            ConceptShareURLModal.show(get_concept($(this)));
        }}
    };

    var linked_concept_context_items = $.extend({}, concept_context_items);
    linked_concept_context_items['follow_link'] = {name: "Goto Linked Concept", icon: "external-link",
        callback: function (key, opt) {
            ConceptEventListener.openLinkConcept(get_concept($(this)));
        }
    };

    // TVs context menu
    $.contextMenu({
        selector: ".node_context",
        items: concept_context_items
    });

    // DVs context menu1
    $.contextMenu({
        selector: ".concept_context",
        items: concept_context_items
    });

    // DVs context menu2
    $.contextMenu({
        selector: ".concept_link",
        items: linked_concept_context_items
    });

    // DVs context menu2
    $.contextMenu({
        selector: ".presentation_span",
        items: {
            new: {name: "New Phrasing", icon: "new", callback: function () {
                PhrasingEventListener.createPresentationSummernote($(this));
            }},
            edit: {name: "Edit Phrasing", icon: "edit", callback: function () {
                PhrasingEventListener.editPresentationSummernote($(this));
            }},
            sel_phr_up: {name: "Change Selected", icon: "arrow-up", callback: function () {
                SelectedPhrasingEventListener.changeShortcutUp();
            }},
            sel_phr_down: {name: "Change Selected", icon: "arrow-down", callback: function () {
                SelectedPhrasingEventListener.changeShortcutDown();
            }}
        }
    });
}

