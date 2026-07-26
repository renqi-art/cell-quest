const { test, expect } = require('playwright/test');

test('legacy editor levels merge into slot zero without an old save', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '0');
    localStorage.setItem('cellQuest_customLevels', JSON.stringify([{
      name: 'legacy level',
      map: Array(15).fill(' '.repeat(80)),
    }]));
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{
      name: 'current level',
      map: Array(15).fill('#'.repeat(80)),
    }]));
  });

  await page.goto('/editor.html');

  const storage = await page.evaluate(() => ({
    levels: JSON.parse(localStorage.getItem('cellQuest_customLevels_0') || '[]'),
    legacy: localStorage.getItem('cellQuest_customLevels'),
  }));
  expect(storage.levels.map(level => level.name)).toEqual(['current level', 'legacy level']);
  expect(storage.legacy).toBeNull();
});

test('editor saves a custom level into the active game slot', async ({ page }) => {
  await page.goto('/editor.html');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '2');
  });

  await page.locator('#levelName').fill('槽位测试关卡');
  await page.getByRole('button', { name: '🎮 保存为自定义关卡' }).click();
  await page.getByPlaceholder('输入关卡名称...').fill('槽位测试关卡');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '✅ 保存' }).click();

  const storage = await page.evaluate(() => ({
    slotLevels: JSON.parse(localStorage.getItem('cellQuest_customLevels_2') || '[]'),
    legacyLevels: localStorage.getItem('cellQuest_customLevels'),
  }));

  expect(storage.slotLevels).toHaveLength(1);
  expect(storage.slotLevels[0].name).toBe('槽位测试关卡');
  expect(storage.legacyLevels).toBeNull();
});
