import { createApp } from 'vue'
import EditorApp from './EditorApp.vue'

const root = document.querySelector<HTMLElement>('#vue-editor-root')
if (!root) throw new Error('Missing #vue-editor-root')
root.dataset.vueMounted = 'true'
createApp(EditorApp).mount(root)
