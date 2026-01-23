// Store commands: /store, /buy, /inventory
const storeConfig = require('../data/storeConfig');
const ollamaService = require('../services/ollamaService');

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

// Find who owns an item (returns username or null)
// Also checks pending appraisals - items being appraised are still "owned"
function findItemOwner(gameState, itemId) {
  // Check inventories
  for (const [ownerName, items] of gameState.inventories.entries()) {
    if (items.includes(itemId)) {
      return ownerName;
    }
  }
  // Check pending appraisals - items being appraised are still owned
  for (const [appraisalId, pending] of gameState.pendingAppraisals.entries()) {
    if (pending.itemId === itemId) {
      return pending.username;
    }
  }
  return null;
}

function store(ctx) {
  const { handler, socket, username, gameState } = ctx;
  const items = storeConfig.getAvailableItems();
  const balance = gameState.getBalance(username);

  // Get time until next AI refresh
  const refresh = storeConfig.getTimeUntilRefresh();
  const refreshTime = refresh.minutes > 0 || refresh.seconds > 0
    ? `${refresh.minutes}m ${refresh.seconds.toString().padStart(2, '0')}s`
    : 'now';

  const raritySymbols = {
    common: '',
    uncommon: '*',
    rare: '**',
    legendary: '***',
    mythic: '****',
    ultra: '!!!!!'
  };

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, '│                        WANCHAT STORE                         │');
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, `│  Your balance: $${formatPrice(balance)}`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

  items.forEach((item, idx) => {
    const emoji = item.emoji || ' ';
    const stars = raritySymbols[item.rarity] || '';
    const price = `$${formatPrice(item.price)}`;
    const name = item.name.length > 30 ? item.name.substring(0, 28) + '..' : item.name;

    // Check if anyone owns this item
    const owner = findItemOwner(gameState, item.id);
    let status = '';
    if (owner) {
      if (owner.toLowerCase() === username.toLowerCase()) {
        status = ' [OWNED]';
      } else {
        status = ` [${owner}]`;
      }
    }

    handler.sendToSocket(socket, `│ ${(idx + 1).toString().padStart(2)}. ${emoji} ${name.padEnd(30)} ${price.padStart(12)} ${stars}${status}`);
  });

  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, '│  /buy [#]  /sell [#]  /inventory  /refreshstore');
  handler.sendToSocket(socket, `│  Refreshes in ${refreshTime}`);
  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

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

  // Check if anyone owns this item (items are globally unique)
  const owner = findItemOwner(gameState, item.id);
  if (owner) {
    if (owner.toLowerCase() === username.toLowerCase()) {
      handler.sendToSocket(socket, `You already own ${item.name}!`);
    } else {
      handler.sendToSocket(socket, `${item.name} is already owned by ${owner}!`);
    }
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
    handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
    handler.sendToSocket(socket, '│                       INVENTORY EMPTY                        │');
    handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
    handler.sendToSocket(socket, '│  Use /store to shop!');
    handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');
    return true;
  }

  const title = isOwn ? 'YOUR INVENTORY' : `${targetUser.toUpperCase()}'S INVENTORY`;
  const boxWidth = 62;
  const titlePadded = title.length > boxWidth ? title.substring(0, boxWidth) : title;
  const leftPad = Math.floor((boxWidth - titlePadded.length) / 2);
  const rightPad = boxWidth - titlePadded.length - leftPad;

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, `│${' '.repeat(leftPad)}${titlePadded}${' '.repeat(rightPad)}│`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

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

  let hasAppraised = false;

  displayItems.forEach((item, idx) => {
    // Print category header when category changes
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      const catName = categoryNames[item.category] || item.category.toUpperCase();
      handler.sendToSocket(socket, `│ ${catName}`);
    }

    if (item.category === 'title') hasTitles = true;

    const emoji = item.emoji || ' ';
    // Check for appraised value
    const appraisedValue = gameState.getAppraisedValue(targetUser, item.id);
    const sellValue = appraisedValue !== null ? appraisedValue : Math.floor(item.price * 0.5);
    const appraisedMarker = appraisedValue !== null ? '!' : ' ';
    if (appraisedValue !== null) hasAppraised = true;
    const equipped = (item.id === equippedTitleId) ? '*' : ' ';
    const name = item.name.length > 30 ? item.name.substring(0, 28) + '..' : item.name;
    handler.sendToSocket(socket, `│${appraisedMarker}${equipped}${(idx + 1).toString().padStart(2)}. ${emoji} ${name.padEnd(30)} ($${formatPrice(sellValue)})`);
  });

  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  if (isOwn) {
    if (hasTitles) {
      handler.sendToSocket(socket, '│  /equip [#] to equip a title');
      handler.sendToSocket(socket, '│  /unequip to remove title');
    }
    handler.sendToSocket(socket, '│  /sell [#] to sell at shown price');
    handler.sendToSocket(socket, '│  /appraise [#] to get new value (costs 25%)');
    handler.sendToSocket(socket, '│  /giveitem [user] [#] to gift an item');
  } else {
    handler.sendToSocket(socket, '│  /inventory [user] to view inventories');
  }
  handler.sendToSocket(socket, '│  * = equipped, ! = appraised');
  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

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

  // Calculate sell price - use appraised value if available, otherwise 50% of original
  const appraisedValue = gameState.getAppraisedValue(username, item.id);
  const sellPrice = appraisedValue !== null ? appraisedValue : Math.floor(item.price * 0.5);
  const isAppraised = appraisedValue !== null;

  // Remove from inventory and add balance
  gameState.removeFromInventory(username, item.id);
  gameState.addBalance(username, sellPrice);

  // Clear the appraisal value since item is sold
  if (isAppraised) {
    gameState.clearAppraisedValue(username, item.id);
  }

  const emoji = item.emoji || '';
  const appraisedText = isAppraised ? ' (appraised)' : '';
  handler.broadcast(`${username} sold ${emoji} ${item.name} for $${formatPrice(sellPrice)}${appraisedText}!`);

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

