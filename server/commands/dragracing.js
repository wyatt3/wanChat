// Drag Racing Commands
// /drag - Start a drag race
// /dragbet [amount] [car name] - Join with a bet and select car
// /dragpass - Pass on betting (spectate)
// Controls: WASD/Arrows handled via socket events from client

const TRACK_LENGTH = 100; // 0-100 progress
const GAME_TICK_MS = 100;
const POTHOLE_SPAWN_RATE = 0.08; // Chance per tick to spawn pothole
const COUNTDOWN_SECONDS = 3;

// Start a drag race
function drag(ctx) {
  const { handler, socket, username, gameState, io, users } = ctx;

  // Check if any game is active
  if (gameState.isAnyGameActive()) {
    const activeGame = gameState.getActiveGame();
    handler.sendToSocket(socket, `A ${activeGame} game is already in progress!`);
    return true;
  }

  // Check if user has any cars
  const garage = gameState.getGarage(username);
  const validCars = garage.filter(c => typeof c === 'object' && c.name && c.specs);

  if (validCars.length === 0) {
    handler.sendToSocket(socket, 'You need a car with specs to start a drag race!');
    handler.sendToSocket(socket, 'Buy a car from /dealership first.');
    return true;
  }

  // Initialize drag race
  gameState.drag.active = false;
  gameState.drag.collectingBets = true;
  gameState.drag.host = socket.id;
  gameState.drag.hostUsername = username;
  gameState.drag.racers = new Map();
  gameState.drag.potholes = [];
  gameState.drag.finishOrder = [];
  gameState.drag.trackLength = TRACK_LENGTH;

  handler.broadcast('=== DRAG RACE ===');
  handler.broadcast(`${username} is organizing a drag race!`);
  handler.broadcast('Use /dragbet [amount] [car name] to join');
  handler.broadcast('Use /dragpass to spectate');

  // Emit event to clients
  io.emit('drag_start', {
    host: username,
    players: Array.from(users.values())
  });

  // Set timeout for betting phase (45 seconds)
  setTimeout(() => {
    if (gameState.drag.collectingBets) {
      // Auto-start if we have enough racers
      const racerCount = gameState.drag.racers.size;
      if (racerCount >= 2) {
        startDragRace(ctx);
      } else {
        handler.broadcast('Not enough racers. Drag race cancelled.');
        cancelAndRefund(gameState, handler, io);
      }
    }
  }, 45000);

  return true;
}

// Join a drag race with a bet
function dragbet(ctx, args) {
  const { handler, socket, username, gameState, io } = ctx;

  if (!gameState.drag.collectingBets) {
    handler.sendToSocket(socket, 'No drag race is accepting bets right now.');
    handler.sendToSocket(socket, 'Start one with /drag');
    return true;
  }

  if (gameState.drag.racers.has(username)) {
    handler.sendToSocket(socket, "You're already in this race!");
    return true;
  }

  if (!args || args.trim().length === 0) {
    handler.sendToSocket(socket, 'Usage: /dragbet [amount] [car name]');
    handler.sendToSocket(socket, 'Example: /dragbet 100 Honda Civic');
    return true;
  }

  const parts = args.trim().split(' ');
  if (parts.length < 2) {
    handler.sendToSocket(socket, 'Usage: /dragbet [amount] [car name]');
    return true;
  }

  const betAmount = parseInt(parts[0]);
  const carName = parts.slice(1).join(' ');

  if (isNaN(betAmount) || betAmount < 1) {
    handler.sendToSocket(socket, 'Bet must be at least $1');
    return true;
  }

  const balance = gameState.getBalance(username);
  if (betAmount > balance) {
    handler.sendToSocket(socket, `Insufficient funds. You have $${balance}`);
    return true;
  }

  // Find car in garage
  const garage = gameState.getGarage(username);
  const car = garage.find(c =>
    typeof c === 'object' &&
    c.specs &&
    (c.name.toLowerCase() === carName.toLowerCase() ||
     c.name.toLowerCase().includes(carName.toLowerCase()))
  );

  if (!car) {
    handler.sendToSocket(socket, `You don't own a car matching "${carName}" with specs.`);
    handler.sendToSocket(socket, 'Check /garage to see your cars.');
    return true;
  }

  // Deduct bet
  gameState.subtractBalance(username, betAmount);

  // Add racer
  gameState.drag.racers.set(username, {
    socketId: socket.id,
    car: car,
    bet: betAmount,
    position: 0,
    lane: 0, // 0 = left, 1 = right
    speed: 0,
    nitroLeft: car.specs.nitroCharges || 1,
    finished: false,
    finishTime: null,
    hitPotholes: 0
  });

  const emoji = car.emoji || '🚗';
  handler.broadcast(`${username} enters with ${emoji} ${car.name} ($${betAmount} bet)`);

  io.emit('drag_bet_placed', {
    player: username,
    car: {
      name: car.name,
      emoji: car.emoji || '🚗',
      category: car.category
    },
    amount: betAmount
  });

  return true;
}

