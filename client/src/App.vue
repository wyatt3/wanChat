<template>
  <div class="terminal-window">
    <LoginScreen v-if="!joined" @join="handleJoin" />
    <ChatRoom
      v-else
      :messages="messages"
      :users="users"
      :username="username"
      :balances="balances"
      :gameState="gameState"
      @send="handleSend"
      @snake-input="handleSnakeInput"
      @snake-quit="handleSnakeQuit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import LoginScreen from './components/LoginScreen.vue'
import ChatRoom from './components/ChatRoom.vue'

const socket = ref(null)
const joined = ref(false)
const username = ref('')
const messages = ref([])
const users = ref([])
const balances = ref({})

// Game state
const gameState = reactive({
  // Current active game
  activeGame: null, // 'blackjack', 'race', 'snake', or null

  // Blackjack state
  blackjack: {
    phase: null, // 'betting', 'playing', 'result'
    host: null,
    hands: {},
    dealerCard: null,
    dealerHand: null,
    dealerValue: null,
    currentTurn: null,
    currentTurnSocketId: null,
    options: [],
    results: null,
    mySocketId: null
  },

  // Race state
  race: {
    phase: null, // 'betting', 'running', 'result'
    host: null,
    horses: [],
    positions: [0, 0, 0, 0, 0],
    winner: null,
    results: null
  },

  // Snake state
  snake: {
    active: false,
    host: null,
    hostSocketId: null,
    width: 30,
    height: 20,
    body: [],
    food: null,
    score: 0,
    foodValue: 1
  }
})

// Audio context for sound effects
let audioContext = null

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Show a notification (only when tab is not focused)
function showNotification(title, body, tag = null) {
  if ('Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden) {
    const options = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      silent: false
    }
    if (tag) {
      options.tag = tag // Prevents duplicate notifications
    }
    const notification = new Notification(title, options)
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  }
}

function playFartSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }

    // Create a "fart" sound using oscillators and noise
    const now = audioContext.currentTime
    const duration = 0.5

    // Low frequency oscillator for the main "rumble"
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + duration)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    osc.connect(gain)
    gain.connect(audioContext.destination)

    osc.start(now)
    osc.stop(now + duration)

    // Add some noise for texture
    const bufferSize = Math.floor(audioContext.sampleRate * duration)
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
    }

    const noise = audioContext.createBufferSource()
    const noiseGain = audioContext.createGain()
    const filter = audioContext.createBiquadFilter()

    noise.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.value = 200

    noiseGain.gain.setValueAtTime(0.15, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(audioContext.destination)

    noise.start(now)
  } catch (e) {
    // Audio not supported
  }
}

