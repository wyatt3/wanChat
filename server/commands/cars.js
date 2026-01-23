// Car-related commands: dealership, garage, buycar, sellcar, appraisecar, givecar
const dealershipConfig = require('../data/dealershipConfig');
const ollamaService = require('../services/ollamaService');

// Appraisal timers (in memory)
const carAppraisalTimers = new Map();

// Format price with commas
function formatPrice(price) {
  return Math.floor(price).toLocaleString();
}

// Get rarity color/symbol
function getRarityDisplay(rarity) {
  const rarities = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    legendary: '🟣',
    mythic: '🟠',
    ultra: '🔴'
  };
  return rarities[rarity] || '⚪';
}

// Sort cars by category and price
function sortCars(cars) {
  const categoryOrder = ['beater', 'sedan', 'suv', 'truck', 'sports', 'muscle', 'luxury', 'supercar', 'hypercar', 'vintage'];
  return cars.sort((a, b) => {
    const catA = categoryOrder.indexOf(a.category) || 0;
    const catB = categoryOrder.indexOf(b.category) || 0;
    if (catA !== catB) return catA - catB;
    return a.price - b.price;
  });
}

// Find who owns a car by NAME
function findCarOwner(gameState, carName) {
  if (!carName) return null;
  const nameLower = carName.toLowerCase();

  for (const [ownerName, cars] of gameState.garages.entries()) {
    if (!Array.isArray(cars)) continue;
    for (const car of cars) {
      if (typeof car === 'object' && car?.name?.toLowerCase() === nameLower) {
        return ownerName;
      }
    }
  }

  // Check pending appraisals
  for (const [appraisalId, pending] of gameState.pendingCarAppraisals.entries()) {
    const pendingName = pending?.carName || pending?.car?.name;
    if (pendingName && pendingName.toLowerCase() === nameLower) {
      return pending.username;
    }
  }
  return null;
}

function dealership(ctx) {
  const { handler, socket, username, gameState } = ctx;

  const cars = dealershipConfig.getAvailableCars();
  const sortedCars = sortCars([...cars]);
  const timeUntil = dealershipConfig.getTimeUntilRefresh();
  const balance = gameState.getBalance(username);

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, '│                    🚗 DEALERSHIP 🚗                          │');
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, `│ Your balance: $${formatPrice(balance)}`);
  handler.sendToSocket(socket, `│ New inventory in: ${timeUntil.minutes}m ${timeUntil.seconds}s`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

  if (sortedCars.length === 0) {
    handler.sendToSocket(socket, '│ No cars available! Check back later.');
  } else {
    for (const car of sortedCars) {
      const emoji = car.emoji || '🚗';
      const rarity = getRarityDisplay(car.rarity);
      const name = car.name.length > 28 ? car.name.substring(0, 26) + '..' : car.name;
      const price = `$${formatPrice(car.price)}`.padStart(12);
      const hp = car.horsepower ? `${car.horsepower}hp` : '';
      const speed = car.topSpeed || '';

      handler.sendToSocket(socket, `│ ${rarity} ${emoji} ${name.padEnd(28)} ${price}`);
      if (car.description) {
        const desc = car.description.length > 55 ? car.description.substring(0, 53) + '..' : car.description;
        handler.sendToSocket(socket, `│     ${desc}`);
      }
      if (hp || speed) {
        handler.sendToSocket(socket, `│     ${hp}${hp && speed ? ' | ' : ''}${speed}`);
      }
    }
  }

  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, '│ /buycar [name] - Purchase a car');
  handler.sendToSocket(socket, '│ /garage - View your cars');
  handler.sendToSocket(socket, '│ /appraisecar [name] - Get car appraised');
  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

  return true;
}

