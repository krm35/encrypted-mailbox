const http = require('http'),
    crypto = require("crypto"),
    {strictEqual} = require('assert'),
    querystring = require('querystring'),
    {ObjectId} = require('mongodb'),
    c = require('../constants'),
    mongo = require('../mongo'),
    {compose, build} = require("../utilities/commons");

const httpRequest = function (path, session, dontParse, headers, body, hostname) {
    return new Promise(function (resolve, reject) {
        const req = http.request({
            hostname: hostname || 'localhost',
            port: 8080,
            method: body ? 'POST' : 'GET',
            headers: headers ? headers : !session ? {} : {
                Cookie: "session=" + session
            },
            path
        }, (res) => {
            let data = "";
            res.on('data', function (body) {
                data += body;
            });
            res.on('end', async function () {
                if (dontParse) return resolve(data);
                resolve(JSON.parse(data));
            });
        }).on('error', () => {
            reject();
        });
        if (body) req.write(body);
        req.end();
    });
};

exports.httpGet = function (path, session, dontParse, headers, hostname) {
    return httpRequest(path, session, dontParse, headers, null, hostname);
};

exports.httpPost = function (path, session, dontParse, headers, body) {
    return httpRequest(path, session, dontParse, headers, body);
};

const query = function (json, useKey) {
    if (useKey) {
        const time = String(Date.now());
        const message = crypto.createHmac("sha512", json["secret"]).update(time).digest("hex");
        if (!json["key"]) json["key"] = "0key";
        json["time"] = time;
        json["message"] = message;
        delete json['secret'];
    }
    return "?" + querystring.stringify(json);
};

exports.query = query;

const wait = function (time) {
    return new Promise(resolve => {
        setTimeout(function () {
            resolve()
        }, time || 1000);
    });
};
exports.wait = wait;

exports.waitMongo = async function (mongo) {
    while (!mongo[0]) await wait(10);
};

exports.compose = function (from, to) {
    return compose({
        from, to, subject: 'subject', html: '<p>Hello</p>',
        attachments: [{filename: 'text1.txt', content: 'hello world!'}]
    });
};

exports.build = function (mail) {
    return build(mail);
};

exports.checkMails = async function (path, length, session) {
    const {data} = await httpRequest(path, session);
    strictEqual(data.documents.length, length);
    strictEqual(data.count, length);
};

exports.fileExists = async function (fileId, value) {
    if (!c.gridfs) strictEqual(fs.existsSync(c.attachments + fileId), value || true);
    else strictEqual((await mongo[0 + "bucket"].find({_id: ObjectId(fileId)}).toArray()).length, value === undefined ? 1 : 0);
};