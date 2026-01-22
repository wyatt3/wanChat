// Store configuration and item catalog

const ITEMS = {
  // Titles - display before username
  title_noob: {
    id: 'title_noob',
    name: 'Noob Title',
    description: 'Display [Noob] before your name',
    price: 5,
    category: 'title',
    rarity: 'common',
    prefix: '[Noob]'
  },
  title_champion: {
    id: 'title_champion',
    name: 'Champion Title',
    description: 'Display [Champion] before your name',
    price: 50,
    category: 'title',
    rarity: 'rare',
    prefix: '[Champion]'
  },
  title_whale: {
    id: 'title_whale',
    name: 'Whale Title',
    description: 'Display [Whale] before your name',
    price: 200,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Whale]'
  },
  title_gamer: {
    id: 'title_gamer',
    name: 'Gamer Title',
    description: 'Display [Gamer] before your name',
    price: 25,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Gamer]'
  },
  title_broke: {
    id: 'title_broke',
    name: 'Broke Title',
    description: 'Display [Broke] before your name',
    price: 1,
    category: 'title',
    rarity: 'common',
    prefix: '[Broke]'
  },
  title_legend: {
    id: 'title_legend',
    name: 'Legend Title',
    description: 'Display [Legend] before your name',
    price: 150,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Legend]'
  },

  // Collectibles - useless but fun
  collectible_rock: {
    id: 'collectible_rock',
    name: 'Pet Rock',
    description: 'Your new best friend.',
    price: 10,
    category: 'collectible',
    rarity: 'common',
    emoji: '🪨'
  },
  collectible_frog: {
    id: 'collectible_frog',
    name: 'Rare Frog',
    description: 'A rare frog. It does nothing.',
    price: 15,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🐸'
  },
  collectible_toilet: {
    id: 'collectible_toilet',
    name: 'Golden Toilet',
    description: 'For the most refined tastes.',
    price: 100,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🚽'
  },
  collectible_diamond: {
    id: 'collectible_diamond',
    name: 'Fake Diamond',
    description: 'Looks real enough.',
    price: 75,
    category: 'collectible',
    rarity: 'rare',
    emoji: '💎'
  },
  collectible_banana: {
    id: 'collectible_banana',
    name: 'Banana',
    description: 'A perfectly good banana.',
    price: 3,
    category: 'collectible',
    rarity: 'common',
    emoji: '🍌'
  },
  collectible_crown: {
    id: 'collectible_crown',
    name: 'Paper Crown',
    description: 'From a fast food restaurant.',
    price: 30,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '👑'
  },
  collectible_sock: {
    id: 'collectible_sock',
    name: 'Single Sock',
    description: 'The other one is still missing.',
    price: 2,
    category: 'collectible',
    rarity: 'common',
    emoji: '🧦'
  },
  collectible_cheese: {
    id: 'collectible_cheese',
    name: 'Fancy Cheese',
    description: 'Aged to perfection.',
    price: 45,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🧀'
  },
  collectible_moon: {
    id: 'collectible_moon',
    name: 'Moon Rock',
    description: 'Definitely from the moon. Trust me.',
    price: 500,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🌙'
  },
  collectible_clown: {
    id: 'collectible_clown',
    name: 'Clown Nose',
    description: 'Honk honk.',
    price: 20,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🤡'
  },
  collectible_potato: {
    id: 'collectible_potato',
    name: 'Sentient Potato',
    description: 'It stares back at you.',
    price: 35,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🥔'
  },
  collectible_void: {
    id: 'collectible_void',
    name: 'Piece of the Void',
    description: 'Do not stare too long.',
    price: 666,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🕳️'
  }
};

// Items always in stock
const ALWAYS_AVAILABLE = ['title_noob', 'collectible_rock'];

// Get rotating items based on hour seed (changes every hour)
function getRotatingItems(itemCount = 4) {
  const now = new Date();
  const seed = now.getFullYear() * 1000000 +
               (now.getMonth() + 1) * 10000 +
               now.getDate() * 100 +
               now.getHours();

  // Simple seeded random
  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Get rotating items (exclude always available)
  const rotatingItems = Object.keys(ITEMS).filter(id => !ALWAYS_AVAILABLE.includes(id));

  // Shuffle with seed
  const shuffled = [...rotatingItems].sort((a, b) => {
    return seededRandom(seed + a.charCodeAt(0)) - seededRandom(seed + b.charCodeAt(0));
  });

  // Take first N items
  return shuffled.slice(0, itemCount);
}

function getAvailableItems() {
  const rotatingIds = getRotatingItems();
  const availableIds = [...ALWAYS_AVAILABLE, ...rotatingIds];
  return availableIds.map(id => ITEMS[id]).filter(Boolean);
}

function getItem(itemId) {
  return ITEMS[itemId] || null;
}

function getAllItems() {
  return ITEMS;
}

module.exports = {
  ITEMS,
  getAvailableItems,
  getItem,
  getAllItems,
  getRotatingItems,
  ALWAYS_AVAILABLE
};
