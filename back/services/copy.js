const router = require('../router'),
    w = require('../words'),
    mongo = require('../mongo'),
    {saveAttachments, parseMail, isEncrypted, event, buildMessageFromBuffer} = require('../utilities/commons');

router['copy'] = async (id, json, callback, args) => {
    const type = args.type || "Sent";
    const parsed = await parseMail(buildMessageFromBuffer(json));
    if (!isEncrypted(parsed) || parsed.from.value.length > 1 || parsed.from.value[0].address !== id) throw w.UNAUTHORIZED_OPERATION;
    saveAttachments(parsed);
    await mongo[0].collection(type.toLowerCase()).insertOne(parsed);
    event(id, type, parsed);
    callback(false)
};
