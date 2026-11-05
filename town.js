// =====================================================================
// town.js — 🏙️ Kat Town: a little town where kids spend their stars
//   🎨 Make your own character (skin, hair, outfit, extras)
//   🗺️ Walk around town: tap a building and your character walks there
//   🛍️ Stores: buy clothes, food and toys with ⭐, or tap ❤️ to wish for it
//   💝 The wish list shows up on the parent dashboard, so grown-ups get
//      ideas for gifts, rewards and dinners
//   🏫 Kat Academy opens Practice, 🕹️ the Arcade opens the Arcade
// Store names are made up (no real brands). Kids can add a note to a wish,
// like the real store they like.
// =====================================================================

const TOWN_SKIN = ['#f9d7b9', '#f1c19b', '#d9a172', '#b9774a', '#8d5530', '#5e3a20'];
const TOWN_HAIR_COLORS = ['#1f1a17', '#4a2c1a', '#8a5a2b', '#d9a441', '#c2410c', '#7c3aed', '#ec4899', '#6b7280'];
const TOWN_OUTFIT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#111827'];
const TOWN_HAIR = [['short', 'Short'], ['long', 'Long'], ['curly', 'Curly'], ['puffs', 'Puffs'], ['buzz', 'Buzz'], ['ponytail', 'Ponytail']];
// Outfits and extras: some are free, the rest are bought at Kat Closet
const TOWN_OUTFITS = [['tee', 'T-shirt', null], ['hoodie', 'Hoodie', 'hoodie'], ['jersey', 'Jersey', 'jersey'], ['dress', 'Dress', 'dress'], ['pajamas', 'Pajamas', 'pajamas']];
const TOWN_EXTRAS = [['none', 'None', null], ['bow', 'Bow', null], ['cap', 'Cap', 'cap'], ['sunglasses', 'Sunglasses', 'sunglasses'], ['headphones', 'Headphones', 'headphones'], ['crown', 'Crown', 'crown']];

const TOWN_STORES = {
  closet: { name: 'Kat Closet', emoji: '👕', color: '#fce7f3', kind: 'clothes', hello: 'New looks for your character, and wish-list ideas for real life!',
    items: [['hoodie', '🧥', 'Cozy hoodie', 15], ['jersey', '🎽', 'Team jersey', 15], ['dress', '👗', 'Party dress', 15], ['pajamas', '😴', 'Pajama set', 10],
            ['cap', '🧢', 'Baseball cap', 8], ['sunglasses', '🕶️', 'Cool sunglasses', 8], ['headphones', '🎧', 'Headphones', 12], ['crown', '👑', 'Royal crown', 30],
            ['sneakers', '👟', 'Cool sneakers', 12], ['backpack', '🎒', 'New backpack', 12]] },
  burger: { name: 'Paw Burger', emoji: '🍔', color: '#fef3c7', kind: 'food', hello: 'What sounds yummy? Tap ❤️ to tell your grown-up for dinner ideas.',
    items: [['burger', '🍔', 'Cheeseburger', 4], ['tacos', '🌮', 'Tacos', 4], ['pizza', '🍕', 'Pizza slice', 4], ['nuggets', '🍗', 'Chicken nuggets', 4],
            ['mac', '🧀', 'Mac and cheese', 3], ['spaghetti', '🍝', 'Spaghetti', 4], ['pancakes', '🥞', 'Pancakes', 3], ['sushi', '🍣', 'Sushi', 5],
            ['smoothie', '🥤', 'Fruit smoothie', 3], ['icecream', '🍦', 'Ice cream cone', 3]] },
  toys: { name: 'Toy Box', emoji: '🧸', color: '#dcfce7', kind: 'toys', hello: 'Toys for your room! Wish for the real ones with ❤️.',
    items: [['slime', '🟢', 'Slime kit', 10], ['blocks', '🧱', 'Building blocks', 12], ['soccer', '⚽', 'Soccer ball', 8], ['art', '🎨', 'Art set', 10],
            ['puzzle', '🧩', 'Puzzle', 6], ['plush', '🧸', 'Stuffed animal', 8], ['rccar', '🏎️', 'Remote control car', 20], ['science', '🔬', 'Science kit', 15],
            ['books', '📚', 'Book set', 8], ['game', '🎲', 'Board game', 10]] }
};

// The town is a grid of tiles: 7 across, 9 down. Column 3 and row 4 are roads.
const TOWN_COLS = 7, TOWN_ROWS = 9, TOWN_ROAD_COL = 3, TOWN_ROAD_ROW = 4;
// Places on the map: [id, emoji, name, short label, column, row]
const TOWN_PLACES = [
  ['home', '🏠', 'My House', 'Home', 1, 1], ['closet', '👕', 'Kat Closet', 'Closet', 4, 1], ['burger', '🍔', 'Paw Burger', 'Burger', 6, 2],
  ['school', '🏫', 'Kat Academy', 'School', 1, 6], ['arcade', '🕹️', 'Arcade', 'Arcade', 4, 6], ['toys', '🧸', 'Toy Box', 'Toys', 6, 7]
];
function townIsRoad(c, r) { return c === TOWN_ROAD_COL || r === TOWN_ROAD_ROW; }
function townPlaceAt(c, r) { return TOWN_PLACES.find(p => p[4] === c && p[5] === r); }

let townSpot = [TOWN_ROAD_COL, TOWN_ROAD_ROW];   // the tile the character is standing on
let townBuilding = false;              // 🔨 build mode on?
let townPick = null;                   // build mode: what's picked in the menu, or { move: lot }
let townCreating = null;               // the character being edited
let townView = 'map';                  // which screen is showing: map, store, home, creator
let townReturn = false;                // true while Practice or the Arcade was opened from town

function townAllowed() { return typeof animal !== 'undefined' && animal && animal.theme !== 'eagle'; }

function loadTown() {
  let t = null;
  try { t = JSON.parse(localStorage.getItem('kiddyKatTown') || 'null'); } catch (err) {}
  if (!t || typeof t !== 'object') t = {};
  if (!t.avatar) t.avatar = null;
  if (!Array.isArray(t.owned)) t.owned = [];         // ids of things bought
  if (!Array.isArray(t.wishes)) t.wishes = [];       // { id, emoji, name, store, note, at }
  if (!Array.isArray(t.bought)) t.bought = [];       // recent purchases, for the dashboard
  if (!Array.isArray(t.built)) t.built = [];         // 🔨 things built in town: { lot: 'col,row', id, name }
  return t;
}
function saveTown(t) {
  t.wishes = t.wishes.slice(-40);
  t.bought = t.bought.slice(-30);
  localStorage.setItem('kiddyKatTown', JSON.stringify(t));
}

function townStars() { return typeof pet !== 'undefined' && pet ? pet.stars : 0; }

// 🛍️ Daily Kat Town spending limit, so stars are left for real-life rewards.
// A grown-up can change it from the dashboard (it arrives in the parent inbox).
const TOWN_DEFAULT_LIMIT = 25;
function townLimit(t) { return typeof t.limit === 'number' ? t.limit : TOWN_DEFAULT_LIMIT; }
function townSpentToday(t) { return t.spent && t.spent.date === new Date().toDateString() ? t.spent.stars : 0; }
function townSpendLeft(t) { return Math.max(0, townLimit(t || loadTown()) - townSpentToday(t || loadTown())); }
// null if it's OK to spend, or a friendly message if today's limit would be passed
function townSpendProblem(price) {
  const left = townSpendLeft(loadTown());
  if (price <= left) return null;
  return left > 0
    ? `🛍️ You can only spend ${left} more ⭐ in Kat Town today. Save up and come back tomorrow, or keep your stars for a real reward!`
    : `🛍️ You've spent your ${townLimit(loadTown())} ⭐ for Kat Town today. The shops open again tomorrow! Your other stars are safe for real rewards.`;
}
function townRecordSpend(price) {
  const t = loadTown();
  const today = new Date().toDateString();
  if (!t.spent || t.spent.date !== today) t.spent = { date: today, stars: 0 };
  t.spent.stars += price;
  saveTown(t);
}
function townSpendLine() { return `🛍️ ${townSpendLeft()} of ${townLimit(loadTown())} ⭐ left to spend in town today`; }
// From the dashboard: a new daily limit
function receiveTownLimit(d) {
  const n = Math.round(Number(d.limit));
  if (!(n >= 0 && n <= 500)) return '';
  const t = loadTown();
  t.limit = n;
  saveTown(t);
  return n === 0 ? `🛍️ ${d.from || 'Your grown-up'} paused Kat Town shopping for now.` : `🛍️ ${d.from || 'Your grown-up'} set your Kat Town spending to ${n} ⭐ a day.`;
}

function townAdd(parent, tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  parent.appendChild(el);
  return el;
}

function townBody(title) {
  const box = document.getElementById('townBody');
  box.textContent = '';
  document.getElementById('townTitle').textContent = title;
  return box;
}

