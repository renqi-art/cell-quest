const { test, expect } = require('playwright/test');
async function routeSameOriginApi(page, testInfo, pathname, handler) {
  const expectedUrl = new URL(pathname, testInfo.project.use.baseURL);
  await page.route(expectedUrl.href, async route => {
    const actualUrl = new URL(route.request().url());
    expect(actualUrl.origin).toBe(expectedUrl.origin);
    expect(actualUrl.pathname).toBe(pathname);
    expect(actualUrl.search).toBe('');
    await handler(route);
  });
  return expectedUrl;
}


test('browser removes legacy AI secrets and never calls the model upstream directly', async ({ page }, testInfo) => {
  const upstreamRequests = [];
  let settingsPostCount = 0;

  const configUrl = await routeSameOriginApi(page, testInfo, '/api/ai-config', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { configured: true, source: 'runtime' } });
    }
    expect(route.request().method()).toBe('POST');
    settingsPostCount += 1;
    expect(route.request().postDataJSON()).toEqual({ apiKey: 'runtime-secret' });
    return route.fulfill({ json: { ok: true, configured: true, source: 'runtime' } });
  });
  await routeSameOriginApi(page, testInfo, '/api/generate-map', async route => {
    expect(route.request().method()).toBe('POST');
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
  await page.route('https://api.deepseek.com/**', async route => {
    upstreamRequests.push(route.request().url());
    await route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem('cellQuest_ds_key', 'legacy-browser-secret');
  });

  await page.goto('/editor.html');
  expect(await page.evaluate(() => localStorage.getItem('cellQuest_ds_key'))).toBeNull();
  await page.getByTestId('open-ai-map').click();
  await page.getByTestId('ai-map-prompt').fill('security-test');
  await page.getByTestId('generate-ai-map').click();
  await expect(page.getByTestId('ai-map-preview')).toBeVisible();

  await page.goto('/ai-settings.html');
  expect(await page.evaluate(() => localStorage.getItem('cellQuest_ds_key'))).toBeNull();
  await page.getByTestId('ai-api-key').fill('runtime-secret');
  const settingsPost = page.waitForRequest(request => (
    request.url() === configUrl.href && request.method() === 'POST'
  ));
  await page.getByTestId('save-ai-key').click();
  const settingsRequest = await settingsPost;
  expect(settingsRequest.postDataJSON()).toEqual({ apiKey: 'runtime-secret' });
  await expect.poll(() => settingsPostCount).toBe(1);

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

test('classic editor import does not execute expressions in extra config', async ({ page }) => {
  const map = Array.from({ length: 10 }, (_, row) => (
    row === 8 ? ` P${' '.repeat(16)}F ` : ' '.repeat(20)
  ));
  const expressions = [
    '(()=>{globalThis.__editorImportExecuted=1;return {}})()',
    'globalThis.__editorImportCall()',
    'function(){globalThis.__editorImportExecuted=1}',
    'Math.PI',
  ];
  const sources = expressions.map(expression => `const LEVEL_X = {
    name: "inert classic import",
    width: 20,
    cellType: 3,
    winCondition: WIN_COLLECT_ALL,
    map: [
      ${map.map(row => `${JSON.stringify(row)},`).join('\n      ')}
    ],
    pipeSpawners:[${expression}],
    tutorials: [],
    knowledgeCards: [],
  };`);

  await page.goto('/editor.html');
  const result = await page.evaluate(classicSources => {
    globalThis.__editorImportExecuted = 0;
    globalThis.__editorImportCall = () => {
      globalThis.__editorImportExecuted += 1;
      return {};
    };
    const imports = classicSources.map(classicSource => {
      document.getElementById('importText').value = classicSource;
      doImport();
      return {
        executed: globalThis.__editorImportExecuted,
        pipeSpawnerCount: editorPipeSpawners.length,
      };
    });
    delete globalThis.__editorImportCall;
    delete globalThis.__editorImportExecuted;
    return {
      imports,
      width: mapWidth,
      height: mapHeight,
      map: grid.map(row => row.join('')),
    };
  }, sources);

  expect(result.imports).toEqual(expressions.map(() => ({
    executed: 0,
    pipeSpawnerCount: 0,
  })));
  expect(result.width).toBe(20);
  expect(result.height).toBe(10);
  expect(result.map).toEqual(map);
});

test('classic editor import preserves supported literal extra config', async ({ page }) => {
  const source = `const LEVEL_X = {
    name: "literal compatibility",
    width: 20,
    map: [
      ${Array.from({ length: 10 }, () => `${JSON.stringify(' '.repeat(20))},`).join('\n      ')}
    ],
    pipeSpawners: [
      // Built-in levels use identifier keys and single-quoted strings.
      { col: 10, row: 9, dir: 'up_jump', trigger: 'proximity', range: 2, },
    ],
    tutorials: [
      { x: 600, useCurrent: true, body: 'line 1\\nline 2', },
    ],
    knowledgeCards: [
      /* Comments, null, double-quoted strings, and trailing commas are valid. */
      { x: 300, y: null, key: "alveoli", title: 'card', text: 'body', },
    ],
  };`;

  await page.goto('/editor.html');
  const result = await page.evaluate(classicSource => {
    document.getElementById('importText').value = classicSource;
    doImport();
    return {
      pipeSpawners: editorPipeSpawners,
      tutorials: editorTutorials,
      knowledgeCards: editorKnowledgeCards,
    };
  }, source);

  expect(result).toEqual({
    pipeSpawners: [
      { col: 10, row: 9, dir: 'up_jump', trigger: 'proximity', range: 2 },
    ],
    tutorials: [
      { x: 600, useCurrent: true, body: 'line 1\nline 2' },
    ],
    knowledgeCards: [
      { x: 300, y: null, key: 'alveoli', title: 'card', text: 'body' },
    ],
  });
});

test('classic editor loads actual built-in and exported extra config', async ({ page }) => {
  await page.goto('/editor.html');
  const result = await page.evaluate(async () => {
    const source = await fetch('/js/levels/level5_boss.js').then(response => response.text());
    doImportRaw(source);
    const builtIn = {
      pipeSpawners: editorPipeSpawners.map(item => ({ ...item })),
      tutorials: editorTutorials.map(item => ({ ...item })),
      knowledgeCards: editorKnowledgeCards.map(item => ({ ...item })),
    };

    exportMap();
    const exportedSource = document.getElementById('exportText').value;
    editorPipeSpawners = [];
    editorTutorials = [];
    editorKnowledgeCards = [];
    document.getElementById('importText').value = exportedSource;
    doImport();

    return {
      builtIn,
      exported: {
        pipeSpawners: editorPipeSpawners,
        tutorials: editorTutorials,
        knowledgeCards: editorKnowledgeCards,
      },
    };
  });

  expect(result.builtIn.pipeSpawners).toHaveLength(2);
  expect(result.builtIn.pipeSpawners[0]).toMatchObject({
    col: 30,
    row: 0,
    type: 'staph',
    interval: 360,
    trigger: 'timer',
    maxSpawn: 3,
  });
  expect(result.builtIn.tutorials).toHaveLength(1);
  expect(result.builtIn.knowledgeCards).toHaveLength(1);
  expect(result.exported.pipeSpawners).toHaveLength(2);
  expect(result.exported.tutorials).toHaveLength(1);
  expect(result.exported.knowledgeCards).toHaveLength(1);
});
