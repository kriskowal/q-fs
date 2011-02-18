"use strict";

var Q = require("q/util");
var FS = require("q-fs");
var Root = require("q-fs/root").Fs;
var MOCK = require("q-fs/mock");
var ASSERT = require("assert");

var Mock = MOCK.Fs;
var read = MOCK.read;

exports['test merge'] = function (ASSERT, done) {

    var readed = read(FS, FS.join(__dirname, 'dummy'));

    Q.when(readed, function (readed) {
        return Q.when(readed.listTree(), function (list) {
            ASSERT.deepEqual(list.sort(), [
                ".", "hello.txt"
            ].sort(), 'listTree');
        }).then(function () {
            return Q.when(readed.read("hello.txt"), function (hello) {
                ASSERT.strictEqual(hello, 'Hello, World!\n', 'read content');
            });
        });
    })
    .then(null, Q.error).then(done);

};

if (require.main === module) {
    require("test").run(exports);
}