function garage(ctx, targetUser = null) {
  const { handler, socket, username, gameState } = ctx;

  const viewUser = targetUser || username;
  const garage = gameState.getGarage(viewUser);
  const isOwnGarage = viewUser.toLowerCase() === username.toLowerCase();

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, `│                    🏎️ ${isOwnGarage ? 'YOUR GARAGE' : viewUser.toUpperCase() + "'S GARAGE"} 🏎️`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

  if (garage.length === 0) {
    handler.sendToSocket(socket, `│ ${isOwnGarage ? 'Your garage is empty!' : 'This garage is empty!'}`);
    handler.sendToSocket(socket, '│ Visit /dealership to browse cars.');
  } else {
    const sortedCars = sortCars([...garage]);
    for (const car of sortedCars) {
      if (typeof car !== 'object' || !car.name) continue;

      const emoji = car.emoji || '🚗';
      const rarity = getRarityDisplay(car.rarity);
      const name = car.name.length > 25 ? car.name.substring(0, 23) + '..' : car.name;
      const price = `$${formatPrice(car.price)}`;

      // Check for appraisal
      const appraisedValue = gameState.getCarAppraisedValue(viewUser, car.name);
      let valueDisplay = price;
      if (appraisedValue !== null) {
        valueDisplay = `$${formatPrice(appraisedValue)} (appraised)`;
      }

      handler.sendToSocket(socket, `│ ${rarity} ${emoji} ${name.padEnd(25)} ${valueDisplay}`);
      if (car.horsepower || car.topSpeed) {
        const hp = car.horsepower ? `${car.horsepower}hp` : '';
        const speed = car.topSpeed || '';
        handler.sendToSocket(socket, `│     ${hp}${hp && speed ? ' | ' : ''}${speed}`);
      }
    }
  }

  // Show pending appraisals
  const pending = gameState.getPendingCarAppraisalsForUser(viewUser);
  if (pending.length > 0) {
    handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
    handler.sendToSocket(socket, '│ 🔍 CARS BEING APPRAISED:');
    for (const p of pending) {
      const carName = p.car?.name || p.carName || 'Unknown';
      const remaining = Math.max(0, p.returnTime - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      handler.sendToSocket(socket, `│    ${carName} - ${mins}m ${secs}s remaining`);
    }
  }

  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, '│ /sellcar [name] - Sell a car');
  handler.sendToSocket(socket, '│ /appraisecar [name] - Get a car appraised');
  handler.sendToSocket(socket, '│ /givecar [user] [name] - Give a car to someone');
  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

  return true;
}

function garages(ctx) {
  const { handler, socket, gameState } = ctx;

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, '│                    🏎️ ALL GARAGES 🏎️                         │');
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

  const allGarages = Array.from(gameState.garages.entries())
    .filter(([_, cars]) => cars.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  if (allGarages.length === 0) {
    handler.sendToSocket(socket, '│ No one owns any cars yet!');
  } else {
    for (const [owner, cars] of allGarages) {
      const totalValue = cars.reduce((sum, car) => {
        if (typeof car !== 'object') return sum;
        const appraised = gameState.getCarAppraisedValue(owner, car.name);
        return sum + (appraised || car.price || 0);
      }, 0);
      handler.sendToSocket(socket, `│ ${owner}: ${cars.length} car${cars.length !== 1 ? 's' : ''} (worth ~$${formatPrice(totalValue)})`);
    }
  }

  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, '│ /garage [username] - View someone\'s garage');
  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

  return true;
}

function buycar(ctx, args) {
  const { handler, socket, username, gameState } = ctx;

  if (!args || args.trim().length === 0) {
    handler.sendToSocket(socket, 'Usage: /buycar [car name]');
    handler.sendToSocket(socket, 'Example: /buycar 1992 Honda Civic');
    return true;
  }

  const carName = args.trim();
  const cars = dealershipConfig.getAvailableCars();

  // Find car by name (case insensitive, partial match)
  const car = cars.find(c =>
    c.name.toLowerCase() === carName.toLowerCase() ||
    c.name.toLowerCase().includes(carName.toLowerCase())
  );

  if (!car) {
    handler.sendToSocket(socket, `Car "${carName}" not found in dealership.`);
    handler.sendToSocket(socket, 'Use /dealership to see available cars.');
    return true;
  }

  const balance = gameState.getBalance(username);
  if (balance < car.price) {
    handler.sendToSocket(socket, `You can't afford the ${car.name}!`);
    handler.sendToSocket(socket, `Price: $${formatPrice(car.price)} | Your balance: $${formatPrice(balance)}`);
    return true;
  }

  // Check if already owned by someone
  const currentOwner = findCarOwner(gameState, car.name);
  if (currentOwner) {
    handler.sendToSocket(socket, `This ${car.name} has already been purchased by ${currentOwner}!`);
    return true;
  }

  // Purchase the car
  gameState.subtractBalance(username, car.price);
  gameState.addToGarage(username, car);

  const emoji = car.emoji || '🚗';
  handler.broadcast(`🎉 ${username} just bought a ${emoji} ${car.name} for $${formatPrice(car.price)}!`);

  return true;
}

