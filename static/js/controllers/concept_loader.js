function ChildLoader () {
    this.project = null;
    this.load_all_mode = false; // Whether or not we are loading all children
    this.cb_func = null;        // The function to callback after load all
    this.expand_node = false;   // Whether to expand node parents on addChild
    this.la_batch_size = 20;    // Batch size for load all mode
    this.lq_running = false;    // Whether the Low priority queue is running
    this.lq = [];               // Low priority queue
    this.lq_cur = null;         // Contains the currently being fetched parents
    this.hq_running = false;    // Whether the High priority queue is running
    this.hq = [];               // High priority queue
    this.hq_cur = null;         // Contains the currently being fetched parents
    this._ajax_request = [];    // Dict of currently running ajax request
    this.hq_batch_size = 2;     // Number of parents to request at a time
    this.lq_batch_size = 5;     // This should always be set by the server
                                // But if not will default to this init value
    this.hq_timeout = 20;       // Throttle timeout
    this.lq_timeout = 20;       // Throttle timeout
    this.concurrent_request = 2;// Number of concurretn request allowed
    this.cache_children = true; // Whether or not to use caching
    this.stay_ahead = true;     // Whether to load grandchildren automaticly
    this.cache = {};            // If the parent is not visable to the user
                                // We will store its children in cache
                                // so as to not cause a re-render
}

