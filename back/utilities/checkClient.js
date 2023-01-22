const redis = require('../redis');

const getCookie = function getCookie(cname, cookies) {
    try {
        const name = cname + "=", ca = cookies.split(";");
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === " ") {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

const getSessionCookie = function getSessionCookie(cookies) {
    return getCookie("session", cookies);
};

const isConnectedAsync = function isConnectedAsync(cookie) {
    return new Promise((resolve) => {
        isConnected(cookie, function (user) {
            resolve(user);
        });
    });
};

const isConnected = function isConnected(cookie, callback) {
    const session = getSessionCookie(cookie);
    if (!session) return callback(null);
    redis.get("session" + session, function (err, id) {
        if (err || !id) {
            callback(null);
        } else {
            callback({id, isAdmin: false});
        }
    });
};

module.exports = {
    getSessionCookie,
    isConnected,
    isConnectedAsync,
    getCookie
};