
var SYS = require('util');
var FS = require("q-fs");
var Q = require("q");
Q.when(FS.read('package.json'), function (content) {
    SYS.puts(content);
});

