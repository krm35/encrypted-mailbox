const fs = require('fs'),
    c = require('./constants'),
    router = {};

router['noUserCheck'] = {};
router['files'] = {};

module.exports = router;

function loadFiles(path, module) {
    const files = fs.readdirSync(path);
    for (let f in files) {
        if (fs.lstatSync(path + files[f]).isDirectory()) {
            loadFiles(path + files[f] + "/", module);
        } else {
            if (module) {
                if (files[f].endsWith('.js')) require('./' + path + files[f]);
            } else {
                router['files'][files[f]] = !c.cache ? () => fs.readFileSync(path + files[f]) : fs.readFileSync(path + files[f]);
            }
        }
    }
}

loadFiles('services/', true);
loadFiles('public/');

fs.watchFile(c.__dirname + '/public/index.html', {interval: 1000}, () => loadFiles('public/'));