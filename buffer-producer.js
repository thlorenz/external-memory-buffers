'use strict';

var fs = require('fs')
var path = require('path')
var build = require('./build')
var v8profilerdir = path.dirname(require.resolve('v8-profiler'))

module.exports = function produceBuffers(cb) {
  var buf1 = new Buffer([ 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, 0xff ])
  var buf2 = new Buffer('Hello World')
  var buf3 = fs.readFileSync(path.join(v8profilerdir, 'binding.gyp'))
  var buf4 = fs.readFileSync(path.join(v8profilerdir, 'readme.md'))

  var slices = [];
  for (var i = 0; i < 2000; i += 100)
    slices.push(buf4.slice(i, i + 20));

  build()
    .on('error', cb)
    .once('data', done)

  function done(buf5) {
    cb(null, [ buf1, buf2, buf3, buf4, buf5 ].concat(slices))
  }
}
