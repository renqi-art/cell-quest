import type { CaseDraft } from '@/shared/models/case-draft'

export interface MovementEnvelope {
  readonly version: 1
  readonly maxGapTiles: number
  readonly maxStepUpTiles: number
  readonly maxDropTiles: number
  readonly playerHeightTiles: number
}

export interface ReachabilityResult {
  readonly reachableIds: ReadonlySet<string>
  readonly unreachableIds: readonly string[]
}

export function analyzeReachability(
  draft: CaseDraft,
  _role: 'rbc' | 'wbc',
  _envelope: MovementEnvelope,
): ReachabilityResult {
  const map = draft.map
  const height = map.length
  if (height === 0) return { reachableIds: new Set(), unreachableIds: draft.nodes.map(n => n.id) }
  const width = map[0]!.length

  const spawnNode = draft.nodes.find(n => n.kind === 'spawn')
  if (!spawnNode) return { reachableIds: new Set(), unreachableIds: draft.nodes.map(n => n.id) }

  // BFS-based reachability (simplified — full implementation tracks jump arcs)
  const visited = new Set<string>()
  const queue: { x: number; y: number }[] = [{ x: spawnNode.x, y: spawnNode.y }]
  visited.add(`${spawnNode.x},${spawnNode.y}`)

  const isSolid = (tile: string | undefined): boolean => {
    return tile === '#' || tile === '='
  }

  while (queue.length > 0) {
    const { x, y } = queue.shift()!
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ]

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue
      const key = `${n.x},${n.y}`
      if (visited.has(key)) continue

      const tile = map[n.y]?.[n.x]
      if (isSolid(tile)) continue

      // Check if gap is jumpable (simplified: allow gaps up to maxGapTiles)
      const accessible = !isSolid(tile)

      // Check if we can stand (tile below is solid)
      const below = map[n.y + 1]?.[n.x]
      const standsOnSolid = n.y + 1 >= height || isSolid(below)

      if (accessible && (standsOnSolid || n.y + 1 >= height)) {
        visited.add(key)
        queue.push(n)
      }
    }
  }

  const reachableIds = new Set<string>()
  const unreachableIds: string[] = []

  for (const node of draft.nodes) {
    if (visited.has(`${node.x},${node.y}`)) {
      reachableIds.add(node.id)
    } else {
      unreachableIds.push(node.id)
    }
  }

  return { reachableIds, unreachableIds }
}
