// Persistence layer for balances and inventories
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');
const INVENTORIES_FILE = path.join(DATA_DIR, 'inventories.json');
const EQUIPPED_FILE = path.join(DATA_DIR, 'equipped.json');

// Initialize persistence files on startup
function init() {
  const files = [BALANCES_FILE, INVENTORIES_FILE, EQUIPPED_FILE];

  files.forEach(file => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '{}');
      console.log(`Created ${path.basename(file)}`);
    }
  });
}

// Run init on module load
init();

// Load balances from file
function loadBalances() {
  try {
    if (fs.existsSync(BALANCES_FILE)) {
      const data = fs.readFileSync(BALANCES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading balances:', err);
  }
  return {};
}

// Save balances to file
function saveBalances(balancesMap) {
  try {
    const data = {};
    for (const [username, balance] of balancesMap.entries()) {
      data[username] = balance;
    }
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving balances:', err);
  }
}

// Load inventories from file
function loadInventories() {
  try {
    if (fs.existsSync(INVENTORIES_FILE)) {
      const data = fs.readFileSync(INVENTORIES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading inventories:', err);
  }
  return {};
}

// Save inventories to file
function saveInventories(inventoriesMap) {
  try {
    const data = {};
    for (const [username, items] of inventoriesMap.entries()) {
      data[username] = items;
    }
    fs.writeFileSync(INVENTORIES_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving inventories:', err);
  }
}

// Load equipped titles from file
function loadEquipped() {
  try {
    if (fs.existsSync(EQUIPPED_FILE)) {
      const data = fs.readFileSync(EQUIPPED_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading equipped:', err);
  }
  return {};
}

// Save equipped titles to file
function saveEquipped(equippedMap) {
  try {
    const data = {};
    for (const [username, titleId] of equippedMap.entries()) {
      data[username] = titleId;
    }
    fs.writeFileSync(EQUIPPED_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving equipped:', err);
  }
}

module.exports = {
  loadBalances,
  saveBalances,
  loadInventories,
  saveInventories,
  loadEquipped,
  saveEquipped
};
