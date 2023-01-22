const {SMTPServer} = require("smtp-server");
const fs = require('fs');
const DKIM = require('dkim');
const redis = require('../redis');
const mongo = require('../mongo');
const c = require('../constants');
const {getDocuments, saveAttachments, encryptMail, parseMail, isEncrypted, event} = require('../utilities/commons');
const users = {};

setTimeout(async function () {
    await getDocuments(null, {}, "users", function (err, res) {
        res.documents.forEach(d => users[d.email] = d.publicKey);
    }, {});
}, 1000);

const server = new SMTPServer({
    ...(!c.ssl ? {} : {
        secure: c.ssl,
        key: fs.readFileSync(c.sslKey),
        cert: fs.readFileSync(c.sslCert),
    }),
    onData(stream, session, callback) {
        if (!stream.buffers) stream.buffers = [];
        stream.on('data', d => stream.buffers.push(d));
        stream.on('end', () => {
            const message = Buffer.concat(stream.buffers);
            DKIM.verify(message, async (err, result) => {
                try {
                    const email = await parseMail(message);
                    const publicKeys = await getPublicKeys(email);
                    for (let {address, publicKey} of publicKeys) {
                        if (!publicKey) continue;
                        const parsed = isEncrypted(email) ? await parseMail(message) :
                            await parseMail(await encryptMail(message, [publicKey]));
                        parsed.dkim = result;
                        const to = parsed.headers.get("to").value.filter(({address}) => !address.endsWith(c.domain));
                        to.push({address, name: ''});
                        parsed.headers.get("to").value = to;
                        saveAttachments(parsed);
                        await mongo[0].collection("mailbox").insertOne(parsed);
                        event(address, 'Mailbox', parsed);
                    }
                    callback(null, 'OK');
                } catch (e) {
                    callback(true);
                }
            });
        })
    },
    disabledCommands: ['AUTH']
});

server['on']("error", () => {

});

server.listen(c.smtpPort, c.host);

function getPublicKeys(parsed) {
    return new Promise(async resolve => {
        const publicKeys = [];
        for (const {address} of parsed.to.value) {
            if (address.endsWith(c.domain)) {
                const publicKey = users[address] ||
                    await redis.get(address + "publicKey") ||
                    (await mongo[0].collection('users').findOne({email: address})).publicKey;
                if (!users[address]) users[address] = publicKey;
                publicKeys.push({address, publicKey});
            }
        }
        resolve(publicKeys);
    })
}
