<template>
  <div class="message-list" ref="messageContainer">
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
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true
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
</style>
