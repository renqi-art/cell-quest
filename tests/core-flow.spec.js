const { test, expect } = require('playwright/test');

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test('first unlocked level enters gameplay without page errors', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/');
  await page.getByRole('button', { name: '🆕 新的游戏' }).click();
  await page.locator('.level-card:not(.locked)').click();

  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.keyboard.press('p');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);
  await page.locator('#btn-quit').click();
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);
  expect(errors).toEqual([]);
});

test('hub tools respond without page errors', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/');
  await page.getByRole('button', { name: '🆕 新的游戏' }).click();

  await page.getByRole('button', { name: '📖 角色图鉴' }).click();
  await expect(page.locator('#pedia-screen')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: '返回关卡选择' }).click();

  await page.getByRole('button', { name: '🎖️ 成就' }).click();
  await expect(page.locator('#achs-panel')).toBeVisible();
  await page.locator('#achs-panel').getByRole('button', { name: '关闭' }).click();

  await page.getByRole('button', { name: '👥 双人模式: OFF' }).click();
  await expect(page.getByRole('button', { name: '👥 双人模式: ON' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('editor templates load without reference errors', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/editor.html');
  await page.locator('#templateSelect').selectOption('basicPlatform');

  await expect(page.locator('#levelName')).toHaveValue('基础平台');
  expect(errors).toEqual([]);
});
