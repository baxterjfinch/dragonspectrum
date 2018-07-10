var TT_VERSION = "v3.0.x";

function Util(){}

Util.DISTILL_THRESHOLD = 12;
Util.ARTICLE_THRESHOLD = 9;

Util.CAPITALIZE_NONE = 0
Util.CAPITALIZE_FIRST = 1
Util.CAPITALIZE_TITLE = 2
Util.CAPITALIZE_UPPER = 3
Util.CAPITALIZE_LOWER = 4

Util.intersect = function (list1, list2) {
    var list = [];
    for (var i = 0; i < list1.length; i++) {
        if (list2.indexOf(list1[i]) != -1) {
            list.push(list1[i]);
        }
    }
    return list;
};

Util.union = function (list1, list2) {
    var union = list1.slice();
    for (var i = 0; i < list2.length; i++) {
        if (union.indexOf(list2[i]) < 0) {
            union.push(list2[i]);
        }
    }
    return union;
};

Util.difference = function (list1, list2) {
    var diff = [];
    for (var i = 0; i < list1.length; i++)
        if ($.inArray(list1[i], list2) == -1)
            diff.push(list1[i]);
    return diff;
};

Util.isSubSet = function (list1, list2) {
    for (var i = 0; i < list1.length; i++) {
        if (list2.indexOf(list1[i]) == -1) {
            return false;
        }
    }
    return true;
};

Util.getKeys = function (object) {
    var keys = [];
    $.each(object, function (key, value) {
        keys.push(key);
    });
    return keys;
};

Util.getvalues = function (object) {
    var values = [];
    $.each(object, function (key, value) {
        values.push(value);
    });
    return values;
};

Util.generateUUID1 = function () {
    return UUID.genV1().hexString;
};

Util.imageExists = function (url, callback) {
    var img = new Image();
    img.onload = function() { callback(true); };
    img.onerror = function() { callback(false); };
    img.src = url;
};

Util.debounce_items = {};
Util.debounce = function (id, deplay, func) {
    var previous = Util.debounce_items[id];
    if (previous)
        clearTimeout(previous);
    Util.debounce_items[id] = setTimeout(function () {
        func();
    }, deplay)
};

Util.distillWithThreshold = function (text, cap_mode) {
    if (!text)
        return "";

    var words = new Lexer().lex(text);
    var count = words.length;
    if (count > Util.DISTILL_THRESHOLD) {
        var noArticles = this.removeArticles(words);
        if (noArticles.length > Util.ARTICLE_THRESHOLD) {
            text = Util.distillWords(noArticles);
        } else {
            if (noArticles.length > 0) {
                text = noArticles.join(' ');
            } else {
                text = "";
            }
        }
    }

    text = text.trim();
    if (text.length == 0) {
        text = "";
    } else {
        text = Util.capitalize(text, cap_mode);
    }
    return text;
};

Util.distillText = function(text, cap_mode) {
    var words = new Lexer().lex(text);
    var distilled = Util.distillWords(words);
    return Util.capitalize(distilled, cap_mode);
};

