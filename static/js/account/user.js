function User() {
    this.id = null;
    this.user_id = null;
    this.is_org_admin = null;
    this.is_super_admin = null;
    this.organization = null;
    this.username = null;
    this.account_expire_date = null;
    this.account_status = null;
    this.account_type = null;
    this.address = null;
    this.birthday = null;
    this.display_name = null;
    this.email = null;
    this.email_changed = null;
    this.first_name = null;
    this.last_name = null;
    this.full_name = null;
    this.groups = [];
    this.last_login_timestamp = null;
    this.modified_timestamp = null;
    this.password_expiration_timestamp = null;
    this.phone_numbers = null;
    this.registration_timestamp = null;
    this.require_password_change = null;
    this.tour_home_complete = null;
    this.tour_project_complete = null;
}

User.users = {};
User.current_user = null;

User.prototype.initCurrentUser = function (user) {
    this.id = user.id;
    this.user_id = user.user_id;
    this.is_org_admin = user.is_admin;
    this.is_super_admin = user.is_super_admin;
    this.organization = user.organization;
    this.username = user.username;
    this.account_expire_date = user.account_expire_date;
    this.account_status = user.account_status;
    this.account_type = user.account_type;
    this.address = user.address;
    this.birthday = user.birthday;
    this.display_name = user.display_name;
    this.email = user.email;
    this.email_changed = user.email_changed;
    this.first_name = user.first_name;
    this.last_name = user.last_name;
    this.full_name = user.full_name;
    this.spectra_count = user.spectra_count;
    this.ddss = user.ddss;

    // Set this here to group initiation
    User.users[this.getId()] = this;
    User.current_user = this;

    for (var i = 0; i < user.groups.length; i++)
        this.groups.push(Group.getOrCreate(user.groups[i]));

    this.last_login_timestamp = user.last_login_timestamp;
    this.modified_timestamp = user.modified_ts;
    this.password_expiration_timestamp = user.password_expiration_date;
    this.phone_numbers = user.phone_numbers;
    this.registration_timestamp = user.registration_date;
    this.require_password_change = user.require_password_change;
    this.tour_home_complete = user.tour_home_complete;
    this.tour_project_complete = user.tour_project_complete;
};

User.prototype.setId = function (id) {
    this.id = id;
};

User.prototype.getId = function () {
    return this.id;
};

User.prototype.setUserId = function (id) {
    this.user_id = id;
};

User.prototype.getUserId = function () {
    return this.user_id;
};

User.prototype.setIsOrgAdmin = function (flag) {
    this.is_org_admin = flag;
};

User.prototype.isOrgAdmin = function (artifact) {
    if (artifact && this.getOrganization() != artifact.getOrganization())
        return false;
    return this.is_org_admin;
};

User.prototype.setIsSuperAdmin = function (flag) {
    this.is_super_admin = flag;
};

User.prototype.isSuperAdmin = function () {
    return this.is_super_admin;
};

User.prototype.isAdmin = function (artifact) {
    return this.isOrgAdmin(artifact) || this.isSuperAdmin();
};

User.prototype.setOrganization = function (org) {
    this.organization = org;
};

User.prototype.getOrganization = function () {
    return this.organization;
};

User.prototype.setUsername = function (username) {
    this.username = username;
};

User.prototype.getUserName = function () {
    return this.username;
};

User.prototype.setSpectraCount = function (spectra_count) {
    this.spectra_count = spectra_count;
};

User.prototype.getSpectraCount = function () {
    return this.spectra_count;
};


User.prototype.setAccountExpireTs = function (ts) {
    this.account_expire_date = ts;
};

User.prototype.getAccountExpireTs = function () {
    return this.account_expire_date;
};

User.prototype.setAccountStatus = function (status) {
    this.account_status = status;
};

User.prototype.getAccountStatus = function () {
    return this.account_status;
};

User.prototype.setAccountType = function (type) {
    this.account_type = type;
};

User.prototype.getAccountType = function () {
    return this.account_type;
};

User.prototype.setAddress = function (address) {
    this.address = address;
};

User.prototype.getAddress = function () {
    return this.address;
};

User.prototype.setBirthday = function (day) {
    this.birthday = day;
};

User.prototype.getBirthDay = function () {
    return this.birthday;
};

User.prototype.setDisplayName = function (name) {
    this.display_name = name;
};

User.prototype.getDisplayName = function () {
    return this.display_name;
};

User.prototype.setEmail = function (email) {
    this.email = email;
};

User.prototype.getEmail = function () {
    return this.email;
};

User.prototype.setEmailChanged = function (flag) {
    this.email_changed = flag;
};

User.prototype.getEmailChanged = function () {
    return this.email_changed;
};

User.prototype.setFirstName = function (name) {
    this.first_name = name;
};

User.prototype.getFirstName = function () {
    return this.first_name;
};

User.prototype.setLastName = function (name) {
    this.last_name = name;
};

User.prototype.getLastName = function () {
    return this.last_name;
};

User.prototype.setFullName = function (name) {
    this.full_name = name;
};

User.prototype.getFullName = function () {
    return this.full_name;
};

User.prototype.setGroups = function (groups) {
    this.groups = groups;
};

User.prototype.getGroups = function () {
    return this.groups;
};

User.prototype.setLastLoginTs = function (ts) {
    this.last_login_timestamp = ts;
};

User.prototype.getLastLoginTs = function () {
    return this.last_login_timestamp;
};

User.prototype.setModifiedTs = function (ts) {
    this.modified_timestamp = ts;
};

User.prototype.getModifiedTs = function () {
    return this.modified_timestamp;
};

User.prototype.setPasswordExpirationTs = function (ts) {
    this.password_expiration_timestamp = ts;
};

User.prototype.getPasswordExpirationTs = function () {
    return this.password_expiration_timestamp;
};

User.prototype.setPhoneNumbers = function (numbers) {
    this.phone_numbers = numbers;
};

User.prototype.getPhoneNumbers = function () {
    return this.phone_numbers;
};

User.prototype.setRegistrationTs = function (ts) {
    this.registration_timestamp = ts;
};

User.prototype.getRegistrationTs = function () {
    return this.registration_timestamp;
};

User.prototype.setRequirePasswordChange = function (flag) {
    this.require_password_change = flag;
};

User.prototype.getRequirePasswordChange = function () {
    return this.require_password_change;
};

User.prototype.setTourHomeComplete = function (flag) {
    this.tour_home_complete = flag;
};

User.prototype.getTourHomeComplete = function () {
    return this.tour_home_complete;
};

User.prototype.setTourProjectComplete = function (flag) {
    this.tour_project_complete = flag;
};

User.prototype.getTourProjectComplete = function () {
    return this.tour_project_complete;
};

User.prototype.isAnonymous = function () {
    return this.getUserName() == 'anonymous';
};

User.get = function (id) {
    if (User.users.hasOwnProperty(id))
        return User.users[id];
    return null;
};

User.getCurrent = function () {
    return User.current_user
};