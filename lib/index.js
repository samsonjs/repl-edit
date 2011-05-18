//
// Copyright 2010 - 2011 Sami Samhuri @_sjs
// MIT license
//
// github.com/samsonjs/repl-edit
//

// TODO proper error handling, better intregration with node/lib/repl.js

var fs = require('fs')
  , spawn = require('child_process').spawn
  , util = require('util')

module.exports = { startRepl: startRepl, extendRepl: extendRepl }

var repl

// Start a repl
function startRepl() {
  if (repl) {
    console.error('repl is already running, only one instance is allowed')
    return
  }
  extendRepl(require('repl').start())
}

function extendRepl(theRepl) {
  if (repl) {
    console.error('repl is already running, only one instance is allowed')
    return
  }

  if (!theRepl || typeof theRepl.defineCommand !== function) {
    console.error('bad argument, repl is not compatible')
    return
  }
  
  repl = theRepl

  var tmpfile = makeTempfile()
  process.on('exit', function() {
    try {
      fs.unlinkSync(tmpfile)
    } catch (e) {
      // might not exist
    }
  })

  console.log('Commands: .edit, .run, .stash <filename>, .unstash <filename>, .editor <editor>')

  repl.defineCommand('edit', {
    help: 'Edit the current command in your text editor',
    action: function(editor) {
      edit(tmpfile, editor)
    }
  })

  repl.defineCommand('run', {
    help: 'Run the previously edited command',
    action: function() {
      pause()
      run(tmpfile, function() { unpause() })
    }
  })

  repl.defineCommand('stash', {
    help: 'Write the current command to the named file',
    action: function(dest) {
      stash(tmpfile, dest)
    }
  })

  repl.defineCommand('unstash', {
    help: 'Replace the current command with the contents of the named file',
    action: function(source) {
      unstash(tmpfile, source)
    }
  })

  repl.defineCommand('editor', function(editor) {
    process.env['VISUAL'] = editor
  })
}

// Commands

function edit(cmdfile, editor) {
  editor = editor || process.env['VISUAL'] || process.env['EDITOR']
  // TODO seed the file with repl.context._ if the file doesn't exist yet
  var fds = [process.openStdin(), process.stdout, process.stdout]
    , args = [cmdfile]
  // handle things like 'mate -w' and 'emacsclient --server-file <filename>'
  if (editor.match(/\s/)) {
    var words = editor.split(/\s+/) // FIXME this should do proper word splitting ...
    args = words.slice(1).concat(args)
    editor = words[0]
  }
  pause()
  spawn(editor, args, {customFds: fds}).on('exit', function(code) {
    // some editors change the terminal resulting in skewed output, clean up
    spawn('reset').on('exit', function(_) {
      if (code === 0) {
        run(cmdfile, function() { unpause() })
      } else {
        unpause()
      }
    })
  })
}

function stash(cmdFile, dest) {
  try {
    fs.statSync(cmdFile)
  } catch (e) {
    console.log('nothing to stash')
    return
  }
  var read = fs.createReadStream(cmdFile)
  read.on('end', function() {
    console.log('stashed')
    unpause()
  })
  // TODO confirm before overwriting an existing file
  pause()
  util.pump(read, fs.createWriteStream(dest))
}

function unstash(cmdFile, source) {
  try {
    fs.statSync(source)
  } catch (e) {
    console.log('no stash at ' + source)
    return
  }
  var read = fs.createReadStream(source)
  read.on('end', function() {
    console.log('unstashed')
    unpause()
  })
  pause()
  util.pump(read, fs.createWriteStream(cmdFile))
}

function run(filename, callback) {
  // check if file exists. might not have been saved.
  try {
    fs.statSync(filename)
  } catch (e) {
    repl.stream.write('nothing to run\n')
    callback()
    return
  }

  var evalcx = require('vm').Script.runInContext
    , read = fs.createReadStream(filename)
    , s = ''
  read.on('data', function(d) { s += d })
  read.on('end', function() {
    // The catchall for errors
    try {
      // Use evalcx to supply the global context
      var ret = evalcx(s, repl.context, "repl");
      if (ret !== undefined) {
        repl.context._ = ret;
        repl.writer(ret) + "\n"
      }
    } catch (e) {
      // On error: Print the error and clear the buffer
      if (e.stack) {
        repl.stream.write(e.stack + "\n");
      } else {
        repl.stream.write(e.toString() + "\n");
      }
    }
    if (callback) callback()
  })
}

// Support

var origPrompt
function unpause() {
  repl.prompt = origPrompt
  repl.rli.enabled = true
  repl.outputStream.resume()
  repl.inputStream.resume()
  repl.displayPrompt()
}

function pause() {
  repl.outputStream.pause()
  repl.inputStream.pause()
  repl.rli.enabled = false
  origPrompt = repl.prompt || '> '
  repl.prompt = ''
}

function makeTempfile() {
  var path = require('path')
    , tmpdir

  // Find a suitable directory to store the REPL session
  if (process.env['TMPDIR']) tmpdir = process.env['TMPDIR']
  else {
    try {
      fs.statSync('/tmp')
      tmpdir = '/tmp'
    } catch (e) {
      tmpdir = process.cwd()
    }
  }
  return path.join(tmpdir, 'node-repl-' + process.pid + '.js')
}

if (require.main === module) startRepl()
else if (module.parent && module.parent.id === 'repl') extendRepl(module.parent.exports.repl)
