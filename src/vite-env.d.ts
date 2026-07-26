/// <reference types="vite/client" />

import type { LegacyGameBridge } from '@/game/bridge/LegacyGameEngineAdapter'

declare global {
  interface Window {
    CellQuestLegacy: LegacyGameBridge
  }
}

export {}
