const userEvents = {};
let id = 0;

module.exports.open = async function (ws) {
    const {email} = ws.user;
    if (!userEvents[email]) userEvents[email] = {};
    ws.id = ++id;
    userEvents[email][ws.id] = ws;
};

module.exports.close = function (ws) {
    try {
        delete userEvents[ws.session.email][ws.id];
    } catch (e) {
    }
};

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