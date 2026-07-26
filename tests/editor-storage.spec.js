const { test, expect } = require('playwright/test');

async function createBlankCase(page) {
  await page.getByTestId('wizard-next').click();
  await page.locator('[data-template="manual"]').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('create-case').click();
}

test('Vue editor merges legacy levels into the active slot without loss', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '0');
    localStorage.setItem('cellQuest_customLevels', JSON.stringify([{ name: 'legacy level', map: ['   '] }]));
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{ name: 'current level', map: ['###'] }]));
  });

  await page.goto('/editor.html');
  await expect(page.getByTestId('case-title')).toHaveValue('current level');

  const storage = await page.evaluate(() => ({
    drafts: JSON.parse(localStorage.getItem('cellQuest_caseDrafts_v1_slot_0') || '[]'),
    globalLegacy: localStorage.getItem('cellQuest_customLevels'),
    slotLegacy: localStorage.getItem('cellQuest_customLevels_0'),
  }));
  expect(storage.drafts.map(draft => draft.metadata.title)).toEqual(['current level', 'legacy level']);
  expect(storage.globalLegacy).toBeNull();
  expect(storage.slotLegacy).toBeNull();
});

test('Vue editor saves a case draft into the active game slot', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '2');
  });
  await page.goto('/editor.html');
  await createBlankCase(page);

  await page.getByTestId('case-title').fill('槽位测试病例');
  await page.getByTestId('case-title').press('Tab');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  const drafts = await page.evaluate(() => JSON.parse(localStorage.getItem('cellQuest_caseDrafts_v1_slot_2') || '[]'));
  expect(drafts).toHaveLength(1);
  expect(drafts[0].metadata.title).toBe('槽位测试病例');
});