Util.distillWords = function (words) {
    var taggedWords = new POSTagger().tag(words);
    var out = [];
    var verb_count = 0;
    var noun_encountered = false;
    var dt_count = 0;

    for (var i in taggedWords) {
        var taggedWord = taggedWords[i];

        var word = taggedWord[0];
        var tag = taggedWord[1];

//        console.log('***' + word + " /" + tag);
//        console.log("verb count " + verb_count);
//        console.log("noun encountered " + noun_encountered);
//        console.log("-----------------");

        // if we've already established some phrasing, we don't need any more _and_
        if (tag === 'CC' && verb_count > 0 && noun_encountered) {
            break;
        }

        // existential there, cardinal numbers, coordinating conjunctions
        if (tag === 'EX' || tag === 'CD' || tag === 'CC') {
            out.push(word);
        }

        // determiner (the, some)
        if (tag.startsWith('DT')) {
            out.push(word);
            dt_count++;
        }

        if (tag === 'RB' || tag === 'MD') {
            out.push(word);
        }

        // all nouns
        if (tag.startsWith('N')) {
            out.push(word);
            if (verb_count > 1 && noun_encountered) {
                break;
            }
            noun_encountered = true;
        }

        // all pronouns
        if (tag.startsWith('PR') || tag.startsWith('PP')) {
            out.push(word);
            noun_encountered = true;
        }

        // prepositions
        if (tag.startsWith('IN') && noun_encountered) {
            out.push(word);
        }

        // to
        if (tag.startsWith('TO')) {
            out.push(word);
        }

        // all verbs
        if (tag.startsWith('V')) {
            out.push(word);
            verb_count++;
        }

        // all adjectives
        if (tag.startsWith('J')) {
            out.push(word);
        }
    }

    var text = "";
    if (out.length > 0) {
        text = out.join(' ');
    }
    return text;
};

Util.capitalize = function(text, cap_mode) {

    if (!cap_mode) {
        cap_mode = Util.CAPITALIZE_FIRST;
    }

    switch(cap_mode) {
        case Util.CAPITALIZE_FIRST:
            text = text.charAt(0).toUpperCase() + text.slice(1);
            break;
        case Util.CAPITALIZE_TITLE:
            text = text.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
            break;
        case Util.CAPITALIZE_UPPER:
            text = text.toUpperCase();
            break;
        case Util.CAPITALIZE_LOWER:
            text = text.toLowerCase();
            break;
        case Util.CAPITALIZE_NONE:
            break;
        default:
            // NONE
    }

    return text;
};

Util.removeArticles = function(words) {
    var out = [];
    for (var i = 0; i < words.length; i++) {
        if($.inArray(words[i], ENGLISH_ARTICLES) == -1) {
            out.push(words[i]);
        }
    }
    return out
};

Util.toggleSlideShowDimensions = function (e) {
    var element = DVS.document_text[0];
    setTimeout(function () {
        if (Util.isFullScreen()) {
            Util.cancelSlideShow();
            DVS.resizeDVS();
            $(element).removeClass("full-screen");
            Project.renderAll();
            Shortcut.set('dvs_pres');
        } else {
            $('#pres_wrapper')
                .css('width', screen.width)
                .css('height', screen.height);
            $(element).addClass('full-screen');
            Project.renderAll();
        }
    }, 100);
};

Util.startSlideShow = function () {
    Shortcut.set('slideshow');
    Util.addFullScreenEventListeners();

    var element = DVS.document_text[0];
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
};

Util.cancelSlideShow = function () {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }
};

Util.full_screen_listeners_active = false;
Util.addFullScreenEventListeners = function () {
    if (!Util.full_screen_listeners_active) {
        Util.full_screen_listeners_active = true;
        document.removeEventListener("fullscreenchange", Util.toggleSlideShowDimensions);
        document.removeEventListener("webkitfullscreenchange", Util.toggleSlideShowDimensions);
        document.removeEventListener("mozfullscreenchange", Util.toggleSlideShowDimensions);
        document.removeEventListener("MSFullscreenChange", Util.toggleSlideShowDimensions);
        document.addEventListener("fullscreenchange", Util.toggleSlideShowDimensions);
        document.addEventListener("webkitfullscreenchange", Util.toggleSlideShowDimensions);
        document.addEventListener("mozfullscreenchange", Util.toggleSlideShowDimensions);
        document.addEventListener("MSFullscreenChange", Util.toggleSlideShowDimensions);
    }
};

Util.isFullScreen = function () {
    return $(DVS.document_text[0]).hasClass("full-screen")
};

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

function createErrorBlurb(tag, text) {
    var blurb = $("<div/>").addClass("alert").addClass("alert-danger").addClass("error-blurb");
    blurb.append($("<strong/>").text(tag)).append(" " + text);

    return blurb;
}

