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
    items: [['hoodie', '🧥', 'Cozy hoodie', 15], ['jersey', '🎽', 'Team jersey', 15], ['dress', '👗', 'Party dress', 15], ['pajamas', '🛌', 'Pajama set', 10],
            ['cap', '🧢', 'Baseball cap', 8], ['sunglasses', '🕶️', 'Cool sunglasses', 8], ['headphones', '🎧', 'Headphones', 12], ['crown', '👑', 'Royal crown', 30],
            ['sneakers', '👟', 'Sparkly sneakers', 12], ['backpack', '🎒', 'New backpack', 12]] },
  burger: { name: 'Paw Burger', emoji: '🍔', color: '#fef3c7', kind: 'food', hello: 'What sounds yummy? Tap ❤️ to tell your grown-up for dinner ideas.',
    items: [['burger', '🍔', 'Cheeseburger', 4], ['tacos', '🌮', 'Tacos', 4], ['pizza', '🍕', 'Pizza slice', 4], ['nuggets', '🍗', 'Chicken nuggets', 4],
            ['mac', '🧀', 'Mac and cheese', 3], ['spaghetti', '🍝', 'Spaghetti', 4], ['pancakes', '🥞', 'Pancakes', 3], ['sushi', '🍣', 'Sushi', 5],
            ['smoothie', '🥤', 'Fruit smoothie', 3], ['icecream', '🍦', 'Ice cream cone', 3]] },
  toys: { name: 'Toy Box', emoji: '🧸', color: '#dcfce7', kind: 'toys', hello: 'Toys for your room! Wish for the real ones with ❤️.',
    items: [['slime', '🟢', 'Slime kit', 10], ['blocks', '🧱', 'Building blocks', 12], ['soccer', '⚽', 'Soccer ball', 8], ['art', '🎨', 'Art set', 10],
            ['puzzle', '🧩', 'Puzzle', 6], ['plush', '🧸', 'Stuffed animal', 8], ['rccar', '🏎️', 'Remote control car', 20], ['science', '🔬', 'Science kit', 15],
            ['books', '📚', 'Book set', 8], ['game', '🎲', 'Board game', 10]] }
};

// Places on the map: [id, emoji, name, where on the map (% left, % top)]
const TOWN_PLACES = [
  ['home', '🏠', 'My House', 18, 22], ['closet', '👕', 'Kat Closet', 50, 18], ['burger', '🍔', 'Paw Burger', 82, 22],
  ['school', '🏫', 'Kat Academy', 18, 70], ['arcade', '🕹️', 'Arcade', 50, 76], ['toys', '🧸', 'Toy Box', 82, 70]
];

let townSpot = 'park';                 // where the character is standing
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
  return t;
}
function saveTown(t) {
  t.wishes = t.wishes.slice(-40);
  t.bought = t.bought.slice(-30);
  localStorage.setItem('kiddyKatTown', JSON.stringify(t));
}

