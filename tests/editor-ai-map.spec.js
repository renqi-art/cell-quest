const { test, expect } = require('playwright/test');

function generatedFixture(width, height, overrides = {}) {
  const rows = Array.from({ length: height }, () => ' '.repeat(width));
  const penultimate = Array.from(rows[height - 2]);
  penultimate[2] = 'P';
  penultimate[width - 3] = 'F';
  rows[height - 2] = penultimate.join('');
  rows[height - 1] = '#'.repeat(width);
  return {
    ok: true,
    source: 'ai',
    level: {
      name: '免疫追击',
      cellType: 1,
      winCondition: 'killAll',
      width,
      height,
      map: rows,
      ...overrides.level,
    },
    blueprint: {
      theme: '血液感染',
      difficulty: 'normal',
      ...overrides.blueprint,
    },
  };
}

async function stubClassicLevels(page) {
  await page.route('**/js/levels/*.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'const LEVEL_0 = { name: "fixture", width: 20, map: ["####################"] };',
  }));
}

async function openConfiguredDialog(page) {
  await page.route('**/api/ai-config', route => route.fulfill({
    json: { configured: true, source: 'runtime' },
  }));
  await page.goto('/editor.html');
  await page.getByTestId('open-ai-map').click();
  await expect(page.getByTestId('generate-ai-map')).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
  await stubClassicLevels(page);
  await page.addInitScript(() => localStorage.clear());
});

test('unconfigured status navigates to AI settings with the classic editor return path', async ({ page }) => {
  await page.route('**/api/ai-config', route => route.fulfill({
    json: { configured: false, source: 'none' },
  }));
  page.on('dialog', dialog => dialog.accept());

  await page.goto('/editor.html');
  await page.getByTestId('open-ai-map').click();

  await expect(page).toHaveURL(/\/ai-settings\.html\?return=%2Feditor\.html$/);
});

test('uses current dimensions and does not mutate before confirmation', async ({ page }) => {
  const upstreamRequests = [];
  page.on('request', request => {
    if (request.url().startsWith('https://api.deepseek.com/')) upstreamRequests.push(request.url());
  });
  await page.route('**/api/ai-config', route => route.fulfill({
    json: { configured: true, source: 'runtime' },
  }));
  await page.route('**/api/generate-map', async route => {
    expect(route.request().postDataJSON()).toEqual({ prompt: '血液感染', width: 42, height: 18 });
    return route.fulfill({ json: generatedFixture(42, 18) });
  });
  await page.goto('/editor.html');
  await page.getByTestId('open-ai-map').click();
  await page.locator('#mapWidth').fill('42');
  await page.locator('#mapHeight').fill('18');
  await page.getByTestId('ai-map-prompt').fill('血液感染');
  const before = await page.evaluate(() => grid.map(row => row.join('')));

  await page.getByTestId('generate-ai-map').click();

  await expect(page.getByTestId('ai-map-preview')).toBeVisible();
  expect(await page.evaluate(() => grid.map(row => row.join('')))).toEqual(before);
  await page.getByTestId('apply-ai-map').click();
  expect(await page.evaluate(() => [mapWidth, mapHeight])).toEqual([42, 18]);
  expect(upstreamRequests).toEqual([]);
});

test('cancel after preview preserves the original grid', async ({ page }) => {
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(30, 12),
  }));
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('30');
  await page.locator('#mapHeight').fill('12');
  await page.getByTestId('ai-map-prompt').fill('取消预览');
  const before = await page.evaluate(() => grid.map(row => row.join('')));

  await page.getByTestId('generate-ai-map').click();
  await expect(page.getByTestId('ai-map-preview')).toBeVisible();
  await page.getByTestId('cancel-ai-map').click();

  expect(await page.evaluate(() => grid.map(row => row.join('')))).toEqual(before);
  await expect(page.locator('#aiMapModal')).not.toHaveClass(/show/);
});

test('AI_AUTH_FAILED displays an error and preserves the grid', async ({ page }) => {
  await page.route('**/api/generate-map', route => route.fulfill({
    status: 401,
    json: { ok: false, code: 'AI_AUTH_FAILED', error: 'API Key 无效或无权限' },
  }));
  await openConfiguredDialog(page);
  await page.getByTestId('ai-map-prompt').fill('鉴权失败');
  const before = await page.evaluate(() => grid.map(row => row.join('')));

  await page.getByTestId('generate-ai-map').click();

  await expect(page.locator('#aiMapError')).toContainText('API Key 无效或无权限');
  expect(await page.evaluate(() => grid.map(row => row.join('')))).toEqual(before);
  await expect(page.getByTestId('apply-ai-map')).toBeHidden();
});

