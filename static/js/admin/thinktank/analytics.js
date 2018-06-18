// AnalyticStat Lables
var ana_stat_labels = {
    total_pro_opn: 'Project Open',
    total_pro_import: 'Project Import',
    total_pro_search: 'Project Search',
    total_pro_soc_sha: 'Project Share to Social',

    total_doc_publish: 'Document Publish',
    total_sum_publish: 'Summary Publish',
    total_pres_publish: 'Presentation Publish',

    total_con_nav: 'Concept Navigation',
    total_con_exp: 'Concept Expand',
    total_con_col: 'Concept Collapse',
    total_con_new: 'Concept Create',
    total_con_mov: 'Concept Move',
    total_con_del: 'Concept Delete',
    total_con_lnk: 'Concept Linked',
    total_con_soc_sha: 'Concept Share to Social',

    total_con_perm: 'Concept Security Change',
    total_con_attr_cha: 'Concept Attribute Change',
    total_con_cc_f: 'Show Concept',
    total_con_cc_t: 'Hide Concept',
    total_con_phr_new: 'New Phrasing',

    total_con_phr_edit: 'Phrasing Edit',
    total_con_phr_del: 'Phrasing Delete',
    total_con_phr_cha: 'Set Selected Phrasing',

    total_con_med_vw: 'Media View',

    total_consumption: 'Total Consumption',
    total_production: 'Total Production',
    total: 'Total Activity'
};

function ana_stat_label_to_key(label) {
    for (var prop in ana_stat_labels) {
        if (ana_stat_labels.hasOwnProperty(prop)) {
            if (ana_stat_labels[prop] == label)
                return prop;
        }
    }
}


// AnalyticStat Color
var ana_stat_colors = [
    '#0b62a4', // 1
    '#7A92A3', // 2
    '#4da74d', // 3
    '#afd8f8', // 4
    '#edc240', // 5
    '#cb4b4b', // 6
    '#9440ed', // 7
    '#7f3f3f', // 8
    '#7f523f', // 9
    '#7f663f', // 10
    '#7f793f', // 11
    '#727f3f', // 12
    '#5f7f3f', // 13
    '#4c7f3f', // 14
    '#3f7f46', // 15
    '#3f7f59', // 16
    '#3f7f6c', // 17
    '#3f7f7f', // 18
    '#3f6c7f', // 19
    '#3f597f', // 20
    '#3f467f', // 21
    '#4c3f7f', // 22
    '#5f3f7f', // 23
    '#723f7f', // 24
    '#7f3f79', // 25
    '#7f3f65', // 26
    '#7f3f52', // 27
    '#7f3f51'  // 28
];


function generate_houly_total_analytis_data(analyticstat) {
    analyticstat = analyticstat.analyticstat;
    var data = [];
    for (var i = 0; i < analyticstat.length; i++) {
        data.push({
            time: analyticstat[i].start_time,
            total: analyticstat[i].total,
            total_consumption: analyticstat[i].total_consumption,
            total_production: analyticstat[i].total_production
        });
    }
    return data;
}

function generate_houlyl_analytis_data(analyticstat, keys) {
    analyticstat = analyticstat.analyticstat;
    var data = [];
    var anastat;
    for (var i = 0; i < analyticstat.length; i++) {
        anastat = {time: analyticstat[i].start_time};
        for (var j = 0; j < keys.length; j++) {
            anastat[keys[j]] = analyticstat[i][keys[j]];
        }
        data.push(anastat);
    }
    return data;
}

function render_total_analytics_chart() {
    var shta_data = generate_houly_total_analytis_data(_analytics_stat);
    initialize_site_total_analytics_chart(shta_data);
}

function render_analytics_chart() {
    var i;
    var sha_data_keys_vals = $('#site_hourly_select').select2('val');
    var sha_data_keys = [];
    for (i = 0; i < sha_data_keys_vals.length; i++)
        sha_data_keys.push(ana_stat_label_to_key(sha_data_keys_vals[i]));
    var sha_data_label = [];
    var sha_data_color = [];
    for (i = 0; i < sha_data_keys.length; i++) {
        sha_data_label.push(ana_stat_labels[sha_data_keys[i]]);
        sha_data_color.push(ana_stat_colors[i]);
    }
    var sha_data = {
        values: generate_houlyl_analytis_data(_analytics_stat, sha_data_keys),
        keys: sha_data_keys,
        key_labels: sha_data_label,
        key_colors: sha_data_color
    };
    initialize_site_analytics_chart(sha_data);
}

var _analytics_stat;
function render_all_analytic_charts() {
    function process_analytics_data() {
        render_total_analytics_chart();
        render_analytics_chart();
    }
    get_analytics_from_server(process_analytics_data);
}

