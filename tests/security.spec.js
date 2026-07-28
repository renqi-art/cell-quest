const { test, expect } = require('playwright/test');


test('browser removes legacy AI secrets and never calls the model upstream directly', async ({ page }) => {
  const upstreamRequests = [];

  await page.route('https://api.deepseek.com/**', async route => {
    upstreamRequests.push(route.request().url());
    await route.abort();
  });
  await page.route('**/api/ai-config', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { configured: true, source: 'runtime' } });
    }
    expect(route.request().postDataJSON()).toEqual({ apiKey: 'runtime-secret' });
    return route.fulfill({ json: { ok: true, configured: true, source: 'runtime' } });
  });
  await page.route('**/api/generate-map', async route => {
    const { width, height } = route.request().postDataJSON();
    const map = Array.from({ length: height }, () => ' '.repeat(width));
    map[height - 2] = `  P${' '.repeat(width - 6)}F  `;
    map[height - 1] = '#'.repeat(width);
    return route.fulfill({
      json: {
        ok: true,
        source: 'ai',
        level: {
          name: '安全回归地图',
          cellType: 1,
          winCondition: 'killAll',
          width,
          height,
          map,
        },
        blueprint: { theme: '安全回归', difficulty: 'normal' },
      },
    });
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cellQuest_ds_key', 'legacy-browser-secret'));
  await page.reload();

  await page.goto('/editor.html');
  await page.getByTestId('open-ai-map').click();
  await page.getByTestId('ai-map-prompt').fill('security-test');
  await page.getByTestId('generate-ai-map').click();
  await expect(page.getByTestId('ai-map-preview')).toBeVisible();

  await page.goto('/ai-settings.html');
  await page.getByTestId('ai-api-key').fill('runtime-secret');
  await page.getByTestId('save-ai-key').click();

  expect(upstreamRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('cellQuest_ds_key'))).toBeNull();
  expect(await page.evaluate(() => Object.values(localStorage).join(''))).not.toContain('runtime-secret');
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

test('classic editor renders migrated titles as option text without executing HTML', async ({ page }) => {
  const maliciousTitle = '<img src=x onerror=window.__editorStoredXss=1>';
  await page.addInitScript(title => {
    localStorage.clear();
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{
      name: title,
      width: 20,
      map: Array(10).fill(' '.repeat(20)),
    }]));
  }, maliciousTitle);
  await page.goto('/editor.html');
  await expect(page.locator('#levelSelect option[value="custom_0"]')).toHaveText(`📝 ${maliciousTitle}`);
  expect(await page.locator('#levelSelect img').count()).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__editorStoredXss || 0)).toBe(0);
});

test('classic export contains hostile titles only as inert encoded data', async ({ page }) => {
  const payload = '*/ window.__generatedCodeExecuted=1; /*';
  await page.goto('/editor.html');
  const code = await page.evaluate(title => {
    document.getElementById('levelName').value = title;
    exportMap();
    return document.getElementById('exportText').value;
  }, payload);
  const serializedTitle = code.match(/name:\s*("(?:\\.|[^"\\])*")/)?.[1];

  expect(JSON.parse(serializedTitle)).toBe(payload);
  expect(code).not.toContain(payload);
  expect(await page.evaluate(() => window.__generatedCodeExecuted || 0)).toBe(0);
});

test('classic export and import preserve escaped Unicode titles', async ({ page }) => {
  const name = '中文 "quote" \\ slash';
  await page.goto('/editor.html');
  const restoredName = await page.evaluate(title => {
    document.getElementById('levelName').value = title;
    exportMap();
    const code = document.getElementById('exportText').value;
    document.getElementById('levelName').value = 'stale name';
    document.getElementById('importText').value = code;
    doImport();
    return document.getElementById('levelName').value;
  }, name);

  expect(restoredName).toBe(name);
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

test('classic editor import rejects code-shaped and unknown CQ2 payloads without execution', async ({ page }) => {
  const dialogMessages = [];
  page.on('dialog', async dialog => {
    dialogMessages.push(dialog.message());
    await dialog.dismiss();
  });
  await page.goto('/editor.html');
  const maliciousCode = await page.evaluate(() => {
    const payload = { v: 2, script: 'window.__editorImportExecuted=1', map: ['###'] };
    return 'CQ2!' + btoa(JSON.stringify(payload)).replace(/=+$/, '');
  });
  await page.evaluate(code => {
    document.getElementById('importText').value = code;
    doImport();
  }, maliciousCode);

  expect(dialogMessages).toContain('未找到 map 数组');
  expect(await page.evaluate(() => window.__editorImportExecuted || 0)).toBe(0);
});
