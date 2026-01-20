// Blackjack commands: /deal, /bet, /fold, /hit, /stand, /double, /split
const cards = require('../utils/cards');

function deal(ctx) {
  const { gameState, handler, socket, username, io } = ctx;

  // Check if another game is active
  if (gameState.isAnyGameActive()) {
    const activeGame = gameState.getActiveGame();
    handler.sendToSocket(socket, `Cannot start blackjack - ${activeGame} is already in progress`);
    return true;
  }

  // Start wager collection
  gameState.blackjack.collectingWagers = true;
  gameState.blackjack.host = socket.id;
  gameState.blackjack.wagers = new Map();

  const players = Array.from(ctx.users.values());
  handler.broadcast(`=== BLACKJACK ===`);
  handler.broadcast(`${username} is starting a game of Blackjack!`);
  handler.broadcast(`Type /bet [amount] to join or /fold to pass`);

  // Emit game state to clients
  io.emit('bj_wager_request', {
    host: username,
    players: players
  });

  // Set timeout for betting phase (30 seconds)
  setTimeout(() => {
    if (gameState.blackjack.collectingWagers) {
      startBlackjackGame(ctx);
    }
  }, 30000);

  return true;
}

function bet(ctx) {
  const { gameState, handler, socket, username, args, io } = ctx;

  if (!gameState.blackjack.collectingWagers) {
    handler.sendToSocket(socket, 'No blackjack game is accepting bets right now. Use /deal to start one.');
    return true;
  }

  if (gameState.blackjack.wagers.has(socket.id)) {
    handler.sendToSocket(socket, 'You have already placed a bet');
    return true;
  }

  if (args.length < 1) {
    const balance = gameState.getBalance(username);
    handler.sendToSocket(socket, `Usage: /bet [amount] - Your balance: $${balance}`);
    return true;
  }

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount <= 0) {
    handler.sendToSocket(socket, 'Bet amount must be a positive number');
    return true;
  }

  const balance = gameState.getBalance(username);
  if (amount > balance) {
    handler.sendToSocket(socket, `Insufficient funds. You have $${balance}`);
    return true;
  }

  // Deduct and record wager
  gameState.subtractBalance(username, amount);
  gameState.blackjack.wagers.set(socket.id, amount);

  handler.broadcast(`${username} bets $${amount}`);

  io.emit('bj_bet_placed', {
    player: username,
    amount: amount,
    playersReady: gameState.blackjack.wagers.size
  });

  // Check if all players have responded
  checkAllPlayersResponded(ctx);

  return true;
}

function fold(ctx) {
  const { gameState, handler, socket, username, io } = ctx;

  if (!gameState.blackjack.collectingWagers) {
    handler.sendToSocket(socket, 'No blackjack game is accepting bets right now');
    return true;
  }

  if (gameState.blackjack.wagers.has(socket.id)) {
    handler.sendToSocket(socket, 'You have already placed a bet. Cannot fold now.');
    return true;
  }

  // Mark as folded (bet of 0)
  gameState.blackjack.wagers.set(socket.id, 0);

  handler.broadcast(`${username} folds`);

  io.emit('bj_fold', { player: username });

  checkAllPlayersResponded(ctx);

  return true;
}

function checkAllPlayersResponded(ctx) {
  const { gameState, users } = ctx;
  const totalPlayers = users.size;
  const responses = gameState.blackjack.wagers.size;

  if (responses >= totalPlayers) {
    startBlackjackGame(ctx);
  }
}

