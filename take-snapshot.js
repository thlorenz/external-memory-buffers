'use strict'

const profiler = require('v8-profiler')
const fs = require('fs')
const path = require('path')
let id = 0

function noop() {}

module.exports = function takeSnapshot(cb) {
  const snapshot = profiler.takeSnapshot('EmpireJS is rad', noop)
  snapshot.export()
    .on('error', ondone)
    .pipe(fs.createWriteStream(path.join(__dirname, 'empirejs-' + (++id) + '.heapsnapshot')))
    .on('error', ondone)
    .on('finish', ondone)

  function ondone(err) {
    snapshot.delete()
    cb(err)
  }
}
