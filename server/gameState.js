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

    // Garages - keyed by username (persists to file)
    const savedGarages = persistence.loadGarages();
    this.garages = new Map(Object.entries(savedGarages));

    // Car appraisals - keyed by username -> Map of carName -> { value, reason, appraisedAt }
    const savedCarAppraisals = persistence.loadCarAppraisals();
    this.carAppraisals = new Map();
    for (const [username, cars] of Object.entries(savedCarAppraisals)) {
      this.carAppraisals.set(username, new Map(Object.entries(cars)));
    }

    // Pending car appraisals - cars currently being appraised
    const savedPendingCars = persistence.loadPendingCarAppraisals();
    this.pendingCarAppraisals = new Map(Object.entries(savedPendingCars));

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

    // Drag racing state
    this.drag = {
      active: false,
      host: null,
      hostUsername: null,
      collectingBets: false,
      racers: new Map(),  // username -> { socketId, car, bet, position, lane, speed, nitroLeft, finished, finishTime }
      potholes: [],       // Array of { lane: 0|1, position: number }
      trackLength: 1000,  // Distance to finish line
      gameLoop: null,
      countdown: 0,
      raceStartTime: null,
      finishOrder: []     // Array of usernames in finish order
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
  // Inventory now stores full item objects, not just IDs
  getInventory(username) {
    if (!this.inventories.has(username)) {
      this.inventories.set(username, []);
    }
    return this.inventories.get(username);
  }

  // Add full item object to inventory
  addToInventory(username, item) {
    const inventory = this.getInventory(username);
    // If item is a string (old format), just store it as-is for backwards compat
    if (typeof item === 'string') {
      inventory.push(item);
    } else {
      // Store full item object
      inventory.push({ ...item });
    }
    this.saveInventories();
  }

  // Remove item by name (case insensitive)
  removeFromInventory(username, itemName) {
    const inventory = this.getInventory(username);
    const idx = inventory.findIndex(item => {
      if (typeof item === 'string') {
        return item.toLowerCase() === itemName.toLowerCase();
      }
      return item.name && item.name.toLowerCase() === itemName.toLowerCase();
    });
    if (idx !== -1) {
      inventory.splice(idx, 1);
      this.saveInventories();
      return true;
    }
    return false;
  }

  // Check if user has item by name
  hasItem(username, itemName) {
    const inventory = this.getInventory(username);
    return inventory.some(item => {
      if (typeof item === 'string') {
        return item.toLowerCase() === itemName.toLowerCase();
      }
      return item.name && item.name.toLowerCase() === itemName.toLowerCase();
    });
  }

  saveInventories() {
    persistence.saveInventories(this.inventories);
  }

  // Equipped title methods (uses item name, not ID)
  getEquippedTitle(username) {
    return this.equippedTitles.get(username) || null;
  }

  setEquippedTitle(username, titleName) {
    this.equippedTitles.set(username, titleName);
    this.saveEquipped();
  }

  clearEquippedTitle(username) {
    this.equippedTitles.delete(username);
    this.saveEquipped();
  }

  saveEquipped() {
    persistence.saveEquipped(this.equippedTitles);
  }

  // Appraisal methods (uses item name, not ID)
  getAppraisedValue(username, itemName) {
    const userAppraisals = this.appraisals.get(username);
    if (!userAppraisals) return null;
    // Try exact match first, then case-insensitive
    let appraisal = userAppraisals.get(itemName);
    if (!appraisal) {
      // Case-insensitive search
      for (const [key, val] of userAppraisals.entries()) {
        if (key.toLowerCase() === itemName.toLowerCase()) {
          appraisal = val;
          break;
        }
      }
    }
    return appraisal ? appraisal.value : null;
  }

  // Get full appraisal data including reason (for transfers)
  getAppraisedData(username, itemName) {
    const userAppraisals = this.appraisals.get(username);
    if (!userAppraisals) return null;
    let appraisal = userAppraisals.get(itemName);
    if (!appraisal) {
      for (const [key, val] of userAppraisals.entries()) {
        if (key.toLowerCase() === itemName.toLowerCase()) {
          appraisal = val;
          break;
        }
      }
    }
    return appraisal || null;
  }

  setAppraisedValue(username, itemName, value, reason = null) {
    if (!this.appraisals.has(username)) {
      this.appraisals.set(username, new Map());
    }
    this.appraisals.get(username).set(itemName, {
      value: value,
      reason: reason,
      appraisedAt: Date.now()
    });
    this.saveAppraisals();
  }

  clearAppraisedValue(username, itemName) {
    const userAppraisals = this.appraisals.get(username);
    if (userAppraisals) {
      // Try exact match first
      if (userAppraisals.has(itemName)) {
        userAppraisals.delete(itemName);
      } else {
        // Case-insensitive search
        for (const key of userAppraisals.keys()) {
          if (key.toLowerCase() === itemName.toLowerCase()) {
            userAppraisals.delete(key);
            break;
          }
        }
      }
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

  // Garage methods (stores full car objects)
  getGarage(username) {
    if (!this.garages.has(username)) {
      this.garages.set(username, []);
    }
    return this.garages.get(username);
  }

  addToGarage(username, car) {
    const garage = this.getGarage(username);
    if (typeof car === 'string') {
      garage.push(car);
    } else {
      garage.push({ ...car });
    }
    this.saveGarages();
  }

  removeFromGarage(username, carName) {
    const garage = this.getGarage(username);
    const idx = garage.findIndex(car => {
      if (typeof car === 'string') {
        return car.toLowerCase() === carName.toLowerCase();
      }
      return car.name && car.name.toLowerCase() === carName.toLowerCase();
    });
    if (idx !== -1) {
      garage.splice(idx, 1);
      this.saveGarages();
      return true;
    }
    return false;
  }

  hasCar(username, carName) {
    const garage = this.getGarage(username);
    return garage.some(car => {
      if (typeof car === 'string') {
        return car.toLowerCase() === carName.toLowerCase();
      }
      return car.name && car.name.toLowerCase() === carName.toLowerCase();
    });
  }

  saveGarages() {
    persistence.saveGarages(this.garages);
  }

  // Car appraisal methods
  getCarAppraisedValue(username, carName) {
    const userAppraisals = this.carAppraisals.get(username);
    if (!userAppraisals) return null;
    let appraisal = userAppraisals.get(carName);
    if (!appraisal) {
      for (const [key, val] of userAppraisals.entries()) {
        if (key.toLowerCase() === carName.toLowerCase()) {
          appraisal = val;
          break;
        }
      }
    }
    return appraisal ? appraisal.value : null;
  }

  getCarAppraisedData(username, carName) {
    const userAppraisals = this.carAppraisals.get(username);
    if (!userAppraisals) return null;
    let appraisal = userAppraisals.get(carName);
    if (!appraisal) {
      for (const [key, val] of userAppraisals.entries()) {
        if (key.toLowerCase() === carName.toLowerCase()) {
          appraisal = val;
          break;
        }
      }
    }
    return appraisal || null;
  }

  setCarAppraisedValue(username, carName, value, reason = null) {
    if (!this.carAppraisals.has(username)) {
      this.carAppraisals.set(username, new Map());
    }
    this.carAppraisals.get(username).set(carName, {
      value: value,
      reason: reason,
      appraisedAt: Date.now()
    });
    this.saveCarAppraisals();
  }

  clearCarAppraisedValue(username, carName) {
    const userAppraisals = this.carAppraisals.get(username);
    if (userAppraisals) {
      if (userAppraisals.has(carName)) {
        userAppraisals.delete(carName);
      } else {
        for (const key of userAppraisals.keys()) {
          if (key.toLowerCase() === carName.toLowerCase()) {
            userAppraisals.delete(key);
            break;
          }
        }
      }
      this.saveCarAppraisals();
    }
  }

  saveCarAppraisals() {
    persistence.saveCarAppraisals(this.carAppraisals);
  }

  // Pending car appraisal methods
  addPendingCarAppraisal(id, data) {
    this.pendingCarAppraisals.set(id, data);
    this.savePendingCarAppraisals();
  }

  removePendingCarAppraisal(id) {
    this.pendingCarAppraisals.delete(id);
    this.savePendingCarAppraisals();
  }

  getPendingCarAppraisals() {
    return this.pendingCarAppraisals;
  }

  getPendingCarAppraisalsForUser(username) {
    const pending = [];
    for (const [id, data] of this.pendingCarAppraisals.entries()) {
      if (data.username === username) {
        pending.push({ id, ...data });
      }
    }
    return pending;
  }

  savePendingCarAppraisals() {
    persistence.savePendingCarAppraisals(this.pendingCarAppraisals);
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

  // Drag racing methods
  isDragActive() {
    return this.drag.active || this.drag.collectingBets;
  }

  resetDrag() {
    if (this.drag.gameLoop) {
      clearInterval(this.drag.gameLoop);
    }
    this.drag = {
      active: false,
      host: null,
      hostUsername: null,
      collectingBets: false,
      racers: new Map(),
      potholes: [],
      trackLength: 1000,
      gameLoop: null,
      countdown: 0,
      raceStartTime: null,
      finishOrder: []
    };
  }

  // Check if any game is active
  isAnyGameActive() {
    return this.isBlackjackActive() || this.isRaceActive() || this.isSnakeActive() || this.isFlashActive() || this.isDragActive();
  }

  getActiveGame() {
    if (this.isBlackjackActive()) return 'blackjack';
    if (this.isRaceActive()) return 'race';
    if (this.isSnakeActive()) return 'snake';
    if (this.isFlashActive()) return 'flash';
    if (this.isDragActive()) return 'drag';
    return null;
  }
}

module.exports = GameState;
