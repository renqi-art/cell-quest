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
});
