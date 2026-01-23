<template>
  <div class="drag-race" @keydown="handleKeydown" tabindex="0" ref="gameContainer">
    <div class="track-header">
      <span class="game-title">Drag Race</span>
      <span class="phase-indicator">{{ phaseText }}</span>
    </div>

    <!-- Betting Phase -->
    <div v-if="gameState.phase === 'betting'" class="betting-section">
      <p>{{ gameState.host }} is organizing a drag race!</p>
      <p class="instructions">Use <code>/dragbet [amount] [car name]</code> to enter</p>
      <p class="instructions">Use <code>/dragpass</code> to spectate</p>

      <div v-if="Object.keys(gameState.racers).length > 0" class="entrants-list">
        <p class="entrants-title">Entered Racers:</p>
        <div v-for="(racer, name) in gameState.racers" :key="name" class="entrant">
          <span class="car-emoji">{{ racer.car?.emoji || '🚗' }}</span>
          <span class="entrant-name">{{ name }}</span>
          <span class="entrant-car">{{ racer.car?.name }}</span>
          <span class="entrant-bet">${{ racer.bet }}</span>
        </div>
      </div>

      <p v-if="isHost" class="host-hint">You're the host. Use <code>/dragstart</code> when ready!</p>
    </div>

    <!-- Countdown Phase -->
    <div v-if="gameState.phase === 'countdown'" class="countdown-section">
      <div class="countdown-number">{{ gameState.countdown || 'GO!' }}</div>
      <p class="controls-hint">Controls: W/↑ = Left Lane | S/↓ = Right Lane | Space/E = Nitro</p>
    </div>

    <!-- Racing Phase -->
    <div v-if="gameState.phase === 'racing' || gameState.phase === 'countdown'" class="racing-section">
      <!-- Track Display -->
      <div class="track-container">
        <!-- Lane labels -->
        <div class="lane-labels">
          <div class="lane-label">LEFT</div>
          <div class="lane-label">RIGHT</div>
        </div>

        <!-- Track with lanes -->
        <div class="track">
          <!-- Left lane -->
          <div class="lane lane-left">
            <!-- Potholes in left lane -->
            <div
              v-for="(pothole, idx) in leftPotholes"
              :key="'pl-' + idx"
              class="pothole"
              :style="{ left: `${pothole.position}%` }"
            >
              ⚫
            </div>
            <!-- Racers in left lane -->
            <div
              v-for="(racer, name) in leftLaneRacers"
              :key="'rl-' + name"
              class="racer"
              :class="{ 'is-me': name === username, finished: racer.finished }"
              :style="{ left: `${racer.position}%` }"
            >
              <span class="racer-car">{{ racer.car?.emoji || '🚗' }}</span>
              <span class="racer-name">{{ name }}</span>
            </div>
          </div>

          <!-- Lane divider -->
          <div class="lane-divider"></div>

          <!-- Right lane -->
          <div class="lane lane-right">
            <!-- Potholes in right lane -->
            <div
              v-for="(pothole, idx) in rightPotholes"
              :key="'pr-' + idx"
              class="pothole"
              :style="{ left: `${pothole.position}%` }"
            >
              ⚫
            </div>
            <!-- Racers in right lane -->
            <div
              v-for="(racer, name) in rightLaneRacers"
              :key="'rr-' + name"
              class="racer"
              :class="{ 'is-me': name === username, finished: racer.finished }"
              :style="{ left: `${racer.position}%` }"
            >
              <span class="racer-car">{{ racer.car?.emoji || '🚗' }}</span>
              <span class="racer-name">{{ name }}</span>
            </div>
          </div>

          <!-- Finish line -->
          <div class="finish-line">🏁</div>
        </div>
      </div>

      <!-- My status (if racing) -->
      <div v-if="myRacer" class="my-status">
        <div class="status-item">
          <span class="status-label">Lane:</span>
          <span class="status-value">{{ myRacer.lane === 0 ? 'LEFT' : 'RIGHT' }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Nitro:</span>
          <span class="status-value nitro-display">
            <span v-for="n in myRacer.nitroLeft" :key="n" class="nitro-charge">⚡</span>
            <span v-if="myRacer.nitroLeft === 0" class="no-nitro">EMPTY</span>
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Speed:</span>
          <span class="status-value">{{ Math.round((myRacer.speed || 0) * 20) }} mph</span>
        </div>
      </div>

      <!-- Control hints during race -->
      <div v-if="gameState.phase === 'racing' && myRacer && !myRacer.finished" class="controls-reminder">
        <span class="key">W</span><span class="key">↑</span> Left
        <span class="separator">|</span>
        <span class="key">S</span><span class="key">↓</span> Right
        <span class="separator">|</span>
        <span class="key">Space</span><span class="key">E</span> Nitro
      </div>
    </div>

    <!-- Results Phase -->
    <div v-if="gameState.phase === 'result'" class="results-section">
      <div class="winner-announcement">
        {{ gameState.winner }} WINS!
      </div>
      <div class="pot-display">Total Pot: ${{ gameState.totalPot }}</div>

      <div class="results-list">
        <div
          v-for="result in gameState.results"
          :key="result.player"
          class="result-item"
          :class="{ winner: result.won }"
        >
          <span class="result-place">{{ getPlaceText(result.place) }}</span>
          <span class="result-car">{{ result.emoji }}</span>
          <span class="result-player">{{ result.player }}</span>
          <span class="result-time">{{ (result.time / 1000).toFixed(2) }}s</span>
          <span class="result-payout" :class="{ win: result.won }">
            {{ result.won ? `+$${result.payout}` : `-$${result.bet}` }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  gameState: {
    type: Object,
    required: true
  },
  username: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['send', 'drag-input', 'drag-nitro'])

const gameContainer = ref(null)

const phaseText = computed(() => {
  switch (props.gameState.phase) {
    case 'betting':
      return 'Accepting Bets'
    case 'countdown':
      return 'Starting...'
    case 'racing':
      return 'RACE!'
    case 'result':
      return 'Finished'
    default:
      return ''
  }
})

const isHost = computed(() => props.gameState.host === props.username)

const myRacer = computed(() => {
  return props.gameState.racers[props.username] || null
})

const leftPotholes = computed(() => {
  return props.gameState.potholes.filter(p => p.lane === 0)
})

const rightPotholes = computed(() => {
  return props.gameState.potholes.filter(p => p.lane === 1)
})

const leftLaneRacers = computed(() => {
  const result = {}
  for (const [name, racer] of Object.entries(props.gameState.racers)) {
    if (racer.lane === 0) {
      result[name] = racer
    }
  }
  return result
})

const rightLaneRacers = computed(() => {
  const result = {}
  for (const [name, racer] of Object.entries(props.gameState.racers)) {
    if (racer.lane === 1) {
      result[name] = racer
    }
  }
  return result
})

function getPlaceText(place) {
  switch (place) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return `${place}.`
  }
}

