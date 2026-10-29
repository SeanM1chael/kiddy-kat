// =====================================================================
// streak.js — the 🔥 morning streak
// A day counts when the morning list is done.
//   • Weekends are rest days: doing the list adds to the streak, skipping it doesn't break it.
//   • Freezes ❄️: earn 1 for every 7 days in a row (hold up to 2). A missed school
//     day uses one automatically, so one bad morning doesn't wipe out weeks of work.
//   • Sick days 🤒: a grown-up marks the day in Grown-ups (no freeze used).
//   • Milestones: 3, 7, 30, 100 and 365 days get a celebration and bonus stars.
// =====================================================================

const STREAK_MILESTONES = { 3: 3, 7: 10, 30: 25, 100: 50, 365: 100 };    // days: bonus stars
const MAX_FREEZES = 2;

function streakKey(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const keyToDate = k => new Date(k + 'T12:00');
const isRestDay = k => [0, 6].includes(keyToDate(k).getDay());
function nextKey(k) { const d = keyToDate(k); d.setDate(d.getDate() + 1); return streakKey(d); }

function loadStreak() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('kiddyKatStreak') || 'null'); } catch (err) {}
  return s || { current: 0, best: 0, last: null, freezes: 0, days: {}, milestones: [] };
}

function saveStreak(s) {
  // Keep about 6 weeks of day marks
  const keys = Object.keys(s.days).sort();
  keys.slice(0, Math.max(0, keys.length - 42)).forEach(k => delete s.days[k]);
  localStorage.setItem('kiddyKatStreak', JSON.stringify(s));
}

// Walk the days after the last one counted, up to yesterday:
// rest days are fine, a missed school day uses a freeze or ends the streak.
function settleStreak(s) {
  const today = streakKey(new Date());
  if (!s.last) return s;
  for (let k = nextKey(s.last); k < today; k = nextKey(k)) {
    if (s.days[k]) { s.last = k; continue; }                 // done, sick day or freeze already
    if (isRestDay(k)) { s.days[k] = 'rest'; s.last = k; continue; }
    if (s.current > 0 && s.freezes > 0) { s.freezes -= 1; s.days[k] = 'freeze'; s.last = k; continue; }
    s.days[k] = 'missed';
    s.current = 0;
    s.last = k;
  }
  return s;
}

// The morning list is done (index.html). Returns words to add to the celebration.
function markStreakDay() {
  const today = streakKey(new Date());
  const s = settleStreak(loadStreak());
  if (s.days[today] === 'done') return '';
  s.days[today] = 'done';
  s.current += 1;
  s.last = today;
  s.best = Math.max(s.best, s.current);
  let words = ` 🔥 ${s.current}-day streak!`;
  if (s.current % 7 === 0 && s.freezes < MAX_FREEZES) {
    s.freezes += 1;
    words += ' You earned a ❄️ streak freeze!';
  }
  const bonus = STREAK_MILESTONES[s.current];
  if (bonus && !s.milestones.includes(`${s.current}@${today}`)) {
    s.milestones.push(`${s.current}@${today}`);
    s.milestones = s.milestones.slice(-10);
    if (typeof addStars === 'function') addStars(bonus);
    words = ` 🏅 ${s.current} DAYS IN A ROW! +${bonus} ⭐ bonus!` + (words.includes('❄️') ? ' You earned a ❄️ streak freeze!' : '');
    if (typeof kidAlert === 'function') kidAlert('streak', String(s.current));     // tell the grown-ups
  }
  saveStreak(s);
  showStreakCard();
  return words;
}

// A grown-up marks today as a sick day: the streak is safe, no freeze used
function markSickDay() {
  const today = streakKey(new Date());
  const s = settleStreak(loadStreak());
  if (s.days[today] === 'done') return false;
  s.days[today] = 'sick';
  if (s.last && s.last < today) s.last = today;
  saveStreak(s);
  showStreakCard();
  return true;
}

// ---------- The streak card on the home screen ----------
function showStreakCard() {
  const card = document.getElementById('streakCard');
  if (!card) return;
  if (typeof profile === 'undefined' || !profile) { card.style.display = 'none'; return; }
  const s = settleStreak(loadStreak());
  saveStreak(s);
  card.style.display = 'flex';
  card.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const today = streakKey(new Date());

  const big = add(card, 'div', undefined, 'streakBig');
  add(big, 'div', `🔥 ${s.current}`, 'streakNum' + (s.current ? '' : ' zero'));
  add(big, 'div', s.current === 1 ? 'day' : 'days', 'streakLabel');

  const right = add(card, 'div', undefined, 'streakRight');
  const head = add(right, 'div', undefined, 'streakHead');
  head.append(s.days[today] === 'done' ? 'Done today! ' : 'Finish your morning list to keep it going ');
  head.appendChild(infoButton('Your streak grows each day you finish the ☀️ Morning list. Weekends are rest days. ' +
    'Every 7 days in a row earns a ❄️ freeze (hold up to 2). If you miss a school day, a freeze saves your streak. ' +
    'Big bonuses at 3, 7, 30, 100 and 365 days!'));

  // The last 7 days
  const week = add(right, 'div', undefined, 'streakWeek');
  const d = new Date();
  d.setDate(d.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const k = streakKey(d);
    const mark = s.days[k] || (k === today ? 'today' : isRestDay(k) ? 'rest' : '');
    const cell = add(week, 'div', undefined, 'streakDay');
    add(cell, 'div', d.toLocaleDateString([], { weekday: 'short' }).slice(0, 2), 'streakDow');
    const dot = add(cell, 'div', { done: '', freeze: '❄️', sick: '🤒', rest: '💤', missed: '·', today: '' }[mark] || '', 'streakDot ' + mark);
    dot.title = { done: 'Morning list done', freeze: 'Saved by a freeze', sick: 'Sick day', rest: 'Rest day', missed: 'Missed' }[mark] || '';
    d.setDate(d.getDate() + 1);
  }
  add(right, 'div', `🏆 Best: ${s.best}  ·  ❄️ Freezes: ${s.freezes}`, 'streakFoot');
}

// ---------- Grown-ups → 🔥 Streak ----------
function showParentStreak() {
  const box = document.getElementById('parentStreak');
  if (!box) return;
  const s = settleStreak(loadStreak());
  box.textContent = '';
  const line = document.createElement('div');
  line.textContent = `🔥 Streak: ${s.current} day${s.current === 1 ? '' : 's'} · Best: ${s.best} · Freezes: ${s.freezes}`;
  const sick = document.createElement('button');
  const today = streakKey(new Date());
  sick.textContent = s.days[today] === 'sick' ? '🤒 Today is a sick day' : '🤒 Mark today as a sick day';
  sick.disabled = s.days[today] === 'sick' || s.days[today] === 'done';
  const note = document.createElement('div');
  if (s.days[today] === 'done') note.textContent = 'The morning list is already done today.';
  sick.addEventListener('click', () => {
    if (!confirm('Mark today as a sick day? The streak stays safe and no freeze is used.')) return;
    markSickDay();
    showParentStreak();
  });
  box.append(line, sick, note);
}
