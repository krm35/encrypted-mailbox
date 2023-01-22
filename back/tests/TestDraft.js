const {strictEqual} = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const openpgp = require('openpgp');
const c = require("../constants");
const w = require("../words");
const mongo = require("../mongo");
const redis = require("../redis");
const {checkMails} = require("./utilities");
const {build, compose, httpPost, httpGet, wait, query, waitMongo} = require("./utilities");
const {encryptMail} = require("../utilities/commons");

let error, data;

(async () => {

    const email = Date.now() + c.domain;
    const {publicKey} = await openpgp.generateKey({rsaBits: 2048, userIDs: [{email}], passphrase: email});
    await redis.set(email + "publicKey", publicKey);
    const session = crypto.randomBytes(128).toString('hex');
    await waitMongo(mongo);
    await redis.set("session" + session, email);
    await mongo[0].collection('users').insertOne({email, publicKey});

    ({error} = await httpPost('/upload?action=draft', session, false, null, "test"));
    strictEqual(error, true);

    data = compose(email, [email]);

    ({error} = await httpPost('/upload?action=draft', session, false, null, await build(data)));
    strictEqual(error, true);

    await httpPost('/upload?action=draft', session, false, null, await encryptMail(await build(data), [publicKey]));
    await wait(200);
    data = await mongo[0].collection('drafts').find({'headers.from.value.address': email}).toArray();
    strictEqual(data.length, 1);
    [data] = data;
    const {attachments} = data;
    strictEqual(attachments.length, 1);
    strictEqual(typeof attachments[0].content, "string");
    strictEqual(attachments[0].contentType, "application/octet-stream");
    strictEqual(fs.existsSync(c.__dirname + attachments[0].content), true);

    const id = "" + data._id;

    await checkMails('/drafts', 1, session);

    await redis.set("session" + session + "2", "othermail" + c.domain);

    ({error, data} = await httpGet('/delete-draft' + query({id}), session + "2"));
    strictEqual(error, true);
    strictEqual(data, w.UNKNOWN_ERROR);

    ({error} = await httpGet('/delete-draft' + query({id}), session));
    strictEqual(error, false);
    strictEqual(fs.existsSync(c.__dirname + attachments[0].content), false);

    await checkMails('/drafts', 0, session);

    process.exit(0);
})();