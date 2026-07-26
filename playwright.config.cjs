const { defineConfig } = require('playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  testIgnore: '**/evidence-capture.spec.js',
  timeout: 15_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    headless: true,
    launchOptions: {
      args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-frame-rate-limit', '--disable-gpu-vsync'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
