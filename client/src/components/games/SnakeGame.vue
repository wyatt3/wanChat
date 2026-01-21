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

  // Clear canvas - light spreadsheet background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Draw grid - subtle gray lines
  ctx.strokeStyle = '#e9ecef'
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
    ctx.fillStyle = '#dc3545'
    ctx.fillRect(fx + 3, fy + 3, cellSize - 6, cellSize - 6)
  }

  // Draw snake - looks like a chart line/bars
  if (props.gameState.body && props.gameState.body.length > 0) {
    props.gameState.body.forEach((segment, index) => {
      const sx = segment.x * cellSize
      const sy = segment.y * cellSize

      if (index === 0) {
        // Head - darker blue
        ctx.fillStyle = '#0d6efd'
      } else {
        // Body - gradient blue
        const brightness = Math.max(0.4, 1 - index * 0.02)
        ctx.fillStyle = `rgba(13, 110, 253, ${brightness})`
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
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 16px;
  color: #212529;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

.game-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #495057;
}

.game-stats {
  display: flex;
  gap: 16px;
  font-size: 0.9em;
}

.score {
  color: #495057;
}

.multiplier {
  color: #6c757d;
}

.game-container {
  position: relative;
  display: flex;
  justify-content: center;
  background: #fff;
  border: 1px solid #dee2e6;
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
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.spectator-overlay p {
  color: #495057;
}

.spectator-note {
  color: #6c757d;
  font-size: 0.85em;
}

.controls-info {
  margin-top: 12px;
  text-align: center;
  color: #6c757d;
  font-size: 0.9em;
}

.controls-info p {
  margin: 4px 0;
}

kbd {
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 3px;
  padding: 2px 6px;
  margin: 0 2px;
  font-family: inherit;
  font-size: 0.85em;
}

.quit-btn {
  margin-top: 8px;
  background: #6c757d;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9em;
}

.quit-btn:hover {
  background: #5c636a;
}
</style>
