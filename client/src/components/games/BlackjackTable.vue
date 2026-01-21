<template>
  <div class="blackjack-table">
    <div class="table-header">
      <span class="game-title">Q4 Budget Review</span>
      <span class="phase-indicator">{{ phaseText }}</span>
    </div>

    <!-- Betting Phase -->
    <div v-if="gameState.phase === 'betting'" class="betting-phase">
      <p>{{ gameState.host }} initiated budget allocation request</p>
      <template v-if="!hasActed">
        <p>Enter allocation amount:</p>
        <div class="bet-input-section">
          <span class="dollar-sign">$</span>
          <input
            v-model.number="betAmount"
            type="number"
            min="1"
            class="bet-input"
            placeholder="Amount"
            @keyup.enter="placeBet"
          />
        </div>
        <div class="bet-actions">
          <button @click="placeBet" class="bet-btn" :disabled="!betAmount || betAmount < 1">Submit</button>
          <button @click="fold" class="fold-btn">Decline</button>
        </div>
      </template>
      <div v-else class="waiting-message">
        <div class="waiting-icon">○</div>
        <p>Awaiting other approvals...</p>
      </div>
    </div>

    <!-- Playing Phase -->
    <div v-if="gameState.phase === 'playing' || gameState.phase === 'result'" class="playing-phase">
      <!-- Dealer Section -->
      <div class="dealer-section">
        <div class="section-label">OVERHEAD</div>
        <div class="cards-row">
          <template v-if="gameState.dealerHand">
            <div
              v-for="(card, idx) in gameState.dealerHand"
              :key="'dealer-' + idx"
              class="card"
              :class="{ red: card.isRed }"
            >
              {{ card.display }}
            </div>
          </template>
          <template v-else-if="gameState.dealerCard">
            <div class="card back">?</div>
            <div class="card" :class="{ red: gameState.dealerCard.isRed }">
              {{ gameState.dealerCard.display }}
            </div>
          </template>
        </div>
        <div v-if="gameState.dealerValue" class="hand-value">{{ gameState.dealerValue }}</div>
      </div>

      <!-- Players Section -->
      <div class="players-section">
        <div
          v-for="(hand, playerName) in gameState.hands"
          :key="playerName"
          class="player-hand"
          :class="{
            'current-turn': gameState.currentTurn === playerName,
            'is-you': playerName === username
          }"
        >
          <div class="player-name">
            {{ playerName }}
            <span v-if="playerName === username" class="you-label">(YOU)</span>
            <span v-if="gameState.currentTurn === playerName" class="turn-indicator">◀</span>
          </div>
          <!-- Show split hands if player has split -->
          <template v-if="hand.splitHands && hand.splitHands.length > 1">
            <div v-for="(splitHand, handIdx) in hand.splitHands" :key="'split-' + handIdx" class="split-hand">
              <div class="split-label">Hand {{ handIdx + 1 }}</div>
              <div class="cards-row">
                <div
                  v-for="(card, idx) in splitHand.cards"
                  :key="playerName + '-split-' + handIdx + '-' + idx"
                  class="card"
                  :class="{ red: card.isRed }"
                >
                  {{ card.display }}
                </div>
              </div>
              <div class="hand-info">
                <span class="hand-value">{{ splitHand.value }}</span>
              </div>
            </div>
          </template>
          <!-- Normal single hand -->
          <template v-else>
            <div class="cards-row">
              <div
                v-for="(card, idx) in hand.cards"
                :key="playerName + '-' + idx"
                class="card"
                :class="{ red: card.isRed }"
              >
                {{ card.display }}
              </div>
            </div>
            <div class="hand-info">
              <span class="hand-value">{{ hand.value }}</span>
              <span class="wager">${{ hand.wager }}</span>
              <span v-if="hand.blackjack" class="blackjack-badge">BLACKJACK!</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Action Buttons (for current player) -->
      <div
        v-if="gameState.phase === 'playing' && gameState.currentTurn === username"
        class="action-buttons"
      >
        <button
          v-if="gameState.options.includes('hit')"
          @click="action('hit')"
          class="action-btn hit"
        >
          Add Item
        </button>
        <button
          v-if="gameState.options.includes('stand')"
          @click="action('stand')"
          class="action-btn stand"
        >
          Finalize
        </button>
        <button
          v-if="gameState.options.includes('double')"
          @click="action('double')"
          class="action-btn double"
        >
          Double
        </button>
        <button
          v-if="gameState.options.includes('split')"
          @click="action('split')"
          class="action-btn split"
        >
          Split
        </button>
      </div>
    </div>

    <!-- Results Phase -->
    <div v-if="gameState.phase === 'result' && gameState.results" class="results-section">
      <div class="results-header">Summary Report</div>
      <div v-for="result in gameState.results" :key="result.player" class="result-item">
        <span class="result-player">{{ result.player }}</span>
        <span
          class="result-outcome"
          :class="{
            win: result.result === 'win' || result.result === 'blackjack',
            lose: result.result === 'lose',
            push: result.result === 'push'
          }"
        >
          {{ formatResult(result) }}
        </span>
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

const betAmount = ref(10)
const hasActed = ref(false)

