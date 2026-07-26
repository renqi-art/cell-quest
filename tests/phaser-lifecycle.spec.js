const { test, expect } = require('playwright/test');

test('Phaser case runtime survives twenty enter/exit cycles without duplicate canvases', async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('cellQuest_onboardingVersion', '1'));

  for (let cycle = 0; cycle < 20; cycle += 1) {
    await page.goto('/');
    await page.getByTestId('open-campaign').click();
    await page.locator('[data-case-chapter="1"] [data-testid="start-official-case"]').click();
    const runtime = page.getByTestId('phaser-case-runtime');
    await expect(runtime.locator('canvas')).toHaveCount(1);
    await expect(runtime.locator('canvas')).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});

test('cooperative chapter creates two role-bound Phaser players', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cellQuest_onboardingVersion', '1'));
  await page.goto('/');
  await page.getByTestId('open-campaign').click();
  await page.locator('[data-case-chapter="5"] [data-testid="start-official-case"]').click();
  const canvas = page.getByTestId('phaser-case-runtime').locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-player-count', '2');
  await expect(canvas).toHaveAttribute('aria-label', /Phaser 病例场景/);
  await expect(canvas).toHaveAttribute('data-player-roles', 'rbc,wbc');
  await expect(page.getByTestId('case-role-panel')).toContainText('P1 红细胞');
  await page.getByTestId('swap-player-roles').click();
  await expect(canvas).toHaveAttribute('data-player-roles', 'wbc,rbc');
  await expect(page.getByTestId('case-role-panel')).toContainText('P1 白细胞');
});
