import { createApp } from 'vue'
import DeckApp from './DeckApp.vue'

const root = document.querySelector<HTMLElement>('#vue-deck-root')
if (!root) throw new Error('Missing #vue-deck-root')
root.dataset.vueMounted = 'true'
createApp(DeckApp).mount(root)
