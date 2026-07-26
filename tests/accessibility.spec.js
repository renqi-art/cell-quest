const { test, expect } = require('playwright/test');

test('Vue campaign and Phaser runtime expose keyboard and assistive labels', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cellQuest_onboardingVersion', '1'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const trigger = page.getByTestId('open-campaign');
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(page.getByRole('dialog', { name: '六章病例战役' })).toBeVisible();
  await expect(page.getByText('仅用于科普，不构成医疗建议。')).toBeVisible();
  await page.locator('[data-case-chapter="1"] [data-testid="start-official-case"]').click();
  const canvas = page.getByTestId('phaser-case-runtime').locator('canvas');
  await expect(canvas).toHaveAttribute('role', 'application');
  await expect(canvas).toHaveAttribute('aria-label', /病例场景/);
});
