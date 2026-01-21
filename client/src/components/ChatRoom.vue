<template>
  <div class="chat-room" :class="`skin-${skin}`">
    <!-- Terminal header -->
    <div v-if="skin === 'terminal'" class="header">
      <span class="title">wanChat v1.0 - Terminal Chat</span>
      <div class="header-right">
        <span v-if="balances[username]" class="balance">${{ balances[username] }}</span>
        <button class="update-btn" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Updating...' : 'Update' }}
        </button>
        <span class="user-count">{{ users.length }} user{{ users.length !== 1 ? 's' : '' }} online</span>
      </div>
    </div>

    <!-- Spreadsheet header -->
    <div v-else-if="skin === 'spreadsheet'" class="header spreadsheet-header">
      <div class="spreadsheet-toolbar">
        <span class="spreadsheet-title">Q4 Budget Review.xlsx - Microsoft Excel</span>
        <div class="spreadsheet-menu">
          <span>File</span>
          <span>Home</span>
          <span>Insert</span>
          <span>Page Layout</span>
          <span>Formulas</span>
          <span>Data</span>
          <span>Review</span>
          <span>View</span>
        </div>
      </div>
      <div class="header-right">
        <span v-if="balances[username]" class="balance">${{ balances[username] }}</span>
        <button class="update-btn" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Sync' : 'Syncing...' }}
        </button>
      </div>
    </div>

    <!-- Email header -->
    <div v-else-if="skin === 'email'" class="header email-header">
      <div class="email-toolbar">
        <span class="email-logo">M</span>
        <span class="email-title">Outlook - Team Discussion</span>
        <input type="text" class="email-search" placeholder="Search mail..." readonly />
      </div>
      <div class="header-right">
        <span v-if="balances[username]" class="balance">${{ balances[username] }}</span>
        <button class="update-btn" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Syncing...' : 'Sync' }}
        </button>
      </div>
    </div>

    <!-- Notepad header -->
    <div v-else-if="skin === 'notepad'" class="header notepad-header">
      <span class="notepad-title">meeting_notes.txt - Notepad</span>
      <div class="notepad-menu">
        <span>File</span>
        <span>Edit</span>
        <span>Format</span>
        <span>View</span>
        <span>Help</span>
      </div>
      <div class="header-right">
        <button class="update-btn" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Game Panel (above chat) -->
    <div v-if="gameState.activeGame" class="game-panel">
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
      <FlashGame
        v-if="gameState.activeGame === 'flash'"
        :gameState="gameState.flash"
        :username="username"
        :streamFrame="flashStreamFrame"
        @quit="handleFlashQuit"
        @frame="handleFlashFrame"
      />
    </div>

    <div class="main-content">
      <MessageList :messages="messages" :skin="skin" />
      <div class="sidebar" :class="`sidebar-${skin}`">
        <div class="sidebar-header">
          <template v-if="skin === 'terminal'">Online Users</template>
          <template v-else-if="skin === 'spreadsheet'">Sheet1 | Sheet2 | Contributors</template>
          <template v-else-if="skin === 'email'">Folders</template>
          <template v-else-if="skin === 'notepad'">{{ users.length }} collaborators</template>
        </div>
        <ul class="user-list">
          <li v-for="user in users" :key="user" class="user-item">
            <template v-if="skin === 'terminal'">
              <span class="user-indicator">></span>
              <span :style="{ color: getUserColor(user) }">{{ user }}</span>
            </template>
            <template v-else-if="skin === 'spreadsheet'">
              <span class="spreadsheet-cell">{{ user }}</span>
            </template>
            <template v-else-if="skin === 'email'">
              <span class="email-folder-icon">📁</span>
              <span>{{ user }}</span>
            </template>
            <template v-else>
              <span>{{ user }}</span>
            </template>
            <span v-if="balances[user]" class="user-balance">${{ balances[user] }}</span>
          </li>
        </ul>
      </div>
    </div>
    <CommandInput :username="username" :skin="skin" @send="handleSend" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MessageList from './MessageList.vue'
import CommandInput from './CommandInput.vue'
import BlackjackTable from './games/BlackjackTable.vue'
import RaceTrack from './games/RaceTrack.vue'
import SnakeGame from './games/SnakeGame.vue'
import FlashGame from './games/FlashGame.vue'

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
  },
  flashStreamFrame: {
    type: String,
    default: null
  },
  skin: {
    type: String,
    default: 'terminal'
  }
})