function sellcar(ctx, args) {
  const { handler, socket, username, gameState } = ctx;

  if (!args || args.trim().length === 0) {
    handler.sendToSocket(socket, 'Usage: /sellcar [car name]');
    return true;
  }

  const carName = args.trim();
  const garage = gameState.getGarage(username);

  // Find car in garage
  const car = garage.find(c =>
    typeof c === 'object' &&
    (c.name.toLowerCase() === carName.toLowerCase() ||
     c.name.toLowerCase().includes(carName.toLowerCase()))
  );

  if (!car) {
    handler.sendToSocket(socket, `You don't own a car matching "${carName}".`);
    return true;
  }

  // Check if being appraised
  const pendingAppraisals = gameState.getPendingCarAppraisalsForUser(username);
  const isBeingAppraised = pendingAppraisals.some(p =>
    (p.car?.name || p.carName || '').toLowerCase() === car.name.toLowerCase()
  );
  if (isBeingAppraised) {
    handler.sendToSocket(socket, `Can't sell ${car.name} - it's currently being appraised!`);
    return true;
  }

  // Determine sell price (appraised value or 50% of original)
  const appraisedValue = gameState.getCarAppraisedValue(username, car.name);
  const sellPrice = appraisedValue !== null ? appraisedValue : Math.floor(car.price * 0.5);

  // Remove from garage
  gameState.removeFromGarage(username, car.name);
  gameState.clearCarAppraisedValue(username, car.name);

  // Add balance
  gameState.addBalance(username, sellPrice);

  const emoji = car.emoji || '🚗';
  if (appraisedValue !== null) {
    handler.broadcast(`💰 ${username} sold their ${emoji} ${car.name} for $${formatPrice(sellPrice)} (appraised value)!`);
  } else {
    handler.broadcast(`💰 ${username} sold their ${emoji} ${car.name} for $${formatPrice(sellPrice)} (50% of original price).`);
  }

  return true;
}

function givecar(ctx, args) {
  const { handler, socket, username, gameState, connectedUsers } = ctx;

  if (!args || args.trim().length === 0) {
    handler.sendToSocket(socket, 'Usage: /givecar [username] [car name]');
    return true;
  }

  const parts = args.trim().split(' ');
  if (parts.length < 2) {
    handler.sendToSocket(socket, 'Usage: /givecar [username] [car name]');
    return true;
  }

  const targetUsername = parts[0];
  const carName = parts.slice(1).join(' ');

  // Check target exists (connectedUsers is Map of socketId -> username string)
  const allUsernames = Array.from(connectedUsers.values());
  const targetUserName = allUsernames.find(
    u => u.toLowerCase() === targetUsername.toLowerCase()
  );
  if (!targetUserName) {
    handler.sendToSocket(socket, `User "${targetUsername}" not found or not online.`);
    return true;
  }

  if (targetUserName.toLowerCase() === username.toLowerCase()) {
    handler.sendToSocket(socket, "You can't give a car to yourself!");
    return true;
  }

  // Find car in garage
  const garage = gameState.getGarage(username);
  const car = garage.find(c =>
    typeof c === 'object' &&
    (c.name.toLowerCase() === carName.toLowerCase() ||
     c.name.toLowerCase().includes(carName.toLowerCase()))
  );

  if (!car) {
    handler.sendToSocket(socket, `You don't own a car matching "${carName}".`);
    return true;
  }

  // Check if being appraised
  const pendingAppraisals = gameState.getPendingCarAppraisalsForUser(username);
  const isBeingAppraised = pendingAppraisals.some(p =>
    (p.car?.name || p.carName || '').toLowerCase() === car.name.toLowerCase()
  );
  if (isBeingAppraised) {
    handler.sendToSocket(socket, `Can't give ${car.name} - it's currently being appraised!`);
    return true;
  }

  // Transfer the car
  gameState.removeFromGarage(username, car.name);
  gameState.addToGarage(targetUserName, car);

  // Transfer appraisal if exists
  const appraisalData = gameState.getCarAppraisedData(username, car.name);
  if (appraisalData) {
    gameState.clearCarAppraisedValue(username, car.name);
    gameState.setCarAppraisedValue(targetUserName, car.name, appraisalData.value, appraisalData.reason);
  }

  const emoji = car.emoji || '🚗';
  handler.broadcast(`🎁 ${username} gave their ${emoji} ${car.name} to ${targetUserName}!`);

  return true;
}

