const { test, expect } = require('playwright/test');

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('legacy game, editor, and deck entry points remain available', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/');
  await expect(page.locator('#vue-game-root')).toHaveAttribute('data-vue-mounted', 'true');
  await expect(page.locator('#main-menu')).toBeVisible();
  await page.locator('#btn-start').click();
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);

  await page.goto('/editor.html');
  await expect(page.locator('#vue-editor-root')).toHaveAttribute('data-vue-mounted', 'true');
  await expect(page.locator('[data-testid="case-designer"]')).toBeVisible();

  await page.goto('/deck.html');
  await expect(page.locator('#vue-deck-root')).toHaveAttribute('data-vue-mounted', 'true');
  await expect(page.locator('body')).not.toBeEmpty();
  const levelsResponse = await page.request.get('/levels');
  expect(levelsResponse.ok()).toBe(true);

  expect(errors).toEqual([]);
});

test('legacy level selection, pause, and return flow remains stable', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/');
  await page.locator('#btn-start').click();
  await page.locator('.level-card:not(.locked)').first().click();
  await expect(page.locator('#hud')).toHaveClass(/active/);

  await page.keyboard.press('p');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);
  await page.locator('#btn-quit').click();
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);

  expect(errors).toEqual([]);
});
