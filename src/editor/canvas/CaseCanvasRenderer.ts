import type { CaseDraft } from '@/shared/models/case-draft'

export interface ViewportState {
  readonly offsetX: number
  readonly offsetY: number
  readonly zoom: number
  readonly tileSize: number
}

export class CaseCanvasRenderer {
  private ctx: CanvasRenderingContext2D | null = null

  attach(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext('2d')
  }

  detach(): void {
    this.ctx = null
  }

  render(draft: CaseDraft, viewport: ViewportState): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const { tileSize, offsetX, offsetY } = viewport

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.save()
    ctx.translate(offsetX, offsetY)

    // Draw terrain
    for (let y = 0; y < draft.map.length; y++) {
      const row = draft.map[y]!
      for (let x = 0; x < row.length; x++) {
        const tile = row[x]!
        if (tile === ' ') continue
        const color = tile === '#' ? '#2a2a4a' : tile === '=' ? '#1a3a2a' : '#3a3a2a'
        ctx.fillStyle = color
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
      }
    }

    // Draw nodes
    const nodeColors: Record<string, string> = {
      'spawn': '#4fc3f7',
      'oxygen-source': '#4caf50',
      'target-tissue': '#ff9800',
      'infection-site': '#f44336',
      'checkpoint': '#ffd700',
      'knowledge': '#ab47bc',
    }

    for (const node of draft.nodes) {
      const color = nodeColors[node.kind] || '#fff'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(
        node.x * tileSize + tileSize / 2,
        node.y * tileSize + tileSize / 2,
        tileSize / 3,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    ctx.restore()
  }
}