// ---------- 🎨 The character, drawn from simple shapes ----------
function townAvatarSvg(a, size = 120) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 124');
  svg.setAttribute('width', size);
  svg.setAttribute('height', Math.round(size * 1.24));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Your character');
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); svg.appendChild(e); return e; };
  const skin = TOWN_SKIN[a.skin] || TOWN_SKIN[1];
  const hair = TOWN_HAIR_COLORS[a.hairColor] || TOWN_HAIR_COLORS[0];
  const cloth = TOWN_OUTFIT_COLORS[a.color] || TOWN_OUTFIT_COLORS[0];

  // Hair that sits behind the head
  if (a.hair === 'long') el('path', { d: 'M22 44 Q22 18 50 16 Q78 18 78 44 L80 86 Q66 80 50 80 Q34 80 20 86 Z', fill: hair });
  if (a.hair === 'ponytail') el('ellipse', { cx: 80, cy: 46, rx: 9, ry: 20, fill: hair });
  if (a.outfit === 'hoodie') el('circle', { cx: 50, cy: 46, r: 31, fill: cloth });      // the hood, around the head

  // Body and outfit
  if (a.outfit === 'dress') {
    el('path', { d: 'M36 74 L64 74 L78 118 L22 118 Z', fill: cloth });
  } else {
    el('rect', { x: 28, y: 74, width: 44, height: 40, rx: 12, fill: cloth });
    if (a.outfit === 'pajamas') [84, 96, 108].forEach(y => el('line', { x1: 30, y1: y, x2: 70, y2: y, stroke: '#ffffff', 'stroke-width': 2, opacity: 0.6 }));
    if (a.outfit === 'jersey') { el('text', { x: 50, y: 104, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#ffffff', 'font-family': 'Arial, sans-serif' }).textContent = '7'; }
    if (a.outfit === 'hoodie') {
      el('rect', { x: 37, y: 96, width: 26, height: 11, rx: 5, fill: '#ffffff', opacity: 0.18 });        // front pocket
      el('line', { x1: 45, y1: 76, x2: 44, y2: 88, stroke: '#ffffff', 'stroke-width': 1.6, opacity: 0.7 }); // strings
      el('line', { x1: 55, y1: 76, x2: 56, y2: 88, stroke: '#ffffff', 'stroke-width': 1.6, opacity: 0.7 });
    }
  }
  // Arms and hands
  el('rect', { x: 18, y: 78, width: 12, height: 26, rx: 6, fill: a.outfit === 'dress' ? skin : cloth });
  el('rect', { x: 70, y: 78, width: 12, height: 26, rx: 6, fill: a.outfit === 'dress' ? skin : cloth });
  el('circle', { cx: 24, cy: 106, r: 6, fill: skin });
  el('circle', { cx: 76, cy: 106, r: 6, fill: skin });
  // Neck and head
  el('rect', { x: 44, y: 64, width: 12, height: 12, fill: skin });
  el('circle', { cx: 50, cy: 44, r: 25, fill: skin });

  // Hair on top
  if (a.hair === 'short' || a.hair === 'long' || a.hair === 'ponytail') el('path', { d: 'M25 42 Q25 16 50 16 Q75 16 75 42 Q66 28 50 30 Q34 28 25 42 Z', fill: hair });
  if (a.hair === 'buzz') el('path', { d: 'M27 38 Q30 20 50 19 Q70 20 73 38 Q62 30 50 30 Q38 30 27 38 Z', fill: hair, opacity: 0.85 });
  if (a.hair === 'curly') [[30, 30], [40, 22], [50, 19], [60, 22], [70, 30], [26, 42], [74, 42]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 9, fill: hair }));
  if (a.hair === 'puffs') { el('circle', { cx: 26, cy: 24, r: 12, fill: hair }); el('circle', { cx: 74, cy: 24, r: 12, fill: hair }); el('path', { d: 'M27 38 Q30 20 50 20 Q70 20 73 38 Q62 30 50 31 Q38 30 27 38 Z', fill: hair }); }

  // Face
  el('circle', { cx: 41, cy: 46, r: 3.2, fill: '#1f2937' });
  el('circle', { cx: 59, cy: 46, r: 3.2, fill: '#1f2937' });
  el('circle', { cx: 35, cy: 54, r: 3.5, fill: '#f472b6', opacity: 0.35 });
  el('circle', { cx: 65, cy: 54, r: 3.5, fill: '#f472b6', opacity: 0.35 });
  el('path', { d: 'M42 56 Q50 63 58 56', fill: 'none', stroke: '#1f2937', 'stroke-width': 2.4, 'stroke-linecap': 'round' });

  // Extras
  if (a.extra === 'sunglasses') { el('rect', { x: 33, y: 41, width: 14, height: 9, rx: 3, fill: '#111827' }); el('rect', { x: 53, y: 41, width: 14, height: 9, rx: 3, fill: '#111827' }); el('line', { x1: 47, y1: 45, x2: 53, y2: 45, stroke: '#111827', 'stroke-width': 2 }); }
  if (a.extra === 'cap') { el('path', { d: 'M25 34 Q26 14 50 14 Q74 14 75 34 Z', fill: cloth }); el('rect', { x: 46, y: 30, width: 38, height: 6, rx: 3, fill: cloth }); }
  if (a.extra === 'headphones') { el('path', { d: 'M24 44 Q24 14 50 14 Q76 14 76 44', fill: 'none', stroke: '#374151', 'stroke-width': 4 }); el('rect', { x: 19, y: 38, width: 9, height: 16, rx: 4, fill: '#374151' }); el('rect', { x: 72, y: 38, width: 9, height: 16, rx: 4, fill: '#374151' }); }
  if (a.extra === 'bow') { el('path', { d: 'M50 18 L38 10 L38 26 Z', fill: '#ec4899' }); el('path', { d: 'M50 18 L62 10 L62 26 Z', fill: '#ec4899' }); el('circle', { cx: 50, cy: 18, r: 3.5, fill: '#be185d' }); }
  if (a.extra === 'crown') el('path', { d: 'M33 22 L37 6 L44 16 L50 4 L56 16 L63 6 L67 22 Z', fill: '#facc15', stroke: '#ca8a04', 'stroke-width': 1.5 });
  return svg;
}

function townDefaultAvatar() {
  return { skin: 1, hair: 'short', hairColor: 1, outfit: 'tee', color: 0, extra: 'none' };
}

// ---------- 🏙️ Open and close ----------
function openTown() {
  if (!townAllowed()) return;
  document.getElementById('town').style.display = 'block';
  const t = loadTown();
  if (!t.avatar) { townCreating = townDefaultAvatar(); showTownCreator(true); return; }
  showTownMap();
}

// ✖ goes back one step: from a store, My House or My look back to the map; from the map, out of town
function closeTown() {
  if (String(townView).startsWith('toy:')) { if (typeof toyStop === 'function') toyStop(); showTownHome(); return; }
  if (townView !== 'map' && loadTown().avatar) { showTownMap(); return; }
  leaveTown();
}

function leaveTown() {
  if (typeof toyStop === 'function') toyStop();
  document.getElementById('town').style.display = 'none';
  showTownButton();
}

// Practice and the Arcade opened from town come back to the town map when closed
function townComeBack() {
  if (!townReturn) return;
  townReturn = false;
  document.getElementById('town').style.display = 'block';
  showTownMap();
}
if (typeof closeGame === 'function') {
  const closeGameBefore = closeGame;
  closeGame = function () { closeGameBefore(); townComeBack(); };     // eslint-disable-line no-global-assign
}
if (typeof closeArcade === 'function') {
  const closeArcadeBefore = closeArcade;
  closeArcade = function () { closeArcadeBefore(); townComeBack(); };   // eslint-disable-line no-global-assign
}

function showTownButton() {
  const b = document.getElementById('townButton');
  if (b) b.style.display = townAllowed() ? '' : 'none';
}

// ---------- 🎨 Character creator ----------
function showTownCreator(first) {
  townView = 'creator';
  const box = townBody(first ? '🎨 Make your character' : '🎨 My look');
  const t = loadTown();
  const a = townCreating;
  if (!first) townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', showTownMap);
  if (first) townAdd(box, 'div', 'Welcome to Kat Town! First, make someone who looks like you (or anyone you like).', 'arcadeHint');
  const stage = townAdd(box, 'div', undefined, 'townStage');
  stage.appendChild(townAvatarSvg(a, 130));

  const row = (label, options, key, render) => {
    townAdd(box, 'div', label, 'townLabel');
    const wrap = townAdd(box, 'div', undefined, 'townChoices');
    options.forEach((opt, i) => {
      const value = Array.isArray(opt) ? opt[0] : i;
      const lockedBy = Array.isArray(opt) ? opt[2] : null;
      const locked = lockedBy && !t.owned.includes(lockedBy);
      const b = townAdd(wrap, 'button', undefined, 'townChoice' + (a[key] === value ? ' picked' : '') + (locked ? ' locked' : ''));
      render(b, opt, i, locked);
      b.addEventListener('click', () => {
        if (locked) { townToast(`🔒 Buy it at 👕 Kat Closet to unlock`); return; }
        a[key] = value;
        showTownCreator(first);
      });
    });
  };
  const swatch = (b, color) => { b.style.background = color; b.classList.add('swatch'); };
  row('Skin', TOWN_SKIN, 'skin', (b, c) => swatch(b, c));
  row('Hair', TOWN_HAIR, 'hair', (b, opt) => { b.textContent = opt[1]; });
  row('Hair color', TOWN_HAIR_COLORS, 'hairColor', (b, c) => swatch(b, c));
  row('Outfit', TOWN_OUTFITS, 'outfit', (b, opt, i, locked) => { b.textContent = (locked ? '🔒 ' : '') + opt[1]; });
  row('Outfit color', TOWN_OUTFIT_COLORS, 'color', (b, c) => swatch(b, c));
  row('Extra', TOWN_EXTRAS, 'extra', (b, opt, i, locked) => { b.textContent = (locked ? '🔒 ' : '') + opt[1]; });

  townAdd(box, 'button', first ? '✅ Done! Go to town' : '💾 Save my look', 'arcadeGo townSave').addEventListener('click', () => {
    const fresh = loadTown();
    fresh.avatar = Object.assign({}, a);
    saveTown(fresh);
    townToast('✨ Looking great!');
    showTownMap();
  });
}