function appraisecar(ctx, args) {
  const { handler, socket, username, gameState, io } = ctx;

  // Show pending appraisals if no args
  if (!args || args.trim().length === 0) {
    const pending = gameState.getPendingCarAppraisalsForUser(username);
    if (pending.length === 0) {
      handler.sendToSocket(socket, 'Usage: /appraisecar [car name]');
      handler.sendToSocket(socket, 'You have no cars currently being appraised.');
      return true;
    }

    handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
    handler.sendToSocket(socket, '│                  PENDING CAR APPRAISALS                      │');
    handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');

    pending.forEach(p => {
      const carName = p.car?.name || p.carName || 'Unknown';
      const emoji = p.car?.emoji || '🚗';
      const remaining = Math.max(0, p.returnTime - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      handler.sendToSocket(socket, `│ ${emoji} ${carName.padEnd(30)} ${mins}m ${secs}s remaining`);
    });

    handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');
    return true;
  }

  const carName = args.trim();
  const garage = gameState.getGarage(username);

  // Find car in garage
  const car = garage.find(c =>
    typeof c === 'object' &&
    (c.name.toLowerCase() === carName.toLowerCase() ||
     c.name.toLowerCase().includes(carName.toLowerCase()))
  );

  if (!car) {
    handler.sendToSocket(socket, `You don't own a car matching "${carName}".`);
    return true;
  }

  // Check if already being appraised
  const pendingAppraisals = gameState.getPendingCarAppraisalsForUser(username);
  const isBeingAppraised = pendingAppraisals.some(p =>
    (p.car?.name || p.carName || '').toLowerCase() === car.name.toLowerCase()
  );
  if (isBeingAppraised) {
    handler.sendToSocket(socket, `${car.name} is already being appraised!`);
    return true;
  }

  // Appraisal fee (5% of original price, min $10)
  const fee = Math.max(10, Math.floor(car.price * 0.05));
  const balance = gameState.getBalance(username);

  if (balance < fee) {
    handler.sendToSocket(socket, `Appraisal fee: $${formatPrice(fee)} - You can't afford it!`);
    return true;
  }

  // Take fee and remove car temporarily
  gameState.subtractBalance(username, fee);
  gameState.removeFromGarage(username, car.name);

  // Create pending appraisal
  const appraisalId = `car_${username}_${Date.now()}`;
  const returnTime = Date.now() + 30000; // 30 seconds

  gameState.addPendingCarAppraisal(appraisalId, {
    username,
    car: car,
    carName: car.name,
    originalPrice: car.price,
    returnTime,
    fee
  });

  const emoji = car.emoji || '🚗';
  handler.broadcast(`🔍 ${username} sent their ${emoji} ${car.name} to be appraised! (Fee: $${formatPrice(fee)})`);
  handler.sendToSocket(socket, `Your car will be returned in 30 seconds with an appraisal.`);

  // Set timer for appraisal completion
  const timer = setTimeout(() => {
    completeCarAppraisal(appraisalId, gameState, io, handler);
    carAppraisalTimers.delete(appraisalId);
  }, 30000);

  carAppraisalTimers.set(appraisalId, timer);

  return true;
}

async function completeCarAppraisal(appraisalId, gameState, io, handler) {
  const pending = gameState.pendingCarAppraisals.get(appraisalId);
  if (!pending) return;

  const { username, car: storedCar, originalPrice, carName } = pending;

  const displayName = storedCar?.name || carName || 'Unknown Car';
  const emoji = storedCar?.emoji || '🚗';
  const carDescription = storedCar?.description || '';
  const horsepower = storedCar?.horsepower || 0;
  const topSpeed = storedCar?.topSpeed || '';
  const price = originalPrice || storedCar?.price || 10000;

  if (!storedCar || !storedCar.name) {
    console.error(`Car appraisal ${appraisalId} has invalid data, removing...`);
    gameState.removePendingCarAppraisal(appraisalId);
    handler.broadcast(`⚠️ ${username}'s car appraisal failed due to corrupted data.`);
    return;
  }

  handler.broadcast(`🔍 Mechanic is evaluating ${username}'s ${emoji} ${displayName}...`);

  let appraisedValue, reason;
  try {
    const result = await appraiseCarWithAI(displayName, carDescription, emoji, price, horsepower, topSpeed);
    appraisedValue = result.value;
    reason = result.reason;
  } catch (error) {
    appraisedValue = generateFallbackCarAppraisal(price);
    reason = generateFallbackCarReason(price, appraisedValue, displayName);
  }

  // Return car to garage
  gameState.addToGarage(username, storedCar);

  // Set appraisal value
  gameState.setCarAppraisedValue(username, displayName, appraisedValue, reason);

  // Remove pending
  gameState.removePendingCarAppraisal(appraisalId);

  // Broadcast result
  const percentChange = ((appraisedValue - price) / price * 100).toFixed(0);
  const changeText = appraisedValue >= price ? `+${percentChange}%` : `${percentChange}%`;

  let announcement;
  if (appraisedValue >= price * 10) {
    announcement = `🎉 JACKPOT! ${username}'s ${emoji} ${displayName} appraised at $${formatPrice(appraisedValue)}! (${changeText})`;
  } else if (appraisedValue >= price * 2) {
    announcement = `✨ ${username}'s ${emoji} ${displayName} appraised at $${formatPrice(appraisedValue)}! (${changeText})`;
  } else if (appraisedValue >= price) {
    announcement = `${username}'s ${emoji} ${displayName} appraised at $${formatPrice(appraisedValue)} (${changeText})`;
  } else if (appraisedValue >= price * 0.5) {
    announcement = `${username}'s ${emoji} ${displayName} appraised at $${formatPrice(appraisedValue)} (${changeText})`;
  } else {
    announcement = `💔 ${username}'s ${emoji} ${displayName} appraised at only $${formatPrice(appraisedValue)}... (${changeText})`;
  }

  handler.broadcast(announcement);
  handler.broadcast(`  ↳ "${reason}"`);
}

async function appraiseCarWithAI(carName, description, emoji, originalPrice, horsepower, topSpeed) {
  const prompt = `Appraise this car. Output ONLY a JSON object, nothing else. Do not think out loud. Do not use <think> tags. Just output the JSON directly.

Car: ${emoji || '🚗'} ${carName}
Description: ${description || 'No description'}
Original price: $${originalPrice}
Horsepower: ${horsepower || 'Unknown'}
Top Speed: ${topSpeed || 'Unknown'}

Appraise realistically based on original price. Most cars (70%) should be worth 30%-120% of original price. Some cars (20%) depreciate significantly (worth 10%-30% of original). Rarely (8%) a car appreciates to 1.5x-5x original. Classic/vintage cars over 10x are exceptionally rare (2%). Write a funny one-sentence reason specific to "${carName}".

Output format (ONLY this, no other text):
{"value": NUMBER, "reason": "funny sentence about ${carName}"}`;

  try {
    const response = await ollamaService.ollamaRequest(prompt, { temperature: 1.0, maxTokens: 500 });

    let jsonMatch = response.match(/\{[\s\S]*?"value"[\s\S]*?"reason"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        const value = Math.max(1, Math.min(100000000, parseInt(result.value) || originalPrice));
        const reason = result.reason || 'The mechanic shrugged and made up a number.';
        return { value, reason };
      } catch (parseErr) {
        // Continue to extraction
      }
    }

    // Try extracting separately
    const valueMatch = response.match(/"value"\s*:\s*(\d+)/);
    const reasonMatch = response.match(/"reason"\s*:\s*"([^"]*)/);

    if (valueMatch) {
      const value = Math.max(1, Math.min(100000000, parseInt(valueMatch[1])));
      let reason = 'The mechanic shrugged and made up a number.';
      if (reasonMatch && reasonMatch[1]) {
        reason = reasonMatch[1];
        if (reason.length > 10 && !reason.match(/[.!?]$/)) {
          reason = reason + '...';
        }
      }
      return { value, reason };
    }

    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('[CAR APPRAISAL] AI failed:', error.message);
    const value = generateFallbackCarAppraisal(originalPrice);
    const reason = generateFallbackCarReason(originalPrice, value, carName);
    return { value, reason };
  }
}

