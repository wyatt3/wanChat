<template>
  <div class="login-screen">
    <div class="login-header">
      <pre class="ascii-art">
                     _____ _           _
__      ____ _ _ __ / ____| |__   __ _| |_
\ \ /\ / / _` | '_ \| |   | '_ \ / _` | __|
 \ V  V / (_| | | | | |___| | | | (_| | |_
  \_/\_/ \__,_|_| |_|\____|_| |_|\__,_|\__|
      </pre>
      <p class="version">v1.0 - Terminal Chat</p>
    </div>
    <div class="login-prompt">
      <span class="prompt-text">Enter your username:</span>
      <div class="input-line">
        <span class="prompt">&gt;</span>
        <input
          ref="usernameInput"
          v-model="username"
          type="text"
          class="terminal-input"
          @keyup.enter="handleJoin"
          maxlength="20"
          autofocus
        />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['join'])

const username = ref('')
const error = ref('')
const usernameInput = ref(null)

onMounted(() => {
  usernameInput.value?.focus()
})

function handleJoin() {
  const trimmed = username.value.trim()
  if (!trimmed) {
    error.value = 'Username cannot be empty'
    return
  }
  if (trimmed.length < 2) {
    error.value = 'Username must be at least 2 characters'
    return
  }
  error.value = ''
  emit('join', trimmed)
}
</script>

<style scoped>
.login-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.ascii-art {
  color: var(--primary-color);
  font-size: 12px;
  line-height: 1.2;
  margin: 0;
}

.version {
  color: var(--dim-color);
  margin-top: 10px;
}

.login-prompt {
  width: 100%;
  max-width: 400px;
}

.prompt-text {
  color: var(--text-color);
  display: block;
  margin-bottom: 10px;
}

.input-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt {
  color: var(--primary-color);
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-color);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  caret-color: var(--primary-color);
}

.error {
  color: var(--error-color);
  margin-top: 10px;
}
</style>