test('applied metadata is used by custom-level save and both code exports', async ({ page }) => {
  let savedCode = '';
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(28, 14),
  }));
  await page.route('**/save', async route => {
    savedCode = route.request().postDataJSON().code;
    await route.fulfill({ json: { ok: true } });
  });
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('28');
  await page.locator('#mapHeight').fill('14');
  await page.getByTestId('ai-map-prompt').fill('元数据');
  await page.getByTestId('generate-ai-map').click();
  await page.getByTestId('apply-ai-map').click();

  const exportedCode = await page.evaluate(() => {
    exportMap();
    return document.getElementById('exportText').value;
  });
  await page.evaluate(() => saveLevel());
  await expect.poll(() => savedCode).toContain('cellType: 1');
  await page.evaluate(() => {
    document.getElementById('customLevelName').value = 'AI 元数据关卡';
    doSaveToGame();
  });
  const customLevel = await page.evaluate(() => {
    const levels = JSON.parse(localStorage.getItem('cellQuest_customLevels_0'));
    return levels.at(-1);
  });

  expect(exportedCode).toContain('cellType: 1');
  expect(exportedCode).toContain('winCondition: WIN_KILL_ALL');
  expect(savedCode).toContain('cellType: 1');
  expect(savedCode).toContain('winCondition: WIN_KILL_ALL');
  expect(customLevel.cellType).toBe(1);
  expect(customLevel.winCondition).toBe('killAll');
});

test('closing the dialog aborts a signaled active generation request', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAbortController = window.AbortController;
    const nativeFetch = window.fetch.bind(window);
    window.__aiAbortCount = 0;
    window.__aiGenerateSignalSeen = false;
    window.fetch = (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (new URL(url, location.href).pathname === '/api/generate-map') {
        window.__aiGenerateSignalSeen = init.signal instanceof AbortSignal;
      }
      return nativeFetch(input, init);
    };
    window.AbortController = class extends NativeAbortController {
      abort(...args) {
        window.__aiAbortCount += 1;
        return super.abort(...args);
      }
    };
  });
  await page.route('**/api/generate-map', async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!route.request().failure()) {
      await route.fulfill({ json: generatedFixture(20, 10) });
    }
  });
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('20');
  await page.locator('#mapHeight').fill('10');
  await page.getByTestId('ai-map-prompt').fill('abort request');

  const generation = page.getByTestId('generate-ai-map').click();
  await page.waitForRequest('**/api/generate-map');
  await page.getByTestId('cancel-ai-map').click();
  await generation;

  expect(await page.evaluate(() => window.__aiGenerateSignalSeen)).toBe(true);
  expect(await page.evaluate(() => window.__aiAbortCount)).toBe(1);
});

test('AI-controlled names and summaries render as inert text', async ({ page }) => {
  const maliciousName = '<img src=x onerror=window.__aiNameXss=1>';
  const maliciousTheme = '<svg onload=window.__aiThemeXss=1>';
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(20, 10, {
      level: { name: maliciousName },
      blueprint: { theme: maliciousTheme },
    }),
  }));
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('20');
  await page.locator('#mapHeight').fill('10');
  await page.getByTestId('ai-map-prompt').fill('安全文本');

  await page.getByTestId('generate-ai-map').click();

  await expect(page.locator('#aiMapName')).toHaveText(maliciousName);
  await expect(page.locator('#aiMapSummary')).toContainText(maliciousTheme);
  expect(await page.locator('#aiMapResult img, #aiMapResult svg').count()).toBe(0);
  expect(await page.evaluate(() => [window.__aiNameXss || 0, window.__aiThemeXss || 0])).toEqual([0, 0]);
});

test('serializes every applied AI name code unit in export and save source', async ({ page }) => {
  const modelName = '*/alert(1)/*';
  let savedCode = '';
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(20, 10, { level: { name: modelName } }),
  }));
  await page.route('**/save', async route => {
    savedCode = route.request().postDataJSON().code;
    await route.fulfill({ json: { ok: true } });
  });
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('20');
  await page.locator('#mapHeight').fill('10');
  await page.getByTestId('ai-map-prompt').fill('safe export');
  await page.getByTestId('generate-ai-map').click();
  await page.getByTestId('apply-ai-map').click();

  const exportedCode = await page.evaluate(() => {
    exportMap();
    return document.getElementById('exportText').value;
  });
  await page.evaluate(() => saveLevel());
  await expect.poll(() => savedCode).not.toBe('');

  for (const code of [exportedCode, savedCode]) {
    const serializedName = code.match(/name:\s*("(?:\\.|[^"\\])*")/)?.[1];
    expect(JSON.parse(serializedName)).toBe(modelName);
    expect(serializedName).toMatch(/^"(?:\\u[0-9a-f]{4})+"$/);
    expect(code).not.toContain(modelName);
    expect(code).not.toContain(`/* ${modelName} */`);
    expect(code).not.toMatch(/^\/\*/);
  }
});

