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
var Q = require("qq");
var IO = require("q-io");
var COMMON = require("./lib/common");
var MOCK = require("./lib/mock");
var ROOT = require("./lib/root");

COMMON.update(exports, process.cwd);
exports.Mock = MOCK.Fs;
exports.mock = MOCK.mock;
exports.Root = ROOT.Fs;

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
            done.reject("Can't remove " + JSON.stringify(path) + ": " + error);
        } else {
            done.resolve();
        }
    });
    return done.promise;
};

exports.makeDirectory = function (path, mode) {
    path = String(path);
    var done = Q.defer();
    mode = mode === undefined ? parseInt('755', 8) : mode;
    FS.mkdir(path, mode, function (error) {
        if (error) {
            done.reject("Can't makeDirectory " + JSON.stringify(path) + " with mode " + mode + ": " + error);
        } else {
            done.resolve();
        }
    });
    return done.promise;
};

exports.removeDirectory = function (path) {
    path = String(path);
    var done = Q.defer();
    FS.rmdir(path, function (error) {
        if (error) {
            done.reject("Can't removeDirectory " + JSON.stringify(path) + ": " + error);
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
            return result.reject("Can't list " + JSON.stringify(path) + ": " + error);
        else
            result.resolve(list);
    });
    return Q.Lazy(Array, result.promise);
};

/**
 * @param {String} path
 * @returns {Promise * Stat}
 */
exports.stat = function (path) {
    path = String(path);
    var done = Q.defer();
    try {
        FS.stat(path, function (error, stat) {
            if (error) {
                done.reject("Can't stat " + JSON.stringify(path) + ": " + error);
            } else {
                done.resolve(new exports.Stats(stat));
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return Q.Lazy(exports.Stats, done.promise);
};

exports.statLink = function (path) {
    path = String(path);
    var done = Q.defer();
    try {
        FS.lstat(path, function (error, stat) {
            if (error) {
                done.reject("Can't statLink " + JSON.stringify(path) + ": " + error);
            } else {
                done.resolve(stat);
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

exports.statFd = function (fd) {
    fd = Number(fd);
    var done = Q.defer();
    try {
        FS.fstat(fd, function (error, stat) {
            if (error) {
                done.reject("Can't statFd file descriptor " + JSON.stringify(fd) + ": " + error);
            } else {
                done.resolve(stat);
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

exports.link = function (source, target) {
    source = String(source);
    target = String(target);
    var done = Q.defer();
    try {
        FS.link(source, target, function (error) {
            if (error) {
                done.reject("Can't link " + JSON.stringify(source) + " to " + JSON.stringify(target) + ": " + error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

exports.symbolicLink = function (target, relative) {
    target = String(target);
    relative = String(relative);
    var done = Q.defer();
    try {
        FS.symlink(relative, target, function (error) {
            if (error) {
                done.reject("Can't create symbolicLink " + JSON.stringify(target) + " to relative location " + JSON.stringify(relative));
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

exports.symbolicCopy = function (source, target) {
    return Q.when(exports.relative(target, source), function (relative) {
        return exports.symbolicLink(target, relative);
    });
};

exports.chown = function (path, uid, gid) {
    path = String(path);
    var done = Q.defer();
    try {
        FS.chown(path, uid, gid, function (error) {
            if (error) {
                done.reject("Can't chown (change owner) of " + JSON.stringify(path) + " to user " + JSON.stringify(uid) + " and group " + JSON.stringify(gid) + ": " + error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

exports.chmod = function (path, mode) {
    path = String(path);
    mode = String(mode);
    var done = Q.defer();
    try {
        FS.chmod(path, mode, function (error) {
            if (error) {
                done.reject("Can't chmod (change permissions mode) of " + JSON.stringify(path) + " to (octal number) " + mode.toString(8) + ": " + error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
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
            return result.reject("Can't get canonical path of " + JSON.stringify(path) + " by way of C realpath: " + error);
        result.resolve(path);
    });
    return result.promise;
};

