const {strictEqual} = require('assert');
const openpgp = require('openpgp');
const w = require("../words");
const mongo = require("../mongo");
const redis = require("../redis");
const {httpGet, query, waitMongo} = require("./utilities");

let error, data;

(async () => {
    await waitMongo(mongo);
    const [user] = await mongo[0].collection('users').find({}).sort({_id: -1}).limit(1).toArray();
    const {email} = user;
    await redis.set("session" + email, JSON.stringify({email}));
    ({error, data} = await httpGet('/admin' + query({route: "users"}), email));
    strictEqual(error, true);
    strictEqual(data, w.UNAUTHORIZED_OPERATION);
    await redis.set("session" + email, JSON.stringify({email, admin: true}));
    ({error, data} = await httpGet('/admin' + query({route: "users"}), email));
    strictEqual(error, false);
    strictEqual(data.count !== undefined, true);
    strictEqual(Array.isArray(data.documents), true);

    ({error, data} = await httpGet('/signup' + query({})));
    strictEqual(error, true);
    strictEqual(data, w.INVALID_EMAIL);

    process.exit(0);
})();

