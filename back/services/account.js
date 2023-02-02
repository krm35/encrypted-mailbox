const crypto = require('crypto'),
    openpgp = require('openpgp'),
    mongo = require('../mongo'),
    w = require('../words'),
    c = require('../constants'),
    router = require('../router'),
    redis = require('../redis'),
    {getSessionCookie} = require('../utilities/checkClient');

router['noUserCheck']['sign'] = true;
router['noUserCheck']['signin'] = true;
router['noUserCheck']['signup'] = true;

router['signup'] = async (id, json, callback, args) => {
    if (!c.allowNonAdminSignUp && !args.admin) throw w.UNAUTHORIZED_OPERATION;
    let {email, privateKey, publicKey, encryptedPassphrase} = json;
    if (!email || !validateEmail(email) || email.length > 200) throw w.INVALID_EMAIL;
    email = email.toLowerCase();
    await openpgp.readKey({armoredKey: publicKey});
    await openpgp.readPrivateKey({armoredKey: privateKey});
    await openpgp.readMessage({armoredMessage: encryptedPassphrase});
    await mongo[0].collection('users').insertOne({email, privateKey, publicKey, encryptedPassphrase}, async (err) => {
        if (err) return callback(true, err.code === 11000 ? w.EMAIL_TAKEN : w.UNKNOWN_ERROR);
        if (args.skipCookie) return callback(false, email);
        await generateCookie({email}, callback, args);
    });
};

router['signin'] = async (id, json, callback) => {
    const {email} = json;
    if (!email) throw w.INVALID_EMAIL;
    const user = await mongo[0].collection('users').findOne({email});
    if (!user) throw w.INVALID_EMAIL;
    let {publicKey, privateKey, encryptedPassphrase, admin} = user;
    const token = crypto.randomBytes(14).toString('hex');
    await redis.set("session" + token, JSON.stringify({email, publicKey}));
    callback(false, {token, publicKey, privateKey, encryptedPassphrase, admin});
};

router['sign'] = async (id, json, callback, args) => {
    const {token, text} = json;
    const {email, publicKey, admin} = JSON.parse(await redis.get("session" + token));
    await checkSignature(text, publicKey);
    await redis.set(email + "publicKey", publicKey);
    await generateCookie({email, admin}, callback, args);
};

router['logout'] = async (id, json, callback, args) => {
    if (!id) throw w.UNKNOWN_ERROR;
    const token = getSessionCookie(args.req['headers']);
    if (token) await redis.del("login" + token);
    args.res['headerWritten'] = {
        "Set-Cookie": "session=; HttpOnly; SameSite=Strict; Secure; expires=Thu, 01 Jan 1970 00:00:00 GMT;"
    };
    callback(false);
};

router['password'] = async (id, json, callback) => {
    const {currentEncryptedPassphrase, encryptedPassphrase} = json;
    const user = await mongo[0].collection('users').findOne({email: id});
    if (user.encryptedPassphrase !== currentEncryptedPassphrase) throw w.UNAUTHORIZED_OPERATION;
    await openpgp.readMessage({armoredMessage: encryptedPassphrase});
    await mongo[0].collection('users').updateOne({email: id}, {$set: {encryptedPassphrase}});
    callback(false);
};

async function checkSignature(text, publicKey) {
    const verificationResult = await openpgp.verify({
        message: await openpgp.readCleartextMessage({cleartextMessage: text}),
        verificationKeys: await openpgp.readKey({armoredKey: publicKey})
    });

    if (!verificationResult.signatures.length) throw w.INVALID_PASSWORD;

    try {
        await verificationResult.signatures[0].verified;
    } catch (e) {
        throw w.INVALID_PASSWORD;
    }
}

function validateEmail(email) {
    // noinspection RegExpRedundantEscape
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

async function generateCookie(user, callback, args) {
    const session = crypto.randomBytes(128).toString('hex');
    await redis.set("session" + session, JSON.stringify(user));
    args.res['headerWritten'] = {
        "Set-Cookie": "session=" + session + "; HttpOnly; path=/; SameSite=Strict; Secure;"
    };
    callback(false, session);
}