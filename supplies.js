// =====================================================================
// supplies.js — 💬 messages from a grown-up, and 🧴 My supplies
//
// Messages: a grown-up sends "Be great today, son!" from the dashboard.
//   It shows on a card at the top for the days they picked. ❤️ tells them it was loved.
//
// Supplies: each kid keeps track of their own toothpaste, shampoo, deodorant...
//   Tapping 🟡 Running low or 🔴 Out alerts the grown-ups, and it lands on the
//   dashboard's 🛒 Shopping list. When a grown-up taps "Bought it", the item resets.
//   A weekly supply check is worth +2 ⭐, so things get caught before they run out.
// =====================================================================

const DEFAULT_SUPPLIES = {
  kitten: [['🪥', 'Toothpaste'], ['🪥', 'Toothbrush'], ['🧴', 'Shampoo'], ['🧼', 'Body wash'], ['🧴', 'Lotion']],
  tiger:  [['🪥', 'Toothpaste'], ['🪥', 'Toothbrush'], ['🧴', 'Shampoo'], ['🧴', 'Conditioner'], ['🧼', 'Body wash'],
           ['🧊', 'Deodorant'], ['🧴', 'Lotion']],
  lion:   [['🪥', 'Toothpaste'], ['🪥', 'Toothbrush'], ['🧴', 'Shampoo'], ['🧴', 'Conditioner'], ['🧼', 'Body wash'],
           ['🧊', 'Deodorant'], ['🫧', 'Face wash'], ['🧴', 'Lotion']]
};
const SUPPLY_CHECK_DAYS = 7, SUPPLY_CHECK_STARS = 2;

