<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'
import { CaseCanvasRenderer, type ViewportState } from '@/editor/canvas/CaseCanvasRenderer'
import { pointerToGrid } from '@/editor/canvas/case-canvas-tools'
import { nodeKindFromTool, type EditorTool } from '@/editor/types/editor-tools'

const props = defineProps<{
  activeTool: EditorTool
}>()

const store = useCaseEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderer = new CaseCanvasRenderer()
const viewport: ViewportState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  tileSize: 16,
}

let resizeObserver: ResizeObserver | null = null

function render(): void {
  const canvas = canvasRef.value
  if (!canvas || !store.draft) return
  const width = store.draft.map[0]?.length ?? 80
  const height = store.draft.map.length || 15
  const pixelWidth = width * viewport.tileSize
  const pixelHeight = height * viewport.tileSize
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight
  renderer.render(store.draft, viewport)
}

function handlePointer(event: PointerEvent): void {
  const canvas = canvasRef.value
  const draft = store.draft
  if (!canvas || !draft) return
  const bounds = canvas.getBoundingClientRect()
  const point = pointerToGrid(event, bounds, canvas, viewport)
  const width = draft.map[0]?.length ?? 0
  if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= draft.map.length) return

  const nodeKind = nodeKindFromTool(props.activeTool)
  if (nodeKind) {
    store.addNode(nodeKind, point.x, point.y)
    render()
    return
  }

  if (props.activeTool === 'select') {
    const node = [...draft.nodes].reverse().find(item => item.x === point.x && item.y === point.y)
    store.selectNode(node?.id ?? null)
    return
  }

  store.executeCommand({
    type: 'paint-cells',
    cells: [{ ...point, tile: props.activeTool === 'paint' ? '#' : ' ' }],
  })
  render()
}

function removeSelected(): void {
  if (!store.selectedNodeId) return
  store.executeCommand({ type: 'remove-node', id: store.selectedNodeId })
  store.selectNode(null)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  renderer.attach(canvas)
  render()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(render)
    resizeObserver.observe(canvas)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  renderer.detach()
})

watch(() => store.draft, render, { flush: 'post' })
watch(() => store.selectedNodeId, render)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="case-map-canvas"
    data-testid="case-map-canvas"
    tabindex="0"
    aria-label="病例地图画布"
    @pointerdown="handlePointer"
    @keydown.delete.prevent="removeSelected"
    @keydown.backspace.prevent="removeSelected"
  />
</template>

<style scoped>
.case-map-canvas {
  display: block;
  width: 100%;
  max-height: 100%;
  aspect-ratio: 16 / 3;
  image-rendering: pixelated;
  background: #0a0a18;
  cursor: crosshair;
}
.case-map-canvas:focus-visible {
  outline: 3px solid #4fc3f7;
  outline-offset: 2px;
}
</style>
