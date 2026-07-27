import type { CaseBlueprint } from '@/editor/services/AiCaseDesignerClient'
import type { CaseDraft } from '@/shared/models/case-draft'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { CaseConfig, CaseNode } from '@/shared/types/case'

export interface CompileCaseOptions {
  readonly seed: string
  readonly source?: 'ai' | 'template'
}

const ALLOWED_EVENTS = new Set<CaseConfig['allowedEvents'][number]>([
  'ACUTE_HYPOXIA',
  'INFECTION_REBOUND',
  'TRANSPORT_BLOCKAGE',
  'ATP_CRISIS',
])

const MAP_WIDTH = 80
const MAP_HEIGHT = 15
const GROUND_ROW = 13

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function isAllowedEvent(value: string): value is CaseConfig['allowedEvents'][number] {
  return ALLOWED_EVENTS.has(value as CaseConfig['allowedEvents'][number])
}

// ===== Map Generator — generates platformer maps for case campaigns =====

interface MapGrid { rows: string[] }

function createEmptyGrid(): MapGrid {
  return { rows: Array.from({ length: MAP_HEIGHT }, () => ' '.repeat(MAP_WIDTH)) }
}

function setTile(grid: MapGrid, x: number, y: number, tile: string): void {
  if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) return
  const row = grid.rows[y] ?? ''
  grid.rows[y] = row.substring(0, x) + tile + row.substring(x + 1)
}

function setRange(grid: MapGrid, x: number, y: number, width: number, tile: string): void {
  for (let i = 0; i < width; i++) setTile(grid, x + i, y, tile)
}

function buildGround(grid: MapGrid, _seedNum: number): void {
  // Continuous ground — nodes must be reachable by walking (BFS validator)
  setRange(grid, 0, GROUND_ROW, MAP_WIDTH, '#')
  // Second ground row (bottom fill)
  setRange(grid, 0, MAP_HEIGHT - 1, MAP_WIDTH, '#')
}

function buildPlatforms(grid: MapGrid, seedNum: number, infectionSiteCount: number, oxygenRouteCount: number): void {
  // Platform levels: row 3-4, 5-7, 8-10
  const platformRows = [4, 7, 10]
  for (const row of platformRows) {
    let x = 8 + (seedNum % 6)
    while (x < MAP_WIDTH - 8) {
      const len = 3 + (seedNum + x * 13) % 7
      const end = Math.min(x + len, MAP_WIDTH - 2)
      for (let i = x; i < end; i++) setTile(grid, i, row, '=')
      x = end + 4 + (seedNum + x) % 8
    }
  }

  // Additional platforms near infection sites (row 9-10, more combat platforms)
  for (let i = 0; i < infectionSiteCount; i++) {
    const cx = 30 + i * 14 + (seedNum % 5)
    if (cx < MAP_WIDTH - 4) setRange(grid, cx - 1, 9, 5, '=')
  }

  // Platforms near oxygen sources (row 5-6, elevated)
  for (let i = 0; i < oxygenRouteCount; i++) {
    const cx = 15 + i * 18 + (seedNum % 7)
    if (cx < MAP_WIDTH - 4) setRange(grid, cx - 1, 5, 5, '=')
  }
}

function buildPipes(grid: MapGrid, seedNum: number): void {
  const pipeXs: number[] = []
  let x = 12 + (seedNum % 5)
  while (x < MAP_WIDTH - 10) {
    pipeXs.push(x)
    x += 14 + (seedNum + x) % 10
  }
  for (const px of pipeXs) {
    const height = 2 + (seedNum + px) % 3
    // Pipes only go above ground — don't overwrite the ground row
    for (let row = GROUND_ROW - 1; row >= GROUND_ROW - height; row--) {
      setTile(grid, px, row, 'p')
      setTile(grid, px + 1, row, 'p')
    }
  }
}

function buildEnemies(grid: MapGrid, seedNum: number, infectionSiteNodes: CaseNode[], infectionNodeCols: number[]): void {
  // Place staph enemies near infection sites
  for (let i = 0; i < infectionNodeCols.length; i++) {
    const cx = infectionNodeCols[i]
    if (!cx) continue
    // Left of infection site
    if (cx > 5) setTile(grid, cx - 3, GROUND_ROW - 1, 'g')
    if (cx > 8 && (seedNum + i) % 2 === 0) setTile(grid, cx - 6, GROUND_ROW - 1, 'g')
    // Right of infection site
    if (cx < MAP_WIDTH - 5) setTile(grid, cx + 3, GROUND_ROW - 1, 'g')
    // Strep (harder enemy) further away
    if (cx < MAP_WIDTH - 8 && (seedNum + i) % 3 === 0) setTile(grid, cx + 7, GROUND_ROW - 1, 't')
  }

  // Additional scattered enemies in open spaces
  for (let i = 0; i < 2; i++) {
    const ex = 45 + i * 14 + (seedNum % 10)
    if (ex < MAP_WIDTH - 3 && !(grid.rows[GROUND_ROW - 1]?.[ex] ?? ' ').match(/[gtp]/)) {
      setTile(grid, ex, GROUND_ROW - 1, i === 0 ? 'g' : 't')
    }
  }
}

