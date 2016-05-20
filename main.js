'use strict';

var xhr = require('xhr');
var controlPanelLinks = document.querySelectorAll('.control-panel a')
var bufferListEl = document.getElementById('buffer-list');
var tabHeadersEl = document.getElementById('tabheaders');
var bufferDetailsEl = document.getElementById('buffer-details');
var messagesEl = document.getElementById('messages');

var currentBufferList, selectedBuffer, selectedBufferData;
var selectedEncoding = 'hex';

function renderBufferListItem(item, idx) {
  return '<tr class="selectable" data-index="' + idx + '">' +
            '<td>' + item.snapshotNodeId + '</td>' +
            '<td>' + item.type + '</td>' +
            '<td>' + item.length + '</td>' +
            '<td>' + item.hash + '</td>' +
         '</tr>'
}

function renderBufferList(bufferList) {
  currentBufferList = bufferList;
  var rowsHtml = bufferList.map(renderBufferListItem).join('\n')
  var html = '<table>' +
                '<tr>' +
                '  <th>Snapshot ID</th>' +
                '  <th>Type</th>' +
                '  <th>Length</th>' +
                '  <th>Hash</th>' +
                '</tr>' +
                rowsHtml +
              '</table>'
  bufferListEl.innerHTML = html;
}

function hex(data) {
  function toHex(d) {
    var s = d.toString(16);
    return '00'.slice(0, 2 - s.length) + s
  }
  return data.map(toHex).join(' ');
}

function findSelectable(el) {
  return el.classList.contains('selectable') ? el : findSelectable(el.parentElement);
}

function clearSelectedSiblings(child) {
  // clears selection of self as well, so needs to be selected after
  var siblings = child.parentElement.children
  for (var i = 0; i < siblings.length; i++)
    siblings.item(i).classList.remove('selected')
}

function renderSelectedBuffer() {
  var buf = selectedBuffer;
  var data = selectedBufferData;
  var enc = selectedEncoding;
  var s = enc  === 'hex'
    ? hex(data)
    : buf.toString(selectedEncoding)

  if (enc === 'utf8' || enc === 'ascii' || enc === 'binary')
    s = '<pre>' + s + '</pre>';

  bufferDetailsEl.innerHTML = s;
}

function selectBuffer(e) {
  var selectable = findSelectable(e.target);

  // unselect previously selected row and select this one
  clearSelectedSiblings(selectable);
  selectable.classList.add('selected');

  // update buffer details
  var idx = selectable.dataset.index;
  selectedBufferData = currentBufferList[idx].data;
  selectedBuffer = new Buffer(selectedBufferData);
  renderSelectedBuffer();
}

function selectBufferEncoding(e) {
  var selectable = findSelectable(e.target);
  clearSelectedSiblings(selectable);
  selectable.classList.add('selected');
  selectedEncoding = selectable.dataset.encoding;
  renderSelectedBuffer();
}

function logResponse(res) {
  var html = '<span><em>' + res.status + '</em></span>&nbsp;';
  if (res.error) {
    html += '<span class="error">' + res.error + '</span>';
  } else {
    html += '<span class="message">' + res.msg + '</spanp>';
  }
  messagesEl.innerHTML = html;
}

function onresponse(err, res) {
  if (err) {
    console.error(err);
    return logResponse({ error: err, status: 500 });
  }
  var data = JSON.parse(res.body);
  data.status = res.statusCode;
  if (data.type === 'message') return logResponse(data);
  if (data.type === 'buffer-list') return renderBufferList(JSON.parse(data.json));
}

function processRequest(href) {
  xhr({ uri: href }, onresponse);
}

function hookLink(a) {
  function onclick(e) {
    e.preventDefault();
    processRequest(a.getAttribute('href'));
    return false;
  }
  a.onclick = onclick;
}

for(var i = 0; i < controlPanelLinks.length; i++)
  hookLink(controlPanelLinks[i]);

bufferListEl.onclick = selectBuffer;
tabHeadersEl.onclick = selectBufferEncoding;