// Appraisal timer management
const appraisalTimers = new Map();

function generateAppraisedValue(originalPrice) {
  // Get all item prices to determine the range
  const allItems = storeConfig.getAllItems();
  const allPrices = Object.values(allItems).map(item => item.price);
  const minPrice = Math.min(...allPrices);  // $1
  const maxPrice = Math.max(...allPrices);  // $1,000,000

  // Decide the outcome type with weighted randomness
  const roll = Math.random();

  if (roll < 0.02) {
    // 2% chance: JACKPOT - value becomes one of the highest tier items
    const ultraPrices = allPrices.filter(p => p >= 100000);
    return ultraPrices[Math.floor(Math.random() * ultraPrices.length)];
  } else if (roll < 0.05) {
    // 3% chance: BIG WIN - 10x to 100x original value (no cap!)
    const multiplier = 10 + Math.random() * 90;
    return Math.floor(originalPrice * multiplier);
  } else if (roll < 0.15) {
    // 10% chance: Nice gain - 2x to 10x value
    const multiplier = 2 + Math.random() * 8;
    return Math.floor(originalPrice * multiplier);
  } else if (roll < 0.35) {
    // 20% chance: Slight gain - 1.1x to 2x
    const multiplier = 1.1 + Math.random() * 0.9;
    return Math.floor(originalPrice * multiplier);
  } else if (roll < 0.55) {
    // 20% chance: About the same - 0.8x to 1.2x (still better than default 0.5x sell)
    const multiplier = 0.8 + Math.random() * 0.4;
    return Math.floor(originalPrice * multiplier);
  } else if (roll < 0.75) {
    // 20% chance: Slight loss - 0.4x to 0.8x
    const multiplier = 0.4 + Math.random() * 0.4;
    return Math.floor(originalPrice * multiplier);
  } else if (roll < 0.90) {
    // 15% chance: Big loss - 0.1x to 0.4x
    const multiplier = 0.1 + Math.random() * 0.3;
    return Math.floor(originalPrice * multiplier);
  } else if (roll < 0.98) {
    // 8% chance: Disaster - worth almost nothing
    return Math.max(1, Math.floor(originalPrice * 0.01 + Math.random() * 5));
  } else {
    // 2% chance: CURSED - expensive item becomes worthless, cheap becomes valuable
    if (originalPrice > 10000) {
      return Math.floor(Math.random() * 10) + 1;  // Worth $1-10
    } else {
      // Cheap item becomes legendary
      const legendaryPrices = allPrices.filter(p => p >= 10000 && p <= 100000);
      return legendaryPrices[Math.floor(Math.random() * legendaryPrices.length)];
    }
  }
}