function handleKeydown(e) {
  // Only handle input during racing phase and if we're a racer
  if (props.gameState.phase !== 'racing' || !myRacer.value || myRacer.value.finished) {
    return
  }

  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      e.preventDefault()
      emit('drag-input', 0) // Left lane
      break
    case 's':
    case 'arrowdown':
      e.preventDefault()
      emit('drag-input', 1) // Right lane
      break
    case ' ':
    case 'e':
      e.preventDefault()
      emit('drag-nitro')
      break
  }
}

// Global keydown handler for when element isn't focused
function globalKeydown(e) {
  if (props.gameState.phase === 'racing' && myRacer.value && !myRacer.value.finished) {
    // Check if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return
    }
    handleKeydown(e)
  }
}

onMounted(() => {
  // Focus the game container
  if (gameContainer.value) {
    gameContainer.value.focus()
  }
  // Add global keydown listener
  window.addEventListener('keydown', globalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', globalKeydown)
})

// Refocus when racing starts
watch(() => props.gameState.phase, (newPhase) => {
  if (newPhase === 'racing' && gameContainer.value) {
    gameContainer.value.focus()
  }
})
</script>

<style scoped>
.drag-race {
  width: 100%;
  max-width: 700px;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 20px;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  outline: none;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #333333;
}

.game-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #e0e0e0;
}

.phase-indicator {
  color: #00ff00;
  font-size: 0.9em;
  font-weight: 600;
}

/* Betting Section */
.betting-section {
  text-align: center;
  padding: 20px;
}

.betting-section p {
  margin: 8px 0;
  color: #b0b0b0;
}

