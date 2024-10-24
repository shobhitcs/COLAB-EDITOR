const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const { Document } = require('../models/model');
const { User } = require('../models/model');


// Create a new document
router.post('/', [auth, [
  check('title', 'Title is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newDocument = new Document({
      title: req.body.title,
      owner: req.user.id,
      text: req.body.text || ''  // Default text if not provided
    });

    const document = await newDocument.save();
    res.json(document);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    }).sort({ updatedAt: -1 });

    // Fetch owner's username and collaborators' usernames for each document
    const documentsWithUsers = await Promise.all(documents.map(async (doc) => {
      const owner = await User.findById(doc.owner);
      const ownerUsername = owner ? owner.username : 'Unknown'; // Handle case if owner is not found

      // Fetch collaborators' usernames
      const collaboratorUsernames = await Promise.all(doc.collaborators.map(async (collab) => {
        const user = await User.findById(collab.user);
        return user ? user.username : 'Unknown'; // Handle case if user is not found
      }));

      return {
        ...doc.toObject(), // Convert document to a plain object
        ownerUsername, // Add owner's username to the response
        collaborators: collaboratorUsernames // Add collaborators' usernames
      };
    }));

    res.json(documentsWithUsers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a document by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check access (owner or collaborator)
    if (document.owner.toString() !== req.user.id &&
      !document.collaborators.some(collab => collab.user.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(document);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

// Update a document by ID
router.put('/:id', [auth, [
  check('title', 'Title is required').not().isEmpty(),
  check('text', 'Text is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check access (owner or collaborator with edit permissions)
    if (document.owner.toString() !== req.user.id &&
      !document.collaborators.some(collab => collab.user.toString() === req.user.id && collab.permissions === 'edit')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    document.title = req.body.title;
    document.text = req.body.text;
    document.updatedAt = new Date();

    await document.save();
    res.json(document);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

// Delete a document by ID
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(req.params.id);
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the owner
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete the document
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

// Add collaborators to a document
router.post('/:id/collaborators', auth, async (req, res) => {
  const { usernames } = req.body; // Extract usernames from the request body

  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the user is the owner or already a collaborator
    if (document.owner.toString() !== req.user.id &&
      !document.collaborators.some(collab => collab.user.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch user IDs from the usernames
    const userIds = await User.find({ username: { $in: usernames } }).select('_id');
    const newCollaborators = userIds.map(user => ({ user: user._id }));

    // Filter out already existing collaborators
    const existingCollaboratorIds = document.collaborators.map(collab => collab.user.toString());
    const filteredNewCollaborators = newCollaborators.filter(newCollab =>
      !existingCollaboratorIds.includes(newCollab.user.toString())
    );

    // Add new collaborators to the document
    if (filteredNewCollaborators.length > 0) {
      document.collaborators.push(...filteredNewCollaborators);
      await document.save();
    }

    res.json(document); // Return the updated document
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/share', [
  auth,
  [
    check('email', 'Valid email is required').isEmail(),
    check('permissions', 'Valid permission level is required').isIn(['view', 'edit'])
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the document owner can share' });
    }

    const userToShare = await User.findOne({ email: req.body.email });
    if (!userToShare) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingCollaborator = document.collaborators.find(
      collab => collab.user.toString() === userToShare._id.toString()
    );

    if (existingCollaborator) {
      existingCollaborator.permissions = req.body.permissions;
    } else {
      document.collaborators.push({
        user: userToShare._id,
        permissions: req.body.permissions
      });
    }

    document.updatedAt = new Date();
    await document.save();

    const updatedDocument = await Document.findById(req.params.id)
      .populate('collaborators.user', ['username', 'email']);

    res.json(updatedDocument);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id/share/:userId', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the document owner can remove collaborators' });
    }

    document.collaborators = document.collaborators.filter(
      collab => collab.user.toString() !== req.params.userId
    );

    document.updatedAt = new Date();
    await document.save();

    const updatedDocument = await Document.findById(req.params.id)
      .populate('collaborators.user', ['username', 'email']);

    res.json(updatedDocument);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// // Remove a collaborator from a document
// router.delete('/:id/collaborators/:username', auth, async (req, res) => {
//   try {
//     const { id, username } = req.params;

//     // Find the document by ID
//     const document = await Document.findById(id);
//     if (!document) {
//       return res.status(404).json({ message: 'Document not found' });
//     }

//     // Check if user is the owner
//     if (document.owner.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     // Remove the collaborator
//     document.collaborators = document.collaborators.filter(collab => collab.username !== username);

//     await document.save();

//     res.json(document); // Return the updated document
//   } catch (err) {
//     console.error(err.message);
//     if (err.kind === 'ObjectId') {
//       return res.status(404).json({ message: 'Document not found' });
//     }
//     res.status(500).send('Server Error');
//   }
// });

module.exports = router;
