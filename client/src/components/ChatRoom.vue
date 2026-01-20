<template>
  <div class="chat-room">
    <div class="header">
      <span class="title">wanChat v1.0 - Terminal Chat</span>
      <div class="header-right">
        <button class="update-btn" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Updating...' : 'Update' }}
        </button>
        <span class="users">{{ users.length }} user{{ users.length !== 1 ? 's' : '' }} online</span>
      </div>
    </div>
    <MessageList :messages="messages" />
    <CommandInput :username="username" @send="handleSend" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MessageList from './MessageList.vue'
import CommandInput from './CommandInput.vue'

defineProps({
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
  }
})

const emit = defineEmits(['send'])
const updating = ref(false)

function handleSend(text) {
  emit('send', text)
}

async function handleUpdate() {
  updating.value = true
  try {
    await fetch('/update')
  } catch (e) {
    // Server will restart, connection will be lost temporarily
  }
  updating.value = false
}
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.users {
  color: var(--dim-color);
  font-size: 0.9em;
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
</style>