onMounted(() => {
  // Check for saved username
  const savedUsername = localStorage.getItem('wanchat_username')
  if (savedUsername) {
    username.value = savedUsername
    joined.value = true
  }

  // Connect to socket server
  socket.value = io({
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionAttempts: Infinity
  })

  // Store socket ID for game state
  socket.value.on('connect', () => {
    gameState.blackjack.mySocketId = socket.value.id
    if (joined.value && username.value) {
      socket.value.emit('join', username.value)
    }
  })

  // Handle incoming chat messages
  socket.value.on('chat', (data) => {
    messages.value.push({
      type: 'chat',
      user: data.user,
      text: data.text,
      time: data.time
    })
    // Notify if message is from someone else
    if (data.user !== username.value) {
      showNotification(`${data.user}`, data.text, 'chat')
    }
  })

  // Handle system messages
  socket.value.on('system', (data) => {
    messages.value.push({
      type: 'system',
      text: data.text,
      time: data.time
    })
    // Notify on join/leave
    if (data.text.includes('joined') || data.text.includes('left')) {
      showNotification('wanChat', data.text, 'system')
    }
  })

  // Handle action messages
  socket.value.on('action', (data) => {
    messages.value.push({
      type: 'action',
      text: data.text,
      time: data.time
    })
  })

  // Handle user list updates
  socket.value.on('users', (userList) => {
    users.value = userList
  })

  // Handle balance updates
  socket.value.on('balance_update', (data) => {
    balances.value = data.balances
  })

  // Handle clear local
  socket.value.on('clear_local', () => {
    messages.value = []
  })

  // Handle clear all
  socket.value.on('clear_all', () => {
    messages.value = []
  })

  // Handle fart
  socket.value.on('fart', () => {
    playFartSound()
  })

  // Handle killall
  socket.value.on('killall', () => {
    window.close()
  })

  // === BLACKJACK EVENTS ===
  socket.value.on('bj_wager_request', (data) => {
    gameState.activeGame = 'blackjack'
    gameState.blackjack.phase = 'betting'
    gameState.blackjack.host = data.host
    gameState.blackjack.hands = {}
    gameState.blackjack.results = null
    showNotification('Blackjack', `${data.host} started a game! Place your bets.`, 'blackjack')
  })

  socket.value.on('bj_bet_placed', (data) => {
    // Update UI to show who bet
  })

  socket.value.on('bj_start', (data) => {
    gameState.blackjack.phase = 'playing'
    gameState.blackjack.hands = data.hands
    gameState.blackjack.dealerCard = data.dealerCard
    gameState.blackjack.dealerValue = data.dealerValue
  })

  socket.value.on('bj_turn', (data) => {
    gameState.blackjack.currentTurn = data.player
    gameState.blackjack.currentTurnSocketId = data.socketId
    gameState.blackjack.options = data.options
    // Update the hand display
    if (data.hand && gameState.blackjack.hands[data.player]) {
      gameState.blackjack.hands[data.player].cards = data.hand.cards
      gameState.blackjack.hands[data.player].value = data.hand.value
    }
    // Notify if it's your turn
    if (data.player === username.value) {
      showNotification('Blackjack', "It's your turn!", 'bj-turn')
    }
  })

  socket.value.on('bj_action', (data) => {
    if (data.hand && gameState.blackjack.hands[data.player]) {
      gameState.blackjack.hands[data.player].cards = data.hand
      gameState.blackjack.hands[data.player].value = data.handValue
    }
    if (data.newWager && gameState.blackjack.hands[data.player]) {
      gameState.blackjack.hands[data.player].wager = data.newWager
    }
  })

  socket.value.on('bj_dealer_reveal', (data) => {
    gameState.blackjack.dealerHand = data.hand
    gameState.blackjack.dealerValue = data.value
  })

  socket.value.on('bj_dealer_draw', (data) => {
    gameState.blackjack.dealerHand = data.hand
    gameState.blackjack.dealerValue = data.value
  })

  socket.value.on('bj_result', (data) => {
    gameState.blackjack.phase = 'result'
    gameState.blackjack.dealerHand = data.dealerHand
    gameState.blackjack.dealerValue = data.dealerValue
    gameState.blackjack.results = data.results
  })

  socket.value.on('bj_cancelled', () => {
    resetBlackjack()
  })

  socket.value.on('bj_ended', () => {
    // Keep result visible for a moment then reset
    setTimeout(() => {
      resetBlackjack()
    }, 5000)
  })

  // === RACE EVENTS ===
  socket.value.on('race_start', (data) => {
    gameState.activeGame = 'race'
    gameState.race.phase = 'betting'
    gameState.race.host = data.host
    gameState.race.horses = data.horses
    gameState.race.positions = [0, 0, 0, 0, 0]
    gameState.race.winner = null
    gameState.race.results = null
    showNotification('Horse Race', `${data.host} started a race! Place your bets.`, 'race')
  })

  socket.value.on('race_running', (data) => {
    gameState.race.phase = 'running'
  })

  socket.value.on('race_update', (data) => {
    gameState.race.positions = data.positions
  })

  socket.value.on('race_result', (data) => {
    gameState.race.phase = 'result'
    gameState.race.winner = data.winner
    gameState.race.positions = data.positions
    gameState.race.results = data.results
  })

  socket.value.on('race_cancelled', () => {
    resetRace()
  })

  socket.value.on('race_ended', () => {
    setTimeout(() => {
      resetRace()
    }, 5000)
  })

  // === SNAKE EVENTS ===
  socket.value.on('snake_start', (data) => {
    gameState.activeGame = 'snake'
    gameState.snake.active = true
    gameState.snake.host = data.host
    gameState.snake.hostSocketId = data.hostSocketId
    gameState.snake.width = data.width
    gameState.snake.height = data.height
    gameState.snake.body = data.body
    gameState.snake.food = data.food
    gameState.snake.score = data.score
    gameState.snake.foodValue = data.foodValue
    showNotification('Snake', `${data.host} is playing Snake!`, 'snake')
  })

  socket.value.on('snake_update', (data) => {
    gameState.snake.body = data.body
    gameState.snake.food = data.food
    gameState.snake.score = data.score
    gameState.snake.foodValue = data.foodValue
  })

  socket.value.on('snake_end', (data) => {
    // Show end screen briefly
  })

  socket.value.on('snake_ended', () => {
    setTimeout(() => {
      resetSnake()
    }, 3000)
  })
})

function resetBlackjack() {
  gameState.blackjack.phase = null
  gameState.blackjack.host = null
  gameState.blackjack.hands = {}
  gameState.blackjack.dealerCard = null
  gameState.blackjack.dealerHand = null
  gameState.blackjack.dealerValue = null
  gameState.blackjack.currentTurn = null
  gameState.blackjack.currentTurnSocketId = null
  gameState.blackjack.options = []
  gameState.blackjack.results = null
  if (gameState.activeGame === 'blackjack') {
    gameState.activeGame = null
  }
}

function resetRace() {
  gameState.race.phase = null
  gameState.race.host = null
  gameState.race.horses = []
  gameState.race.positions = [0, 0, 0, 0, 0]
  gameState.race.winner = null
  gameState.race.results = null
  if (gameState.activeGame === 'race') {
    gameState.activeGame = null
  }
}

function resetSnake() {
  gameState.snake.active = false
  gameState.snake.host = null
  gameState.snake.hostSocketId = null
  gameState.snake.body = []
  gameState.snake.food = null
  gameState.snake.score = 0
  gameState.snake.foodValue = 1
  if (gameState.activeGame === 'snake') {
    gameState.activeGame = null
  }
}

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})

function handleJoin(name) {
  username.value = name
  localStorage.setItem('wanchat_username', name)
  socket.value.emit('join', name)
  joined.value = true
  // Request notification permission
  requestNotificationPermission()
}

function handleSend(text) {
  socket.value.emit('message', text)
}

function handleSnakeInput(direction) {
  socket.value.emit('snake_input', direction)
}

function handleSnakeQuit() {
  socket.value.emit('snake_quit')
}
</script>