const emit = defineEmits(['send', 'snake-input', 'snake-quit', 'flash-quit', 'flash-frame', 'change-skin', 'local-message'])
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

// Available skins
const SKINS = ['terminal', 'spreadsheet', 'email', 'notepad']

function handleSend(text) {
  // Handle /skin command client-side
  if (text.startsWith('/skin')) {
    const parts = text.split(' ')
    if (parts.length === 1) {
      // Show available skins
      emit('local-message', `Skins: ${SKINS.join(', ')} | Current: ${props.skin}`)
      return
    }
    const skinName = parts[1].toLowerCase()
    if (SKINS.includes(skinName)) {
      emit('change-skin', skinName)
      emit('local-message', `Switched to ${skinName} skin`)
      return
    } else {
      emit('local-message', `Unknown skin: ${skinName}. Available: ${SKINS.join(', ')}`)
      return
    }
  }
  emit('send', text)
}

function handleSnakeInput(direction) {
  emit('snake-input', direction)
}

function handleSnakeQuit() {
  emit('snake-quit')
}

function handleFlashQuit() {
  emit('flash-quit')
}

function handleFlashFrame(frameData) {
  emit('flash-frame', frameData)
}

async function handleUpdate() {
  updating.value = true
  try {
    await fetch('/update')
  } catch (e) {
    // Server will restart, connection will be lost temporarily
  }
  // Wait for server to come back up, then hard refresh to get new client code
  await waitForServer()
  // Force hard refresh with cache bust to load any client changes
  const url = new URL(window.location.href)
  url.searchParams.set('_t', Date.now())
  if (window.parent !== window) {
    window.parent.postMessage('refresh', '*')
  }
  window.location.href = url.toString()
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

.game-panel {
  border-bottom: 1px solid var(--border-color);
  padding: 15px;
  background: var(--header-bg);
  display: flex;
  justify-content: center;
  max-height: 50vh;
  overflow-y: auto;
}

/* Spreadsheet skin styles */
.spreadsheet-header {
  flex-direction: column;
  align-items: stretch;
  padding: 0;
}

.spreadsheet-toolbar {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border-color);
}

.spreadsheet-title {
  padding: 4px 10px;
  font-size: 0.85em;
  color: var(--header-text);
  background: #217346;
  color: white;
}

.spreadsheet-menu {
  display: flex;
  gap: 0;
  padding: 2px 10px;
  background: var(--header-bg);
}

.spreadsheet-menu span {
  padding: 6px 12px;
  font-size: 0.85em;
  color: var(--text-color);
  cursor: pointer;
}

.spreadsheet-menu span:hover {
  background: var(--border-color);
}

.skin-spreadsheet .sidebar-header {
  background: #f3f3f3;
  border-bottom: 2px solid #217346;
  font-size: 0.8em;
}

.spreadsheet-cell {
  font-family: 'Calibri', sans-serif;
}

/* Email skin styles */
.email-header {
  background: #0078d4;
  padding: 8px 15px;
}

.email-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.email-logo {
  font-size: 1.5em;
  font-weight: bold;
  color: white;
  background: #0063b1;
  padding: 4px 10px;
  border-radius: 2px;
}

.email-title {
  color: white;
  font-weight: 500;
}

.email-search {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 6px 12px;
  border-radius: 2px;
  color: white;
  width: 200px;
}

.email-search::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.skin-email .header-right {
  color: white;
}

.skin-email .update-btn {
  border-color: white;
  color: white;
}

.skin-email .sidebar-header {
  font-weight: 600;
  color: var(--text-color);
}

.email-folder-icon {
  margin-right: 6px;
}

/* Notepad skin styles */
.notepad-header {
  flex-wrap: wrap;
  padding: 0;
  background: #f0f0f0;
}

.notepad-title {
  padding: 4px 10px;
  font-size: 0.9em;
  background: #0078d4;
  color: white;
  width: 100%;
}

.notepad-menu {
  display: flex;
  padding: 2px 0;
  width: 100%;
  border-bottom: 1px solid var(--border-color);
}

.notepad-menu span {
  padding: 4px 10px;
  font-size: 0.85em;
  cursor: pointer;
}

.notepad-menu span:hover {
  background: #e5e5e5;
}

.skin-notepad .header-right {
  padding: 4px 10px;
}

.skin-notepad .sidebar {
  border-left: 1px solid #d1d1d1;
  background: #f9f9f9;
}
</style>
