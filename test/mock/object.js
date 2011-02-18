"use strict";

var Q = require("q/util");
var FS = require("q-fs");
var Root = require("q-fs/root").Fs;
var MOCK = require("q-fs/mock");
var ASSERT = require("assert");

exports['test merge'] = function (ASSERT, done) {

    var input = {
        "a": 10,
        "b": 20
    };
    var output = MOCK.Fs(input).toObject();
    Q.when(output, function (output) {
        ASSERT.deepEqual(output, input, 'toObject');
    })
    .then(null, Q.error).then(done);

};

if (require.main === module) {
    require("test").run(exports);
}


