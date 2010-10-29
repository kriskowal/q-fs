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
var Q = require("q");
var IO = require("q-io");
var UTIL = require("n-util");
var FS_BOOT = require("fs-boot");
UTIL.update(exports, FS_BOOT);

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

exports.isFile = function (path) {
    return Q.when(exports.stat(path), function (stat) {
        return stat.isFile();
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