function generateFallbackCarAppraisal(originalPrice) {
  const roll = Math.random();
  if (roll < 0.02) {
    // Classic car jackpot
    return Math.floor(originalPrice * (10 + Math.random() * 40));
  } else if (roll < 0.10) {
    // Good appreciation
    return Math.floor(originalPrice * (1.5 + Math.random() * 3.5));
  } else if (roll < 0.30) {
    // Slight loss
    return Math.floor(originalPrice * (0.7 + Math.random() * 0.3));
  } else if (roll < 0.70) {
    // Normal depreciation
    return Math.floor(originalPrice * (0.3 + Math.random() * 0.4));
  } else {
    // Heavy depreciation
    return Math.floor(originalPrice * (0.1 + Math.random() * 0.2));
  }
}

function generateFallbackCarReason(originalPrice, appraisedValue, carName) {
  const ratio = appraisedValue / originalPrice;
  if (ratio >= 10) {
    return `Turns out this ${carName} is a collector's dream!`;
  } else if (ratio >= 2) {
    return `This ${carName} is in exceptional condition.`;
  } else if (ratio >= 1) {
    return `Fair market value for a ${carName}.`;
  } else if (ratio >= 0.5) {
    return `This ${carName} has some miles on it.`;
  } else {
    return `This ${carName} has definitely seen better days.`;
  }
}

