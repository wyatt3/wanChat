<template>
  <div class="command-input">
    <span class="prompt">{{ username }}&gt;</span>
    <input
      ref="inputEl"
      v-model="message"
      type="text"
      class="input"
      @keyup.enter="handleSend"
      placeholder="Type a message..."
    />
    <span class="cursor">_</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineProps({
  username: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['send'])

const message = ref('')
const inputEl = ref(null)

onMounted(() => {
  inputEl.value?.focus()
})

function handleSend() {
  if (message.value.trim()) {
    emit('send', message.value)
    message.value = ''
  }
}
</script>

<style scoped>
.command-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-top: 1px solid var(--border-color);
  background: var(--input-bg);
}

.prompt {
  color: var(--primary-color);
  flex-shrink: 0;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-color);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  caret-color: transparent;
}

.input::placeholder {
  color: var(--dim-color);
}

.cursor {
  color: var(--primary-color);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