// ---------- 🗺️ The town map ----------
function showTownMap(message) {
  townView = 'map';
  const t = loadTown();
  const level = townLevel(t);
  const box = townBody('🏙️ Kat Town');
  townAdd(box, 'div', `${level.emoji} ${level.name} · ⭐ ${townStars()} stars · ${townBuilding ? 'tap a green lot to build' : 'tap a place to walk there'}`, 'arcadeHint townTop');
  const bar = townAdd(box, 'div', undefined, 'codeTools');
  const toggle = townAdd(bar, 'button', townBuilding ? '✅ Done building' : '🔨 Build', townBuilding ? 'arcadeGo' : 'arcadeGo townBuildBtn');
  toggle.addEventListener('click', () => { townBuilding = !townBuilding; townPick = null; showTownMap(); });
  if (!townBuilding) {
    const jobs = townJobs(t);
    const jb = townAdd(bar, 'button', jobs.ready.length ? `💼 Jobs (${jobs.ready.length} ready!)` : '💼 Jobs', 'arcadeGo townJobsBtn' + (jobs.ready.length ? ' ready' : ''));
    jb.addEventListener('click', showTownJobs);
    townAdd(bar, 'button', '👨‍👩‍👧 Family', 'arcadeGo townFamilyBtn').addEventListener('click', () => showTownFamily());
  }
  if (message) townAdd(box, 'div', message, 'arcadeMessage');

  const map = townAdd(box, 'div', undefined, 'townMap' + (townBuilding ? ' building' : ''));
  map.style.gridTemplateColumns = `repeat(${TOWN_COLS}, 1fr)`;
  const built = {};
  t.built.forEach(b => { built[b.lot] = b; });
  for (let r = 0; r < TOWN_ROWS; r++) {
    for (let c = 0; c < TOWN_COLS; c++) {
      const lot = c + ',' + r;
      const place = townPlaceAt(c, r);
      let tile;
      if (townIsRoad(c, r)) {
        tile = townAdd(map, 'div', '', 'townTile road' + (c === TOWN_ROAD_COL && r === TOWN_ROAD_ROW ? ' cross' : c === TOWN_ROAD_COL ? ' down' : ' across'));
      } else if (place) {
        tile = townAdd(map, 'button', undefined, 'townTile place');
        tile.dataset.place = place[0];
        tile.setAttribute('aria-label', place[2]);
        townAdd(tile, 'span', place[1], 'townPlaceEmoji');
        townAdd(tile, 'span', place[3], 'townPlaceName');
        tile.addEventListener('click', () => { if (!townBuilding) townWalkTo(c, r, () => townEnter(place[0])); });
      } else if (built[lot]) {
        const b = built[lot];
        const item = townBuildItem(b.id);
        tile = townAdd(map, 'button', undefined, 'townTile built' + (townPick && townPick.move === lot ? ' moving' : '') + (b.fresh ? ' townBounceIn' : ''));
        tile.dataset.lot = lot;
        tile.setAttribute('aria-label', b.name || (item ? item[2] : 'Build'));
        townAdd(tile, 'span', item ? item[1] : '❓', 'townBuiltEmoji');
        if (b.name) townAdd(tile, 'span', b.name, 'townPlaceName');
        tile.addEventListener('click', () => townTapBuilt(lot, c, r));
      } else {
        tile = townAdd(map, 'button', '', 'townTile lot');
        tile.dataset.lot = lot;
        tile.setAttribute('aria-label', 'Empty lot');
        tile.addEventListener('click', () => townTapLot(lot, c, r));
      }
    }
  }
  if (t.built.some(b => b.fresh)) { t.built.forEach(b => { delete b.fresh; }); saveTown(t); }
  const me = townAdd(map, 'div', undefined, 'townMe');
  me.appendChild(townAvatarSvg(t.avatar || townDefaultAvatar(), 40));
  townPlaceMe(me, townSpot[0], townSpot[1]);

  if (townBuilding) { townAdd(box, 'div', townSpendLine(), 'arcadeHint townSpendLine'); showTownPalette(box); }
  else {
    const wishes = t.wishes.length;
    townAdd(box, 'div', wishes ? `💝 ${wishes} thing${wishes === 1 ? '' : 's'} on your wish list (see 🏠 Home)` : '💝 Tap ❤️ on anything in a store to add it to your wish list.', 'arcadeHint');
    const visit = (t.visits || []).slice(-1)[0];
    if (visit && TOWN_REACTIONS[visit.reaction]) townAdd(box, 'div', `📬 ${visit.from} visited your town: ${TOWN_REACTIONS[visit.reaction].join(' ')}`, 'arcadeHint townVisitNote');
    townAdd(box, 'div', `🏗️ You've built ${t.built.length} thing${t.built.length === 1 ? '' : 's'}.` + (level.next ? ` ${level.next - t.built.length} more to become a ${level.nextName}!` : ''), 'arcadeHint');
  }
}

// Puts the character on a tile (its feet near the bottom of the tile)
function townPlaceMe(me, c, r) {
  me.style.left = ((c + 0.5) / TOWN_COLS * 100) + '%';
  me.style.top = ((r + 0.45) / TOWN_ROWS * 100) + '%';
}

// Walk along the roads: to the main road, along it, then over to the place
function townWalkTo(c, r, then) {
  const me = document.querySelector('#townBody .townMe');
  if (!me) { if (then) then(); return; }
  const [c0, r0] = townSpot;
  const steps = [[TOWN_ROAD_COL, r0], [TOWN_ROAD_COL, r], [c, r]]
    .filter((p, i, all) => i === 0 ? !(p[0] === c0 && p[1] === r0) : !(p[0] === all[i - 1][0] && p[1] === all[i - 1][1]));
  me.classList.add('walking');
  let i = 0;
  const next = () => {
    if (i >= steps.length) { me.classList.remove('walking'); townSpot = [c, r]; if (then) then(); return; }
    townPlaceMe(me, steps[i][0], steps[i][1]);
    i += 1;
    setTimeout(next, 330);
  };
  next();
}

function townEnter(id) {
  if (document.getElementById('town').style.display !== 'block') return;
  if (id === 'home') { showTownHome(); return; }
  if (id === 'school') { leaveTown(); townReturn = true; if (typeof openPractice === 'function') openPractice(); return; }
  if (id === 'arcade') { leaveTown(); townReturn = true; if (typeof openArcade === 'function') openArcade(); return; }
  showTownStore(id);
}

// ---------- 🛍️ A store ----------
// Clothes you can wear: which part of the character they change
const TOWN_WEAR = { hoodie: ['outfit', 'hoodie'], jersey: ['outfit', 'jersey'], dress: ['outfit', 'dress'], pajamas: ['outfit', 'pajamas'],
                    cap: ['extra', 'cap'], sunglasses: ['extra', 'sunglasses'], headphones: ['extra', 'headphones'], crown: ['extra', 'crown'] };
// How each toy plays: [animation, little extras that pop out]
const TOWN_PLAY = { soccer: ['bounce', '⚡'], slime: ['squish', '💚'], rccar: ['zoom', '💨'], blocks: ['stack', '🧱🧱'], puzzle: ['spin', '✨'],
                    plush: ['hug', '💕'], books: ['flip', '📖'], game: ['roll', '🎲'], art: ['wiggle', '🌈'], science: ['wiggle', '🫧🫧'] };
let townPreview = null;           // Kat Closet: the outfit being tried on

function townWearing(a, itemId) {
  const w = TOWN_WEAR[itemId];
  return !!(w && a && a[w[0]] === w[1]);
}

