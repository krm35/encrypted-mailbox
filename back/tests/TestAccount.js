const {strictEqual} = require('assert');
const openpgp = require('openpgp');
const w = require("../words");
const mongo = require("../mongo");
const redis = require("../redis");
const {httpGet, query, waitMongo} = require("./utilities");

let error, data;

(async () => {

    await waitMongo(mongo);
    const email = Date.now() + "@mail.com", passphrase = "rgezfgnbezgloergezer98479za4é";

    const {privateKey, publicKey} = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 2048,
        userIDs: [{email}],
        passphrase
    });

    let encryptedPassphrase = await openpgp.encrypt({
        message: await openpgp.createMessage({text: passphrase}),
        passwords: ["password"]
    });

    for (const body of [{email}, {email, privateKey}, {email, publicKey}, {email, encryptedPassphrase}]) {
        ({error, data} = await httpGet('/signup' + query(body)));
        strictEqual(error, true);
    }

    ({error} = await httpGet('/signup' + query({email, privateKey, publicKey, encryptedPassphrase})));
    strictEqual(error, false);

    const user = await mongo[0].collection('users').findOne({email});
    strictEqual(user.email, email);
    strictEqual(user.privateKey, privateKey);
    strictEqual(user.publicKey, publicKey);
    strictEqual(user.encryptedPassphrase, encryptedPassphrase);

    ({error, data} = await httpGet('/signin' + query({})));
    strictEqual(error, true);
    strictEqual(data, w.INVALID_EMAIL);

    ({error, data} = await httpGet('/signin' + query({email})));
    strictEqual(error, false);
    strictEqual(data.encryptedPassphrase, encryptedPassphrase);
    strictEqual(JSON.stringify({email, publicKey}), await redis.get("session" + data.token));

    const {token} = data;

    ({error} = await httpGet('/sign' + query({})));
    strictEqual(error, true);

    const message = await openpgp.createCleartextMessage({text: data['token']});
    // noinspection JSCheckFunctionSignatures
    const text = await openpgp.sign({
        message, signingKeys: await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({armoredKey: data['privateKey']}),
            passphrase
        })
    });

    ({error} = await httpGet('/sign' + query({text})));
    strictEqual(error, true);

    ({error} = await httpGet('/sign' + query({token: "randomToken", text})));
    strictEqual(error, true);

    await redis.set("session" + token, JSON.stringify({
        email, publicKey: (await openpgp.generateKey({
            type: 'rsa',
            rsaBits: 2048,
            userIDs: [{email}],
            passphrase: "euh"
        })).publicKey
    }));

    ({error} = await httpGet('/sign' + query({token, text})));
    strictEqual(error, true);

    await redis.set("session" + token, JSON.stringify({email, publicKey}));

    ({error} = await httpGet('/sign' + query({token, text})));
    strictEqual(error, false);

    ({error, data} = await httpGet('/sign' + query({token, text})));
    strictEqual(error, false);

    const session = data;

    ({error} = await httpGet('/password' + query({}), session));
    strictEqual(error, true);

    ({error} = await httpGet('/password' + query({
        encryptedPassphrase: "encryptedPassphrase"
    }), session));
    strictEqual(error, true);

    ({error} = await httpGet('/password' + query({
        encryptedPassphrase: await openpgp.encrypt({
            message: await openpgp.createMessage({text: passphrase}),
            passwords: ["newPassword"]
        })
    }), session));
    strictEqual(error, true);

    ({error} = await httpGet('/password' + query({
        currentEncryptedPassphrase: encryptedPassphrase,
        encryptedPassphrase: await openpgp.encrypt({
            message: await openpgp.createMessage({text: passphrase}),
            passwords: ["newPassword"]
        })
    }), session));
    strictEqual(error, false);

    process.exit(0);
})();

