
var Q = require("q");

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
            return Q.reject({
                "message": "read",
                "path": path,
                "flags": flags,
                "charset": charset,
                "cause": reason,
                "stack": new Error("read").stack
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
    exports.write = function (path, content, options) {
        if (typeof options === "string")
            options = {"flags": options};
        options = options || {}; 
        options.flags = options.flags || "w";
        return Q.when(exports.open(path, options), function (stream) {
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

    exports.relative = function (source, target) {
        if (!target) {
            target = source;
            source = workingDirectory() + '/';
        }
        source = exports.absolute(source);
        target = exports.absolute(target);
        source = source.split(exports.SEPARATORS_RE());
        target = target.split(exports.SEPARATORS_RE());
        source.pop();
        while (
            source.length &&
            target.length &&
            target[0] == source[0]) {
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
        if (parent.length > child.length)
            return false;
        for (i = 0, ii = parent.length; i < ii; i++) {
            if (parent[i] !== child[i])
                break;
        }
        return i == ii;
    };

}

