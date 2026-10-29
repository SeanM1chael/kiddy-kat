// =====================================================================
// weekend.js — Weekend Earn & Play (Saturdays and Sundays)
// Kids earn stars with extra practice, outside time, reading and weekend
// jobs, then spend them on gaming hours. Guardrails a grown-up sets:
//   • a daily gaming cap (like 5 hours)
//   • a level-up break: after each gaming hour, do one earn activity
//     before the next hour unlocks (earn → play → earn → play)
// Settings live in Grown-ups → 🎮 Weekend Earn & Play.
// =====================================================================

const WEEKEND_ROUNDS = 10;          // practice rounds a day on weekends (3 on school days)
const OUTSIDE_MINUTES = 30, OUTSIDE_STARS = 15;
const READING_MINUTES = 20, READING_STARS = 15;
const TIMED_PER_DAY = 2;            // outside and reading: up to 2 of each a day
const CATCHUP_WEEKEND_STARS = 25;
const GOOD_ROUND = 3;               // 3 of 5 right counts as an earn activity

const DEFAULT_WEEKEND_JOBS = [
  ['🛏️', 'Clean your room', 15],
  ['🧺', 'Help with laundry', 15],
  ['🍽️', 'Wash or put away dishes', 10],
  ['🧹', 'Vacuum a room', 15],
  ['🌿', 'Yard work', 25]
];

// ---------- Settings (a grown-up sets these) ----------
function weekendSettings() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('kiddyKatWeekendSettings') || 'null'); } catch (err) {}
  const kitten = typeof animal !== 'undefined' && (animal.theme === 'kitten' || animal.theme === 'eagle');
  return Object.assign({ on: !kitten, capHours: 5, starsPerHour: 25, jobs: DEFAULT_WEEKEND_JOBS }, s || {});
}

function saveWeekendSettings(s) {
  localStorage.setItem('kiddyKatWeekendSettings', JSON.stringify(s));
}

function isWeekendDay(d = new Date()) {
  return d.getDay() === 0 || d.getDay() === 6;
}

// Weekend rules are on today (used by games.js, wallet.js and catchup.js)
function weekendOn() {
  return isWeekendDay() && weekendSettings().on && typeof pet !== 'undefined' && !!pet;
}

// ---------- Today's weekend progress ----------
function weekendToday() {
  const today = new Date().toDateString();
  let w = null;
  try { w = JSON.parse(localStorage.getItem('kiddyKatWeekend') || 'null'); } catch (err) {}
  if (!w || w.date !== today) {
    w = { date: today, hours: 0, gamingUntil: 0, needEarn: false, outside: 0, reading: 0, timer: null, log: [] };
  }
  return w;
}

function saveWeekendToday(w) {
  localStorage.setItem('kiddyKatWeekend', JSON.stringify(w));
}

// Something was earned: unlock the next gaming hour and note it
function weekendEarned(label) {
  if (!isWeekendDay()) return;
  const w = weekendToday();
  w.needEarn = false;
  w.log.push({ t: Date.now(), text: label });
  w.log = w.log.slice(-30);
  saveWeekendToday(w);
  showWeekendCard();
}

// Called by games.js when a practice round ends. Returns extra stars for packs.
function weekendRoundBonus(game, correct) {
  if (!weekendOn()) return 0;
  let extra = 0;
  if (game === 'pack' && correct > 0) {          // practice packs are worth double on weekends
    addStars(correct);
    extra = correct;
  }
  if (correct >= GOOD_ROUND) weekendEarned(`🧠 Practice round: ${correct} right`);
  return extra;
}

