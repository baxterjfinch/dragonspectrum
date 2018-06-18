function show_presentation_export_menu() {
    $("#error-pane").empty();
    $("#modal_dialog").modal("show");
    $("#modal_label").show().html("Export Presentation <small>Apha</small>");
    $("#modal_content").show().html('\
<form class="form-horizontal" role="form" id="modal_document" action="export_presentation()"> \
    <div class="form-group">\
        <label class="form-group"><em>Unsupported Apha Level Functionality</em></label>\
    </div>\
    <div class="form-group"> \
        <div> \
            <input class="form-control" type="text" id="num_of_slides" value="" placeholder="Enter the desired number of slides."> \
        </div> \
    </div> \
    <div class="form-group"> \
        <div> \
            <input class="form-control" type="text" id="bullets_per_slide" value="" placeholder="Enter the desired number of bullets per slide."> \
        </div> \
    </div> \
</form> \
');

    $("#modal_save_button").show().html('\
        <button class=\"btn btn-primary\" onclick=\"return export_presentation()\">Create</button>\
        <button class=\"btn\" data-dismiss=\"modal\">Close</button>'
    );

    $('#modal_dialog').on('shown.bs.modal', function () {
        $('#num_of_slides').focus();
    });

    $('#modal_dialog').on('hidden.bs.modal', function () {
        Shortcut.set('dvs');
    });
}

function export_presentation() {
    $("#error-pane").empty();
    var numSlides = $("#num_of_slides").val();
    var numBullets = $("#bullets_per_slide").val();
    if (!isInt(numSlides)) {
        var errorBlurb = createErrorBlurb("Oops!", "You have entered an invalid number of slides.");
        $("#error-pane").append(errorBlurb);
        return;
    }

    if (!isInt(numBullets)) {
        var errorBlurb = createErrorBlurb("Oops!", "You have entered an invalid number of bullets per slide.");
        $("#error-pane").append(errorBlurb);
        return;
    }

    getImageFromUrl(STATIC_URLS.presentation_background, create_presentation_pdf);
}

function create_presentation_pdf(image_Data) {
    var num_of_slides = parseInt($("#num_of_slides").val());
    var bullet_pre_slide = parseInt($("#bullets_per_slide").val());
    var node_slides = get_node_slide_array(num_of_slides);
    var bullets;
    var lines;
    var bullet_position = 200;
    var heading_position = 100;
    var pdf = new jsPDF("landscape", "pt", "letter");

    pdf.addImage(image_Data, "JPEG", 0, 0, 700, 700);
    for (var i = 0; i < node_slides.length; i++) {

        var slide_heading = Util.distill_phrase(get_node_phrasing_text(node_slides[i]["node"]));

        bullets = get_slide_bullets(node_slides, i, bullet_pre_slide);

        for (var x = 0; x < bullets.length; x++) {
            bullets[x] = Util.distill_phrase(bullets[x]);
        }

        pdf.setFontSize(22);
        lines = pdf.splitTextToSize(slide_heading, 600);
        for (var l = 0; l < lines.length; l++) {
            pdf.text(100, heading_position, lines[l]);
            heading_position += 22;

        }
        heading_position = 100;
        pdf.setFontSize(16);

        for (var j = 0; j < bullets.length; j++) {
            lines = pdf.splitTextToSize(bullets[j], 600)
            for (var l = 0; l < lines.length; l++) {
                pdf.text(100, bullet_position, lines[l]);
                bullet_position += 15;

            }
            bullet_position += 20;

        }

        bullet_position = 200;
        if (i + 1 != node_slides.length) {
            pdf.addPage();
            pdf.addImage(image_Data, "JPEG", 0, 0, 700, 700);

        }

    }

    pdf.save(get_project_data().title);

}

var getImageFromUrl = function (url, callback) {
    var img = new Image, data, ret = {data: null, pending: true};

    img.onError = function () {
        log.info("image is loading");
        throw new Error('Cannot load image: "' + url + '"');
    }
    img.onload = function () {
        log.info("image is loading");
        var canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        canvas.width = img.width;
        canvas.height = img.height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // Grab the image as a jpeg encoded in base64, but only the data
        data = canvas.toDataURL('image/jpeg').slice('data:image/jpeg;base64,'.length);
        // Convert the data to binary form
        data = atob(data)
        document.body.removeChild(canvas);

        ret['data'] = data;
        ret['pending'] = false;
		if (typeof callback === 'function') {
			callback(data);
		}
    }
    img.src = url;

    return ret;
}

function get_slide_bullets(node_slides, index, bullet_pre_slide) {
    var bullets = new Array();
    var num_bullets = 0;
    var node = node_slides[index]["node"];

    if (is_parent(node) && node.childList == null) {
        load_children(node, 0, false, null, null, false);

    }

    for (var i = 0; i < node.childList.length; i++) {
        if (node.childList[i].childList == null) {
            bullets.push(get_node_phrasing_text(node.childList[i]));
            num_bullets++;

        } else if (!is_node_in_slides_array(node.childList[i], node_slides)) {
            bullets.push(get_node_phrasing_text(node.childList[i]));
            num_bullets++;

        }

        if (num_bullets == bullet_pre_slide) {
            break;

        }

    }

    return bullets;

}

function is_node_in_slides_array(node, node_slides) {
    for (var i = 0; i < node_slides.length; i++) {
        if (node == node_slides[i]["node"]) {
            return true;

        }

    }

    return false;

}

function get_node_slide_array(num_of_slides) {
    var node = $("#tree").dynatree("getRoot");
    var slide_nodes = [];
    var next_slide;
    var slide;

    for (var i = 0; i < node.childList.length; i++) {
        if (num_of_slides == 0) {
            return slide_nodes;

        }

        if (is_parent(node.childList[i])) {
            slide = {"node": node.childList[i], "done": false, "last_index": 0, "last_child_index": 0};
            num_of_slides--;

            slide_nodes.push(slide)

        }

    }

    var index = 0;
    while (true) {
        if (num_of_slides == 0 || all_slides_done(slide_nodes)) {
            break;

        }

        if (!slide_nodes[index]["done"]) {
            next_slide = get_next_slide(slide_nodes[index]);
            if (next_slide == null) {
                slide_nodes[index]["done"] = true;

            } else {
                slide = {"node": next_slide, "done": false, "last_index": 0, "last_child_index": 0};
                slide_nodes.splice(index + 1 + slide_nodes[index]["last_child_index"], 0, slide);
                slide_nodes[index]["last_child_index"] += 1;
                index++;
                num_of_slides--;

            }

        }

        if (index + 1 == slide_nodes.length) {
            index = -1;

        }
        index++;

    }

    return slide_nodes;

}

function all_slides_done(slide_nodes) {
    for (var i = 0; i < slide_nodes.length; i++) {
        if (!slide_nodes[i]["done"]) {
            return false;

        }

    }

    return true;
}

function get_next_slide(slide) {
    if (is_parent(slide["node"]) && slide["node"].childList == null) {
        load_children(slide["node"], 0, false, null, null, false);

    }
    for (var i = slide["last_index"]; i < slide["node"].childList.length; i++) {
        if (is_parent(slide["node"].childList[i])) {
            slide["last_index"] = i + 1;
            return slide["node"].childList[i];

        }

    }

    return null;

}