function startBlackjackGame(ctx) {
  const { gameState, handler, io, users } = ctx;

  if (!gameState.blackjack.collectingWagers) return;

  gameState.blackjack.collectingWagers = false;

  // Filter out folded players (bet of 0)
  const activePlayers = [];
  for (const [socketId, wager] of gameState.blackjack.wagers.entries()) {
    if (wager > 0) {
      activePlayers.push(socketId);
    }
  }

  if (activePlayers.length === 0) {
    handler.broadcast('No players joined the game. Blackjack cancelled.');
    gameState.resetBlackjack();
    io.emit('bj_cancelled');
    return;
  }

  gameState.blackjack.active = true;
  gameState.blackjack.turnOrder = activePlayers;
  gameState.blackjack.currentTurnIndex = 0;

  // Create and shuffle deck
  gameState.blackjack.deck = cards.createDeck();

  // Deal initial cards
  gameState.blackjack.hands = new Map();
  gameState.blackjack.dealerHand = [];

  // Deal two cards to each player
  for (const socketId of activePlayers) {
    const playerCards = [
      gameState.blackjack.deck.pop(),
      gameState.blackjack.deck.pop()
    ];
    gameState.blackjack.hands.set(socketId, {
      cards: playerCards,
      stood: false,
      busted: false,
      blackjack: cards.isBlackjack(playerCards),
      doubled: false
    });
  }

  // Deal two cards to dealer (one face down)
  gameState.blackjack.dealerHand = [
    gameState.blackjack.deck.pop(),
    gameState.blackjack.deck.pop()
  ];

  // Build game state for clients
  const handsData = {};
  for (const [socketId, hand] of gameState.blackjack.hands.entries()) {
    const username = users.get(socketId);
    handsData[username] = {
      cards: cards.formatHand(hand.cards),
      value: cards.handValue(hand.cards),
      wager: gameState.blackjack.wagers.get(socketId),
      blackjack: hand.blackjack
    };
  }

  const dealerVisible = cards.formatCard(gameState.blackjack.dealerHand[1]);

  handler.broadcast('Cards dealt!');

  io.emit('bj_start', {
    hands: handsData,
    dealerCard: dealerVisible,
    dealerValue: cards.cardValue(gameState.blackjack.dealerHand[1])
  });

  // Check for blackjacks
  for (const [socketId, hand] of gameState.blackjack.hands.entries()) {
    if (hand.blackjack) {
      const username = users.get(socketId);
      handler.broadcast(`${username} has BLACKJACK!`);
    }
  }

  // Start first player's turn
  advanceTurn(ctx);
}

function advanceTurn(ctx) {
  const { gameState, handler, io, users } = ctx;
  const bj = gameState.blackjack;

  // Find next player who hasn't stood or busted
  while (bj.currentTurnIndex < bj.turnOrder.length) {
    const socketId = bj.turnOrder[bj.currentTurnIndex];
    const hand = bj.hands.get(socketId);

    if (!hand.stood && !hand.busted && !hand.blackjack) {
      const username = users.get(socketId);
      const handData = {
        cards: cards.formatHand(hand.cards),
        value: cards.handValue(hand.cards)
      };

      const options = ['hit', 'stand'];
      const wager = bj.wagers.get(socketId);
      const playerBalance = gameState.getBalance(username);

      if (hand.cards.length === 2 && !hand.doubled) {
        if (playerBalance >= wager) {
          options.push('double');
        }
        if (cards.canSplit(hand.cards) && playerBalance >= wager) {
          options.push('split');
        }
      }

      handler.broadcast(`${username}'s turn (${cards.handValue(hand.cards)})`);

      io.emit('bj_turn', {
        player: username,
        socketId: socketId,
        hand: handData,
        options: options
      });

      return;
    }

    bj.currentTurnIndex++;
  }

  // All players done, dealer plays
  dealerPlay(ctx);
}

function hit(ctx) {
  const { gameState, handler, socket, username, io } = ctx;
  const bj = gameState.blackjack;

  if (!bj.active) {
    handler.sendToSocket(socket, 'No blackjack game in progress');
    return true;
  }

  const currentSocketId = bj.turnOrder[bj.currentTurnIndex];
  if (socket.id !== currentSocketId) {
    handler.sendToSocket(socket, "It's not your turn");
    return true;
  }

  const hand = bj.hands.get(socket.id);
  const newCard = bj.deck.pop();
  hand.cards.push(newCard);

  const value = cards.handValue(hand.cards);

  io.emit('bj_action', {
    player: username,
    action: 'hit',
    card: cards.formatCard(newCard),
    handValue: value,
    hand: cards.formatHand(hand.cards)
  });

  if (value > 21) {
    hand.busted = true;
    handler.broadcast(`${username} busts with ${value}!`);
    bj.currentTurnIndex++;
    advanceTurn(ctx);
  } else if (value === 21) {
    hand.stood = true;
    handler.broadcast(`${username} has 21!`);
    bj.currentTurnIndex++;
    advanceTurn(ctx);
  } else {
    // Same player continues
    advanceTurn(ctx);
  }

  return true;
}

