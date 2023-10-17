const {ObjectId} = require('mongodb'),
    router = require('../router'),
    w = require('../words'),
    redis = require('../redis'),
    mongo = require('../mongo'),
    {saveAttachments, getDocuments, encryptMail, parseMail, sendMail, isEncrypted, event, buildMessageFromBuffer, deleteMail} = require('../utilities/commons'),
    cors = require('../utilities/cors'),
    {sendAttachment} = require("../utilities/download");

const from = 'from', to = 'to', mailbox = 'mailbox', sent = 'sent', trash = 'trash', drafts = 'drafts';

router[mailbox] = async (id, json, callback) => {
    await getDocuments(id, json, mailbox, callback, {'headers.to.value.address': id});
};

router[sent] = async (id, json, callback) => {
    await getDocuments(id, json, sent, callback, {'headers.from.value.address': id});
};

router[trash] = async (id, json, callback) => {
    await getDocuments(id, json, trash, callback, {'headers.from.value.address': id});
};

router['drafts-trash'] = async (id, json, callback) => {
    await deleteMail(id, json, callback, drafts, from, 'Drafts', trash);
};

router['sent-trash'] = async (id, json, callback) => {
    await deleteMail(id, json, callback, sent, from, 'Sent', trash);
};

router['mailbox-trash'] = async (id, json, callback) => {
    await deleteMail(id, json, callback, mailbox, to, 'Mailbox', trash);
};

router['send'] = async (id, json, callback, args) => {
    const message = args.message || buildMessageFromBuffer(json);
    const parsed = await parseMail(message);
    if (!parsed || !parsed.from || parsed.from.value.length > 1 || parsed.from.value[0].address !== id) throw w.UNAUTHORIZED_OPERATION;
    const encrypted = isEncrypted(parsed);
    const encryptedMessage = encrypted ? parsed : await parseMail(await encryptMail(message, [await redis.get(id + "publicKey")]));
    const {to, subject, html, attachments} = parsed;
    // don't save encrypted email because the front makes a encrypted copy at first
    if (!encrypted) saveAttachments(encryptedMessage);
    await sendMail({from: id, to: to.text, subject, html, attachments});
    if (!encrypted) {
        await mongo[0].collection(sent).insertOne(encryptedMessage);
        event(id, 'Sent', encryptedMessage);
    }
    if (json.id) await deleteMail(id, json, callback, drafts, from, 'Drafts');
    else callback(false);
};

router['attachment'] = async (id, json, callback, args) => {
    const {_id, type, index} = json;
    const email = await mongo[0].collection(type || mailbox).findOne({_id: ObjectId(_id)});
    if (!email || !email.attachments[index]) throw w.INVALID_EMAIL;
    if (email.open === false) await mongo[0].collection(type || mailbox).updateOne({_id: ObjectId(_id)}, {$set: {open: true}});
    const attachment = email.attachments[index];
    const {res, origin} = args;
    const headers = {
        'Content-Type': attachment.contentType,
        'Content-Disposition': 'attachment; filename=\"' + attachment.filename + '\"',
        ...cors(origin)
    };
    res.writeStatus('200 OK');
    for (let i in headers) res.writeHeader(i, "" + headers[i]);
    res["headerWritten"] = true;
    sendAttachment(res, attachment.content);
    callback();
};