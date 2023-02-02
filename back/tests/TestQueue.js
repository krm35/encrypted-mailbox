const {strictEqual} = require('assert');
const redis = require("../redis");
const mongo = require("../mongo");
const {waitMongo, httpGet, build, compose, wait} = require("./utilities");

(async () => {
    await waitMongo(mongo);
    const [user] = await mongo[0].collection('users').find({}).sort({_id: -1}).limit(1).toArray();
    const email = Date.now() + user.email;
    const message = (await build(compose(email, ["friend@friend.com"]))).toString();
    await redis.set("session" + email, JSON.stringify({email}));
    await redis.set(email + "publicKey", user.publicKey);
    let {data} = await httpGet('/sent', email);
    const {count} = data;
    await redis.lpush("queue", JSON.stringify({id: email, message}));
    await wait(1000);
    ({data} = await httpGet('/sent', email));
    strictEqual(data.count - 1, count);
    process.exit(0);
})();