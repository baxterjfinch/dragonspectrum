function AbstractRender () {}

AbstractRender.is_running = false;
AbstractRender.first_concept_ab = true;
AbstractRender.render_par_ab = false;
AbstractRender.par_stack_ab = [];
AbstractRender.render_array = [];
AbstractRender.clip_client = null;

AbstractRender.setRunning = function (flag) {
    AbstractRender.is_running = flag;
};

AbstractRender.isRunning = function () {
    return AbstractRender.is_running;
};

AbstractRender.getRenderArray = function () {
    return AbstractRender.render_array;
};

AbstractRender._buildRenderArrayRecursive = function (concept, doc) {
    if (concept.isRoot()) {
        var children = concept.getChildren();
        for (var i = 0; i < children.length; i++) {
            AbstractRender._buildRenderArrayRecursive(children[i], doc, AbstractRender.render_array);
        }
    } else {
        if (concept.isSummaryCrawlableByDocId(doc.getId(), false)) {
            var attribute = concept.getDocumentAttribute(doc);
            if (attribute && attribute.isHeader()) {
                if (concept.isParent()) {
                    AbstractRender.first_concept_ab = true;
                    children = concept.getChildren();
                    for (i = 0; i < children.length; i++) {
                        AbstractRender._buildRenderArrayRecursive(
                                children[i], doc, AbstractRender.render_array);
                    }
                }
            } else {
                if (concept.isParent()) {
                    if (AbstractRender.render_par_ab) {
                        AbstractRender.par_stack_ab.push(concept);
                        return;
                    }

                    if (AbstractRender.first_concept_ab) {
                        AbstractRender.render_array.push(concept);
                        AbstractRender.first_concept_ab = false;
                        children = concept.getChildren();
                        for (i = 0; i < children.length; i++) {
                            AbstractRender._buildRenderArrayRecursive(
                                children[i], doc, AbstractRender.render_array);
                        }
                    } else {
                        AbstractRender.render_array.push(concept);
                        children = concept.getChildren();
                        for (i = 0; i < children.length; i++) {
                            AbstractRender._buildRenderArrayRecursive(
                                children[i], doc, AbstractRender.render_array);
                        }
                        if (AbstractRender.par_stack_ab.length > 0) {
                            AbstractRender.par_stack_ab.reverse();
                            for (i = 0; i < AbstractRender.par_stack_ab.length; i++) {
                                AbstractRender._buildRenderArrayRecursive(
                                    AbstractRender.par_stack_ab.pop(), doc, AbstractRender.render_array);
                            }
                        }
                    }
                } else {
                    if (concept.isSummaryCrawlableByDocId(doc.getId(), false)) {
                        if (AbstractRender.first_concept_ab) {
                            AbstractRender.render_array.push(concept);
                            AbstractRender.first_concept_ab = false;
                        } else {
                            AbstractRender.render_array.push(concept);
                        }
                    }
                }
            }
        }
    }
};

AbstractRender._buildRenderArray = function (root, doc) {
    AbstractRender.render_array = [];
    AbstractRender._buildRenderArrayRecursive(root, doc);
};

AbstractRender._render = function (par_cnt, doc, root) {
    var node_pre_paragraph = parseInt(AbstractRender.render_array.length / par_cnt) + 1;
    var node_count = 0;
    var summary_render;
    var root_span = root.getSummaryRender().span;
    root_span.empty();
    var p = $('<p></p>');
    root_span.append(p);

    for (var i = 0; i < AbstractRender.render_array.length; i++) {
        if (node_count == node_pre_paragraph) {
            node_count = 0;
            p = $('<p></p>');
            root_span.append(p);
        }

        summary_render = AbstractRender.render_array[i].getSummaryRender();
        summary_render.span.empty();

        if (AbstractRender.render_array[i].summernote === 'undefined' || AbstractRender.render_array[i].summernote == null) {
            summary_render.span.append(AbstractRender.render_array[i].getSummaryDocumentPhrasing(doc).getText() + ' ');
        } else {
            summary_render.span.append(AbstractRender.render_array[i].summernote.get_span());
        }

        summary_render.span.data('concept', AbstractRender.render_array[i]);
        summary_render.span.unbind();
        summary_render.span.click(function () {
            ConceptEventListener.activeMouseClick($(this).data('concept'));
        });

        p.append(summary_render.span);
        node_count++;
    }
};

AbstractRender.render = function (par_cnt, root, doc) {
    if (AbstractRender.isRunning())
        return;
    AbstractRender.setRunning(true);

    // Reset all our values
    AbstractRender.is_running = false;
    AbstractRender.first_concept_ab = true;
    AbstractRender.render_par_ab = false;
    AbstractRender.par_stack_ab = [];

    AbstractRender._buildRenderArray(root, doc);
    AbstractRender._render(par_cnt, doc, root);

    AbstractRender.setRunning(false);

    if (AbstractRender.clip_client)
        AbstractRender.clip_client.destroy();
    AbstractRender.clip_client = new ZeroClipboard(document.getElementById("summary-copy-btn"));
    AbstractRender.clip_client.on('ready', function (readyEvent) {
        AbstractRender.clip_client.on('copy', function (event) {
            var clipboard = event.clipboardData;
            clipboard.setData('text/plain',
                Document.getCurrent().getDvsDiv().html()
                    .replace(/<\/p>/gm, '\n\n')
                    .replace(/<(?:.|\n)*?>/gm, '')
            );
        });
        AbstractRender.clip_client.on('aftercopy', function (event) {
            Notify.alert('Summary Copied to Clipboard.');
        });
    });
};