const hoursText = n => `${n} hour${n === 1 ? '' : 's'}`;
const clockTime = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// ---------- The kid's weekend card ----------
function showWeekendCard() {
  const card = document.getElementById('weekendCard');
  if (!card) return;
  const s = weekendSettings();
  const show = isWeekendDay() && s.on && typeof profile !== 'undefined' && !!profile;
  card.style.display = show ? 'block' : 'none';
  if (!show) return;
  card.textContent = '';
  const w = weekendToday();
  const now = Date.now();
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };

  const title = add(card, 'div', '🎮 Weekend Earn & Play', 'weekendTitle');
  title.appendChild(infoButton(`Earn stars, then spend ⭐ ${s.starsPerHour} for an hour of gaming. ` +
    `Up to ${hoursText(s.capHours)} today. After each hour, do one earn activity to unlock the next one. Earn, play, earn, play!`));

  if (!pet) {
    add(card, 'div', 'Hatch a pet first to start earning stars!', 'weekendNote');
    return;
  }

  // ----- Play: gaming hours -----
  const play = add(card, 'div', undefined, 'weekendBox');
  add(play, 'div', `🎮 Gaming today: ${w.hours} of ${hoursText(s.capHours)}`, 'weekendHead');
  const bar = add(play, 'div', undefined, 'rewardBar');
  add(bar, 'div', undefined, 'rewardBarFill').style.width = Math.min(100, w.hours / Math.max(1, s.capHours) * 100) + '%';

  const buy = add(play, 'button', '');
  const playing = w.gamingUntil > now;
  if (playing) {
    buy.textContent = `🎮 Gaming until ${clockTime(w.gamingUntil)}. Have fun!`;
    buy.disabled = true;
  } else if (w.hours >= s.capHours) {
    buy.textContent = `✅ That's all ${hoursText(s.capHours)} today. Great job earning them!`;
    buy.disabled = true;
  } else if (w.needEarn) {
    buy.textContent = '🔓 Do 1 earn activity below to unlock your next hour';
    buy.disabled = true;
  } else if (pet.stars < s.starsPerHour) {
    buy.textContent = `🎮 1 hour of gaming: ${s.starsPerHour - pet.stars} more ⭐`;
    buy.disabled = true;
  } else {
    buy.textContent = `🎮 Start 1 hour of gaming (⭐ ${s.starsPerHour})`;
    buy.addEventListener('click', buyGamingHour);
  }

  // ----- Earn -----
  const earn = add(card, 'div', undefined, 'weekendBox');
  add(earn, 'div', '⭐ Ways to earn', 'weekendHead');

  // Practice
  const roundsLeft = WEEKEND_ROUNDS - (typeof roundsToday === 'function' ? roundsToday() : 0);
  const pr = add(earn, 'div', `🧠 Practice: ${Math.max(0, roundsLeft)} of ${WEEKEND_ROUNDS} rounds left. ⭐ 1 per right answer, packs ×2 `, 'weekendRow');
  const prGo = add(pr, 'button', 'Play');
  prGo.disabled = roundsLeft <= 0;
  prGo.addEventListener('click', () => openPractice());

  // Outside and reading (timers that keep going if the app closes)
  timedRow(earn, w, 'outside', `🌳 Outside time: ${OUTSIDE_MINUTES} min, then a photo. ⭐ ${OUTSIDE_STARS} `, OUTSIDE_MINUTES, add);
  timedRow(earn, w, 'reading', `📖 Reading: ${READING_MINUTES} min, then tell what happened. ⭐ ${READING_STARS} `, READING_MINUTES, add);

  // Weekend jobs (a grown-up checks them)
  if (typeof wallet !== 'undefined') {
    if (!wallet) wallet = freshWallet();
    s.jobs.forEach(([emoji, name, stars]) => {
      const row = add(earn, 'div', `${emoji} ${name}. ⭐ ${stars} `, 'weekendRow');
      const waiting = wallet.jobRequests.find(r => r.name === name && r.stars && r.status === 'waiting');
      const b = add(row, 'button', waiting ? `⏳ ${parentName()} is checking` : 'I did it!');
      b.disabled = !!waiting;
      b.addEventListener('click', () => askWeekendJob(emoji, name, stars));
    });
  }

  // Catch-up work counts extra on weekends
  if (typeof catchUp !== 'undefined' && catchUp && catchUp.items && catchUp.items.some(i => !i.done)) {
    add(earn, 'div', `📚 Turn in a catch-up assignment: ⭐ ${CATCHUP_WEEKEND_STARS} when ${parentName()} checks it`, 'weekendRow');
  }
}

