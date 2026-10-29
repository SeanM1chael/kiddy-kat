// =====================================================================
// stickers.js — the Kiddy Kat sticker album
// Every celebration gives 3 stickers. Some are rare, a few are super rare.
// Filling a whole set earns a bonus of 10 stars.
// =====================================================================

// Rarity: c = common, r = rare, s = super rare
const STICKER_SETS = [
  { name: 'Animals', stickers: [['🐶','c'], ['🐱','c'], ['🐰','c'], ['🐸','c'], ['🐼','c'], ['🦊','r'], ['🦄','r'], ['🐉','s']] },
  { name: 'Sweets',  stickers: [['🍭','c'], ['🍬','c'], ['🍪','c'], ['🍩','c'], ['🍫','c'], ['🧁','r'], ['🍦','r'], ['🎂','s']] },
  { name: 'Nature',  stickers: [['🌸','c'], ['🌻','c'], ['🌵','c'], ['🍄','c'], ['🌺','c'], ['🍀','r'], ['🌈','r'], ['🌋','s']] },
  { name: 'Space',   stickers: [['⭐','c'], ['🌙','c'], ['☀️','c'], ['🚀','c'], ['🪐','r'], ['☄️','r'], ['🛸','r'], ['🌌','s']] },
  // Only handed out from Oct 15 to Nov 7, but stays in the album forever
  { name: 'Halloween', season: 'halloween',
                     stickers: [['🎃','c'], ['👻','c'], ['🦇','c'], ['🕷️','c'], ['🕸️','c'], ['🧙','r'], ['💀','r'], ['🧛','s']] }
];

// Grown-ups (career mode) collect badges for a Trophy Case instead
const ADULT_SETS = [
  { name: 'Career',     stickers: [['💼','c'], ['📈','c'], ['📨','c'], ['🤝','c'], ['🧠','c'], ['🎯','r'], ['🏅','r'], ['👔','s']] },
  { name: 'Tech',       stickers: [['💻','c'], ['⌨️','c'], ['🖱️','c'], ['🔧','c'], ['📡','c'], ['🤖','r'], ['☁️','r'], ['🛰️','s']] },
  { name: 'Wellness',   stickers: [['🏃','c'], ['🧘','c'], ['💧','c'], ['🥗','c'], ['😴','c'], ['🚴','r'], ['🏋️','r'], ['🏔️','s']] },
  { name: 'Leadership', stickers: [['📣','c'], ['📋','c'], ['🧭','c'], ['🗓️','c'], ['☕','c'], ['🎤','r'], ['🏛️','r'], ['👑','s']] },
  { name: 'Family',     stickers: [['🍕','c'], ['🎬','c'], ['🏡','c'], ['⚽','c'], ['🎲','c'], ['🎢','r'], ['🏖️','r'], ['❤️','s']] }
];
const adultAlbum = () => typeof animal !== 'undefined' && animal.theme === 'eagle';
const stickerSets = () => adultAlbum() ? ADULT_SETS : STICKER_SETS;

const SET_BONUS = 10;

let stickerBook = JSON.parse(localStorage.getItem('kiddyKatStickers') || '{}');   // emoji -> how many
let setsDone = JSON.parse(localStorage.getItem('kiddyKatSetsDone') || '[]');

function saveStickers() {
  localStorage.setItem('kiddyKatStickers', JSON.stringify(stickerBook));
  localStorage.setItem('kiddyKatSetsDone', JSON.stringify(setsDone));
}

// Picks one sticker: 80% common, 17% rare, 3% super rare
function randomSticker() {
  const roll = Math.random();
  const rarity = roll < 0.03 ? 's' : roll < 0.20 ? 'r' : 'c';
  const pool = [];
  stickerSets().filter(set => inSeason(set)).forEach(set =>
    set.stickers.forEach(([emoji, r]) => { if (r === rarity) pool.push([emoji, r]); }));
  return pool[Math.floor(Math.random() * pool.length)];
}

// Gives stickers and returns them plus a message about anything special
function earnStickers(count) {
  const emojis = [];
  const notes = [];
  for (let i = 0; i < count; i++) {
    const [emoji, rarity] = randomSticker();
    const isNew = !stickerBook[emoji];
    stickerBook[emoji] = (stickerBook[emoji] || 0) + 1;
    emojis.push(emoji);
    if (rarity === 's') notes.push(`🌟 SUPER RARE ${emoji}!`);
    else if (rarity === 'r' && isNew) notes.push(`✨ Rare ${emoji}!`);
    else if (isNew) notes.push(`New ${emoji}!`);
  }

  // Did any set just get finished?
  stickerSets().forEach(set => {
    const complete = set.stickers.every(([emoji]) => stickerBook[emoji]);
    if (complete && !setsDone.includes(set.name)) {
      setsDone.push(set.name);
      addStars(SET_BONUS);
      notes.push(`${adultAlbum() ? '🏆' : '📒'} ${set.name} set complete! +${SET_BONUS} ⭐`);
    }
  });

  saveStickers();
  return { emojis: emojis, note: notes.join('  ') };
}

// ---------- The album ----------
function openAlbum() {
  document.getElementById('album').style.display = 'block';
  showAlbum();
}

function closeAlbum() {
  document.getElementById('album').style.display = 'none';
}

function showAlbum() {
  const sets = stickerSets();
  const total = sets.reduce((sum, set) => sum + set.stickers.length, 0);
  const have = sets.reduce((sum, set) => sum + set.stickers.filter(([emoji]) => stickerBook[emoji]).length, 0);
  document.getElementById('albumTitle').textContent = adultAlbum() ? '🏆 My Trophy Case' : '📒 My Sticker Album';
  document.getElementById('albumCount').textContent = `You have ${have} of ${total} ${adultAlbum() ? 'badges' : 'stickers'}`;

  const pages = document.getElementById('albumPages');
  pages.textContent = '';
  sets.forEach(set => {
    const page = document.createElement('div');
    page.className = 'albumPage';

    const owned = set.stickers.filter(([emoji]) => stickerBook[emoji]).length;
    const title = document.createElement('h3');
    title.textContent = `${set.name}  ${owned}/${set.stickers.length}` +
      (setsDone.includes(set.name) ? '  ✅' : '') +
      (set.season && !inSeason(set) ? '  (back next Halloween)' : '');
    page.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'albumGrid';
    set.stickers.forEach(([emoji, rarity]) => {
      const slot = document.createElement('div');
      slot.className = 'albumSlot' + (rarity === 'r' ? ' rare' : rarity === 's' ? ' superRare' : '');
      if (stickerBook[emoji]) {
        slot.textContent = emoji;
        if (stickerBook[emoji] > 1) {
          const extra = document.createElement('span');
          extra.className = 'albumExtra';
          extra.textContent = '×' + stickerBook[emoji];
          slot.appendChild(extra);
        }
      } else {
        slot.textContent = '❔';
        slot.classList.add('missing');
      }
      grid.appendChild(slot);
    });
    page.appendChild(grid);
    pages.appendChild(page);
  });
}
