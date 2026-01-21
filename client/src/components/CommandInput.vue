<template>
  <!-- Terminal input -->
  <div v-if="skin === 'terminal'" class="command-input">
    <span class="prompt">{{ username }}&gt;</span>
    <input
      ref="inputEl"
      v-model="message"
      type="text"
      class="input"
      @keyup.enter="handleSend"
      placeholder="Type a message..."
    />
  </div>

  <!-- Spreadsheet input (formula bar style) -->
  <div v-else-if="skin === 'spreadsheet'" class="command-input spreadsheet-input">
    <span class="formula-label">fx</span>
    <input
      ref="inputEl"
      v-model="message"
      type="text"
      class="input"
      @keyup.enter="handleSend"
      placeholder="Enter value or formula..."
    />
  </div>

  <!-- Email input (compose style) -->
  <div v-else-if="skin === 'email'" class="command-input email-input">
    <input
      ref="inputEl"
      v-model="message"
      type="text"
      class="input"
      @keyup.enter="handleSend"
      placeholder="Reply to all..."
    />
    <button class="send-btn" @click="handleSend">Send</button>
  </div>

  <!-- Notepad input -->
  <div v-else-if="skin === 'notepad'" class="command-input notepad-input">
    <input
      ref="inputEl"
      v-model="message"
      type="text"
      class="input"
      @keyup.enter="handleSend"
      placeholder="Type here..."
    />
  </div>

  <!-- Fallback -->
  <div v-else class="command-input">
    <span class="prompt">{{ username }}&gt;</span>
    <input
      ref="inputEl"
      v-model="message"
      type="text"
      class="input"
      @keyup.enter="handleSend"
      placeholder="Type a message..."
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineProps({
  username: {
    type: String,
    required: true
  },
  skin: {
    type: String,
    default: 'terminal'
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
  caret-color: var(--primary-color);
}

.input::placeholder {
  color: var(--dim-color);
}

/* Spreadsheet input styles */
.spreadsheet-input {
  background: #ffffff;
  border-top: 1px solid #d4d4d4;
  padding: 4px 8px;
}

.formula-label {
  color: #217346;
  font-style: italic;
  padding: 4px 8px;
  background: #f3f3f3;
  border: 1px solid #d4d4d4;
  border-right: none;
  font-size: 12px;
}

.spreadsheet-input .input {
  border: 1px solid #d4d4d4;
  padding: 4px 8px;
  font-family: 'Calibri', sans-serif;
}

/* Email input styles */
.email-input {
  background: #ffffff;
  border-top: 1px solid #dadce0;
  padding: 12px 16px;
  gap: 12px;
}

.email-input .input {
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 10px 14px;
  font-family: 'Google Sans', 'Roboto', sans-serif;
}

.email-input .input:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.send-btn {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Google Sans', 'Roboto', sans-serif;
}

.send-btn:hover {
  background: #1557b0;
}

/* Notepad input styles */
.notepad-input {
  background: #ffffff;
  border-top: 1px solid #d1d1d1;
  padding: 8px 10px;
}

.notepad-input .input {
  font-family: 'Consolas', 'Courier New', monospace;
}
</style>