function get_analytics_from_server(callback) {
    var url;
    if (tt_org)
        url = get_admin_url('analytics_' + _current_time_span, tt_org.id) + '?start_time=' + _current_date.getTime();
    else
        url = get_admin_url('analytics_' + _current_time_span, null) + '?start_time=' + _current_date.getTime();
    $.ajax({
        async: true,
        type: "GET",
        url: url,
        contentType: "application/json",
        error: function (jqXHR, textStatus, errorThrown) {
            $.smallBox({
                title: 'Error getting Analytics from server',
                content: jqXHR.status + ': ' + errorThrown + ': ' + jqXHR.getResponseHeader('reason'),
                color: '#A65858',
                iconSmall: "fa fa-thumbs-down bounce animated"
            });
        },
        success: function (data, textStatus, jqXHR) {
            _analytics_stat = data;
            if (callback)
                callback();
        }
    });
}

dateFormat.masks.flot_time = 'h:MM:ss TT';
function initialize_site_total_analytics_chart(data) {
    $('#site_houly_total_analytics_chart_div').empty().append($('<div id="site_houly_total_analytics_chart" class="chart"></div>'));
    setTimeout(function (){
        Morris.Area({
            element: 'site_houly_total_analytics_chart',
            data: data,
            xkey: 'time',
            ykeys: ['total_production', 'total_consumption'],
            labels: ['Total Production', 'Total Consumption'],
            pointSize: 2,
            hideHover: 'auto',
            continuousLine: true,
            dateFormat: function (val) {
                var d = new Date(val);
                return d.format('m/d h:MM TT');
            },
            xLabelFormat: function (val) {
                var d = new Date(val);
                return d.format('m/d h:MM TT');
            },
            hoverCallback: function (index, options, content) {
                var hover = '<div class="morris-hover-row-label">' + (new Date(options.data[index].time)).format('m/d h:MM TT') + '</div>';
                var key;
                var color;
                var label = ana_stat_labels.total;
                var value = options.data[index].total;
                hover += '<div class="morris-hover-point">' + label + ': ' + value + '</div>';
                for (var i = options.ykeys.length - 1; i >= 0; i--) {
                    key = options.ykeys[i];
                    color = ana_stat_colors[i];
                    label = ana_stat_labels[options.ykeys[i]];
                    value = options.data[index][options.ykeys[i]];
                    hover += '<div class="morris-hover-point"" style="color: ' + color + '">' + label + ': ' + value + '</div>';
                }
                return hover;
            }
        });
    }, 5);
}

function initialize_site_analytics_chart(data) {
    $('#site_houly_analytics_chart_div').empty().append($('<div id="site_houly_analytics_chart" class="chart"></div>'));
    setTimeout(function (){
        Morris.Line({
            element: 'site_houly_analytics_chart',
            data: data.values,
            xkey: 'time',
            ykeys: data.keys,
            labels: data.key_labels,
            lineColors: data.key_colors,
            pointSize: 2,
            hideHover: 'auto',
            behaveLikeLine: false,
            dateFormat: function (val) {
                var d = new Date(val);
                return d.format('m/d h:MM TT');
            },
            xLabelFormat: function (val) {
                var d = new Date(val);
                return d.format('m/d h:MM TT');
            },
            hoverCallback: function (index, options, content) {
                var hover = '<div class="morris-hover-row-label">' + (new Date(options.data[index].time)).format('m/d h:MM TT') + '</div>';
                var key;
                var color;
                var label;
                var value;
                for (var i = 0; i < options.ykeys.length; i++) {
                    key = options.ykeys[i];
                    color = ana_stat_colors[i];
                    label = ana_stat_labels[options.ykeys[i]];
                    value = options.data[index][options.ykeys[i]];
                    hover += '<div class="morris-hover-point"" style="color: ' + color + '">' + label + ': ' + value + '</div>';
                }
                return hover;
            }
        });
    }, 5);
}

