'use strict'

const crypto = require('crypto')
const profiler = require('v8-profiler')

function hashBuffer(buf) {
  return crypto.createHash('md5')
    .update(buf)
    .digest('hex')
}

function isBuffer(node) {
  return node.bufferType === 'Buffer'
}

function isNativeBuffer(node) {
  return node.bufferType === 'NativeBuffer'
}

function hasParent(node) {
  return !!node.parent
}

module.exports = function inspectBuffers() {
  const buffers = []

  // we need a snapshot to find our buffers
  const snapshot = profiler.takeSnapshot()

  // Filter all snapshot nodes.
  // `onBufferNode` is called for each match.
  // This all happens synchronously.
  // v8 represents Buffers as Uint8Arrays (since node v4)
  snapshot.requestNodesByName('Uint8Array', onBufferNode)
  // slices and core buffers are created as NativeBuffer
  snapshot.requestNodesByName('NativeBuffer', onBufferNode)

  function onBufferNode(node) {
    // Avoid obvious things that aren't buffers but would still
    // match if they had the same name.
    if (node.type !== 'Object') return

    // Once we're pretty sure it's a buffer, we'll resolve the actual Buffer from the heap.
    // This is super expensive since the entire heap is traversed each time.
    // Even if the buffer is found early it will keep traversing.
    let buf = profiler.getObjectByHeapObjectId(node.id)

    // Make sure we didn't get some Object named Buffer, i.e. `function Buffer() {}`.
    if (!Buffer.isBuffer(buf)) {
      if (Object.getPrototypeOf(buf) === Uint8Array.prototype) buf = new Buffer(buf)
      else return
    }

    // Now we can store important information in the buffers array.
    buffers.push({
      buf         : buf,
      parent      : buf.parent,     // not present for Buffers created from Uint8Arrays
      length      : buf.length,
      bufferType  : node.name,      // Uint8Array, Buffer or NativeBuffer
      type        : node.type,
      id          : node.id,
      shallowSize : node.shallowSize,
      hash        : hashBuffer(buf)
    })
  }

  const potentialSliceParents = buffers.filter(isBuffer)

  function attachParentId(currentNode) {
    let node
    for (var i = 0; i < potentialSliceParents.length; i++) {
      node = potentialSliceParents[i]
      if (currentNode.parent === node.buf) {
        currentNode.parentId = node.id
        return
      }
    }
  }

  // NativeBuffers may be slices, so we'd like to know
  // what Buffer they are slices of.
  // Buffers may have a parent, but they aren't a slice
  // and we are only interested in slices for now.
  buffers
    .filter(isNativeBuffer)
    .filter(hasParent)
    .forEach(attachParentId)

  // Finally return all buffers collected inside the `onBufferNode` callback.
  return buffers
}
