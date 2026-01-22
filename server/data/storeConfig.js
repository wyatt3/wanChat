// Store configuration and item catalog

// Server start time - used to refresh store on restart
const SERVER_START_TIME = Date.now();

const ITEMS = {
  // ============== TITLES ==============

  // Common titles ($1-$50)
  title_broke: {
    id: 'title_broke',
    name: 'Broke Title',
    description: 'Display [Broke] before your name',
    price: 1,
    category: 'title',
    rarity: 'common',
    prefix: '[Broke]'
  },
  title_noob: {
    id: 'title_noob',
    name: 'Noob Title',
    description: 'Display [Noob] before your name',
    price: 5,
    category: 'title',
    rarity: 'common',
    prefix: '[Noob]'
  },
  title_lurker: {
    id: 'title_lurker',
    name: 'Lurker Title',
    description: 'Display [Lurker] before your name',
    price: 10,
    category: 'title',
    rarity: 'common',
    prefix: '[Lurker]'
  },
  title_chatter: {
    id: 'title_chatter',
    name: 'Chatter Title',
    description: 'Display [Chatter] before your name',
    price: 15,
    category: 'title',
    rarity: 'common',
    prefix: '[Chatter]'
  },

  // Uncommon titles ($25-$100)
  title_gamer: {
    id: 'title_gamer',
    name: 'Gamer Title',
    description: 'Display [Gamer] before your name',
    price: 25,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Gamer]'
  },
  title_degen: {
    id: 'title_degen',
    name: 'Degen Title',
    description: 'Display [Degen] before your name',
    price: 40,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Degen]'
  },
  title_chad: {
    id: 'title_chad',
    name: 'Chad Title',
    description: 'Display [Chad] before your name',
    price: 50,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Chad]'
  },
  title_simp: {
    id: 'title_simp',
    name: 'Simp Title',
    description: 'Display [Simp] before your name',
    price: 35,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Simp]'
  },
  title_based: {
    id: 'title_based',
    name: 'Based Title',
    description: 'Display [Based] before your name',
    price: 69,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Based]'
  },

  // Rare titles ($100-$500)
  title_champion: {
    id: 'title_champion',
    name: 'Champion Title',
    description: 'Display [Champion] before your name',
    price: 100,
    category: 'title',
    rarity: 'rare',
    prefix: '[Champion]'
  },
  title_legend: {
    id: 'title_legend',
    name: 'Legend Title',
    description: 'Display [Legend] before your name',
    price: 200,
    category: 'title',
    rarity: 'rare',
    prefix: '[Legend]'
  },
  title_whale: {
    id: 'title_whale',
    name: 'Whale Title',
    description: 'Display [Whale] before your name',
    price: 500,
    category: 'title',
    rarity: 'rare',
    prefix: '[Whale]'
  },
  title_og: {
    id: 'title_og',
    name: 'OG Title',
    description: 'Display [OG] before your name',
    price: 300,
    category: 'title',
    rarity: 'rare',
    prefix: '[OG]'
  },
  title_elite: {
    id: 'title_elite',
    name: 'Elite Title',
    description: 'Display [Elite] before your name',
    price: 420,
    category: 'title',
    rarity: 'rare',
    prefix: '[Elite]'
  },

  // Legendary titles ($1,000-$10,000)
  title_immortal: {
    id: 'title_immortal',
    name: 'Immortal Title',
    description: 'Display [Immortal] before your name',
    price: 1000,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Immortal]'
  },
  title_supreme: {
    id: 'title_supreme',
    name: 'Supreme Title',
    description: 'Display [Supreme] before your name',
    price: 2500,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Supreme]'
  },
  title_godlike: {
    id: 'title_godlike',
    name: 'Godlike Title',
    description: 'Display [Godlike] before your name',
    price: 5000,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Godlike]'
  },
  title_ascended: {
    id: 'title_ascended',
    name: 'Ascended Title',
    description: 'Display [Ascended] before your name',
    price: 7500,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Ascended]'
  },

  // Mythic titles ($25,000-$100,000)
  title_eternal: {
    id: 'title_eternal',
    name: 'Eternal Title',
    description: 'Display [Eternal] before your name',
    price: 25000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Eternal]'
  },
  title_infinite: {
    id: 'title_infinite',
    name: 'Infinite Title',
    description: 'Display [Infinite] before your name',
    price: 50000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Infinite]'
  },
  title_transcendent: {
    id: 'title_transcendent',
    name: 'Transcendent Title',
    description: 'Display [Transcendent] before your name',
    price: 100000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Transcendent]'
  },

  // Ultra titles ($250,000-$1,000,000)
  title_omnipotent: {
    id: 'title_omnipotent',
    name: 'Omnipotent Title',
    description: 'Display [Omnipotent] before your name',
    price: 250000,
    category: 'title',
    rarity: 'ultra',
    prefix: '[Omnipotent]'
  },
  title_primordial: {
    id: 'title_primordial',
    name: 'Primordial Title',
    description: 'Display [Primordial] before your name',
    price: 500000,
    category: 'title',
    rarity: 'ultra',
    prefix: '[Primordial]'
  },
  title_the_one: {
    id: 'title_the_one',
    name: 'The One Title',
    description: 'Display [The One] before your name',
    price: 1000000,
    category: 'title',
    rarity: 'ultra',
    prefix: '[The One]'
  },

  // ============== COLLECTIBLES ==============

  // Common collectibles ($1-$25)
  collectible_sock: {
    id: 'collectible_sock',
    name: 'Single Sock',
    description: 'The other one is still missing.',
    price: 2,
    category: 'collectible',
    rarity: 'common',
    emoji: '🧦'
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
  collectible_rock: {
    id: 'collectible_rock',
    name: 'Pet Rock',
    description: 'Your new best friend.',
    price: 10,
    category: 'collectible',
    rarity: 'common',
    emoji: '🪨'
  },
  collectible_stick: {
    id: 'collectible_stick',
    name: 'Nice Stick',
    description: 'Found it on the ground.',
    price: 5,
    category: 'collectible',
    rarity: 'common',
    emoji: '🪵'
  },
  collectible_leaf: {
    id: 'collectible_leaf',
    name: 'Lucky Leaf',
    description: 'Might be lucky. Probably not.',
    price: 7,
    category: 'collectible',
    rarity: 'common',
    emoji: '🍀'
  },
  collectible_button: {
    id: 'collectible_button',
    name: 'Shiny Button',
    description: 'Fell off something important.',
    price: 4,
    category: 'collectible',
    rarity: 'common',
    emoji: '🔘'
  },
  collectible_paperclip: {
    id: 'collectible_paperclip',
    name: 'Bent Paperclip',
    description: 'Office supplies are valuable.',
    price: 1,
    category: 'collectible',
    rarity: 'common',
    emoji: '📎'
  },

  // Uncommon collectibles ($15-$75)
  collectible_frog: {
    id: 'collectible_frog',
    name: 'Rare Frog',
    description: 'A rare frog. It does nothing.',
    price: 15,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🐸'
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
  collectible_crown: {
    id: 'collectible_crown',
    name: 'Paper Crown',
    description: 'From a fast food restaurant.',
    price: 30,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '👑'
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
  collectible_cheese: {
    id: 'collectible_cheese',
    name: 'Fancy Cheese',
    description: 'Aged to perfection.',
    price: 45,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🧀'
  },
  collectible_rubber_duck: {
    id: 'collectible_rubber_duck',
    name: 'Rubber Duck',
    description: 'Great for debugging.',
    price: 25,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🦆'
  },
  collectible_cactus: {
    id: 'collectible_cactus',
    name: 'Tiny Cactus',
    description: 'Low maintenance friend.',
    price: 40,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🌵'
  },
  collectible_mushroom: {
    id: 'collectible_mushroom',
    name: 'Mystery Mushroom',
    description: 'Do not eat.',
    price: 55,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🍄'
  },

  // Rare collectibles ($75-$500)
  collectible_diamond: {
    id: 'collectible_diamond',
    name: 'Fake Diamond',
    description: 'Looks real enough.',
    price: 75,
    category: 'collectible',
    rarity: 'rare',
    emoji: '💎'
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
  collectible_crystal_ball: {
    id: 'collectible_crystal_ball',
    name: 'Crystal Ball',
    description: 'Shows your future. Its empty.',
    price: 150,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🔮'
  },
  collectible_alien: {
    id: 'collectible_alien',
    name: 'Pocket Alien',
    description: 'Found in Area 51 gift shop.',
    price: 200,
    category: 'collectible',
    rarity: 'rare',
    emoji: '👽'
  },
  collectible_robot: {
    id: 'collectible_robot',
    name: 'Mini Robot',
    description: 'Beep boop.',
    price: 250,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🤖'
  },
  collectible_unicorn: {
    id: 'collectible_unicorn',
    name: 'Unicorn Horn',
    description: 'From a very real unicorn.',
    price: 350,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🦄'
  },
  collectible_dragon_egg: {
    id: 'collectible_dragon_egg',
    name: 'Dragon Egg',
    description: 'Might hatch. Someday.',
    price: 500,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🥚'
  },

  // Legendary collectibles ($500-$10,000)
  collectible_moon: {
    id: 'collectible_moon',
    name: 'Moon Rock',
    description: 'Definitely from the moon. Trust me.',
    price: 750,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🌙'
  },
  collectible_void: {
    id: 'collectible_void',
    name: 'Piece of the Void',
    description: 'Do not stare too long.',
    price: 666,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🕳️'
  },
  collectible_star: {
    id: 'collectible_star',
    name: 'Captured Star',
    description: 'Its still burning.',
    price: 1500,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '⭐'
  },
  collectible_time_crystal: {
    id: 'collectible_time_crystal',
    name: 'Time Crystal',
    description: 'Frozen moment in time.',
    price: 2500,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '💠'
  },
  collectible_philosophers_stone: {
    id: 'collectible_philosophers_stone',
    name: 'Philosophers Stone',
    description: 'Turns lead into... nothing.',
    price: 5000,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🔴'
  },
  collectible_infinity_cube: {
    id: 'collectible_infinity_cube',
    name: 'Infinity Cube',
    description: 'Contains infinite nothing.',
    price: 7777,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🧊'
  },
  collectible_ancient_artifact: {
    id: 'collectible_ancient_artifact',
    name: 'Ancient Artifact',
    description: 'From a civilization unknown.',
    price: 10000,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🏺'
  },

  // Mythic collectibles ($15,000-$100,000)
  collectible_galaxy: {
    id: 'collectible_galaxy',
    name: 'Pocket Galaxy',
    description: 'A whole galaxy in your pocket.',
    price: 15000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '🌌'
  },
  collectible_black_hole: {
    id: 'collectible_black_hole',
    name: 'Tamed Black Hole',
    description: 'It only eats a little.',
    price: 25000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '⚫'
  },
  collectible_universe_shard: {
    id: 'collectible_universe_shard',
    name: 'Universe Shard',
    description: 'Fragment of another reality.',
    price: 50000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '✨'
  },
  collectible_creation_spark: {
    id: 'collectible_creation_spark',
    name: 'Spark of Creation',
    description: 'From the big bang itself.',
    price: 75000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '💥'
  },
  collectible_consciousness: {
    id: 'collectible_consciousness',
    name: 'Bottled Consciousness',
    description: 'Whos thoughts are these?',
    price: 100000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '🧠'
  },

  // Ultra collectibles ($150,000-$1,000,000)
  collectible_dimension: {
    id: 'collectible_dimension',
    name: 'Extra Dimension',
    description: 'The 11th dimension, just for you.',
    price: 150000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '🌀'
  },
  collectible_multiverse_key: {
    id: 'collectible_multiverse_key',
    name: 'Multiverse Key',
    description: 'Opens doors to infinite realities.',
    price: 250000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '🗝️'
  },
  collectible_reality_marble: {
    id: 'collectible_reality_marble',
    name: 'Reality Marble',
    description: 'Contains an entire reality.',
    price: 400000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '🔵'
  },
  collectible_omniscience_orb: {
    id: 'collectible_omniscience_orb',
    name: 'Omniscience Orb',
    description: 'Knows everything. Tells nothing.',
    price: 600000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '👁️'
  },
  collectible_existence_itself: {
    id: 'collectible_existence_itself',
    name: 'Existence Itself',
    description: 'The concept of being.',
    price: 1000000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '♾️'
  },

  // ============== MORE TITLES ==============

  // More common titles
  title_peasant: {
    id: 'title_peasant',
    name: 'Peasant Title',
    description: 'Display [Peasant] before your name',
    price: 2,
    category: 'title',
    rarity: 'common',
    prefix: '[Peasant]'
  },
  title_npc: {
    id: 'title_npc',
    name: 'NPC Title',
    description: 'Display [NPC] before your name',
    price: 8,
    category: 'title',
    rarity: 'common',
    prefix: '[NPC]'
  },
  title_bot: {
    id: 'title_bot',
    name: 'Bot Title',
    description: 'Display [Bot] before your name',
    price: 12,
    category: 'title',
    rarity: 'common',
    prefix: '[Bot]'
  },
  title_normie: {
    id: 'title_normie',
    name: 'Normie Title',
    description: 'Display [Normie] before your name',
    price: 20,
    category: 'title',
    rarity: 'common',
    prefix: '[Normie]'
  },

  // More uncommon titles
  title_tryhard: {
    id: 'title_tryhard',
    name: 'Tryhard Title',
    description: 'Display [Tryhard] before your name',
    price: 30,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Tryhard]'
  },
  title_sweat: {
    id: 'title_sweat',
    name: 'Sweat Title',
    description: 'Display [Sweat] before your name',
    price: 45,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Sweat]'
  },
  title_goat: {
    id: 'title_goat',
    name: 'GOAT Title',
    description: 'Display [GOAT] before your name',
    price: 75,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[GOAT]'
  },
  title_king: {
    id: 'title_king',
    name: 'King Title',
    description: 'Display [King] before your name',
    price: 60,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[King]'
  },
  title_queen: {
    id: 'title_queen',
    name: 'Queen Title',
    description: 'Display [Queen] before your name',
    price: 60,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Queen]'
  },
  title_sigma: {
    id: 'title_sigma',
    name: 'Sigma Title',
    description: 'Display [Sigma] before your name',
    price: 55,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Sigma]'
  },
  title_rizz: {
    id: 'title_rizz',
    name: 'Rizz Title',
    description: 'Display [Rizz] before your name',
    price: 77,
    category: 'title',
    rarity: 'uncommon',
    prefix: '[Rizz]'
  },

  // More rare titles
  title_boss: {
    id: 'title_boss',
    name: 'Boss Title',
    description: 'Display [Boss] before your name',
    price: 150,
    category: 'title',
    rarity: 'rare',
    prefix: '[Boss]'
  },
  title_mastermind: {
    id: 'title_mastermind',
    name: 'Mastermind Title',
    description: 'Display [Mastermind] before your name',
    price: 250,
    category: 'title',
    rarity: 'rare',
    prefix: '[Mastermind]'
  },
  title_phantom: {
    id: 'title_phantom',
    name: 'Phantom Title',
    description: 'Display [Phantom] before your name',
    price: 350,
    category: 'title',
    rarity: 'rare',
    prefix: '[Phantom]'
  },
  title_demon: {
    id: 'title_demon',
    name: 'Demon Title',
    description: 'Display [Demon] before your name',
    price: 666,
    category: 'title',
    rarity: 'rare',
    prefix: '[Demon]'
  },
  title_angel: {
    id: 'title_angel',
    name: 'Angel Title',
    description: 'Display [Angel] before your name',
    price: 777,
    category: 'title',
    rarity: 'rare',
    prefix: '[Angel]'
  },
  title_overlord: {
    id: 'title_overlord',
    name: 'Overlord Title',
    description: 'Display [Overlord] before your name',
    price: 888,
    category: 'title',
    rarity: 'rare',
    prefix: '[Overlord]'
  },

  // More legendary titles
  title_warlord: {
    id: 'title_warlord',
    name: 'Warlord Title',
    description: 'Display [Warlord] before your name',
    price: 1500,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Warlord]'
  },
  title_emperor: {
    id: 'title_emperor',
    name: 'Emperor Title',
    description: 'Display [Emperor] before your name',
    price: 3000,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Emperor]'
  },
  title_divine: {
    id: 'title_divine',
    name: 'Divine Title',
    description: 'Display [Divine] before your name',
    price: 4000,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Divine]'
  },
  title_celestial: {
    id: 'title_celestial',
    name: 'Celestial Title',
    description: 'Display [Celestial] before your name',
    price: 6000,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Celestial]'
  },
  title_mythical: {
    id: 'title_mythical',
    name: 'Mythical Title',
    description: 'Display [Mythical] before your name',
    price: 8888,
    category: 'title',
    rarity: 'legendary',
    prefix: '[Mythical]'
  },

  // More mythic titles
  title_void_walker: {
    id: 'title_void_walker',
    name: 'Void Walker Title',
    description: 'Display [Void Walker] before your name',
    price: 30000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Void Walker]'
  },
  title_reality_bender: {
    id: 'title_reality_bender',
    name: 'Reality Bender Title',
    description: 'Display [Reality Bender] before your name',
    price: 45000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Reality Bender]'
  },
  title_time_lord: {
    id: 'title_time_lord',
    name: 'Time Lord Title',
    description: 'Display [Time Lord] before your name',
    price: 65000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Time Lord]'
  },
  title_cosmic: {
    id: 'title_cosmic',
    name: 'Cosmic Title',
    description: 'Display [Cosmic] before your name',
    price: 80000,
    category: 'title',
    rarity: 'mythic',
    prefix: '[Cosmic]'
  },

  // More ultra titles
  title_absolute: {
    id: 'title_absolute',
    name: 'Absolute Title',
    description: 'Display [Absolute] before your name',
    price: 300000,
    category: 'title',
    rarity: 'ultra',
    prefix: '[Absolute]'
  },
  title_supreme_being: {
    id: 'title_supreme_being',
    name: 'Supreme Being Title',
    description: 'Display [Supreme Being] before your name',
    price: 420000,
    category: 'title',
    rarity: 'ultra',
    prefix: '[Supreme Being]'
  },
  title_alpha_omega: {
    id: 'title_alpha_omega',
    name: 'Alpha & Omega Title',
    description: 'Display [Alpha & Omega] before your name',
    price: 750000,
    category: 'title',
    rarity: 'ultra',
    prefix: '[Alpha & Omega]'
  },

  // ============== MORE COLLECTIBLES ==============

  // More common collectibles
  collectible_dust: {
    id: 'collectible_dust',
    name: 'Dust Bunny',
    description: 'Found under the couch.',
    price: 1,
    category: 'collectible',
    rarity: 'common',
    emoji: '🐰'
  },
  collectible_pencil: {
    id: 'collectible_pencil',
    name: 'Chewed Pencil',
    description: 'Someone was nervous.',
    price: 2,
    category: 'collectible',
    rarity: 'common',
    emoji: '✏️'
  },
  collectible_coin: {
    id: 'collectible_coin',
    name: 'Lucky Penny',
    description: 'Heads up!',
    price: 1,
    category: 'collectible',
    rarity: 'common',
    emoji: '🪙'
  },
  collectible_acorn: {
    id: 'collectible_acorn',
    name: 'Acorn',
    description: 'A squirrel is looking for this.',
    price: 3,
    category: 'collectible',
    rarity: 'common',
    emoji: '🌰'
  },
  collectible_seashell: {
    id: 'collectible_seashell',
    name: 'Seashell',
    description: 'You can hear the ocean.',
    price: 6,
    category: 'collectible',
    rarity: 'common',
    emoji: '🐚'
  },
  collectible_feather: {
    id: 'collectible_feather',
    name: 'Pretty Feather',
    description: 'Fell from the sky.',
    price: 4,
    category: 'collectible',
    rarity: 'common',
    emoji: '🪶'
  },
  collectible_candy: {
    id: 'collectible_candy',
    name: 'Old Candy',
    description: 'Still good. Probably.',
    price: 2,
    category: 'collectible',
    rarity: 'common',
    emoji: '🍬'
  },
  collectible_marble: {
    id: 'collectible_marble',
    name: 'Glass Marble',
    description: 'Dont lose it.',
    price: 8,
    category: 'collectible',
    rarity: 'common',
    emoji: '🔵'
  },
  collectible_battery: {
    id: 'collectible_battery',
    name: 'Dead Battery',
    description: 'Might have some juice left.',
    price: 5,
    category: 'collectible',
    rarity: 'common',
    emoji: '🔋'
  },
  collectible_dice: {
    id: 'collectible_dice',
    name: 'Loaded Dice',
    description: 'Always rolls what you need.',
    price: 15,
    category: 'collectible',
    rarity: 'common',
    emoji: '🎲'
  },

  // More uncommon collectibles
  collectible_pizza: {
    id: 'collectible_pizza',
    name: 'Cold Pizza',
    description: 'Still delicious.',
    price: 18,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🍕'
  },
  collectible_octopus: {
    id: 'collectible_octopus',
    name: 'Tiny Octopus',
    description: 'Has eight tiny arms.',
    price: 35,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🐙'
  },
  collectible_ghost: {
    id: 'collectible_ghost',
    name: 'Friendly Ghost',
    description: 'Boo! Just kidding.',
    price: 31,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '👻'
  },
  collectible_pumpkin: {
    id: 'collectible_pumpkin',
    name: 'Spooky Pumpkin',
    description: 'Its always Halloween somewhere.',
    price: 28,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🎃'
  },
  collectible_snowman: {
    id: 'collectible_snowman',
    name: 'Pocket Snowman',
    description: 'Somehow not melting.',
    price: 42,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '⛄'
  },
  collectible_flame: {
    id: 'collectible_flame',
    name: 'Eternal Flame',
    description: 'Never goes out.',
    price: 50,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🔥'
  },
  collectible_tornado: {
    id: 'collectible_tornado',
    name: 'Jar of Wind',
    description: 'Very breezy.',
    price: 38,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🌪️'
  },
  collectible_rainbow: {
    id: 'collectible_rainbow',
    name: 'Pocket Rainbow',
    description: 'Doubles as a nightlight.',
    price: 65,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🌈'
  },
  collectible_music_box: {
    id: 'collectible_music_box',
    name: 'Haunted Music Box',
    description: 'Plays by itself at night.',
    price: 58,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🎵'
  },
  collectible_compass: {
    id: 'collectible_compass',
    name: 'Broken Compass',
    description: 'Points to something interesting.',
    price: 48,
    category: 'collectible',
    rarity: 'uncommon',
    emoji: '🧭'
  },

  // More rare collectibles
  collectible_skull: {
    id: 'collectible_skull',
    name: 'Crystal Skull',
    description: 'Definitely not cursed.',
    price: 180,
    category: 'collectible',
    rarity: 'rare',
    emoji: '💀'
  },
  collectible_sword: {
    id: 'collectible_sword',
    name: 'Toy Sword',
    description: 'Excalibur it is not.',
    price: 120,
    category: 'collectible',
    rarity: 'rare',
    emoji: '⚔️'
  },
  collectible_crown_real: {
    id: 'collectible_crown_real',
    name: 'Real Crown',
    description: 'Fit for royalty.',
    price: 300,
    category: 'collectible',
    rarity: 'rare',
    emoji: '👑'
  },
  collectible_treasure_map: {
    id: 'collectible_treasure_map',
    name: 'Treasure Map',
    description: 'X marks the spot.',
    price: 220,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🗺️'
  },
  collectible_genie_lamp: {
    id: 'collectible_genie_lamp',
    name: 'Genie Lamp',
    description: 'Fresh out of wishes.',
    price: 400,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🪔'
  },
  collectible_magic_wand: {
    id: 'collectible_magic_wand',
    name: 'Magic Wand',
    description: 'Sparks occasionally.',
    price: 280,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🪄'
  },
  collectible_phoenix_feather: {
    id: 'collectible_phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Still warm.',
    price: 450,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🔶'
  },
  collectible_mermaid_scale: {
    id: 'collectible_mermaid_scale',
    name: 'Mermaid Scale',
    description: 'Shimmers in moonlight.',
    price: 380,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🧜'
  },
  collectible_vampire_fang: {
    id: 'collectible_vampire_fang',
    name: 'Vampire Fang',
    description: 'Still sharp.',
    price: 333,
    category: 'collectible',
    rarity: 'rare',
    emoji: '🧛'
  },

  // More legendary collectibles
  collectible_singularity: {
    id: 'collectible_singularity',
    name: 'Singularity',
    description: 'Infinitely dense.',
    price: 1234,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '⚪'
  },
  collectible_antimatter: {
    id: 'collectible_antimatter',
    name: 'Antimatter Vial',
    description: 'Handle with extreme care.',
    price: 3500,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '⚗️'
  },
  collectible_dark_matter: {
    id: 'collectible_dark_matter',
    name: 'Dark Matter',
    description: 'You cant see it but its there.',
    price: 4200,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🌑'
  },
  collectible_neutron_star: {
    id: 'collectible_neutron_star',
    name: 'Neutron Star Fragment',
    description: 'Weighs a billion tons.',
    price: 6500,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '💫'
  },
  collectible_supernova: {
    id: 'collectible_supernova',
    name: 'Bottled Supernova',
    description: 'Frozen mid-explosion.',
    price: 8000,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '💥'
  },
  collectible_world_tree_seed: {
    id: 'collectible_world_tree_seed',
    name: 'World Tree Seed',
    description: 'Plant carefully.',
    price: 5500,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '🌳'
  },
  collectible_dragons_heart: {
    id: 'collectible_dragons_heart',
    name: 'Dragons Heart',
    description: 'Still beating.',
    price: 9000,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '❤️‍🔥'
  },
  collectible_kraken_eye: {
    id: 'collectible_kraken_eye',
    name: 'Kraken Eye',
    description: 'It blinks sometimes.',
    price: 7200,
    category: 'collectible',
    rarity: 'legendary',
    emoji: '👁️'
  },

  // More mythic collectibles
  collectible_big_bang_remnant: {
    id: 'collectible_big_bang_remnant',
    name: 'Big Bang Remnant',
    description: 'From the beginning of everything.',
    price: 20000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '🌟'
  },
  collectible_entropy: {
    id: 'collectible_entropy',
    name: 'Captured Entropy',
    description: 'Disorder incarnate.',
    price: 35000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '🎭'
  },
  collectible_fate_string: {
    id: 'collectible_fate_string',
    name: 'String of Fate',
    description: 'Connects destinies.',
    price: 55000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '🧵'
  },
  collectible_dream_catcher: {
    id: 'collectible_dream_catcher',
    name: 'Dream of a God',
    description: 'Contained nightmare.',
    price: 70000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '💭'
  },
  collectible_soul_gem: {
    id: 'collectible_soul_gem',
    name: 'Soul Gem',
    description: 'Contains... something.',
    price: 88888,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '💎'
  },
  collectible_primordial_soup: {
    id: 'collectible_primordial_soup',
    name: 'Primordial Soup',
    description: 'Life started here.',
    price: 45000,
    category: 'collectible',
    rarity: 'mythic',
    emoji: '🥣'
  },

  // More ultra collectibles
  collectible_universe_core: {
    id: 'collectible_universe_core',
    name: 'Universe Core',
    description: 'The heart of everything.',
    price: 180000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '🌐'
  },
  collectible_time_itself: {
    id: 'collectible_time_itself',
    name: 'Time Itself',
    description: 'All moments at once.',
    price: 350000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '⏰'
  },
  collectible_space_itself: {
    id: 'collectible_space_itself',
    name: 'Space Itself',
    description: 'Infinite in your palm.',
    price: 350000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '🌌'
  },
  collectible_meaning_of_life: {
    id: 'collectible_meaning_of_life',
    name: 'Meaning of Life',
    description: 'Its 42.',
    price: 420000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '📖'
  },
  collectible_everything: {
    id: 'collectible_everything',
    name: 'Literally Everything',
    description: 'All that is, was, or will be.',
    price: 999999,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '🎁'
  },
  collectible_nothing: {
    id: 'collectible_nothing',
    name: 'Absolute Nothing',
    description: 'True void. Empty. Gone.',
    price: 500000,
    category: 'collectible',
    rarity: 'ultra',
    emoji: '⬛'
  }
};

