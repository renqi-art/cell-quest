const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('validated Vue case launches in the real game adapter with the patient HUD', async ({ page }) => {
  await page.goto('/editor.html');
  await page.getByTestId('wizard-next').click();
  await page.locator('[data-template="rbc-transport"]').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('create-case').click();
  await page.getByTestId('open-playtest').click();

  const popupPromise = page.waitForEvent('popup');
  await page.getByTestId('launch-playtest').click();
  const preview = await popupPromise;
  await preview.waitForLoadState('load');

  await expect(preview).toHaveURL(/preview=1/);
  await expect(preview.getByTestId('case-preview-banner')).toContainText('氧气运输');
  await expect(preview.locator('.case-hud')).toBeVisible();
  await expect(preview.locator('.case-objective')).toContainText('供氧');
  await expect(preview.getByTestId('director-crisis-card')).toContainText(/AI 导演|本地导演/);
  await expect(preview.getByTestId('director-crisis-card')).toContainText('阶段 1');
});


test('the same Vue case runs through the Phaser GameEngine vertical slice', async ({ page }) => {
  await page.goto('/editor.html');
  await page.getByTestId('wizard-next').click();
  await page.locator('[data-template="wbc-infection"]').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('create-case').click();
  await page.getByTestId('open-playtest').click();
  await page.getByTestId('runtime-phaser').check();

  const popupPromise = page.waitForEvent('popup');
  await page.getByTestId('launch-playtest').click();
  const preview = await popupPromise;
  await preview.waitForLoadState('load');

  await expect(preview).toHaveURL(/engine=phaser/);
  await expect(preview.getByTestId('case-preview-banner')).toContainText('感染清除');
  await expect(preview.getByTestId('phaser-case-runtime').locator('canvas')).toBeVisible();
  await expect(preview.locator('.case-hud')).toBeVisible();
});