test('shows a visible error and keeps generation disabled when AI configuration is invalid', async ({ page }) => {
  await page.route('**/api/ai-config', route => route.fulfill({
    status: 502,
    contentType: 'text/plain',
    body: 'not-json',
  }));
  await page.goto('/editor.html');

  await page.getByTestId('open-ai-map').click();

  await expect(page.locator('#aiMapModal')).toHaveClass(/show/);
  await expect(page.locator('#aiMapError')).toBeVisible();
  await expect(page.locator('#aiMapError')).toHaveText('无法检查 AI 配置状态');
  await expect(page.getByTestId('generate-ai-map')).toBeDisabled();
});

test('reset after AI apply restores the complete prior editor state only once', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(20, 10),
  }));
  await openConfiguredDialog(page);
  const before = await page.evaluate(() => {
    mapWidth = 20;
    mapHeight = 10;
    grid = Array.from({ length: 10 }, (_, row) => (
      Array.from({ length: 20 }, (_, col) => (row === 8 && col === 1 ? 'P' : ' '))
    ));
    document.getElementById('mapWidth').value = '20';
    document.getElementById('mapHeight').value = '10';
    document.getElementById('levelName').value = 'original level';
    editorCellType = 3;
    editorWinCondition = 'collectAll';
    editorPipeSpawners = [{ col: 4, row: 5, trigger: 'timer' }];
    editorKnowledgeCards = [{ x: 8, key: 'wbc', title: 'card', text: 'body' }];
    editorTutorials = [{ x: 2, body: 'tutorial' }];
    currentCustomIdx = 2;
    document.getElementById('customActions').style.display = 'inline';
    draw();
    return {
      grid: grid.map(row => row.join('')),
      name: document.getElementById('levelName').value,
      cellType: editorCellType,
      winCondition: editorWinCondition,
      pipeSpawners: editorPipeSpawners,
      knowledgeCards: editorKnowledgeCards,
      tutorials: editorTutorials,
      currentCustomIdx,
      customActions: document.getElementById('customActions').style.display,
    };
  });
  await page.getByTestId('ai-map-prompt').fill('temporary AI level');
  await page.getByTestId('generate-ai-map').click();
  await page.getByTestId('apply-ai-map').click();

  await page.evaluate(() => resetLevel());

  const restored = await page.evaluate(() => ({
    grid: grid.map(row => row.join('')),
    name: document.getElementById('levelName').value,
    cellType: editorCellType,
    winCondition: editorWinCondition,
    pipeSpawners: editorPipeSpawners,
    knowledgeCards: editorKnowledgeCards,
    tutorials: editorTutorials,
    currentCustomIdx,
    customActions: document.getElementById('customActions').style.display,
  }));
  expect(restored).toEqual(before);

  await page.evaluate(() => {
    document.getElementById('levelName').value = 'after reset';
    editorCellType = 1;
    editorWinCondition = 'killAll';
    editorPipeSpawners = [];
    document.getElementById('customActions').style.display = 'none';
    resetLevel();
  });
  expect(await page.evaluate(() => ({
    name: document.getElementById('levelName').value,
    cellType: editorCellType,
    winCondition: editorWinCondition,
    pipeSpawners: editorPipeSpawners,
    customActions: document.getElementById('customActions').style.display,
  }))).toEqual({
    name: 'after reset',
    cellType: 1,
    winCondition: 'killAll',
    pipeSpawners: [],
    customActions: 'none',
  });
});

