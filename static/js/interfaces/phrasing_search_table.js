function PhrasingTable () {}

PhrasingTable.phrasing_table_body = $('#search_phrasing_table_body');
PhrasingTable.search_message = $('#searching-message');
PhrasingTable.no_resaults_message = $('#no-results-message');

PhrasingTable.goto_btn_classes = 'btn btn-default btn-xs goto-btn search-goto-btn';
PhrasingTable.goto_btn_deactive_html = '<i class="fa fa-arrow-circle-right"></i>';
PhrasingTable.goto_btn_active_html = '<i class="fa fa-spinner fa-spin"></i>';

PhrasingTable.goto_btn_column_classes = 'project-search-th-goto';
PhrasingTable.text_column_classes = '';

PhrasingTable.rows = [];
PhrasingTable.max_text_length = 250;

PhrasingTable.loadTables = function (concepts) {
    PhrasingTable.clearPhrasingTable();

    for (var i = 0; i < concepts.length; i++)
        PhrasingTable.addToTable(concepts[i]);
};

PhrasingTable.clearPhrasingTable = function () {
    PhrasingTable.phrasing_table_body.empty();
};

PhrasingTable.buildTableRow = function (table, phrasing) {
    var phrasing_row = new PhrasingTableRow();
    var tr = $('<tr></tr>');
    phrasing_row.setTableRow(tr);

    var td = $('<td></td>');
    var goto_btn = $('<button></button>');
    goto_btn.addClass(PhrasingTable.goto_btn_classes);
    goto_btn.attr('title', 'Goto Phrasing');
    goto_btn.data('id', phrasing.con_id);
    goto_btn.append(PhrasingTable.goto_btn_deactive_html);
    goto_btn.click(function (e) {
        var btn = $(e.currentTarget);
        btn.html(PhrasingTable.goto_btn_active_html);
        Concept.activateConceptById(btn.data('id'), null, function () {
            btn.html(PhrasingTable.goto_btn_deactive_html);
        });
    });
    td.addClass(PhrasingTable.goto_btn_column_classes);
    td.append(goto_btn);
    tr.append(td);
    phrasing_row.setGotoColumn(td);

    td = $('<td></td>');
    var text = $('<span></span>');
    if (phrasing.phr_text.length > PhrasingTable.max_text_length)
        text.append(phrasing.phr_text.substring(0, PhrasingTable.max_text_length) + '...');
    else
        text.append(phrasing.phr_text);
    td.attr('title', phrasing.phr_text);
    td.addClass(PhrasingTable.text_column_classes);
    td.append(text);
    tr.append(td);
    phrasing_row.setTextColumn(td);

    PhrasingTable.rows.push(phrasing_row);

    return phrasing_row;
};

PhrasingTable.addToTable = function (concept) {
    var row = PhrasingTable.buildTableRow(PhrasingTable.USER, concept);
    PhrasingTable.phrasing_table_body.append(row.getTableRow());
};

PhrasingTable.showSearchingMessage = function () {
    PhrasingTable.search_message.removeClass('hidden');
};

PhrasingTable.hideSearchingMessage = function () {
    PhrasingTable.search_message.addClass('hidden');
};

PhrasingTable.showNoResultsMessage = function () {
    PhrasingTable.no_resaults_message.removeClass('hidden');
};

PhrasingTable.hideNoResultsMessage = function () {
    PhrasingTable.no_resaults_message.addClass('hidden');
};

function PhrasingTableRow () {
    this.tr = null;
    this.goto_td = null;
    this.text_td = null;
}

PhrasingTableRow.prototype.setTableRow = function (tr) {
    this.tr = tr;
};

PhrasingTableRow.prototype.getTableRow = function () {
    return this.tr;
};

PhrasingTableRow.prototype.setGotoColumn = function (goto) {
    this.goto_td = goto;
};

PhrasingTableRow.prototype.getGotoColumn = function () {
    return this.goto_td;
};

PhrasingTableRow.prototype.setTextColumn = function (text) {
    this.text_td = text;
};

PhrasingTableRow.prototype.getTextColumn = function () {
    return this.text_td;
};

PhrasingTableRow.prototype.hide = function () {
    this.tr.addClass('hidden');
};

PhrasingTableRow.prototype.show = function () {
    this.tr.removeClass('hidden');
};