const phaseText = computed(() => {
  switch (props.gameState.phase) {
    case 'betting':
      return 'Pending Approval'
    case 'playing':
      return props.gameState.currentTurn ? `Awaiting ${props.gameState.currentTurn}` : 'Processing...'
    case 'result':
      return 'Complete'
    default:
      return ''
  }
})

function placeBet() {
  if (betAmount.value && betAmount.value >= 1) {
    emit('send', `/bet ${betAmount.value}`)
    hasActed.value = true
  }
}

function fold() {
  emit('send', '/fold')
  hasActed.value = true
}

function action(act) {
  emit('send', `/${act}`)
}

function formatResult(result) {
  switch (result.result) {
    case 'blackjack':
      return `Bonus +$${result.payout - result.wager}`
    case 'win':
      return `Approved +$${result.payout - result.wager}`
    case 'push':
      return 'No Change'
    case 'lose':
      return `Denied -$${result.wager}`
    default:
      return result.result
  }
}
</script>

<style scoped>
.blackjack-table {
  width: 100%;
  max-width: 700px;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 20px;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.table-header {
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
  color: #888888;
  font-size: 0.9em;
}

/* Betting Phase */
.betting-phase {
  text-align: center;
  padding: 16px;
}

.betting-phase p {
  margin: 8px 0;
  color: #b0b0b0;
}

.bet-input-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 16px 0;
}

.dollar-sign {
  font-size: 1em;
  color: #b0b0b0;
}

.bet-input {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background: #252525;
  color: #e0e0e0;
  font-size: 1em;
  text-align: center;
}

.bet-input:focus {
  outline: none;
  border-color: #00ff00;
  box-shadow: 0 0 0 2px rgba(0, 255, 0, 0.15);
}

.bet-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.bet-btn {
  background: #00aa00;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.9em;
}

.bet-btn:hover:not(:disabled) {
  background: #00cc00;
}

.bet-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.fold-btn {
  background: #555555;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.9em;
}

.fold-btn:hover {
  background: #666666;
}

.waiting-message {
  text-align: center;
  padding: 24px;
}

.waiting-icon {
  font-size: 1.5em;
  margin-bottom: 12px;
  color: #888888;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.waiting-message p {
  color: #888888;
  font-size: 0.95em;
}

/* Playing Phase */
.playing-phase {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dealer-section,
.players-section {
  padding: 12px;
  background: #252525;
  border: 1px solid #333333;
  border-radius: 4px;
}

.section-label {
  color: #888888;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.cards-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.card {
  width: 36px;
  height: 28px;
  background: #333333;
  border: 1px solid #444444;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 600;
  color: #e0e0e0;
}

.card.red {
  color: #ff4444;
}

.card.back {
  background: #444444;
  color: #888888;
}

.hand-value {
  margin-top: 6px;
  font-size: 0.9em;
  color: #b0b0b0;
  font-weight: 600;
}

/* Players */
.players-section {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.player-hand {
  background: #252525;
  padding: 12px;
  border: 1px solid #333333;
  border-radius: 4px;
  min-width: 140px;
}

.player-hand.current-turn {
  border-color: #3399ff;
  background: #1a2a3a;
}

.player-hand.is-you {
  border-color: #00ff00;
  background: #1a2a1a;
}

.player-name {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: #e0e0e0;
}

.you-label {
  color: #00ff00;
  font-size: 0.75em;
}

.turn-indicator {
  color: #3399ff;
}

.hand-info {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  font-size: 0.85em;
}

.wager {
  color: #00ff00;
}

.blackjack-badge {
  background: #00aa00;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7em;
  font-weight: 600;
}

.split-hand {
  margin-bottom: 8px;
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 4px;
}

.split-hand:last-child {
  margin-bottom: 0;
}

.split-label {
  font-size: 0.75em;
  color: #888888;
  margin-bottom: 4px;
  font-weight: 500;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #333333;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: pointer;
  background: #252525;
  color: #e0e0e0;
}

.action-btn:hover {
  background: #333333;
}

.action-btn.hit {
  background: #3399ff;
  border-color: #3399ff;
  color: white;
}

.action-btn.hit:hover {
  background: #2288ee;
}

.action-btn.stand {
  background: #00aa00;
  border-color: #00aa00;
  color: white;
}

.action-btn.stand:hover {
  background: #00cc00;
}

.action-btn.double {
  background: #555555;
  border-color: #555555;
  color: white;
}

.action-btn.double:hover {
  background: #666666;
}

.action-btn.split {
  background: #555555;
  border-color: #555555;
  color: white;
}

.action-btn.split:hover {
  background: #666666;
}

/* Results */
.results-section {
  margin-top: 16px;
  padding: 12px;
  background: #252525;
  border: 1px solid #333333;
  border-radius: 4px;
}

.results-header {
  font-size: 0.9em;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333333;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #2a2a2a;
  font-size: 0.9em;
}

.result-item:last-child {
  border-bottom: none;
}

.result-player {
  color: #b0b0b0;
}

.result-outcome.win {
  color: #00ff00;
}

.result-outcome.lose {
  color: #ff4444;
}

.result-outcome.push {
  color: #888888;
}
</style>