// Items always in stock
const ALWAYS_AVAILABLE = ['title_noob', 'collectible_rock'];

// Get rotating items based on 15-minute intervals (refreshes on server restart)
function getRotatingItems(itemCount = 8) {
  const now = new Date();
  const quarterHour = Math.floor(now.getMinutes() / 15);
  const timeSeed = now.getFullYear() * 100000000 +
               (now.getMonth() + 1) * 1000000 +
               now.getDate() * 10000 +
               now.getHours() * 100 +
               quarterHour;
  // Include server start time so store refreshes on restart
  const seed = timeSeed + (SERVER_START_TIME % 100000);

  // Hash a string to a number
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  // Seeded random for a given item
  const seededRandom = (itemId, offset = 0) => {
    const combined = seed + hashString(itemId) + offset;
    const x = Math.sin(combined) * 10000;
    return x - Math.floor(x);
  };

  // Get rotating items (exclude always available)
  const rotatingItems = Object.keys(ITEMS).filter(id => !ALWAYS_AVAILABLE.includes(id));

  // Separate titles and non-titles
  const titles = rotatingItems.filter(id => ITEMS[id].category === 'title');
  const nonTitles = rotatingItems.filter(id => ITEMS[id].category !== 'title');

  // Shuffle both with seed
  const shuffledTitles = [...titles].sort((a, b) => {
    return seededRandom(a) - seededRandom(b);
  });
  const shuffledNonTitles = [...nonTitles].sort((a, b) => {
    return seededRandom(a) - seededRandom(b);
  });

  // Ensure at least 1 title in rotation (2 total with always-available title_noob)
  const guaranteedTitles = shuffledTitles.slice(0, 1);
  const remainingSlots = itemCount - guaranteedTitles.length;

  // Fill remaining slots from shuffled mix of remaining titles and non-titles
  const remaining = [...shuffledTitles.slice(1), ...shuffledNonTitles].sort((a, b) => {
    return seededRandom(a, 1000) - seededRandom(b, 1000);
  });

  return [...guaranteedTitles, ...remaining.slice(0, remainingSlots)];
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