function showTownStore(id, message) {
  const store = TOWN_STORES[id];
  const t = loadTown();
  townView = 'store';
  const box = townBody(`${store.emoji} ${store.name}`);
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => { townPreview = null; showTownMap(); });
  townAdd(box, 'div', id === 'closet' ? 'Tap anything to try it on! Buy it with ⭐, or tap 🤍 to wish for the real one.' : store.hello, 'arcadeHint');

  // Kat Closet: a mirror that shows the character trying things on
  if (id === 'closet') {
    const mirror = townAdd(box, 'div', undefined, 'townMirror');
    const a = Object.assign({}, t.avatar || townDefaultAvatar());
    if (townPreview && TOWN_WEAR[townPreview]) a[TOWN_WEAR[townPreview][0]] = TOWN_WEAR[townPreview][1];
    const fig = townAvatarSvg(a, 96);
    if (townPreview) fig.classList.add('townSpin');
    mirror.appendChild(fig);
  }
  townAdd(box, 'div', `⭐ ${townStars()} stars`, 'townWallet');
  townAdd(box, 'div', townSpendLine(), 'arcadeHint townSpendLine');
  if (message) townAdd(box, 'div', message, 'arcadeMessage');

  const grid = townAdd(box, 'div', undefined, 'townShelf');
  store.items.forEach(([itemId, emoji, name, price]) => {
    const card = townAdd(grid, 'div', undefined, 'townItem' + (townPreview === itemId ? ' trying' : ''));
    card.style.background = store.color;
    // Clothes show the character wearing them; everything else shows its picture
    const pic = townAdd(card, 'div', undefined, 'townItemEmoji');
    if (TOWN_WEAR[itemId]) {
      const a = Object.assign({}, t.avatar || townDefaultAvatar());
      a[TOWN_WEAR[itemId][0]] = TOWN_WEAR[itemId][1];
      pic.appendChild(townAvatarSvg(a, 44));
    } else pic.textContent = emoji;
    townAdd(card, 'div', name, 'townItemName');
    const owned = store.kind !== 'food' && t.owned.includes(itemId);
    const wished = t.wishes.some(w => w.id === itemId);
    const buttons = townAdd(card, 'div', undefined, 'townItemButtons');
    let main;
    if (owned && TOWN_WEAR[itemId]) {
      const on = townWearing(t.avatar, itemId);
      main = townAdd(buttons, 'button', on ? '✅ Wearing' : '👕 Wear', 'townBuy' + (on ? ' owned' : ''));
      main.addEventListener('click', e => { e.stopPropagation(); townWear(itemId, !on); });
    } else if (owned && TOWN_PLAY[itemId]) {
      main = townAdd(buttons, 'button', '▶️ Play', 'townBuy owned');
      main.addEventListener('click', e => { e.stopPropagation(); townPlay(itemId); });
    } else if (owned) {
      main = townAdd(buttons, 'button', '✅ Got it', 'townBuy owned');
      main.disabled = true;
    } else {
      main = townAdd(buttons, 'button', `⭐ ${price}`, 'townBuy');
      main.addEventListener('click', e => { e.stopPropagation(); townBuy(id, itemId, main); });
    }
    const heart = townAdd(buttons, 'button', wished ? '❤️' : '🤍', 'townHeart' + (wished ? ' on' : ''));
    heart.setAttribute('aria-label', wished ? 'On your wish list' : 'Add to wish list');
    heart.addEventListener('click', e => { e.stopPropagation(); townWish(id, itemId, heart); });
    // Tapping the card itself: try clothes on, wiggle everything else
    card.addEventListener('click', () => {
      if (id === 'closet' && TOWN_WEAR[itemId]) { townPreview = townPreview === itemId ? null : itemId; showTownStore(id); return; }
      pic.classList.remove('townWiggle'); void pic.offsetWidth; pic.classList.add('townWiggle');
    });
  });
}

function townBuy(storeId, itemId, button) {
  const store = TOWN_STORES[storeId];
  const [, emoji, name, price] = store.items.find(i => i[0] === itemId);
  if (typeof pet === 'undefined' || !pet) { showTownStore(storeId, '🥚 Hatch a pet first to start earning stars!'); return; }
  if (pet.stars < price) {
    if (button) { button.classList.remove('townNope'); void button.offsetWidth; button.classList.add('townNope'); }
    showTownStore(storeId, `You need ${price - pet.stars} more ⭐ for ${name}. Finish a list or play in 🎮 Practice!`);
    return;
  }
  const limitSays = townSpendProblem(price);
  if (limitSays) { showTownStore(storeId, limitSays); return; }
  if (!confirm(`Buy ${emoji} ${name} for ${price} ⭐?`)) return;
  if (button) townFly('⭐', button, document.querySelector('#townBody .townWallet'));
  pet.stars -= price;
  if (typeof savePet === 'function') savePet();
  if (typeof showPet === 'function') showPet();
  townRecordSpend(price);
  const t = loadTown();
  if (store.kind !== 'food' && !t.owned.includes(itemId)) t.owned.push(itemId);
  t.bought.push({ id: itemId, emoji: emoji, name: name, store: store.name, at: new Date().toISOString().slice(0, 10) });
  saveTown(t);
  townPreview = null;
  showTownStore(storeId, store.kind === 'food' ? '' : `${emoji} You got ${name}!`);
  // What happens next: eat it, put it on, or play with it
  if (store.kind === 'food') townEat(emoji, name);
  else if (TOWN_WEAR[itemId]) townPop(townAvatarWith(itemId), `${emoji} ${name} is yours!`, [['👕 Put it on', () => townWear(itemId, true)], ['Later', null]], 'townSpin');
  else if (TOWN_PLAY[itemId]) townPop(emoji, `${name} is yours! It's in your room in 🏠 My House.`, [['▶️ Play now', () => townPlay(itemId)], ['Later', null]], 'townBounceIn');
  else townPop(emoji, `${name} is yours!`, [['👍 Nice!', null]], 'townBounceIn');
}

function townAvatarWith(itemId) {
  const a = Object.assign({}, loadTown().avatar || townDefaultAvatar());
  if (TOWN_WEAR[itemId]) a[TOWN_WEAR[itemId][0]] = TOWN_WEAR[itemId][1];
  return townAvatarSvg(a, 110);
}

// Put clothes on (or take them off: back to the T-shirt / no extra)
function townWear(itemId, on) {
  const w = TOWN_WEAR[itemId];
  if (!w) return;
  const t = loadTown();
  t.avatar = Object.assign(townDefaultAvatar(), t.avatar || {});
  t.avatar[w[0]] = on ? w[1] : (w[0] === 'outfit' ? 'tee' : 'none');
  saveTown(t);
  if (townView === 'store') showTownStore('closet', on ? '✨ Looking good!' : 'Took it off.');
  if (on) townPop(townAvatarSvg(t.avatar, 110), '✨ Looking good!', [['😎 Thanks!', null]], 'townSpin');
  else townToast('👕 Took it off');
}

// 🍔 Eat it: three bites, then yum
function townEat(emoji, name) {
  const t = loadTown();
  const pop = townPop(townAvatarSvg(t.avatar || townDefaultAvatar(), 90), '', [], '');
  const food = townAdd(pop.stage, 'div', emoji, 'townFood');
  const say = pop.say;
  const bites = ['😋 Nom...', '😋 Nom nom...', '😋 Nom nom nom...'];
  let n = 0;
  const bite = () => {
    if (!pop.box.isConnected) return;
    if (n < 3) {
      say.textContent = bites[n];
      food.style.transform = `scale(${1 - (n + 1) * 0.28})`;
      n += 1;
      setTimeout(bite, 550);
      return;
    }
    food.textContent = '';
    say.textContent = `🤤 Yum! ${name}: so delicious!`;
    townPopButtons(pop, [['😄 So good!', null]]);
  };
  setTimeout(bite, 400);
}

// 🧸 Play with a toy
function townPlay(itemId) {
  const item = TOWN_STORES.toys.items.find(i => i[0] === itemId);
  if (!item) return;
  if (typeof openToy === 'function' && openToy(itemId)) return;     // 🧸 a real game (toys.js)
  const [anim, extra] = TOWN_PLAY[itemId] || ['bounce', '✨'];
  const lines = { bounce: 'Kick! Bounce! GOAL! ⚽', squish: 'Squish... squish... so squishy!', zoom: 'Vroom vroom! 🏁', stack: 'Stack it higher... higher!',
                  spin: 'Click! The last piece fits!', hug: 'Big squeezy hug!', flip: 'Turning the pages...', roll: 'Roll the dice... you rolled a 6!', wiggle: 'So much fun!' };
  const pop = townPop(item[1], lines[anim] || 'So much fun!', [['🔁 Again', () => townPlay(itemId)], ['Done', null]], 'townPlay-' + anim);
  townAdd(pop.stage, 'div', extra, 'townExtra');
}

// A little pop-up scene in the middle of the screen
function townPop(picture, text, buttons, anim) {
  document.querySelectorAll('.townPop').forEach(p => p.remove());
  const box = townAdd(document.getElementById('town'), 'div', undefined, 'townPop');
  const card = townAdd(box, 'div', undefined, 'townPopCard');
  const stage = townAdd(card, 'div', undefined, 'townPopStage');
  const fig = typeof picture === 'string' ? townAdd(stage, 'div', picture, 'townPopEmoji') : stage.appendChild(picture);
  if (anim && fig.classList) fig.classList.add(anim);
  const say = townAdd(card, 'div', text, 'townPopSay');
  const pop = { box, card, stage, say };
  townPopButtons(pop, buttons);
  box.addEventListener('click', e => { if (e.target === box) box.remove(); });     // tap outside to close
  return pop;
}

function townPopButtons(pop, buttons) {
  const old = pop.card.querySelector('.townPopButtons');
  if (old) old.remove();
  if (!buttons.length) return;
  const row = townAdd(pop.card, 'div', undefined, 'townPopButtons');
  buttons.forEach(([label, action], i) => {
    townAdd(row, 'button', label, i === 0 ? 'arcadeGo' : 'arcadeSmall').addEventListener('click', () => { pop.box.remove(); if (action) action(); });
  });
}

// A ⭐ (or ❤️) that flies from one place to another
function townFly(symbol, from, to) {
  if (!from) return;
  const a = from.getBoundingClientRect();
  const b = to ? to.getBoundingClientRect() : { left: a.left, top: a.top - 120, width: 0, height: 0 };
  const el = townAdd(document.body, 'div', symbol, 'townFly');
  el.style.left = (a.left + a.width / 2) + 'px';
  el.style.top = (a.top + a.height / 2) + 'px';
  requestAnimationFrame(() => {
    el.style.left = (b.left + b.width / 2) + 'px';
    el.style.top = (b.top + b.height / 2) + 'px';
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -50%) scale(1.6)';
  });
  setTimeout(() => el.remove(), 800);
}

