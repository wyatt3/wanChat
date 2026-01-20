// Snake game command: /snake

function snake(ctx) {
  const { gameState, handler, socket, username, io } = ctx;

  // Check if another game is active
  if (gameState.isAnyGameActive()) {
    const activeGame = gameState.getActiveGame();
    handler.sendToSocket(socket, `Cannot start snake - ${activeGame} is already in progress`);
    return true;
  }

  // Initialize snake game
  const snk = gameState.snake;
  snk.active = true;
  snk.host = socket.id;
  snk.hostUsername = username;
  snk.width = 30;
  snk.height = 20;
  snk.score = 0;
  snk.foodValue = 1;
  snk.speed = 150;

  // Start snake in center
  const centerX = Math.floor(snk.width / 2);
  const centerY = Math.floor(snk.height / 2);
  snk.body = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY }
  ];
  snk.direction = { x: 1, y: 0 };
  snk.nextDirection = { x: 1, y: 0 };

  // Spawn initial food
  spawnFood(gameState);

  handler.broadcast(`=== SNAKE ===`);
  handler.broadcast(`${username} started a game of Snake!`);
  handler.broadcast('Use WASD or Arrow keys to control');

  io.emit('snake_start', {
    host: username,
    hostSocketId: socket.id,
    width: snk.width,
    height: snk.height,
    body: snk.body,
    food: snk.food,
    score: snk.score,
    foodValue: snk.foodValue
  });

  // Start game loop
  snk.gameLoop = setInterval(() => {
    updateSnake(ctx);
  }, snk.speed);

  return true;
}

function spawnFood(gameState) {
  const snk = gameState.snake;
  let food;
  let attempts = 0;

  do {
    food = {
      x: Math.floor(Math.random() * snk.width),
      y: Math.floor(Math.random() * snk.height)
    };
    attempts++;
  } while (snk.body.some(seg => seg.x === food.x && seg.y === food.y) && attempts < 100);

  snk.food = food;
}

function updateSnake(ctx) {
  const { gameState, handler, io } = ctx;
  const snk = gameState.snake;

  if (!snk.active) return;

  // Update direction
  snk.direction = { ...snk.nextDirection };

  // Calculate new head position
  const head = snk.body[0];
  const newHead = {
    x: head.x + snk.direction.x,
    y: head.y + snk.direction.y
  };

  // Check wall collision
  if (newHead.x < 0 || newHead.x >= snk.width ||
      newHead.y < 0 || newHead.y >= snk.height) {
    endSnakeGame(ctx, 'wall');
    return;
  }

  // Check self collision
  if (snk.body.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    endSnakeGame(ctx, 'self');
    return;
  }

  // Move snake
  snk.body.unshift(newHead);

  // Check food collision
  let ate = false;
  if (newHead.x === snk.food.x && newHead.y === snk.food.y) {
    snk.score += snk.foodValue;
    snk.foodValue = Math.min(snk.foodValue + 1, 10); // Max 10x multiplier

    // Spawn new food
    spawnFood(gameState);

    // Speed up slightly
    if (snk.speed > 80) {
      snk.speed -= 2;
      clearInterval(snk.gameLoop);
      snk.gameLoop = setInterval(() => updateSnake(ctx), snk.speed);
    }

    ate = true;
  } else {
    // Remove tail if didn't eat
    snk.body.pop();
  }

  // Emit update to all clients
  io.emit('snake_update', {
    body: snk.body,
    food: snk.food,
    score: snk.score,
    foodValue: snk.foodValue,
    ate
  });
}

function endSnakeGame(ctx, reason) {
  const { gameState, handler, io, users } = ctx;
  const snk = gameState.snake;

  clearInterval(snk.gameLoop);

  const username = snk.hostUsername;
  const finalScore = snk.score;

  // Award score as money
  if (finalScore > 0) {
    gameState.addBalance(username, finalScore);
  }

  const reasonText = reason === 'wall' ? 'hit a wall' : 'hit itself';
  handler.broadcast(`${username} ${reasonText}! Final score: ${finalScore}`);

  if (finalScore > 0) {
    handler.broadcast(`${username} earned $${finalScore}!`);
  }

  io.emit('snake_end', {
    player: username,
    score: finalScore,
    winnings: finalScore,
    reason
  });

  // Update balances
  const allBalances = {};
  for (const name of users.values()) {
    allBalances[name] = gameState.getBalance(name);
  }
  io.emit('balance_update', { balances: allBalances });

  handler.broadcast('=== GAME OVER ===');

  gameState.resetSnake();
  io.emit('snake_ended');
}

// Handle input from client
function handleSnakeInput(ctx, direction) {
  const { gameState, socket } = ctx;
  const snk = gameState.snake;

  if (!snk.active || socket.id !== snk.host) return;

  // Prevent 180-degree turns
  const opposites = {
    'up': 'down',
    'down': 'up',
    'left': 'right',
    'right': 'left'
  };

  const currentDir = snk.direction.x === 0
    ? (snk.direction.y < 0 ? 'up' : 'down')
    : (snk.direction.x < 0 ? 'left' : 'right');

  if (opposites[direction] === currentDir) return;

  switch (direction) {
    case 'up':
      snk.nextDirection = { x: 0, y: -1 };
      break;
    case 'down':
      snk.nextDirection = { x: 0, y: 1 };
      break;
    case 'left':
      snk.nextDirection = { x: -1, y: 0 };
      break;
    case 'right':
      snk.nextDirection = { x: 1, y: 0 };
      break;
  }
}

// Handle quit from client
function handleSnakeQuit(ctx) {
  const { gameState, socket } = ctx;
  const snk = gameState.snake;

  if (!snk.active || socket.id !== snk.host) return;

  endSnakeGame(ctx, 'quit');
}

module.exports = {
  snake,
  handleSnakeInput,
  handleSnakeQuit
};
