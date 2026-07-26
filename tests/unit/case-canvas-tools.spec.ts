import { describe, expect, it } from 'vitest'
import { lineCells, rectangleCells, floodFillCells, pointerToGrid } from '@/editor/canvas/case-canvas-tools'

describe('canvas tools — geometry', () => {
  it('lineCells returns horizontal Bresenham line', () => {
    const cells = lineCells({ x: 1, y: 1 }, { x: 3, y: 1 })
    expect(cells).toEqual([
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
    ])
  })

  it('lineCells returns single cell for same point', () => {
    const cells = lineCells({ x: 5, y: 5 }, { x: 5, y: 5 })
    expect(cells).toEqual([{ x: 5, y: 5 }])
  })

  it('rectangleCells returns normalized bounds', () => {
    const cells = rectangleCells({ x: 3, y: 3 }, { x: 1, y: 1 })
    cells.sort((a, b) => a.x - b.x || a.y - b.y)
    expect(cells.length).toBe(9) // 3x3
    expect(cells).toContainEqual({ x: 1, y: 1 })
    expect(cells).toContainEqual({ x: 3, y: 3 })
  })

  it('floodFillCells respects boundaries', () => {
    const map = ['   ', ' # ', '   ']
    const cells = floodFillCells(map, { x: 0, y: 0 }, '#')
    expect(cells.length).toBe(8) // all except (1,1) which is blocked
  })

  it('floodFillCells duplicates are removed', () => {
    const map = ['   ']
    const cells = floodFillCells(map, { x: 0, y: 0 }, '#')
    expect(cells.length).toBe(3)
  })

  it('maps a scaled canvas pointer to a semantic grid cell', () => {
    const point = pointerToGrid(
      { clientX: 132, clientY: 74 },
      { left: 100, top: 50, width: 640, height: 240 },
      { width: 1280, height: 480 },
      { offsetX: 0, offsetY: 0, zoom: 1, tileSize: 16 },
    )

    expect(point).toEqual({ x: 4, y: 3 })
  })
})
