// =====================================================================
// career.js — 🦅 Career mode for grown-ups (the eagle)
//
// • Weekly career goals on the home screen (applications, networking, learning...).
//   Each step earns 1 ⭐ and 1 🏆 league point, so the kids see you working your plan.
// • A private tracker for the job search AND freelance work, side by side:
//   companies/clients, stage, next step and date, notes. It's behind the parent PIN,
//   so the kids can see your goals and streak but not job or client details.
// =====================================================================

const DEFAULT_CAREER_GOALS = [
  ['apps', '📨', 'Job applications', 5],
  ['network', '🤝', 'Networking messages', 5],
  ['learn', '📚', 'Learning hours', 4],
  ['commits', '💻', 'Portfolio commits', 3],
  ['outreach', '🧲', 'Freelance outreach', 3],
  ['prep', '🎤', 'Interview prep sessions', 2]
];

const CAREER_TRACKS = {
  job: { label: '💼 Job search', what: 'Company', role: 'Role (like Sr. Engineering Manager)',
         stages: [['interested', '⭐ Interested'], ['applied', '📨 Applied'], ['interviewing', '🗣️ Interviewing'],
                  ['offer', '🎉 Offer'], ['closed', '📦 Closed']] },
  freelance: { label: '🧑‍💻 Freelance', what: 'Client', role: 'Project (like Booking app)',
               stages: [['lead', '🧲 Lead'], ['talking', '💬 Talking'], ['proposal', '📝 Proposal'],
                        ['active', '🛠️ Active'], ['done', '✅ Done']] }
};

let careerTab = 'job';
let careerUnlocked = false;

function isEagle() {
  return typeof animal !== 'undefined' && animal.theme === 'eagle';
}

function careerWeekKey() {
  return typeof leagueWeek === 'function' ? leagueWeek() : new Date().toDateString();
}

function careerGoals() {
  try { const g = JSON.parse(localStorage.getItem('kiddyKatCareerGoals') || 'null'); if (Array.isArray(g) && g.length) return g; } catch (err) {}
  return DEFAULT_CAREER_GOALS;
}

function careerWeek() {
  let w = null;
  try { w = JSON.parse(localStorage.getItem('kiddyKatCareerWeek') || 'null'); } catch (err) {}
  if (!w || w.week !== careerWeekKey()) w = { week: careerWeekKey(), counts: {} };
  return w;
}

function loadCareer() {
  try { const c = JSON.parse(localStorage.getItem('kiddyKatCareer') || 'null'); if (c && Array.isArray(c.items)) return c; } catch (err) {}
  return { items: [] };
}

function saveCareer(c) {
  localStorage.setItem('kiddyKatCareer', JSON.stringify(c));
}

// One step toward a weekly goal (+1 ⭐, +1 league point)
function careerStep(id, by = 1) {
  const w = careerWeek();
  const goal = careerGoals().find(g => g[0] === id);
  if (!goal) return;
  const before = w.counts[id] || 0;
  w.counts[id] = Math.max(0, before + by);
  localStorage.setItem('kiddyKatCareerWeek', JSON.stringify(w));
  if (by > 0) {
    if (typeof addStars === 'function') addStars(1);
    if (typeof leagueRecord === 'function') leagueRecord('career');
    if (before < goal[3] && w.counts[id] >= goal[3] && typeof celebrate === 'function') {
      celebrate(`🎯 Goal hit: ${goal[3]} ${goal[2].toLowerCase()} this week!`, '🦅', true);
    }
  }
  showCareerCard();
}

