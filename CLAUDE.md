# CLAUDE.md

## Project Overview

**Cell Quest (细胞远征)** is a side-scrolling medical action game set in the human body. Players control blood cells (WBC, RBC, PLT) to fight pathogens. Built with a hybrid architecture: Vue 3 + Phaser 3 + Vite for the modern shell, with a legacy vanilla JS game engine for the core gameplay loop.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Vue 3.5 (Composition API + `<script setup>`) |
| Game Engine | Phaser 3.90+ (modern) + vanilla Canvas2D (classic) |
| Build Tool | Vite 8 + TypeScript |
| State Management | Pinia 4 |
| Animation | Motion (Framer Motion) 12 |
| Backend | Node.js HTTP server (port 8081) |
| Testing | Vitest + Playwright |
| Package Manager | npm |

## Architecture

```
                    ┌──────────────────────────┐
                    │      Vite Dev Server      │
                    │      Port 8080            │
                    │  ┌──────────────────────┐ │
                    │  │  Vue 3 SPA (src/)    │ │
                    │  │  Pinia Stores        │ │
                    │  │  Phaser 3 Scenes     │ │
                    │  └──────────────────────┘ │
                    │  ┌──────────────────────┐ │
                    │  │  Classic Game Engine  │ │
                    │  │  js/game.js (2695L)   │ │
                    │  │  js/entities.js(2970L)│ │
                    │  │  js/config.js (1291L) │ │
                    │  └──────────────────────┘ │
                    └──────────┬───────────────┘
                               │ Proxy /levels, /save, /api
                    ┌──────────▼───────────────┐
                    │   Node.js Server         │
                    │   Port 8081              │
                    │   - Level save/load      │
                    │   - AI map generation    │
                    │   - Static file serving  │
                    └──────────────────────────┘
```

## Directory Structure

```
cell-quest/
├── index.html              # Main game entry (multi-page Vite input)
├── editor.html             # Map editor entry
├── deck.html               # Deck builder entry
├── ai-settings.html        # AI config page
├── server.js               # Node backend (port 8081)
├── vite.config.ts          # Vite config + static asset copy plugin
├── package.json            # Scripts: dev, build, preview, test:*
│
├── src/                    # Vue 3 + Phaser modern code
│   ├── game/               # Phaser scenes & game bootstrap
│   ├── stores/             # Pinia stores
│   ├── components/         # Vue components
│   └── utils/              # Shared utilities
│
├── js/                     # Classic vanilla JS game engine
│   ├── game.js             # Main loop, input, rendering, UI (2695 lines)
│   ├── entities.js         # Player, enemies, boss, items (2970 lines)
│   ├── config.js           # Game config, physics, skill params (1291 lines)
│   ├── sprites.js          # Sprite loading & frame config
│   ├── levels.js           # Level registry & LEVEL_MAPS array
│   ├── levels/             # Individual level data files
│   ├── main-menu.js        # Dynamic main menu (IIFE)
│   ├── ai-levels.js        # AI-generated level support
│   └── mobile/             # Mobile adaptation modules
│       ├── capability.js   # Device detection
│       ├── input-controller.js  # Touch/gesture input
│       ├── controls-overlay.js  # On-screen controls
│       ├── viewport-coordinator.js  # Viewport management
│       └── index.js        # Mobile bootstrap
│
├── css/                    # Stylesheets
├── images/                 # Game assets (sprites, backgrounds, UI)
├── fonts/                  # Phosphor icon font
├── audio/                  # Music & SFX
├── server/                 # Backend modules
│   ├── director.js         # AI director
│   ├── case-generator.js   # Case generation
│   ├── ai-map-generator.js # AI map generation
│   └── ai-runtime-config.js # Runtime AI config
├── tests/                  # Playwright E2E + Vitest unit tests
└── dist/                   # Production build output
```

## Commands

```bash
npm run dev          # Start dev (Vite :8080 + server :8081)
npm run build        # Production build → dist/
npm run preview      # Preview production build (:8080)
npm run typecheck    # TypeScript type checking
npm run test:unit    # Vitest unit tests
npm run test:server  # Server unit tests
npm test             # Full E2E test suite
npm run package:offline  # Package for offline distribution
```

## Key Conventions

### Game State Machine

```
menu → hub (level select) → playing → complete/death → hub/menu
                                 ↘ pause → playing
```

- `Game.state` is the single source of truth
- Overlay visibility controlled by `.hidden` class toggling
- `Game.keys` tracks keyboard state, updated each frame

### Code Style (Classic JS)

- Global namespace: `Game`, `Sfx`, `UI` objects
- Functions use `camelCase`, constants use `UPPER_SNAKE`
- DOM refs via `$(id)` shorthand (not jQuery - just `document.getElementById`)
- Asset loading uses `Image.onload` callbacks

### Code Style (Vue/TS)

- TypeScript strict mode
- Composition API with `<script setup>`
- Pinia stores for shared state
- Phaser scenes in `src/game/`

### Build Notes

- `copyStaticAssetsPlugin` in `vite.config.ts` copies `js/`, `images/`, `fonts/`, `audio/` to `dist/` during build
- Multi-page build: index, editor, deck, ai-settings
- Classic JS files are NOT bundled — loaded via `<script>` tags in HTML
- Cache strategy: versioned assets → immutable 1yr, images → 7d, HTML → no-cache

## Known Issues

- `js/game.js` (2695 lines) and `js/entities.js` (2970 lines) are monolithic — refactor when possible
- CSP uses `'unsafe-inline'` for classic script compatibility
- `dist/` directory is in `.gitignore` but was previously tracked — may need cleanup
- No PWA manifest/service worker for mobile

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CELL_QUEST_PORT` | Server port | `8080` |
| `CELL_QUEST_HOST` | Server bind address | `127.0.0.1` |
| `CELL_QUEST_AI_API_KEY` | AI map generation API key | — |