// Pass on betting
function dragpass(ctx) {
  const { handler, socket, username, gameState, io } = ctx;

  if (!gameState.drag.collectingBets) {
    handler.sendToSocket(socket, 'No drag race is accepting bets.');
    return true;
  }

  handler.broadcast(`${username} is spectating this race`);
  io.emit('drag_pass', { player: username });

  return true;
}

// Host starts the race
function dragstart(ctx) {
  const { handler, socket, username, gameState } = ctx;

  if (!gameState.drag.collectingBets) {
    handler.sendToSocket(socket, 'No drag race to start.');
    return true;
  }

  if (gameState.drag.hostUsername !== username) {
    handler.sendToSocket(socket, 'Only the host can start the race!');
    return true;
  }

  if (gameState.drag.racers.size < 2) {
    handler.sendToSocket(socket, 'Need at least 2 racers to start!');
    return true;
  }

  startDragRace(ctx);
  return true;
}

// Start the actual race
function startDragRace(ctx) {
  const { handler, io, gameState, users } = ctx;

  if (!gameState.drag.collectingBets) return;

  gameState.drag.collectingBets = false;

  // Check if we have racers
  if (gameState.drag.racers.size < 2) {
    handler.broadcast('Not enough racers. Race cancelled.');
    cancelAndRefund(gameState, handler, io);
    return;
  }

  handler.broadcast('=== RACE STARTING ===');
  handler.broadcast('Controls: W/Up = Left lane, S/Down = Right lane, Space/E = Nitro');

  // Build racer data for client
  const racerData = {};
  for (const [name, racer] of gameState.drag.racers) {
    racerData[name] = {
      car: {
        name: racer.car.name,
        emoji: racer.car.emoji || '🚗',
        category: racer.car.category
      },
      bet: racer.bet,
      position: 0,
      lane: 0,
      nitroLeft: racer.nitroLeft
    };
  }

  io.emit('drag_countdown', {
    racers: racerData,
    countdown: COUNTDOWN_SECONDS
  });

  // Countdown
  let count = COUNTDOWN_SECONDS;
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      handler.broadcast(`${count}...`);
      io.emit('drag_countdown_tick', { count });
    } else {
      clearInterval(countdownInterval);
      handler.broadcast('GO!!!');
      io.emit('drag_go');
      beginRace(gameState, io, handler, users);
    }
  }, 1000);
}

// Begin the race loop
function beginRace(gameState, io, handler, users) {
  gameState.drag.active = true;
  gameState.drag.raceStartTime = Date.now();
  gameState.drag.potholes = [];

  // Game loop
  gameState.drag.gameLoop = setInterval(() => {
    gameTick(gameState, io, handler, users);
  }, GAME_TICK_MS);
}

