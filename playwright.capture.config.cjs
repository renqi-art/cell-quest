const base = require('./playwright.config.cjs');

module.exports = {
  ...base,
  testMatch: '**/evidence-capture.spec.js',
  testIgnore: [],
  reporter: 'line',
};