function buildItems(grid: MapGrid, seedNum: number): void {
  // Coins on platforms
  const platformRows = [4, 7, 10]
  for (const row of platformRows) {
    forEachTile(grid, row, '=', (x) => {
      if ((seedNum + x * 3) % 5 === 0) setTile(grid, x, row - 1, 'o')
    })
  }
  // ATP pickups scattered
  const atpXs = [20 + (seedNum % 8), 45 + (seedNum % 10), 60 + (seedNum % 6)]
  for (const ax of atpXs) {
    if (ax < MAP_WIDTH - 1) setTile(grid, ax, GROUND_ROW - 1, 'a')
  }
}

function forEachTile(grid: MapGrid, row: number, tile: string, fn: (x: number) => void): void {
  const line = grid.rows[row] ?? ''
  for (let x = 0; x < line.length; x++) {
    if (line[x] === tile) fn(x)
  }
}

function gridToStrings(grid: MapGrid): readonly string[] {
  return grid.rows.map(r => r)
}

// ===== Main compile function =====

export function compileCaseBlueprint(
  blueprint: CaseBlueprint,
  options: CompileCaseOptions,
): CaseDraft {
  const base = createCaseDraft({ primaryCell: blueprint.primaryCell })
  if (!base.caseConfig) throw new Error('Case blueprint requires case mode')

  const fingerprint = stableHash(JSON.stringify(blueprint) + ':' + options.seed)
  const seedNum = parseInt(fingerprint, 36)

  // ---- Generate platformer map ----
  const grid = createEmptyGrid()
  buildGround(grid, seedNum)
  buildPipes(grid, seedNum)

  // ---- Place case nodes ----
  const nodes: CaseNode[] = [
    { kind: 'spawn', id: 'spawn-' + fingerprint, x: 2, y: GROUND_ROW - 1, role: blueprint.primaryCell },
  ]

  const oxygenRoutes: CaseConfig['goals']['oxygenRoutes'][number][] = []
  const infectionNodeIds: string[] = []
  const infectionNodeCols: number[] = []

  // Oxygen routes: place sources and targets on ground level (reachable by walking)
  // Platforms above these nodes provide additional navigation and items
  for (let index = 0; index < blueprint.nodeCounts.oxygenRoutes; index += 1) {
    const sourceX = 14 + index * 22 + (seedNum % 5)
    const targetX = 14 + index * 22 + 8 + (seedNum % 3)
    // Place nodes at ground level for reachability
    const nodeY = GROUND_ROW - 1

    const sourceId = 'oxygen-' + fingerprint + '-' + index
    const targetId = 'tissue-' + fingerprint + '-' + index
    nodes.push({ kind: 'oxygen-source', id: sourceId, x: sourceX, y: nodeY, capacity: 3 })
    nodes.push({ kind: 'target-tissue', id: targetId, x: targetX, y: nodeY, requiredOxygen: 3 })
    oxygenRoutes.push({
      id: 'route-' + fingerprint + '-' + index,
      sourceId,
      targetIds: [targetId],
      requiredDeliveries: 3,
    })

    // Add platforms above the nodes for enemies/items/visual variety
    setRange(grid, sourceX - 1, nodeY - 3, 5, '=')
    setRange(grid, targetX - 1, nodeY - 3, 5, '=')
  }

  // Infection sites: place on ground surrounded by enemies
  for (let index = 0; index < blueprint.nodeCounts.infectionSites; index += 1) {
    const ix = 35 + index * 18 + (seedNum + index * 7) % 8
    const id = 'infection-' + fingerprint + '-' + index
    nodes.push({ kind: 'infection-site', id, x: ix, y: GROUND_ROW - 1, severity: 2 })
    infectionNodeIds.push(id)
    infectionNodeCols.push(ix)
  }

  // ---- Build remaining map elements ----
  buildPlatforms(grid, seedNum, blueprint.nodeCounts.infectionSites, blueprint.nodeCounts.oxygenRoutes)
  buildEnemies(grid, seedNum, nodes, infectionNodeCols)
  buildItems(grid, seedNum)

  return {
    ...base,
    id: 'case-' + fingerprint,
    metadata: {
      title: blueprint.title,
      author: 'AI 病例设计器',
      difficulty: blueprint.difficulty,
      tags: [...blueprint.tags],
      icon: blueprint.icon,
    },
    map: gridToStrings(grid),
    nodes,
    caseConfig: {
      version: 1,
      primaryCell: blueprint.primaryCell,
      allyMode: 'scripted',
      vitals: {
        ...blueprint.vitals,
        oxygenDecayPerSecond: blueprint.oxygenDecayPerSecond,
        infectionGrowthPerSecond: blueprint.infectionGrowthPerSecond,
        tissueDecayPerSecond: blueprint.tissueDecayPerSecond,
      },
      goals: {
        oxygenRoutes,
        infection: { nodeIds: infectionNodeIds, requiredClears: infectionNodeIds.length },
        stabilitySeconds: blueprint.stabilitySeconds,
      },
      allowedEvents: blueprint.allowedEvents.filter(isAllowedEvent),
      briefing: {
        start: blueprint.description,
        success: '患者指标恢复稳定。',
        failure: '患者组织状态恶化，请调整供氧与免疫策略。',
      },
      education: {
        topic: blueprint.educationalTopic,
        sourceIds: ['blueprint-' + fingerprint],
      },
    },
    editorMeta: {
      source: options.source ?? 'ai',
      updatedAt: new Date().toISOString(),
    },
  }
}