// Single game tick
function gameTick(gameState, io, handler, users) {
  const drag = gameState.drag;

  // Spawn potholes
  if (Math.random() < POTHOLE_SPAWN_RATE) {
    const lane = Math.random() < 0.5 ? 0 : 1;
    drag.potholes.push({
      lane: lane,
      position: 105 // Start off screen to the right
    });
  }

  // Move potholes toward racers (they scroll left as racers move right)
  drag.potholes = drag.potholes.filter(p => {
    p.position -= 3;
    return p.position > -10;
  });

  // Update each racer
  for (const [username, racer] of drag.racers) {
    if (racer.finished) continue;

    const specs = racer.car.specs;

    // Calculate speed based on car specs
    let acceleration = (specs.trueAcceleration / 100) * 2;
    let maxSpeed = (specs.trueTopSpeed / 300) * 5; // Scale to game units

    // Weight penalty
    const weightPenalty = (specs.trueWeight - 2500) / 10000;
    acceleration -= weightPenalty;

    // Quirk effects
    if (specs.quirk.effect === 'slow_start' && racer.position < 20) {
      acceleration *= 0.6;
    }
    if (specs.quirk.effect === 'hidden_power') {
      maxSpeed *= 1.15;
    }
    if (specs.quirk.effect === 'fast_fragile') {
      maxSpeed *= 1.1;
    }

    // Accelerate toward max speed
    if (racer.speed < maxSpeed) {
      racer.speed = Math.min(maxSpeed, racer.speed + acceleration);
    }

    // Check for pothole collisions
    const hitPothole = drag.potholes.find(p =>
      p.lane === racer.lane &&
      p.position >= racer.position - 5 &&
      p.position <= racer.position + 5
    );

    if (hitPothole) {
      // Remove the pothole
      const idx = drag.potholes.indexOf(hitPothole);
      if (idx > -1) drag.potholes.splice(idx, 1);

      // Handling affects slowdown
      let slowdown = 1.5 - (specs.trueHandling / 100);

      // Quirk effects
      if (specs.quirk.effect === 'pothole_resist') {
        slowdown *= 0.4;
      }
      if (specs.quirk.effect === 'bad_luck') {
        slowdown *= 1.5;
      }

      racer.speed = Math.max(0.5, racer.speed - slowdown);
      racer.hitPotholes++;

      // Notify the racer
      const socket = io.sockets.sockets.get(racer.socketId);
      if (socket) {
        socket.emit('drag_pothole_hit', { slowdown: slowdown.toFixed(1) });
      }
    }

    // Move forward
    racer.position += racer.speed;

    // Check for finish
    if (racer.position >= TRACK_LENGTH && !racer.finished) {
      racer.finished = true;
      racer.finishTime = Date.now() - drag.raceStartTime;
      drag.finishOrder.push(username);

      const place = drag.finishOrder.length;
      const placeText = place === 1 ? '1ST' : place === 2 ? '2ND' : place === 3 ? '3RD' : `${place}TH`;
      handler.broadcast(`${placeText} - ${username} finishes! (${(racer.finishTime / 1000).toFixed(2)}s)`);
    }
  }

  // Build update data
  const racerPositions = {};
  for (const [name, racer] of drag.racers) {
    racerPositions[name] = {
      position: Math.min(100, racer.position),
      lane: racer.lane,
      speed: racer.speed,
      nitroLeft: racer.nitroLeft,
      finished: racer.finished
    };
  }

  // Emit update
  io.emit('drag_update', {
    racers: racerPositions,
    potholes: drag.potholes.map(p => ({ lane: p.lane, position: p.position }))
  });

  // Check if race is over
  const allFinished = Array.from(drag.racers.values()).every(r => r.finished);
  if (allFinished) {
    endRace(gameState, io, handler, users);
  }
}

