const fs = require('fs'),
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
                fs.readFile(path + files[f], function (err, data) {
                    if (module) {
                        const code = data.toString().toLowerCase().replace(/\n/gi, '').replace(/ /gi, '');
                        if (code.includes('router=require')) {
                            require('./' + path + files[f]);
                        }
                    } else {
                        if (files[f] === "index.html" && path.includes("unstable")) files[f] = "unstable.html";
                        if (router['files'][files[f]]) return;
                        router['files'][files[f]] = data;
                    }
                })
            }
        }
    });
}

loadFiles('services/', true);
loadFiles('public/');