// One row for a timed activity (outside or reading)
function timedRow(box, w, kind, label, minutes, add) {
  const row = add(box, 'div', label, 'weekendRow');
  const now = Date.now();
  const running = w.timer && w.timer.kind === kind;
  const doneToday = w[kind] >= TIMED_PER_DAY;

  if (running) {
    const left = Math.ceil((w.timer.start + minutes * 60000 - now) / 60000);
    if (left > 0) {
      add(row, 'span', `⏳ ${left} min to go `, 'weekendTimer');
      add(row, 'button', 'Stop', 'plain').addEventListener('click', () => {
        if (!confirm('Stop the timer? You will not get the stars.')) return;
        const t = weekendToday(); t.timer = null; saveWeekendToday(t); showWeekendCard();
      });
      return;
    }
    if (kind === 'outside') finishOutsideRow(row, add);
    else finishReadingRow(row, add);
    return;
  }
  if (doneToday) { add(row, 'span', '✅ Done for today'); return; }
  const other = w.timer && w.timer.kind !== kind;
  const start = add(row, 'button', '▶️ Start');
  start.disabled = !!other;                    // one timer at a time
  start.addEventListener('click', () => {
    const t = weekendToday();
    t.timer = { kind: kind, start: Date.now() };
    saveWeekendToday(t);
    showWeekendCard();
  });
}

