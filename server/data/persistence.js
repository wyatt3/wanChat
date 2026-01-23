// Persistence layer for balances and inventories
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');
const INVENTORIES_FILE = path.join(DATA_DIR, 'inventories.json');
const EQUIPPED_FILE = path.join(DATA_DIR, 'equipped.json');
const APPRAISALS_FILE = path.join(DATA_DIR, 'appraisals.json');
const PENDING_APPRAISALS_FILE = path.join(DATA_DIR, 'pendingAppraisals.json');
const GARAGES_FILE = path.join(DATA_DIR, 'garages.json');
const CAR_APPRAISALS_FILE = path.join(DATA_DIR, 'carAppraisals.json');
const PENDING_CAR_APPRAISALS_FILE = path.join(DATA_DIR, 'pendingCarAppraisals.json');

// Initialize persistence files on startup
function init() {
  const files = [
    BALANCES_FILE, INVENTORIES_FILE, EQUIPPED_FILE, APPRAISALS_FILE, PENDING_APPRAISALS_FILE,
    GARAGES_FILE, CAR_APPRAISALS_FILE, PENDING_CAR_APPRAISALS_FILE
  ];

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

// Load appraisals from file
// Format: { username: { itemId: { value: number, appraisedAt: timestamp } } }
function loadAppraisals() {
  try {
    if (fs.existsSync(APPRAISALS_FILE)) {
      const data = fs.readFileSync(APPRAISALS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading appraisals:', err);
  }
  return {};
}

// Save appraisals to file
function saveAppraisals(appraisalsMap) {
  try {
    const data = {};
    for (const [username, items] of appraisalsMap.entries()) {
      data[username] = {};
      for (const [itemId, appraisal] of items.entries()) {
        data[username][itemId] = appraisal;
      }
    }
    fs.writeFileSync(APPRAISALS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving appraisals:', err);
  }
}

// Load pending appraisals from file
// Format: { id: { username, itemId, returnTime, fee } }
function loadPendingAppraisals() {
  try {
    if (fs.existsSync(PENDING_APPRAISALS_FILE)) {
      const data = fs.readFileSync(PENDING_APPRAISALS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading pending appraisals:', err);
  }
  return {};
}

// Save pending appraisals to file
function savePendingAppraisals(pendingMap) {
  try {
    const data = {};
    for (const [id, pending] of pendingMap.entries()) {
      data[id] = pending;
    }
    fs.writeFileSync(PENDING_APPRAISALS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving pending appraisals:', err);
  }
}

// Load garages from file
function loadGarages() {
  try {
    if (fs.existsSync(GARAGES_FILE)) {
      const data = fs.readFileSync(GARAGES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading garages:', err);
  }
  return {};
}

// Save garages to file
function saveGarages(garagesMap) {
  try {
    const data = {};
    for (const [username, cars] of garagesMap.entries()) {
      data[username] = cars;
    }
    fs.writeFileSync(GARAGES_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving garages:', err);
  }
}

// Load car appraisals from file
function loadCarAppraisals() {
  try {
    if (fs.existsSync(CAR_APPRAISALS_FILE)) {
      const data = fs.readFileSync(CAR_APPRAISALS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading car appraisals:', err);
  }
  return {};
}

// Save car appraisals to file
function saveCarAppraisals(appraisalsMap) {
  try {
    const data = {};
    for (const [username, cars] of appraisalsMap.entries()) {
      data[username] = {};
      for (const [carName, appraisal] of cars.entries()) {
        data[username][carName] = appraisal;
      }
    }
    fs.writeFileSync(CAR_APPRAISALS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving car appraisals:', err);
  }
}

// Load pending car appraisals from file
function loadPendingCarAppraisals() {
  try {
    if (fs.existsSync(PENDING_CAR_APPRAISALS_FILE)) {
      const data = fs.readFileSync(PENDING_CAR_APPRAISALS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading pending car appraisals:', err);
  }
  return {};
}

// Save pending car appraisals to file
function savePendingCarAppraisals(pendingMap) {
  try {
    const data = {};
    for (const [id, pending] of pendingMap.entries()) {
      data[id] = pending;
    }
    fs.writeFileSync(PENDING_CAR_APPRAISALS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving pending car appraisals:', err);
  }
}

module.exports = {
  loadBalances,
  saveBalances,
  loadInventories,
  saveInventories,
  loadEquipped,
  saveEquipped,
  loadAppraisals,
  saveAppraisals,
  loadPendingAppraisals,
  savePendingAppraisals,
  loadGarages,
  saveGarages,
  loadCarAppraisals,
  saveCarAppraisals,
  loadPendingCarAppraisals,
  savePendingCarAppraisals
};