ChildLoader.prototype = {
    initialize: function (loader_configs, project) {
        this.project = project;
        this.hq_batch_size = loader_configs.hq_batch_size;
        this.lq_batch_size = loader_configs.lq_batch_size;
        this.stay_ahead = loader_configs.stay_ahead;
        this.concurrent_request = loader_configs.concurrent_request;
        this.cache_children = loader_configs.cache_children;
        this.hq_timeout = loader_configs.hq_timeout;
        this.lq_timeout = loader_configs.lq_timeout;
    },

    needs_loaded: function (c) {
        return c.isParent() && !c.isLoaded() && !c.getChildren().length > 0;
    },

    _is_cached: function (p) {
        return !!this.cache[p.getRequestId()];
    },

    _get_cached: function (p) {
        if (this.cache.hasOwnProperty(p.getId()))
            return this.cache[p.getId()];
        return null;
    },

    decache: function (p) {
        if (this.cache.hasOwnProperty(p.getId())) {
            var c = this.cache[p.getId()];
            delete this.cache[p.getId()];
            return c
        }
        return null;
    },

    _cache: function (p, c) {
        if (this.cache.hasOwnProperty(p.getId()))
            this.cache[p.getRequestId()].push(c);
        else
            this.cache[p.getRequestId()] = [c];
    },

    _lq_is_queued: function (p) {
        return this.lq.indexOf(p) >= 0;
    },

    _lq_dequeue: function (p) {
        var index = this.lq.indexOf(p);
        if (index >= 0)
            this.lq.splice(index, 1);
    },

    _lq_queue: function (p, shift) {
        if (shift)
            this.lq.unshift(p);
        else
            this.lq.push(p);
    },

    _hq_is_queued: function (p) {
        return this.hq.indexOf(p) >= 0;
    },

    _hq_dequeue: function (p) {
        var index = this.hq.indexOf(p);
        if (index >= 0)
            this.hq.splice(index, 1);
    },

    _hq_queue: function (p, shift) {
        if (shift)
            this.hq.unshift(p);
        else
            this.hq.push(p);
    },

    is_queued: function (p) {
        return this._lq_is_queued(p) || this._hq_is_queued(p);
    },

    _shift_hq_lq: function () {
        this.lq = $.merge(this.hq.splice(0, this.hq.length), this.lq);
    },

    _queue: function (p, priority) {
        if (this._is_cached(p)) {
            if (p.getParent().isExpanded() || this.load_all_mode)
                this._process_children(this.decache(p));
            return;
        }
        if (!p.isParent() || p.isBeingFetched() || p.isLoaded() || p.hasChildren())
            return;
        p.setQueuedLoading(true);
        if (priority) {
            if (!this._hq_is_queued(p)) {
                this._lq_dequeue(p);
                this._hq_queue(p, false);
            }
        } else {
            if (!this.is_queued(p)) {
                this._lq_queue(p, false);
            }
        }
    },

    queue: function (p, cb_func, cb_args, expand_node, cb_priority) {
        if (cb_priority || !this.cb_func || !this.cb_func.priority)
            this.cb_func = {func: cb_func, args: cb_args, priority: !!cb_priority};
        if (expand_node)
            this.expand_node = expand_node;
        this._shift_hq_lq();
        for (var i = 0; i < p.length; i++)
            this._queue(p[i].con, p[i].priority);
//        if (this.project.has_node())
//            this.project.get_node().render();
        this._run_queues();
    },

    _queue_all: function (con) {
        if (!con.isParent())
            return;
        var children = con.getChildren();
        for (var i = 0; i < children.length; i++) {
            this._queue(children[i], true);
            this._queue_all(children[i]);
        }
    },

    _load_all: function () {
        this.load_all_mode = true;
        this.processCache();
        this._queue_all(Project.getProject());
        if (this.hq.length > 0 || this.lq.length > 0) {
            this._run_queues();
        } else if (this._ajax_request.length == 0) {
            this.load_all_mode = false;
            if (this.cb_func && this.cb_func['func'] != null) {
                var cb = this.cb_func;
                this.cb_func = null;
                if (cb != null)
                    cb['func'](cb['args']);
                else
                    cb['func']();
            }
        }
    },

    load_all: function (cb_func, cb_args, expand_node, cb_priority) {
        if (!this.cb_func || !this.cb_func.priority)
            this.cb_func = {func: cb_func, args: cb_args, priority: !!cb_priority};
        if (expand_node)
            this.expand_node = expand_node;
        if (this._ajax_request.length > 0) {
            this.load_all_mode = true;
        } else {
            this._load_all();
        }
    },

    _run_queues: function () {
        if (this.hq.length > 0 && this._ajax_request.length < this.concurrent_request)
            this._run_hq();
        else if(this.lq.length > 0 && this._ajax_request.length == 0)
            this._run_lq();
        else
            if (this.cb_func && this.cb_func['func'] != null && this._ajax_request.length == 0) {
                if (this.cb_func['args'] != null)
                    this.cb_func['func'](this.cb_func['args']);
                else
                    this.cb_func['func']();
//                this.cb_func = null;
            }
    },

    _run_lq: function () {
        this.lq_running = true;
        this._process_queue(this.lq);
    },

    _run_hq: function () {
        this.hq_running = true;
        this._process_queue(this.hq);
    },

    _process_queue: function (queue) {
        var parentBatch;
        var batchSize;
        var parentIds = [];
        var query = '&parent_id=';

        if (queue.length == 0)
            return;

        if (queue == this.lq) {
            parentBatch = this.lq_cur;
            batchSize = this.lq_batch_size;
        } else if (this.load_all_mode) {
            parentBatch = this.hq_cur;
            batchSize = this.la_batch_size;
        } else {
            parentBatch = this.hq_cur;
            batchSize = this.hq_batch_size;
        }

        if (queue.length > batchSize)
            parentBatch = queue.splice(0, batchSize);
        else
            parentBatch = queue.splice(0, queue.length);

        for (var i = 0; i < parentBatch.length; i++) {
            parentBatch[i].setBeingFetched(true);
            parentBatch[i].setQueuedLoading(false);
            parentIds.push(parentBatch[i].getRequestId());
        }

        if (TVS.inUse())
            TVS.redraw();
        Project.renderAll();

        query += parentIds.join('&parent_id=');
        this._make_ajax_call(query, parentBatch);
    },

    _make_ajax_call: function (query, queue) {
        var url = ARTIFACT_URLS.concept + '?project=' + Project.getId() + '&json=true&' + query;
        comms.get({url: url, contentType: 'application/json',
            error: this._ajax_error, success: this._ajax_success, beforeSend: this._ajax_before_send,
            loader: this, queue: queue
        });
    },

    _ajax_before_send: function () {
        this.requeue = true;
        if (this.loader._ajax_request.length > 0) {
            for (var i = 0; i < this.loader._ajax_request.length; i++)
                this.loader._ajax_request[i].requeue = false;
        }
        this.loader._ajax_request.push(this);
    },

    _ajax_error: function (jqXHR, textStatus, errorThrown) {
        log.error('\nReason: ', jqXHR.getResponseHeader('reason'), '\nTextStatus: ', textStatus,
            '\nErrorThrown: ', errorThrown);
    },

    _ajax_success: function (data, textStatus, jqXHR) {
        var index = this.loader._ajax_request.indexOf(this);
        if (index >= 0) {
            this.loader._ajax_request.splice(index, 1);
        }
        if (jqXHR.responseText == null) {
            log.error('server did not return anything')
        } else {
            var non_parents = data['non_parents'];
            for (var i = 0; i < non_parents.length; i++) {
                var parent = Concept.get(non_parents[i]);
                if (!parent)
                    continue;
                parent.setBeingFetched(false);
                parent.setLoaded(false);
                parent.setIsParent(false);

                Project.renderAll();
            }

            var unprocced_parents = data['unprocced_parents'];
            var children = data['children'];
            if (unprocced_parents.length > 0)
                for (i = 0; i < unprocced_parents.length; i++)
                    this.loader._hq_queue(Concept.get(unprocced_parents[i]), true);
            this.loader._process_children(children, this.queue, this.requeue);
            this.loader._ajax_request.splice(this.loader._ajax_request.indexOf(this), 1);
            this.loader.lq_running = false;
            this.loader.hq_running = false;
        }
    },

    processCache: function () {
        var processedParents = [];
        var parent;

        $.each(this.cache, function (par_id, children) {
            for (var i = 0; i < children.length; i++) {
                if (children[i].link.length > 0) {
                    for (var j = 0; j < children[i].link.length; j++) {
                        if (Concept.get(children[i].link[j].parent)) {
                            var link_data = children[i].link[j];
                            parent = Concept.get(link_data.parent);
                        }
                    }
                    if (!parent)
                        throw 'Could not find link parent';
                    children[i].is_linked = true;
                } else {
                    parent = Concept.get(children[i].parent);
                }
                children[i].parent = parent;

                var new_concept = new Concept();
                new_concept.initConcept(children[i]);

                if (children[i].is_linked) {
                    link_data.parent = parent;
                    link_data.concept = new_concept;

                    var link = new LinkProxy();
                    link.initLinkProxy(link_data);
                    new_concept = link;
                }

                parent.addChild(new_concept);
                parent.getChildren().sort(function (c1, c2){
                    if (c1.getInitIndex() > c2.getInitIndex())
                        return 1;
                    else if (c1.getInitIndex() < c2.getInitIndex())
                        return -1;
                    else
                        return 0;
                });
                if (TVS.inUse())
                    TVS.createNode(new_concept);
                processedParents.push(parent);
            }
            for (i = 0; i < processedParents.length; i++)
                processedParents[i].setBeingFetched(false);
                if (!Page.navActive() && !processedParents[i].isRoot())
                    ConceptEventListener.expandNoNav(processedParents[i]);
        });

        CollaborationUser.activateAll();
        this.cache = {};
    },

    _process_children: function (children, queue, requeue) {
        if (!children)
            return;

        var processedParents = [];    // Processed Parents
        var parent;          // Parent
        var new_concept;
        var link;
        var link_data;
        var self = this;

        var parents = {};
        for (var i = 0; i < queue.length; i++)
            parents[queue[i].getRequestId()] = queue[i];

        function proc_chil (child) {
            if (!child)
                return;
            if (child.link.length > 0) {
                for (var i = 0; i < child.link.length; i++) {
                    if (parents[child.link[i].parent]) {
                        link_data = child.link[i];
                        parent = parents[link_data.parent];
                    }
                }
                if (!parent)
                    throw 'Could not find link parent';
                child.is_linked = true;
            } else {
                parent = parents[child.parent];
            }

            if (!parent.isRoot() && !self.load_all_mode &&  self.cache_children  &&
                    !parent.getParent().isExpanded()) {
                self._cache(parent, child);
                parent.setBeingFetched(false);
            } else {
                child.parent = parent;

                new_concept = new Concept();
                new_concept.initConcept(child);

                if (child.is_linked) {
                    link_data.parent = parent;
                    link_data.concept = new_concept;

                    link = new LinkProxy();
                    link.initLinkProxy(link_data);
                    new_concept = link;
                }

                parent.addChild(new_concept);
                parent.getChildren().sort(function (c1, c2){
                    if (c1.getInitIndex() > c2.getInitIndex())
                        return 1;
                    else if (c1.getInitIndex() < c2.getInitIndex())
                        return -1;
                    else
                        return 0;
                });
                if (self.stay_ahead)
                    if (new_concept.isParent() && new_concept.getDepthFromExpanded() <= 2 )
                        if (!self._lq_is_queued(new_concept))
                            self._lq_queue(new_concept);

                if (Page.depthLimited())
                    if (new_concept.getDepth() >= Page.getDepthLimit())
                        new_concept.setIsParent(false);

                if (TVS.inUse())
                    TVS.createNode(new_concept);

                processedParents.push(parent);
                parent = null;
            }
        }

        function cleanup () {
            for (var i = 0; i < processedParents.length; i++) {
                processedParents[i].setBeingFetched(false);
                processedParents[i].setLoaded(true);
                if (!Page.navActive() && !processedParents[i].isRoot())
                    ConceptEventListener.expandNoNav(processedParents[i]);
            }

            if (Document.getCurrent().getState() != Document.STATE_PRESENTATION)
                Project.renderAll();
            CollaborationUser.activateAll();
        }

        function rerun () {
            if (self.load_all_mode)
                self._load_all();
            else if (requeue)
                self._run_queues();
        }

        var index = 0;
        var timeout = this.hq_timeout;
        if (queue == this.lq)
            timeout = this.lq_timeout;
        var interval = setInterval(function () {
            if (Page.getDebugLevel() >= 3 ) {
                if (children.length > 0)
                    proc_chil(children[index]);
                index++;
                if (index >= children.length) {
                    clearInterval(interval);
                    cleanup();
                    rerun();
                }
            } else {
                try {
                    if (children.length > 0)
                        proc_chil(children[index]);
                    index++;
                    if (index >= children.length) {
                        clearInterval(interval);
                        cleanup();
                        rerun();
                    }
                } catch (error) {
                    clearInterval(interval);
                    rerun();
                    throw error;
                }
            }
        }, timeout);
    }
};
