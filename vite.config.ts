import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('.', import.meta.url))

const legacyApiProxy = {
  '/levels': 'http://127.0.0.1:8081',
  '/save': 'http://127.0.0.1:8081',
  '/reset': 'http://127.0.0.1:8081',
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        game: resolve(root, 'index.html'),
        editor: resolve(root, 'editor.html'),
        deck: resolve(root, 'deck.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 8080,
    proxy: legacyApiProxy,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 8080,
    proxy: legacyApiProxy,
    strictPort: true,
  },
})
