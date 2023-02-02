const mongo = require('../mongo'),
    w = require('../words'),
    router = require('../router'),
    {getDocuments} = require('../utilities/commons');

router['admin'] = async (id, json, callback, args) => {
    isAdmin(id, args.admin);
    const {route} = json;
    await adminRoutes[route](id, json, callback, args);
};

const adminRoutes = {};

adminRoutes['users'] = async (id, json, callback) => {
    await getDocuments(id, json, "users", callback);
};

adminRoutes['update'] = async (id, json, callback) => {
    const {email, admin} = json;
    await mongo[0].collection("users").updateOne({email}, {$set: {admin: admin === true}});
    callback(false);
};

adminRoutes['signup'] = async (id, json, callback, args) => {
    await router['signup'](id, json, callback, {...args, skipCookie: false});
};

function isAdmin(email, admin) {
    if (isDefaultAdmin(email)) return true;
    if (!admin) throw w.UNAUTHORIZED_OPERATION;
}

function isDefaultAdmin(email) {
    return email.startsWith("admin@");
}