#!/usr/bin/env node

var fs = require('fs')
  , path = require('path')
  , repl = require('./lib/index').startRepl()
  , DefaultHistoryFile = path.join(process.env.HOME, '.node_history')
  , historyFile

if ('NODE_HISTORY' in process.env)
  historyFile = process.env.NODE_HISTORY
else
  historyFile = DefaultHistoryFile

// restore history immediately
if (historyFile) {
  try {
    fs.statSync(historyFile)
    var json = fs.readFileSync(historyFile)
    repl.rli.history = JSON.parse(json)
  }
  catch (e) {
    if (e.code !== 'ENOENT') {
      console.error('!!! Error reading history from ' + historyFile)
      if (e.message === 'Unexpected token ILLEGAL') {
        console.error('is this a JSON array of strings? -> ' + json)
      }
      else {
        console.error(e.message)
      }
    }
  }

  // save history on exit
  process.on('exit', function() {
    try {
      fs.writeFileSync(historyFile, JSON.stringify(repl.rli.history))
    }
    catch (e) {
      console.error('Error writing history file to ' + historyFile)
      console.error(e)
    }
  })
}
