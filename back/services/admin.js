const mongo = require('../mongo'),
    w = require('../words'),
    router = require('../router'),
    {getDocuments} = require('../utilities/commons');

router['admin'] = async (id, json, callback, args) => {
    isAdmin(args);
    const {email, admin} = json;
    if (admin !== true && isDefaultAdmin(email)) throw w.UNAUTHORIZED_OPERATION;
    await mongo[0].collection("users").updateOne({email}, {$set: {admin: admin === true}});
    callback(false);
};

router['users'] = async (id, json, callback, args) => {
    isAdmin(args);
    await getDocuments(id, json, "users", callback);
};

function isAdmin({isAdmin}) {
    if (!isAdmin) throw w.UNAUTHORIZED_OPERATION;
}

function isDefaultAdmin(email) {
    return email.startsWith("admin@");
}