.instructions {
  font-size: 0.9em;
}

.instructions code {
  background: #333;
  padding: 2px 6px;
  border-radius: 3px;
  color: #00ff00;
}

.entrants-list {
  margin-top: 20px;
  background: #252525;
  border-radius: 4px;
  padding: 12px;
}

.entrants-title {
  font-weight: 600;
  margin-bottom: 10px;
  color: #e0e0e0;
}

.entrant {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-bottom: 1px solid #333;
}

.entrant:last-child {
  border-bottom: none;
}

.car-emoji {
  font-size: 1.2em;
}

.entrant-name {
  font-weight: 500;
  color: #e0e0e0;
  min-width: 80px;
}

.entrant-car {
  flex: 1;
  color: #888;
  font-size: 0.9em;
}

.entrant-bet {
  color: #00ff00;
  font-weight: 500;
}

.host-hint {
  margin-top: 20px;
  color: #ffaa00 !important;
}

/* Countdown Section */
.countdown-section {
  text-align: center;
  padding: 20px;
}

.countdown-number {
  font-size: 4em;
  font-weight: bold;
  color: #00ff00;
  text-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.controls-hint {
  margin-top: 20px;
  color: #888;
  font-size: 0.9em;
}

/* Racing Section */
.racing-section {
  margin-top: 10px;
}

.track-container {
  background: #252525;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 15px;
}

.lane-labels {
  display: flex;
  justify-content: space-around;
  margin-bottom: 10px;
}

.lane-label {
  color: #666;
  font-size: 0.8em;
  font-weight: 600;
}

.track {
  position: relative;
  height: 120px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.lane {
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  background: #2a2a2a;
}

.lane-left {
  top: 0;
  border-bottom: 2px dashed #444;
}

.lane-right {
  bottom: 0;
}

.lane-divider {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: #444;
  transform: translateY(-50%);
}

.pothole {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.5em;
  transition: left 0.1s linear;
  opacity: 0.8;
}

.racer {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: left 0.1s linear;
}

.racer.is-me .racer-name {
  color: #00ff00;
  font-weight: bold;
}

.racer.finished {
  opacity: 0.5;
}

.racer-car {
  font-size: 1.8em;
  filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));
}

.racer-name {
  font-size: 0.7em;
  color: #aaa;
  white-space: nowrap;
  margin-top: -5px;
}

.finish-line {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 2em;
}

/* My Status */
.my-status {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
  padding: 10px;
  background: #252525;
  border-radius: 4px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  color: #888;
  font-size: 0.85em;
}

.status-value {
  color: #e0e0e0;
  font-weight: 500;
}

.nitro-display {
  color: #ffdd00;
}

.nitro-charge {
  font-size: 1.2em;
}

.no-nitro {
  color: #666;
  font-size: 0.8em;
}

/* Controls Reminder */
.controls-reminder {
  text-align: center;
  margin-top: 15px;
  color: #888;
  font-size: 0.85em;
}

.controls-reminder .key {
  display: inline-block;
  background: #333;
  padding: 2px 8px;
  border-radius: 3px;
  margin: 0 2px;
  font-family: monospace;
  color: #fff;
  border: 1px solid #555;
}

.controls-reminder .separator {
  margin: 0 10px;
  color: #555;
}

/* Results Section */
.results-section {
  text-align: center;
  padding: 20px;
}

.winner-announcement {
  font-size: 1.5em;
  font-weight: bold;
  color: #00ff00;
  margin-bottom: 10px;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.pot-display {
  color: #ffdd00;
  font-size: 1.1em;
  margin-bottom: 20px;
}

.results-list {
  background: #252525;
  border-radius: 4px;
  padding: 10px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #333;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.winner {
  background: #1a2a1a;
}

.result-place {
  font-size: 1.2em;
  width: 30px;
}

.result-car {
  font-size: 1.2em;
}

.result-player {
  flex: 1;
  text-align: left;
  font-weight: 500;
}

.result-time {
  color: #888;
  font-size: 0.9em;
}

.result-payout {
  font-weight: 500;
  min-width: 70px;
  text-align: right;
}

.result-payout.win {
  color: #00ff00;
}

.result-payout:not(.win) {
  color: #ff4444;
}
</style>
