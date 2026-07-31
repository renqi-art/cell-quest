import { describe, expect, it } from 'vitest'
import gameSource from '../../js/game.js?raw'
import gameUiSource from '../../js/game-ui.js?raw'

describe('heavy game asset preloading', () => {
  it('starts once after the player leaves the main menu', () => {
    const initStart = gameSource.indexOf('function init(){')
    const loadBinding = gameSource.indexOf("window.addEventListener('load', init);")
    const initSource = gameSource.slice(initStart, loadBinding)
    const showHubStart = gameUiSource.indexOf('function showHub(){')
    const showHubSource = gameUiSource.slice(showHubStart, showHubStart + 500)
    const loadLevelStart = gameSource.indexOf('function LoadLevel(')
    const loadLevelSource = gameSource.slice(loadLevelStart, loadLevelStart + 500)

    expect(gameSource).toContain('function ensureGameAssetsLoaded(){')
    expect(gameSource).toContain('if(gameAssetsPreloadStarted) return;')
    expect(initSource).not.toContain('loadSprites();')
    expect(initSource).not.toContain('preloadBgImages();')
    expect(showHubSource).toContain('ensureGameAssetsLoaded();')
    expect(loadLevelSource).toContain('ensureGameAssetsLoaded();')
  })
})
