const {strictEqual} = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const openpgp = require('openpgp');
const c = require("../constants");
const mongo = require("../mongo");
const redis = require("../redis");
const {checkMails} = require("./utilities");
const {httpPost, wait, waitMongo} = require("./utilities");
const {build} = require("./utilities");
const {compose} = require("./utilities");
const {encryptMail} = require("../utilities/commons");

let error, data;

(async () => {

    await waitMongo(mongo);
    const email = Date.now() + c.domain;
    const {publicKey} = await openpgp.generateKey({rsaBits: 2048, userIDs: [{email}], passphrase: email});
    await redis.set(email + "publicKey", publicKey);
    await mongo[0].collection('users').insertOne({email, publicKey});
    const session = crypto.randomBytes(128).toString('hex');
    await redis.set("session" + session, email);

    ({error} = await httpPost('/upload?action=send', session, false, null, "test"));
    strictEqual(error, true);


    /*******send to myself******/
    data = compose(email, [email]);
    await httpPost('/upload?action=send', session, false, null, await build(data));
    await wait(200);
    for (const collection of ['mailbox', 'sent']) {
        for (const p of ['from', 'to']) {
            data = await mongo[0].collection(collection).find({['headers.' + p + '.value.address']: email}).toArray();
            strictEqual(data.length, 1);
            strictEqual(data[0].attachments.length, 1);
        }
    }
    let {content, contentType, filename} = data[0].attachments[0];
    strictEqual(fs.existsSync(c.__dirname + content), true);
    strictEqual(typeof content, "string");
    strictEqual(contentType, "application/octet-stream");
    strictEqual(filename, "encrypted.asc");
    await checkMails('/mailbox', 1, session);
    await checkMails('/sent', 1, session);
    /*******send to myself******/


    /*******send to myself encrypted******/
    data = compose(email, [email]);
    await httpPost('/upload?action=send', session, false, null, await encryptMail(await build(data), [publicKey]));
    await wait(200);
    for (const collection of ['mailbox', 'sent']) {
        data = await mongo[0].collection(collection).find({'headers.from.value.address': email}).toArray();
        strictEqual(data.length, 2);
        // strictEqual(data[1].attachments.length, 2);
        strictEqual(data[1].attachments.length, 1);
        strictEqual(typeof data[1].attachments[0].content, "string");
        // strictEqual(data[1].attachments[0].contentType, "application/pgp-encrypted");
        // strictEqual(data[1].attachments[1].contentType, "application/octet-stream");
        strictEqual(data[1].attachments[0].contentType, "application/octet-stream");
    }
    await checkMails('/mailbox', 2, session);
    await checkMails('/sent', 2, session);
    /*******send to myself encrypted******/


    /*******send to a friend******/
    const friend = Date.now() + "@friend.com";
    await redis.set(friend + "publicKey", publicKey);
    data = compose(email, [friend]);
    await httpPost('/upload?action=send', session, false, null, await build(data));
    await wait(300);
    data = await mongo[0].collection('sent').find({'headers.to.value.address': friend}).toArray();
    strictEqual(data.length, 1);
    data = await mongo[0].collection('sent').find({'headers.from.value.address': email}).toArray();
    strictEqual(data.length, 3);
    strictEqual(data[2].attachments.length, 1);
    ({content, contentType, filename} = data[2].attachments[0]);
    strictEqual(typeof content, "string");
    strictEqual(contentType, "application/octet-stream");
    strictEqual(filename, "encrypted.asc");
    strictEqual(fs.existsSync(c.__dirname + content), true);
    await checkMails('/mailbox', 2, session);
    await checkMails('/sent', 3, session);
    /*******send to a friend******/


    /*******send to a friend encrypted******/
    data = compose(email, [friend]);
    await httpPost('/upload?action=send', session, false, null, await encryptMail(await build(data), [publicKey]));
    await wait(250);
    data = await mongo[0].collection('sent').find({'headers.to.value.address': friend}).toArray();
    strictEqual(data.length, 2);
    data = await mongo[0].collection('sent').find({'headers.from.value.address': email}).toArray();
    strictEqual(data.length, 4);
    strictEqual(data[3].attachments.length, 1);
    ({content, contentType, filename} = data[3].attachments[0]);
    strictEqual(fs.existsSync(c.__dirname + content), true);
    strictEqual(typeof content, "string");
    strictEqual(contentType, "application/octet-stream");
    strictEqual(filename, "encrypted.asc");
    await checkMails('/mailbox', 2, session);
    await checkMails('/sent', 4, session);
    /*******send to a friend encrypted******/


    /*******send to friends same domain******/
    const friends = ["friend1" + Date.now() + c.domain, "friend2" + Date.now() + c.domain];
    for (const f of friends) {
        await redis.set(f + "publicKey", publicKey);
        await redis.set("session" + f, f);
    }
    data = compose(email, friends);
    await httpPost('/upload?action=send', session, false, null, await build(data));
    await wait(260);
    for (const f of friends) {
        data = await mongo[0].collection('mailbox').find({'headers.to.value.address': f}).toArray();
        strictEqual(data.length, 1);
        strictEqual(data[0].headers.to.value.length, 1);
        strictEqual(data[0].headers.to.text, friends[0] + ", " + friends[1]);
    }
    data = await mongo[0].collection('sent').find({'headers.from.value.address': email}).toArray();
    strictEqual(data.length, 5);
    strictEqual(data[4].attachments.length, 1);
    ({content, contentType, filename} = data[4].attachments[0]);
    strictEqual(fs.existsSync(c.__dirname + content), true);
    strictEqual(typeof content, "string");
    strictEqual(contentType, "application/octet-stream");
    strictEqual(filename, "encrypted.asc");
    await checkMails('/mailbox', 2, session);
    await checkMails('/sent', 5, session);
    for (const f of friends) {
        await checkMails('/mailbox', 1, f);
        await checkMails('/sent', 0, f);
    }
    /*******send to friends same domain******/


    process.exit(0);
})();