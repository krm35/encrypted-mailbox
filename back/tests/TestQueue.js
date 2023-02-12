const {strictEqual} = require('assert');
const redis = require("../redis");
const mongo = require("../mongo");
const c = require("../constants");
const {waitMongo, httpGet, build, compose, wait} = require("./utilities");

(async () => {
    await waitMongo(mongo);
    const [user] = await mongo[0].collection('users').find({}).sort({_id: -1}).limit(1).toArray();
    const email = Date.now() + user.email;
    const message = (await build(compose(email, ["friend@friend.com"]))).toString();
    await redis.set("session" + email, JSON.stringify({email}));
    await redis.set(email + "publicKey", user.publicKey);
    let {data} = await httpGet('/sent', email);
    let {count} = data;
    await redis.lpush("email", JSON.stringify({id: email, message}));
    await wait(1000);
    ({data} = await httpGet('/sent', email));
    strictEqual(count + 1, data.count);
    await redis.lpush("email", JSON.stringify({
        id: email, message: {from: email, to: "friend@friend.com"}
    }));
    await wait(1000);
    ({data} = await httpGet('/sent', email));
    strictEqual(count + 2, data.count);

    const from = "no-reply" + c.domain;
    await redis.set("session" + from, JSON.stringify({email: from}));
    await redis.set(from + "publicKey", user.publicKey);
    ({data} = await httpGet('/sent', from));
    ({count} = data);
    await redis.lpush("email", JSON.stringify({message: {from, to: "friend@friend.com"}}));
    await wait(1000);
    ({data} = await httpGet('/sent', from));
    strictEqual(count + 1, data.count);
    await redis.lpush("email", JSON.stringify({message: {from, to: "friend@friend.com", pgp: user.publicKey}}));
    await wait(1000);
    ({data} = await httpGet('/sent', from));
    strictEqual(count + 2, data.count);
    process.exit(0);
})();