// ---------- 🦅 The weekly goals card ----------
function showCareerCard() {
  const card = document.getElementById('careerCard');
  if (!card) return;
  const show = typeof profile !== 'undefined' && profile && isEagle();
  card.style.display = show ? 'block' : 'none';
  if (!show) return;
  card.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const goals = careerGoals();
  const w = careerWeek();
  const done = goals.reduce((n, g) => n + Math.min(w.counts[g[0]] || 0, g[3]), 0);
  const target = goals.reduce((n, g) => n + g[3], 0);

  const title = add(card, 'div', `🦅 Career this week: ${done} of ${target}`, 'careerTitle');
  title.appendChild(infoButton('Tap + each time you do one. Every step earns 1 ⭐ and 1 🏆 league point, and goals start over every Monday. ' +
    'Your job and client details live in the tracker, behind your parent PIN.'));
  goals.forEach(([id, emoji, name, goal]) => {
    const n = w.counts[id] || 0;
    const row = add(card, 'div', undefined, 'careerGoal' + (n >= goal ? ' met' : ''));
    const label = add(row, 'div', undefined, 'careerGoalLabel');
    add(label, 'span', `${emoji} ${name}`);
    add(label, 'span', n >= goal ? `${n} of ${goal} ✅` : `${n} of ${goal}`, 'careerCount');
    const bar = add(row, 'div', undefined, 'careerBar');
    add(bar, 'div').style.width = Math.min(100, n / goal * 100) + '%';
    const buttons = add(row, 'div', undefined, 'careerButtons');
    const minus = add(buttons, 'button', '−', 'careerMinus');
    minus.disabled = n === 0;
    minus.addEventListener('click', () => careerStep(id, -1));
    add(buttons, 'button', '+1', 'careerPlus').addEventListener('click', () => careerStep(id, 1));
  });
  const items = loadCareer().items;
  const due = items.filter(i => i.nextDate && i.nextDate <= suppliesDayKey() && !['closed', 'done'].includes(i.stage)).length;
  const open = add(card, 'button', due ? `📋 My tracker 🔒 · ${due} next step${due === 1 ? '' : 's'} due` : '📋 My tracker 🔒', 'careerOpen');
  open.addEventListener('click', openCareer);
}

// ---------- 📋 The tracker (behind the parent PIN) ----------
function openCareer() {
  document.getElementById('career').style.display = 'block';
  careerUnlocked = !localStorage.getItem('kiddyKatParentPin');      // no PIN set yet: open
  showCareer();
}

function closeCareer() {
  document.getElementById('career').style.display = 'none';
  careerUnlocked = false;
  showCareerCard();
}

function showCareer() {
  const box = document.getElementById('careerBody');
  box.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };

  if (!careerUnlocked) {
    add(box, 'p', '🔒 Your tracker is private. Type your parent PIN to open it.');
    const pin = add(box, 'input');
    pin.type = 'password';
    pin.inputMode = 'numeric';
    const go = add(box, 'button', 'Open', 'careerSave');
    const note = add(box, 'div', '', 'careerNote');
    go.addEventListener('click', () => {
      if (pin.value !== localStorage.getItem('kiddyKatParentPin')) { note.textContent = "That's not the right PIN."; pin.value = ''; return; }
      careerUnlocked = true;
      showCareer();
    });
    return;
  }

  const career = loadCareer();
  const today = suppliesDayKey();

  // Next steps across both tracks, soonest first
  const next = career.items.filter(i => i.next && !['closed', 'done'].includes(i.stage))
    .sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999')).slice(0, 5);
  if (next.length) {
    const sec = add(box, 'div', undefined, 'careerSection');
    add(sec, 'h3', '⏭️ Next steps');
    next.forEach(i => {
      const late = i.nextDate && i.nextDate < today;
      const when = i.nextDate ? new Date(i.nextDate + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'no date';
      add(sec, 'div', `${late ? '⚠️ ' : ''}${when}: ${i.next} (${i.name})`, 'careerNext' + (late ? ' late' : ''));
    });
  }

  // Job search | Freelance
  const tabs = add(box, 'div', undefined, 'careerTabs');
  Object.entries(CAREER_TRACKS).forEach(([key, t]) => {
    const n = career.items.filter(i => i.track === key && !['closed', 'done'].includes(i.stage)).length;
    const b = add(tabs, 'button', `${t.label} (${n})`, careerTab === key ? 'picked' : '');
    b.addEventListener('click', () => { careerTab = key; showCareer(); });
  });

  const track = CAREER_TRACKS[careerTab];
  track.stages.forEach(([stage, label]) => {
    const list = career.items.filter(i => i.track === careerTab && i.stage === stage);
    if (!list.length) return;
    const sec = add(box, 'div', undefined, 'careerSection');
    add(sec, 'h3', `${label} (${list.length})`);
    list.forEach(item => careerItemCard(sec, item, add));
  });

  // Add one
  const form = add(box, 'div', undefined, 'careerSection');
  add(form, 'h3', `➕ Add to ${track.label}`);
  const name = add(form, 'input'); name.placeholder = track.what; name.maxLength = 60;
  const role = add(form, 'input'); role.placeholder = track.role; role.maxLength = 80;
  const stagePick = add(form, 'select');
  track.stages.forEach(([v, l]) => stagePick.add(new Option(l, v)));
  const save = add(form, 'button', 'Add', 'careerSave');
  save.addEventListener('click', () => {
    if (!name.value.trim()) { name.focus(); return; }
    const c = loadCareer();
    c.items.push({ id: Date.now(), track: careerTab, name: name.value.trim(), role: role.value.trim(), stage: stagePick.value,
                   next: '', nextDate: '', notes: '', updated: new Date().toISOString() });
    saveCareer(c);
    careerAutoStep(careerTab, null, stagePick.value);
    showCareer();
  });

  // Weekly goals editor
  const goalsBox = add(box, 'div', undefined, 'careerSection');
  add(goalsBox, 'h3', '🎯 Weekly goals');
  add(goalsBox, 'div', 'One per line: emoji, goal name, then the number for the week (like "📨 Job applications 5").', 'careerNote');
  const goalsText = add(goalsBox, 'textarea');
  goalsText.rows = 6;
  goalsText.value = careerGoals().map(g => `${g[1]} ${g[2]} ${g[3]}`).join('\n');
  const saveGoals = add(goalsBox, 'button', 'Save goals', 'careerSave');
  const goalsNote = add(goalsBox, 'div', '', 'careerNote');
  saveGoals.addEventListener('click', () => {
    const old = careerGoals();
    const parsed = goalsText.value.split('\n').map(line => {
      const m = /^(\S+)\s+(.+?)\s+(\d+)\s*$/.exec(line.trim());
      if (!m) return null;
      const same = old.find(g => g[2].toLowerCase() === m[2].toLowerCase());     // keep this week's count
      return [same ? same[0] : 'g' + m[2].toLowerCase().replace(/[^a-z0-9]+/g, '-'), m[1], m[2].slice(0, 40), Math.max(1, Math.min(99, Number(m[3])))];
    }).filter(Boolean);
    if (!parsed.length) { goalsNote.textContent = 'Add at least one goal.'; return; }
    localStorage.setItem('kiddyKatCareerGoals', JSON.stringify(parsed));
    goalsNote.textContent = `✅ Saved ${parsed.length} goals.`;
  });
}

