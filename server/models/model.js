const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);


// Document Schema
const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true  // Title of the document
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true  // Owner of the document
    },
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permissions: {
            type: String,
            default: 'edit'  // Collaborator permission level (e.g., 'edit')
        }
    }],
    text: {
        type: String,
        default: ""  // Default empty string for text content
    },
    createdAt: {
        type: Date,
        default: Date.now  // Timestamp when document was created
    },
    updatedAt: {
        type: Date,
        default: Date.now  // Timestamp when document was last updated
    }
});


const Document = mongoose.model('Document', documentSchema);

module.exports = { User, Document };