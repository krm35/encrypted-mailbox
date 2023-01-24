import Toaster from "./Toaster";
import {FocusStyleManager} from "@blueprintjs/core";
import PostalMime from "postal-mime";
import {HTTPClient} from "./HTTPClient";

const {decrypt, readMessage} = window.openpgp;

const keys = {};

export function setKey(key, value) {
    keys[key] = value;
}

export function getKey(key) {
    return keys[key];
}

export function toast(message, intent) {
    Toaster.show({message: message.split(/_/g).join(' '), intent: intent || "danger"});
}

export function updateTheme() {
    FocusStyleManager.onlyShowFocusOnTabs();
    document.body.className = localStorage['smtp-theme'] === "moon" ? "bp3-dark dark" : "bp3-body";
}

export function replaceAll(str, find, replace) {
    return str.split(find).join(replace);
}

export function decryptMail(mail, setMail, type) {
    if (!mail || mail.decrypted) return;
    HTTPClient.get("/attachment?_id=" + mail._id + "&index=0&type=" + type)
        .then(async ({data}) => {
            const message = await readMessage({armoredMessage: data});
            try {
                const {data: decrypted} = await decrypt({
                    message,
                    decryptionKeys: getKey("privateKey")
                });
                const parser = new PostalMime();
                const email = await parser.parse(decrypted.replace(' \n\n ', '\n\n'));
                setMail({...mail, textAsHtml: email.html, attachments: email.attachments, decrypted})
            } catch (e) {
                console.log(e);
            }
        })
        .catch((e) => {
            console.log("error", e);
        });
}

export function initWS() {
    if (window.ws) return;
    const ws = new WebSocket(
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ?
            'ws://localhost:8080/' :
            'wss://' + window.location.hostname
    );

    ws.onopen = function () {
        console.log("open");
    };

    ws.onmessage = function (e) {
        try {
            const json = JSON.parse(e.data);
            if (!json.hb) {
                console.log(json);
                window.newDoc(json);
            }
        } catch (e) {
            console.log(e);
        }
    };

    ws.onerror = function (e) {
    };

    ws.onclose = function () {
        delete window.ws;
        setTimeout(initWS, 5000);
    };

    window.ws = ws;
}

const isArrayBufferSupported = (new Buffer(new Uint8Array([1]).buffer)[0] === 1);

export function arrayBufferToBuffer(ab) {
    return isArrayBufferSupported ? arrayBufferToBufferAsArgument(ab) : arrayBufferToBufferCycle(ab);
}

function arrayBufferToBufferAsArgument(ab) {
    return new Buffer(ab);
}

function arrayBufferToBufferCycle(ab) {
    const buffer = new Buffer(ab.byteLength);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}