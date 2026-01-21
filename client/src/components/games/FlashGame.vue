<template>
  <div class="flash-game">
    <div class="game-header">
      <span class="game-title">{{ gameState.gameName || 'Flash Game' }}</span>
      <div class="game-controls">
        <span class="host-info">Host: {{ gameState.host }}</span>
        <button v-if="isHost" @click="handleQuit" class="quit-btn">Close (Q)</button>
      </div>
    </div>

    <div class="game-container">
      <!-- Host sees the actual Ruffle player -->
      <div v-if="isHost" ref="playerContainer" class="player-container"></div>

      <!-- Spectators see streamed frames -->
      <div v-else class="spectator-view">
        <img
          v-if="currentFrame"
          :src="currentFrame"
          class="stream-frame"
          alt="Game stream"
        />
        <div v-else class="loading-stream">
          <span>Connecting to stream...</span>
        </div>
        <div class="spectator-notice">
          Watching {{ gameState.host }}'s game
        </div>
      </div>
    </div>

    <div class="controls-info">
      <p v-if="isHost">You are playing. Press Q or click Close to end.</p>
      <p v-else>Watching {{ gameState.host }} play...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  gameState: {
    type: Object,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  streamFrame: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['quit', 'frame'])

const playerContainer = ref(null)
const currentFrame = ref(null)
let rufflePlayer = null
let captureInterval = null

const isHost = computed(() => props.username === props.gameState.host)

// Watch for incoming frames (spectators)
watch(() => props.streamFrame, (newFrame) => {
  if (!isHost.value && newFrame) {
    currentFrame.value = newFrame
  }
})

onMounted(async () => {
  if (isHost.value) {
    // Host: Load and run Ruffle, capture frames
    await loadRuffle()
    if (playerContainer.value && props.gameState.gameFile) {
      createPlayer()
    }
  }

  // Add keyboard listener for host
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  stopCapture()
  if (rufflePlayer) {
    rufflePlayer.remove()
    rufflePlayer = null
  }
})

watch(() => props.gameState.gameFile, (newFile) => {
  if (isHost.value && newFile && playerContainer.value) {
    createPlayer()
  }
})

async function loadRuffle() {
  if (window.RufflePlayer) return

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@ruffle-rs/ruffle'
    script.onload = () => {
      // Wait for Ruffle to initialize
      setTimeout(resolve, 100)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function createPlayer() {
  if (rufflePlayer) {
    rufflePlayer.remove()
  }

  const ruffle = window.RufflePlayer.newest()
  rufflePlayer = ruffle.createPlayer()
  rufflePlayer.style.width = '100%'
  rufflePlayer.style.height = '400px'

  playerContainer.value.innerHTML = ''
  playerContainer.value.appendChild(rufflePlayer)

  // Load the SWF
  rufflePlayer.load(`/flash/${props.gameState.gameFile}`)

  // Start capturing frames after the game loads
  // Ruffle needs time to initialize the canvas
  setTimeout(() => {
    startCapture()
  }, 2000)
}

let lastCaptureTime = 0
let captureRunning = false

function startCapture() {
  if (captureRunning) return
  captureRunning = true
  requestAnimationFrame(captureLoop)
}

function captureLoop(timestamp) {
  if (!captureRunning) return

  // Capture at ~8 fps (every 125ms)
  if (timestamp - lastCaptureTime >= 125) {
    captureFrame()
    lastCaptureTime = timestamp
  }

  requestAnimationFrame(captureLoop)
}

function stopCapture() {
  captureRunning = false
  if (captureInterval) {
    clearInterval(captureInterval)
    captureInterval = null
  }
}

// Offscreen canvas for capturing WebGL content
let captureCanvas = null
let captureCtx = null

function captureFrame() {
  if (!rufflePlayer) return

  try {
    // Ruffle uses shadow DOM, so we need to access the shadow root
    let canvas = null

    // Try shadow root first (Ruffle's structure)
    if (rufflePlayer.shadowRoot) {
      canvas = rufflePlayer.shadowRoot.querySelector('canvas')
    }

    // Fallback to direct query
    if (!canvas) {
      canvas = rufflePlayer.querySelector('canvas')
    }

    if (!canvas) {
      console.warn('Canvas not found in Ruffle player')
      return
    }

    // For WebGL canvases, we need to copy to a 2D canvas first
    // because WebGL doesn't preserve the drawing buffer by default
    if (!captureCanvas) {
      captureCanvas = document.createElement('canvas')
      captureCtx = captureCanvas.getContext('2d')
    }

    // Match dimensions
    if (captureCanvas.width !== canvas.width || captureCanvas.height !== canvas.height) {
      captureCanvas.width = canvas.width
      captureCanvas.height = canvas.height
    }

    // Draw the WebGL canvas onto our 2D canvas
    captureCtx.drawImage(canvas, 0, 0)

    // Convert to data URL with reduced quality for bandwidth
    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.6)
    emit('frame', dataUrl)
  } catch (e) {
    // Canvas might not be ready or cross-origin issues
    console.warn('Frame capture failed:', e)
  }
}

function handleKeydown(e) {
  if (!isHost.value) return

  if (e.key.toLowerCase() === 'q') {
    handleQuit()
  }
}

function handleQuit() {
  stopCapture()
  emit('quit')
}
</script>

<style scoped>
.flash-game {
  width: 100%;
  max-width: 800px;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 16px;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333333;
}

.game-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #e0e0e0;
}

.game-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.host-info {
  color: #888888;
  font-size: 0.9em;
}

.game-container {
  position: relative;
  background: #000;
  border: 1px solid #333333;
  border-radius: 4px;
  overflow: hidden;
  min-height: 400px;
}

.player-container {
  width: 100%;
  height: 400px;
}

.spectator-view {
  width: 100%;
  height: 400px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-frame {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.loading-stream {
  color: #888888;
  font-size: 0.9em;
}

.spectator-notice {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #888888;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
}

.controls-info {
  margin-top: 12px;
  text-align: center;
  color: #888888;
  font-size: 0.9em;
}

.controls-info p {
  margin: 4px 0;
}

.quit-btn {
  background: #555555;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9em;
}

.quit-btn:hover {
  background: #666666;
}
</style>