// Generate a reason for the appraisal value change
function generateAppraisalReason(originalPrice, appraisedValue, itemName) {
  const ratio = appraisedValue / originalPrice;

  // Massive increase reasons (10x+)
  const jackpotReasons = [
    `Turns out this ${itemName} was owned by a famous celebrity`,
    `Discovered rare manufacturing error makes this ${itemName} a collector's dream`,
    `This ${itemName} has been authenticated as a limited first edition`,
    `Hidden signature found - this ${itemName} is actually priceless art`,
    `Museum curator identified this as historically significant`,
    `Viral TikTok about this exact ${itemName} caused massive demand`,
    `This ${itemName} contains trace amounts of extremely rare material`,
    `Appraiser recognized this from a famous heist - now legally yours`,
    `Carbon dating reveals this ${itemName} is much older than believed`,
    `Secret compartment discovered containing ancient treasure map`
  ];

  // Good increase reasons (2x-10x)
  const goodReasons = [
    `Market demand for ${itemName} has surged recently`,
    `Minor defect actually increases collector value`,
    `Provenance traced to interesting historical figure`,
    `Similar ${itemName} sold at auction for record price`,
    `Limited production run discovered - fewer exist than thought`,
    `Featured in popular TV show, demand skyrocketed`,
    `Vintage ${itemName} becoming fashionable again`,
    `Authenticated as genuine when many fakes exist`
  ];

  // Slight increase reasons (1x-2x)
  const slightIncreaseReasons = [
    `Good condition adds modest premium`,
    `Original packaging increases value slightly`,
    `Market prices have risen since purchase`,
    `Clean history adds small collector premium`,
    `Minor rarity variant identified`
  ];

  // About same reasons
  const sameReasons = [
    `Fair market value confirmed`,
    `Standard ${itemName}, nothing special`,
    `Condition matches expected wear`,
    `Common variant, stable pricing`,
    `Market unchanged since purchase`
  ];

  // Slight decrease reasons
  const slightDecreaseReasons = [
    `Minor wear reduces value slightly`,
    `Market has softened for ${itemName}`,
    `Small scratch noted during inspection`,
    `Common variant, many available`,
    `Slight discoloration detected`
  ];

  // Big decrease reasons
  const bigDecreaseReasons = [
    `Significant damage discovered during inspection`,
    `Market flooded with similar ${itemName}`,
    `Authentication revealed this is a reproduction`,
    `Missing key components reduce value`,
    `Outdated model, low collector interest`,
    `Previous repair work poorly done`,
    `Material degradation detected`
  ];

  // Disaster reasons (nearly worthless)
  const disasterReasons = [
    `Appraiser's cat knocked it off table and destroyed it`,
    `Discovered to be elaborate counterfeit`,
    `Cursed - three appraisers quit after touching it`,
    `Made from materials now known to be toxic`,
    `Spontaneously combusted during examination (rebuilt poorly)`,
    `Found to be stolen property, had to pay fines`,
    `Haunted. Genuinely haunted. No one will buy it`,
    `Appraiser "accidentally" stepped on it`,
    `Coffee spill during inspection`,
    `"Cleaning" process removed all value`
  ];

  // Cursed reversal reasons (expensive becomes worthless, cheap becomes valuable)
  const cursedExpensiveReasons = [
    `Revealed to be elaborate forgery after extensive testing`,
    `Legal dispute emerged - value tied up indefinitely`,
    `Original creator denounced this piece publicly`,
    `Insurance investigation deemed it worthless`,
    `Celebrity association turned negative after scandal`
  ];

  const cursedCheapReasons = [
    `Appraiser had heart attack upon seeing it - it's THAT rare`,
    `Matches description of long-lost artifact from museum heist`,
    `DNA testing revealed connection to royalty`,
    `Hidden message discovered worth fortune to collectors`,
    `Exact item billionaire has been searching for decades`
  ];

  // Select reason based on ratio
  if (ratio >= 10) {
    return jackpotReasons[Math.floor(Math.random() * jackpotReasons.length)];
  } else if (ratio >= 2) {
    return goodReasons[Math.floor(Math.random() * goodReasons.length)];
  } else if (ratio >= 1.1) {
    return slightIncreaseReasons[Math.floor(Math.random() * slightIncreaseReasons.length)];
  } else if (ratio >= 0.8) {
    return sameReasons[Math.floor(Math.random() * sameReasons.length)];
  } else if (ratio >= 0.4) {
    return slightDecreaseReasons[Math.floor(Math.random() * slightDecreaseReasons.length)];
  } else if (ratio >= 0.1) {
    return bigDecreaseReasons[Math.floor(Math.random() * bigDecreaseReasons.length)];
  } else if (ratio >= 0.01) {
    return disasterReasons[Math.floor(Math.random() * disasterReasons.length)];
  } else {
    // Cursed case - check if it was expensive that became worthless or cheap that became valuable
    if (originalPrice > 10000) {
      return cursedExpensiveReasons[Math.floor(Math.random() * cursedExpensiveReasons.length)];
    } else {
      return cursedCheapReasons[Math.floor(Math.random() * cursedCheapReasons.length)];
    }
  }
}

