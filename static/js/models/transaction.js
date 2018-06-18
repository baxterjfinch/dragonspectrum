function Transaction () {
    SecureArtifact.call(this);
    this.user = null;
    this.artifact = null;
    this.artifact_id = null;
    this.action = null;
    this.action_data = null;
    this.undone = false;
}

Transaction.prototype = Object.create(SecureArtifact.prototype);
Transaction.prototype.constructor = Transaction;

Transaction.transactions = [];
Transaction.transactions_by_id = {};

Transaction.prototype.initializeTransaction = function (trans) {
    this.initSecureArtifact(trans);

    this.user = trans.user;
    this.action = trans.action;
    this.action_data = trans.action_data;
    this.artifact_id = trans.artifact;

    Transaction.add(this);
};

Transaction.prototype.setUser = function (user) {
    this.user = user;
};

Transaction.prototype.getUser = function () {
    return this.user;
};

Transaction.prototype.setArtifact = function (artifact) {
    this.artifact = artifact;
};

Transaction.prototype.getArtifact = function () {
    return this.artifact;
};

Transaction.prototype.setArtifactId = function (artifact_id) {
    this.artifact_id = artifact_id;
};

Transaction.prototype.getArtifactId = function () {
    return this.artifact_id;
};

Transaction.prototype.setAction = function (action) {
    this.action = action;
};

Transaction.prototype.getAction = function () {
    return this.action;
};

Transaction.prototype.setActionData = function (action_data) {
    this.action_data = action_data;
};

Transaction.prototype.getActionData = function () {
    return this.action_data;
};

Transaction.prototype.setUndone = function (flag) {
    this.undone = flag;
};

Transaction.prototype.isUndone = function () {
    return this.undone;
};

Transaction.get = function (id) {
    return Transaction.transactions_by_id[id];
};

Transaction.add = function (trans) {
    Transaction.transactions.push(trans);
    Transaction.transactions_by_id[trans.getId()] = trans;
};

Transaction.remove = function (trans) {
    var index = Transaction.transactions.indexOf(trans);
    if (index >= 0)
        Transaction.transactions.splice(index, 1);

    if (Transaction.transactions_by_id[trans.getId()] != null)
    delete Transaction.transactions_by_id[trans.getId()];
};