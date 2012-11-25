
[![Build Status](https://secure.travis-ci.org/kriskowal/q-fs.png)](http://travis-ci.org/kriskowal/q-fs)

File system API for Q promises with method signatures patterned after
[CommonJS/Filesystem/A][], but returning promises and promise streams.

[CommonJS/Fileystem/A]: http://wiki.commonjs.org/wiki/Filesystem/A

Open options:

-   ``flags``: ``r``, ``w``, ``a``, ``b``
-   ``charset``: default of ``utf-8``
-   ``bufferSize``: in bytes
-   ``mode``: UNIX permissions
-   ``begin`` first byte to read (defaults to zero)
-   ``end`` one past the last byte to read.  ``end - begin == length``

Functions:

-   ``open(path, options)``
-   ``read(path, options)``
-   ``write(path, content, options)``
-   ``append(path, content, options)``
-   ``copy(source, target)``
-   ``copyTree(source, target)``
-   ``list(path)``
-   ``listTree(path, guard_opt(path, stat)``)
-   ``listDirectoryTree(path)``
-   ``makeDirectory(path)``
-   ``makeTree(path)``
-   ``remove(path)``
-   ``removeTree(path)``
-   ``link(source, taget)``
-   ``symbolicCopy(source, target)``
-   ``symbolicLink(target, relative, type)``
-   ``chown(path, uid, gid)``
-   ``chmod(path, mode)``
-   ``stat(path)``
-   ``statLink(path)``
-   ``statFd(fd)``
-   ``exists(path)``
-   ``isFile(path)``
-   ``isDirectory(path)``
-   ``lastModified(path)``
-   ``split(path)``
-   ``join(paths)``
-   ``join(...paths)``
-   ``resolve(...paths)``
-   ``normal(...paths)``
-   ``absolute(path)``
-   ``canonical(path)``
-   ``readLink(path)``
-   ``contains(parent, child)``
-   ``relative(source, target)``
-   ``relativeFromFile(source, target)``
-   ``relativeFromDirectory(source, target)``
-   ``isAbsolute(path)``
-   ``isRelative(path)``
-   ``isRoot(path)``
-   ``root(path)``
-   ``directory(path)``
-   ``base(path, extension)``
-   ``extension(path)``
-   ``reroot(path_opt)``
-   ``toObject(path_opt)``

-   ``glob(pattern)`` NOT IMPLEMENTED
-   ``match(pattern, file)`` NOT IMPLEMENTED

Copyright 2009–2012 Kristopher Michael Kowal
MIT License (enclosed)

