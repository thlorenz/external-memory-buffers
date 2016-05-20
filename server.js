'use strict';

// profiler demo

var PORT = 8000;
var fs = require('fs');
var path = require('path');
var http = require('http');
var build = require('./build');
var produceBuffers = require('./buffer-producer');
var inspectBuffers = require('./buffer-inspector');

var producedBuffers = [];

var server = http.createServer();

server
  .on('request', onRequest)
  .on('listening', onListening)
  .listen(PORT);

process.on('SIGTERM', onSIGTERM);

function onSIGTERM() {
  console.error('Caught SIGTERM, shutting down.');
  server.close();
  process.exit(0);
}

console.error('pid', process.pid);

function sendError(res, err) {
  res.end(JSON.stringify({ error: err.message }));
}

function serveIndex (res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
}

function serveBundle (res) {
  res.writeHead(200, { 'Content-Type': 'application/javascript' });
  build().pipe(res);
}

function serveCss (res) {
  res.writeHead(200, { 'Content-Type': 'text/css' });
  fs.createReadStream(path.join(__dirname, 'index.css')).pipe(res);
}

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

function buffersInfoToJSON(buffersInfo) {
  function bufferInfoToJSON(info) {
    return {
      data           : Array.prototype.slice.call(info.buf, 0),
      hasParent      : !!info.parent,
      parentId       : info.parentId || 'N/A',
      snapshotNodeId : info.id,
      length         : info.length,
      hash           : info.hash,
      type           : info.bufferType
    }
  }

  return JSON.stringify(buffersInfo.map(bufferInfoToJSON));
}

function serveProfileBuffers(res) {
  var buffersInfo = inspectBuffers();
  var json = JSON.stringify({ type: 'buffer-list', json: buffersInfoToJSON(buffersInfo) });
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': json.length });
  res.end(json);
}

function serveProduceBuffers(res) {
  var bufs = produceBuffers(onProduced);
  function onProduced(err, bufs) {
    if (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Content-Length': json.length });
      return res.end(JSON.stringify({ type: 'message', msg: err.toString() }));
    }

    bufs.forEach(function addBuffer(buf) { producedBuffers.push(buf) });
    var msg = 'Produced ' + bufs.length + ' more buffers. ' +
              'Produced a total of ' + producedBuffers.length;
    var json = JSON.stringify({ type: 'message', msg: msg });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': json.length });
    res.end(json);
  }
}

/// Handle Requests
function onRequest(req, res) {
  console.error('%s %s', req.method, req.url);

  if (req.url === '/') return serveIndex(res);
  if (req.url === '/bundle.js') return serveBundle(res);
  if (req.url === '/index.css') return serveCss(res);

  if (req.url === '/profile_buffers') return serveProfileBuffers(res);
  if (req.url === '/produce_buffers') return serveProduceBuffers(res);
}

function onListening() {
  console.error('HTTP server listening on port', PORT);
}
