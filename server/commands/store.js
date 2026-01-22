// Store commands: /store, /buy, /inventory
const storeConfig = require('../data/storeConfig');

// Format price with commas
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Build inventory items in display order (grouped by category)
function getInventoryDisplayOrder(inventory) {
  const items = inventory.map(id => storeConfig.getItem(id)).filter(Boolean);
  const byCategory = { title: [], collectible: [], effect: [], consumable: [] };

  items.forEach(item => {
    if (byCategory[item.category]) {
      byCategory[item.category].push(item);
    }
  });

  // Return in consistent order: titles first, then collectibles, etc.
  return [...byCategory.title, ...byCategory.collectible, ...byCategory.effect, ...byCategory.consumable];
}

function store(ctx) {
  const { handler, socket, username, gameState } = ctx;
  const items = storeConfig.getAvailableItems();
  const balance = gameState.getBalance(username);
  const inventory = gameState.getInventory(username);

  const raritySymbols = {
    common: '',
    uncommon: '*',
    rare: '**',
    legendary: '***',
    mythic: '****',
    ultra: '!!!!!'
  };

  handler.sendToSocket(socket, '┌────────────────────────────────────────────┐');
  handler.sendToSocket(socket, '│              WANCHAT STORE                 │');
  handler.sendToSocket(socket, '├────────────────────────────────────────────┤');
  handler.sendToSocket(socket, `   Your balance: $${formatPrice(balance)}`);
  handler.sendToSocket(socket, '├────────────────────────────────────────────┤');

  items.forEach((item, idx) => {
    const emoji = item.emoji || ' ';
    const owned = inventory.includes(item.id) ? ' [OWNED]' : '';
    const stars = raritySymbols[item.rarity] || '';
    const price = `$${formatPrice(item.price)}`;
    const name = item.name.length > 18 ? item.name.substring(0, 16) + '..' : item.name;

    handler.sendToSocket(socket, `  ${(idx + 1).toString().padStart(2)}. ${emoji} ${name.padEnd(18)} ${price.padStart(12)} ${stars}${owned}`);
  });

  handler.sendToSocket(socket, '├────────────────────────────────────────────┤');
  handler.sendToSocket(socket, '   /buy [#]  /sell [#]  /inventory');
  handler.sendToSocket(socket, '   Stock refreshes every 15 min');
  handler.sendToSocket(socket, '└────────────────────────────────────────────┘');

  return true;
}

function buy(ctx) {
  const { handler, socket, username, args, gameState, io } = ctx;

  if (args.length < 1) {
    handler.sendToSocket(socket, 'Usage: /buy [number or item name]');
    return true;
  }

  const availableItems = storeConfig.getAvailableItems();
  let item = null;

  // Try parsing as number first
  const num = parseInt(args[0]);
  if (!isNaN(num) && num >= 1 && num <= availableItems.length) {
    item = availableItems[num - 1];
  } else {
    // Try matching by name (case insensitive, partial match)
    const searchTerm = args.join(' ').toLowerCase();
    item = availableItems.find(i =>
      i.name.toLowerCase().includes(searchTerm) ||
      i.id.toLowerCase().includes(searchTerm)
    );
  }

  if (!item) {
    handler.sendToSocket(socket, 'Item not found. Use /store to see available items.');
    return true;
  }

  // Check if already owned (for non-consumables)
  const inventory = gameState.getInventory(username);
  if (inventory.includes(item.id) && item.category !== 'consumable') {
    handler.sendToSocket(socket, `You already own ${item.name}!`);
    return true;
  }

  // Check balance
  const balance = gameState.getBalance(username);
  if (balance < item.price) {
    handler.sendToSocket(socket, `Insufficient funds! ${item.name} costs $${item.price}, you have $${balance}`);
    return true;
  }

  // Make purchase
  gameState.subtractBalance(username, item.price);
  gameState.addToInventory(username, item.id);

  const emoji = item.emoji || '';
  handler.broadcast(`${username} purchased ${emoji} ${item.name} for $${item.price}!`);

  // Emit balance update
  const allUsers = handler.getAllUsernames();
  const allBalances = {};
  allUsers.forEach(name => {
    allBalances[name] = gameState.getBalance(name);
  });
  io.emit('balance_update', { balances: allBalances });

  return true;
}

