const Redis = require("ioredis");
const c = require("./constants");
const client = new Redis(c.redisConf);
client['on']('error', function (err) {
});
module.exports = client;
