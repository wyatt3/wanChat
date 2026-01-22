// Centralized game state manager
const persistence = require('./data/persistence');

class GameState {
  constructor() {
    // User balances - keyed by username (persists to file)
    const savedBalances = persistence.loadBalances();
    this.balances = new Map(Object.entries(savedBalances));
    this.DEFAULT_BALANCE = 20;

    // User inventories - keyed by username (persists to file)
    const savedInventories = persistence.loadInventories();
    this.inventories = new Map(Object.entries(savedInventories));

    // Equipped titles - keyed by username (persists to file)
    const savedEquipped = persistence.loadEquipped();
    this.equippedTitles = new Map(Object.entries(savedEquipped));

    // Appraisals - keyed by username -> Map of itemId -> { value, appraisedAt }
    const savedAppraisals = persistence.loadAppraisals();
    this.appraisals = new Map();
    for (const [username, items] of Object.entries(savedAppraisals)) {
      this.appraisals.set(username, new Map(Object.entries(items)));
    }

    // Pending appraisals - items currently being appraised
    const savedPending = persistence.loadPendingAppraisals();
    this.pendingAppraisals = new Map(Object.entries(savedPending));

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

    // Flash game state
    this.flash = {
      active: false,
      host: null,
      hostSocketId: null,
      gameFile: null,
      gameName: null
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
    this.saveBalances();
  }

  saveBalances() {
    persistence.saveBalances(this.balances);
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

  // Inventory methods
  getInventory(username) {
    if (!this.inventories.has(username)) {
      this.inventories.set(username, []);
    }
    return this.inventories.get(username);
  }

  addToInventory(username, itemId) {
    const inventory = this.getInventory(username);
    inventory.push(itemId);
    this.saveInventories();
  }

  removeFromInventory(username, itemId) {
    const inventory = this.getInventory(username);
    const idx = inventory.indexOf(itemId);
    if (idx !== -1) {
      inventory.splice(idx, 1);
      this.saveInventories();
      return true;
    }
    return false;
  }

  saveInventories() {
    persistence.saveInventories(this.inventories);
  }

  // Equipped title methods
  getEquippedTitle(username) {
    return this.equippedTitles.get(username) || null;
  }

  setEquippedTitle(username, titleId) {
    this.equippedTitles.set(username, titleId);
    this.saveEquipped();
  }

  clearEquippedTitle(username) {
    this.equippedTitles.delete(username);
    this.saveEquipped();
  }

  saveEquipped() {
    persistence.saveEquipped(this.equippedTitles);
  }

  // Appraisal methods
  getAppraisedValue(username, itemId) {
    const userAppraisals = this.appraisals.get(username);
    if (!userAppraisals) return null;
    const appraisal = userAppraisals.get(itemId);
    return appraisal ? appraisal.value : null;
  }

  setAppraisedValue(username, itemId, value) {
    if (!this.appraisals.has(username)) {
      this.appraisals.set(username, new Map());
    }
    this.appraisals.get(username).set(itemId, {
      value: value,
      appraisedAt: Date.now()
    });
    this.saveAppraisals();
  }

  clearAppraisedValue(username, itemId) {
    const userAppraisals = this.appraisals.get(username);
    if (userAppraisals) {
      userAppraisals.delete(itemId);
      this.saveAppraisals();
    }
  }

  saveAppraisals() {
    persistence.saveAppraisals(this.appraisals);
  }

  // Pending appraisal methods
  addPendingAppraisal(id, data) {
    this.pendingAppraisals.set(id, data);
    this.savePendingAppraisals();
  }

  removePendingAppraisal(id) {
    this.pendingAppraisals.delete(id);
    this.savePendingAppraisals();
  }

  getPendingAppraisals() {
    return this.pendingAppraisals;
  }

  getPendingAppraisalsForUser(username) {
    const pending = [];
    for (const [id, data] of this.pendingAppraisals.entries()) {
      if (data.username === username) {
        pending.push({ id, ...data });
      }
    }
    return pending;
  }

  savePendingAppraisals() {
    persistence.savePendingAppraisals(this.pendingAppraisals);
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

  // Flash methods
  isFlashActive() {
    return this.flash.active;
  }

  resetFlash() {
    this.flash = {
      active: false,
      host: null,
      hostSocketId: null,
      gameFile: null,
      gameName: null
    };
  }

  // Check if any game is active
  isAnyGameActive() {
    return this.isBlackjackActive() || this.isRaceActive() || this.isSnakeActive() || this.isFlashActive();
  }

  getActiveGame() {
    if (this.isBlackjackActive()) return 'blackjack';
    if (this.isRaceActive()) return 'race';
    if (this.isSnakeActive()) return 'snake';
    if (this.isFlashActive()) return 'flash';
    return null;
  }
}

module.exports = GameState;
