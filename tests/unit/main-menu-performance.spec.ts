import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const menuCss = readFileSync(resolve(process.cwd(), 'css/main-menu-v4.css'), 'utf8')
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

const webpPath = resolve(process.cwd(), 'images/main-menu-bg-v4.webp')

describe('main menu loading performance', () => {
  it('uses a bounded WebP for the visible menu background', () => {
    expect(menuCss).toContain("../images/main-menu-bg-v4.webp?v=1")
    expect(existsSync(webpPath)).toBe(true)
    expect(statSync(webpPath).size).toBeLessThanOrEqual(400 * 1024)
    expect(indexHtml).toContain('css/main-menu-v4.css?v=5')
  })

  it('does not block rendering while the icon font downloads', () => {
    expect(menuCss).toMatch(/font-display:\s*swap/)
    expect(menuCss).not.toMatch(/font-display:\s*block/)
  })
})
