const { test, expect } = require('playwright/test');

test('browser removes legacy AI secrets and never calls the model upstream directly', async ({ page }) => {
  const upstreamRequests = [];
  await page.addInitScript(() => {
    localStorage.setItem('cellQuest_ds_key', 'legacy-browser-secret');
  });
  await page.route('https://api.deepseek.com/**', async route => {
    upstreamRequests.push(route.request().url());
    await route.abort();
  });

  await page.goto('/');
  await page.evaluate(async () => {
    if (typeof generateAIMap === 'function') {
      await generateAIMap('security-test');
    }
    if (typeof showAIGeneratePanel === 'function') {
      showAIGeneratePanel();
    }
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
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{
      name,
      icon: '🗺️',
      desc: 'security test',
      cellType: 3,
      winCondition: 'collectAll',
      width: 80,
      map: Array(15).fill(' '.repeat(80)),
    }]));
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
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{
      name: 'ranking fixture',
      icon,
      desc: 'security test',
      cellType: 3,
      winCondition: 'collectAll',
      width: 80,
      map: Array(15).fill(' '.repeat(80)),
    }]));
  }, maliciousIcon);

  await page.goto('/');
  await page.locator('#btn-menu-lb').click();

  await expect(page.locator('#lb-panel')).toContainText(maliciousIcon);
  await expect.poll(() => page.evaluate(() => window.__rankingXss || 0)).toBe(0);
});

test('editor renders saved knowledge-card text without executing HTML', async ({ page }) => {
  const maliciousTitle = '<img src=x onerror=window.__editorStoredXss=1>';
  await page.addInitScript(title => {
    localStorage.clear();
    localStorage.setItem('cellQuest_currentSlot', '0');
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{
      name: 'security fixture',
      width: 80,
      map: Array(15).fill(' '.repeat(80)),
      pipeSpawners: [],
      tutorials: [],
      knowledgeCards: [{ x: 1, key: 'wbc', title, text: 'body' }],
    }]));
  }, maliciousTitle);

  await page.goto('/editor.html');
  await page.waitForFunction(() => _customLevelCache.length === 1);
  await page.evaluate(() => loadCustomPreset(0));

  await expect(page.locator('#knowledgeCardList')).toContainText(maliciousTitle);
  await expect.poll(() => page.evaluate(() => window.__editorStoredXss || 0)).toBe(0);
});

test('exported level names cannot escape into executable source', async ({ page }) => {
  await page.goto('/editor.html');
  const payload = '*/ window.__generatedCodeExecuted=1; /*';
  await page.locator('#levelName').fill(payload);

  const executed = await page.evaluate(() => {
    exportMap();
    const code = document.querySelector('#exportText').value;
    window.__generatedCodeExecuted = 0;
    Function('window', 'WIN_COLLECT_ALL', 'C', code)(
      window,
      'collectAll',
      { sky2: '#000' }
    );
    return window.__generatedCodeExecuted;
  });

  expect(executed).toBe(0);
});

test('editor source export and import preserve escaped level names', async ({ page }) => {
  await page.goto('/editor.html');
  const name = '中文 "quote" \\ slash';
  await page.locator('#levelName').fill(name);

  const importedName = await page.evaluate(() => {
    exportMap();
    const code = document.querySelector('#exportText').value;
    document.querySelector('#levelName').value = 'stale name';
    doImportRaw(code);
    return document.querySelector('#levelName').value;
  });

  expect(importedName).toBe(name);
});

test('shared level imports reject invalid structure and oversized payloads', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(() => {
    const valid = {
      n: 'valid fixture',
      c: 3,
      w: 'collectAll',
      s: ['#123', '#abcdef'],
      m: Array(15).fill('PX_N'.padEnd(79, ' ') + 'F'),
    };
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

test('editor import parser never executes JavaScript expressions', async ({ page }) => {
  await page.goto('/editor.html');

  const result = await page.evaluate(() => {
    window.__editorImportExecuted = 0;
    parseExtraConfig(
      "pipeSpawners: [(()=>{window.__editorImportExecuted=1;return {col:1,row:1};})()], tutorials: [], knowledgeCards: [] },"
    );
    return {
      executed: window.__editorImportExecuted,
      pipeSpawners: editorPipeSpawners,
    };
  });

  expect(result.executed).toBe(0);
  expect(result.pipeSpawners).toEqual([]);
});

test('editor import parser still accepts data-only object literals', async ({ page }) => {
  await page.goto('/editor.html');

  const result = await page.evaluate(() => {
    parseExtraConfig(
      "pipeSpawners: [{ col:2, row:3, dir:'up', trigger:'timer' }], tutorials: [], knowledgeCards: [] },"
    );
    return editorPipeSpawners;
  });

  expect(result).toEqual([{ col: 2, row: 3, dir: 'up', trigger: 'timer' }]);
});
