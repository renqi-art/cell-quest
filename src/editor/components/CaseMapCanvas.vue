<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'
import { CaseCanvasRenderer, type ViewportState } from '@/editor/canvas/CaseCanvasRenderer'

const store = useCaseEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderer = new CaseCanvasRenderer()

const viewport = ref<ViewportState>({
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  tileSize: 16,
})

let animFrameId = 0

function render() {
  const canvas = canvasRef.value
  if (!canvas || !store.draft) return
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  renderer.render(store.draft, viewport.value)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  renderer.attach(canvas)

  function loop() {
    render()
    animFrameId = requestAnimationFrame(loop)
  }
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animFrameId)
  renderer.detach()
})

watch(() => store.draft, () => {
  if (store.draft) render()
})
</script>

<template>
  <canvas ref="canvasRef" class="case-map-canvas" />
</template>

<style scoped>
.case-map-canvas {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  background: #0a0a18;
}
</style>
