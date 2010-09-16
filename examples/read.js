
var SYS = require("sys");
var FS = require("q-fs");
var Q = require("q");
Q.when(FS.read('package.json'), function (content) {
    SYS.puts(content);
});

