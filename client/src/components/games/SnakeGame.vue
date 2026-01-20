<template>
  <div class="snake-game">
    <div class="game-header">
      <span class="game-title">SNAKE</span>
      <div class="game-stats">
        <span class="score">Score: {{ gameState.score }}</span>
        <span class="multiplier">Food: x{{ gameState.foodValue }}</span>
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
        <p>{{ gameState.host }} is playing</p>
        <p class="spectator-note">Spectating...</p>
      </div>
    </div>

    <div class="controls-info">
      <template v-if="isHost">
        <p>Controls: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrow Keys</p>
        <button @click="handleQuit" class="quit-btn">Quit Game (Q)</button>
      </template>
      <template v-else>
        <p>Watching {{ gameState.host }} play...</p>
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

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

  // Draw grid
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 0.5
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

  // Draw food
  if (props.gameState.food) {
    const fx = props.gameState.food.x * cellSize
    const fy = props.gameState.food.y * cellSize

    // Draw apple
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(fx + cellSize / 2, fy + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    // Apple stem
    ctx.fillStyle = '#65a30d'
    ctx.fillRect(fx + cellSize / 2 - 1, fy + 1, 2, 4)
  }

  // Draw snake
  if (props.gameState.body && props.gameState.body.length > 0) {
    props.gameState.body.forEach((segment, index) => {
      const sx = segment.x * cellSize
      const sy = segment.y * cellSize

      if (index === 0) {
        // Head - darker green
        ctx.fillStyle = '#15803d'
      } else {
        // Body - lighter green gradient
        const brightness = Math.max(0.4, 1 - index * 0.03)
        ctx.fillStyle = `rgba(74, 222, 128, ${brightness})`
      }

      // Draw rounded rectangle for segment
      const padding = 1
      ctx.beginPath()
      ctx.roundRect(
        sx + padding,
        sy + padding,
        cellSize - padding * 2,
        cellSize - padding * 2,
        3
      )
      ctx.fill()

      // Draw eyes on head
      if (index === 0) {
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(sx + cellSize * 0.35, sy + cellSize * 0.35, 2, 0, Math.PI * 2)
        ctx.arc(sx + cellSize * 0.65, sy + cellSize * 0.35, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(sx + cellSize * 0.35, sy + cellSize * 0.35, 1, 0, Math.PI * 2)
        ctx.arc(sx + cellSize * 0.65, sy + cellSize * 0.35, 1, 0, Math.PI * 2)
        ctx.fill()
      }
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
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 20px;
  color: white;
  font-family: inherit;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.game-title {
  font-size: 1.5em;
  font-weight: bold;
  color: #4ade80;
}

.game-stats {
  display: flex;
  gap: 20px;
}

.score {
  color: #ffd700;
  font-weight: bold;
}

.multiplier {
  color: #f472b6;
}

.game-container {
  position: relative;
  display: flex;
  justify-content: center;
  background: #0f0f1a;
  border-radius: 10px;
  padding: 10px;
}

.game-canvas {
  border-radius: 5px;
  display: block;
}

.spectator-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.spectator-note {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9em;
}

.controls-info {
  margin-top: 15px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.controls-info p {
  margin: 5px 0;
}

kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 2px 8px;
  margin: 0 3px;
  font-family: inherit;
}

.quit-btn {
  margin-top: 10px;
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.quit-btn:hover {
  background: #dc2626;
}
</style>