function townWish(storeId, itemId, heart) {
  const store = TOWN_STORES[storeId];
  const [, emoji, name] = store.items.find(i => i[0] === itemId);
  const t = loadTown();
  const had = t.wishes.some(w => w.id === itemId);
  if (had) {
    t.wishes = t.wishes.filter(w => w.id !== itemId);
    saveTown(t);
    showTownStore(storeId, `Took ${name} off your wish list.`);
    return;
  }
  if (heart) for (let i = 0; i < 3; i++) setTimeout(() => townFly('❤️', heart, null), i * 120);
  t.wishes.push({ id: itemId, emoji: emoji, name: name, store: store.name, kind: store.kind, note: '', at: new Date().toISOString().slice(0, 10) });
  saveTown(t);
  showTownStore(storeId, `❤️ ${name} is on your wish list! ${typeof parentName === 'function' ? parentName() : 'Your grown-up'} can see it.`);
}

// ---------- 🏠 My House: my look, my stuff, my wish list ----------
function showTownHome(message) {
  const t = loadTown();
  townView = 'home';
  const box = townBody('🏠 My House');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', showTownMap);
  const stage = townAdd(box, 'div', undefined, 'townStage');
  stage.appendChild(townAvatarSvg(t.avatar || townDefaultAvatar(), 110));
  townAdd(box, 'button', '🎨 Change my look', 'arcadeGo').addEventListener('click', () => {
    townCreating = Object.assign(townDefaultAvatar(), t.avatar || {});
    showTownCreator(false);
  });
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  townRoomSection(box);

  // My stuff
  townAdd(box, 'h3', '🧸 My stuff', 'fgHead');
  const things = Object.values(TOWN_STORES).filter(s => s.kind !== 'food').flatMap(s => s.items).filter(i => t.owned.includes(i[0]));
  if (!things.length) townAdd(box, 'div', 'Nothing yet. Visit 👕 Kat Closet and 🧸 Toy Box!', 'arcadeHint');
  else {
    townAdd(box, 'div', 'Tap a toy to play its game (first win of each toy a day = +1 ⭐), or tap clothes to put them on.', 'arcadeHint');
    const shelf = townAdd(box, 'div', undefined, 'townStuff');
    things.forEach(([id, emoji, name]) => {
      const b = townAdd(shelf, 'button', emoji, 'townStuffItem');
      b.setAttribute('aria-label', name);
      b.addEventListener('click', () => {
        if (TOWN_PLAY[id]) townPlay(id);
        else if (TOWN_WEAR[id]) { townWear(id, !townWearing(loadTown().avatar, id)); showTownHome(); }
        else townPop(emoji, `Your ${name.toLowerCase()}!`, [['👍', null]], 'townBounceIn');
      });
    });
  }

  // Wish list
  townAdd(box, 'h3', `💝 My wish list (${t.wishes.length})`, 'fgHead');
  townAdd(box, 'div', `${typeof parentName === 'function' ? parentName() : 'Your grown-up'} can see this list. Add a note, like your favorite real store or flavor.`, 'arcadeHint');
  t.wishes.slice().reverse().forEach(w => {
    const row = townAdd(box, 'div', undefined, 'townWishRow');
    townAdd(row, 'div', `${w.emoji} ${w.name}`, 'townWishName');
    const note = townAdd(row, 'input', undefined, 'townWishNote');
    note.placeholder = 'Note (like "the blue one")';
    note.maxLength = 60;
    note.value = w.note || '';
    note.addEventListener('change', () => {
      const fresh = loadTown();
      const it = fresh.wishes.find(x => x.id === w.id);
      if (it) { it.note = note.value.trim(); saveTown(fresh); townToast('📝 Note saved'); }
    });
    townAdd(row, 'button', '✕', 'townWishRemove').addEventListener('click', () => {
      const fresh = loadTown();
      fresh.wishes = fresh.wishes.filter(x => x.id !== w.id);
      saveTown(fresh);
      showTownHome();
    });
  });
  // A wish that isn't in any store
  const own = townAdd(box, 'div', undefined, 'townWishAdd');
  const input = townAdd(own, 'input');
  input.placeholder = 'Wish for something else...';
  input.maxLength = 40;
  townAdd(own, 'button', '➕ Add', 'arcadeSmall').addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    const fresh = loadTown();
    fresh.wishes.push({ id: 'own-' + Date.now().toString(36), emoji: '⭐', name: name, store: 'My idea', kind: 'other', note: '', at: new Date().toISOString().slice(0, 10) });
    saveTown(fresh);
    showTownHome(`❤️ ${name} is on your wish list!`);
  });
}

function townToast(text) {
  if (typeof careerToast === 'function') careerToast(text);
}

// =====================================================================
// 🔨 Build mode: build your own town with stars
// =====================================================================
// [id, emoji, name, price, what happens when you tap it, needs a name?]
const TOWN_BUILDS = {
  nature: { label: '🌳 Nature', items: [['tree', '🌳', 'Tree', 3, ['wiggle', 'A bird is singing in the tree! 🐦']], ['pine', '🌲', 'Pine tree', 3, ['wiggle', 'It smells like a forest! 🌲']],
    ['flowers', '🌷', 'Flower bed', 2, ['bounce', 'The flowers smell so sweet! 🐝']], ['garden', '🌻', 'Sunflower garden', 4, ['bounce', 'The sunflowers are growing tall! 🌞']],
    ['pond', '🦆', 'Duck pond', 10, ['wiggle', 'Quack quack! 🦆🦆']]] },
  fun: { label: '🎡 Fun', items: [['playground', '🛝', 'Playground', 15, ['bounce', 'Wheee! Down the slide! 🛝']], ['pool', '🏊', 'Pool', 20, ['wiggle', 'SPLASH! 💦💦']],
    ['fountain', '⛲', 'Fountain', 12, ['bounce', 'You tossed a coin in and made a wish! ✨']], ['soccer', '⚽', 'Soccer field', 18, ['bounce', 'GOOOAL! ⚽🥅']],
    ['ferris', '🎡', 'Ferris wheel', 40, ['spin', 'Round and round, way up high! 🎡']], ['castle', '🏰', 'Castle', 60, ['bounce', 'You are the ruler of Kat Town! 👑']]] },
  buildings: { label: '🏡 Buildings', items: [['house', '🏡', 'House', 20, ['bounce', 'Knock knock! Who lives here?'], 'Whose house is it? (like "Grandma")'],
    ['shop', '🏪', 'My own shop', 25, ['bounce', 'Welcome to my shop! 🛍️'], 'Name your shop (like "Slime Spot")'],
    ['fire', '🚒', 'Fire station', 25, ['wiggle', 'Wee-oo wee-oo! 🚒 The firefighters are ready!']], ['vet', '🏥', 'Pet vet', 22, ['bounce', 'All the pets are healthy and happy! 🐾']],
    ['bakery', '🧁', 'Bakery', 18, ['bounce', 'Fresh cupcakes! Mmm! 🧁']]] },
  extras: { label: '✨ Extras', items: [['light', '💡', 'Street light', 2, ['bounce', 'Click! The light is on. 💡']], ['sign', '🪧', 'Sign', 3, ['bounce', ''], 'What does your sign say?'],
    ['car', '🚗', 'Car', 6, ['zoom', 'Beep beep! 🚗💨']], ['dog', '🐶', 'Dog', 8, ['bounce', 'Woof woof! 🐶']], ['cat', '🐈', 'Cat', 8, ['wiggle', 'Meow! 🐈']], ['bench', '🪑', 'Bench', 3, ['bounce', 'A nice place to rest.']]] }
};
// Town levels: how many things you've built
const TOWN_LEVELS = [[0, '🏕️', 'Tiny Town'], [5, '🏘️', 'Village'], [12, '🏡', 'Town'], [20, '🏙️', 'City'], [30, '🌆', 'Big City'], [42, '🌟', 'Mega City']];

function townBuildItem(id) {
  for (const cat of Object.values(TOWN_BUILDS)) { const it = cat.items.find(i => i[0] === id); if (it) return it; }
  return null;
}

function townLevel(t) {
  const n = (t.built || []).length;
  let i = 0;
  TOWN_LEVELS.forEach(([min], k) => { if (n >= min) i = k; });
  const next = TOWN_LEVELS[i + 1];
  return { emoji: TOWN_LEVELS[i][1], name: TOWN_LEVELS[i][2], index: i, next: next ? next[0] : null, nextName: next ? next[2] : null };
}

let townCategory = 'nature';

function showTownPalette(box) {
  const pal = townAdd(box, 'div', undefined, 'townPalette');
  if (townPick && townPick.move) {
    townAdd(pal, 'div', '🚚 Tap an empty lot to move it there.', 'arcadeMessage');
    townAdd(pal, 'button', 'Cancel move', 'arcadeSmall').addEventListener('click', () => { townPick = null; showTownMap(); });
    return;
  }
  const tabs = townAdd(pal, 'div', undefined, 'townTabs');
  Object.entries(TOWN_BUILDS).forEach(([key, cat]) => {
    townAdd(tabs, 'button', cat.label, 'townTab' + (townCategory === key ? ' picked' : '')).addEventListener('click', () => { townCategory = key; showTownMap(); });
  });
  const row = townAdd(pal, 'div', undefined, 'townPaletteItems');
  TOWN_BUILDS[townCategory].items.forEach(([id, emoji, name, price]) => {
    const b = townAdd(row, 'button', undefined, 'townPaletteItem' + (townPick === id ? ' picked' : '') + (townStars() < price ? ' pricey' : ''));
    townAdd(b, 'span', emoji, 'townPaletteEmoji');
    townAdd(b, 'span', name, 'townPaletteName');
    townAdd(b, 'span', `⭐ ${price}`, 'townPalettePrice');
    b.addEventListener('click', () => { townPick = townPick === id ? null : id; showTownMap(townPick ? `${emoji} ${name} picked! Now tap a green lot.` : ''); });
  });
  townAdd(pal, 'div', 'Tap something you built to move it, rename it, or take it down (you get half the stars back).', 'arcadeHint');
}