function stand(ctx) {
  const { gameState, handler, socket, username, io } = ctx;
  const bj = gameState.blackjack;

  if (!bj.active) {
    handler.sendToSocket(socket, 'No blackjack game in progress');
    return true;
  }

  const currentSocketId = bj.turnOrder[bj.currentTurnIndex];
  if (socket.id !== currentSocketId) {
    handler.sendToSocket(socket, "It's not your turn");
    return true;
  }

  const hand = bj.hands.get(socket.id);
  hand.stood = true;

  const value = cards.handValue(hand.cards);
  handler.broadcast(`${username} stands with ${value}`);

  io.emit('bj_action', {
    player: username,
    action: 'stand',
    handValue: value
  });

  bj.currentTurnIndex++;
  advanceTurn(ctx);

  return true;
}

function double(ctx) {
  const { gameState, handler, socket, username, io } = ctx;
  const bj = gameState.blackjack;

  if (!bj.active) {
    handler.sendToSocket(socket, 'No blackjack game in progress');
    return true;
  }

  const currentSocketId = bj.turnOrder[bj.currentTurnIndex];
  if (socket.id !== currentSocketId) {
    handler.sendToSocket(socket, "It's not your turn");
    return true;
  }

  const hand = bj.hands.get(socket.id);
  if (hand.cards.length !== 2) {
    handler.sendToSocket(socket, 'Can only double on first two cards');
    return true;
  }

  const wager = bj.wagers.get(socket.id);
  const balance = gameState.getBalance(username);

  if (balance < wager) {
    handler.sendToSocket(socket, `Insufficient funds to double. Need $${wager}`);
    return true;
  }

  // Double the wager
  gameState.subtractBalance(username, wager);
  bj.wagers.set(socket.id, wager * 2);
  hand.doubled = true;

  // Draw one card
  const newCard = bj.deck.pop();
  hand.cards.push(newCard);
  hand.stood = true;

  const value = cards.handValue(hand.cards);

  handler.broadcast(`${username} doubles down!`);

  io.emit('bj_action', {
    player: username,
    action: 'double',
    card: cards.formatCard(newCard),
    handValue: value,
    hand: cards.formatHand(hand.cards),
    newWager: wager * 2
  });

  if (value > 21) {
    hand.busted = true;
    handler.broadcast(`${username} busts with ${value}!`);
  }

  bj.currentTurnIndex++;
  advanceTurn(ctx);

  return true;
}

function split(ctx) {
  const { gameState, handler, socket, username, io } = ctx;
  const bj = gameState.blackjack;

  if (!bj.active) {
    handler.sendToSocket(socket, 'No blackjack game in progress');
    return true;
  }

  const currentSocketId = bj.turnOrder[bj.currentTurnIndex];
  if (socket.id !== currentSocketId) {
    handler.sendToSocket(socket, "It's not your turn");
    return true;
  }

  const hand = bj.hands.get(socket.id);
  if (!cards.canSplit(hand.cards)) {
    handler.sendToSocket(socket, 'Cannot split - cards must be a pair');
    return true;
  }

  const wager = bj.wagers.get(socket.id);
  const balance = gameState.getBalance(username);

  if (balance < wager) {
    handler.sendToSocket(socket, `Insufficient funds to split. Need $${wager}`);
    return true;
  }

  // Deduct additional wager
  gameState.subtractBalance(username, wager);

  // Create two hands from the split
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];

  // Draw a new card for each hand
  const newCard1 = bj.deck.pop();
  const newCard2 = bj.deck.pop();

  // Store split hands
  bj.splitHands.set(socket.id, [
    { cards: [card1, newCard1], stood: false, busted: false, wager: wager },
    { cards: [card2, newCard2], stood: false, busted: false, wager: wager }
  ]);

  bj.currentHandIndex.set(socket.id, 0);

  // Update main hand to first split hand for turn tracking
  hand.cards = [card1, newCard1];
  hand.stood = false;
  hand.busted = false;

  handler.broadcast(`${username} splits their hand!`);

  io.emit('bj_action', {
    player: username,
    action: 'split',
    hands: [
      { cards: cards.formatHand([card1, newCard1]), value: cards.handValue([card1, newCard1]) },
      { cards: cards.formatHand([card2, newCard2]), value: cards.handValue([card2, newCard2]) }
    ],
    newWager: wager * 2
  });

  // Continue with first hand
  advanceTurn(ctx);

  return true;
}

