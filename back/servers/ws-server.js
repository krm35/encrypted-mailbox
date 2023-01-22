const w = require('../words'),
    router = require('../router'),
    userEvents = {};

let id = 0;

module.exports.open = async function (ws) {
    if (!userEvents[ws.session.id]) userEvents[ws.session.id] = {};
    ws.id = ++id;
    userEvents[ws.session.id][ws.id] = ws;
};

module.exports.message = async function (ws, json) {
    try {
        const message = JSON.parse(json);
        if (!router[message['message']]) return;
        userEvent({...ws.session, message}, (result) => {
            try {
                ws.send(result);
            } catch (e) {

            }
        });
    } catch (e) {
    }
};

module.exports.close = function (ws) {
    try {
        delete userEvents[ws.session.id][ws.id];
        if (ws.queue) ws.queue.kill();
    } catch (e) {
    }
};

function userEvent(params, callback) {
    const {id, message, ip} = params;
    router[message['message']](
        id, message, (error, data) => {
            callback(JSON.stringify({error, data, id: message.id}));
        }, {ip})
        .catch((e) => {
            if (!w[e]) console.log(e);
            callback(JSON.stringify({error: true, data: w[e] || w.UNKNOWN_ERROR, id: message.id}));
        });
}

const heartbeat = JSON.stringify({hb: 1});

function heartBeat() {
    for (let i in userEvents) {
        for (let y in userEvents[i]) {
            try {
                userEvents[i][y].send(heartbeat);
            } catch (e) {

            }
        }
    }
    setTimeout(heartBeat, 5000);
}

heartBeat();

module.exports.userEvents = userEvents;