function townStars() { return typeof pet !== 'undefined' && pet ? pet.stars : 0; }

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
  if (a.outfit === 'hoodie') el('path', { d: 'M26 52 Q26 20 50 20 Q74 20 74 52 L74 74 L26 74 Z', fill: cloth, opacity: 0.85 });

  // Body and outfit
  if (a.outfit === 'dress') {
    el('path', { d: 'M36 74 L64 74 L78 118 L22 118 Z', fill: cloth });
  } else {
    el('rect', { x: 28, y: 74, width: 44, height: 40, rx: 12, fill: cloth });
    if (a.outfit === 'pajamas') [84, 96, 108].forEach(y => el('line', { x1: 30, y1: y, x2: 70, y2: y, stroke: '#ffffff', 'stroke-width': 2, opacity: 0.6 }));
    if (a.outfit === 'jersey') { el('text', { x: 50, y: 104, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#ffffff', 'font-family': 'Arial, sans-serif' }).textContent = '7'; }
    if (a.outfit === 'hoodie') el('rect', { x: 38, y: 96, width: 24, height: 10, rx: 4, fill: '#000000', opacity: 0.12 });
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
  if (townView !== 'map' && loadTown().avatar) { showTownMap(); return; }
  leaveTown();
}

function leaveTown() {
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
function showTownMap() {
  townView = 'map';
  const t = loadTown();
  const box = townBody('🏙️ Kat Town');
  townAdd(box, 'div', `⭐ ${townStars()} stars to spend · tap a place to walk there`, 'arcadeHint');
  const map = townAdd(box, 'div', undefined, 'townMap');
  townAdd(map, 'div', '', 'townRoad across');
  townAdd(map, 'div', '', 'townRoad down');
  townAdd(map, 'div', '🌳', 'townTree t1');
  townAdd(map, 'div', '🌳', 'townTree t2');
  townAdd(map, 'div', '⛲', 'townTree t3');
  TOWN_PLACES.forEach(([id, emoji, name, x, y]) => {
    const b = townAdd(map, 'button', undefined, 'townPlace');
    b.style.left = x + '%';
    b.style.top = y + '%';
    townAdd(b, 'span', emoji, 'townPlaceEmoji');
    townAdd(b, 'span', name, 'townPlaceName');
    b.addEventListener('click', () => townWalkTo(id, x, y));
  });
  const me = townAdd(map, 'div', undefined, 'townMe');
  me.appendChild(townAvatarSvg(t.avatar || townDefaultAvatar(), 46));
  const here = TOWN_PLACES.find(p => p[0] === townSpot);
  me.style.left = (here ? here[3] : 50) + '%';
  me.style.top = (here ? here[4] + 14 : 47) + '%';
  const wishes = t.wishes.length;
  townAdd(box, 'div', wishes ? `💝 ${wishes} thing${wishes === 1 ? '' : 's'} on your wish list (see 🏠 My House)` : '💝 Tap ❤️ on anything in a store to add it to your wish list.', 'arcadeHint');
}

function townWalkTo(id, x, y) {
  const me = document.querySelector('#townBody .townMe');
  if (!me) return;
  me.style.left = x + '%';
  me.style.top = (y + 14) + '%';
  me.classList.add('walking');
  townSpot = id;
  setTimeout(() => townEnter(id), 750);       // let the walk finish
}

function townEnter(id) {
  if (document.getElementById('town').style.display !== 'block') return;
  if (id === 'home') { showTownHome(); return; }
  if (id === 'school') { leaveTown(); townReturn = true; if (typeof openPractice === 'function') openPractice(); return; }
  if (id === 'arcade') { leaveTown(); townReturn = true; if (typeof openArcade === 'function') openArcade(); return; }
  showTownStore(id);
}

// ---------- 🛍️ A store ----------
function showTownStore(id, message) {
  const store = TOWN_STORES[id];
  const t = loadTown();
  townView = 'store';
  const box = townBody(`${store.emoji} ${store.name}`);
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', showTownMap);
  townAdd(box, 'div', store.hello, 'arcadeHint');
  townAdd(box, 'div', `⭐ ${townStars()} stars`, 'townWallet');
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  const grid = townAdd(box, 'div', undefined, 'townShelf');
  store.items.forEach(([itemId, emoji, name, price]) => {
    const card = townAdd(grid, 'div', undefined, 'townItem');
    card.style.background = store.color;
    townAdd(card, 'div', emoji, 'townItemEmoji');
    townAdd(card, 'div', name, 'townItemName');
    const owned = store.kind !== 'food' && t.owned.includes(itemId);
    const wished = t.wishes.some(w => w.id === itemId);
    const buttons = townAdd(card, 'div', undefined, 'townItemButtons');
    const buy = townAdd(buttons, 'button', owned ? '✅ Got it' : `⭐ ${price}`, 'townBuy');
    buy.disabled = owned;
    buy.addEventListener('click', () => townBuy(id, itemId));
    const heart = townAdd(buttons, 'button', wished ? '❤️' : '🤍', 'townHeart' + (wished ? ' on' : ''));
    heart.setAttribute('aria-label', wished ? 'On your wish list' : 'Add to wish list');
    heart.addEventListener('click', () => townWish(id, itemId));
  });
}

function townBuy(storeId, itemId) {
  const store = TOWN_STORES[storeId];
  const [, emoji, name, price] = store.items.find(i => i[0] === itemId);
  if (typeof pet === 'undefined' || !pet) { showTownStore(storeId, '🥚 Hatch a pet first to start earning stars!'); return; }
  if (pet.stars < price) { showTownStore(storeId, `You need ${price - pet.stars} more ⭐ for ${name}. Finish a list or play in 🎮 Practice!`); return; }
  if (!confirm(`Buy ${emoji} ${name} for ${price} ⭐?`)) return;
  pet.stars -= price;
  if (typeof savePet === 'function') savePet();
  if (typeof showPet === 'function') showPet();
  const t = loadTown();
  if (store.kind !== 'food' && !t.owned.includes(itemId)) t.owned.push(itemId);
  t.bought.push({ id: itemId, emoji: emoji, name: name, store: store.name, at: new Date().toISOString().slice(0, 10) });
  saveTown(t);
  let say = `${emoji} You got ${name}!`;
  if (store.kind === 'food') say = `${emoji} Yum! That ${name.toLowerCase()} was delicious!`;
  if (TOWN_OUTFITS.some(o => o[2] === itemId) || TOWN_EXTRAS.some(o => o[2] === itemId)) say += ' Wear it from 🏠 My House → 🎨 My look.';
  showTownStore(storeId, say);
}

function townWish(storeId, itemId) {
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

  // My stuff
  townAdd(box, 'h3', '🧸 My stuff', 'fgHead');
  const things = Object.values(TOWN_STORES).filter(s => s.kind !== 'food').flatMap(s => s.items).filter(i => t.owned.includes(i[0]));
  if (!things.length) townAdd(box, 'div', 'Nothing yet. Visit 👕 Kat Closet and 🧸 Toy Box!', 'arcadeHint');
  else townAdd(box, 'div', things.map(i => i[1]).join(' '), 'townStuff');

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
