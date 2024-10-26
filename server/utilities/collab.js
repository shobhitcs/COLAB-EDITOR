const Delta = require('quill-delta');
const { Document } = require('../models/model');

// let documentDelta = new Delta(); // Initialize a new Delta for the document

const documents = {};  //Documents

const lockedSections = {}; //Locks of documents

// Track accumulated deltas per document
const accumulatedDeltas = {}; // { documentId: [deltas] }
let updateTimer = null; // Timer to batch updates at intervals

// Broadcast function
const broadcast = (data, socket) => {
    const { documentId, delta } = data;

    // Initialize document-specific deltas array if it doesn't exist
    if (!accumulatedDeltas[documentId]) {
        accumulatedDeltas[documentId] = [];
    }

    // Add the delta to the document's accumulated deltas
    accumulatedDeltas[documentId].push(delta);

    // Broadcast delta to other connected clients
    socket.to(documentId).emit('documentUpdated', { delta });

    // Set up a batch update to the database every 5 seconds if not already scheduled
    if (!updateTimer) {
        updateTimer = setTimeout(() => {
            applyDeltasAndUpdateDocument();
        },1); // Adjust time interval as needed
    }
};

// Apply deltas and update document in the database
const applyDeltasAndUpdateDocument = async () => {
    for (const [documentId, deltas] of Object.entries(accumulatedDeltas)) {
        if (deltas.length === 0) continue; // Skip if no deltas

        try {
            // Fetch document
            if (!documents[documentId]) {
                documents[documentId] = '';
            }
            document = documents[documentId];


            let documentDelta = new Delta();
            deltas.forEach(delta => {
                documentDelta = documentDelta.compose(delta);
            });

            // Clear processed deltas
            accumulatedDeltas[documentId] = [];

            // Apply accumulated deltas to document content
            documents[documentId] = applyDeltaToContent(document, documentDelta);

            // console.log(documents[documentId], 123);

            // console.log(`Document ${documentId} updated in database`);
        } catch (error) {
            console.error(`Error updating document ${documentId}:`, error);
        }
    }

    // Clear the update timer
    clearTimeout(updateTimer);
    updateTimer = null;
};

const applyDeltaToContent = (content, delta) => {
    // Create initial delta with content
    const editor = new Delta([{ insert: content }]);

    // Compose with the input delta and extract text from ops
    return editor.compose(delta).ops
        .reduce((text, op) => {
            if (typeof op.insert === 'string') {
                return text + op.insert;
            }
            return text;
        }, '');
};


const joindocument = async (documentId, userId, socket) => {
    try {
        // Fetch the document from the database
        const document = await Document.findById(documentId);

        // Fetch document
        if (!documents[documentId]) {
            documents[documentId] = '';
        }
        document.text = documents[documentId];

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
            if (!lockedSections[documentId]) {
                lockedSections[documentId] = [];
            }
            // console.log('locks', lockedSections[documentId]);
            // Optionally send the current document state to the user
            socket.emit('documentContent', { content: document.text, locks : lockedSections[documentId] });

        } else {
            socket.emit('error', 'You do not have access to this document');
        }
    } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', 'An error occurred while joining the document');
    }
}


const locksection = (documentId, range, userId, io) => {
    if (!lockedSections[documentId]) {
        lockedSections[documentId] = [];
    }
    // Add the lock range
    lockedSections[documentId].push({ ...range, userId });

    // Notify all users in the document room
    io.to(documentId).emit('lockUpdate', { lockedRanges: lockedSections[documentId] });
}

module.exports = { broadcast, joindocument, locksection };