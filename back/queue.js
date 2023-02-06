const redis = require('./redis'),
    router = require('./router'),
    {build, compose} = require("./utilities/commons");

const client = redis.duplicate();

client.on('error', function (err) {
});

(async () => {
    // noinspection InfiniteLoopJS
    while (true) {
        try {
            const [, mail] = await client.brpop("queue", 0);
            const {id, message} = JSON.parse(mail);
            await router['send'](id, {}, () => {
            }, {message: typeof message === "object" ? (await build(compose(message))).toString() : message});
        } catch (e) {
            console.log(e);
        }
    }
})();