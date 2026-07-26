/// <reference types="vite/client" />

import type { LegacyGameBridge } from '@/game/bridge/LegacyGameEngineAdapter'
import type { PreviewLevelRegistry } from '@/editor/services/LegacyEditorPreviewAdapter'

declare global {
  interface Window {
    CellQuestLegacy: LegacyGameBridge & PreviewLevelRegistry
  }
}

export {}
