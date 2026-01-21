<template>
  <div class="snake-game">
    <div class="game-header">
      <span class="game-title">Data Visualization</span>
      <div class="game-stats">
        <span class="score">Points: {{ gameState.score }}</span>
        <span class="multiplier">Rate: {{ gameState.foodValue }}x</span>
      </div>
    </div>

    <div class="game-container">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="game-canvas"
      ></canvas>

      <div v-if="!isHost" class="spectator-overlay">
        <p>{{ gameState.host }} - Active Session</p>
        <p class="spectator-note">View Only</p>
      </div>
    </div>

    <div class="controls-info">
      <template v-if="isHost">
        <p>Navigate: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrow Keys</p>
        <button @click="handleQuit" class="quit-btn">Close (Q)</button>
      </template>
      <template v-else>
        <p>Viewing {{ gameState.host }}'s session...</p>
      </template>
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
  }
})

const emit = defineEmits(['input', 'quit'])

const canvasRef = ref(null)
const cellSize = 15

const canvasWidth = computed(() => props.gameState.width * cellSize)
const canvasHeight = computed(() => props.gameState.height * cellSize)

const isHost = computed(() => props.username === props.gameState.host)

let ctx = null

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    ctx = canvas.getContext('2d')
    draw()
  }

  // Add keyboard listener
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Watch for game state changes and redraw
watch(
  () => [props.gameState.body, props.gameState.food],
  () => {
    draw()
  },
  { deep: true }
)

function draw() {
  if (!ctx) return

  const width = canvasWidth.value
  const height = canvasHeight.value

  // Clear canvas - dark background
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  // Draw grid - subtle dark lines
  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 1
  for (let x = 0; x <= props.gameState.width; x++) {
    ctx.beginPath()
    ctx.moveTo(x * cellSize, 0)
    ctx.lineTo(x * cellSize, height)
    ctx.stroke()
  }
  for (let y = 0; y <= props.gameState.height; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * cellSize)
    ctx.lineTo(width, y * cellSize)
    ctx.stroke()
  }

  // Draw food - looks like a data point
  if (props.gameState.food) {
    const fx = props.gameState.food.x * cellSize
    const fy = props.gameState.food.y * cellSize

    // Draw as a simple square marker
    ctx.fillStyle = '#ff4444'
    ctx.fillRect(fx + 3, fy + 3, cellSize - 6, cellSize - 6)
  }

  // Draw snake - looks like a chart line/bars
  if (props.gameState.body && props.gameState.body.length > 0) {
    props.gameState.body.forEach((segment, index) => {
      const sx = segment.x * cellSize
      const sy = segment.y * cellSize

      if (index === 0) {
        // Head - bright green
        ctx.fillStyle = '#00ff00'
      } else {
        // Body - gradient green
        const brightness = Math.max(0.4, 1 - index * 0.02)
        ctx.fillStyle = `rgba(0, 255, 0, ${brightness})`
      }

      // Draw simple rectangle
      const padding = 2
      ctx.fillRect(
        sx + padding,
        sy + padding,
        cellSize - padding * 2,
        cellSize - padding * 2
      )
    })
  }
}

function handleKeydown(e) {
  if (!isHost.value) return

  let direction = null

  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      direction = 'up'
      break
    case 's':
    case 'arrowdown':
      direction = 'down'
      break
    case 'a':
    case 'arrowleft':
      direction = 'left'
      break
    case 'd':
    case 'arrowright':
      direction = 'right'
      break
    case 'q':
    case 'escape':
      handleQuit()
      return
  }

  if (direction) {
    e.preventDefault()
    emit('input', direction)
  }
}

function handleQuit() {
  emit('quit')
}
</script>

<style scoped>
.snake-game {
  width: 100%;
  max-width: 500px;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 16px;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
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

.game-stats {
  display: flex;
  gap: 16px;
  font-size: 0.9em;
}

.score {
  color: #b0b0b0;
}

.multiplier {
  color: #888888;
}

.game-container {
  position: relative;
  display: flex;
  justify-content: center;
  background: #252525;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 8px;
}

.game-canvas {
  display: block;
}

.spectator-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.spectator-overlay p {
  color: #e0e0e0;
}

.spectator-note {
  color: #888888;
  font-size: 0.85em;
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

kbd {
  background: #333333;
  border: 1px solid #444444;
  border-radius: 3px;
  padding: 2px 6px;
  margin: 0 2px;
  font-family: inherit;
  font-size: 0.85em;
  color: #e0e0e0;
}

.quit-btn {
  margin-top: 8px;
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
