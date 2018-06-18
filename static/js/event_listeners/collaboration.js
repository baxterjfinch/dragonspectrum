function CollaborationEventListener () {}

CollaborationEventListener.ACTIONS = {
    //# Project
    pro_perm_add: {
        name: '',
        description: '',
        callback: ProjectEventListener.addPermCollab
    },
    pro_perm_rmv: {
        name: '',
        description: '',
        callback: ProjectEventListener.removePermCollab
    },
    pro_grp_rmv: {
        name: '',
        description: '',
        callback: ProjectEventListener.removeGroupCollab
    },
    pro_new: {
        // Not needed
    },
    pro_del: {
        name: '',
        description: '',
        callback: ProjectEventListener.deleteCollab
    },
    pro_title: {
        name: '',
        description: '',
        callback: ProjectEventListener.renameCollab
    },
    pro_attr_add: {
        name: '',
        description: '',
        callback: AttributeEventListener.addCollab
    },
    pro_up_vote: {
        name: '',
        description: '',
        callback: ProjectEventListener.upvoteCollab
    },
    pro_down_vote: {
        name: '',
        description: '',
        callback: ProjectEventListener.downvoteCollab
    },

    // Document
    doc_new: {
        name: '',
        description: '',
        callback: DocumentEventListener.createCollab
    },
    doc_del: {
        name: '',
        description: '',
        callback: DocumentEventListener.deleteCollab
    },
    doc_perm_add: {
        name: '',
        description: '',
        callback: DocumentEventListener.addPermCollab
    },
    doc_perm_rmv: {
        name: '',
        description: '',
        callback: DocumentEventListener.removePermCollab
    },
    doc_grp_rmv: {
        name: '',
        description: '',
        callback: DocumentEventListener.removeGroupCollab
    },
    doc_edit: {
        name: '',
        description: '',
        callback: DocumentEventListener.editMouseCollab
    },
    doc_act: {
        name: '',
        description: '',
        callback: DocumentEventListener.activateCollab
    },
    doc_published: {
        name: '',
        description: '',
        callback: DocumentEventListener.publishCollab
    },

    // Concept
    con_act: {
        name: '',
        description: '',
        callback: ConceptEventListener.activeCollab
    },
    con_new: {
        name: '',
        description: '',
        callback: ConceptEventListener.createCollab
    },
    con_del: {
        name: '',
        description: '',
        callback: ConceptEventListener.deleteCollab
    },
    con_mov: {
        name: '',
        description: '',
        callback: ConceptEventListener.moveCollab
    },
    con_hid: {
        name: '',
        description: '',
        callback: CrawlcontextEventListener.hideCollab
    },
    con_shw: {
        name: '',
        description: '',
        callback: CrawlcontextEventListener.showCollab
    },
    con_lnk: {
        name: '',
        description: '',
        callback: ConceptEventListener.createLinkCollab
    },
    con_attr_add: {
        name: '',
        description: '',
        callback: AttributeEventListener.addCollab
    },
    con_perm_add: {
        name: '',
        description: '',
        callback: ConceptEventListener.addPermCollab
    },
    con_perm_rmv: {
        name: '',
        description: '',
        callback: ConceptEventListener.removePermCollab
    },
    con_grp_rmv: {
        name: '',
        description: '',
        callback: ConceptEventListener.removeGroupCollab
    },

    // Phrasing
    phr_new: {
        name: '',
        description: '',
        callback: PhrasingEventListener.createCollab
    },
    phr_del: {
        name: '',
        description: '',
        callback: PhrasingEventListener.deleteCollab
    },
    phr_edt: {
        name: '',
        description: '',
        callback: PhrasingEventListener.editCollab
    },
    phr_chg: {
        name: '',
        description: '',
        callback: SelectedPhrasingEventListener.changeCollab
    },
    phr_perm_add: {
        name: '',
        description: '',
        callback: PhrasingEventListener.addPermCollab
    },
    phr_perm_rmv: {
        name: '',
        description: '',
        callback: PhrasingEventListener.removePermCollab
    },
    phr_grp_rmv: {
        name: '',
        description: '',
        callback: PhrasingEventListener.removeGroupCollab
    },

    // Annotation
    anno_new: {
        name: '',
        description: '',
        callback: Annotation.col_new_ann
    },
    anno_del: {
        name: '',
        description: '',
        callback: Annotation.col_del
    },
    anno_rply: {
        name: '',
        description: '',
        callback: Annotation.col_new_comment
    },

    // Chat
    doc_chat: {
        name: '',
        description: '',
        callback: DocumentChat.collabMessage
    }
};

CollaborationEventListener.event = function (message) {
    var user = CollaborationUser.get(message.user.client_id);
    if (!user) {
        if (message.user.client_id == '') {
            console.warn('Received collab message from user with no client_id');
            return;
        }
        user = new CollaborationUser();
        user.initialize(message.user);
        CollaborationTable.addUser(user);
    }

    console.debug('Collab Event, User: %O', user);
    if (message.transaction)
        var action = CollaborationEventListener.ACTIONS[message.transaction.action];
    else if (message.chat)
        action = CollaborationEventListener.ACTIONS[message.chat.type];
    action.callback(user, message);
};