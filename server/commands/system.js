// System commands: /help, /users, /clear, /clearall, /killall, /update

function help(ctx) {
  const helpText = [
    '=== WANCHAT COMMANDS ===',
    'System: /help /users /clear /clearall',
    'Money: /balance /give [user] [amount] /beg',
    'Blackjack: /deal /bet [amount] /fold /hit /stand /double /split',
    'Racing: /race /horse [1-5] [amount] /pass',
    'Snake: /snake (WASD to move)',
    'Flash: /flash [game] (list or play Flash games)',
    'Fun: /fart /light',
    'Admin: /update /killall',
    'UI: /skin [terminal|spreadsheet|email|notepad]'
  ];

  helpText.forEach(line => {
    ctx.handler.sendToSocket(ctx.socket, line);
  });

  return true;
}

function users(ctx) {
  const userList = ctx.handler.getAllUsernames();
  ctx.handler.sendToSocket(ctx.socket, `Online users (${userList.length}):`);

  userList.forEach(name => {
    const balance = ctx.gameState.getBalance(name);
    const marker = name === ctx.username ? ' (you)' : '';
    ctx.handler.sendToSocket(ctx.socket, `  ${name}${marker} - $${balance}`);
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
