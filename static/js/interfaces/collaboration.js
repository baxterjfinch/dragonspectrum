function CollaborationTable () {}

CollaborationTable.table_body = $('#col_user_tb_body');
CollaborationTable._count_badge = $('#coll_count_badge');

CollaborationTable.initialize = function () {
    var user;
    comms.get({
        url: ARTIFACT_URLS.channel_users,
        success: function (users) {
            for (var i = 0; i < users.length; i++) {
                if (users[i].channel_id == Channel.channel_id)
                    continue;
                user = new CollaborationUser();
                user.initialize(users[i]);
                var concept = Concept.get(users[i].concept);
                var document = Document.get(users[i].document);
                user.setDocument(document);
                if (concept) {
                    user.setConcept(concept);
                    user.activateConcept();
                }
                CollaborationTable.addUser(user, true);
            }
        }
    });
};

CollaborationTable.addUser = function (user, notify) {
    var row;
    var col1;
    var col2;
    var teleport_btn;

    row = $('<tr></tr>');
    col1 = $('<td></td>');
    col2 = $('<td></td>');
    teleport_btn = $('<button></button>');
    teleport_btn.addClass('teleport btn btn-xs btn-default');
    teleport_btn.html('<i class="fa fa-rocket"></i>');
    teleport_btn.attr('data-toggle', 'tooltip');
    teleport_btn.attr('title', 'Teleport to User Location');
    teleport_btn.data('user', user);
    teleport_btn.click(function () {
        teleport_btn.html('<i class="fa fa-spinner fa-spin"></i>');
        if (Document.getCurrent() != user.getDocument())
            DocumentEventListener.activate(user.getDocument());
        Concept.activateConceptById(user.getConceptId(), null, function () {
            teleport_btn.html('<i class="fa fa-rocket"></i>');
        });
    });

    var bg_color = user.getColor();

    if (user.getDocument() != Document.getCurrent()) {
        bg_color = '#ffffff';
        row.css('color', '#aaaaaa');
    }

    row.css('background-color', bg_color);
    row.addClass('pvs-collab-row');

    col1.append('<i class="fa fa-user"></i> ' + user.getDisplayName());
    col2.addClass('pvs-collab-action-buttons');

    col2.append(teleport_btn);
    user.setTableRow(row);
    CollaborationTable.table_body.append(row.append(col1).append(col2));

    CollaborationTable.updateBadge();

    if (notify) {
        play_audio('selectsound');
        flash('#coll_count_badge', user.getColor(), '#999999', '5000');
        animate('#coll_count_badge', 'rubberBand');
    }
};

CollaborationTable.validUsers = function (channel_ids) {
    var remove_users = [];
    var users = CollaborationUser.getAll();

    for (var i = 0; i < users.length; i++) {
        if (channel_ids.indexOf(users[i].channel_id()) < 0)
            remove_users.push(users[i])
    }

    for (i = 0; i < remove_users.length; i++) {
        CollaborationTable.removeUser(remove_users[i]);
    }

    CollaborationTable.updateBadge();
};

CollaborationTable.removeUser = function (user) {
    if (!user)
        return;

    var table_row = user.getTableRow();
    if (table_row)
        table_row.remove();
    CollaborationUser.remove(user);
    user.deactivateConcept();
    CollaborationTable.updateBadge();
    play_audio('user-interface-generic');
    animate('#coll_count_badge', 'rubberBand');
};

CollaborationTable.updateBadge = function () {
    var count = CollaborationUser.getAll().length;
    if (count > 0) {
        CollaborationTable._count_badge.html(count).show();
    } else {
        CollaborationTable._count_badge.html(count).hide();
    }
};

CollaborationUser.get_by_concept = function (concept) {
    return CollaborationUser.users_by_concept_id[concept.getId()];

};