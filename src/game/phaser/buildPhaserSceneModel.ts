import type { CaseDraft } from '@/shared/models/case-draft'
import type { CaseNode } from '@/shared/types/case'

// ---- Terrain ----
export interface PhaserTerrainCell { readonly x: number; readonly y: number; readonly tile: '#' | '=' }
// Pipe obstacles
export interface PhaserPipeCell { readonly x: number; readonly y: number }
// Enemy spawns
export interface PhaserEnemySpawn { readonly x: number; readonly y: number; readonly type: 'staph' | 'staph_large' | 'strep' }
// Collectibles
export interface PhaserCoinSpawn { readonly x: number; readonly y: number }
export interface PhaserAtpSpawn { readonly x: number; readonly y: number }
// Hazards
export interface PhaserSpringSpawn { readonly x: number; readonly y: number }
export interface PhaserSpikeSpawn { readonly x: number; readonly y: number }

export interface PhaserSceneModel {
  readonly tileSize: number
  readonly worldWidth: number
  readonly worldHeight: number
  readonly solids: readonly PhaserTerrainCell[]
  readonly spawn: Extract<CaseNode, { kind: 'spawn' }>
  readonly nodes: readonly Exclude<CaseNode, { kind: 'spawn' }>[]
  readonly pipes: readonly PhaserPipeCell[]
  readonly enemies: readonly PhaserEnemySpawn[]
  readonly coins: readonly PhaserCoinSpawn[]
  readonly atpPickups: readonly PhaserAtpSpawn[]
  readonly springs: readonly PhaserSpringSpawn[]
  readonly spikes: readonly PhaserSpikeSpawn[]
}

export function buildPhaserSceneModel(
  draft: CaseDraft,
  viewport: { readonly width: number; readonly height: number } = { width: 960, height: 540 },
): PhaserSceneModel {
  const columns = Math.max(1, draft.map[0]?.length ?? 1)
  const rows = Math.max(1, draft.map.length)
  const tileSize = Math.max(6, Math.min(16, Math.floor(viewport.width / columns), Math.floor(viewport.height / rows)))
  const solids: PhaserTerrainCell[] = []
  const pipes: PhaserPipeCell[] = []
  const enemies: PhaserEnemySpawn[] = []
  const coins: PhaserCoinSpawn[] = []
  const atpPickups: PhaserAtpSpawn[] = []
  const springs: PhaserSpringSpawn[] = []
  const spikes: PhaserSpikeSpawn[] = []

  for (let y = 0; y < draft.map.length; y += 1) {
    const row = draft.map[y] ?? ''
    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x]
      switch (tile) {
        case '#':
        case '=':
          solids.push({ x, y, tile })
          break
        case 'p':
          pipes.push({ x, y })
          solids.push({ x, y, tile: '#' }) // pipe blocks are solid
          break
        case 'g':
          enemies.push({ x, y, type: 'staph' })
          break
        case 'G':
          enemies.push({ x, y, type: 'staph_large' })
          break
        case 't':
          enemies.push({ x, y, type: 'strep' })
          break
        case 'o':
          coins.push({ x, y })
          break
        case 'a':
          atpPickups.push({ x, y })
          break
        case 'V':
          springs.push({ x, y })
          break
        case '^':
          spikes.push({ x, y })
          break
      }
    }
  }
  const spawn = draft.nodes.find((node): node is Extract<CaseNode, { kind: 'spawn' }> => node.kind === 'spawn')
  if (!spawn) throw new Error('Phaser case scene requires one spawn node')
  return {
    tileSize,
    worldWidth: columns * tileSize,
    worldHeight: rows * tileSize,
    solids,
    spawn,
    nodes: draft.nodes.filter((node): node is Exclude<CaseNode, { kind: 'spawn' }> => node.kind !== 'spawn'),
    pipes,
    enemies,
    coins,
    atpPickups,
    springs,
    spikes,
  }
}
