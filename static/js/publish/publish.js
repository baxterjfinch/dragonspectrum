var active_concept_text_span = null;
var phr_span = null;

function get_phr_concept_span(phr) {
    var id = phr.attr('id');
    id = id.split('-')[0];
    var concept = $('#' + id);
    concept.id = id;
    return concept;
}

function get_phr_text_span(id) {
    return $('#' + id + '-phr_text_span');
}

function get_more_icon_span(id) {
    return $('#' + id + '-more_icon');
}

function get_concept_parent(concept) {
    var parent = null;
    var parents = concept.parents();
    parents.each(function (index, par) {
        if ($(par).hasClass('concept')) {
            parent = $(par);
            return false;
        }
    });
    if (parent)
        parent.id = parent.attr('id');
    return parent;
}

function get_children_span(id) {
    return $('#' + id + '-children_span');
}

function get_parent_children_span(id) {
    return $('#' + id + '-parent_children_span');
}

function get_previous_visible_phr_index(phr) {
    var index = phr_span.index(phr);
    if (index - 1 < 0)
        return null;

    phr = $(phr_span[index - 1]);
    var parents = phr.parents();
    for (var i = 0; i < parents.length; i++)
        if ($(parents[i]).hasClass('hidden'))
            return get_previous_visible_phr_index(phr);

    return phr;
}

function get_next_visible_phr_index(phr) {
    var index = phr_span.index(phr);
    if (index + 1 == phr_span.length)
        return null;

    phr = $(phr_span[index + 1]);
    var parents = phr.parents();
    for (var i = 0; i < parents.length; i++)
        if ($(parents[i]).hasClass('hidden'))
            return get_next_visible_phr_index(phr);

    return phr;
}

function activate_concept_click() {
    $('.activate_concept').removeClass('activate_concept');
    $('.img-activated').removeClass('img-activated');
    active_concept_text_span = $(this);
    if ($(this).prop('tagName') == 'SPAN')
        $(this).addClass('activate_concept');
    else if ($(this).prop('tagName') == 'IMG')
        $(this).addClass('img-activated');
    update_scrollbar();
    send_analytics(get_phr_concept_span(active_concept_text_span).id, 'con_nav');
}

function activate_previous() {
    var phr = get_previous_visible_phr_index(active_concept_text_span);
    if (phr) {
        $(phr).click();
    }
}

function activate_next() {
    var phr = get_next_visible_phr_index(active_concept_text_span);
    if (phr) {
        $(phr).click();
    }
}

function collapse_parent_mouse_event() {
    return collapse_parent(get_phr_concept_span(active_concept_text_span));
}

function collapse_parent(concept) {
    if (concept.data('collapsed') == true) {
        var parent = get_concept_parent(concept);
        if (parent) {
            var phr_text_span = get_phr_text_span(parent.id);
            phr_text_span.click();
        }
        return;
    }

    concept.data('collapsed', true);
    var more_icon = get_more_icon_span(concept.id);
    var children_span = get_children_span(concept.id);
    var parent_children_span = get_parent_children_span(concept.id);

    more_icon.removeClass('hidden');
    children_span.addClass('hidden');
    parent_children_span.addClass('hidden');
    send_analytics(concept.id, 'con_col');
}

function expand_parent_mouse_event() {
    return expand_parent(get_phr_concept_span(active_concept_text_span));
}

function expand_parent() {
    var concept = get_phr_concept_span(active_concept_text_span);

    if (concept.data('collapsed') == false)
        return;

    concept.data('collapsed', false);
    var more_icon = get_more_icon_span(concept.id);
    var children_span = get_children_span(concept.id);
    var parent_children_span = get_parent_children_span(concept.id);

    more_icon.addClass('hidden');
    children_span.removeClass('hidden');
    parent_children_span.removeClass('hidden');
    send_analytics(concept.id, 'con_exp');
}

function update_scrollbar() {
    if (active_concept_text_span) {
        var win_height = $(window).height();
        var scroll_top = $(window).scrollTop();
        var top = active_concept_text_span.offset().top - scroll_top;
        var buffer = win_height * 0.15;
        if (top < buffer) {
            $(window).scrollTop(scroll_top - (buffer - top));
        } else if (top > win_height - buffer) {
            $(window).scrollTop(scroll_top + (top - (win_height - buffer)));
        }
    }
}

function send_analytics(id, action) {
    $.ajax({
        type: 'POST',
        url: '/document/publish/analytic/' + project_id + '/' + id + '/' + action,
        data: JSON.stringify({an_token: an_token}),
        contentType: 'application/json'
    })
}

function send_session_analytics() {
    var navigator = window.navigator;
    var analytic = {};
    if (navigator.hasOwnProperty('appCodeName'))
        analytic.app_code_name = navigator.appCodeName;
    if (navigator.hasOwnProperty('appName'))
        analytic.app_name = navigator.appName;
    if (navigator.hasOwnProperty('appVersion'))
        analytic.app_version = navigator.appVersion;
    if (navigator.hasOwnProperty('cookieEnabled'))
        analytic.cookie_enabled = navigator.cookieEnabled;
    if (navigator.hasOwnProperty('doNotTrack'))
        analytic.do_not_track = navigator.doNotTrack;
    if (navigator.hasOwnProperty('geolocation'))
        analytic.geolocation = navigator.geolocation;
    if (navigator.hasOwnProperty('language'))
        analytic.language = navigator.language;
    else if (navigator.hasOwnProperty('systemLanguage'))
        analytic.language = navigator.systemLanguage;
    if (navigator.hasOwnProperty('platform'))
        analytic.platform = navigator.platform;
    if (navigator.hasOwnProperty('product'))
        analytic.product = navigator.product;
    if (navigator.hasOwnProperty('vender'))
        analytic.vender = navigator.vender;

    analytic.plugins = [];
    for (var i = 0; i < navigator.plugins.length; i++) {
        analytic.plugins.push(navigator.plugins[i].name);
    }

    analytic.an_token = an_token;

    $.ajax({
        type: 'POST',
        url: '/analytic/',
        data: JSON.stringify(analytic),
        contentType: 'application/json'
    })

}

var shortcuts = {
    activate_Previous: {
        name: 'Activate Previous Concept',
        binding: ['up'],
        callback: activate_previous,
        preventDefault: true,
        description: ''
    },
    activate_next: {
        name: 'Activate Next Concept',
        binding: ['down'],
        callback: activate_next,
        preventDefault: true,
        description: ''
    },
    collapse_parent: {
        name: 'Collapse Parent',
        binding: ['left'],
        callback: collapse_parent_mouse_event,
        preventDefault: true,
        description: ''
    },
    expand_parent: {
        name: 'Expand Parent',
        binding: ['right'],
        callback: expand_parent_mouse_event,
        preventDefault: true,
        description: ''
    }
};

$(function () {
    phr_span = $('.phr_text_span, .concept-img');
    phr_span.click(activate_concept_click);
    if (phr_span.length > 0)
        $(phr_span[0]).click();

    $.each(shortcuts, function (key, value) {
        if (value.binding) {
            Mousetrap.bind(value.binding, function (e, combo) {
                console.debug('Shortcut: %s Combo: %s', key, combo);
                value.callback();
                return !value.preventDefault;
            });
        }
    });

    $(window).resize(function () {
        update_scrollbar();
    });

    send_session_analytics();
});