function finishOutsideRow(row, add) {
  const pick = document.createElement('input');
  pick.type = 'file';
  pick.accept = 'image/*';
  pick.setAttribute('capture', 'environment');
  pick.style.display = 'none';
  row.appendChild(pick);
  add(row, 'button', '📸 Take a photo outside').addEventListener('click', () => pick.click());
  pick.addEventListener('change', () => {
    const file = pick.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 260 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        // Kept on this phone with the challenge photos, for grown-ups to look at
        const photos = JSON.parse(localStorage.getItem('kiddyKatProofPhotos') || '[]');
        photos.push({ text: '🌳 Outside time', date: new Date().toDateString(), image: canvas.toDataURL('image/jpeg', 0.6) });
        localStorage.setItem('kiddyKatProofPhotos', JSON.stringify(photos.slice(-12)));
        finishTimed('outside', OUTSIDE_STARS, '🌳 Outside time');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function finishReadingRow(row, add) {
  const book = add(row, 'input');
  book.placeholder = 'What did you read?';
  book.maxLength = 60;
  const what = add(row, 'textarea');
  what.placeholder = 'What happened? Tell it in your own words (at least 2 sentences).';
  what.maxLength = 500;
  const note = add(row, 'div', '', 'weekendNote');
  add(row, 'button', '📖 Done reading').addEventListener('click', () => {
    const words = what.value.trim().split(/\s+/).filter(Boolean).length;
    if (!book.value.trim()) { note.textContent = 'Type the name of the book or story.'; return; }
    if (words < 12) { note.textContent = `Tell a little more (${words} words so far, 12 or more).`; return; }
    let log = [];
    try { log = JSON.parse(localStorage.getItem('kiddyKatReadingLog') || '[]'); } catch (err) {}
    log.push({ date: new Date().toDateString(), book: book.value.trim().slice(0, 60), summary: what.value.trim().slice(0, 500) });
    localStorage.setItem('kiddyKatReadingLog', JSON.stringify(log.slice(-20)));
    finishTimed('reading', READING_STARS, `📖 Read "${book.value.trim().slice(0, 40)}"`);
  });
}

function finishTimed(kind, stars, label) {
  const w = weekendToday();
  if (!w.timer || w.timer.kind !== kind) return;           // already finished
  w.timer = null;
  w[kind] += 1;
  saveWeekendToday(w);
  addStars(stars);
  weekendEarned(label);
  celebrate(`${label}! +${stars} ⭐`, kind === 'outside' ? '🌳' : '📖', true);
}

function buyGamingHour() {
  const s = weekendSettings();
  const w = weekendToday();
  if (!pet || pet.stars < s.starsPerHour || w.hours >= s.capHours || w.needEarn || w.gamingUntil > Date.now()) return;
  if (!confirm(`Spend ⭐ ${s.starsPerHour} on 1 hour of gaming?`)) return;
  pet.stars -= s.starsPerHour;
  savePet();
  w.hours += 1;
  w.gamingUntil = Date.now() + 60 * 60000;
  w.needEarn = true;                                       // the level-up break
  w.log.push({ t: Date.now(), text: `🎮 Gaming hour ${w.hours}` });
  saveWeekendToday(w);
  if (typeof kidAlert === 'function') kidAlert('gaming', `hour ${w.hours} of ${s.capHours} today`);   // tell the grown-ups
  showPet();
  showWeekendCard();
  celebrate(`🎮 Game on until ${clockTime(w.gamingUntil)}! After that, do 1 earn activity to unlock the next hour.`, '🎮', false);
}

function askWeekendJob(emoji, name, stars) {
  if (!wallet) wallet = freshWallet();
  if (wallet.jobRequests.some(r => r.name === name && r.stars && r.status === 'waiting')) return;
  wallet.jobRequests.push({ id: Date.now(), emoji, name, cents: 0, stars: stars,
                            date: new Date().toLocaleDateString(), status: 'waiting' });
  saveWallet();
  if (typeof kidAlert === 'function') kidAlert('job', name);
  showWeekendCard();
  celebrate(`${emoji} Nice! ${parentName()} will check it. Then you get ⭐ ${stars}.`, emoji, false);
}

// For the parent dashboard (sync.js)
function weekendForCloud() {
  const w = weekendToday();
  return { date: w.date, hours: w.hours, cap: weekendSettings().capHours, gamingUntil: w.gamingUntil, needEarn: w.needEarn };
}

// ---------- Grown-ups → 🎮 Weekend Earn & Play ----------
function showParentWeekend() {
  const box = document.getElementById('parentWeekend');
  if (!box) return;
  const s = weekendSettings();
  box.textContent = '';
  const add = (tag, text, parent = box) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    parent.appendChild(el);
    return el;
  };

  const onLabel = add('label');
  const on = add('input', undefined, onLabel);
  on.type = 'checkbox';
  on.checked = s.on;
  onLabel.append(' Turn on Weekend Earn & Play (Saturdays and Sundays)');

  add('label', 'Most gaming hours a day');
  const cap = add('input');
  cap.type = 'number'; cap.min = 0; cap.max = 12; cap.value = s.capHours;
  add('label', 'Stars for 1 hour of gaming');
  const price = add('input');
  price.type = 'number'; price.min = 1; price.max = 500; price.value = s.starsPerHour;
  add('label', 'Weekend jobs, one per line: emoji, job, then stars (like "🛏️ Clean your room 15")');
  const jobs = add('textarea');
  jobs.rows = 5;
  jobs.value = s.jobs.map(j => j.join(' ')).join('\n');

  const save = add('button', 'Save weekend settings');
  const status = add('div');
  save.addEventListener('click', () => {
    const parsed = jobs.value.split('\n').map(line => {
      const m = /^(\S+)\s+(.+?)\s+(\d+)\s*$/.exec(line.trim());
      return m ? [m[1], m[2].slice(0, 40), Math.min(100, Number(m[3]))] : null;
    }).filter(Boolean);
    saveWeekendSettings({ on: on.checked, capHours: Math.max(0, Math.min(12, Number(cap.value) || 0)),
                          starsPerHour: Math.max(1, Math.min(500, Number(price.value) || 25)), jobs: parsed });
    status.textContent = `✅ Saved. ${parsed.length} weekend job${parsed.length === 1 ? '' : 's'}.`;
    showWeekendCard();
  });

  // What happened today / this weekend
  const w = weekendToday();
  if (isWeekendDay() && w.log.length) {
    add('h4', 'Today');
    w.log.slice(-10).forEach(e => add('div', `${clockTime(e.t)} · ${e.text}`));
  }
  let reading = [];
  try { reading = JSON.parse(localStorage.getItem('kiddyKatReadingLog') || '[]'); } catch (err) {}
  if (reading.length) {
    add('h4', '📖 Reading log');
    reading.slice(-5).reverse().forEach(r => add('div', `${r.date} · ${r.book}: "${r.summary}"`));
  }
}

// Keep the timers and gaming clock fresh
// (not while a kid is typing what they read or taking the outside photo)
setInterval(() => {
  const card = document.getElementById('weekendCard');
  if (!isWeekendDay() || (card && card.querySelector('textarea, input[type=file]'))) return;
  showWeekendCard();
}, 20000);
