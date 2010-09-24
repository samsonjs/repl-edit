repl-edit
=========

Use your text editor to edit commands in Node's repl.


Installation
============

npm install repl-edit


Usage
=====

You can fire up a repl with editing capabilities by running `node-repl-edit`
or extend an existing repl session by typing `require('repl-edit').extend(global)`.


Commands
========

edit
----

The first time you run `edit()` in a repl a temporary file is created, specific to that session,
and opened in your editor. Type away and then save and close the file when you're done. The file
will be loaded and executed at that time.


run
---

To run whatever command you've been working on without editing it again type `run()`.


setEditor
---------

`setEditor('mate -w')` will change your editor to TextMate for this session. Note that this
command changes the environment variable EDITOR for the repl process.


stash
-----

`stash('/path/to/a/file')` will save your command to the named file.


unstash
-------

`unstash('/path/to/a/file')` will restore the contents of that file for you to run and/or edit.


Future
======

Instead of polluting the global namespace with functions I'd rather extend Node's repl
to allow user-defined dot commands (just like `.break` and `.clear`), and then use that
capability to provide commands like `.edit` and `.stash <filename>`.

The first time edit() is run in a repl instead of an empty file the command should be seeded
with the last command that was executed.


License
=======

Copyright 2010 Sami Samhuri sami@samhuri.net

MIT (see the file named [LICENSE](/samsonjs/repl-edit/blob/master/LICENSE))