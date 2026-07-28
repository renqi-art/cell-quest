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

test('closing the dialog aborts an active generation request', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAbortController = window.AbortController;
    window.__aiAbortCount = 0;
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
  await page.getByTestId('ai-map-prompt').fill('中止请求');

  const generation = page.getByTestId('generate-ai-map').click();
  await page.waitForRequest('**/api/generate-map');
  await page.getByTestId('cancel-ai-map').click();
  await generation;

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
