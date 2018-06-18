var payment_plans = [];
var all_payment_plans = false;
function check_all_payment_plans() {
    $("input[type='checkbox'][name='payment_plan_ck']").prop('checked', this.checked).trigger('change');
    all_payment_plans = this.checked;
}

function payment_plan_checked() {
    if (this.checked) {
        var index = payment_plans.indexOf(this.id);
        if (index == -1) {
            payment_plans.push(this.id);
        }
    } else {
        var index = payment_plans.indexOf(this.id);
        if (index > -1) {
            payment_plans.splice(index, 1);
        }
    }
}

function fill_coupon_engine_select(coupon_engines, argv) {
    log.debug(coupon_engines);
    var coupon_engines_html = '';
    for (var i = 0; i < coupon_engines.length; i++) {
        coupon_engines_html += '<option>' + coupon_engines[i] + '</option>';
    }
    $("#coupon_engines_sel").html(coupon_engines_html);
}

function fill_payment_plan_table(payment_plans, argv) {
    log.debug(payment_plans);
    var payment_plan_html = '';
    for (var i = 0; i < payment_plans.length; i++) {
        payment_plan_html += '<tr><th><input name="payment_plan_ck" type="checkbox" id="' +
            payment_plans[i]['id'] + '"></th><th>' + payment_plans[i]['id'] + '</th></tr>';
    }
    $("#payment_plan_table_body").html(payment_plan_html);
    $("#check_all_plans").click(check_all_payment_plans);
    $("input[type='checkbox'][name='payment_plan_ck']").change(payment_plan_checked);
}

function create_coupon() {
    var code = $("#coupon_code").val();
    var rec_price = $("#rec_price").val();
    rec_price = parseFloat(rec_price);
    if (isNaN(rec_price)) {
        bootbox.alert('recurring price must be a number');
        return false;
    } else if (rec_price < 0) {
        bootbox.alert('amount must greater than -1');
        return false;
    }
    var init_price = parseFloat($("#init_price").val());
    if (isNaN(init_price)) {
        bootbox.alert('initial price must be a number');
        return false;
    } else if (init_price < 0) {
        bootbox.alert('initial price must greater than -1');
        return false;
    }
    if (code.trim().length == '') {
        bootbox.alert('code in empty');
        return false;
    }
    var effective_period = parseInt($("#effective_period").val());
    if (isNaN(effective_period)) {
        bootbox.alert('effective period must be a number');
        return false;
    } else if (effective_period < 0) {
        bootbox.alert('effective period must greater than -1');
        return false;
    }
    var plan_ids;
    if (all_payment_plans) {
        plan_ids = 'all';
    } else {
        if (payment_plans.length == 0) {
            bootbox.alert('No payment plan selected');
            return false;
        }
        plan_ids = payment_plans;
    }
    var activation_limit = $('#activation_limit').find(":selected").text();
    if (activation_limit != 'Unlimited') {
        activation_limit = parseInt(activation_limit);
    }
    var start_date = parseInt(new Date($('#start_picker1').data("DateTimePicker").getDate()).getTime()/1000);
    var end_date = parseInt(new Date($('#end_picker1').data("DateTimePicker").getDate()).getTime()/1000);
    var request = {
        'plan_ids': plan_ids,
        'engine_type': $('#coupon_engines_sel').find(":selected").text(),
        'init_price': init_price,
        'rec_price': rec_price,
        'start_date': start_date,
        'coupon_type': $('input[name=coupon_type_radios]:checked')[0].id,
        'activation_limit': activation_limit,
        'effective_period': effective_period
    }
    var discription = $('#discription').val();
    if (discription.trim() != '') {
        request['discription'] = discription.trim();
    }

    // The end date must be at least one hour after the start date to count
    if (((end_date/60)/60 - (start_date/60)/60) >= 1.0) {
        request['end_date'] = end_date;
    }

    var results = null;
    comms.put({
        async: false,
        url: PAYMENT_URLS.coupon_admin + code,
        data: request,
        success: function () {
            results = 1;
        },
        error: function () {
            results = -1;
        }
    });

    if(results == -1) {
        $.smallBox({
            title: 'There was an error while trying to create new group',
            color: '#A65858',
            iconSmall: "fa fa-thumbs-down bounce animated"
        });
    } else {
        $.smallBox({
            title: 'Group Created',
            color: '#00CC11',
            iconSmall: "fa fa-thumbs-up bounce animated",
            timeout: 2000
        });
    }
    return false;
}