const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('six-chapter Vue campaign starts an official case in Phaser', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-campaign').click();
  await expect(page.locator('[data-case-chapter]')).toHaveCount(6);
  await expect(page.locator('[data-case-chapter="1"]')).toContainText('擦伤');
  await expect(page.locator('[data-case-chapter="6"]')).toContainText('康复');

  await page.locator('[data-case-chapter="1"] [data-testid="start-official-case"]').click();
  await expect(page).toHaveURL(/preview=1&engine=phaser/);
  await expect(page.getByTestId('case-preview-banner')).toContainText('第一章');
  await expect(page.getByTestId('phaser-case-runtime').locator('canvas')).toBeVisible();
  await expect(page.locator('.case-hud')).toBeVisible();
});
