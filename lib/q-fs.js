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
var COMMON = require("./common");
UTIL.update(exports, FS_BOOT);
COMMON.update(exports, process.cwd);

/**
 * @param {String} path
 * @returns {Promise * Stream} a stream from the
 * `narwhal/q-io` module.
 */
exports.open = function (path, flags, charset) {
    flags = flags || "r";
    var options = {"flags": flags.replace(/b/g, "")};
    if (flags.indexOf("b") >= 0) {
        if (charset) {
            throw new Error("Cannot open a binary file with a charset: " + charset);
        }
    } else {
        charset = charset || "binary";
    }
    if (flags.indexOf("w") >= 0) {
        var stream = FS.createWriteStream(String(path), options);
        return IO.Writer(stream, charset);
    } else {
        var stream = FS.createReadStream(String(path), options);
        return IO.Reader(stream, charset);
    }
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

exports.lastModified = function (path) {
    var mtime = Q.get(exports.stat(path), 'mtime');
    return Q.when(mtime, function (mtime) {
        return Date.parse(mtime);
    });
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

