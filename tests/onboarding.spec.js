const { test, expect } = require('playwright/test');

test('first-run Vue onboarding persists its version and starts chapter one', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('onboarding-panel')).toContainText('患者指标');
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding-panel')).toContainText('细胞职责');
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding-panel')).toContainText('AI 病情卡');
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding-panel')).toContainText('稳定通关');
  await page.getByTestId('onboarding-start').click();
  await expect(page).toHaveURL(/preview=1&engine=phaser/);
  await expect(page.getByTestId('phaser-case-runtime').locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cellQuest_onboardingVersion'))).toBe('1');
});
