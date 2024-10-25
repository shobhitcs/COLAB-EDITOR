const Delta = require('quill-delta');

let documentDelta = new Delta(); // Initialize a new Delta for the document

const broadcast = (data,socket) => {
    // console.log('Content', data);
    // Listen for document changes from a client
    // Update the document delta
    documentDelta = documentDelta.compose(data.delta); // Apply the incoming delta
    // console.log('Document-delta', documentDelta);
    // Broadcast the updated delta to all other clients
    socket.broadcast.emit('documentUpdated', { delta: data.delta });
}

module.exports = { broadcast}