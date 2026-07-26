import type { CaseDraft } from '@/shared/models/case-draft'
import type { CaseNode } from '@/shared/types/case'

export interface PhaserTerrainCell { readonly x: number; readonly y: number; readonly tile: '#' | '=' }
export interface PhaserSceneModel {
  readonly tileSize: number
  readonly worldWidth: number
  readonly worldHeight: number
  readonly solids: readonly PhaserTerrainCell[]
  readonly spawn: Extract<CaseNode, { kind: 'spawn' }>
  readonly nodes: readonly Exclude<CaseNode, { kind: 'spawn' }>[]
}

export function buildPhaserSceneModel(
  draft: CaseDraft,
  viewport: { readonly width: number; readonly height: number } = { width: 960, height: 540 },
): PhaserSceneModel {
  const columns = Math.max(1, draft.map[0]?.length ?? 1)
  const rows = Math.max(1, draft.map.length)
  const tileSize = Math.max(6, Math.min(16, Math.floor(viewport.width / columns), Math.floor(viewport.height / rows)))
  const solids: PhaserTerrainCell[] = []
  for (let y = 0; y < draft.map.length; y += 1) {
    const row = draft.map[y] ?? ''
    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x]
      if (tile === '#' || tile === '=') solids.push({ x, y, tile })
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
  }
}
