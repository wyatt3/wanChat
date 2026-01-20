// Racing commands: /race, /horse, /pass

function race(ctx) {
  const { gameState, handler, socket, username, io, users } = ctx;

  // Check if another game is active
  if (gameState.isAnyGameActive()) {
    const activeGame = gameState.getActiveGame();
    handler.sendToSocket(socket, `Cannot start race - ${activeGame} is already in progress`);
    return true;
  }

  // Start betting phase
  gameState.race.collectingBets = true;
  gameState.race.host = socket.id;
  gameState.race.bets = new Map();

  handler.broadcast('=== HORSE RACE ===');
  handler.broadcast(`${username} is starting a horse race!`);
  handler.broadcast('Place your bets with /horse [1-5] [amount] or /pass to skip');

  // List horses with odds
  gameState.race.horses.forEach((horse, idx) => {
    handler.broadcast(`  ${idx + 1}. ${horse.name} (${horse.odds}:1 odds)`);
  });

  io.emit('race_start', {
    host: username,
    horses: gameState.race.horses,
    players: Array.from(users.values())
  });

  // Set timeout for betting phase (30 seconds)
  setTimeout(() => {
    if (gameState.race.collectingBets) {
      startRace(ctx);
    }
  }, 30000);

  return true;
}

function horse(ctx) {
  const { gameState, handler, socket, username, args, io } = ctx;

  if (!gameState.race.collectingBets) {
    handler.sendToSocket(socket, 'No race is accepting bets. Use /race to start one.');
    return true;
  }

  if (gameState.race.bets.has(socket.id)) {
    handler.sendToSocket(socket, 'You have already placed a bet');
    return true;
  }

  if (args.length < 2) {
    handler.sendToSocket(socket, 'Usage: /horse [1-5] [amount]');
    return true;
  }

  const horseNum = parseInt(args[0]);
  const amount = parseInt(args[1]);

  if (isNaN(horseNum) || horseNum < 1 || horseNum > 5) {
    handler.sendToSocket(socket, 'Horse number must be between 1 and 5');
    return true;
  }

  if (isNaN(amount) || amount <= 0) {
    handler.sendToSocket(socket, 'Bet amount must be a positive number');
    return true;
  }

  const balance = gameState.getBalance(username);
  if (amount > balance) {
    handler.sendToSocket(socket, `Insufficient funds. You have $${balance}`);
    return true;
  }

  // Place bet
  gameState.subtractBalance(username, amount);
  gameState.race.bets.set(socket.id, { horse: horseNum - 1, amount });

  const horseName = gameState.race.horses[horseNum - 1].name;
  handler.broadcast(`${username} bets $${amount} on ${horseName}`);

  io.emit('race_bet_placed', {
    player: username,
    horse: horseNum,
    horseName,
    amount
  });

  checkAllBetsPlaced(ctx);

  return true;
}

function pass(ctx) {
  const { gameState, handler, socket, username, io } = ctx;

  if (!gameState.race.collectingBets) {
    handler.sendToSocket(socket, 'No race is accepting bets');
    return true;
  }

  if (gameState.race.bets.has(socket.id)) {
    handler.sendToSocket(socket, 'You have already placed a bet');
    return true;
  }

  // Mark as passed (null bet)
  gameState.race.bets.set(socket.id, null);

  handler.broadcast(`${username} passes on this race`);

  io.emit('race_pass', { player: username });

  checkAllBetsPlaced(ctx);

  return true;
}

function checkAllBetsPlaced(ctx) {
  const { gameState, users } = ctx;
  const totalPlayers = users.size;
  const responses = gameState.race.bets.size;

  if (responses >= totalPlayers) {
    startRace(ctx);
  }
}

function startRace(ctx) {
  const { gameState, handler, io, users } = ctx;

  if (!gameState.race.collectingBets) return;

  gameState.race.collectingBets = false;
  gameState.race.active = true;
  gameState.race.positions = [0, 0, 0, 0, 0];
  gameState.race.finished = false;

  // Check if any actual bets were placed
  const actualBets = Array.from(gameState.race.bets.values()).filter(b => b !== null);
  if (actualBets.length === 0) {
    handler.broadcast('No bets placed. Race cancelled.');
    gameState.resetRace();
    io.emit('race_cancelled');
    return;
  }

  handler.broadcast('=== AND THEY\'RE OFF! ===');

  io.emit('race_running', {
    horses: gameState.race.horses
  });

  const FINISH_LINE = 100;

  // Start race simulation
  gameState.race.raceInterval = setInterval(() => {
    // Move each horse randomly
    for (let i = 0; i < 5; i++) {
      // Faster horses (lower odds) have slightly higher average speed
      const baseSpeed = 6 - gameState.race.horses[i].odds;
      const speed = Math.max(1, baseSpeed + Math.floor(Math.random() * 6));
      gameState.race.positions[i] = Math.min(FINISH_LINE, gameState.race.positions[i] + speed);
    }

    // Emit position update
    io.emit('race_update', {
      positions: gameState.race.positions,
      finishLine: FINISH_LINE
    });

    // Check for winner
    const winners = [];
    for (let i = 0; i < 5; i++) {
      if (gameState.race.positions[i] >= FINISH_LINE) {
        winners.push(i);
      }
    }

    if (winners.length > 0) {
      clearInterval(gameState.race.raceInterval);
      gameState.race.finished = true;

      // First one to cross wins (or random if tie)
      const winner = winners[Math.floor(Math.random() * winners.length)];
      const winningHorse = gameState.race.horses[winner];

      handler.broadcast(`${winningHorse.name} wins!`);

      // Calculate payouts
      const results = [];
      for (const [socketId, bet] of gameState.race.bets.entries()) {
        if (bet === null) continue;

        const username = users.get(socketId);
        if (bet.horse === winner) {
          const payout = bet.amount * winningHorse.odds;
          gameState.addBalance(username, payout);
          handler.broadcast(`${username} wins $${payout}!`);
          results.push({ player: username, won: true, payout, bet: bet.amount });
        } else {
          handler.broadcast(`${username} loses $${bet.amount}`);
          results.push({ player: username, won: false, payout: 0, bet: bet.amount });
        }
      }

      // Update balances
      const allBalances = {};
      for (const name of users.values()) {
        allBalances[name] = gameState.getBalance(name);
      }
      io.emit('balance_update', { balances: allBalances });

      io.emit('race_result', {
        winner: winner,
        winningHorse: winningHorse.name,
        positions: gameState.race.positions,
        results
      });

      handler.broadcast('=== RACE OVER ===');

      gameState.resetRace();
      io.emit('race_ended');
    }
  }, 150); // Update every 150ms

  return true;
}

module.exports = {
  race,
  horse,
  pass
};