function careerItemCard(parent, item, add) {
  const card = add(parent, 'div', undefined, 'careerItem');
  add(card, 'div', item.name, 'careerItemName');
  if (item.role) add(card, 'div', item.role, 'careerItemRole');
  const track = CAREER_TRACKS[item.track];
  const stage = add(card, 'select');
  track.stages.forEach(([v, l]) => stage.add(new Option(l, v)));
  stage.value = item.stage;
  const next = add(card, 'input'); next.placeholder = 'Next step (like "Follow up with recruiter")'; next.value = item.next || ''; next.maxLength = 80;
  const date = add(card, 'input'); date.type = 'date'; date.value = item.nextDate || '';
  const notes = add(card, 'textarea'); notes.placeholder = 'Notes: contacts, salary range, links...'; notes.value = item.notes || ''; notes.rows = 2; notes.maxLength = 1000;
  const buttons = add(card, 'div', undefined, 'careerItemButtons');
  const save = add(buttons, 'button', 'Save', 'careerSave');
  const del = add(buttons, 'button', '🗑️', 'careerDelete');
  save.addEventListener('click', () => {
    const c = loadCareer();
    const it = c.items.find(i => i.id === item.id);
    if (!it) return;
    const was = it.stage;
    Object.assign(it, { stage: stage.value, next: next.value.trim(), nextDate: date.value, notes: notes.value.trim(), updated: new Date().toISOString() });
    saveCareer(c);
    careerAutoStep(it.track, was, it.stage);
    showCareer();
  });
  del.addEventListener('click', () => {
    if (!confirm(`Remove ${item.name} from your tracker?`)) return;
    const c = loadCareer();
    c.items = c.items.filter(i => i.id !== item.id);
    saveCareer(c);
    showCareer();
  });
}

// Moving things along counts toward the weekly goals automatically
function careerAutoStep(track, from, to) {
  if (from === to) return;
  const ids = careerGoals().map(g => g[0]);
  if (track === 'job' && to === 'applied' && ids.includes('apps')) careerStep('apps', 1);
  if (track === 'freelance' && (to === 'lead' || to === 'talking') && from === null && ids.includes('outreach')) careerStep('outreach', 1);
  if (to === 'offer' && typeof celebrate === 'function') celebrate('🎉 AN OFFER! Huge week!', '🦅', true);
}

// For the parent dashboard (sync.js): just the weekly numbers, no job or client details
function careerForCloud() {
  const goals = careerGoals();
  const w = careerWeek();
  return { week: w.week, done: goals.reduce((n, g) => n + Math.min(w.counts[g[0]] || 0, g[3]), 0),
           target: goals.reduce((n, g) => n + g[3], 0) };
}
