import { createApp } from 'vue'
import { createPinia } from 'pinia'
import GameApp from './GameApp.vue'

const root = document.querySelector<HTMLElement>('#vue-game-root')
if (!root) throw new Error('Missing #vue-game-root')
root.dataset.vueMounted = 'true'
createApp(GameApp).use(createPinia()).mount(root)
