<template>
  <div class="race-track">
    <div class="track-header">
      <span class="game-title">Project Timeline</span>
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
          <span class="horse-odds">({{ horse.odds }}x)</span>
        </div>
        <div class="lane-track">
          <div
            class="horse-icon"
            :style="{ left: `calc(${gameState.positions[idx]}% - 8px)` }"
          >
            ▶
          </div>
          <div class="finish-line">|</div>
        </div>
      </div>
    </div>

    <!-- Betting Phase -->
    <div v-if="gameState.phase === 'betting'" class="betting-section">
      <p>{{ gameState.host }} initiated resource allocation</p>
      <template v-if="!hasActed">
        <p>Select priority and enter allocation:</p>
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
            <span class="opt-odds">{{ horse.odds }}x</span>
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
            Submit
          </button>
          <button @click="pass" class="pass-btn">Skip</button>
        </div>
      </template>
      <div v-else class="waiting-message">
        <div class="waiting-icon">○</div>
        <p>Awaiting other responses...</p>
      </div>
    </div>

    <!-- Running Phase -->
    <div v-if="gameState.phase === 'running'" class="running-section">
      <div class="race-status">Processing...</div>
    </div>

    <!-- Results Phase -->
    <div v-if="gameState.phase === 'result' && gameState.results" class="results-section">
      <div class="winner-announcement">
        {{ gameState.horses[gameState.winner]?.name }} - Completed
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
      return 'Pending Input'
    case 'running':
      return 'In Progress'
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
  max-width: 600px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 20px;
  color: #212529;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
}

.game-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #495057;
}

.phase-indicator {
  color: #6c757d;
  font-size: 0.9em;
}

/* Track */
.track-container {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.track-lane {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f3f4;
}

.track-lane:last-child {
  border-bottom: none;
}

.track-lane.winner {
  background: #e8f5e9;
}

.lane-info {
  width: 130px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.horse-number {
  background: #e9ecef;
  color: #495057;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8em;
}

.horse-name {
  font-weight: 500;
  font-size: 0.9em;
  color: #212529;
}

.horse-odds {
  color: #6c757d;
  font-size: 0.8em;
}

.lane-track {
  flex: 1;
  height: 20px;
  background: #e9ecef;
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

.horse-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8em;
  color: #0d6efd;
  transition: left 0.15s linear;
}

.finish-line {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9em;
  color: #adb5bd;
}

/* Betting Section */
.betting-section {
  text-align: center;
}

.betting-section p {
  margin: 8px 0;
  color: #495057;
}

.bet-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 12px 0;
}

.bet-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.bet-option:hover {
  background: #f8f9fa;
}

.bet-option.selected {
  border-color: #0d6efd;
  background: #f8f9ff;
}

.opt-number {
  background: #e9ecef;
  color: #495057;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85em;
}

.opt-name {
  flex: 1;
  text-align: left;
  font-weight: 500;
  color: #212529;
}

.opt-odds {
  color: #6c757d;
  font-size: 0.85em;
}

.bet-amount-section {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
}

.dollar-sign {
  font-size: 1em;
  color: #495057;
}

.bet-input {
  width: 80px;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #fff;
  color: #212529;
  font-size: 1em;
  text-align: center;
}

.bet-input:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.15);
}

.bet-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.place-bet-btn {
  background: #0d6efd;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: pointer;
}

.place-bet-btn:hover:not(:disabled) {
  background: #0b5ed7;
}

.place-bet-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pass-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: pointer;
}

.pass-btn:hover {
  background: #5c636a;
}

.waiting-message {
  text-align: center;
  padding: 20px;
}

.waiting-icon {
  font-size: 1.5em;
  margin-bottom: 10px;
  color: #6c757d;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.waiting-message p {
  color: #6c757d;
  font-size: 0.95em;
}

/* Running */
.running-section {
  text-align: center;
  padding: 16px;
}

.race-status {
  font-size: 1em;
  color: #6c757d;
}

/* Results */
.results-section {
  text-align: center;
  padding: 12px;
}

.winner-announcement {
  font-size: 1em;
  font-weight: 600;
  color: #198754;
  margin-bottom: 12px;
  padding: 8px;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
}

.results-list {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  border-bottom: 1px solid #f1f3f4;
  font-size: 0.9em;
}

.result-item:last-child {
  border-bottom: none;
}

.result-player {
  color: #495057;
}

.result-outcome.win {
  color: #198754;
  font-weight: 500;
}

.result-outcome.lose {
  color: #dc3545;
}
</style>
