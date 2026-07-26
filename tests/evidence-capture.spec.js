const path = require('node:path');
const { test, expect } = require('playwright/test');

const screenshots = path.resolve(__dirname, '..', 'docs', 'evidence', 'screenshots');

test('capture current candidate evidence surfaces', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cellQuest_onboardingVersion', '1'));
  await page.goto('/');
  await page.getByTestId('open-campaign').click();
  await expect(page.getByRole('dialog', { name: '六章病例战役' })).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'campaign.png'), fullPage: true });

  await page.locator('[data-case-chapter="1"] [data-testid="start-official-case"]').click();
  await expect(page.getByTestId('phaser-case-runtime').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('director-crisis-card')).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'phaser-case.png'), fullPage: true });

  await page.goto('/editor.html');
  await expect(page.locator('#vue-editor-root')).toHaveAttribute('data-vue-mounted', 'true');
  await page.screenshot({ path: path.join(screenshots, 'vue-case-designer.png'), fullPage: true });
});