function isInt(value) {
   return !isNaN(value) && parseInt(value) == value;
}

function get_height_from_bottom(el) {
    return window.innerHeight - el.offset().top;
}

function calc_dvs_height() {
    return window.innerHeight - $('#pvs').height() - $('#dvs-tabs-container').height() - $('#nav_bar').height() - DVS.buttonGap;
}

function calc_tvs_height() {
    return window.innerHeight - $('#pvs').height() - $('#nav_bar').height() - DVS.buttonGap;
}

function generateUUID1() {
    return UUID.genV1().hexString;
}

function tt_notification(msg, type) {
    if (!type)
        type = 'blackgloss';
    $('#notification').notify({
        message: { text: msg },
        type: type
    }).show();
}

function tt_notification_html(msg) {
    $('#notification').notify({
        message: {
            html: msg
        },
        type: 'blackgloss'
    }).show();
}

function tt_confirm(msg, callback) {
    if (typeof Shortcut != "undefined") {
        Shortcut.pause();
    }
    bootbox.confirm(msg, function (results) {
        callback(results);
        if (typeof Shortcut != "undefined") {
            Shortcut.unpause();
        }
    });
}

function tt_prompt(msg, callback) {
    if (typeof Shortcut != "undefined") {
        Shortcut.pause();
    }
    bootbox.prompt(msg, function (results) {
        callback(results);
        if (typeof Shortcut != "undefined") {
            Shortcut.unpause();
        }
    });
}

function Notify() {}

Notify.type_none = 'blackgloss';
Notify.type_success = 'success';
Notify.type_info = 'info';
Notify.type_warning = 'warning';
Notify.type_error = 'danger';

Notify.alert = function (msg, type) {
    if (!type)
        type = Notify.type_none;
    $('#notification').notify({
        message: { text: msg },
        type: type
    }).show();
};

Notify.alert.success = function (msg) {
    Notify.alert(msg, Notify.type_success);
};

Notify.alert.info = function (msg) {
    Notify.alert(msg, Notify.type_info);
};

Notify.alert.warning = function (msg) {
    Notify.alert(msg, Notify.type_warning);
};

Notify.alert.error = function (msg) {
    Notify.alert(msg, Notify.type_error);
};

Notify.notify = function (msg, type) {
    if (!type)
        type = Notify.type_none;
    $('#notification').notify({
        message: { text: msg },
        type: type
    }).show();
};

Notify.notifyHTML = function (msg, type) {
        if (!type)
        type = Notify.type_none;
    $('#notification').notify({
        message: {
            html: msg
        },
        type: type
    }).show();
};

Notify.confirm = function (msg, callback) {
    if (typeof Shortcut != "undefined") {
        Shortcut.pause();
    }
    bootbox.confirm(msg, function (results) {
        callback(results);
        if (typeof Shortcut != "undefined") {
            Shortcut.unpause();
        }
    });
};

Notify.prompt = function (msg, callback) {
    if (typeof Shortcut != "undefined") {
        Shortcut.pause();
    }
    bootbox.prompt(msg, function (results) {
        callback(results);
        if (typeof Shortcut != "undefined") {
            Shortcut.unpause();
        }
    });
};

var tt_notify = {
    alert: tt_notification,
    confirm: tt_confirm,
    prompt: tt_prompt
};

function createOrSeperator() {
    return "\
    <table  width='100%'>\
        <td></td>\
        <td style='color: #ddd; font-size: 9pt; width:1px; padding: 0 10px;'></td>\
        <td><hr class='separator'/></td>\
    </table>";
}

function animate(element_ID, animation) {
    $(element_ID).addClass(animation);
    var wait = window.setTimeout( function(){
        $(element_ID).removeClass(animation)}, 1300
    );
}

function flash(element_ID, flash_color, return_color, delay) {
    $(element_ID).css("background-color", flash_color);
    var wait = window.setTimeout( function() {
            $(element_ID).css("background-color", return_color)
        }, delay
    );
}

