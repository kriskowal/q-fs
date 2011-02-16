
var FS = require("q-fs");
var BOOT = require("fs-boot");
var COMMON = require("./common");
var Q = require("q");

var Fs = exports.Fs = function (files) {
    var fs = Object.create(BOOT);
    var root = {};
    var now = new Date();

    function init() {
        // construct a file tree
        Object.keys(files).forEach(function (path) {
            var content = files[path];
            find(path).set(content);
        });
    }

    function find(path) {
        path = FS.normal(path);
        if (path === "") {
            return Node(function get() {
                return root;
            }, function set(content) {
                root = content;
            });
        }
        var at = root;
        var parts = FS.split(path);
        var i, ii;
        var manifest = function () {};
        for (i = 0, ii = parts.length - 1; i < ii; i++) {
            var part = parts[i];
            if (part === ".") {
                continue;
            } if (typeof at[part] !== "object") {
                manifest = (function (on, part, manifest) {
                    var created = {};
                    at = created;
                    return function () {
                        on[part] = created;
                        manifest();
                    };
                })(at, part, manifest);
            } else {
                at = at[part];
            }
        }
        var leaf = parts[i];
        return Node(function get() {
            return at[leaf];
        }, function set(content) {
            manifest();
            at[leaf] = content;
        });
    }

    fs.list = function (path) {
        path = String(path);
        return Q.ref(Object.keys(find(path).get()));
    };

    fs.open = function (path, flags, charset) {
        var node = find(path);
        // TODO create an actual open file object, rather
        // than this rather primitive duck
        return {
            "read": function () {
                var content = node.get();
                if (charset)
                    content = content.toString(charset);
                return content;
            }
        };
    };

    fs.stat = function (path) {
        var stat = find(path);
        if (stat.get() === undefined)
            return Q.reject("No such file: " + path);
        return stat;
    };

    fs.reroot = function () {
        // traverse inward to the first directory that does not
        // just contain another directory
        var at = root;
        while (true) {
            var list = Object.keys(at);
            if (list.length !== 1)
                break;
            var fileName = list[0];
            var node = at[fileName];
            if (typeof node !== "object")
                break;
            at = at[fileName];
        }
        return Fs(at);
    };

    fs.getRoot = function () {
        return root;
    };

    fs.canonical = function (path) {
        return fs.normal(path);
    };

    var Node = function (get, set) {
        var self = Object.create(Node.prototype);
        self.get = get;
        self.set = set;
        return self;
    };

    Node.prototype = Object.create(GenericNode.prototype);

    Node.prototype.constructor = Node;

    Node.prototype.lastModified = function () {
        return now;
    };

    COMMON.update(fs, function () {
        return "";
    });

    init();

    return fs;
};

var GenericNode = function () {};

GenericNode.prototype.exists = function () {
    var node = this.get();
    return typeof node !== "undefined";
};

GenericNode.prototype.isFile = function () {
    var node = this.get();
    return (
        typeof node !== "object" ||
        node.constructor !== Object
    ) && typeof node !== "undefined";
};

GenericNode.prototype.isDirectory = function () {
    var node = this.get();
    return typeof node === "object";
};

function main() {
    var fs = Fs({
        "a/b/1": "ab1",
        "a/b/2": "ab2",
        "a/b/3/a": "ab3a",
        "a/b/3/b": "ab3b"
    });
    console.log(fs.getRoot());
    Q.when(fs.stat("a")).then(function (stat) {
        console.log('stat', stat.isDirectory());
    });
    fs.isDirectory("a").then(console.log);
    fs.listTree(".").then(console.log);
    Q.when(fs.read("a/b/1"), console.log);
}

if (require.main === module)
    main();

