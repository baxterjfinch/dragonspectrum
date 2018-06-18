function StatusChecker (url, callback, interval) {
    this.interval_id = null;
    this.url = url;
    this.callback = callback;
    this.interval = StatusChecker.interval;
    this.status = StatusChecker.NOT_STATED;
    this.report_error = false;

    this.count = 0; // Used by caller

    if (interval)
        this.interval = interval;

    StatusChecker.status_checkers.push(this);
}

StatusChecker.NOT_STATED = 'not started';
StatusChecker.STARTED = 'started';
StatusChecker.STOPPED = 'stopped';
StatusChecker.status_checkers = [];
StatusChecker.interval = 1000; // 1 Second

StatusChecker.prototype.start = function () {
    this.status = StatusChecker.STARTED;
    var self = this;
    this.interval_id = setInterval(function () {
        comms.get({
            url: self.url,
            success: function (data) {
                self.callback(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (self.report_error)
                    self.callback(jqXHR.status);
            }
        });
    }, this.interval)
};

StatusChecker.restart = function () {
    if (this.status == StatusChecker.NOT_STATED)
        throw 'was never started';
    else if (this.status == StatusChecker.STARTED)
        this.stop();
    this.start();

};

StatusChecker.prototype.setReportError = function (flag) {
    this.report_error = flag;
};

StatusChecker.prototype.stop = function () {
    this.status = StatusChecker.STOPPED;
    clearInterval(this.interval_id);
};

StatusChecker.prototype.getStatus = function () {
    return this.status
};

StatusChecker.prototype.getCount = function () {
    return this.count;
};

StatusChecker.prototype.setCount = function (count) {
    this.count = count;
};

StatusChecker.prototype.incCount = function () {
    this.count++;
};