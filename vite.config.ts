import { fileURLToPath, URL } from 'node:url'
import { resolve, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'

const root = fileURLToPath(new URL('.', import.meta.url))

/** Copy classic JS scripts + static assets (images, fonts, audio) to the build output. */
function copyStaticAssetsPlugin(): Plugin {
  return {
    name: 'copy-static-assets',
    apply: 'build',
    closeBundle() {
      const dist = resolve(root, 'dist')
      const dirsToCopy = ['js', 'images', 'fonts']
      if (existsSync(resolve(root, 'audio'))) dirsToCopy.push('audio')

      for (const dir of dirsToCopy) {
        const srcDir = resolve(root, dir)
        const destDir = resolve(dist, dir)
        if (existsSync(srcDir)) {
          copyDirSync(srcDir, destDir)
          console.log(`  [copy-static-assets] ✓ ${dir}/`)
        }
      }
    },
  }
}

function copyDirSync(src: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readDirEntries(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      cpSync(srcPath, destPath)
    }
  }
}

function readDirEntries(dir: string): string[] {
  try { return readdirSync(dir) }
  catch { return [] }
}

const legacyApiProxy = {
  '/levels': 'http://127.0.0.1:8081',
  '/save': 'http://127.0.0.1:8081',
  '/reset': 'http://127.0.0.1:8081',
  '/api': 'http://127.0.0.1:8081',
  '/healthz': 'http://127.0.0.1:8081',
}

export default defineConfig({
  plugins: [vue(), copyStaticAssetsPlugin()],
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
        tiledDemo: resolve(root, 'tiled-demo.html'),
        aiSettings: resolve(root, 'ai-settings.html'),
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