function suppliesDayKey(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------- 💬 Message from a grown-up ----------
function loadNote() {
  try { return JSON.parse(localStorage.getItem('kiddyKatNote') || 'null'); } catch (err) { return null; }
}

// Called by sync.js when a message arrives in the parent inbox
function receiveNote(d) {
  const until = new Date();
  until.setDate(until.getDate() + Math.max(1, Math.min(7, Number(d.days) || 1)) - 1);
  localStorage.setItem('kiddyKatNote', JSON.stringify({ text: String(d.text || '').slice(0, 140),
    from: String(d.from || 'Dad').slice(0, 20), until: suppliesDayKey(until), loved: false }));
  showNoteCard();
}

function showNoteCard() {
  const card = document.getElementById('noteCard');
  if (!card) return;
  const note = loadNote();
  const show = note && note.text && note.until >= suppliesDayKey();
  card.style.display = show ? 'flex' : 'none';
  if (!show) return;
  card.textContent = '';
  const words = document.createElement('div');
  words.className = 'noteWords';
  const from = document.createElement('div');
  from.className = 'noteFrom';
  from.textContent = `💬 From ${note.from}`;
  const text = document.createElement('div');
  text.className = 'noteText';
  text.textContent = note.text;
  const love = document.createElement('button');
  love.className = 'noteLove';
  love.textContent = note.loved ? '❤️ Sent!' : '❤️';
  love.disabled = note.loved;
  love.title = `Tell ${note.from} you loved it`;
  love.addEventListener('click', () => {
    const n = loadNote();
    if (!n || n.loved) return;
    n.loved = true;
    localStorage.setItem('kiddyKatNote', JSON.stringify(n));
    if (typeof kidAlert === 'function') kidAlert('thanks', n.text.slice(0, 40));
    showNoteCard();
  });
  words.append(from, text);
  card.append(words, love);
}

// ---------- 🧴 My supplies ----------
function loadSupplies() {
  let list = null;
  try { list = JSON.parse(localStorage.getItem('kiddyKatSupplies') || 'null'); } catch (err) {}
  if (!Array.isArray(list)) {
    const theme = typeof animal !== 'undefined' ? animal.theme : 'kitten';
    list = (DEFAULT_SUPPLIES[theme] || DEFAULT_SUPPLIES.kitten).map(([emoji, name]) => ({ emoji, name, status: 'ok' }));
  }
  return list;
}

function saveSupplies(list) {
  localStorage.setItem('kiddyKatSupplies', JSON.stringify(list));
}

function supplyCheckDue() {
  const last = localStorage.getItem('kiddyKatSupplyCheck');
  if (!last) return true;
  return (Date.now() - new Date(last + 'T12:00').getTime()) / 86400000 >= SUPPLY_CHECK_DAYS - 0.5;
}

function showSuppliesCard() {
  const card = document.getElementById('suppliesCard');
  if (!card) return;
  if (typeof profile === 'undefined' || !profile || animal.theme === 'eagle') { card.style.display = 'none'; return; }
  card.style.display = 'block';
  const list = loadSupplies();
  if (!localStorage.getItem('kiddyKatSupplies')) saveSupplies(list);     // so the dashboard sees the list
  const low = list.filter(i => i.status !== 'ok');
  card.textContent = '';
  const title = document.createElement('div');
  title.className = 'suppliesTitle';
  title.textContent = '🧴 My supplies';
  const line = document.createElement('div');
  line.className = 'suppliesLine';
  if (supplyCheckDue()) line.textContent = `🔍 Time for your weekly supply check! +${SUPPLY_CHECK_STARS} ⭐`;
  else if (low.length) line.textContent = `🛒 ${parentName()} knows you need: ${low.map(i => i.name).join(', ')}`;
  else line.textContent = '✅ All stocked up';
  card.append(title, line);
  card.onclick = openSupplies;
}

function openSupplies() {
  document.getElementById('supplies').style.display = 'block';
  showSupplies();
}

function closeSupplies() {
  document.getElementById('supplies').style.display = 'none';
  showSuppliesCard();
}

function setSupply(index, status) {
  const list = loadSupplies();
  const item = list[index];
  if (!item || item.status === status) return;
  const worse = { ok: 0, low: 1, out: 2 };
  const alert = worse[status] > worse[item.status];          // only tell grown-ups when it gets worse
  item.status = status;
  item.at = new Date().toISOString();
  saveSupplies(list);
  if (alert && typeof kidAlert === 'function') kidAlert('supply', `${item.name}${status === 'out' ? ' (all out)' : ''}`);
  showSupplies();
}

function showSupplies() {
  const box = document.getElementById('suppliesBody');
  box.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };
  add(box, 'p', `Tap 🟡 when something is getting low and 🔴 when it's all out. ${parentName()} gets an alert and adds it to the shopping list.`, 'suppliesHelp');

  const list = loadSupplies();
  list.forEach((item, i) => {
    const row = add(box, 'div', undefined, 'supplyRow ' + item.status);
    add(row, 'div', `${item.emoji || '🧴'} ${item.name}`, 'supplyName');
    const buttons = add(row, 'div', undefined, 'supplyButtons');
    [['ok', '✅ Plenty'], ['low', '🟡 Low'], ['out', '🔴 Out']].forEach(([status, label]) => {
      const b = add(buttons, 'button', label, item.status === status ? 'picked' : '');
      b.addEventListener('click', () => setSupply(i, status));
    });
    const remove = add(buttons, 'button', '✕', 'supplyRemove');
    remove.title = 'Remove';
    remove.addEventListener('click', () => {
      if (!confirm(`Remove ${item.name} from your list?`)) return;
      const l = loadSupplies(); l.splice(i, 1); saveSupplies(l); showSupplies();
    });
  });

  // Add your own (hair stuff, razors, contact solution...)
  const addRow = add(box, 'div', undefined, 'supplyAdd');
  const input = add(addRow, 'input');
  input.placeholder = 'Add something, like "Hair gel"';
  input.maxLength = 30;
  add(addRow, 'button', '➕ Add').addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    const l = loadSupplies();
    if (l.some(x => x.name.toLowerCase() === name.toLowerCase())) { input.value = ''; return; }
    l.push({ emoji: '🧴', name: name, status: 'ok' });
    saveSupplies(l);
    showSupplies();
  });

  // Weekly check
  const check = add(box, 'button', '', 'supplyCheck');
  if (supplyCheckDue()) {
    check.textContent = `🔍 I checked everything! +${SUPPLY_CHECK_STARS} ⭐`;
    check.addEventListener('click', () => {
      if (!supplyCheckDue()) return;
      localStorage.setItem('kiddyKatSupplyCheck', suppliesDayKey());
      if (typeof addStars === 'function') addStars(SUPPLY_CHECK_STARS);
      showSupplies();
      if (typeof celebrate === 'function') celebrate(`🧴 Supply check done! +${SUPPLY_CHECK_STARS} ⭐`, '🧴', false);
    });
  } else {
    const next = new Date(localStorage.getItem('kiddyKatSupplyCheck') + 'T12:00');
    next.setDate(next.getDate() + SUPPLY_CHECK_DAYS);
    check.textContent = `✅ Checked! Next check: ${next.toLocaleDateString([], { weekday: 'long' })}`;
    check.disabled = true;
  }
}

// Called by sync.js when a grown-up taps "Bought it" on the dashboard
function receiveBought(d) {
  const list = loadSupplies();
  const item = list.find(i => i.name.toLowerCase() === String(d.text || '').toLowerCase());
  if (item) { item.status = 'ok'; item.at = new Date().toISOString(); saveSupplies(list); }
  showSuppliesCard();
  return `🛒 ${d.from || parentName()} got your ${d.text}!`;
}
