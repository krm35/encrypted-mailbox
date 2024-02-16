const {strictEqual} = require('assert');
const redis = require("../redis");
const mongo = require("../mongo");
const c = require("../constants");
const {waitMongo, httpGet, wait} = require("./utilities");

(async () => {
    await waitMongo(mongo);
    const [user] = await mongo[0].collection('users').find({}).sort({_id: -1}).limit(1).toArray();
    const {email} = user;
    await redis.set(email + "publicKey", user.publicKey);
    await redis.set("session" + email, JSON.stringify({email}));
    let {data} = await httpGet('/mailbox', email);
    const {count} = data;
    await redis.lpush("email", JSON.stringify({to: email}));
    await wait(1000);
    ({data} = await httpGet('/mailbox', email));
    strictEqual(count + 1, data.count);
    await redis.lpush("email", JSON.stringify({to: email, pgp: user.publicKey}));
    await wait(1000);
    ({data} = await httpGet('/mailbox', email));
    strictEqual(count + 2, data.count);
    strictEqual((await mongo[0].collection("queue").find({}).toArray()).length > 0, true);
    process.exit(0);
})();