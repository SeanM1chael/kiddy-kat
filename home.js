// =====================================================================
// home.js — the kids' home screen: "do your list first, then go to town"
//   • The list for right now opens by itself (morning, after school, bedtime)
//   • Kids see their list at the top, then their pet and one big 🏙️ Kat Town
//     button. Practice, Arcade, Shop, Rewards, Wallet and the rest all have
//     a door in Kat Town, so the extra buttons under the pet are hidden.
//   • ⭐ stars and 🔥 streak sit up top, next to the hello
// Grown-ups (🦅 eagle) keep the old layout with all their buttons.
// =====================================================================

// Which list fits the time of day
function listForNow(now = new Date()) {
  const h = now.getHours();
  if (h < 11) return 'morning';
  if (h < 18) return 'afternoon';
  return 'bedtime';
}

// Show a list and light up its tab
function homeMarkTab(name) {
  document.querySelectorAll('.tabs button[data-list]').forEach(b => b.classList.toggle('active', b.dataset.list === name));
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
