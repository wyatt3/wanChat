// Command router and parser
const systemCommands = require('./commands/system');
const economyCommands = require('./commands/economy');
const funCommands = require('./commands/fun');
const blackjackCommands = require('./commands/blackjack');
const racingCommands = require('./commands/racing');
const snakeCommands = require('./commands/snake');
const flashCommands = require('./commands/flash');
const storeCommands = require('./commands/store');

class CommandHandler {
  constructor(io, gameState, users, getTimestamp) {
    this.io = io;
    this.gameState = gameState;
    this.users = users;
    this.getTimestamp = getTimestamp;
  }

  // Send system message to a specific socket
  sendToSocket(socket, text) {
    socket.emit('system', { text, time: this.getTimestamp() });
  }

  // Broadcast system message to all
  broadcast(text) {
    this.io.emit('system', { text, time: this.getTimestamp() });
  }

  // Broadcast chat message
  broadcastChat(username, text) {
    this.io.emit('chat', { user: username, text, time: this.getTimestamp() });
  }

  // Get username for socket
  getUsername(socket) {
    return this.users.get(socket.id);
  }

  // Get socket by username
  getSocketByUsername(username) {
    for (const [socketId, name] of this.users.entries()) {
      if (name.toLowerCase() === username.toLowerCase()) {
        return this.io.sockets.sockets.get(socketId);
      }
    }
    return null;
  }

  // Get all connected usernames
  getAllUsernames() {
    return Array.from(this.users.values());
  }

  // Parse and execute command
  parse(socket, input) {
    if (!input.startsWith('/')) return false;

    const trimmed = input.trim();
    const spaceIndex = trimmed.indexOf(' ');
    const cmd = spaceIndex === -1
      ? trimmed.toLowerCase()
      : trimmed.substring(0, spaceIndex).toLowerCase();
    const argsStr = spaceIndex === -1
      ? ''
      : trimmed.substring(spaceIndex + 1).trim();
    const args = argsStr ? argsStr.split(/\s+/) : [];

    const username = this.getUsername(socket);
    if (!username) {
      this.sendToSocket(socket, 'Error: You must join first');
      return true;
    }

    const ctx = {
      socket,
      username,
      cmd,
      args,
      argsStr,
      io: this.io,
      gameState: this.gameState,
      users: this.users,
      handler: this,
      getTimestamp: this.getTimestamp
    };

    // Route to appropriate handler
    switch (cmd) {
      // System commands
      case '/help':
        return systemCommands.help(ctx);
      case '/users':
        return systemCommands.users(ctx);
      case '/clear':
        return systemCommands.clear(ctx);
      case '/clearall':
        return systemCommands.clearAll(ctx);
      case '/killall':
        return systemCommands.killAll(ctx);
      case '/update':
        return systemCommands.update(ctx);

      // Economy commands
      case '/balance':
        return economyCommands.balance(ctx);
      case '/give':
        return economyCommands.give(ctx);
      case '/beg':
        return economyCommands.beg(ctx);

      // Store commands
      case '/store':
        return storeCommands.store(ctx);
      case '/buy':
        return storeCommands.buy(ctx);
      case '/sell':
        return storeCommands.sell(ctx);
      case '/inventory':
      case '/inv':
        return storeCommands.inventory(ctx);
      case '/equip':
        return storeCommands.equip(ctx);
      case '/unequip':
        return storeCommands.unequip(ctx);
      case '/giveitem':
      case '/gift':
        return storeCommands.giveitem(ctx);
      case '/appraise':
        return storeCommands.appraise(ctx);
      case '/inventories':
      case '/invs':
        return storeCommands.inventories(ctx);
      case '/refreshstore':
        return storeCommands.refreshstore(ctx);

      // Fun commands
      case '/fart':
        return funCommands.fart(ctx);
      case '/light':
        return funCommands.light(ctx);

      // Blackjack commands
      case '/deal':
        return blackjackCommands.deal(ctx);
      case '/bet':
        return blackjackCommands.bet(ctx);
      case '/fold':
        return blackjackCommands.fold(ctx);
      case '/hit':
        return blackjackCommands.hit(ctx);
      case '/stand':
        return blackjackCommands.stand(ctx);
      case '/double':
        return blackjackCommands.double(ctx);
      case '/split':
        return blackjackCommands.split(ctx);

      // Racing commands
      case '/race':
        return racingCommands.race(ctx);
      case '/horse':
        return racingCommands.horse(ctx);
      case '/pass':
        return racingCommands.pass(ctx);

      // Snake command
      case '/snake':
        return snakeCommands.snake(ctx);

      // Flash game command
      case '/flash':
        return flashCommands.flash(ctx, args);

      default:
        this.sendToSocket(socket, `Unknown command: ${cmd}. Type /help for available commands.`);
        return true;
    }
  }
}

module.exports = CommandHandler;
