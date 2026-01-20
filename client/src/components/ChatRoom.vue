<template>
  <div class="chat-room">
    <div class="header">
      <span class="title">wanChat v1.0 - Terminal Chat</span>
      <div class="header-right">
        <span v-if="balances[username]" class="balance">${{ balances[username] }}</span>
        <button class="update-btn" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Updating...' : 'Update' }}
        </button>
        <span class="user-count">{{ users.length }} user{{ users.length !== 1 ? 's' : '' }} online</span>
      </div>
    </div>
    <div class="main-content">
      <MessageList :messages="messages" />
      <div class="sidebar">
        <div class="sidebar-header">Online Users</div>
        <ul class="user-list">
          <li v-for="user in users" :key="user" class="user-item">
            <span class="user-indicator">></span>
            <span :style="{ color: getUserColor(user) }">{{ user }}</span>
            <span v-if="balances[user]" class="user-balance">${{ balances[user] }}</span>
          </li>
        </ul>
      </div>
    </div>
    <CommandInput :username="username" @send="handleSend" />

    <!-- Game Overlays -->
    <div v-if="gameState.activeGame" class="game-overlay">
      <BlackjackTable
        v-if="gameState.activeGame === 'blackjack'"
        :gameState="gameState.blackjack"
        :username="username"
        @send="handleSend"
      />
      <RaceTrack
        v-if="gameState.activeGame === 'race'"
        :gameState="gameState.race"
        :username="username"
        @send="handleSend"
      />
      <SnakeGame
        v-if="gameState.activeGame === 'snake'"
        :gameState="gameState.snake"
        :username="username"
        @input="handleSnakeInput"
        @quit="handleSnakeQuit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MessageList from './MessageList.vue'
import CommandInput from './CommandInput.vue'
import BlackjackTable from './games/BlackjackTable.vue'
import RaceTrack from './games/RaceTrack.vue'
import SnakeGame from './games/SnakeGame.vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  users: {
    type: Array,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  balances: {
    type: Object,
    default: () => ({})
  },
  gameState: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['send', 'snake-input', 'snake-quit'])
const updating = ref(false)

// Generate consistent color from username
function getUserColor(username) {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 60%)`
}

function handleSend(text) {
  emit('send', text)
}

function handleSnakeInput(direction) {
  emit('snake-input', direction)
}

function handleSnakeQuit() {
  emit('snake-quit')
}

async function handleUpdate() {
  updating.value = true
  try {
    await fetch('/update')
  } catch (e) {
    // Server will restart, connection will be lost temporarily
  }
  // Wait for server to come back up, then refresh iframe
  await waitForServer()
  if (window.parent !== window) {
    window.parent.postMessage('refresh', '*')
  } else {
    window.location.reload()
  }
}

async function waitForServer() {
  while (true) {
    try {
      const res = await fetch('/app', { method: 'HEAD' })
      if (res.ok) return
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 500))
  }
}
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);
}

.title {
  color: var(--primary-color);
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.balance {
  color: #4ade80;
  font-weight: bold;
}

.user-count {
  color: var(--dim-color);
  font-size: 0.9em;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 180px;
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 10px;
  color: var(--primary-color);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9em;
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.user-item {
  padding: 6px 10px;
  color: var(--text-color);
  font-size: 0.9em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-indicator {
  color: var(--primary-color);
  margin-right: 5px;
}

.user-balance {
  color: #4ade80;
  font-size: 0.8em;
}

.update-btn {
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 4px 12px;
  font-family: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

.update-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: var(--bg-color);
}

.update-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game-overlay {
  position: absolute;
  top: 50px;
  left: 0;
  right: 180px;
  bottom: 50px;
  background: rgba(0, 0, 0, 0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
</style>
