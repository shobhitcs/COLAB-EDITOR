const Delta = require('quill-delta');
const { Document } = require('../models/model');

let documentDelta = new Delta(); // Initialize a new Delta for the document

const broadcast = (data, socket) => {
    // console.log('Content', data);
    // Listen for document changes from a client
    // Update the document delta
    documentDelta = documentDelta.compose(data.delta); // Apply the incoming delta
    // console.log('Document-delta', documentDelta);
    // Broadcast the updated delta to all other clients
    socket.broadcast.emit('documentUpdated', { delta: data.delta });
}

const joindocument = async (documentId, userId, socket) => {
    try {
        // Fetch the document from the database
        const document = await Document.findById(documentId);

        if (!document) {
            socket.emit('error', 'Document not found');
            return;
        }

        // Check if the user is the owner or a collaborator
        const isOwner = document.owner.equals(userId);
        const isCollaborator = document.collaborators.some(collab => collab.user.toString() === userId.toString());

        if (isOwner || isCollaborator) {
            // Join a room specific to this document
            socket.join(documentId);

            // Optionally send the current document state to the user
            socket.emit('documentContent', { content: document.text });

            // console.log('sending document to caller');

            console.log(`User ${userId} joined document ${documentId}`);
        } else {
            socket.emit('error', 'You do not have access to this document');
        }
    } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', 'An error occurred while joining the document');
    }
}

module.exports = { broadcast, joindocument };