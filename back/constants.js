const fs = require('fs'),
    secret = __dirname + "/secrets.json",
    map = {};

map.__dirname = __dirname;
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
map.redisConf = {port: 6380};
map.allowNonAdminSignUp = true;
map.enableQueue = true;
map.enableQueueLogs = true;
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

if (!fs.existsSync(map.attachments)) fs.mkdirSync(map.attachments);

map.domains.push(map.domain);

module.exports = map;
