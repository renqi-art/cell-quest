const { test, expect } = require('playwright/test');

async function launchCase(page, chapter) {
  await page.addInitScript(() => localStorage.setItem('cellQuest_onboardingVersion', '1'));
  await page.goto('/');
  await page.getByTestId('open-campaign').click();
  await page.locator(`[data-case-chapter="${chapter}"] [data-testid="start-official-case"]`).click();
  await expect(page.getByTestId('phaser-case-runtime').locator('canvas')).toBeVisible();
}

async function sampleFrames(page, durationMs) {
  return page.evaluate(duration => new Promise(resolve => {
    const samples = [];
    let previous = performance.now();
    const endAt = previous + duration;
    function frame(now) {
      samples.push(now - previous);
      previous = now;
      if (now < endAt) requestAnimationFrame(frame);
      else {
        const sorted = samples.slice(2).sort((a, b) => a - b);
        const percentile = ratio => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0;
        resolve({ frames: sorted.length, medianMs: percentile(0.5), p99Ms: percentile(0.99) });
      }
    }
    requestAnimationFrame(frame);
  }), durationMs);
}

function logMetrics(label, metrics) {
  console.log(`PERF ${label} frames=${metrics.frames} median=${metrics.medianMs.toFixed(2)}ms p99=${metrics.p99Ms.toFixed(2)}ms`);
}

test('Phaser normal case meets the 30-second frame-time budget', async ({ page }) => {
  test.setTimeout(60_000);
  await launchCase(page, 1);
  const metrics = await sampleFrames(page, 30_000);
  logMetrics('normal', metrics);
  expect(metrics.frames).toBeGreaterThan(1_000);
  expect(metrics.medianMs).toBeLessThanOrEqual(16.7);
  expect(metrics.p99Ms).toBeLessThanOrEqual(22.2);
});

test('Phaser stress case meets the 30-second p99 frame-time budget', async ({ page }) => {
  test.setTimeout(60_000);
  await launchCase(page, 6);
  const metrics = await sampleFrames(page, 30_000);
  logMetrics('stress', metrics);
  expect(metrics.frames).toBeGreaterThan(1_000);
  expect(metrics.p99Ms).toBeLessThanOrEqual(33.3);
});
