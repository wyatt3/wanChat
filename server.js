const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Store connected users
const users = new Map();

// Serve static files from Vue build
app.use(express.static(path.join(__dirname, 'client/dist')));

// Serve index.html for all routes (SPA support)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Format timestamp
function getTimestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle user joining
  socket.on('join', (username) => {
    // Store username for this socket
    users.set(socket.id, username);

    // Notify all users
    io.emit('system', {
      text: `${username} has joined the room`,
      time: getTimestamp()
    });

    // Send updated user list
    io.emit('users', Array.from(users.values()));

    console.log(`${username} joined`);
  });

  // Handle chat messages
  socket.on('message', (text) => {
    const username = users.get(socket.id);
    if (username && text.trim()) {
      io.emit('chat', {
        user: username,
        text: text.trim(),
        time: getTimestamp()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);

      // Notify all users
      io.emit('system', {
        text: `${username} has left the room`,
        time: getTimestamp()
      });

      // Send updated user list
      io.emit('users', Array.from(users.values()));

      console.log(`${username} left`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`wanChat server running on http://localhost:${PORT}`);
});
