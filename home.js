// =====================================================================
// home.js — the kids' home screen: "do your list first, then go to town"
//   • The list for right now opens by itself (morning, after school, bedtime)
//   • Kids see their list at the top, then their pet and one big 🏙️ Kat Town
//     button. Practice, Arcade, Shop, Rewards, Wallet and the rest all have
//     a door in Kat Town, so the extra buttons under the pet are hidden.
//   • ⭐ stars, 🔥 streak and the 🏙️ Kat Town button sit up top, under the hello
//   • A finished list folds into a small ⏭️ "Next up" card: today's progress,
//     the next list, and one thing to do in Kat Town. Tapping the list's tab
//     (Morning / After School / Bedtime) opens the full list again. A new day
//     starts fresh.
// Grown-ups (🦅 eagle) keep the old layout with all their buttons.
// =====================================================================

// Which list fits the time of day
function listForNow(now = new Date()) {
  const h = now.getHours();
  if (h < 11) return 'morning';
  if (h < 18) return 'afternoon';
  return 'bedtime';
}

// Show a list and light up its tab (called by show() in index.html)
let homeShowing = null;            // which list is on screen
const homeOpened = {};             // lists a kid opened again with their tab (until the app is closed)
function homeMarkTab(name) {
  homeShowing = name;
  document.querySelectorAll('.tabs button[data-list]').forEach(b => b.classList.toggle('active', b.dataset.list === name));
  homeFoldIfDone(name);
}

// ---------- 🎉 Finished lists fold away ----------
const HOME_LIST_NAMES = { morning: ['☀️', 'Morning'], afternoon: ['🎒', 'After School'], bedtime: ['🌙', 'Bedtime'] };
function homeListDone(name) {
  const list = document.getElementById(name);
  if (!list) return false;
  const total = list.querySelectorAll('.task').length;
  return total > 0 && list.querySelectorAll('.task.done').length === total;
}
function homeDoneCard() {
  const first = document.getElementById('morning');
  if (!first) return null;
  let card = document.getElementById('listDoneCard');
  if (!card) {
    card = document.createElement('div');
    card.id = 'listDoneCard';
  }
  if (card.nextElementSibling !== first) first.parentNode.insertBefore(card, first);    // always right above the lists
  return card;
}
function homeFoldIfDone(name) {
  const card = homeDoneCard();
  if (!card) return;
  const list = document.getElementById(name);
  if (!list || !homeListDone(name) || homeOpened[name]) { card.style.display = 'none'; return; }
  list.style.display = 'none';
  homeNextUpCard(card, name);
  card.style.display = 'block';
}

// The tab's words for a list (the after-school tab says "Afternoon" on weekends, "Work" for grown-ups)
function homeTabText(name) {
  const tab = document.querySelector(`.tabs button[data-list="${name}"]`);
  const [emoji, label] = HOME_LIST_NAMES[name] || ['✅', name];
  return tab ? tab.textContent.trim() : `${emoji} ${label}`;
}
const homeTabWords = name => homeTabText(name).replace(/^\S+\s/, '');

// ⏭️ "Next up": what's done today, which list comes next, and one thing to do in Kat Town
function homeNextUpCard(card, name) {
  card.textContent = '';
  const add = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; card.appendChild(el); return el; };
  const order = ['morning', 'afternoon', 'bedtime'];
  const lists = order.filter(id => { const l = document.getElementById(id); return l && l.querySelectorAll('.task').length > 0; });
  const allDone = lists.every(homeListDone);

  add('div', allDone ? '🌟 All done for today!' : `🎉 ${homeTabWords(name)} done!`, 'listDoneBig');
  // ☀️✅ 🎒⬜ 🌙⬜
  const dots = add('div', undefined, 'listDoneDots');
  lists.forEach(id => {
    const d = document.createElement('span');
    d.className = 'listDot' + (homeListDone(id) ? ' finished' : '');
    d.dataset.list = id;
    d.textContent = `${homeTabText(id).split(' ')[0]}${homeListDone(id) ? '✅' : '⬜'}`;
    dots.appendChild(d);
  });

  if (allDone) {
    add('div', 'See you tomorrow! Your lists start fresh in the morning.', 'listDoneSmall');
  } else {
    // The next list that isn't done yet (later today first, then any left over)
    const after = order.slice(order.indexOf(name) + 1).concat(order.slice(0, order.indexOf(name)));
    const next = after.find(id => lists.includes(id) && !homeListDone(id));
    if (next) {
      const b = add('button', `Next: ${homeTabText(next)} ➡️`, 'listNextButton');
      b.dataset.list = next;
      b.addEventListener('click', () => { if (typeof pickList === 'function') pickList(next); });
    }
  }

  const idea = homeTownIdea();
  if (idea) {
    const b = add('button', idea.text, 'listTownIdea');
    b.dataset.idea = idea.id;
    b.addEventListener('click', () => {
      if (typeof openTown !== 'function') return;
      openTown();
      const town = document.getElementById('town');
      if (idea.place && town && town.style.display === 'block' && typeof townView !== 'undefined' && townView === 'map' && typeof townEnter === 'function') townEnter(idea.place);
    });
  }
  add('div', `Tap ${homeTabText(name)} up top to see this list again.`, 'listDoneSmall listDoneAgain');
}

