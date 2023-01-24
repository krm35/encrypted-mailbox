const router = require('../router'),
    {getDocuments, deleteMail} = require('../utilities/commons');

router['drafts'] = async (id, json, callback) => {
    await getDocuments(id, json, "drafts", callback, {'headers.from.value.address': id});
};

router['draft'] = async (id, json, callback) => {
    await router['copy'](id, json, callback, {type: 'Drafts'});
};

router['delete-draft'] = async (id, json, callback) => {
    await deleteMail(id, json, callback, 'drafts', 'from', 'Drafts');
};