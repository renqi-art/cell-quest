const { test, expect } = require('playwright/test');

test('saves a runtime key without browser persistence or URL leakage', async ({ page }) => {
  const requests = [];
  await page.route('**/api/ai-config', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { configured: false, source: 'none' } });
    }
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, configured: true, source: 'runtime' } });
  });

  await page.goto('/ai-settings.html?return=%2Feditor.html');
  await page.getByTestId('ai-api-key').fill('runtime-secret');
  await page.getByTestId('save-ai-key').click();

  expect(requests).toEqual([{ apiKey: 'runtime-secret' }]);
  expect(page.url()).not.toContain('runtime-secret');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('runtime-secret');
  await expect(page.getByTestId('ai-api-key')).toHaveValue('');
});

test('clears the runtime key and only returns to a safe same-origin path', async ({ page }) => {
  const requests = [];
  await page.route('**/api/ai-config', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { configured: true, source: 'runtime' } });
    }
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, configured: false, source: 'none' } });
  });

  await page.goto('/ai-settings.html?return=https%3A%2F%2Fexample.com');
  await expect(page.getByTestId('return-to-editor')).toHaveAttribute('href', '/editor.html');
  await page.getByTestId('clear-ai-key').click();

  expect(requests).toEqual([{ apiKey: '' }]);
  await expect(page.getByTestId('ai-config-status')).toHaveText('尚未配置 API Key');
});

test('rejects a backslash return path that browser URL normalization treats as external', async ({ page }) => {
  await page.route('**/api/ai-config', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { configured: false, source: 'none' } });
    }
    return route.fulfill({ json: { ok: true, configured: false, source: 'none' } });
  });

  await page.goto('/ai-settings.html?return=%2F%5Cexample.com');
  await expect(page.getByTestId('return-to-editor')).toHaveAttribute('href', '/editor.html');
});
