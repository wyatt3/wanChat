<template>
  <div class="race-track">
    <div class="track-header">
      <span class="game-title">HORSE RACE</span>
      <span class="phase-indicator">{{ phaseText }}</span>
    </div>

    <!-- Race Track Display -->
    <div class="track-container">
      <div
        v-for="(horse, idx) in gameState.horses"
        :key="idx"
        class="track-lane"
        :class="{ winner: gameState.phase === 'result' && gameState.winner === idx }"
      >
        <div class="lane-info">
          <span class="horse-number">{{ idx + 1 }}</span>
          <span class="horse-name">{{ horse.name }}</span>
          <span class="horse-odds">({{ horse.odds }}:1)</span>
        </div>
        <div class="lane-track">
          <div
            class="horse-icon"
            :style="{ left: `${gameState.positions[idx]}%` }"
          >
            🏇
          </div>
          <div class="finish-line">🏁</div>
        </div>
      </div>
    </div>

    <!-- Betting Phase -->
    <div v-if="gameState.phase === 'betting'" class="betting-section">
      <p>{{ gameState.host }} is starting a horse race!</p>
      <template v-if="!hasActed">
        <p>Select a horse and enter your bet amount:</p>
        <div class="bet-options">
          <div
            v-for="(horse, idx) in gameState.horses"
            :key="idx"
            class="bet-option"
            :class="{ selected: selectedHorse === idx + 1 }"
            @click="selectedHorse = idx + 1"
          >
            <span class="opt-number">{{ idx + 1 }}</span>
            <span class="opt-name">{{ horse.name }}</span>
            <span class="opt-odds">{{ horse.odds }}:1</span>
          </div>
        </div>
        <div class="bet-amount-section">
          <span class="dollar-sign">$</span>
          <input
            v-model.number="betAmount"
            type="number"
            min="1"
            class="bet-input"
            placeholder="Amount"
          />
        </div>
        <div class="bet-actions">
          <button
            @click="placeBet"
            class="place-bet-btn"
            :disabled="!selectedHorse || !betAmount"
          >
            Place Bet
          </button>
          <button @click="pass" class="pass-btn">Pass</button>
        </div>
      </template>
      <div v-else class="waiting-message">
        <div class="waiting-icon">🏇</div>
        <p>Waiting for other players...</p>
      </div>
    </div>

    <!-- Running Phase -->
    <div v-if="gameState.phase === 'running'" class="running-section">
      <div class="race-status">AND THEY'RE OFF!</div>
    </div>

    <!-- Results Phase -->
    <div v-if="gameState.phase === 'result' && gameState.results" class="results-section">
      <div class="winner-announcement">
        🏆 {{ gameState.horses[gameState.winner]?.name }} WINS! 🏆
      </div>
      <div class="results-list">
        <div v-for="result in gameState.results" :key="result.player" class="result-item">
          <span class="result-player">{{ result.player }}</span>
          <span
            class="result-outcome"
            :class="{ win: result.won, lose: !result.won }"
          >
            {{ result.won ? `Won $${result.payout}!` : `Lost $${result.bet}` }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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

const emit = defineEmits(['send'])

const selectedHorse = ref(null)
const betAmount = ref(10)
const hasActed = ref(false)

const phaseText = computed(() => {
  switch (props.gameState.phase) {
    case 'betting':
      return 'Place your bets!'
    case 'running':
      return 'Race in progress...'
    case 'result':
      return 'Race finished!'
    default:
      return ''
  }
})

function placeBet() {
  if (selectedHorse.value && betAmount.value) {
    emit('send', `/horse ${selectedHorse.value} ${betAmount.value}`)
    hasActed.value = true
  }
}

function pass() {
  emit('send', '/pass')
  hasActed.value = true
}
</script>

<style scoped>
.race-track {
  width: 100%;
  max-width: 700px;
  background: linear-gradient(135deg, #2d1f1f 0%, #4a3333 100%);
  border-radius: 20px;
  padding: 20px;
  color: white;
  font-family: inherit;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.game-title {
  font-size: 1.5em;
  font-weight: bold;
  color: #ffd700;
}

.phase-indicator {
  color: rgba(255, 255, 255, 0.8);
}

/* Track */
.track-container {
  background: #3d5c3d;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
}

.track-lane {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
  transition: background 0.3s;
}

.track-lane:last-child {
  border-bottom: none;
}

.track-lane.winner {
  background: rgba(255, 215, 0, 0.2);
}

.lane-info {
  width: 140px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.horse-number {
  background: #ffd700;
  color: #1a1a1a;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9em;
}

.horse-name {
  font-weight: bold;
}

.horse-odds {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85em;
}

.lane-track {
  flex: 1;
  height: 30px;
  background: #2a472a;
  border-radius: 5px;
  position: relative;
  overflow: hidden;
}

.horse-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.5em;
  transition: left 0.15s linear;
}

.finish-line {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2em;
}

/* Betting Section */
.betting-section {
  text-align: center;
}

.betting-section p {
  margin: 10px 0;
}

.bet-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 15px 0;
}

.bet-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  border: 2px solid transparent;
}

.bet-option:hover {
  background: rgba(0, 0, 0, 0.3);
}

.bet-option.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.opt-number {
  background: #ffd700;
  color: #1a1a1a;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.opt-name {
  flex: 1;
  text-align: left;
  font-weight: bold;
}

.opt-odds {
  color: rgba(255, 255, 255, 0.6);
}

.bet-amount-section {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  margin: 15px 0;
}

.dollar-sign {
  font-size: 1.2em;
  color: #ffd700;
}

.bet-input {
  width: 100px;
  padding: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 1em;
  text-align: center;
}

.bet-input:focus {
  outline: none;
  border-color: #ffd700;
}

.bet-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 15px;
}

.place-bet-btn {
  background: #4ade80;
  color: #1a1a1a;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1em;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}

.place-bet-btn:hover:not(:disabled) {
  background: #22c55e;
  transform: scale(1.05);
}

.place-bet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pass-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1em;
  cursor: pointer;
}

.pass-btn:hover {
  background: #4b5563;
}

.waiting-message {
  text-align: center;
  padding: 30px;
}

.waiting-icon {
  font-size: 3em;
  margin-bottom: 15px;
  animation: trot 0.5s ease-in-out infinite;
}

@keyframes trot {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.waiting-message p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1em;
}

/* Running */
.running-section {
  text-align: center;
  padding: 20px;
}

.race-status {
  font-size: 1.5em;
  font-weight: bold;
  color: #ffd700;
  animation: shake 0.3s infinite;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Results */
.results-section {
  text-align: center;
  padding: 15px;
}

.winner-announcement {
  font-size: 1.3em;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 10px;
}

.results-list {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 10px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-item:last-child {
  border-bottom: none;
}

.result-outcome.win {
  color: #4ade80;
  font-weight: bold;
}

.result-outcome.lose {
  color: #ef4444;
}
</style>