function startAppraisalTimer(appraisalId, gameState, io, handler) {
  const pending = gameState.pendingAppraisals.get(appraisalId);
  if (!pending) return;

  const now = Date.now();
  const delay = pending.returnTime - now;

  if (delay <= 0) {
    // Already past return time, complete immediately
    completeAppraisal(appraisalId, gameState, io, handler);
    return;
  }

  const timer = setTimeout(() => {
    completeAppraisal(appraisalId, gameState, io, handler);
    appraisalTimers.delete(appraisalId);
  }, delay);

  appraisalTimers.set(appraisalId, timer);
}

async function completeAppraisal(appraisalId, gameState, io, handler) {
  const pending = gameState.pendingAppraisals.get(appraisalId);
  if (!pending) return;

  const { username, itemId, originalPrice } = pending;
  const item = storeConfig.getItem(itemId);

  const emoji = item ? item.emoji || '' : '';
  const itemName = item ? item.name : itemId;
  const itemDescription = item ? item.description || '' : '';
  const category = item ? item.category || 'collectible' : 'collectible';

  // Appraise the item
  handler.broadcast(`📋 Appraiser is evaluating ${username}'s ${emoji} ${itemName}...`);

  let appraisedValue, reason;
  try {
    const result = await ollamaService.appraiseItem(itemName, itemDescription, emoji, originalPrice, category);
    appraisedValue = result.value;
    reason = result.reason;
  } catch (error) {
    console.error('AI appraisal failed:', error.message);
    // Fallback to random
    appraisedValue = generateAppraisedValue(originalPrice);
    reason = generateAppraisalReason(originalPrice, appraisedValue, itemName);
  }

  // Return item to inventory
  gameState.addToInventory(username, itemId);

  // Set the appraised value (stored by itemId, will transfer with item)
  gameState.setAppraisedValue(username, itemId, appraisedValue, reason);

  // Remove from pending
  gameState.removePendingAppraisal(appraisalId);

  // Broadcast the result
  const percentChange = ((appraisedValue - originalPrice) / originalPrice * 100).toFixed(0);
  const changeText = appraisedValue >= originalPrice
    ? `+${percentChange}%`
    : `${percentChange}%`;

  let announcement;
  if (appraisedValue >= originalPrice * 10) {
    announcement = `🎉 JACKPOT! ${username}'s ${emoji} ${itemName} appraised at $${formatPrice(appraisedValue)}! (${changeText})`;
  } else if (appraisedValue >= originalPrice * 2) {
    announcement = `✨ ${username}'s ${emoji} ${itemName} appraised at $${formatPrice(appraisedValue)}! (${changeText})`;
  } else if (appraisedValue >= originalPrice) {
    announcement = `${username}'s ${emoji} ${itemName} appraised at $${formatPrice(appraisedValue)} (${changeText})`;
  } else if (appraisedValue >= originalPrice * 0.5) {
    announcement = `${username}'s ${emoji} ${itemName} appraised at $${formatPrice(appraisedValue)} (${changeText})`;
  } else {
    announcement = `💔 ${username}'s ${emoji} ${itemName} appraised at only $${formatPrice(appraisedValue)}... (${changeText})`;
  }

  handler.broadcast(announcement);
  handler.broadcast(`  ↳ "${reason}"`);
}

// Restore pending appraisal timers on module load
function restoreAppraisalTimers(gameState, io, handler) {
  for (const [id, pending] of gameState.pendingAppraisals.entries()) {
    startAppraisalTimer(id, gameState, io, handler);
  }
}

