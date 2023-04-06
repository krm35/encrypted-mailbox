const redis = require('./redis'),
    c = require('./constants'),
    {build, compose, sendMail, encryptMail} = require("./utilities/commons"),
    noreply = "noreply" + c.domain;

const client = redis.duplicate();

client.on('error', function (err) {
});

(async () => {
    // noinspection InfiniteLoopJS
    while (true) {
        try {
            const [, mail] = await client.brpop("email", 0);
            if (!c.enableQueue) continue;
            const {from, to, subject, html, pgp} = JSON.parse(mail);
            const builtMessage = await build(await compose({from: from || noreply, to, subject, html}));
            const message = pgp ? await encryptMail(builtMessage, [pgp]) : builtMessage;
            await sendMail({from: from || noreply, to, subject, html, message});
        } catch (e) {
            console.log(e);
        }
    }
})();