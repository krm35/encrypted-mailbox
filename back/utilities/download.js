const fs = require('fs');

module.exports.sendAttachment = (res, fileName) => {
    res.id = 1;
    pipeStreamOverResponse(res, fs.createReadStream(fileName), fs.statSync(fileName).size);
};

function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function onAbortedOrFinishedResponse(res, readStream) {
    if (res.id !== -1) readStream.destroy();
    res.id = -1;
}

function pipeStreamOverResponse(res, readStream, totalSize) {
    readStream.on('data', (chunk) => {
        const ab = toArrayBuffer(chunk);
        let lastOffset = res.getWriteOffset();
        let [ok, done] = res.tryEnd(ab, totalSize);
        if (done) {
            onAbortedOrFinishedResponse(res, readStream);
        } else if (!ok) {
            readStream.pause();
            res.ab = ab;
            res.abOffset = lastOffset;
            res.onWritable((offset) => {
                let [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize);
                if (done) {
                    onAbortedOrFinishedResponse(res, readStream);
                } else if (ok) {
                    readStream.resume();
                }
                return ok;
            });
        }
    }).on('error', () => {
        res.end();
    });
    res.onAborted(() => {
        onAbortedOrFinishedResponse(res, readStream);
    });
}