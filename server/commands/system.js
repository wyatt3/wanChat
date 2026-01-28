// System commands: /help, /users, /clear, /clearall, /killall, /update

function help(ctx) {
  const helpText = [
    '=== WANCHAT COMMANDS ===',
    'System: /help /users /clear /clearall',
    'Money: /balance /give [user] [amount] /beg',
    'Store: /store /buy /sell /inventory /inventories /equip /giveitem /appraise',
    'Cars: /dealership /garage /garages /buycar /sellcar /givecar /appraisecar /carspecs',
    'Drag Racing: /drag /dragbet [amount] /dragpass /dragstart /left /right /nitro',
    'Blackjack: /deal /bet [amount] /fold /hit /stand /double /split',
    'Racing: /race /horse [1-5] [amount] /pass',
    'Snake: /snake (WASD to move)',
    'Flash: /flash [game] (list or play Flash games)',
    'Fun: /fart /light',
    'Admin: /update /killall /refreshstore /refreshdealership',
    'UI: /skin [terminal|spreadsheet|email|notepad]'
  ];

  helpText.forEach(line => {
    ctx.handler.sendToSocket(ctx.socket, line);
  });

  return true;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function users(ctx) {
  const userList = ctx.handler.getAllUsernames();
  const userJoinTimes = ctx.userJoinTimes || new Map();
  const now = Date.now();

  ctx.handler.sendToSocket(ctx.socket, `Online users (${userList.length}):`);

  userList.forEach(name => {
    const balance = ctx.gameState.getBalance(name);
    const marker = name === ctx.username ? ' (you)' : '';
    const joinTime = userJoinTimes.get(name.toLowerCase());
    const duration = joinTime ? formatDuration(now - joinTime) : '?';
    ctx.handler.sendToSocket(ctx.socket, `  ${name}${marker} - $${balance} (${duration})`);
  });

  return true;
}

function clear(ctx) {
  // Send clear event only to the requesting socket
  ctx.socket.emit('clear_local');
  return true;
}

function clearAll(ctx) {
  ctx.io.emit('clear_all');
  ctx.handler.broadcast(`${ctx.username} cleared the chat for everyone`);
  return true;
}

function killAll(ctx) {
  ctx.handler.broadcast(`${ctx.username} initiated shutdown. Goodbye!`);
  ctx.io.emit('killall');

  // Give clients time to receive the message, then exit
  setTimeout(() => {
    process.exit(0);
  }, 1000);

  return true;
}

function update(ctx) {
  ctx.handler.broadcast(`${ctx.username} initiated server update...`);
  ctx.io.emit('update_started');

  // Trigger the update endpoint internally
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/update',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    // Update will restart the server
  });

  req.on('error', (err) => {
    ctx.handler.broadcast(`Update failed: ${err.message}`);
  });

  req.end();

  return true;
}

module.exports = {
  help,
  users,
  clear,
  clearAll,
  killAll,
  update
};