function play_audio(filename) {
    if (isIE8orlower() == 0) {
        var audioElement = document.createElement('audio');

        if (navigator.userAgent.match('Firefox/'))
            audioElement.setAttribute('src', $.sound_path + filename + '.ogg');
        else
            audioElement.setAttribute('src', $.sound_path + filename + '.mp3');

        $.get();
        audioElement.addEventListener("load", function () {
            audioElement.play();
        }, true);
        audioElement.pause();
        audioElement.play();
    }
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        }, wait);
        if (immediate && !timeout) func.apply(context, args);
    };
}


function OnDemandPopUpAppender() {
    this.popUpAppender = new log4javascript.PopUpAppender();
    this.popUpAppender.setUseOldPopUp(false);
    this.poppedUp = false;
    this.popperUpperDisplayed = false;
    this.queuedLoggingEvents = [];
}

var proto = new log4javascript.Appender();
var appender;
OnDemandPopUpAppender.prototype = proto;

proto.appendQueued = function() {
    for (var i = 0, loggingEvent; loggingEvent = this.queuedLoggingEvents[i++]; ) {
        this.popUpAppender.append(loggingEvent);
    }
    this.queuedLoggingEvents.length = 0;
};

proto.popUp = function() {
    this.poppedUp = true;
    this.appendQueued();
};

proto.append = function(loggingEvent) {
    appender = this;
    this.queuedLoggingEvents.push(loggingEvent);

    if (this.poppedUp) {
        this.appendQueued();
    }
};


function show_logger() {
    appender.popUp();
}

//var ajaxAppender = new log4javascript.AjaxAppender('/account/client/logger/');
//ajaxAppender.setThreshold(log4javascript.Level.ERROR);
//var jsonlayout = new log4javascript.JsonLayout(false, false);
//ajaxAppender.setLayout(jsonlayout);
//ajaxAppender.addHeader("Content-Type", "application/json");

var log = log4javascript.getLogger("main");
log.addAppender(new OnDemandPopUpAppender());
//log.addAppender(ajaxAppender);
log4javascript.logLog.setQuietMode(true);


function form_to_dict(form) {
    var values = {};
    $.each(form.serializeArray(), function(i, field) {
        values[field.name] = field.value;
    });
    return values;
}

