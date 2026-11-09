// =====================================================================
// badges.js — 🏆 Achievements: badges for real progress in Kat Town
// Each badge is checked from what the kid has already done (savings,
// recipes, lessons, building...). A new badge pops up once and gives +2 ⭐.
// Badges are kept in the town record (t.badges), so they never disappear.
// =====================================================================

const BADGE_STARS = 2;
// [id, emoji, name, how to earn it, test(t, ctx), ages (all if missing)]
const BADGES = [
  ['saver', '🐷', 'First saver', 'Put stars in Kat Bank savings', (t, c) => c.bank.saved > 0 || c.bank.history.some(h => h.kind === 'in')],
  ['supersaver', '💰', 'Super saver', 'Have 50 ⭐ saved at once', (t, c) => c.bank.saved >= 50],
  ['interest', '📈', 'Money grows', 'Earn interest at Kat Bank', (t, c) => (c.bank.interestTotal || 0) > 0],
  ['goal', '🎯', 'Goal getter', 'Reach your savings goal', (t, c) => !!c.bank.goal && c.bank.saved >= c.bank.goal.stars],
  ['reward', '🎟️', 'Earned it for real', 'Get a real reward approved', () => typeof rewardRequests !== 'undefined' && rewardRequests.some(r => r.status === 'approved')],
  ['chef', '👩‍🍳', 'First dish', 'Cook a recipe in Kat Kitchen', t => Object.keys(t.recipes || {}).length > 0],
  ['masterchef', '🍳', 'Master chef', 'Cook every recipe for your age', t => typeof kitchenRecipes === 'function' && kitchenRecipes().every(r => (t.recipes || {})[r.id])],
  ['shopper', '🛒', 'Smart shopper', 'Shop for a meal on a budget', (t, c) => c.did(a => a.startsWith('shop-'))],
  ['safety', '🛡️', 'Safety pro', 'Win a lesson at Safety HQ', (t, c) => c.did(a => a.startsWith('safety-'))],
  ['scam', '🎣', 'Scam spotter', 'Win Spot the scam', (t, c) => c.did(a => a === 'safety-scam'), ['tiger', 'lion']],
  ['password', '🔐', 'Password pro', 'Build a very strong password', (t, c) => c.did(a => a === 'safety-password'), ['tiger', 'lion']],
  ['voter', '🗳️', 'Voter', 'Vote in the family election', (t, c) => c.did(a => a === 'vote')],
  ['mayor', '🏛️', 'Great mayor', 'Pass a balanced town budget', (t, c) => c.did(a => a === 'hall-mayor'), ['tiger', 'lion']],
  ['builder', '🏗️', 'Builder', 'Build 5 things in your town', t => t.built.filter(b => !b.community).length >= 5],
  ['city', '🌆', 'City planner', 'Grow your town into a City', t => t.built.length >= 20],
  ['decorator', '🛋️', 'Decorator', 'Put 5 things in your room', t => ((t.room || {}).items || []).length >= 5],
  ['worker', '💼', 'Hard worker', 'Work 10 town job shifts', t => (t.workShifts || 0) >= 10],
  ['toys', '🧸', 'Game master', 'Win 10 toy games', t => (t.toyPlays || 0) >= 10],
  ['musician', '🎵', 'Songwriter', 'Save a song in the Music Studio', t => Array.isArray(t.songs) && t.songs.length > 0],
  ['ear', '👂', 'Great ear', 'Win Echo the beat in the Music Studio', (t, c) => c.did(a => a === 'music-echo')]
];

function badgesForMe() {
  const age = typeof animal !== 'undefined' && animal ? animal.theme : 'tiger';
  return BADGES.filter(b => !b[5] || b[5].includes(age));
}

// Give any badges just earned. Returns the new ones.
function checkBadges() {
  const t = loadTown();
  if (!t.avatar) return [];
  if (!t.badges || typeof t.badges !== 'object') t.badges = {};
  const bank = typeof bankOf === 'function' ? bankOf(t) : { saved: 0, history: [] };
  const acts = (t.skills || []).map(s => String(s.act));
  const ctx = { bank: bank, did: test => acts.some(test) };
  const fresh = [];
  badgesForMe().forEach(b => {
    if (t.badges[b[0]]) return;
    let earned = false;
    try { earned = !!b[4](t, ctx); } catch (err) { earned = false; }
    if (earned) { t.badges[b[0]] = new Date().toISOString().slice(0, 10); fresh.push(b); }
  });
  if (fresh.length) {
    saveTown(t);
    if (typeof addStars === 'function') addStars(BADGE_STARS * fresh.length);
  }
  return fresh;
}

// After the map draws: a toast for anything new (a toast never blocks a tap)
function celebrateBadges() {
  const fresh = checkBadges();
  if (!fresh.length) return;
  const names = fresh.map(b => `${b[1]} ${b[2]}`).join(', ');
  townToast(`🏆 New badge${fresh.length > 1 ? 's' : ''}: ${names}! +${BADGE_STARS * fresh.length} ⭐`);
  if (typeof kkAutoSpeak === 'function') kkAutoSpeak(`New badge: ${fresh.map(b => b[2]).join(', ')}!`);
}

// The badge wall in My House
function townBadgeSection(box) {
  const t = loadTown();
  const have = t.badges || {};
  const mine = badgesForMe();
  const count = mine.filter(b => have[b[0]]).length;
  townAdd(box, 'h3', `🏆 My badges (${count} of ${mine.length})`, 'fgHead');
  const grid = townAdd(box, 'div', undefined, 'badgeGrid');
  mine.forEach(([id, emoji, name, how]) => {
    const got = !!have[id];
    const b = townAdd(grid, 'button', undefined, 'badge' + (got ? ' got' : ''));
    b.dataset.badge = id;
    townAdd(b, 'span', got ? emoji : '🔒', 'badgeEmoji');
    townAdd(b, 'span', name, 'badgeName');
    b.addEventListener('click', () => townPop(got ? emoji : '🔒', got ? `${name}\nEarned ${have[id]}` : `${name}\n\nHow to earn it: ${how}`, [['OK', null]], 'townBounceIn'));
  });
}
