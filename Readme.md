repl-edit
=========

Use your text editor to edit commands in Node's repl.

(tip o' the hat to Giles Bowkett for [inspiration](http://gilesbowkett.blogspot.com/2010/09/vim-in-irb-with-utility-belt.html))

Installation
============

npm install repl-edit

Usage
=====

Typically you just type `require('repl-edit')` in node's repl and it will extend it with new commands, just like `.break` and `.clear` that come with node.

You can also fire up a repl with editing capabilities by running `node-repl-edit` in your shell.

Commands
========

.edit
-----

`.edit` opens your editor. Type away and then save and close the file when you're done. The command will be loaded and executed immediately.

Your editor is determined by the `VISUAL` and `EDITOR` environment variables, in that order. You can also change the editor for a single edit by doing something like `.edit vim`.

.run
----

`.run` runs the most recent command you've edited.

.editor
-------

`.editor mate -w` changes your editor to TextMate for this session, by setting the environment variable `VISUAL`.

.stash
------

`.stash /path/to/a/file` saves your command to the named file.

.unstash
--------

`.unstash /path/to/a/file` restores the contents of that file for you to run and/or edit.

TODO
====

The first time `.edit` is run instead of an empty file the command should be seeded with the last command that was executed.

License
=======

Copyright 2010 - 2011 Sami Samhuri <sami@samhuri.net>

MIT license, see the included [LICENSE](/samsonjs/repl-edit/blob/master/LICENSE)