function inventory(ctx) {
  const { handler, socket, username, args, gameState } = ctx;

  // Check if viewing someone else's inventory
  let targetUser = username;
  if (args.length > 0) {
    targetUser = args[0];
  }

  const items = gameState.getInventory(targetUser);
  const isOwn = targetUser.toLowerCase() === username.toLowerCase();

  if (items.length === 0) {
    handler.sendToSocket(socket, '┌────────────────────────────────────────────┐');
    handler.sendToSocket(socket, '│             INVENTORY EMPTY                │');
    handler.sendToSocket(socket, '├────────────────────────────────────────────┤');
    handler.sendToSocket(socket, '   Use /store to shop!');
    handler.sendToSocket(socket, '└────────────────────────────────────────────┘');
    return true;
  }

  const title = isOwn ? 'YOUR INVENTORY' : `${targetUser.toUpperCase()}'S INVENTORY`;
  const boxWidth = 42;
  const titlePadded = title.length > boxWidth ? title.substring(0, boxWidth) : title;
  const leftPad = Math.floor((boxWidth - titlePadded.length) / 2);
  const rightPad = boxWidth - titlePadded.length - leftPad;

  handler.sendToSocket(socket, '┌────────────────────────────────────────────┐');
  handler.sendToSocket(socket, `│${' '.repeat(leftPad)}${titlePadded}${' '.repeat(rightPad)}│`);
  handler.sendToSocket(socket, '├────────────────────────────────────────────┤');

  const displayItems = getInventoryDisplayOrder(items);
  const equippedTitleId = isOwn ? gameState.getEquippedTitle(username) : null;

  const categoryNames = {
    title: 'TITLES',
    collectible: 'COLLECTIBLES',
    effect: 'EFFECTS',
    consumable: 'CONSUMABLES'
  };

  let currentCategory = null;
  let hasTitles = false;

  displayItems.forEach((item, idx) => {
    // Print category header when category changes
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      const catName = categoryNames[item.category] || item.category.toUpperCase();
      handler.sendToSocket(socket, `  ${catName}`);
    }

    if (item.category === 'title') hasTitles = true;

    const emoji = item.emoji || ' ';
    const sellValue = Math.floor(item.price * 0.5);
    const equipped = (item.id === equippedTitleId) ? '*' : ' ';
    const name = item.name.length > 18 ? item.name.substring(0, 16) + '..' : item.name;
    handler.sendToSocket(socket, `  ${equipped}${(idx + 1).toString().padStart(2)}. ${emoji} ${name.padEnd(18)} ($${formatPrice(sellValue)})`);
  });

  handler.sendToSocket(socket, '├────────────────────────────────────────────┤');
  if (isOwn && hasTitles) {
    handler.sendToSocket(socket, '   /equip [#] to equip a title');
    handler.sendToSocket(socket, '   /unequip to remove title');
  }
  handler.sendToSocket(socket, '   /sell [#] to sell (50% value)');
  handler.sendToSocket(socket, '   * = currently equipped');
  handler.sendToSocket(socket, '└────────────────────────────────────────────┘');

  return true;
}

function sell(ctx) {
  const { handler, socket, username, args, gameState, io } = ctx;

  if (args.length < 1) {
    handler.sendToSocket(socket, 'Usage: /sell [number or item name]');
    handler.sendToSocket(socket, 'Use /inventory to see your items');
    return true;
  }

  const inventory = gameState.getInventory(username);
  if (inventory.length === 0) {
    handler.sendToSocket(socket, 'Your inventory is empty!');
    return true;
  }

  // Use same display order as /inventory
  const displayItems = getInventoryDisplayOrder(inventory);

  let item = null;

  // Try parsing as number first (uses display order)
  const num = parseInt(args[0]);
  if (!isNaN(num) && num >= 1 && num <= displayItems.length) {
    item = displayItems[num - 1];
  } else {
    // Try matching by name (case insensitive, partial match)
    const searchTerm = args.join(' ').toLowerCase();
    item = displayItems.find(i =>
      i.name.toLowerCase().includes(searchTerm) ||
      i.id.toLowerCase().includes(searchTerm)
    );
  }

  if (!item) {
    handler.sendToSocket(socket, 'Item not found in your inventory. Use /inventory to see your items.');
    return true;
  }

  // If selling equipped title, unequip it first
  const equippedTitleId = gameState.getEquippedTitle(username);
  if (item.id === equippedTitleId) {
    gameState.clearEquippedTitle(username);
  }

  // Calculate sell price (50% of original)
  const sellPrice = Math.floor(item.price * 0.5);

  // Remove from inventory and add balance
  gameState.removeFromInventory(username, item.id);
  gameState.addBalance(username, sellPrice);

  const emoji = item.emoji || '';
  handler.broadcast(`${username} sold ${emoji} ${item.name} for $${sellPrice}!`);

  // Emit balance update
  const allUsers = handler.getAllUsernames();
  const allBalances = {};
  allUsers.forEach(name => {
    allBalances[name] = gameState.getBalance(name);
  });
  io.emit('balance_update', { balances: allBalances });

  return true;
}

function equip(ctx) {
  const { handler, socket, username, args, gameState } = ctx;

  if (args.length < 1) {
    handler.sendToSocket(socket, 'Usage: /equip [title name or number from /inventory]');
    return true;
  }

  const inventory = gameState.getInventory(username);
  const displayItems = getInventoryDisplayOrder(inventory);
  const ownedTitles = displayItems.filter(item => item.category === 'title');

  if (ownedTitles.length === 0) {
    handler.sendToSocket(socket, 'You don\'t own any titles. Buy some from /store!');
    return true;
  }

  let title = null;

  // Try parsing as number first (uses display order numbering)
  const num = parseInt(args[0]);
  if (!isNaN(num) && num >= 1 && num <= displayItems.length) {
    const item = displayItems[num - 1];
    if (item && item.category === 'title') {
      title = item;
    } else {
      handler.sendToSocket(socket, 'That item is not a title.');
      return true;
    }
  } else {
    // Try matching by name
    const searchTerm = args.join(' ').toLowerCase();
    title = ownedTitles.find(t =>
      t.name.toLowerCase().includes(searchTerm) ||
      t.prefix.toLowerCase().includes(searchTerm)
    );
  }

  if (!title) {
    handler.sendToSocket(socket, 'Title not found. Use /inventory to see your titles.');
    return true;
  }

  gameState.setEquippedTitle(username, title.id);
  handler.sendToSocket(socket, `Equipped ${title.prefix} title! Your name will now show as: ${title.prefix} ${username}`);

  return true;
}

function unequip(ctx) {
  const { handler, socket, username, gameState } = ctx;

  const currentTitle = gameState.getEquippedTitle(username);
  if (!currentTitle) {
    handler.sendToSocket(socket, 'You don\'t have a title equipped.');
    return true;
  }

  const title = storeConfig.getItem(currentTitle);
  gameState.clearEquippedTitle(username);
  handler.sendToSocket(socket, `Unequipped ${title ? title.prefix : 'your'} title.`);

  return true;
}

module.exports = {
  store,
  buy,
  inventory,
  sell,
  equip,
  unequip
};
