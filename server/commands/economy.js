// Economy commands: /balance, /give, /beg

function balance(ctx) {
  const balances = ctx.gameState.getAllBalances();

  // Also include users who haven't had balance set yet
  const allUsers = ctx.handler.getAllUsernames();
  const balanceMap = new Map(balances.map(b => [b.username, b.balance]));

  allUsers.forEach(name => {
    if (!balanceMap.has(name)) {
      balanceMap.set(name, ctx.gameState.getBalance(name));
    }
  });

  const sortedBalances = Array.from(balanceMap.entries())
    .sort((a, b) => b[1] - a[1]);

  const balanceText = sortedBalances
    .map(([name, bal]) => `${name}: $${bal}`)
    .join(' | ');

  ctx.handler.broadcastChat(ctx.username, `[BALANCES] ${balanceText}`);
  ctx.io.emit('balance_update', { balances: Object.fromEntries(balanceMap) });

  return true;
}

function give(ctx) {
  if (ctx.args.length < 2) {
    ctx.handler.sendToSocket(ctx.socket, 'Usage: /give [username] [amount]');
    return true;
  }

  const recipientName = ctx.args[0];
  const amount = parseInt(ctx.args[1]);

  if (isNaN(amount) || amount <= 0) {
    ctx.handler.sendToSocket(ctx.socket, 'Amount must be a positive number');
    return true;
  }

  // Check if recipient exists
  const allUsers = ctx.handler.getAllUsernames();
  const recipient = allUsers.find(u => u.toLowerCase() === recipientName.toLowerCase());

  if (!recipient) {
    ctx.handler.sendToSocket(ctx.socket, `User "${recipientName}" not found`);
    return true;
  }

  if (recipient.toLowerCase() === ctx.username.toLowerCase()) {
    ctx.handler.sendToSocket(ctx.socket, "You can't give money to yourself");
    return true;
  }

  // Check sender has enough
  const senderBalance = ctx.gameState.getBalance(ctx.username);
  if (senderBalance < amount) {
    ctx.handler.sendToSocket(ctx.socket, `Insufficient funds. You have $${senderBalance}`);
    return true;
  }

  // Transfer
  ctx.gameState.subtractBalance(ctx.username, amount);
  ctx.gameState.addBalance(recipient, amount);

  ctx.handler.broadcast(`${ctx.username} gave $${amount} to ${recipient}`);

  // Update all clients with new balances
  const allBalances = {};
  allUsers.forEach(name => {
    allBalances[name] = ctx.gameState.getBalance(name);
  });
  ctx.io.emit('balance_update', { balances: allBalances });

  return true;
}

function beg(ctx) {
  const count = ctx.gameState.incrementBeg(ctx.username);

  // Broadcast the beg
  const messages = [
    `${ctx.username} is begging for money... 🙏`,
    `${ctx.username} needs some cash! Anyone feeling generous?`,
    `${ctx.username} is down on their luck and asking for help`,
    `${ctx.username}: "Spare some change?"`,
    `${ctx.username} rattles an empty cup hopefully`
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];
  ctx.handler.broadcastChat(ctx.username, message);

  // Every 3-5 begs, give a small amount
  const threshold = 3 + Math.floor(Math.random() * 3);
  if (count >= threshold) {
    const reward = 1 + Math.floor(Math.random() * 3); // $1-3
    ctx.gameState.addBalance(ctx.username, reward);
    ctx.gameState.resetBeg(ctx.username);

    setTimeout(() => {
      ctx.handler.broadcast(`A kind stranger gave ${ctx.username} $${reward}!`);

      // Update balances
      const allUsers = ctx.handler.getAllUsernames();
      const allBalances = {};
      allUsers.forEach(name => {
        allBalances[name] = ctx.gameState.getBalance(name);
      });
      ctx.io.emit('balance_update', { balances: allBalances });
    }, 1000);
  }

  return true;
}

module.exports = {
  balance,
  give,
  beg
};
