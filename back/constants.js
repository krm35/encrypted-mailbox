const fs = require('fs'),
    secret = __dirname + "/secrets.json",
    map = {};

map.attachments = __dirname + "/attachments/";
map.domain = "@localhost.com";
map.domains = ["@localhost1.com"];
map.host = "127.0.0.1";
map.ssl = false;
map.sslKey = "";
map.sslCert = "";
map.sslHttp = false;
map.sslKeyHttp = "";
map.sslCertHttp = "";
map.sslSmtp = false;
map.sslKeySmtp = "";
map.sslCertSmtp = "";
map.smtpPort = 2525;
map.httpPort = 8080;
map.sendmailConf = {
    silent: true,
    devHost: 'localhost',
    devPort: 2525,
    rejectUnauthorized: false,
};
map.redisConf = {};
map.allowNonAdminSignUp = true;
map.enableQueue = true;
map.gridfs = true;
map.cache = true;
map.isDev = !fs.existsSync(secret);

if (!map.isDev) {
    const secrets = JSON.parse("" + fs.readFileSync(secret));
    for (let i in secrets) map[i] = secrets[i];
}

if (map.sendmailConf.dkim) {
    if (fs.existsSync(map.sendmailConf.dkim.privateKey)) {
        map.sendmailConf.dkim.privateKey = fs.readFileSync(map.sendmailConf.dkim.privateKey, 'utf8');
    } else {
        delete map.sendmailConf.dkim;
    }
}

map.__dirname = map.attachments;

if (!fs.existsSync(map.__dirname)) fs.mkdirSync(map.__dirname);

map.domains.push(map.domain);

module.exports = map;
