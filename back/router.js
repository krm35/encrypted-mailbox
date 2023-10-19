const fs = require('fs'),
    c = require('./constants'),
    router = {};

router['noUserCheck'] = {};
router['files'] = {};

module.exports = router;

function loadFiles(path, module) {
    fs.readdir(path, function (err, files) {
        for (let f in files) {
            if (fs.lstatSync(path + files[f]).isDirectory()) {
                loadFiles(path + files[f] + "/", module);
            } else {
                if (module) {
                    if (files[f].endsWith('.js') || files[f].endsWith('.jsc')) require('./' + path + files[f]);
                } else {
                    router['files'][files[f]] = !c.cache ? () => fs.readFileSync(path + files[f]) : fs.readFileSync(path + files[f]);
                }
            }
        }
    });
}

loadFiles('services/', true);
loadFiles('public/');