
var Q = require("q/util");
var Root = require("./root").Fs;

var concat = function (arrays) {
    return Array.prototype.concat.apply([], arrays);
};

exports.update = function (exports, workingDirectory) {

    /**
     * @param {String} path
     * @param {Object} options
     * @returns {Promise * (String || Buffer)}
     */
    exports.read = function (path, flags, charset) {
        return Q.when(exports.open(path, flags, charset), function (stream) {
            return stream.read();
        }, function (reason) {
            var message = "Can't read " + path;
            return Q.reject({
                "toString": function () {
                    return JSON.stringify(this);
                },
                "message": message,
                "path": path,
                "flags": flags,
                "charset": charset,
                "cause": reason,
                "stack": new Error(message).stack
            });
        });
    };

    /**
     * @param {String} path
     * @param {String || Buffer} content
     * @param {Object} options
     * @returns {Promise * Undefined} a promise that resolves
     * when the writing is complete.
     */
    exports.write = function (path, content, flags, charset) {
        return Q.when(exports.open(path, flags, charset), function (stream) {
            return Q.when(stream.write(content), function () {
                return stream.close();
            });
        });
    };

    // TODO append
    //
    /**
     */
    exports.listTree = function (basePath, guard) {
        basePath = String(basePath || '');
        if (!basePath)
            basePath = ".";
        var stat = exports.stat(basePath);
        return Q.when(stat, function (stat) {
            var paths = [];
            if (guard) {
                if (guard(basePath, stat)) {
                    paths.push([basePath]);
                }
            } else {
                paths.push([basePath]);
            }
            if (stat.isDirectory()) {
                return Q.when(exports.list(basePath), function (children) {
                    paths.push.apply(paths, children.map(function (child) {
                        var path = exports.join(basePath, child);
                        return exports.listTree(path, guard);
                    }));
                    return paths;
                });
            } else {
                return paths;
            }
        }, function noSuchFile() {
            return [];
        }).then(Q.shallow).then(concat);
    };


    exports.exists = function (path) {
        return Q.when(exports.stat(path), function () {
            return true;
        }, function () {
            return false;
        });
    };

    exports.isFile = function (path) {
        return Q.when(exports.stat(path), function (stat) {
            return stat.isFile();
        }, function (reason) {
            return false;
        });
    };

    exports.isDirectory = function (path) {
        return Q.when(exports.stat(path), function (stat) {
            return stat.isDirectory();
        }, function (reason) {
            return false;
        });
    };

    exports.absolute = function (path) {
        if (exports.isAbsolute(path))
            return path;
        return exports.join(workingDirectory(), path);
    };

    exports.relativeFromFile = function (source, target) {
        source = exports.absolute(source);
        target = exports.absolute(target);
        source = source.split(exports.SEPARATORS_RE());
        target = target.split(exports.SEPARATORS_RE());
        source.pop();
        while (
            source.length &&
            target.length &&
            target[0] == source[0]
        ) {
            source.shift();
            target.shift();
        }
        while (source.length) {
            source.shift();
            target.unshift("..");
        }
        return target.join(exports.SEPARATOR);
    };

    exports.relativeFromDirectory = function (source, target) {
        if (!target) {
            target = source;
            source = workingDirectory();
        }
        source = exports.absolute(source);
        target = exports.absolute(target);
        source = source.split(exports.SEPARATORS_RE());
        target = target.split(exports.SEPARATORS_RE());
        if (source.length === 2 && source[1] === "")
            source.pop();
        while (
            source.length &&
            target.length &&
            target[0] == source[0]
        ) {
            source.shift();
            target.shift();
        }
        while (source.length) {
            source.shift();
            target.unshift("..");
        }
        return target.join(exports.SEPARATOR);
    };

    exports.contains = function (parent, child) {
        var i, ii;
        parent = exports.absolute(parent);
        child = exports.absolute(child);
        parent = parent.split(exports.SEPARATORS_RE());
        child = child.split(exports.SEPARATORS_RE());
        if (parent.length === 2 && parent[1] === "")
            parent.pop();
        if (parent.length > child.length)
            return false;
        for (i = 0, ii = parent.length; i < ii; i++) {
            if (parent[i] !== child[i])
                break;
        }
        return i == ii;
    };

    exports.reroot = reroot;
    function reroot(path) {
        path = path || exports.ROOT;
        return Q.when(exports.list(path), function (list) {
            if (list.length !== 1)
                return Root(exports, path);
            var nextPath = exports.join(path, list[0]);
            return Q.when(exports.stat(nextPath), function (stat) {
                if (stat.isDirectory()) {
                    return reroot(nextPath);
                } else {
                    return Root(exports, path);
                }
            });
        });
    }

    exports.toObject = function () {
        var list = exports.listTree("", function (path, stat) {
            return stat.isFile();
        });
        return Q.when(list, function (list) {
            var tree = {};
            var done;
            list.forEach(function (path) {
                tree[path] = exports.read(path, "rb");
            });
            return Q.when(done, function () {
                return Q.shallow(tree);
            });
        });
    };

}

