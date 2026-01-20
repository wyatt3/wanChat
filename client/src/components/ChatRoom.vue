<template>
  <div class="chat-room">
    <div class="header">
      <span class="title">wanChat v1.0 - Terminal Chat</span>
      <span class="users">{{ users.length }} user{{ users.length !== 1 ? 's' : '' }} online</span>
    </div>
    <MessageList :messages="messages" />
    <CommandInput :username="username" @send="handleSend" />
  </div>
</template>

<script setup>
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

function handleSend(text) {
  emit('send', text)
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

.users {
  color: var(--dim-color);
  font-size: 0.9em;
}
</style>
