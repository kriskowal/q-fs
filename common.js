(function (require, exports) {

var Q = require("qq");
var FS_BOOT = require("fs-boot");
var ROOT = require("./root");
var MOCK = require("./mock");

// TODO patternToRegExp
// TODO glob
// TODO match
// TODO copyTree

var concat = function (arrays) {
    return Array.prototype.concat.apply([], arrays);
};

exports.update = function (exports, workingDirectory) {

    for (var name in FS_BOOT)
        exports[name] = FS_BOOT[name];

    /**
     * @param {String} path
     * @param {Object} options
     * @returns {Promise * (String || Buffer)}
     */
    exports.read = function (path, flags, charset, options) {
        if (typeof flags == "object") {
            options = flags;
        } else {
            options = options || {};
            options.flags = flags;
            options.carset = charset;
        }
        options.flags = "r" + (options.flags || "").replace(/r/g, "");
        return Q.when(exports.open(path, options), function (stream) {
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
    exports.write = function (path, content, flags, charset, options) {
        if (typeof flags == "object") {
            options = flags;
        } else {
            options = options || {};
            options.flags = flags;
            options.carset = charset;
        }
        options.flags = "w" + (options.flags || "").replace(/w/g, "");
        return Q.when(exports.open(path, options), function (stream) {
            return Q.when(stream.write(content), function () {
                return stream.close();
            });
        });
    };

    // TODO append
    exports.append = function (path, content, flags, charset, options) {
        if (typeof flags == "object") {
            options = flags;
        } else {
            options = options || {};
            options.flags = flags;
            options.carset = charset;
        }
        options.flags = "w+" + (options.flags || "").replace(/[w\+]/g, "");
        return Q.when(exports.open(path, options), function (stream) {
            return Q.when(stream.write(content), function () {
                return stream.close();
            });
        });
    };

    // TODO copy

    /**
     */
    exports.listTree = function (basePath, guard) {
        basePath = String(basePath || '');
        if (!basePath)
            basePath = ".";
        guard = guard || function () {
            return true;
        };
        var stat = exports.stat(basePath);
        return Q.Lazy(Array, Q.when(stat, function (stat) {
            var paths = [];
            var mode; // true:include, false:exclude, null:no-recur
            try {
                var include = guard(basePath, stat);
            } catch (exception) {
                return Q.reject(exception);
            }
            return Q.when(include, function (include) {
                if (include) {
                    paths.push([basePath]);
                }
                if (include !== null && stat.isDirectory()) {
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
            });
        }, function noSuchFile(reason) {
            return [];
        }).then(Q.shallow).then(concat));
    };
    
    exports.listDirectoryTree = function (path) {
        return exports.listTree(path, function (path, stat) {
            return stat.isDirectory();
        });
    };

    exports.makeTree = function (path, mode) {
        var parts = exports.split(path);
        var at = [];
        if (exports.isAbsolute(path))
            at.push(exports.ROOT);
        return parts.reduce(function (parent, part) {
            return Q.when(parent, function () {
                at.push(part);
                var parts = exports.join(at);
                var made = exports.makeDirectory(parts, mode);
                return Q.when(made, null, function rejected(reason) {
                    // throw away errors for already made directories
                    if (reason.code == "EEXIST") {
                        return;
                    } else {
                        return Q.reject(reason);
                    }
                });
            });
        }, undefined);
    };

    exports.removeTree = function (path) {
        return Q.when(exports.stat(path), function (stat) {
            if (stat.isLink()) {
                return exports.remove(path);
            } else if (stat.isDirectory()) {
                var list = exports.list(path);
                return Q.when(list, function (list) {
                    // asynchronously remove every subtree
                    var done = list.reduce(function (prev, name) {
                        var child = exports.join(path, name);
                        var next = exports.removeTree(child);
                        // join next and prev
                        return Q.when(prev, function () {
                            return next;
                        });
                    });
                    return Q.when(done, function () {
                        exports.removeDirectory(path);
                    });
                });
            } else {
                return exports.remove(path);
            }
        });
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

    exports.relative = function (source, target) {
        return Q.when(exports.isDirectory(source), function (isDirectory) {
            if (isDirectory) {
                return exports.relativeFromDirectory(source, target);
            } else {
                return exports.relativeFromFile(source, target);
            }
        });
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
                return ROOT.Fs(exports, path);
            var nextPath = exports.join(path, list[0]);
            return Q.when(exports.stat(nextPath), function (stat) {
                if (stat.isDirectory()) {
                    return reroot(nextPath);
                } else {
                    return ROOT.Fs(exports, path);
                }
            });
        });
    }

    exports.toObject = function (path) {
        var list = exports.listTree(path || "", function (path, stat) {
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

    exports.merge = function (fss) {
        var tree = {};
        var done;
        fss.forEach(function (fs) {
            // fetch lists in parallel
            var list = fs.listTree("", function (path, stat) {
                return stat.isFile();
            });
            // merge each fs serially
            done = Q.when(done, function () {
                return Q.when(list, function (list) {
                    list.forEach(function (path) {
                        tree[path] = fs.read(path, "rb");
                    });
                });
            });
        });
        return Q.when(done, function () {
            return Q.when(Q.shallow(tree), MOCK.Fs);
        });
    };

    var stats = [
        "isDirectory",
        "isFile",
        "isBlockDevice",
        "isCharacterDevice",
        "isSymbolicLink",
        "isFIFO",
        "isSocket"
    ];

    var Stats = exports.Stats = function (copy) {
        var self = Object.create(copy);
        stats.forEach(function (name) {
            if (copy["_" + name] !== undefined) {
                self["_" + name] = copy["_" + name];
            } else {
                self["_" + name] = copy[name]();
            }
        });
        return self;
    };

    stats.forEach(function (name) {
        Stats.prototype[name] = function () {
            return this["_" + name];
        };
    });

}

}).apply(null, typeof exports !== "undefined" ?
    [require, exports] :
    [
        function (id) {
            id = id.toUpperCase()
                .replace(".", "Q_FS")
                .replace("/", "$")
                .replace("-", "_");
            return window[id] = window[id] || {};
        },
        Q_FS$COMMON = {}
    ]
)