// One thing to do in Kat Town right now (kids only, and only while the town is open)
function homeTownIdea(now = new Date()) {
  if (!isKidHome() || typeof loadTown !== 'function') return null;
  if (typeof townAllowed === 'function' && !townAllowed()) return null;
  const t = loadTown();
  if (typeof townClosedReason === 'function' && townClosedReason(t)) return null;
  if (!t.avatar) return { id: 'avatar', text: '🎨 Make your Kat Town character!' };
  if (typeof birthdayToday === 'function' && birthdayToday()) return { id: 'birthday', text: '🎂 Your birthday party is in Kat Town!' };
  if (typeof holidayToday === 'function') {
    const h = holidayToday(now);
    if (h) return { id: 'holiday', text: `${h.emoji} Celebrate ${h.name} in Kat Town!` };
  }
  if (typeof giftReady === 'function' && giftReady(t)) return { id: 'gift', text: '🎁 Your daily gift is waiting in Kat Town!' };
  if (typeof challengeStatus === 'function' && !challengeStatus().done) return { id: 'gym', place: 'gym', text: '🏋️ Today\'s challenge is waiting at Kat Gym!' };
  // Otherwise a different lesson spot each day
  const spots = [
    { id: 'music', place: 'music', text: '🎵 Make a beat in the Music Studio!' },
    { id: 'kitchen', place: 'kitchen', text: '🍳 Cook something in Kat Kitchen!' },
    { id: 'bank', place: 'bank', text: '🏦 Save some stars at Kat Bank. Interest day is Monday!' },
    { id: 'safety', place: 'safety', text: '🛡️ Try a lesson at Safety HQ!' },
    { id: 'hall', place: 'hall', text: '🏛️ See what\'s new at Town Hall!' }
  ];
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  return spots[day % spots.length];
}

// After each tap on a task: when the whole list is done, fold it away (after the last check shows)
function homeAfterTap(name) {
  if (!homeListDone(name)) return;
  homeOpened[name] = false;
  setTimeout(() => { if (homeShowing === name && homeListDone(name)) homeFoldIfDone(name); }, 1200);
}

// Tapping a tab opens that list in full, even if it's done
if (typeof pickList === 'function') {
  const pickBefore = pickList;
  pickList = function (name) { homeOpened[name] = true; return pickBefore.apply(this, arguments); };       // eslint-disable-line no-global-assign
}

function isKidHome() {
  return typeof animal !== 'undefined' && animal && animal.theme !== 'eagle';
}

// Move the lists above the pet, and tag the page so the CSS can tidy up the rest
function kidHomeLayout() {
  document.body.classList.toggle('kidHome', isKidHome());
  if (!isKidHome()) return;
  const petCard = document.getElementById('petCard');
  const tabs = document.querySelector('.tabs');
  if (!petCard || !tabs || tabs.dataset.moved) return;
  const parent = petCard.parentNode;
  parent.insertBefore(tabs, petCard);
  ['morning', 'afternoon', 'bedtime'].forEach(id => {
    const list = document.getElementById(id);
    if (list) parent.insertBefore(list, petCard);
  });
  tabs.dataset.moved = 'yes';
}

// ⭐ 30 · 🔥 3 days, under the hello
function showKidChips() {
  let chips = document.getElementById('kidChips');
  if (!isKidHome()) { if (chips) chips.remove(); return; }
  if (!chips) {
    chips = document.createElement('div');
    chips.id = 'kidChips';
    const hello = document.getElementById('hello');
    if (!hello) return;
    hello.after(chips);
  }
  // 🏙️ Kat Town sits right under the chips, so kids see it without scrolling
  const town = document.getElementById('townButton');
  if (town && chips.nextElementSibling !== town) chips.after(town);
  chips.textContent = '';
  const chip = (text, cls) => {
    const c = document.createElement('span');
    c.className = 'kidChip ' + cls;
    c.textContent = text;
    chips.appendChild(c);
  };
  if (typeof pet !== 'undefined' && pet) chip(`⭐ ${pet.stars}`, 'kidStars');
  const streak = typeof loadStreak === 'function' ? loadStreak().current || 0 : 0;
  chip(`🔥 ${streak} day${streak === 1 ? '' : 's'}`, 'kidStreak');
}

function startKidHome() {
  kidHomeLayout();
  showKidChips();
  if (homeShowing) homeFoldIfDone(homeShowing);       // the saved checkmarks are loaded by now
}

// Keep the chips fresh when stars or the streak change
if (typeof showPet === 'function') {
  const showPetBefore = showPet;
  showPet = function () { const r = showPetBefore.apply(this, arguments); showKidChips(); return r; };       // eslint-disable-line no-global-assign
}
if (typeof showStreakCard === 'function') {
  const streakBefore = showStreakCard;
  showStreakCard = function () { const r = streakBefore.apply(this, arguments); showKidChips(); return r; };  // eslint-disable-line no-global-assign
}

// Coming back from Kat Town: refresh the Next up card (the gift or challenge may be done now)
if (typeof leaveTown === 'function') {
  const leaveTownBefore = leaveTown;
  leaveTown = function () { const r = leaveTownBefore.apply(this, arguments); if (homeShowing) homeFoldIfDone(homeShowing); return r; };   // eslint-disable-line no-global-assign
}
