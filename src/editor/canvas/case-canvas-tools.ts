export interface GridPoint {
  readonly x: number
  readonly y: number
}

export function lineCells(from: GridPoint, to: GridPoint): GridPoint[] {
  const result: GridPoint[] = []
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  const sx = from.x < to.x ? 1 : -1
  const sy = from.y < to.y ? 1 : -1
  let err = dx - dy
  let cx = from.x
  let cy = from.y

  while (true) {
    result.push({ x: cx, y: cy })
    if (cx === to.x && cy === to.y) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; cx += sx }
    if (e2 < dx) { err += dx; cy += sy }
  }
  return result
}

export function rectangleCells(from: GridPoint, to: GridPoint): GridPoint[] {
  const minX = Math.min(from.x, to.x)
  const maxX = Math.max(from.x, to.x)
  const minY = Math.min(from.y, to.y)
  const maxY = Math.max(from.y, to.y)
  const result: GridPoint[] = []

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      result.push({ x, y })
    }
  }
  return result
}

export function floodFillCells(map: readonly string[], start: GridPoint, blockTile: string): GridPoint[] {
  const height = map.length
  if (height === 0) return []
  const width = map[0]!.length

  const visited = new Set<string>()
  const result: GridPoint[] = []
  const stack: GridPoint[] = [start]

  while (stack.length > 0) {
    const p = stack.pop()!
    const key = `${p.x},${p.y}`
    if (visited.has(key)) continue
    if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue

    const tile = map[p.y]![p.x]
    if (tile === blockTile) continue

    visited.add(key)
    result.push(p)
    stack.push({ x: p.x + 1, y: p.y })
    stack.push({ x: p.x - 1, y: p.y })
    stack.push({ x: p.x, y: p.y + 1 })
    stack.push({ x: p.x, y: p.y - 1 })
  }
  return result
}