function fill_top_concept_table() {
    var url;
    if (tt_org)
        url = get_admin_url('analytics_top_' + _current_time_span, tt_org.id) + '?start_time=' + _current_date.getTime();
    else
        url = get_admin_url('analytics_top_' + _current_time_span, null) + '?start_time=' + _current_date.getTime();
    $.ajax({
        async: true,
        type: "GET",
        url: url,
        contentType: "application/json",
        error: function (jqXHR, textStatus, errorThrown) {
            $.smallBox({
                title: 'Error getting Analytics from server',
                content: jqXHR.status + ': ' + errorThrown + ': ' + jqXHR.getResponseHeader('reason'),
                color: '#A65858',
                iconSmall: "fa fa-thumbs-down bounce animated"
            });
        },
        success: function (data, textStatus, jqXHR) {
            var total = $('#top_concept_total');
            var total_consumption = $('#top_concept_total_consumption');
            var total_production = $('#top_concept_total_production');
            total.empty();
            total_consumption.empty();
            total_production.empty();
            var tr;
            var td1;
            var td2;
            if (!data)
                return;
            for (var i = 0; i < data.top_total.length; i++) {
                tr = $('<tr></tr>');
                td1 = $('<td></td>');
                td1.append(data.top_total[i].phrasing);
                tr.append(td1);
                td2 = $('<td></td>');
                td2.append(data.top_total[i].total);
                tr.append(td2);
                total.append(tr);

                tr = $('<tr></tr>');
                td1 = $('<td></td>');
                td1.append(data.top_consumption[i].phrasing);
                tr.append(td1);
                td2 = $('<td></td>');
                td2.append(data.top_consumption[i].total_consumption);
                tr.append(td2);
                total_consumption.append(tr);

                tr = $('<tr></tr>');
                td1 = $('<td></td>');
                td1.append(data.top_production[i].phrasing);
                tr.append(td1);
                td2 = $('<td></td>');
                td2.append(data.top_production[i].total_production);
                tr.append(td2);
                total_production.append(tr);
            }
        }
    });
}

function fill_top_user_table() {
    var url;
    if (tt_org)
        url = get_admin_url('analytics_top_' + _current_time_span, tt_org.id) + '?type=user&start_time=' + _current_date.getTime();
    else
        url = get_admin_url('analytics_top_' + _current_time_span, null) + '?type=user&start_time=' + _current_date.getTime();
    $.ajax({
        async: true,
        type: "GET",
        url: url,
        contentType: "application/json",
        error: function (jqXHR, textStatus, errorThrown) {
            $.smallBox({
                title: 'Error getting Analytics from server',
                content: jqXHR.status + ': ' + errorThrown + ': ' + jqXHR.getResponseHeader('reason'),
                color: '#A65858',
                iconSmall: "fa fa-thumbs-down bounce animated"
            });
        },
        success: function (data, textStatus, jqXHR) {
            var total = $('#top_user_total');
            var total_consumption = $('#top_user_total_consumption');
            var total_production = $('#top_user_total_production');
            total.empty();
            total_consumption.empty();
            total_production.empty();
            var tr;
            var td1;
            var td2;
            if (!data)
                return;
            for (var i = 0; i < data.top_total.length; i++) {
                tr = $('<tr></tr>');
                td1 = $('<td></td>');
                td1.append(data.top_total[i].username);
                tr.append(td1);
                td2 = $('<td></td>');
                td2.append(data.top_total[i].total);
                tr.append(td2);
                total.append(tr);

                tr = $('<tr></tr>');
                td1 = $('<td></td>');
                td1.append(data.top_consumption[i].username);
                tr.append(td1);
                td2 = $('<td></td>');
                td2.append(data.top_consumption[i].total_consumption);
                tr.append(td2);
                total_consumption.append(tr);

                tr = $('<tr></tr>');
                td1 = $('<td></td>');
                td1.append(data.top_production[i].username);
                tr.append(td1);
                td2 = $('<td></td>');
                td2.append(data.top_production[i].total_production);
                tr.append(td2);
                total_production.append(tr);
            }
        }
    });
}

function initialize_charts() {
    render_all_analytic_charts();
    fill_top_concept_table();
    fill_top_user_table();
}

var _current_date; // Currently displayed date.
var _current_time_span = 'daily';
function initialize() {
    var sha_ana_select = $('#site_hourly_select');
    var option;
    var count = 0;
    $.each(ana_stat_labels, function (key, value) {
        option = $('<option></option>');
        option.attr('id', key);
        if (key == 'total_pro_opn' || key == 'total_con_new' || key == 'total_con_attr_cha')
            option.attr('selected', 'selected');
        option.append(value);
        sha_ana_select.append(option);
        count++;
    });
    sha_ana_select.select2({
        maximumSelectionSize: 7
    });
    sha_ana_select.on('change', function () {
        render_analytics_chart();
    });

    _current_date = new Date();
    _current_date.setDate(_current_date.getDate() - 1);
    $('#ana_date_picker').datepicker({
        onSelect: function(dateText, inst) {
            _current_date = new Date(Date.parse($(this).datepicker('getDate')));
            initialize_charts();
        }
    });
    $('#ana_date_picker').datepicker('setDate', _current_date);
    $('input[name=ana_time_span]').change(function() {
        _current_time_span = $('input[name=ana_time_span]:checked').val();
        initialize_charts();
    });
    initialize_charts();
}