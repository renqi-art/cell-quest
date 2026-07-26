const { test, expect } = require('playwright/test');

async function createBlankCase(page) {
  await page.getByTestId('wizard-next').click();
  await page.locator('[data-template="manual"]').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('create-case').click();
}

async function setCaseTitle(page, value) {
  await page.getByTestId('case-title').fill(value);
  await page.getByTestId('case-title').press('Tab');
}

test('browser removes legacy AI secrets and never calls the model upstream directly', async ({ page }) => {
  const upstreamRequests = [];
  await page.addInitScript(() => localStorage.setItem('cellQuest_ds_key', 'legacy-browser-secret'));
  await page.route('https://api.deepseek.com/**', async route => {
    upstreamRequests.push(route.request().url());
    await route.abort();
  });

  await page.goto('/');
  await page.evaluate(async () => {
    if (typeof generateAIMap === 'function') await generateAIMap('security-test');
    if (typeof showAIGeneratePanel === 'function') showAIGeneratePanel();
  });

  expect(await page.evaluate(() => localStorage.getItem('cellQuest_ds_key'))).toBeNull();
  expect(await page.evaluate(() => typeof window.getDeepSeekKey)).toBe('undefined');
  expect(await page.evaluate(() => typeof window.setDeepSeekKey)).toBe('undefined');
  await expect(page.locator('#ai-panel')).not.toContainText(/API Key|DeepSeek Key/);
  expect(upstreamRequests).toEqual([]);
});

test('custom level names render as text instead of executable HTML', async ({ page }) => {
  const maliciousName = '<svg onload=window.__customLevelXss=1>';
  await page.addInitScript(name => {
    localStorage.clear();
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{ name, icon: '🗺️', desc: 'security test', cellType: 3, winCondition: 'collectAll', width: 80, map: Array(15).fill(' '.repeat(80)) }]));
  }, maliciousName);
  await page.goto('/');
  await page.locator('#btn-start').click();
  await page.locator('#tab-custom').click();
  await expect(page.locator('#level-grid')).toContainText(maliciousName);
  await expect.poll(() => page.evaluate(() => window.__customLevelXss || 0)).toBe(0);
});

test('leaderboard renders custom icons as text instead of HTML', async ({ page }) => {
  const maliciousIcon = '<svg onload=window.__rankingXss=1>';
  await page.addInitScript(icon => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '0');
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{ name: 'ranking fixture', icon, desc: 'security test', cellType: 3, winCondition: 'collectAll', width: 80, map: Array(15).fill(' '.repeat(80)) }]));
  }, maliciousIcon);
  await page.goto('/');
  await page.locator('#btn-menu-lb').click();
  await expect(page.locator('#lb-panel')).toContainText(maliciousIcon);
  await expect.poll(() => page.evaluate(() => window.__rankingXss || 0)).toBe(0);
});

test('Vue editor renders migrated titles as values without executing HTML', async ({ page }) => {
  const maliciousTitle = '<img src=x onerror=window.__editorStoredXss=1>';
  await page.addInitScript(title => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '0');
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{ name: title, map: ['###'] }]));
  }, maliciousTitle);
  await page.goto('/editor.html');
  await expect(page.getByTestId('case-title')).toHaveValue(maliciousTitle);
  await expect.poll(() => page.evaluate(() => window.__editorStoredXss || 0)).toBe(0);
});

test('CQ2 export contains hostile titles only as inert encoded data', async ({ page }) => {
  const payload = '*/ window.__generatedCodeExecuted=1; /*';
  await page.goto('/editor.html');
  await createBlankCase(page);
  await setCaseTitle(page, payload);
  await page.getByTestId('open-share').click();
  await page.getByTestId('export-case').click();
  const code = await page.getByTestId('case-code').inputValue();
  expect(code).toMatch(/^CQ2!/);
  expect(code).not.toContain(payload);
  expect(await page.evaluate(() => window.__generatedCodeExecuted || 0)).toBe(0);
});

test('CQ2 export and import preserve escaped Unicode titles', async ({ page }) => {
  const name = '中文 "quote" \ slash';
  await page.goto('/editor.html');
  await createBlankCase(page);
  await setCaseTitle(page, name);
  await page.getByTestId('open-share').click();
  await page.getByTestId('export-case').click();
  const code = await page.getByTestId('case-code').inputValue();
  await page.getByRole('button', { name: '关闭' }).click();

  await setCaseTitle(page, 'stale name');
  await page.getByTestId('open-share').click();
  await page.getByTestId('case-code').fill(code);
  await page.getByTestId('import-case').click();
  await expect(page.getByTestId('case-title')).toHaveValue(name);
});

test('shared classic level imports reject invalid structure and oversized payloads', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const valid = { n: 'valid fixture', c: 3, w: 'collectAll', s: ['#123', '#abcdef'], m: Array(15).fill('PX_N'.padEnd(79, ' ') + 'F') };
    const encode = pack => 'CQ!' + btoa(JSON.stringify(pack)).replace(/=+$/, '');
    const invalid = [
      { ...valid, m: ['@'] },
      { ...valid, c: 2 },
      { ...valid, w: 'executeEverything' },
      { ...valid, s: ['red', 'url(javascript:alert(1))'] },
      { ...valid, n: 'x'.repeat(250_000) },
    ].map(pack => importLevelCode(encode(pack)).error || null);
    const accepted = importLevelCode(encode(valid));
    return { invalid, accepted };
  });
  expect(result.invalid.every(Boolean)).toBe(true);
  expect(result.accepted.error).toBeUndefined();
  expect(result.accepted.map).toHaveLength(15);
});

test('Vue editor import rejects code-shaped and unknown CQ2 payloads without execution', async ({ page }) => {
  await page.goto('/editor.html');
  await createBlankCase(page);
  await page.getByTestId('open-share').click();
  const maliciousCode = await page.evaluate(() => {
    const payload = { v: 2, script: 'window.__editorImportExecuted=1', map: ['###'] };
    return 'CQ2!' + btoa(JSON.stringify(payload)).replace(/=+$/, '');
  });
  await page.getByTestId('case-code').fill(maliciousCode);
  await page.getByTestId('import-case').click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => window.__editorImportExecuted || 0)).toBe(0);
});
