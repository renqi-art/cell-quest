const { test, expect } = require('playwright/test');

test.describe('mobile single-player flow', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await expect(page.locator('#mobile-controls')).toHaveClass(/touch-device/);
  });

  async function enterHub(page) {
    await page.locator('#btn-start').click();
    const intro = page.locator('#npc-intro:not(.hidden)');
    if (await intro.isVisible().catch(() => false)) {
      await page.locator('#npc-intro-skip').click();
    }
    await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);
  }

  test('defers portrait battle and resumes it after rotation', async ({ page }) => {
    await enterHub(page);
    await page.locator('.level-card:not(.locked)').first().click();

    await expect(page.locator('#mobile-portrait-overlay')).toHaveClass(/active/);
    await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);
    expect(await page.evaluate(() => Game.state)).not.toBe('playing');

    await page.setViewportSize({ width: 844, height: 390 });

    await expect(page.locator('#hud')).toHaveClass(/active/);
    await expect(page.locator('#mobile-landscape-controls')).toHaveClass(/active/);
    expect(await page.evaluate(() => Game.state)).toBe('playing');
  });

  test('touch controls stay usable at the minimum landscape viewport', async ({ page }) => {
    await enterHub(page);
    await page.setViewportSize({ width: 667, height: 375 });
    await page.locator('.level-card:not(.locked)').first().click();
    await expect(page.locator('#mobile-landscape-controls')).toHaveClass(/active/);

    const undersized = await page.locator('.mobile-btn, .mobile-utility-btn').evaluateAll((buttons) =>
      buttons
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return { id: button.id, width: rect.width, height: rect.height };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
    );
    expect(undersized).toEqual([]);

    await page.locator('#btn-mobile-pause').click();
    await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);
  });

  test('mobile hub excludes desktop-only tools and fullscreen failure is non-blocking', async ({ page }) => {
    await enterHub(page);
    await expect(page.locator('#btn-hub-2p')).toBeHidden();
    await expect(page.locator('#btn-hub-editor')).toBeHidden();

    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('.level-card:not(.locked)').first().click();
    await expect(page.locator('#btn-mobile-fullscreen-landscape')).toBeVisible();
    await page.evaluate(() => {
      Game.mobile.capability.requestFullscreen = async () => false;
    });
    await page.locator('#btn-mobile-fullscreen-landscape').click();

    await expect(page.locator('#mobile-fullscreen-status')).not.toBeEmpty();
    expect(await page.evaluate(() => Game.state)).toBe('playing');
  });

  test('HUD and action regions do not overlap on a recent iPhone landscape viewport', async ({ page }) => {
    await enterHub(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('.level-card:not(.locked)').first().click();

    const overlaps = await page.evaluate(() => {
      const action = document.getElementById('mobile-action-buttons').getBoundingClientRect();
      const joystick = document.getElementById('mobile-joystick-zone').getBoundingClientRect();
      const hudBottom = document.getElementById('hud-bottom').getBoundingClientRect();
      const intersects = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        actionHud: intersects(action, hudBottom),
        joystickHud: intersects(joystick, hudBottom),
      };
    });

    expect(overlaps).toEqual({ actionHud: false, joystickHud: false });
  });

  test('system overlays remain reachable in the minimum landscape height', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    const results = await page.evaluate(() => {
      document.getElementById('main-menu').classList.add('hidden');
      const ids = ['pause-menu', 'death-panel', 'complete-screen', 'memory-card', 'confirm-dialog'];
      return ids.map((id) => {
        const panel = document.getElementById(id);
        panel.classList.remove('hidden');
        const rect = panel.getBoundingClientRect();
        const buttons = [...panel.querySelectorAll('button')].map((button) => {
          const buttonRect = button.getBoundingClientRect();
          return { id: button.id, width: buttonRect.width, height: buttonRect.height };
        });
        const result = {
          id,
          rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom },
          scrollHeight: panel.scrollHeight,
          clientHeight: panel.clientHeight,
          overflowY: getComputedStyle(panel).overflowY,
          buttons,
        };
        panel.classList.add('hidden');
        return result;
      });
    });

    for (const panel of results) {
      expect(panel.rect.top).toBeGreaterThanOrEqual(0);
      expect(panel.rect.left).toBeGreaterThanOrEqual(0);
      expect(panel.rect.right).toBeLessThanOrEqual(667);
      expect(panel.rect.bottom).toBeLessThanOrEqual(375);
      if (panel.scrollHeight > panel.clientHeight) {
        expect(['auto', 'scroll']).toContain(panel.overflowY);
      }
      expect(panel.buttons.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
    }
  });
});

test('desktop keeps two-player entry, P2 HUD, and keyboard pause', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#btn-start').click();
  const intro = page.locator('#npc-intro:not(.hidden)');
  if (await intro.isVisible().catch(() => false)) {
    await page.locator('#npc-intro-skip').click();
  }
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);

  await expect(page.locator('#btn-hub-2p')).toBeVisible();
  await expect(page.locator('#btn-hub-editor')).toBeVisible();
  await page.locator('#btn-hub-2p').click();
  await expect(page.locator('#btn-hub-2p')).toContainText('ON');

  await page.locator('.level-card:not(.locked)').first().click();
  await expect(page.locator('#hud')).toHaveClass(/active/);
  await expect(page.locator('#hud-p2')).toBeVisible();

  await page.keyboard.press('p');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);
});
