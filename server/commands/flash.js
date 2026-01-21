// Flash game commands
const fs = require('fs');
const path = require('path');

// Get list of available flash games
function getAvailableGames() {
  const flashDir = path.join(__dirname, '../../client/public/flash');
  try {
    const files = fs.readdirSync(flashDir);
    return files.filter(f => f.endsWith('.swf')).map(f => {
      const name = f.replace('.swf', '').replace(/_/g, ' ');
      return { file: f, name };
    });
  } catch (e) {
    return [];
  }
}

function flash(ctx, args) {
  const games = getAvailableGames();

  if (games.length === 0) {
    ctx.socket.emit('system', {
      text: 'No flash games available. Add .swf files to client/public/flash/',
      time: ctx.getTimestamp()
    });
    return true;
  }

  // Check if any game is active
  if (ctx.gameState.flash && ctx.gameState.flash.active) {
    ctx.socket.emit('system', {
      text: `A flash game is already running (${ctx.gameState.flash.gameName}). Wait for it to end or ask ${ctx.gameState.flash.host} to close it.`,
      time: ctx.getTimestamp()
    });
    return true;
  }

  // If no args, list available games
  if (!args || args.length === 0) {
    const gameList = games.map((g, i) => `${i + 1}. ${g.name}`).join('\n');
    ctx.socket.emit('system', {
      text: `Available flash games:\n${gameList}\n\nUse: /flash <number> or /flash <name>`,
      time: ctx.getTimestamp()
    });
    return true;
  }

  // Find the game
  const query = args.join(' ').toLowerCase();
  let game = null;

  // Try by number
  const num = parseInt(query);
  if (!isNaN(num) && num >= 1 && num <= games.length) {
    game = games[num - 1];
  } else {
    // Try by name (partial match)
    game = games.find(g => g.name.toLowerCase().includes(query) || g.file.toLowerCase().includes(query));
  }

  if (!game) {
    ctx.socket.emit('system', {
      text: `Game not found: "${args.join(' ')}". Use /flash to see available games.`,
      time: ctx.getTimestamp()
    });
    return true;
  }

  // Start the flash game
  ctx.gameState.flash = {
    active: true,
    host: ctx.username,
    hostSocketId: ctx.socket.id,
    gameFile: game.file,
    gameName: game.name
  };

  ctx.handler.broadcast(`${ctx.username} started playing ${game.name}!`);

  ctx.io.emit('flash_start', {
    host: ctx.username,
    hostSocketId: ctx.socket.id,
    gameFile: game.file,
    gameName: game.name
  });

  return true;
}

function handleFlashQuit(ctx) {
  if (!ctx.gameState.flash || !ctx.gameState.flash.active) {
    return;
  }

  // Only host can quit
  if (ctx.gameState.flash.hostSocketId !== ctx.socket.id) {
    return;
  }

  const gameName = ctx.gameState.flash.gameName;
  ctx.handler.broadcast(`${ctx.username} closed ${gameName}`);

  ctx.io.emit('flash_ended');

  ctx.gameState.flash = {
    active: false,
    host: null,
    hostSocketId: null,
    gameFile: null,
    gameName: null
  };
}

function handleFlashDisconnect(ctx) {
  if (!ctx.gameState.flash || !ctx.gameState.flash.active) {
    return;
  }

  if (ctx.gameState.flash.hostSocketId === ctx.socket.id) {
    const gameName = ctx.gameState.flash.gameName;
    ctx.handler.broadcast(`${ctx.username} disconnected - ${gameName} ended`);

    ctx.io.emit('flash_ended');

    ctx.gameState.flash = {
      active: false,
      host: null,
      hostSocketId: null,
      gameFile: null,
      gameName: null
    };
  }
}

module.exports = {
  flash,
  handleFlashQuit,
  handleFlashDisconnect,
  getAvailableGames
};