function dealerPlay(ctx) {
  const { gameState, handler, io, users } = ctx;
  const bj = gameState.blackjack;

  // Reveal dealer's hole card
  const dealerCards = cards.formatHand(bj.dealerHand);
  let dealerValue = cards.handValue(bj.dealerHand);

  handler.broadcast(`Dealer reveals: ${bj.dealerHand.map(c => `${c.rank}${c.suit}`).join(' ')}`);
  handler.broadcast(`Dealer has ${dealerValue}`);

  io.emit('bj_dealer_reveal', {
    hand: dealerCards,
    value: dealerValue
  });

  // Dealer hits until 17
  const dealerDraws = [];
  while (dealerValue < 17) {
    const newCard = bj.deck.pop();
    bj.dealerHand.push(newCard);
    dealerValue = cards.handValue(bj.dealerHand);
    dealerDraws.push(cards.formatCard(newCard));
    handler.broadcast(`Dealer draws ${newCard.rank}${newCard.suit} (${dealerValue})`);
  }

  if (dealerDraws.length > 0) {
    io.emit('bj_dealer_draw', {
      cards: dealerDraws,
      hand: cards.formatHand(bj.dealerHand),
      value: dealerValue
    });
  }

  const dealerBusted = dealerValue > 21;
  if (dealerBusted) {
    handler.broadcast('Dealer busts!');
  }

  // Calculate results
  const results = [];
  for (const [socketId, hand] of bj.hands.entries()) {
    const username = users.get(socketId);
    const wager = bj.wagers.get(socketId);
    const playerValue = cards.handValue(hand.cards);
    const playerBlackjack = hand.blackjack;

    let result, payout;

    if (hand.busted) {
      result = 'lose';
      payout = 0;
    } else if (playerBlackjack && !cards.isBlackjack(bj.dealerHand)) {
      result = 'blackjack';
      payout = Math.floor(wager * 2.5); // 3:2 payout
    } else if (dealerBusted) {
      result = 'win';
      payout = wager * 2;
    } else if (playerValue > dealerValue) {
      result = 'win';
      payout = wager * 2;
    } else if (playerValue === dealerValue) {
      result = 'push';
      payout = wager; // Return original bet
    } else {
      result = 'lose';
      payout = 0;
    }

    if (payout > 0) {
      gameState.addBalance(username, payout);
    }

    const resultText = result === 'blackjack' ? `BLACKJACK! Won $${payout - wager}` :
                      result === 'win' ? `Won $${payout - wager}` :
                      result === 'push' ? 'Push (tie)' :
                      `Lost $${wager}`;

    handler.broadcast(`${username}: ${resultText}`);

    results.push({
      player: username,
      hand: cards.formatHand(hand.cards),
      value: playerValue,
      result,
      payout,
      wager
    });
  }

  io.emit('bj_result', {
    dealerHand: cards.formatHand(bj.dealerHand),
    dealerValue,
    dealerBusted,
    results
  });

  // Broadcast updated balances
  const allBalances = {};
  for (const name of users.values()) {
    allBalances[name] = gameState.getBalance(name);
  }
  io.emit('balance_update', { balances: allBalances });

  handler.broadcast('=== GAME OVER ===');

  // Reset game state
  gameState.resetBlackjack();
  io.emit('bj_ended');
}

module.exports = {
  deal,
  bet,
  fold,
  hit,
  stand,
  double,
  split
};
