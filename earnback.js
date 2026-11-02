// =====================================================================
// earnback.js — 🎯 Earn-back goals
// A grown-up sets a goal on the dashboard: "Roblox for 1 hour: earn 50 ⭐".
// Every star the kid EARNS from then on counts (lists, practice, Arcade,
// challenges, chores, supply checks). Gifts and refunds don't count.
// When the goal is reached, it lands in the dashboard's 🔔 Waiting for you,
// and the grown-up says yes when it's time.
// =====================================================================

function loadEarnback() {
  let e = null;
  try { e = JSON.parse(localStorage.getItem('kiddyKatEarnback') || 'null'); } catch (err) {}
  return e && e.goal ? e : null;
}

function saveEarnback(e) {
  if (e) localStorage.setItem('kiddyKatEarnback', JSON.stringify(e));
  else localStorage.removeItem('kiddyKatEarnback');
}

// Called by sync.js when the dashboard sends a goal (or cancels it)
function receiveEarnback(d) {
  if (d.cancel) {
    const old = loadEarnback();
    saveEarnback(null);
    showEarnbackCard();
    return old && !old.reached ? `🎯 ${d.from || parentName()} turned off the earn-back goal.` : '';
  }
  const stars = Math.max(5, Math.min(500, Number(d.stars) || 0));
  saveEarnback({ goal: String(d.goal || '').slice(0, 60), stars: stars, earned: 0, from: String(d.from || 'Dad').slice(0, 20),
                 setAt: new Date().toISOString(), reached: false });
  showEarnbackCard();
  return `🎯 New goal from ${d.from || parentName()}: earn ${stars} ⭐ to get "${d.goal}"! Every star you earn counts.`;
}

// Every earned star moves the goal forward
function earnbackProgress(n) {
  const e = loadEarnback();
  if (!e || e.reached || !(n > 0)) return;
  e.earned = Math.min(e.stars, e.earned + n);
  if (e.earned >= e.stars) {
    e.reached = true;
    e.reachedAt = new Date().toISOString();
    // Ask the grown-ups, the same way as a reward (it shows on the dashboard under 🔔 Waiting for you)
    if (typeof rewardRequests !== 'undefined' && typeof saveRewards === 'function') {
      e.requestId = Date.now();
      rewardRequests.push({ id: e.requestId, emoji: '🎯', name: `${e.goal} (earned back!)`, price: 0,
                            date: new Date().toDateString(), status: 'waiting', earnback: true });
      saveRewards();
    }
    saveEarnback(e);
    if (typeof kidAlert === 'function') kidAlert('reward', `${e.goal} (earned back!)`);
    setTimeout(() => {
      if (typeof celebrate === 'function') celebrate(`🎯 You did it! You earned back "${e.goal}"! ${e.from} will say when it's time.`, '🏆', false);
    }, 1200);
  } else {
    saveEarnback(e);
  }
  showEarnbackCard();
}

// Count earned stars: wrap addStars (pet.js) so every game, list bonus and chore counts
if (typeof addStars === 'function') {
  const addStarsBefore = addStars;
  addStars = function (count) {                  // eslint-disable-line no-global-assign
    addStarsBefore(count);
    if (typeof pet !== 'undefined' && pet && count > 0) earnbackProgress(count);
  };
}

function showEarnbackCard() {
  const card = document.getElementById('earnbackCard');
  if (!card) return;
  const e = loadEarnback();
  // Show while working on it, and for a day after the grown-up says yes
  let request = null;
  if (e && e.requestId && typeof rewardRequests !== 'undefined') request = rewardRequests.find(r => r.id === e.requestId);
  if (e && request && request.status !== 'waiting' && request.decided &&
      Date.now() - new Date(request.decided).getTime() > 86400000) { saveEarnback(null); card.style.display = 'none'; return; }
  card.style.display = e ? 'block' : 'none';
  if (!e) return;
  card.textContent = '';
  const add = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; card.appendChild(el); return el; };
  add('div', `🎯 Earn back: ${e.goal}`, 'earnbackTitle');
  if (!e.reached) {
    add('div', `${e.earned} of ${e.stars} ⭐ · ${e.stars - e.earned} to go`, 'earnbackCount');
    const bar = add('div', undefined, 'earnbackBar');
    const fill = document.createElement('div');
    fill.style.width = Math.min(100, e.earned / e.stars * 100) + '%';
    bar.appendChild(fill);
    add('div', 'Every star you earn counts: lists, 🎮 practice, 🕹️ Arcade, challenges and chores.', 'earnbackTip');
  } else if (request && request.status === 'approved') {
    add('div', `✅ ${e.from} said YES! Enjoy it. 🎉`, 'earnbackCount');
  } else if (request && request.status === 'returned') {
    add('div', `⏳ ${e.from} said not right now. Ask again later!`, 'earnbackCount');
  } else {
    add('div', `🏆 Goal reached! Waiting for ${e.from} to say when.`, 'earnbackCount');
  }
}
