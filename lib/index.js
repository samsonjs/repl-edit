//
// Copyright 2010 Sami Samhuri @_sjs
// MIT license
//
// github.com/samsonjs/repl-edit
//

// TODO proper error handling, better intregration with node/lib/repl.js

var fs = require('fs')
  , repl = require('repl')
  , _repl
  , _tmpdir

// Find a suitable directory to store the REPL session
if (process.env['TMPDIR']) _tmpdir = process.env['TMPDIR']
else {
    try {
        fs.statSync('/tmp')
        _tmpdir = '/tmp'
    } catch (e) {
        _tmpdir = process.cwd()
    }
}

exports.startRepl = function() {
    console.log('Commands: edit(), run(), stash(filename), unstash(filename), setEditor(editor)')
    // TODO extend the repl context instead, problem is that repl.js:resetContext() isn't exported
    //      so simple assignments to _repl.context can't survive .clear yet
    exports.extend(global)
    _repl = repl.start()
    return exports
}

exports.extend = function(obj) {
    var path = require('path')
      , spawn = require('child_process').spawn
      , sys = require('sys')
      , _tmpfile = path.join(_tmpdir, 'node-repl-' + process.pid + '.js')

    obj.edit = function(editor) {
        editor = editor || process.ENV['VISUAL'] || process.ENV['EDITOR']
        // TODO seed the file with _repl.context._ if the file doesn't exist yet
        pausingRepl(function(unpause) {
            var fds = [process.openStdin(), process.stdout, process.stdout]
              , args = [_tmpfile]
            // handle things like 'mate -w' and 'emacsclient --server-file <filename>'
            if (editor.match(/\s/)) {
                var words = editor.split(/\s+/) // FIXME this should do proper word splitting ...
                args = words.slice(1).concat(args)
                editor = words[0]
            }
            spawn(editor, args, {customFds: fds}).on('exit', function(code) {
                // some editors change the terminal resulting in skewed output, clean up
                spawn('reset').on('exit', function(_) {
                    if (code === 0) {
                        runFile(_tmpfile, function() { unpause() })
                    } else {
                        unpause()
                    }
                })
            })
        })
    }

    obj.run = function() {
        pausingRepl(function(unpause) {
            runFile(_tmpfile, function() { unpause() })
        })
    }

    obj.setEditor = function(editor) {
        process.ENV['VISUAL'] = editor
    }

    obj.stash = function(dest) {
        try {
            fs.statSync(_tmpfile)
        } catch (e) {
            console.log('nothing to stash')
            return
        }
        pausingRepl(function(unpause) {
            var read = fs.createReadStream(_tmpfile)
            read.on('end', function() {
                console.log('stashed')
                unpause()
            })
            // TODO confirm before overwriting an existing file
            sys.pump(read, fs.createWriteStream(dest))
        })
    }

    obj.unstash = function(source) {
        try {
            fs.statSync(source)
        } catch (e) {
            console.log('no stash at ' + source)
            return
        }
        pausingRepl(function(unpause) {
            var read = fs.createReadStream(source)
            read.on('end', function() {
                console.log('unstashed')
                unpause()
            })
            sys.pump(read, fs.createWriteStream(_tmpfile))
        })
    }

    process.on('exit', function() {
        try {
            fs.unlinkSync(_tmpfile)
        } catch (e) {
            // might not exist
        }
    })
    
    return exports
}

function pausingRepl(fn) {
    var origPrompt = _repl.prompt || '> '
    _repl.stream.pause()
    _repl.rli.enabled = false
    _repl.prompt = ''
    fn(function() {
        _repl.prompt = origPrompt
        _repl.rli.enabled = true
        _repl.stream.resume()
        _repl.displayPrompt()
    })
}

function runFile(filename, callback) {
    var Script = process.binding('evals').Script
      , evalcx = Script.runInContext
      , read = fs.createReadStream(filename)
      , s = ''
    read.on('data', function(d) { s += d })
    read.on('end', function() {
        // The catchall for errors
        try {
            // Use evalcx to supply the global context
            var ret = evalcx(s, _repl.context, "repl");
            if (ret !== undefined) {
                _repl.context._ = ret;
                repl.writer(ret) + "\n"
            }
        } catch (e) {
            // On error: Print the error and clear the buffer
            if (e.stack) {
                _repl.stream.write(e.stack + "\n");
            } else {
                _repl.stream.write(e.toString() + "\n");
            }
        }
        if (callback) callback()
    })
}

if (require.main === module) exports.startRepl()