function townTapLot(lot, c, r) {
  if (!townBuilding) { townWalkTo(c, r); return; }
  // Moving something here
  if (townPick && townPick.move) {
    const t = loadTown();
    const b = t.built.find(x => x.lot === townPick.move);
    if (b) { b.lot = lot; b.fresh = true; saveTown(t); }
    townPick = null;
    showTownMap('🚚 Moved!');
    return;
  }
  if (!townPick) { showTownMap('👆 First pick something to build from the menu below.'); return; }
  const item = townBuildItem(townPick);
  const [id, emoji, name, price, , ask] = item;
  if (typeof pet === 'undefined' || !pet) { showTownMap('🥚 Hatch a pet first to start earning stars!'); return; }
  if (pet.stars < price) { showTownMap(`You need ${price - pet.stars} more ⭐ to build ${emoji} ${name}. Finish a list or play in 🎮 Practice!`); return; }
  const limitSays = townSpendProblem(price);
  if (limitSays) { showTownMap(limitSays); return; }
  let label = '';
  if (ask) {
    label = (prompt(ask, '') || '').trim().slice(0, 18);
    if (!label) return;                                   // cancelled
  }
  pet.stars -= price;
  if (typeof savePet === 'function') savePet();
  if (typeof showPet === 'function') showPet();
  townRecordSpend(price);
  const t = loadTown();
  const before = townLevel(t);
  t.built.push({ lot: lot, id: id, name: label, fresh: true, at: new Date().toISOString().slice(0, 10) });
  saveTown(t);
  const after = townLevel(t);
  showTownMap(`🔨 Bonk bonk! You built ${emoji} ${label || name}!`);
  const tile = document.querySelector(`#townBody .townTile[data-lot="${lot}"]`);
  if (tile) townFly('🔨', tile, null);
  if (after.index > before.index) {
    setTimeout(() => townPop(after.emoji, `🎉 Your town grew into a ${after.name}!`, [['🥳 Yay!', null]], 'townBounceIn'), 500);
    if (typeof addStars === 'function') addStars(2);
  }
}

function townTapBuilt(lot, c, r) {
  const t = loadTown();
  const b = t.built.find(x => x.lot === lot);
  if (!b) return;
  const item = townBuildItem(b.id) || [b.id, '❓', 'Build', 0, ['bounce', '']];
  const [, emoji, name, price, [anim, line], ask] = item;
  if (!townBuilding) {
    // Use it: walk next to it, then it does its thing
    townWalkTo(c, r, () => {
      const say = b.id === 'sign' ? `🪧 "${b.name}"` : b.id === 'shop' ? `Welcome to ${b.name}! 🛍️` : b.id === 'house' ? `🏡 ${b.name}'s house. Knock knock!` : line;
      townPop(emoji, say || name, [['😄 Cool!', null]], 'townPlay-' + anim);
    });
    return;
  }
  const buttons = [['🚚 Move', () => { townPick = { move: lot }; showTownMap(); }]];
  if (ask) buttons.push(['✏️ Rename', () => {
    const fresh = loadTown();
    const it = fresh.built.find(x => x.lot === lot);
    const label = (prompt(ask, it ? it.name : '') || '').trim().slice(0, 18);
    if (it && label) { it.name = label; saveTown(fresh); }
    showTownMap();
  }]);
  buttons.push([`🧹 Take down (+${Math.floor(price / 2)} ⭐)`, () => {
    const fresh = loadTown();
    fresh.built = fresh.built.filter(x => x.lot !== lot);
    saveTown(fresh);
    if (typeof pet !== 'undefined' && pet && price > 1) { pet.stars += Math.floor(price / 2); if (typeof savePet === 'function') savePet(); if (typeof showPet === 'function') showPet(); }
    showTownMap(`🧹 Took down ${emoji} ${b.name || name}.`);
  }]);
  buttons.push(['Cancel', null]);
  townPop(emoji, b.name || name, buttons, 'townBounceIn');
}

// =====================================================================
// 🛋️ Round 3a: decorate My House
// =====================================================================
const TOWN_ROOM_COLS = 5, TOWN_ROOM_ROWS = 4;
const TOWN_WALLS = ['#fff3bf', '#d0ebff', '#ffdeeb', '#d3f9d8', '#e5dbff', '#ffe8cc', '#343a40'];
const TOWN_FLOORS = ['#e8c39e', '#ced4da', '#a5d8ff', '#fcc2d7', '#b2f2bb', '#8d6e63'];
// [id, emoji, name, price, animation, what it says when you tap it]
const TOWN_DECOR = [
  ['bed', '🛏️', 'Comfy bed', 6, 'hug', 'Zzz... so comfy! 😴'],
  ['couch', '🛋️', 'Couch', 8, 'squish', 'Flop! Best seat in the house.'],
  ['lamp', '💡', 'Lamp', 2, 'bounce', 'Click! Lights on ✨'],
  ['plant', '🪴', 'Plant', 2, 'wiggle', 'Your plant grew a new leaf! 🌱'],
  ['picture', '🖼️', 'Picture', 3, 'hug', 'What a beautiful picture!'],
  ['mirror', '🪞', 'Mirror', 4, 'spin', 'Looking good! 😎'],
  ['teddy', '🧸', 'Big teddy', 4, 'hug', 'Big teddy hug! 🤗'],
  ['books', '📚', 'Bookshelf', 5, 'bounce', 'You read a chapter! 📖'],
  ['desk', '🪑', 'Desk chair', 3, 'spin', 'Spinny chair! Wheee!'],
  ['trophy', '🏆', 'Trophy shelf', 6, 'bounce', 'Champion of chores! 🏆'],
  ['hoop', '🏀', 'Mini hoop', 8, 'bounce', 'Swish! Nothing but net! 🏀'],
  ['fish', '🐠', 'Fish tank', 10, 'wiggle', 'Blub blub! The fish say hi 🫧'],
  ['guitar', '🎸', 'Guitar', 10, 'wiggle', 'Strum strum! 🎶'],
  ['tv', '📺', 'TV', 12, 'bounce', 'Your favorite show is on! 📺'],
  ['disco', '🪩', 'Disco ball', 12, 'spin', 'Dance party! 🕺💃'],
  ['computer', '💻', 'Computer', 14, 'bounce', 'You wrote some code! 👩‍💻'],
  ['game', '🎮', 'Game console', 15, 'wiggle', 'Level up! 🎮']
];
let townDecorating = false;
let townDecorPick = null;          // a decor id, or { move: spot }

function townRoom(t) {
  if (!t.room || typeof t.room !== 'object') t.room = {};
  if (typeof t.room.wall !== 'number') t.room.wall = 0;
  if (typeof t.room.floor !== 'number') t.room.floor = 0;
  if (!Array.isArray(t.room.items)) t.room.items = [];
  return t.room;
}
function townDecorItem(id) { return TOWN_DECOR.find(d => d[0] === id); }

// The room picture inside My House
function townRoomSection(box) {
  const t = loadTown();
  const room = townRoom(t);
  townAdd(box, 'h3', '🛋️ My room', 'fgHead');
  const toggle = townAdd(box, 'button', townDecorating ? '✅ Done decorating' : '🎨 Decorate my room', townDecorating ? 'arcadeGo' : 'arcadeGo townBuildBtn');
  toggle.addEventListener('click', () => { townDecorating = !townDecorating; townDecorPick = null; showTownHome(); });
  townRoomGrid(box, room, townDecorating, (spot, tile, d) => d ? townTapDecor(spot, tile) : townTapSpot(spot));
  if (room.items.some(i => i.fresh)) { room.items.forEach(i => { delete i.fresh; }); saveTown(t); }
  if (!townDecorating) {
    if (!room.items.length) townAdd(box, 'div', 'Your room is empty! Tap 🎨 Decorate to add a bed, a TV and more.', 'arcadeHint');
    return;
  }
  // Decorate menu
  const pal = townAdd(box, 'div', undefined, 'townPalette');
  if (townDecorPick && townDecorPick.move) {
    townAdd(pal, 'div', '🚚 Tap an empty spot to move it there.', 'arcadeMessage');
    townAdd(pal, 'button', 'Cancel move', 'arcadeSmall').addEventListener('click', () => { townDecorPick = null; showTownHome(); });
    return;
  }
  townAdd(pal, 'div', townSpendLine(), 'arcadeHint townSpendLine');
  const row = townAdd(pal, 'div', undefined, 'townPaletteItems');
  TOWN_DECOR.forEach(([id, emoji, name, price]) => {
    const b = townAdd(row, 'button', undefined, 'townPaletteItem' + (townDecorPick === id ? ' picked' : '') + (townStars() < price ? ' pricey' : ''));
    townAdd(b, 'span', emoji, 'townPaletteEmoji');
    townAdd(b, 'span', name, 'townPaletteName');
    townAdd(b, 'span', `⭐ ${price}`, 'townPalettePrice');
    b.addEventListener('click', () => { townDecorPick = townDecorPick === id ? null : id; showTownHome(townDecorPick ? `${emoji} ${name} picked! Now tap a spot in your room.` : ''); });
  });
  [['🎨 Wall', TOWN_WALLS, 'wall'], ['🟫 Floor', TOWN_FLOORS, 'floor']].forEach(([label, colors, key]) => {
    const line = townAdd(pal, 'div', undefined, 'townColorRow');
    townAdd(line, 'span', label, 'townColorLabel');
    colors.forEach((color, i) => {
      const s = townAdd(line, 'button', '', 'townChoice swatch' + (room[key] === i ? ' picked' : ''));
      s.style.background = color;
      s.setAttribute('aria-label', `${key} color ${i + 1}`);
      s.addEventListener('click', () => { const fresh = loadTown(); townRoom(fresh)[key] = i; saveTown(fresh); showTownHome(); });
    });
  });
  townAdd(pal, 'div', 'Colors are free! Tap something in your room to move it or put it away (half the stars back).', 'arcadeHint');
}

