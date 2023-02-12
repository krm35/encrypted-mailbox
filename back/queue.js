const redis = require('./redis'),
    router = require('./router'),
    c = require('./constants'),
    {build, compose, encryptMail} = require("./utilities/commons");

const client = redis.duplicate();

client.on('error', function (err) {
});

(async () => {
    // noinspection InfiniteLoopJS
    while (true) {
        try {
            const [, mail] = await client.brpop("email", 0);
            let {id, message} = JSON.parse(mail);
            if (typeof message === "object") {
                if (!id) {
                    id = "no-reply" + c.domain;
                    message.from = id;
                }
                const {pgp} = message;
                message = (await build(compose(message))).toString();
                if (pgp) message = await encryptMail(message, [pgp]);
            }
            await router['send'](id, {}, () => {
            }, {message});
        } catch (e) {
            console.log(e);
        }
    }
})();