const openpgp = require('openpgp'),
    router = require('../router'),
    w = require('../words'),
    mongo = require('../mongo'),
    {saveAttachments, getDocuments, parseMail, isEncrypted, deleteMail, event, Utf8ArrayToStr} = require('../utilities/commons');

router['drafts'] = async (id, json, callback) => {
    await getDocuments(id, json, "drafts", callback, {'headers.from.value.address': id});
};

router['draft'] = async (id, json, callback) => {
    let message = "";
    json.buffer.filter(b => b.length).forEach(b => message += Utf8ArrayToStr(b));
    const parsed = await parseMail(message);
    if (!isEncrypted(parsed) || parsed.from.value.length > 1 || parsed.from.value[0].address !== id) throw w.UNAUTHORIZED_OPERATION;
    if (json.publickKey) {
        await openpgp.readKey({armoredKey: json.publickKey});
        parsed.publickKey = json.publickKey;
    }
    saveAttachments(parsed);
    await mongo[0].collection('drafts').insertOne(parsed);
    event(id, 'Drafts', parsed);
    callback(false)
};

router['delete-draft'] = async (id, json, callback) => {
    await deleteMail(id, json, callback, 'drafts', 'from', 'Drafts');
};