// Draws a room (mine, or a brother's or sister's when visiting). onTap(spot, tile, decorItem or undefined)
function townRoomGrid(box, room, editing, onTap) {
  const grid = townAdd(box, 'div', undefined, 'townRoom' + (editing ? ' building' : ''));
  grid.style.background = `linear-gradient(${TOWN_WALLS[room.wall] || TOWN_WALLS[0]} 0 50%, ${TOWN_FLOORS[room.floor] || TOWN_FLOORS[0]} 50% 100%)`;
  const at = {};
  (room.items || []).forEach(i => { at[i.spot] = i; });
  for (let r = 0; r < TOWN_ROOM_ROWS; r++) {
    for (let c = 0; c < TOWN_ROOM_COLS; c++) {
      const spot = c + ',' + r;
      const it = at[spot];
      const d = it && townDecorItem(it.id);
      const tile = townAdd(grid, 'button', d ? d[1] : '', 'townRoomSpot' + (d ? ' filled' : '') + (editing && townDecorPick && townDecorPick.move === spot ? ' moving' : '') + (it && it.fresh ? ' townBounceIn' : ''));
      tile.dataset.spot = spot;
      tile.setAttribute('aria-label', d ? d[2] : 'Empty spot');
      tile.addEventListener('click', () => onTap(spot, tile, d));
    }
  }
  return grid;
}

function townTapSpot(spot) {
  if (!townDecorating) return;
  const t = loadTown();
  const room = townRoom(t);
  if (townDecorPick && townDecorPick.move) {
    const it = room.items.find(i => i.spot === townDecorPick.move);
    if (it) { it.spot = spot; it.fresh = true; saveTown(t); }
    townDecorPick = null;
    showTownHome('🚚 Moved!');
    return;
  }
  if (!townDecorPick) { showTownHome('👆 First pick something from the menu below.'); return; }
  const [id, emoji, name, price] = townDecorItem(townDecorPick);
  if (typeof pet === 'undefined' || !pet) { showTownHome('🥚 Hatch a pet first to start earning stars!'); return; }
  if (pet.stars < price) { showTownHome(`You need ${price - pet.stars} more ⭐ for the ${emoji} ${name}. Finish a list or do a 💼 town job!`); return; }
  const limitSays = townSpendProblem(price);
  if (limitSays) { showTownHome(limitSays); return; }
  pet.stars -= price;
  townRecordSpend(price);
  if (typeof savePet === 'function') savePet();
  if (typeof showPet === 'function') showPet();
  room.items.push({ spot: spot, id: id, fresh: true });
  saveTown(t);
  showTownHome(`✨ Your ${name.toLowerCase()} looks great!`);
}

function townTapDecor(spot, tile) {
  const t = loadTown();
  const it = townRoom(t).items.find(i => i.spot === spot);
  const d = it && townDecorItem(it.id);
  if (!d) return;
  const [, emoji, name, price, anim, line] = d;
  if (!townDecorating) { townPop(emoji, line, [['😄 Cool!', null]], 'townPlay-' + anim); return; }
  townPop(emoji, name, [
    ['🚚 Move', () => { townDecorPick = { move: spot }; showTownHome(); }],
    [`📦 Put away (+${Math.floor(price / 2)} ⭐)`, () => {
      const fresh = loadTown();
      const room = townRoom(fresh);
      room.items = room.items.filter(i => i.spot !== spot);
      saveTown(fresh);
      if (typeof addStars === 'function') addStars(Math.floor(price / 2));
      showTownHome(`📦 Put away the ${name.toLowerCase()}.`);
    }],
    ['Cancel', null]
  ], 'townBounceIn');
}

// =====================================================================
// 💼 Round 3b: town jobs that match real chores
// Finishing a real list unlocks one job shift in town that day.
// =====================================================================
// [id, emoji, job, what the list says (chore words), thing to tap, goal, building that gives a bonus]
const TOWN_JOBS = [
  ['trash', '🚛', 'Trash truck driver', /trash|garbage|recycl/i, '🗑️', 'Pick up 6 trash cans!', null],
  ['dishes', '🍽️', 'Diner dish washer', /dish|kitchen|table|lunch/i, '🍽️', 'Wash 6 dirty plates!', 'bakery'],
  ['vet', '🐾', 'Vet helper', /dog|cat|pet|feed|walk/i, '🐶', 'Give 6 puppies a checkup!', 'vet'],
  ['laundry', '🧺', 'Laundromat helper', /laundry|clothes|socks|fold|shoes/i, '🧦', 'Match 6 lost socks!', null],
  ['books', '📚', 'Library helper', /homework|read|study|book|backpack/i, '📕', 'Put 6 books back on the shelf!', null],
  ['coach', '⚽', 'Soccer coach', /run|park|exercise|practice|play outside/i, '⚽', 'Kick 6 goals!', 'soccer'],
  ['carwash', '🚗', 'Car wash', /shower|bath|wash|teeth|brush/i, '🚗', 'Wash 6 muddy cars!', null],
  ['sweep', '🧹', 'Park cleaner', /clean|room|tidy|bed|toys/i, '🍂', 'Sweep up 6 leaf piles!', 'playground']
];
// When nothing on the list matches a chore word
const TOWN_LIST_JOBS = {
  morning: ['mail', '📬', 'Mail carrier', null, '✉️', 'Deliver 6 letters!', null],
  afternoon: ['fire', '🚒', 'Firefighter', null, '🔥', 'Put out 6 fires!', 'fire'],
  bedtime: ['night', '🌙', 'Night watch', null, '💡', 'Turn on 6 streetlights!', 'light']
};
const TOWN_JOB_PAY = 2;

function townToday() { return new Date().toDateString(); }
function townJobs(t) {
  if (!t.jobs || t.jobs.date !== townToday()) t.jobs = { date: townToday(), ready: [], done: [] };
  return t.jobs;
}
function townJobById(id) {
  return TOWN_JOBS.find(j => j[0] === id) || Object.values(TOWN_LIST_JOBS).find(j => j[0] === id);
}

// Called by index.html when a whole list is checked off (once per list per day)
function townJobUnlock(listId, taskTexts) {
  if (!townAllowed() || !TOWN_LIST_JOBS[listId]) return null;
  const t = loadTown();
  if (!t.avatar) return null;                 // no character yet
  const jobs = townJobs(t);
  if (jobs.ready.some(r => r.list === listId) || jobs.done.some(d => d.list === listId)) return null;
  const words = (taskTexts || []).join(' ');
  const taken = [...jobs.ready, ...jobs.done].map(j => j.id);
  const match = TOWN_JOBS.find(j => j[3].test(words) && !taken.includes(j[0]));
  const job = match || TOWN_LIST_JOBS[listId];
  jobs.ready.push({ list: listId, id: job[0] });
  saveTown(t);
  return job;
}

function showTownJobs() {
  const t = loadTown();
  const jobs = townJobs(t);
  townView = 'jobs';
  const box = townBody('💼 Town jobs');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  townAdd(box, 'div', 'Finish a real list (Morning, After School or Bedtime) to get a job shift in town. Each shift pays ⭐ ' + TOWN_JOB_PAY + '. Built the matching place in your town? +1 bonus!', 'arcadeHint');
  if (!jobs.ready.length && !jobs.done.length) {
    townAdd(box, 'div', '📋 No shifts yet today. Go finish a list, then come back!', 'arcadeMessage');
    return;
  }
  jobs.ready.forEach(r => {
    const job = townJobById(r.id);
    if (!job) return;
    const card = townAdd(box, 'div', undefined, 'townJob');
    townAdd(card, 'div', job[1], 'townJobEmoji');
    const info = townAdd(card, 'div', undefined, 'townJobInfo');
    townAdd(info, 'div', job[2], 'townJobName');
    townAdd(info, 'div', job[5], 'townJobGoal');
    townAdd(card, 'button', '▶️ Work', 'arcadeGo').addEventListener('click', () => townWork(r.id));
  });
  jobs.done.forEach(d => {
    const job = townJobById(d.id);
    if (job) townAdd(box, 'div', `✅ ${job[1]} ${job[2]}: done! +${d.paid} ⭐`, 'townJobDone');
  });
}

// The job itself: tap 6 things that pop up around the screen
function townWork(id) {
  const job = townJobById(id);
  if (!job) return;
  const [, emoji, name, , target, goal, bonusBuild] = job;
  const field = document.createElement('div');
  field.className = 'townJobField';
  const pop = townPop(field, `${emoji} ${goal}`, [['Stop', null]]);
  let left = 6;
  const next = () => {
    field.innerHTML = '';
    const thing = townAdd(field, 'button', target, 'townJobTarget townBounceIn');
    thing.style.left = (8 + Math.random() * 72) + '%';
    thing.style.top = (8 + Math.random() * 62) + '%';
    thing.setAttribute('aria-label', 'Tap it');
    thing.addEventListener('click', () => {
      left -= 1;
      if (left > 0) { pop.say.textContent = `${emoji} ${left} to go!`; next(); return; }
      field.innerHTML = '';
      townFinishJob(id, pop, emoji, name, bonusBuild);
    });
  };
  next();
}

