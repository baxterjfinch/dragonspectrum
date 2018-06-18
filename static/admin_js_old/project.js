function get_orgnazition_projects() {
    var org = get_current_organization();
    var projects;
    comms.get({
        async: false,
        url: ARTIFACT_URLS.project,
        data: {
            organization_id: org.id,
            organization_projects: "all",
            type: 'json'
        },
        success: function (data) {
            projects = data;
        }
    });
    org["projects"] = projects;
    return projects;

}

function insert_project_toolbar() {
    var user_toolbar = (' \
<div class="btn-group">\
<button type="button" class="btn btn-xs" onclick=""><i class="fa fa-plus"></i></button>\
<button type="button" class="btn btn-xs" onclick=""><i class="fa fa-minus"></i></button>\
<button type="button" class="btn btn-xs" onclick=""><i class="fa fa-info-circle"></i></button>\
</div>\
        ');

    $("#project_toolbar").html(user_toolbar);

}

function fill_project_table() {
    $("#project_table").html('');
    var projects = get_orgnazition_projects();
    var table = ('\
<thead>\
    <tr>\
        <th>Title</th>\
        <th>Owner</th>\
        <th>Creation Date</th>\
    </tr>\
</thead>\
<tbody>\
    ');

    for (var i = 0; i < projects.length; i++) {
        table = table.concat('\
        <tr>\
            <td>' + projects[i].title + '</td>\
            <td>' + projects[i].owner + '</td>\
            <td>' + projects[i].created_ts + '</td>\
        </tr>\
        ');

    }

    table = table.concat('</tbody></table>');

    $("#project_table").html(table);

    $('#project_table').on('click', 'tbody tr', function (event) {
        $(this).addClass('highlight').siblings().removeClass('highlight');

    });

}