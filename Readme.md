repl-edit
=========

Use your text editor to edit commands in Node's repl.

(tip o' the hat to Giles Bowkett for [inspiration](http://gilesbowkett.blogspot.com/2010/09/vim-in-irb-with-utility-belt.html))


Installation
============

npm install repl-edit


Usage
=====

You can fire up a repl with editing capabilities by running `node-repl-edit`.

(It would be nice to extend an existing repl session but that's not possible with
Node's repl module right now.)


Commands
========

edit
----

The first time you run `edit()` in a repl a temporary file is created, specific to that session,
and opened in your editor. Type away and then save and close the file when you're done. The file
is loaded and executed immediately.


run
---

To run whatever command you've been working on without editing it again type `run()`.


setEditor
---------

`setEditor('mate -w')` changes your editor to TextMate for this session. Note that this
command sets the environment variable EDITOR for the repl process.


stash
-----

`stash('/path/to/a/file')` saves your command to the named file.


unstash
-------

`unstash('/path/to/a/file')` restores the contents of that file for you to run and/or edit.


Future
======

Instead of polluting the global namespace with functions I'd rather extend Node's repl
to allow user-defined dot commands (just like `.break` and `.clear`), and then use that
capability to provide commands like `.edit` and `.stash <filename>`.

The first time edit() is run in a repl instead of an empty file the command should be seeded
with the last command that was executed.

If the native repl module exports the currently running repl object it will be possible to attach
to an existing repl instead of having to run a separate binary that loads a repl.


License
=======

Copyright 2010 Sami Samhuri sami@samhuri.net

MIT (see the file named [LICENSE](/samsonjs/repl-edit/blob/master/LICENSE))