// =====================================================================
// files.spec.js — checks on the files themselves (no browser needed)
// =====================================================================
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsFiles = fs.readdirSync(root).filter(f => f.endsWith('.js') && !f.endsWith('.config.js'));

test('every JavaScript file has no typos that stop it from loading', () => {
  for (const f of jsFiles) {
    try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); }
    catch (err) { throw new Error(`${f} has a syntax error:\n${err.stderr}`); }
  }
});

test('index.html: every ?v= matches APP_VERSION (so phones load the new files)', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const version = (html.match(/const APP_VERSION = '([^']+)'/) || [])[1];
  expect(version, 'APP_VERSION is set').toBeTruthy();
  const versions = [...html.matchAll(/src="[^"]+\.js\?v=([^"]+)"/g)].map(m => m[1]);
  expect(versions.length).toBeGreaterThan(10);
  for (const v of versions) expect(v, 'a script tag has an old ?v=').toBe(version);
});

test('every script in index.html exists', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const m of html.matchAll(/src="([^"?]+\.js)/g)) {
    expect(fs.existsSync(path.join(root, m[1])), `${m[1]} is missing`).toBe(true);
  }
});

test('no secret keys in the app files', () => {
  for (const f of fs.readdirSync(root).filter(f => /\.(js|html)$/.test(f))) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    expect(text, `${f} has a Supabase secret key`).not.toMatch(/sb_secret_[A-Za-z0-9]/);
    expect(text, `${f} has a Claude API key`).not.toMatch(/sk-ant-[A-Za-z0-9]/);
    expect(text, `${f} has a service role key`).not.toMatch(/service_role"\s*:\s*"ey/);
  }
});
