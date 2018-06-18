
function get_request_latency_from_healths(healths, hours) {
    var l = [];
    var now = new Date();
    healths.sort(function (a, b) {
        a = new Date(a.ts * 1000);
        b = new Date(b.ts * 1000);
        if (a < b)
            return 1;
        else if (a > b)
            return -1;
        else
            return 0;
    });
    var hour = 0;
    for (var i = 0; i < healths.length; i++) {
        var ago = parseInt(Math.abs(now - new Date(healths[i].ts * 1000)) / 36e5);
        console.log('%s, %s', ago, healths[i].avg_latency);
        while (ago > hour) {
            l.push([hour, 0]);
            hour++;
        }
        l.push([hour, healths[i].avg_latency]);
        hour++;
    }
    return l;
}

function plot_latency_chart(hours) {
    var chrt_border_color = "#efefef";
    var chrt_main = "#E24913";			/* red       */
    get_from_server('GET', '/admin/thinktank/health/' + hours + '/', null , function (healths) {
        var request_latency = get_request_latency_from_healths(healths, hours);
        $.plot($("#request_latency"), [{
            data : request_latency,
            label : "Request Latency in hours"
        }], {
            series : {
                lines : {
                    show : true,
                    lineWidth : 1,
                    fill : true,
                    fillColor : {
                        colors : [{
                            opacity : 0.1
                        }, {
                            opacity : 0.15
                        }]
                    }
                },
                points : {
                    show : true
                },
                shadowSize : 0
            },
            xaxis : {
//                mode : "float",
//                tickLength : 10
                transform: function (v) { return -v; },
                inverseTransform: function (v) { return -v; }
            },
            yaxes : [{
//                min : 0,
//                tickLength : 5
//                transform: function (v) { return -v; },
//                inverseTransform: function (v) { return -v; }
            }],
            grid : {
                hoverable : true,
                clickable : true,
                tickColor : chrt_border_color,
                borderWidth : 0,
                borderColor : chrt_border_color
            },
            tooltip : true,
            tooltipOpts : {
                content : "%x, %y.5",
                defaultTheme : false
            },
            colors : [chrt_main]
//            xaxis : {
//                ticks : 15,
//                tickDecimals : 0
//            },
//            yaxis : {
//                ticks : 15,
//                tickDecimals : 0
//            }
        });
    });
}

function initialize_health() {
    var sel_hours = window.localStorage.getItem('req_lat_sel');
    if (!sel_hours)
        sel_hours = $('#req_lat_sel').val();
    else
        $('#req_lat_sel').val(sel_hours);
    $('#req_lat_sel').on('change', function (e) {
        sel_hours = $(e.target).val();
        window.localStorage.setItem('req_lat_sel', sel_hours);
        plot_latency_chart(sel_hours);
    });
    plot_latency_chart(sel_hours);
}