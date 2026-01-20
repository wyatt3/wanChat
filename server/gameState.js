// Centralized game state manager
class GameState {
  constructor() {
    // User balances - keyed by username (persists across reconnects within session)
    this.balances = new Map();
    this.DEFAULT_BALANCE = 20;

    // Beg tracking
    this.begCounts = new Map(); // username -> count

    // Blackjack state
    this.blackjack = {
      active: false,
      host: null,
      collectingWagers: false,
      wagers: new Map(),        // socketId -> amount
      deck: [],
      hands: new Map(),         // socketId -> { cards: [], stood: false, busted: false, blackjack: false }
      dealerHand: [],
      turnOrder: [],
      currentTurnIndex: 0,
      splitHands: new Map(),    // socketId -> [hand1, hand2]
      currentHandIndex: new Map() // socketId -> 0 or 1 for split hands
    };

    // Horse racing state
    this.race = {
      active: false,
      host: null,
      collectingBets: false,
      bets: new Map(),          // socketId -> { horse: number, amount: number }
      horses: [
        { name: 'Lightning', odds: 2 },
        { name: 'Thunder', odds: 3 },
        { name: 'Shadow', odds: 4 },
        { name: 'Storm', odds: 5 },
        { name: 'Blaze', odds: 6 }
      ],
      positions: [0, 0, 0, 0, 0],
      raceInterval: null,
      finished: false
    };

    // Snake game state
    this.snake = {
      active: false,
      host: null,
      hostUsername: null,
      body: [],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      food: null,
      score: 0,
      foodValue: 1,
      width: 30,
      height: 20,
      gameLoop: null,
      speed: 150
    };
  }

  // Balance methods
  getBalance(username) {
    if (!this.balances.has(username)) {
      this.balances.set(username, this.DEFAULT_BALANCE);
    }
    return this.balances.get(username);
  }

  setBalance(username, amount) {
    this.balances.set(username, Math.max(0, Math.floor(amount)));
  }

  addBalance(username, amount) {
    this.setBalance(username, this.getBalance(username) + amount);
  }

  subtractBalance(username, amount) {
    const current = this.getBalance(username);
    if (current >= amount) {
      this.setBalance(username, current - amount);
      return true;
    }
    return false;
  }

  getAllBalances() {
    return Array.from(this.balances.entries())
      .map(([username, balance]) => ({ username, balance }))
      .sort((a, b) => b.balance - a.balance);
  }

  // Beg tracking
  incrementBeg(username) {
    const count = (this.begCounts.get(username) || 0) + 1;
    this.begCounts.set(username, count);
    return count;
  }

  resetBeg(username) {
    this.begCounts.set(username, 0);
  }

  // Blackjack methods
  resetBlackjack() {
    this.blackjack = {
      active: false,
      host: null,
      collectingWagers: false,
      wagers: new Map(),
      deck: [],
      hands: new Map(),
      dealerHand: [],
      turnOrder: [],
      currentTurnIndex: 0,
      splitHands: new Map(),
      currentHandIndex: new Map()
    };
  }

  isBlackjackActive() {
    return this.blackjack.active || this.blackjack.collectingWagers;
  }

  // Race methods
  resetRace() {
    if (this.race.raceInterval) {
      clearInterval(this.race.raceInterval);
    }
    this.race = {
      active: false,
      host: null,
      collectingBets: false,
      bets: new Map(),
      horses: [
        { name: 'Lightning', odds: 2 },
        { name: 'Thunder', odds: 3 },
        { name: 'Shadow', odds: 4 },
        { name: 'Storm', odds: 5 },
        { name: 'Blaze', odds: 6 }
      ],
      positions: [0, 0, 0, 0, 0],
      raceInterval: null,
      finished: false
    };
  }

  isRaceActive() {
    return this.race.active || this.race.collectingBets;
  }

  // Snake methods
  resetSnake() {
    if (this.snake.gameLoop) {
      clearInterval(this.snake.gameLoop);
    }
    this.snake = {
      active: false,
      host: null,
      hostUsername: null,
      body: [],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      food: null,
      score: 0,
      foodValue: 1,
      width: 30,
      height: 20,
      gameLoop: null,
      speed: 150
    };
  }

  isSnakeActive() {
    return this.snake.active;
  }

  // Check if any game is active
  isAnyGameActive() {
    return this.isBlackjackActive() || this.isRaceActive() || this.isSnakeActive();
  }

  getActiveGame() {
    if (this.isBlackjackActive()) return 'blackjack';
    if (this.isRaceActive()) return 'race';
    if (this.isSnakeActive()) return 'snake';
    return null;
  }
}

module.exports = GameState;
