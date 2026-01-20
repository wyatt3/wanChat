<template>
  <div class="terminal-window">
    <LoginScreen v-if="!joined" @join="handleJoin" />
    <ChatRoom
      v-else
      :messages="messages"
      :users="users"
      :username="username"
      @send="handleSend"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import LoginScreen from './components/LoginScreen.vue'
import ChatRoom from './components/ChatRoom.vue'

const socket = ref(null)
const joined = ref(false)
const username = ref('')
const messages = ref([])
const users = ref([])

onMounted(() => {
  // Check for saved username
  const savedUsername = localStorage.getItem('wanchat_username')
  if (savedUsername) {
    username.value = savedUsername
    joined.value = true
  }

  // Connect to socket server
  socket.value = io({
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionAttempts: Infinity
  })

  // Auto-rejoin on reconnect (or initial connect with saved username)
  socket.value.on('connect', () => {
    if (joined.value && username.value) {
      socket.value.emit('join', username.value)
    }
  })

  // Handle incoming chat messages
  socket.value.on('chat', (data) => {
    messages.value.push({
      type: 'chat',
      user: data.user,
      text: data.text,
      time: data.time
    })
  })

  // Handle system messages
  socket.value.on('system', (data) => {
    messages.value.push({
      type: 'system',
      text: data.text,
      time: data.time
    })
  })

  // Handle action messages
  socket.value.on('action', (data) => {
    messages.value.push({
      type: 'action',
      text: data.text,
      time: data.time
    })
  })

  // Handle user list updates
  socket.value.on('users', (userList) => {
    users.value = userList
  })
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})

function handleJoin(name) {
  username.value = name
  localStorage.setItem('wanchat_username', name)
  socket.value.emit('join', name)
  joined.value = true
}

function handleSend(text) {
  socket.value.emit('message', text)
}
</script>
