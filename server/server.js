const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const codeRoutes = require('./routes/coderun');

const app = express();


const socketIo = require('socket.io');
const { broadcast, joindocument, locksection, unlocksection } = require('./utilities/collab');
const io = socketIo(9000, {
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"]
  }
});
// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinDocument', async ({ documentId, userId }) => {
    joindocument(documentId, userId, socket);
    // const roomSize = io.sockets.adapter.rooms.get(documentId)?.size || 0;
    // console.log(`Number of users in document ${documentId}: ${roomSize}`);
  });

  // Listen for content updates
  socket.on('documentChange', (data) => {
    broadcast(data, socket,io);
  });

  socket.on('lockSection', ({ documentId, range, userId }) => {
    locksection(documentId, range, userId,io);
  });
  
  socket.on('unlockSection', ({ documentId, range, userId }) => {
    unlocksection(documentId, range, userId,io);
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));


app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/code', codeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));