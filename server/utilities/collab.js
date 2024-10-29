const Delta = require('quill-delta');
const { Document } = require('../models/model');

// let documentDelta = new Delta(); // Initialize a new Delta for the document

const documents = {};  //Documents

const lockedSections = {}; //Locks of documents

// Track accumulated deltas per document
const accumulatedDeltas = {}; // { documentId: [deltas] }
let updateTimer = null; // Timer to batch updates at intervals


const areArraysEqual = (arr1, arr2) => {
    // Check if both are arrays
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;

    // Check length
    if (arr1.length !== arr2.length) return false;

    // Check each element
    for (let i = 0; i < arr1.length; i++) {
        if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
            return false; // Objects differ
        }
    }

    return true; // All checks passed, arrays are equal
};
// Broadcast function
const broadcast = (data, socket, io) => {
    const { documentId, delta } = data;

    // Initialize document-specific deltas array if it doesn't exist
    if (!accumulatedDeltas[documentId]) {
        accumulatedDeltas[documentId] = [];
    }

    // Add the delta to the document's accumulated deltas
    accumulatedDeltas[documentId].push(delta);

    // Adjust locked sections based on the delta changes
    const newlockedRanges = adjustLockedSections(documentId, delta);

    if (!areArraysEqual(newlockedRanges, lockedSections[documentId])) {
        lockedSections[documentId] = newlockedRanges;
        // console.log('transmitting new locks');
        io.to(documentId).emit('lockUpdate', { lockedRanges: lockedSections[documentId] });
    }
    // Broadcast delta to other connected clients
    socket.to(documentId).emit('documentUpdated', { delta });

    // console.log('old locks', lockedSections[documentId], 'new locks', newlockedRanges);


    // Set up a batch update to the database every 5 seconds if not already scheduled
    if (!updateTimer) {
        updateTimer = setTimeout(() => {
            applyDeltasAndUpdateDocument();
        }, 1); // Adjust time interval as needed
    }
};

// Function to adjust the locked positions based on delta changes
const adjustLockedSections = (documentId, delta) => {
    // Get the locked sections for the document
    const lockedRanges = (lockedSections[documentId] || []).map(lock => ({ ...lock }));


    let index = 0; // Track the cumulative index as we process delta.ops
    delta.ops.forEach(op => {
        if (op.retain) {
            // Move the index by retain length
            index += op.retain;
        } else if (op.insert) {
            // Calculate insertion length
            const insertLength = typeof op.insert === 'string' ? op.insert.length : 1;

            // Move all locks after the index forward by insert length
            lockedRanges.forEach(lock => {
                if (lock.index >= index) {
                    lock.index += insertLength;
                }
            });

            // Update index position after insert
            index += insertLength;
        } else if (op.delete) {
            // Calculate delete length
            const deleteLength = op.delete;

            // Move all locks after the index backward by delete length
            lockedRanges.forEach(lock => {
                if (lock.index > index) {
                    lock.index -= deleteLength;
                }
            });

            // Index remains unchanged after delete
        }
    });
    // console.log(lockedRanges, 123)
    return lockedRanges;
};

// Apply deltas and update document in the database
const applyDeltasAndUpdateDocument = () => {
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
            // console.error(`Error updating document ${documentId}:`, error);
        }
    }

    // Clear the update timer
    clearTimeout(updateTimer);
    updateTimer = null;
};

const applyDeltaToContent = (content, delta) => {
    // Create initial delta with content
    const editor = new Delta([{ insert: content }]);

    // Compose with the input delta and extract text with newline preservation
    return editor.compose(delta).ops.reduce((text, op) => {
        if (typeof op.insert === 'string') {
            // Add the string, which may contain newlines
            // console.log(op.insert, 'Added');
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
            socket.emit('documentContent', { content: document.text, locks: lockedSections[documentId] });

        } else {
            socket.emit('error', 'You do not have access to this document');
        }
    } catch (error) {
        // console.error('Error joining document:', error);
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


const unlocksection = (documentId, range, userId, io) => {
    // Ensure there are locked sections for the given document
    if (!lockedSections[documentId]) {
        return;
    }

    // Find the matching lock and remove it
    lockedSections[documentId] = lockedSections[documentId].filter((lock) => {
        // Check if lock matches the range and is owned by the same user
        return !(lock.index === range.index && lock.length === range.length && lock.userId === userId);
    });

    // Broadcast updated locks to all clients in the document room
    io.to(documentId).emit('lockUpdate', { lockedRanges: lockedSections[documentId] });
};



module.exports = { broadcast, joindocument, locksection, unlocksection };