function appraise(ctx) {
  const { handler, socket, username, args, gameState, io } = ctx;

  // Show pending appraisals if no args
  if (args.length < 1) {
    const pending = gameState.getPendingAppraisalsForUser(username);
    if (pending.length === 0) {
      handler.sendToSocket(socket, 'Usage: /appraise [item # from /inventory]');
      handler.sendToSocket(socket, 'Costs 25% of item value. Returns in 1-60 minutes with new value.');
      return true;
    }

    handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
    handler.sendToSocket(socket, '│                     PENDING APPRAISALS                       │');
    handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

    pending.forEach(p => {
      const item = storeConfig.getItem(p.itemId);
      const itemName = item ? item.name : p.itemId;
      const emoji = item ? item.emoji || '' : '';
      const now = Date.now();
      const remaining = Math.max(0, p.returnTime - now);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const displayName = itemName.length > 30 ? itemName.substring(0, 28) + '..' : itemName;
      handler.sendToSocket(socket, `│ ${emoji} ${displayName.padEnd(30)} ${mins}m ${secs}s remaining`);
    });

    handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');
    return true;
  }

  const inventory = gameState.getInventory(username);
  if (inventory.length === 0) {
    handler.sendToSocket(socket, 'Your inventory is empty!');
    return true;
  }

  const displayItems = getInventoryDisplayOrder(inventory);
  let item = null;

  // Parse item selection
  const num = parseInt(args[0]);
  if (!isNaN(num) && num >= 1 && num <= displayItems.length) {
    item = displayItems[num - 1];
  } else {
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

  // Check if item is already being appraised
  const pending = gameState.getPendingAppraisalsForUser(username);
  if (pending.some(p => p.itemId === item.id)) {
    handler.sendToSocket(socket, 'This item is already being appraised!');
    return true;
  }

  // Calculate fee (25% of original price)
  const fee = Math.max(1, Math.floor(item.price * 0.25));
  const balance = gameState.getBalance(username);

  if (balance < fee) {
    handler.sendToSocket(socket, `Appraisal fee is $${formatPrice(fee)} (25% of $${formatPrice(item.price)}). You have $${formatPrice(balance)}.`);
    return true;
  }

  // If appraising equipped title, unequip it first
  const equippedTitleId = gameState.getEquippedTitle(username);
  if (item.id === equippedTitleId) {
    gameState.clearEquippedTitle(username);
  }

  // Deduct fee
  gameState.subtractBalance(username, fee);

  // Remove item from inventory
  gameState.removeFromInventory(username, item.id);

  // Clear any existing appraisal value (will get new one when returned)
  gameState.clearAppraisedValue(username, item.id);

  // Set random return time (1-60 minutes)
  const waitMinutes = 1 + Math.floor(Math.random() * 30);
  const returnTime = Date.now() + waitMinutes * 60 * 1000;

  // Create unique appraisal ID
  const appraisalId = `${username}_${item.id}_${Date.now()}`;

  // Store pending appraisal
  gameState.addPendingAppraisal(appraisalId, {
    username,
    itemId: item.id,
    originalPrice: item.price,
    fee,
    returnTime
  });

  // Start timer
  startAppraisalTimer(appraisalId, gameState, io, handler);

  // Emit balance update
  const allUsers = handler.getAllUsernames();
  const allBalances = {};
  allUsers.forEach(name => {
    allBalances[name] = gameState.getBalance(name);
  });
  io.emit('balance_update', { balances: allBalances });

  const emoji = item.emoji || '';
  handler.sendToSocket(socket, `📦 Sent ${emoji} ${item.name} to appraiser for $${formatPrice(fee)}`);
  handler.sendToSocket(socket, `Returns in ~${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} with new value...`);

  return true;
}

function giveitem(ctx) {
  const { handler, socket, username, args, gameState } = ctx;

  if (args.length < 2) {
    handler.sendToSocket(socket, 'Usage: /giveitem [username] [item # or name]');
    handler.sendToSocket(socket, 'Use /inventory to see your items');
    return true;
  }

  const targetUser = args[0];
  const itemArg = args.slice(1).join(' ');

  // Check if target user exists (has connected at least once)
  const allUsers = handler.getAllUsernames();
  const targetExists = allUsers.some(u => u.toLowerCase() === targetUser.toLowerCase());

  // Also check if they have any saved data (offline users)
  const targetInventory = gameState.getInventory(targetUser);
  const targetBalance = gameState.balances.has(targetUser);

  if (!targetExists && !targetBalance && targetInventory.length === 0) {
    handler.sendToSocket(socket, `User "${targetUser}" not found.`);
    return true;
  }

  // Can't give to yourself
  if (targetUser.toLowerCase() === username.toLowerCase()) {
    handler.sendToSocket(socket, 'You can\'t give items to yourself!');
    return true;
  }

  // Get sender's inventory
  const inventory = gameState.getInventory(username);
  if (inventory.length === 0) {
    handler.sendToSocket(socket, 'Your inventory is empty!');
    return true;
  }

  // Use same display order as /inventory
  const displayItems = getInventoryDisplayOrder(inventory);

  let item = null;

  // Try parsing as number first (uses display order)
  const num = parseInt(itemArg);
  if (!isNaN(num) && num >= 1 && num <= displayItems.length) {
    item = displayItems[num - 1];
  } else {
    // Try matching by name (case insensitive, partial match)
    const searchTerm = itemArg.toLowerCase();
    item = displayItems.find(i =>
      i.name.toLowerCase().includes(searchTerm) ||
      i.id.toLowerCase().includes(searchTerm)
    );
  }

  if (!item) {
    handler.sendToSocket(socket, 'Item not found in your inventory. Use /inventory to see your items.');
    return true;
  }

  // If giving equipped title, unequip it first
  const equippedTitleId = gameState.getEquippedTitle(username);
  if (item.id === equippedTitleId) {
    gameState.clearEquippedTitle(username);
  }

  // Transfer the item
  gameState.removeFromInventory(username, item.id);
  gameState.addToInventory(targetUser, item.id);

  // Transfer appraisal if it exists (appraisals stay with the item)
  const appraisedData = gameState.getAppraisedData(username, item.id);
  if (appraisedData) {
    gameState.clearAppraisedValue(username, item.id);
    gameState.setAppraisedValue(targetUser, item.id, appraisedData.value, appraisedData.reason);
  }

  const emoji = item.emoji || '';
  const appraisedNote = appraisedData ? ' (appraised)' : '';
  handler.broadcast(`${username} gave ${emoji} ${item.name}${appraisedNote} to ${targetUser}!`);

  return true;
}

function inventories(ctx) {
  const { handler, socket, gameState } = ctx;

  // Get all users who have inventories
  const allInventories = [];
  for (const [ownerName, items] of gameState.inventories.entries()) {
    if (items.length > 0) {
      allInventories.push({ username: ownerName, items });
    }
  }

  if (allInventories.length === 0) {
    handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
    handler.sendToSocket(socket, '│                    NO ONE OWNS ANYTHING                      │');
    handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');
    return true;
  }

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, '│                       ALL INVENTORIES                        │');
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

  allInventories.forEach(({ username: ownerName, items }) => {
    const displayItems = getInventoryDisplayOrder(items);
    const totalValue = displayItems.reduce((sum, item) => {
      const appraised = gameState.getAppraisedValue(ownerName, item.id);
      return sum + (appraised !== null ? appraised : Math.floor(item.price * 0.5));
    }, 0);

    handler.sendToSocket(socket, `│ ${ownerName} (${items.length} items, $${formatPrice(totalValue)} value)`);

    displayItems.forEach(item => {
      const emoji = item.emoji || ' ';
      const appraised = gameState.getAppraisedValue(ownerName, item.id);
      const value = appraised !== null ? appraised : Math.floor(item.price * 0.5);
      const marker = appraised !== null ? '!' : ' ';
      const shortName = item.name.length > 30 ? item.name.substring(0, 28) + '..' : item.name;
      handler.sendToSocket(socket, `│  ${marker}${emoji} ${shortName.padEnd(30)} $${formatPrice(value)}`);
    });

    handler.sendToSocket(socket, '│');
  });

  // Also show pending appraisals
  const pendingCount = gameState.pendingAppraisals.size;
  if (pendingCount > 0) {
    handler.sendToSocket(socket, `│ (${pendingCount} item${pendingCount > 1 ? 's' : ''} at appraiser)`);
  }

  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

  return true;
}

async function refreshstore(ctx) {
  const { handler, socket } = ctx;

  if (storeConfig.isGenerating()) {
    handler.sendToSocket(socket, 'Store refresh already in progress...');
    return true;
  }

  handler.sendToSocket(socket, '🏪 Requesting new items...');

  try {
    await storeConfig.forceRefresh((msg) => handler.broadcast(msg));
  } catch (error) {
    handler.sendToSocket(socket, 'Failed to refresh store: ' + error.message);
  }

  return true;
}

module.exports = {
  store,
  buy,
  inventory,
  inventories,
  sell,
  equip,
  unequip,
  giveitem,
  appraise,
  refreshstore,
  restoreAppraisalTimers
};