function refreshdealership(ctx) {
  const { handler, socket } = ctx;

  handler.sendToSocket(socket, 'Forcing dealership refresh...');

  try {
    dealershipConfig.forceRefresh((msg) => handler.broadcast(msg));
  } catch (error) {
    handler.sendToSocket(socket, 'Failed to refresh dealership: ' + error.message);
  }

  return true;
}

// Restore appraisal timers on server restart
function restoreCarAppraisalTimers(gameState, io, handler) {
  const pending = gameState.getPendingCarAppraisals();
  const now = Date.now();

  for (const [appraisalId, data] of pending.entries()) {
    const remaining = data.returnTime - now;

    if (remaining <= 0) {
      // Appraisal overdue, complete it now
      completeCarAppraisal(appraisalId, gameState, io, handler);
    } else {
      // Set timer for remaining time
      const timer = setTimeout(() => {
        completeCarAppraisal(appraisalId, gameState, io, handler);
        carAppraisalTimers.delete(appraisalId);
      }, remaining);
      carAppraisalTimers.set(appraisalId, timer);
    }
  }

  if (pending.size > 0) {
    console.log(`Restored ${pending.size} car appraisal timer(s)`);
  }
}

// View detailed specs for your own car (private - only visible to owner)
function carspecs(ctx, args) {
  const { handler, socket, username, gameState } = ctx;

  if (!args || args.trim().length === 0) {
    handler.sendToSocket(socket, 'Usage: /carspecs [car name]');
    handler.sendToSocket(socket, 'View the hidden specs of a car you own.');
    return true;
  }

  const carName = args.trim();
  const garage = gameState.getGarage(username);

  // Find car in garage
  const car = garage.find(c =>
    typeof c === 'object' &&
    (c.name.toLowerCase() === carName.toLowerCase() ||
     c.name.toLowerCase().includes(carName.toLowerCase()))
  );

  if (!car) {
    handler.sendToSocket(socket, `You don't own a car matching "${carName}".`);
    return true;
  }

  // Check if car has specs (older cars might not)
  if (!car.specs) {
    handler.sendToSocket(socket, `${car.name} doesn't have detailed specs. Try selling and buying a newer car.`);
    return true;
  }

  const specs = car.specs;
  const emoji = car.emoji || '🚗';

  handler.sendToSocket(socket, '┌──────────────────────────────────────────────────────────────┐');
  handler.sendToSocket(socket, `│ ${emoji} ${car.name.toUpperCase()} - SECRET SPECS`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, `│ 🏎️ True Top Speed:    ${specs.trueTopSpeed} mph`);
  handler.sendToSocket(socket, `│ ⚡ True Acceleration:  ${specs.trueAcceleration}/100`);
  handler.sendToSocket(socket, `│ 🎯 True Handling:      ${specs.trueHandling}/100`);
  handler.sendToSocket(socket, `│ 🔧 Reliability:        ${specs.reliability}/100`);
  handler.sendToSocket(socket, `│ ⚖️  Weight:            ${specs.trueWeight} lbs`);
  handler.sendToSocket(socket, `│ 🚀 Nitro Charges:      ${specs.nitroCharges}`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, `│ ⭐ Quirk: ${specs.quirk.name}`);
  handler.sendToSocket(socket, `│    "${specs.quirk.description}"`);
  handler.sendToSocket(socket, '├──────────────────────────────────────────────────────────────┤');
  handler.sendToSocket(socket, '│ These specs affect drag racing performance!');
  handler.sendToSocket(socket, '│ Keep them secret from your opponents!');
  handler.sendToSocket(socket, '└──────────────────────────────────────────────────────────────┘');

  return true;
}

module.exports = {
  dealership,
  garage,
  garages,
  buycar,
  sellcar,
  givecar,
  appraisecar,
  carspecs,
  refreshdealership,
  restoreCarAppraisalTimers
};