// End the race and pay out winnings
function endRace(gameState, io, handler, users) {
  clearInterval(gameState.drag.gameLoop);

  const drag = gameState.drag;
  const totalPot = Array.from(drag.racers.values()).reduce((sum, r) => sum + r.bet, 0);

  handler.broadcast('=== RACE FINISHED ===');

  const results = [];

  // Pay winner(s)
  if (drag.finishOrder.length > 0) {
    const winner = drag.finishOrder[0];
    const winnerData = drag.racers.get(winner);

    // Winner takes all
    gameState.addBalance(winner, totalPot);

    handler.broadcast(`${winner} WINS $${totalPot}!`);

    // Build results
    for (let i = 0; i < drag.finishOrder.length; i++) {
      const name = drag.finishOrder[i];
      const data = drag.racers.get(name);
      results.push({
        player: name,
        place: i + 1,
        time: data.finishTime,
        car: data.car.name,
        emoji: data.car.emoji || '🚗',
        bet: data.bet,
        won: i === 0,
        payout: i === 0 ? totalPot : 0
      });
    }
  }

  // Update balances
  const allBalances = {};
  for (const name of users.values()) {
    allBalances[name] = gameState.getBalance(name);
  }
  io.emit('balance_update', { balances: allBalances });

  io.emit('drag_result', {
    winner: drag.finishOrder[0] || null,
    results: results,
    totalPot: totalPot
  });

  // Reset after delay
  setTimeout(() => {
    gameState.resetDrag();
    io.emit('drag_ended');
  }, 5000);
}

// Handle lane switch (called from socket handler)
function switchLane(gameState, username, lane) {
  if (!gameState.drag.active) return false;

  const racer = gameState.drag.racers.get(username);
  if (!racer || racer.finished) return false;

  racer.lane = lane;
  return true;
}

// Handle nitro boost (called from socket handler)
function useNitro(gameState, io, username) {
  if (!gameState.drag.active) return false;

  const racer = gameState.drag.racers.get(username);
  if (!racer || racer.finished) return false;

  if (racer.nitroLeft <= 0) return false;

  racer.nitroLeft--;

  // Nitro boost based on car quirk
  let boostAmount = 2;
  if (racer.car.specs.quirk.effect === 'better_nitro') {
    boostAmount = 3.5;
  }

  racer.speed += boostAmount;

  // Notify the racer
  const socket = io.sockets.sockets.get(racer.socketId);
  if (socket) {
    socket.emit('drag_nitro_used', { boost: boostAmount, remaining: racer.nitroLeft });
  }

  return true;
}

// Cancel and refund
function cancelAndRefund(gameState, handler, io) {
  for (const [racerName, racer] of gameState.drag.racers) {
    gameState.addBalance(racerName, racer.bet);
  }
  gameState.resetDrag();
  io.emit('drag_cancelled');
}

// Cancel a drag race (host only)
function dragcancel(ctx) {
  const { handler, socket, username, gameState, io } = ctx;

  if (!gameState.drag.collectingBets && !gameState.drag.active) {
    handler.sendToSocket(socket, 'No drag race to cancel.');
    return true;
  }

  if (gameState.drag.hostUsername !== username) {
    handler.sendToSocket(socket, 'Only the host can cancel the race!');
    return true;
  }

  handler.broadcast('Drag race cancelled! All bets refunded.');
  cancelAndRefund(gameState, handler, io);

  return true;
}

// Legacy command handlers (redirect to socket-based controls)
function left(ctx) {
  const { handler, socket, username, gameState } = ctx;
  if (switchLane(gameState, username, 0)) {
    handler.sendToSocket(socket, 'Use W/Up key to switch lanes!');
  } else {
    handler.sendToSocket(socket, 'No active race or you are not racing.');
  }
  return true;
}

function right(ctx) {
  const { handler, socket, username, gameState } = ctx;
  if (switchLane(gameState, username, 1)) {
    handler.sendToSocket(socket, 'Use S/Down key to switch lanes!');
  } else {
    handler.sendToSocket(socket, 'No active race or you are not racing.');
  }
  return true;
}

function nitro(ctx) {
  const { handler, socket, username, gameState, io } = ctx;
  if (useNitro(gameState, io, username)) {
    handler.sendToSocket(socket, 'Use Space/E key for nitro!');
  } else {
    handler.sendToSocket(socket, 'No active race, not racing, or out of nitro.');
  }
  return true;
}

module.exports = {
  drag,
  dragbet,
  dragpass,
  dragstart,
  dragcancel,
  left,
  right,
  nitro,
  // Export for socket handler
  switchLane,
  useNitro
};
