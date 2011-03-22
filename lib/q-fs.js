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
var COMMON = require("./q-fs/common");

for (var name in FS_BOOT)
    exports[name] = FS_BOOT[name];

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
            throw new Error("Can't open a binary file with a charset: " + charset);
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

exports.remove = function (path) {
    path = String(path);
    var done = Q.defer();
    FS.unlink(path, function (error) {
        if (error) {
            done.reject(error);
        } else {
            done.resolve();
        }
    });
    return done.promise;
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
    path = String(path);
    var deferred = Q.defer();
    try {
        FS.stat(path, function (error, stat) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(stat);
            }
        });
    } catch (error) {
        deferred.reject(error);
    }
    return deferred.promise;
};

exports.statLink = function (path) {
    path = String(path);
    var deferred = Q.defer();
    try {
        FS.lstat(path, function (error, stat) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(stat);
            }
        });
    } catch (error) {
        deferred.reject(error);
    }
    return deferred.promise;
};

exports.statFd = function (fd) {
    fd = Number(fd);
    var deferred = Q.defer();
    try {
        FS.fstat(fd, function (error, stat) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(stat);
            }
        });
    } catch (error) {
        deferred.reject(error);
    }
    return deferred.promise;
};

exports.link = function (source, target) {
    source = String(source);
    target = String(target);
    var deferred = Q.defer();
    try {
        FS.link(source, target, function (error) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
    } catch (error) {
        deferred.reject(error);
    }
    return deferred.promise;
};

exports.chown = function (path, uid, gid) {
    path = String(path);
    var deferred = Q.defer();
    try {
        FS.chown(path, uid, gid, function (error) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
    } catch (error) {
        deferred.reject(error);
    }
    return deferred.promise;
};

exports.chmod = function (path, mode) {
    path = String(path);
    mode = String(mode);
    var deferred = Q.defer();
    try {
        FS.chmod(path, mode, function (error) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
    } catch (error) {
        deferred.reject(error);
    }
    return deferred.promise;
};

exports.lastModified = function (path) {
    var stat = exports.stat(path);
    var mtime = Q.get(stat, 'mtime');
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

