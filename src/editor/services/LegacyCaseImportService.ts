import type { CaseDraft } from '@/shared/models/case-draft'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { PrimaryCell, CaseNode } from '@/shared/types/case'

/** Legacy custom level shape (from localStorage custom levels) */
export interface LegacyLevelData {
  name?: string
  icon?: string
  map?: string[]
  width?: number
  pipeSpawners?: unknown[]
  knowledgeCards?: unknown[]
  tutorials?: unknown[]
  floatPlatforms?: unknown[]
}

export interface ImportResult {
  readonly ok: true
  readonly draft: CaseDraft
  readonly warnings: readonly string[]
  readonly retiredItems: readonly string[]
}

export interface ImportError {
  readonly ok: false
  readonly error: string
}

export type LegacyImportResult = ImportResult | ImportError

/**
 * Converts a legacy custom level (from editor.html or localStorage) into a CaseDraft.
 * Non-case-mode items (coins, pipes, finish gates, Q-blocks, etc.) are removed and reported.
 */
export function importLegacyLevel(data: LegacyLevelData): LegacyImportResult {
  const warnings: string[] = []
  const retiredItems: string[] = []

  if (!data.map || data.map.length === 0) {
    return { ok: false, error: 'No map data found' }
  }

  // Parse the ASCII map, removing Mario-like tiles and tracking what was removed
  const tileRetirements: Record<string, number> = {}
  const caseOnlyTiles = new Set(['#', '=', 'S', 'B', '^', 'V', 'J', 'P', 'C', 'g', 'G', 't', 'b', 'H', ' '])
  const retiredTileLabels: Record<string, string> = {
    'o': '金币', '?': '?方块', 'F': '终点门', 'p': '管道',
    'D': '护盾', 'O': '氧气瓶', 'M': '补体', 'f': '食物',
    'd': '饮料', 'n': '营养包', 'a': 'ATP', '*': '记忆细胞', 'X': '?方块(钢)',
  }

  const cleanMap: string[] = data.map.map((row) => {
    return row.split('').map((ch) => {
      if (caseOnlyTiles.has(ch)) return ch
      if (retiredTileLabels[ch]) {
        tileRetirements[ch] = (tileRetirements[ch] || 0) + 1
        return ' ' // remove non-case tiles
      }
      return ' ' // unknown tiles also become space
    }).join('')
  })

  for (const [tile, count] of Object.entries(tileRetirements)) {
    const label = retiredTileLabels[tile] || tile
    retiredItems.push(`${label} x${count}`)
  }

  // Extract nodes from the map
  const nodes: CaseNode[] = []
  let nodeCounter = 0
  for (let y = 0; y < cleanMap.length; y++) {
    const row = cleanMap[y]
    if (!row) continue
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      switch (ch) {
        case 'P':
          nodes.push({ kind: 'spawn', id: `imported_spawn_${nodeCounter++}`, x, y, role: 'rbc' })
          break
        case 'C':
          nodes.push({ kind: 'checkpoint', id: `imported_cp_${nodeCounter++}`, x, y })
          break
      }
    }
  }

  if (!nodes.some((n) => n.kind === 'spawn')) {
    warnings.push('No spawn point (P) found; case will start at default position')
  }

  // Create a draft with minimal case config (incomplete — user must configure)
  const draft = createCaseDraft({ primaryCell: 'rbc', mode: 'case' })
  const immutableDraft: CaseDraft = {
    ...draft,
    metadata: {
      ...draft.metadata,
      title: data.name || draft.metadata.title,
      icon: data.icon || draft.metadata.icon,
    },
    map: cleanMap,
    nodes,
    caseConfig: null, // imported levels need manual configuration
  }

  if (retiredItems.length > 0) {
    warnings.push(`Retired non-case items: ${retiredItems.join(', ')}`)
  }

  return { ok: true, draft: immutableDraft, warnings, retiredItems }
}
