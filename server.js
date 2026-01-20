require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { exec, spawn } = require('child_process');

// Import game infrastructure
const GameState = require('./server/gameState');
const CommandHandler = require('./server/commandHandler');
const snakeCommands = require('./server/commands/snake');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Store connected users
const users = new Map();

// Initialize game state
const gameState = new GameState();

// Serve static files from Vue build
app.use(express.static(path.join(__dirname, 'client/dist')));

// Serve wrapper at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/wrapper.html'));
});

// Serve app for iframe
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Update endpoint - pulls latest changes, installs deps, rebuilds client, and restarts server
app.get('/update', (req, res) => {
  console.log('Update requested, pulling changes...');

  exec('git pull', { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('Git pull failed:', stderr);
      return res.status(500).send(`Update failed:\n${stderr}`);
    }

    console.log('Git pull output:', stdout);
    const gitOutput = stdout;

    // Install server dependencies
    console.log('Installing server dependencies...');
    exec('npm install', { cwd: __dirname }, (err, serverInstallOut, serverInstallErr) => {
      if (err) {
        console.error('Server npm install failed:', serverInstallErr);
        return res.status(500).send(`Server npm install failed:\n${serverInstallErr}`);
      }

      console.log('Server dependencies installed');

      // Install client dependencies (include dev for vite)
      console.log('Installing client dependencies...');
      exec('npm install --include=dev', { cwd: path.join(__dirname, 'client') }, (err, clientInstallOut, clientInstallErr) => {
        if (err) {
          console.error('Client npm install failed:', clientInstallErr);
          return res.status(500).send(`Client npm install failed:\n${clientInstallErr}`);
        }

        console.log('Client dependencies installed');

        // Rebuild client
        console.log('Rebuilding client...');
        exec('npm run build', { cwd: path.join(__dirname, 'client') }, (err, buildOut, buildErr) => {
          if (err) {
            console.error('Build failed:', buildErr);
            return res.status(500).send(`Build failed:\n${buildErr}`);
          }

          console.log('Build complete');
          res.send(`Update successful:\n${gitOutput}\nDependencies installed.\nClient rebuilt.\n\nServer restarting...`);

          // Restart server after response is sent
          setTimeout(() => {
            console.log('Restarting server...');
            spawn(process.argv[0], process.argv.slice(1), {
              detached: true,
              stdio: 'inherit',
              cwd: __dirname
            }).unref();
            process.exit(0);
          }, 500);
        });
      });
    });
  });
});

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

// Initialize command handler
const commandHandler = new CommandHandler(io, gameState, users, getTimestamp);

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
      const trimmed = text.trim();

      // Check if it's a command
      if (trimmed.startsWith('/')) {
        commandHandler.parse(socket, trimmed);
      } else {
        io.emit('chat', {
          user: username,
          text: trimmed,
          time: getTimestamp()
        });
      }
    }
  });

  // Handle snake input
  socket.on('snake_input', (direction) => {
    const username = users.get(socket.id);
    if (username) {
      const ctx = {
        socket,
        username,
        io,
        gameState,
        users,
        handler: commandHandler,
        getTimestamp
      };
      snakeCommands.handleSnakeInput(ctx, direction);
    }
  });

  // Handle snake quit
  socket.on('snake_quit', () => {
    const username = users.get(socket.id);
    if (username) {
      const ctx = {
        socket,
        username,
        io,
        gameState,
        users,
        handler: commandHandler,
        getTimestamp
      };
      snakeCommands.handleSnakeQuit(ctx);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      // Handle game disconnections
      // If they were hosting snake, end it
      if (gameState.snake.active && gameState.snake.host === socket.id) {
        const ctx = {
          socket,
          username,
          io,
          gameState,
          users,
          handler: commandHandler,
          getTimestamp
        };
        snakeCommands.handleSnakeQuit(ctx);
      }

      // If in blackjack betting phase, mark as folded
      if (gameState.blackjack.collectingWagers && !gameState.blackjack.wagers.has(socket.id)) {
        gameState.blackjack.wagers.set(socket.id, 0);
      }

      // If in race betting phase, mark as passed
      if (gameState.race.collectingBets && !gameState.race.bets.has(socket.id)) {
        gameState.race.bets.set(socket.id, null);
      }

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