function townFinishJob(id, pop, emoji, name, bonusBuild) {
  const t = loadTown();
  const jobs = townJobs(t);
  const r = jobs.ready.find(x => x.id === id);
  if (!r) return;
  const bonus = bonusBuild && t.built.some(b => b.id === bonusBuild) ? 1 : 0;
  const paid = TOWN_JOB_PAY + bonus;
  jobs.ready = jobs.ready.filter(x => x.id !== id);
  jobs.done.push({ list: r.list, id: id, paid: paid });
  t.workShifts = (t.workShifts || 0) + 1;
  saveTown(t);
  if (typeof addStars === 'function') addStars(paid);
  townAdd(pop.stage, 'div', emoji, 'townPopEmoji townPlay-bounce');
  pop.say.textContent = `🎉 Great work, ${name.toLowerCase()}! You earned ⭐ ${paid}` + (bonus ? ' (+1 for the place you built!)' : '') + '.';
  townPopButtons(pop, [['💪 Yay!', () => showTownJobs()]]);
}

// =====================================================================
// 👨‍👩‍👧 Round 4: visit your brothers' and sisters' towns
// Look only (nothing can be changed), preset reactions only, one per
// town per day. A grown-up turns it on in the dashboard. Siblings only.
// =====================================================================
const TOWN_REACTIONS = { love: ['❤️', 'Love it!'], wow: ['🤩', 'Wow!'], fun: ['😂', 'So fun!'], best: ['🏆', 'Best town!'] };
let townVisiting = null;          // the sibling town being visited

function townFamilyToken() { return typeof cloudGet === 'function' && typeof CLOUD !== 'undefined' ? cloudGet(CLOUD.token) : null; }

async function showTownFamily(message) {
  townView = 'family';
  townVisiting = null;
  const box = townBody('👨‍👩‍👧 Family towns');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  const token = townFamilyToken();
  if (!token) {
    townAdd(box, 'div', '☁️ This phone isn\'t in the online family yet. Ask a grown-up to set it up in ⚙️ Grown-ups.', 'arcadeMessage');
    return;
  }
  const wait = townAdd(box, 'div', '⏳ Looking for family towns...', 'arcadeHint');
  const r = await cloudCall('family_towns', { p_token: token });
  if (townView !== 'family') return;               // they left while it loaded
  wait.remove();
  if (!r || !r.ok) { townAdd(box, 'div', '📡 ' + ((r && r.error) || 'Could not reach the family towns. Try again soon.'), 'arcadeMessage'); return; }
  if (!r.on) {
    townAdd(box, 'div', `🔒 Family visits are off. Ask ${typeof parentName === 'function' ? parentName() : 'a grown-up'} to turn them on in the dashboard.`, 'arcadeMessage');
    return;
  }
  if (!r.towns.length) { townAdd(box, 'div', '🏗️ Nobody else has made a character yet. Tell your brother or sister to open 🏙️ Kat Town!', 'arcadeMessage'); return; }
  townAdd(box, 'div', 'Tap a town to visit. You can look around and send a reaction, but you can\'t change anything.', 'arcadeHint');
  r.towns.forEach(o => {
    const card = townAdd(box, 'div', undefined, 'townJob townFamilyCard');
    card.appendChild(townAvatarSvg(Object.assign(townDefaultAvatar(), o.avatar || {}), 56));
    const info = townAdd(card, 'div', undefined, 'townJobInfo');
    const level = townLevel({ built: o.built || [] });
    townAdd(info, 'div', `${o.nickname}'s town`, 'townJobName');
    townAdd(info, 'div', `${level.emoji} ${level.name} · ${(o.built || []).length} built`, 'townJobGoal');
    townAdd(card, 'button', '🚶 Visit', 'arcadeGo').addEventListener('click', () => showTownVisit(o));
  });
}

function showTownVisit(o, message) {
  townView = 'visit';
  townVisiting = o;
  const level = townLevel({ built: o.built || [] });
  const box = townBody(`🏙️ ${o.nickname}'s town`);
  townAdd(box, 'button', '← Family', 'arcadeBack').addEventListener('click', () => showTownFamily());
  townAdd(box, 'div', `${level.emoji} ${level.name} · ${(o.built || []).length} built · just looking 👀`, 'arcadeHint townTop');
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  const map = townAdd(box, 'div', undefined, 'townMap visiting');
  map.style.gridTemplateColumns = `repeat(${TOWN_COLS}, 1fr)`;
  const built = {};
  (o.built || []).forEach(b => { if (b && typeof b.lot === 'string') built[b.lot] = b; });
  for (let r = 0; r < TOWN_ROWS; r++) {
    for (let c = 0; c < TOWN_COLS; c++) {
      const lot = c + ',' + r;
      const place = townPlaceAt(c, r);
      if (townIsRoad(c, r)) {
        townAdd(map, 'div', '', 'townTile road' + (c === TOWN_ROAD_COL && r === TOWN_ROAD_ROW ? ' cross' : c === TOWN_ROAD_COL ? ' down' : ' across'));
      } else if (place) {
        const tile = townAdd(map, 'div', undefined, 'townTile place');
        tile.dataset.place = place[0];
        townAdd(tile, 'span', place[1], 'townPlaceEmoji');
        townAdd(tile, 'span', place[3], 'townPlaceName');
      } else if (built[lot] && townBuildItem(built[lot].id)) {
        const b = built[lot];
        const [, emoji, name, , [anim, line]] = townBuildItem(b.id);
        const label = String(b.name || '').slice(0, 18);
        const tile = townAdd(map, 'button', undefined, 'townTile built');
        tile.dataset.lot = lot;
        tile.setAttribute('aria-label', label || name);
        townAdd(tile, 'span', emoji, 'townBuiltEmoji');
        if (label) townAdd(tile, 'span', label, 'townPlaceName');
        tile.addEventListener('click', () => townPop(emoji, label ? `${label} ${emoji}` : line || name, [['😄 Cool!', null]], 'townPlay-' + anim));
      } else {
        townAdd(map, 'div', '', 'townTile');
      }
    }
  }
  const me = townAdd(map, 'div', undefined, 'townMe');
  me.appendChild(townAvatarSvg(Object.assign(townDefaultAvatar(), o.avatar || {}), 40));
  townPlaceMe(me, TOWN_ROAD_COL, TOWN_ROAD_ROW);

  townAdd(box, 'button', `🏠 See ${o.nickname}'s room`, 'arcadeGo').addEventListener('click', () => showTownVisitRoom(o));
  townReactionRow(box, o);
}

function showTownVisitRoom(o) {
  townView = 'visitroom';
  const box = townBody(`🛋️ ${o.nickname}'s room`);
  townAdd(box, 'button', `← ${o.nickname}'s town`, 'arcadeBack').addEventListener('click', () => showTownVisit(o));
  const room = o.room && typeof o.room === 'object' ? o.room : {};
  const items = Array.isArray(room.items) ? room.items.filter(i => i && townDecorItem(i.id)) : [];
  townRoomGrid(box, { wall: room.wall | 0, floor: room.floor | 0, items: items }, false, (spot, tile, d) => {
    if (d) townPop(d[1], d[5], [['😄 Cool!', null]], 'townPlay-' + d[4]);
  });
  if (!items.length) townAdd(box, 'div', `${o.nickname} hasn't decorated yet.`, 'arcadeHint');
  townReactionRow(box, o);
}

// The four preset reactions (no typing, so visits stay kind and safe)
function townReactionRow(box, o) {
  townAdd(box, 'h3', `Send ${o.nickname} a reaction`, 'fgHead');
  const row = townAdd(box, 'div', undefined, 'townReactions');
  if (o.reacted) { townAdd(box, 'div', '✅ You sent a reaction today. Come back tomorrow!', 'arcadeHint'); return; }
  Object.entries(TOWN_REACTIONS).forEach(([key, [emoji, words]]) => {
    const b = townAdd(row, 'button', `${emoji} ${words}`, 'townReaction');
    b.addEventListener('click', async () => {
      row.querySelectorAll('button').forEach(x => { x.disabled = true; });
      const r = await cloudCall('town_react', { p_token: townFamilyToken(), p_to: o.nickname, p_reaction: key });
      if (r && r.ok) {
        o.reacted = true;
        townFly(emoji, b, null);
        const view = townView;
        if (view === 'visit') showTownVisit(o, `${emoji} Sent! ${o.nickname} will see it next time they open the app.`);
        else showTownVisitRoom(o);
      } else {
        row.querySelectorAll('button').forEach(x => { x.disabled = false; });
        townToast('⚠️ ' + ((r && r.error) || 'Could not send. Try again.'));
        if (r && /already/.test(r.error || '')) { o.reacted = true; }
      }
    });
  });
}

// A brother or sister visited my town (from the parent inbox, sync.js)
function receiveTownVisit(d) {
  const reaction = TOWN_REACTIONS[d.reaction];
  if (!reaction) return '';
  const from = String(d.from || 'Someone').slice(0, 30);
  const t = loadTown();
  if (!Array.isArray(t.visits)) t.visits = [];
  t.visits.push({ from: from, reaction: d.reaction, at: new Date().toISOString().slice(0, 10) });
  t.visits = t.visits.slice(-10);
  saveTown(t);
  return `🏙️ ${from} visited your Kat Town: ${reaction[0]} ${reaction[1]}`;
}