test('manual import round-trips exported cell and win-condition metadata', async ({ page }) => {
  await page.goto('/editor.html');

  const result = await page.evaluate(() => {
    mapWidth = 20;
    mapHeight = 10;
    grid = Array.from({ length: 10 }, () => Array(20).fill(' '));
    document.getElementById('mapWidth').value = '20';
    document.getElementById('mapHeight').value = '10';
    document.getElementById('levelName').value = 'metadata round trip';
    editorCellType = 1;
    editorWinCondition = 'killAll';
    exportMap();
    const firstExport = document.getElementById('exportText').value;
    document.getElementById('levelName').value = 'stale name';
    editorCellType = 3;
    editorWinCondition = 'collectAll';
    document.getElementById('importText').value = firstExport;
    doImport();
    exportMap();
    return {
      name: document.getElementById('levelName').value,
      cellType: editorCellType,
      winCondition: editorWinCondition,
      secondExport: document.getElementById('exportText').value,
    };
  });

  expect(result.name).toBe('metadata round trip');
  expect(result.cellType).toBe(1);
  expect(result.winCondition).toBe('killAll');
  expect(result.secondExport).toContain('cellType: 1');
  expect(result.secondExport).toContain('winCondition: WIN_KILL_ALL');
});

test('malformed successful generation remains temporary and cannot be applied', async ({ page }) => {
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(20, 10, { level: { map: Array(10).fill('short') } }),
  }));
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('20');
  await page.locator('#mapHeight').fill('10');
  await page.getByTestId('ai-map-prompt').fill('malformed result');
  const before = await page.evaluate(() => grid.map(row => row.join('')));

  await page.getByTestId('generate-ai-map').click();
  await page.getByTestId('apply-ai-map').click();

  await expect(page.locator('#aiMapError')).toHaveText('生成地图尺寸无效');
  await expect(page.locator('#aiMapModal')).toHaveClass(/show/);
  expect(await page.evaluate(() => grid.map(row => row.join('')))).toEqual(before);
});
test('escapes every level-name code unit before extra-config parsing', async ({ page }) => {
  const modelName = 'pipeSpawners:[globalThis.__aiNamePwn=1],';
  await page.route('**/api/generate-map', route => route.fulfill({
    json: generatedFixture(20, 10, { level: { name: modelName } }),
  }));
  await openConfiguredDialog(page);
  await page.locator('#mapWidth').fill('20');
  await page.locator('#mapHeight').fill('10');
  await page.getByTestId('ai-map-prompt').fill('regex boundary');
  await page.getByTestId('generate-ai-map').click();
  await page.getByTestId('apply-ai-map').click();

  const result = await page.evaluate(() => {
    exportMap();
    const source = document.getElementById('exportText').value;
    delete globalThis.__aiNamePwn;
    document.getElementById('levelName').value = 'stale name';
    document.getElementById('importText').value = source;
    doImport();
    return {
      source,
      restoredName: document.getElementById('levelName').value,
      pwned: globalThis.__aiNamePwn ?? null,
      pipeKeyCount: (source.match(/pipeSpawners/g) || []).length,
    };
  });

  expect(result.pwned).toBeNull();
  expect(result.restoredName).toBe(modelName);
  expect(result.source).not.toContain(modelName);
  expect(result.source).not.toContain('__aiNamePwn');
  expect(result.pipeKeyCount).toBe(1);
});

test('renders persisted custom level names as option text without parsing markup', async ({ page }) => {
  const hostileName = '</option><option id="aiOptionPwn">owned</option><option>';
  let releaseLevels;
  const levelsGate = new Promise(resolve => { releaseLevels = resolve; });
  await page.unroute('**/js/levels/*.js');
  await page.route('**/js/levels/*.js', async route => {
    await levelsGate;
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'const LEVEL_0 = { name: "fixture", width: 20, map: ["####################"] };',
    });
  });
  await page.goto('/editor.html');
  await page.evaluate(name => {
    localStorage.setItem('cellQuest_customLevels_0', JSON.stringify([{
      name,
      width: 20,
      map: Array(10).fill(' '.repeat(20)),
    }]));
  }, hostileName);
  releaseLevels();

  const customOption = page.locator('#levelSelect option[value="custom_0"]');
  await expect(customOption).toHaveText(`📝 ${hostileName}`);
  expect(await page.locator('#aiOptionPwn').count()).toBe(0);
});

test('keeps generation disabled until the configuration check succeeds', async ({ page }) => {
  let releaseConfig;
  const configGate = new Promise(resolve => { releaseConfig = resolve; });
  await page.route('**/api/ai-config', async route => {
    await configGate;
    await route.fulfill({ json: { configured: true, source: 'runtime' } });
  });
  await page.goto('/editor.html');
  const generateButton = page.getByTestId('generate-ai-map');

  await expect(generateButton).toBeDisabled();
  const configRequest = page.waitForRequest('**/api/ai-config');
  await page.getByTestId('open-ai-map').click();
  await configRequest;
  await expect(generateButton).toBeDisabled();

  releaseConfig();
  await expect(generateButton).toBeEnabled();
});
