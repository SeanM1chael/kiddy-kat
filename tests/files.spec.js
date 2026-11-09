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

// Nov 9: `npm run bump` sets every version number at once, so a release can't load half-old files
test('the version bump script picks the next version and updates every number', () => {
  const { nextVersion, applyVersion, bump } = require('../scripts/bump.js');
  expect(nextVersion('2026-11-05f', '2026-11-05')).toBe('2026-11-05g');
  expect(nextVersion('2026-11-05f', '2026-11-09')).toBe('2026-11-09a');
  expect(nextVersion('2026-11-09z', '2026-11-09')).toBe('2026-11-09za');
  const page = `<script src="a.js?v=2026-11-05f"></script><script src="b.js?v=2026-10-29f"></script>\nconst APP_VERSION = '2026-11-05f';`;
  const out = applyVersion(page, '2026-11-09a');
  expect(out).not.toContain('2026-11-05f');
  expect(out).not.toContain('2026-10-29f');
  expect(out.match(/2026-11-09a/g).length).toBe(3);
  // On a copy of the real pages
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-'));
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) fs.copyFileSync(path.join(root, f), path.join(tmp, f));
  const r = bump(tmp);
  expect(r.changed).toContain('index.html');
  const html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  const versions = [...html.matchAll(/\?v=(\d{4}-\d{2}-\d{2}[a-z]+)/g)].map(m => m[1]);
  expect(new Set(versions)).toEqual(new Set([r.to]));
  expect(html).toContain(`const APP_VERSION = '${r.to}'`);
  fs.rmSync(tmp, { recursive: true });
});
