<template>
  <!-- Terminal skin (default) -->
  <div v-if="skin === 'terminal'" class="message-list" ref="messageContainer">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      :class="['message', msg.type]"
    >
      <span class="timestamp">[{{ msg.time }}]</span>
      <template v-if="msg.type === 'system'">
        <span class="system-text">* {{ msg.text }}</span>
      </template>
      <template v-else-if="msg.type === 'action'">
        <span class="action-text">* {{ msg.text }}</span>
      </template>
      <template v-else>
        <span class="username" :style="{ color: getUserColor(msg.user) }">{{ msg.user }}&gt;</span>
        <span class="text">{{ msg.text }}</span>
      </template>
    </div>
    <div v-if="messages.length === 0" class="empty-state">
      <span class="dim">Waiting for messages...</span>
    </div>
  </div>

  <!-- Spreadsheet skin -->
  <div v-else-if="skin === 'spreadsheet'" class="message-list spreadsheet-view" ref="messageContainer">
    <div class="spreadsheet-header-row">
      <span class="cell cell-header cell-row-num"></span>
      <span class="cell cell-header cell-time">A</span>
      <span class="cell cell-header cell-user">B</span>
      <span class="cell cell-header cell-text">C</span>
    </div>
    <div
      v-for="(msg, index) in messages"
      :key="index"
      class="spreadsheet-row"
      :class="{ 'alt-row': index % 2 === 1 }"
    >
      <span class="cell cell-row-num">{{ index + 1 }}</span>
      <span class="cell cell-time">{{ msg.time }}</span>
      <span class="cell cell-user">{{ msg.type === 'chat' ? msg.user : 'System' }}</span>
      <span class="cell cell-text">{{ msg.type === 'chat' ? msg.text : msg.text }}</span>
    </div>
    <div v-if="messages.length === 0" class="empty-state spreadsheet-empty">
      <span>No data</span>
    </div>
  </div>

  <!-- Email skin -->
  <div v-else-if="skin === 'email'" class="message-list email-view" ref="messageContainer">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      class="email-item"
      :class="{ 'email-unread': index === messages.length - 1, 'email-system': msg.type !== 'chat' }"
    >
      <div class="email-left">
        <span class="email-avatar" :style="{ background: msg.type === 'chat' ? getUserColor(msg.user) : '#6b6b6b' }">
          {{ (msg.type === 'chat' ? msg.user : 'S')[0].toUpperCase() }}
        </span>
      </div>
      <div class="email-content">
        <div class="email-header-row">
          <span class="email-from">{{ msg.type === 'chat' ? msg.user : 'System' }}</span>
          <span class="email-date">{{ msg.time }}</span>
        </div>
        <div class="email-subject">{{ msg.type === 'chat' ? 'Re: Team Discussion' : 'Notification' }}</div>
        <div class="email-snippet">{{ msg.text }}</div>
      </div>
    </div>
    <div v-if="messages.length === 0" class="empty-state email-empty">
      <span>No messages in this folder</span>
    </div>
  </div>

  <!-- Notepad skin -->
  <div v-else-if="skin === 'notepad'" class="message-list notepad-view" ref="messageContainer">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      class="notepad-line"
    >
      <span class="notepad-content">
        <template v-if="msg.type === 'chat'">[{{ msg.time }}] {{ msg.user }}: {{ msg.text }}</template>
        <template v-else>--- {{ msg.text }} ---</template>
      </span>
    </div>
    <div v-if="messages.length === 0" class="empty-state notepad-empty">
      <span>Start typing...</span>
    </div>
  </div>

  <!-- Fallback to terminal -->
  <div v-else class="message-list" ref="messageContainer">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      :class="['message', msg.type]"
    >
      <span class="timestamp">[{{ msg.time }}]</span>
      <span class="text">{{ msg.text }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  skin: {
    type: String,
    default: 'terminal'
  }
})

const messageContainer = ref(null)

// Generate consistent color from username
function getUserColor(username) {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 60%)`
}

watch(() => props.messages.length, async () => {
  await nextTick()
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
})
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 15px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message {
  display: flex;
  gap: 8px;
  word-break: break-word;
}

.timestamp {
  color: var(--dim-color);
  flex-shrink: 0;
}

.message.system .system-text {
  color: var(--system-color);
  font-style: italic;
}

.message.action .action-text {
  color: var(--primary-color);
  font-style: italic;
}

.message.chat .username {
  color: var(--primary-color);
  flex-shrink: 0;
}

.message.chat .text {
  color: var(--text-color);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.dim {
  color: var(--dim-color);
}

/* Spreadsheet skin styles */
.spreadsheet-view {
  padding: 0;
  gap: 0;
  font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
}

.spreadsheet-header-row,
.spreadsheet-row {
  display: flex;
  border-bottom: 1px solid #d4d4d4;
}

.spreadsheet-header-row {
  background: #f3f3f3;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.cell {
  padding: 4px 8px;
  border-right: 1px solid #d4d4d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-row-num {
  width: 40px;
  background: #f3f3f3;
  color: #666;
  text-align: center;
  flex-shrink: 0;
}

.cell-time {
  width: 80px;
  flex-shrink: 0;
}

.cell-user {
  width: 100px;
  flex-shrink: 0;
  font-weight: 500;
}

.cell-text {
  flex: 1;
  min-width: 0;
}

.cell-header {
  text-align: center;
  color: #1f1f1f;
}

.alt-row {
  background: #f8f9fa;
}

.spreadsheet-empty {
  color: #666;
  font-style: italic;
}

/* Email skin styles */
.email-view {
  padding: 0;
  gap: 0;
  background: #ffffff;
}

.email-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #dadce0;
  cursor: pointer;
  gap: 12px;
}

.email-item:hover {
  background: #f2f6fc;
}

.email-unread {
  background: #e8f0fe;
}

.email-unread:hover {
  background: #d3e3fd;
}

.email-system {
  opacity: 0.8;
}

.email-left {
  flex-shrink: 0;
}

.email-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 14px;
}

.email-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.email-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.email-from {
  font-weight: 500;
  color: #202124;
  font-size: 14px;
}

.email-date {
  font-size: 12px;
  color: #5f6368;
}

.email-subject {
  font-size: 13px;
  color: #202124;
  font-weight: 500;
}

.email-snippet {
  font-size: 13px;
  color: #5f6368;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-empty {
  color: #5f6368;
}

/* Notepad skin styles */
.notepad-view {
  padding: 10px;
  gap: 0;
  background: #ffffff;
  font-family: 'Consolas', 'Courier New', monospace;
}

.notepad-line {
  line-height: 1.5;
}

.notepad-content {
  color: #000000;
}

.notepad-empty {
  color: #666;
}
</style>
