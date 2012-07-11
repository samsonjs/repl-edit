//
// Copyright 2010 - 2011 Sami Samhuri @_sjs
// MIT license
//
// github.com/samsonjs/repl-edit
//

// TODO proper error handling, better intregration with node/lib/repl.js

var fs = require('fs')
  , replModule = require('repl')
  , spawn = require('child_process').spawn
  , util = require('util')
  , vm = require('vm')
  , Hint = 'Commands: .edit, .run, .stash <filename>, .unstash <filename>, .editor <editor>'
  , theRepl

module.exports = { startRepl: startRepl, extendRepl: extendRepl }

// Start a repl
function startRepl() {
  if (theRepl) {
    console.error('repl is already running, only one instance is allowed')
    return
  }
  return extendRepl(replModule.start('> '))
}

function log(s) {
  if (theRepl.outputStream) {
    theRepl.outputStream.write(s + '\n' + theRepl.prompt)
    theRepl.displayPrompt()
  }
}

function extendRepl(aRepl) {
  if (theRepl) {
    console.error('repl is already running, only one instance is allowed')
    return
  }

  if (!aRepl || typeof aRepl.defineCommand !== 'function') {
    console.error('bad argument, repl is not compatible')
    return
  }
  
  theRepl = aRepl

  var tmpfile = makeTempfile()
  process.on('exit', function() {
    try {
      fs.unlinkSync(tmpfile)
    }
    catch (e) {
      // might not exist
    }
  })

  log(Hint)

  theRepl.defineCommand('edit', {
    help: 'Edit the current command in your text editor'
  , action: function(editor) {
      edit(tmpfile, editor)
    }
  })

  theRepl.defineCommand('run', {
    help: 'Run the previously edited command'
  , action: function() {
      pause()
      run(tmpfile, function() { unpause() })
    }
  })

  theRepl.defineCommand('stash', {
    help: 'Write the current command to the named file'
  , action: function(dest) {
      stash(tmpfile, dest)
    }
  })

  theRepl.defineCommand('unstash', {
    help: 'Replace the current command with the contents of the named file'
  , action: function(source) {
      unstash(tmpfile, source)
    }
  })

  theRepl.defineCommand('editor', function(editor) {
    process.env['VISUAL'] = editor
  })

  return theRepl
}

// Commands

function edit(cmdFile, editor) {
  editor = editor || process.env['VISUAL'] || process.env['EDITOR']

  var fds = [process.openStdin(), process.stdout, process.stdout]
    , args = [cmdFile]

  // handle things like 'mate -w' and 'emacsclient --server-file <filename>'
  if (editor.match(/\s/)) {
    var words = editor.split(/\s+/) // FIXME this should do proper word splitting ...
    args = words.slice(1).concat(args)
    editor = words[0]
  }

  // seed the file with repl.context._ if the file doesn't exist yet
  try {
    fs.statSync(cmdFile)
  }
  catch (e) {
    // skip history[0], it's the .edit command
    var lastCmd = theRepl.rli.history[1]
    if (lastCmd && lastCmd[0] !== '.') {
      fs.writeFileSync(cmdFile, lastCmd)
    }
  }

  pause()
  spawn(editor, args, {customFds: fds}).on('exit', function(code) {
    // some editors change the terminal resulting in skewed output, clean up
    spawn('reset').on('exit', function(_) {
      if (code === 0) {
        run(cmdFile, function() { unpause() })
      }
      else {
        unpause()
      }
    })
  })
}

function stash(cmdFile, dest) {
  try {
    fs.statSync(cmdFile)
  }
  catch (e) {
    log('nothing to stash')
    return
  }
  dest = dest.trim()
  if (!dest) {
    log('try: .stash /path/to/file')
    return
  }
  var read = fs.createReadStream(cmdFile)
  read.on('end', function() {
    log('stashed')
    unpause()
  })
  pause()
  util.pump(read, fs.createWriteStream(dest))
}

function unstash(cmdFile, source) {
  source = source.trim()
  if (!source) {
    log('try: .unstash /path/to/file')
    return
  }
  try {
    fs.statSync(source)
  }
  catch (e) {
    log('no stash at ' + source)
    return
  }
  var read = fs.createReadStream(source)
  read.on('end', function() {
    log('unstashed')
    unpause()
  })
  pause()
  util.pump(read, fs.createWriteStream(cmdFile))
}

function run(filename, callback) {
  // check if file exists. might not have been saved.
  try {
    fs.statSync(filename)
  }
  catch (e) {
    log('nothing to run\n')
    callback()
    return
  }

  var read = fs.createReadStream(filename)
    , cmd = ''
  read.on('data', function(d) { cmd += d })
  read.on('end', function() {
    // The catchall for errors
    try {
      var ret = vm.runInContext(cmd, theRepl.context, 'repl');
      theRepl.context._ = ret
      theRepl.outputStream.write(replModule.writer(ret) + '\n')
    }
    catch (e) {
      // On error: Print the error and clear the buffer
      if (e.stack) {
        log(e.stack + '\n')
      }
      else {
        log(e.toString() + '\n')
      }
    }
    if (callback) callback()
  })
}

// Support

var origPrompt
function unpause() {
  theRepl.prompt = origPrompt
  theRepl.rli.enabled = true
  theRepl.outputStream.resume()
  theRepl.inputStream.resume()
  theRepl.displayPrompt()
}

function pause() {
  theRepl.outputStream.pause()
  theRepl.inputStream.pause()
  theRepl.rli.enabled = false
  origPrompt = theRepl.prompt || '> '
  theRepl.prompt = ''
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

if (require.main === module) {
  startRepl()
}
else if (module.parent && module.parent.id === 'repl') {
  extendRepl(module.parent.exports.repl)
}
