const fs = require('fs'),
    crypto = require('crypto'),
    {simpleParser} = require('mailparser'),
    {ObjectId} = require('mongodb'),
    {Encrypter} = require("nodemailer-openpgp"),
    co = require('../constants'),
    sendmail = require('sendmail')(co.sendmailConf),
    mongo = require('../mongo'),
    {userEvents} = require('../servers/ws-server'),
    w = require('../words');

module.exports.encryptMail = (mail, encryptionKeys) => {
    return new Promise((resolve, reject) => {
        const signer = new Encrypter({encryptionKeys});
        const chunks = [];
        signer.on('data', chunk => chunks.push(chunk));
        signer.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        signer.on('error', () => reject(w.UNKNOWN_ERROR));
        signer.end(mail);
    });
};

module.exports.isEncrypted = (message) => {
    for (const a of message.attachments) {
        if (a.content.toString().includes("-----BEGIN PGP MESSAGE-----")) {
            return true;
        }
    }
    return false;
};

module.exports.parseMail = (message) => {
    return new Promise((resolve, reject) => {
        simpleParser(message, {}, (err, parsed) => {
            if (err) reject(w.UNKNOWN_ERROR);
            resolve(parsed);
        });
    });
};

module.exports.sendMail = (message) => {
    return new Promise((resolve, reject) => {
        let first;
        sendmail(message, (err) => {
            if (first) return;
            first = true;
            if (err) reject(w.UNKNOWN_ERROR);
            resolve();
        });
    });
};

module.exports.buildMessageFromBuffer = (json) => {
    let message = "";
    json.buffer.forEach(b => {
        if (b.length) message += Utf8ArrayToStr(b)
    });
    return message;
};

module.exports.saveAttachments = (parsed) => {
    const {attachments} = parsed;
    if (attachments && Array.isArray(attachments) && attachments.length) {
        parsed.attachments = attachments.filter(f => f.filename);
        parsed.attachments.forEach(f => {
            const id = crypto.randomBytes(14).toString('hex');
            fs.writeFileSync(co.__dirname + id, f.content);
            f.content = id;
        });
    }
};

module.exports.deleteMail = async (id, json, callback, collection, type, eventType) => {
    const _id = ObjectId(json.id);
    const draft = await mongo[0].collection(collection).findOne({_id, ['headers.' + type + '.value.address']: id});
    draft.attachments.forEach(a => fs.unlinkSync(co.__dirname + a.content));
    await mongo[0].collection(collection).deleteOne({_id});
    callback(false);
    draft.deleted = true;
    event(id, eventType, draft);
};

const Utf8ArrayToStr = (array) => {
    let out, i, len, c, char2, char3;
    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }

    // noinspection JSConstructorReturnsPrimitive
    return out;
};

module.exports.getDocuments = async (id, json, collection, callback, filter) => {
    let {page, items} = json;
    if (!page || isNaN(page)) page = 1;
    if (!items || isNaN(items) || items > 100) items = 25;
    let count = 0;
    const documents = [];
    const cursor = await mongo[0].collection(collection).find(filter);
    count += await cursor.count();
    await iterate(cursor, documents, page, items);
    callback(false, {count, documents})
};

const event = (address, type, parsed) => {
    parsed["t"] = ObjectId(parsed["_id"])['getTimestamp']();
    for (let id in userEvents[address]) {
        try {
            userEvents[address][id].send(JSON.stringify([type, parsed]))
        } catch (e) {

        }
    }
};

module.exports.event = event;

function iterate(cursor, documents, page, items) {
    return new Promise((resolve, reject) => {
        cursor.sort({_id: -1}).skip((page - 1) * items).limit(items * 1).forEach((doc) => {
            if (doc) {
                doc["t"] = ObjectId(doc["_id"])['getTimestamp']();
                documents.push(doc);
            }
        }, (err) => {
            if (err) reject(w.UNKNOWN_ERROR);
            else resolve();
        });
    })
}
