/**
 * An asynchronous local file system API, based on a subset
 * of the `narwhal/fs` API and the `narwhal/promise` API,
 * such that the method names are the same but some return
 * values are promises instead of fully resolved values.
 * @module
 */

/*whatsupdoc*/

var FS = require("fs"); // node
var SYS = require("sys"); // node
var Q = require("q/util");
var IO = require("q-io");
var UTIL = require("n-util");
var FS_BOOT = require("fs-boot");
UTIL.update(exports, FS_BOOT);

var concat = function (arrays) {
    return Array.prototype.concat.apply([], arrays);
};

/**
 * @param {String} path
 * @returns {Promise * Stream} a stream from the
 * `narwhal/q-io` module.
 */
exports.open = function (path, options) {
    if (typeof options === "string")
        options = {"flags": options};
    options = options || {};
    options.flags = options.flags || "r";
    if (options.flags.indexOf("w") >= 0) {
        var stream = FS.createWriteStream(String(path), options);
        return IO.Writer(stream);
    } else {
        var stream = FS.createReadStream(String(path), options);
        return IO.Reader(stream);
    }
};

/**
 * @param {String} path
 * @param {Object} options
 * @returns {Promise * (String || Buffer)}
 */
exports.read = function (path, options) {
    return Q.when(exports.open(path, options), function (stream) {
        return stream.read();
    }, function (reason) {
        return Q.reject({
            "message": "read",
            "path": path,
            "options": options,
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

/**
 */
exports.list = function (path) {
    path = String(path);
    var result = Q.defer();
    FS.readdir(path, function (error, list) {
        if (error)
            return result.reject(error);
        else
            result.resolve(list);
    });
    return result.promise;
};

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

/**
 * @param {String} path
 * @returns {Promise * Stat}
 */
exports.stat = function (path) {
    var deferred = Q.defer();
    try {
        FS.stat(path, function (error, stat) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(stat);
        });
    } catch (exception) {
        deferred.reject({
            "message": "stat",
            "path": path,
            "cause": exception
        })
    }
    return deferred.promise;
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

exports.lastModified = function (path) {
    var mtime = Q.get(exports.stat(path), 'mtime');
    return Q.when(mtime, function (mtime) {
        return Date.parse(mtime);
    });
};

exports.absolute = function (path) {
    return exports.join(process.cwd(), path);
};

exports.canonical = function (path) {
    var result = Q.defer();
    FS.realpath(path, function (error, path) {
        if (error)
            return result.reject(error);
        result.resolve(path);
    });
    return result.promise;
};

exports.relative = function (source, target) {
    if (!target) {
        target = source;
        source = process.cwd() + '/';
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