function show_search_help() {
    Shortcut.pause();

    $("#error-pane").empty();
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("Help with Search <small>Query Features</small>");

    $("#modal_content").show().html(
        '<table class="table key-actions">' +
            '<thead>' +
                '<tr>' +
                    '<th>Feature</th>' +
                    '<th>Description</th>' +
                    '<th>Example</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody>' +
                '<tr>' +
                    '<td><kbd>AND</kbd>, <kbd>OR</kbd>, <kbd>NOT</kbd> <em>Logical Operators</em></td>' +
                    '<td><kbd>NOT</kbd> before term, <kbd>AND</kbd>/<kbd>OR</kbd> between terms <em>(must be written in uppercase)</em></td>' +
                    '<td><code>Sunshine AND smiles NOT Unicorns</code></td>' +
                '</tr>' +
                '<tr>' +
                    '<td><kbd>( )</kbd> <em>Parentheses</em></td>' +
                    '<td>Specify logical grouping and order</td>' +
                    '<td><code>Sunshine OR (smiles AND happiness)</code></td>' +
                '</tr>' +
                '<tr>' +
                    '<td><kbd>~</kbd> <em>tilde</em>' +
                    '<td>Stemming operator to match variants of search term <em>(Must precede a search term with no intervening space)</em></td>' +
                    '<td><code>~dog</code> <em>To match dog or dogs</em></td>' +
                '</tr>' +
                '<tr>' +
                    '<td><kbd>" "</kbd> <em>Exact phrase match</em>' +
                    '<td>Enclose the search phrase in quotes to search for an exact phrase</em></td>' +
                    '<td><code>"The quick brown fox"</code></td>' +
                '</tr>' +
            '</tbody>' +
        '</table>'
    );

    $("#modal_save_button").show().html('\
        <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
    ');

    $('#modal_dialog').on('hidden.bs.modal', function () {
        Shortcut.unpause();
    });

}

function logout() {
    comms.post({
        url: ACCOUNT_URLS.login,
        data: {"status": "logout", "user": get_user().username},
        success: function (data, textStatus, jqXHR) {
            $.removeCookie('auth_token', {path: STATIC_URLS.root});
            $.removeCookie('auth_user', {path: STATIC_URLS.root});
            $.removeCookie('user', {path: STATIC_URLS.root});
            $(location).attr('href', ARTIFACT_URLS.project_library);
        }
    });
}

function show_keybindings() {
    Shortcut.pause();
    $('#keybindings-modal').modal();

    $('#keybindings-modal').on('hidden.bs.modal', function () {
        Shortcut.unpause();
    });
}


function show_about_dialog() {
    Shortcut.pause();

    $("#error-pane").empty();
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("About thinkTank™ <small>" + TT_VERSION + '</small>');
    $("#modal_content").show().html(
        '<h4>Support</h4>' +
        '<p>For feedback or support, please contact <a href="mailto:support@corpus.io">support@corpus.io</a>, including your account login ID and organization info (if applicable).</p>' +
        '<br>' +
        '<h4>Audio Licensing</h4>' +
        '<p>The thinkTank™ team is grateful to the following artists for the use of their audio files:</p>' +
        '<ul>' +
            '<li><a href="http://www.freesound.org/people/soundbyter.com/sounds/110429/">Selectsound</a> by soundbyter.com (<a href="http://creativecommons.org/licenses/sampling+/1.0/">Creative Commons Sampling+ License</a>)</li>' +
            '<li><a href="http://www.freesound.org/people/jobro/packs/2120/">Futuristic GUI beeps pack</a> by jobro (<a href="http://creativecommons.org/licenses/by/3.0/">Creative Commons Attribution License</a>)</li>' +
            '<li><a href="http://www.freesound.org/people/datwilightz/sounds/194283/">Beep 1</a> by DaTwilightZ (<a href="http://creativecommons.org/licenses/by/3.0/">Creative Commons Attribution License</a>)</li>' +
            '<li><a href="http://www.freesound.org/people/Eternitys/sounds/141121/">Interface1</a> by Eternitys (<a href="http://creativecommons.org/publicdomain/zero/1.0/">Creative Commons 0 License</a>)</li>' +
            '<li><a href="http://www.freesound.org/people/unfa/sounds/215415/">Ping</a> by Tobiasz \'unfa\' Karoń (<a href="http://creativecommons.org/licenses/by/3.0/">Creative Commons Attribution License</a>)</li>' +
         '</ul>');

    $("#modal_save_button").show().html('\
        <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
    ');

    $('#modal_dialog').on('hidden.bs.modal', function () {
        Shortcut.unpause();
    });
}

var project_instructions_showing = false;
function show_new_project_instructions() {
    if (!project_instructions_showing) {
        project_instructions_showing = true;
        $.smallBox({
            title: "Empty Project!",
            content: "<p>This project has no Concepts.</p>" +
                "<ol>" +
                "<li>To create a new Concept, press ENTER.</li>" +
                "<li>An empty text box will appear: <img src='/images/new-concept-image.png'></li>" +
                "<li>Type your phrasing and press ENTER.</li>" +
                "<li>Press ENTER again after each new Concept phrasing you type.</li>" +
                "</ol>" +
                "<p>For more information, see the <i class='fa fa-life-saver'></i> Help menu above.</p>" +
                "<span id='empty-project-info'></span>",
            color: "#296191",
            icon: "fa fa-bell swing animated"
        });
    }
}

function hide_new_project_instructions() {
    project_instructions_showing = false;
    $('#empty-project-info').click();
}