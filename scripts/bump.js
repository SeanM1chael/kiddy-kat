// =====================================================================
// scripts/bump.js — 🔢 one command to give a release its new version
//   npm run bump
// Sets APP_VERSION in index.html and every ?v= number on every page to the
// same new version, so phones always load the new files together.
// Version = today's date + a letter: 2026-11-09a, then 2026-11-09b, ...
// =====================================================================
const fs = require('fs');
const path = require('path');

const VERSION = /\d{4}-\d{2}-\d{2}[a-z]+/;

function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The next version after `current` on `day`: same day → next letter, new day → "a"
function nextVersion(current, day = today()) {
  const m = /^(\d{4}-\d{2}-\d{2})([a-z]+)$/.exec(current || '');
  if (!m || m[1] !== day) return day + 'a';
  const letters = m[2];
  const last = letters[letters.length - 1];
  return day + (last === 'z' ? letters + 'a' : letters.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1));
}

// Put `version` into the page text: APP_VERSION and every ?v=
function applyVersion(html, version) {
  return html
    .replace(/(const APP_VERSION = ')[^']+(')/, `$1${version}$2`)
    .replace(new RegExp('(\\?v=)' + VERSION.source, 'g'), `$1${version}`);
}

function bump(root = path.join(__dirname, '..')) {
  const indexFile = path.join(root, 'index.html');
  const current = (fs.readFileSync(indexFile, 'utf8').match(/const APP_VERSION = '([^']+)'/) || [])[1];
  const version = nextVersion(current);
  const changed = [];
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
    const file = path.join(root, f);
    const before = fs.readFileSync(file, 'utf8');
    const after = applyVersion(before, version);
    if (after !== before) { fs.writeFileSync(file, after); changed.push(f); }
  }
  return { from: current, to: version, changed };
}

if (require.main === module) {
  const r = bump();
  console.log(`🔢 Version ${r.from} → ${r.to}`);
  console.log(`   Updated: ${r.changed.join(', ') || 'nothing'}`);
}

module.exports = { nextVersion, applyVersion, bump };
