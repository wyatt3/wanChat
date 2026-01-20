<template>
  <div class="blackjack-table">
    <div class="table-header">
      <span class="game-title">BLACKJACK</span>
      <span class="phase-indicator">{{ phaseText }}</span>
    </div>

    <!-- Betting Phase -->
    <div v-if="gameState.phase === 'betting'" class="betting-phase">
      <p>{{ gameState.host }} is starting a game of Blackjack!</p>
      <p>Type <code>/bet [amount]</code> to join or <code>/fold</code> to pass</p>
      <div class="bet-actions">
        <button @click="quickBet(5)" class="bet-btn">Bet $5</button>
        <button @click="quickBet(10)" class="bet-btn">Bet $10</button>
        <button @click="quickBet(25)" class="bet-btn">Bet $25</button>
        <button @click="fold" class="fold-btn">Fold</button>
      </div>
    </div>

    <!-- Playing Phase -->
    <div v-if="gameState.phase === 'playing' || gameState.phase === 'result'" class="playing-phase">
      <!-- Dealer Section -->
      <div class="dealer-section">
        <div class="section-label">DEALER</div>
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
          HIT
        </button>
        <button
          v-if="gameState.options.includes('stand')"
          @click="action('stand')"
          class="action-btn stand"
        >
          STAND
        </button>
        <button
          v-if="gameState.options.includes('double')"
          @click="action('double')"
          class="action-btn double"
        >
          DOUBLE
        </button>
        <button
          v-if="gameState.options.includes('split')"
          @click="action('split')"
          class="action-btn split"
        >
          SPLIT
        </button>
      </div>
    </div>

    <!-- Results Phase -->
    <div v-if="gameState.phase === 'result' && gameState.results" class="results-section">
      <div class="results-header">RESULTS</div>
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
import { computed } from 'vue'

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

const phaseText = computed(() => {
  switch (props.gameState.phase) {
    case 'betting':
      return 'Place your bets!'
    case 'playing':
      return props.gameState.currentTurn ? `${props.gameState.currentTurn}'s turn` : 'Playing...'
    case 'result':
      return 'Game Over'
    default:
      return ''
  }
})

function quickBet(amount) {
  emit('send', `/bet ${amount}`)
}

function fold() {
  emit('send', '/fold')
}

function action(act) {
  emit('send', `/${act}`)
}

function formatResult(result) {
  switch (result.result) {
    case 'blackjack':
      return `BLACKJACK! +$${result.payout - result.wager}`
    case 'win':
      return `Won +$${result.payout - result.wager}`
    case 'push':
      return 'Push (tie)'
    case 'lose':
      return `Lost -$${result.wager}`
    default:
      return result.result
  }
}
</script>

<style scoped>
.blackjack-table {
  width: 100%;
  max-width: 700px;
  background: linear-gradient(135deg, #1a472a 0%, #2d5a3f 100%);
  border-radius: 20px;
  padding: 20px;
  color: white;
  font-family: inherit;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.table-header {
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

/* Betting Phase */
.betting-phase {
  text-align: center;
  padding: 20px;
}

.betting-phase p {
  margin: 10px 0;
}

.betting-phase code {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  color: #4ade80;
}

.bet-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

.bet-btn {
  background: #4ade80;
  color: #1a1a1a;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}

.bet-btn:hover {
  background: #22c55e;
  transform: scale(1.05);
}

.fold-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.fold-btn:hover {
  background: #dc2626;
}

/* Playing Phase */
.playing-phase {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dealer-section,
.players-section {
  padding: 15px;
}

.section-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9em;
  margin-bottom: 10px;
}

.cards-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card {
  width: 50px;
  height: 70px;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  font-weight: bold;
  color: #1a1a1a;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
}

.card.red {
  color: #dc2626;
}

.card.back {
  background: linear-gradient(45deg, #1e3a5f 25%, #2a4a6f 25%, #2a4a6f 50%, #1e3a5f 50%, #1e3a5f 75%, #2a4a6f 75%);
  background-size: 10px 10px;
  color: transparent;
}

.hand-value {
  margin-top: 8px;
  font-size: 1.1em;
  color: #ffd700;
}

/* Players */
.players-section {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.player-hand {
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 10px;
  min-width: 150px;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}

.player-hand.current-turn {
  border-color: #ffd700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
}

.player-hand.is-you {
  background: rgba(74, 222, 128, 0.15);
}

.player-name {
  font-weight: bold;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.you-label {
  color: #4ade80;
  font-size: 0.8em;
}

.turn-indicator {
  color: #ffd700;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hand-info {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}

.wager {
  color: #4ade80;
  font-size: 0.9em;
}

.blackjack-badge {
  background: #ffd700;
  color: #1a1a1a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: bold;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1em;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}

.action-btn:hover {
  transform: scale(1.05);
}

.action-btn.hit {
  background: #3b82f6;
  color: white;
}

.action-btn.stand {
  background: #f59e0b;
  color: white;
}

.action-btn.double {
  background: #8b5cf6;
  color: white;
}

.action-btn.split {
  background: #ec4899;
  color: white;
}

/* Results */
.results-section {
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.results-header {
  text-align: center;
  font-size: 1.2em;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 15px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-item:last-child {
  border-bottom: none;
}

.result-outcome.win {
  color: #4ade80;
}

.result-outcome.lose {
  color: #ef4444;
}

.result-outcome.push {
  color: #f59e0b;
}
</style>
