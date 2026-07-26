const { test, expect } = require('playwright/test');

test('development deployment exposes entries, health, and local-director Phaser play', async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem('cellQuest_onboardingVersion', '1'));
  const health = await request.get('/healthz');
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({ ok: true, service: 'cell-quest', version: '4.0.0' });
  await page.goto('/');
  await expect(page.getByTestId('open-campaign')).toBeVisible();
  await page.goto('/editor.html');
  await expect(page.locator('#vue-editor-root')).toHaveAttribute('data-vue-mounted', 'true');
  await page.goto('/');
  await page.getByTestId('open-campaign').click();
  await page.locator('[data-case-chapter="1"] [data-testid="start-official-case"]').click();
  await expect(page.getByTestId('phaser-case-runtime').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('director-crisis-card')).toContainText(/本地导演|在线 AI/);
});
