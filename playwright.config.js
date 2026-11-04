// =====================================================================
// playwright.config.js — settings for the automatic tests (tests/ folder)
// The tests open the app in a pretend iPhone (Safari's engine, WebKit)
// and a pretend Android phone (Chrome), and check it works.
// GitHub runs them on every push (.github/workflows/tests.yml).
// =====================================================================
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,          // on GitHub, try a failed test once more before calling it failed
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  // Serves the app's files, like GitHub Pages does
  webServer: {
    command: 'node tests/serve.js',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore'
  },
  projects: [
    { name: 'iPhone (Safari)', use: { ...devices['iPhone 13'] } },
    { name: 'Android (Chrome)', use: { ...devices['Pixel 7'] } }
  ]
});
