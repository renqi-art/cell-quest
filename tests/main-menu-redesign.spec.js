const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

test('main menu renders reusable action rows with a movable selected state', async ({ page }) => {
  const actions = page.locator('#main-menu-actions [data-menu-action]');
  const newGame = page.locator('[data-menu-id="new-game"]');
  const saveSlots = page.locator('[data-menu-id="save-slots"]');

  await expect(actions).toHaveCount(3);
  await expect(newGame).toHaveClass(/is-selected/);
  await expect(saveSlots).not.toHaveClass(/is-selected/);

  await page.keyboard.press('ArrowDown');

  await expect(newGame).not.toHaveClass(/is-selected/);
  await expect(saveSlots).toHaveClass(/is-selected/);
  await expect(saveSlots).toBeFocused();
});

test('every main menu action receives the same selected effect and activates normally', async ({ page }) => {
  const leaderboard = page.locator('[data-menu-id="leaderboard"]');

  await leaderboard.hover();
  await expect(leaderboard).toHaveClass(/is-selected/);
  await expect(leaderboard).toHaveAttribute('aria-current', 'true');

  await leaderboard.click();
  await expect(page.locator('#lb-panel')).not.toHaveClass(/hidden/);
});
