// =====================================================================
// packs.js — Practice packs that Claude writes from missed schoolwork
// A grown-up makes a pack on the grades page, copies the pack code,
// and pastes it into ⚙️ Grown-ups → 🧠 Practice pack on the kid's phone.
// The kid plays it from 🎮 Practice, 5 questions a round.
// Right answers are done. Wrong ones come back later for another try.
// =====================================================================

let practicePack = JSON.parse(localStorage.getItem('kiddyKatPack') || 'null');

function savePack() {
  localStorage.setItem('kiddyKatPack', JSON.stringify(practicePack));
}

// Pack codes are "KKPACK1:" + the pack written in base64, so texting it never breaks it
function readPackCode(code) {
  const text = code.trim().replace(/\s/g, '');
  if (!text.startsWith('KKPACK1:')) return null;
  try {
    const bytes = Uint8Array.from(atob(text.slice(8)), c => c.charCodeAt(0));
    const pack = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(pack.questions) || pack.questions.length === 0) return null;
    return pack;
  } catch (err) {
    return null;
  }
}

function packLeft() {
  return practicePack ? practicePack.queue.length : 0;
}

// ---------- In the 🎮 Practice menu ----------
function addPackButton(menu) {
  if (!practicePack) return;
  const left = packLeft();
  if (left === 0) {
    addMenuButton(menu, `🏆 ${practicePack.title} (done!)`, () => {});
    return;
  }
  addMenuButton(menu, `🧠 ${practicePack.title} (${left} left)`, startPack);
  menu.lastChild.style.width = '90%';
}

function startPack() {
  // Next 5 from the queue. If fewer are left, add done ones as a review.
  const ids = practicePack.queue.slice(0, QUESTIONS_PER_ROUND);
  const review = shuffle(practicePack.questions.map((q, i) => i).filter(i => !ids.includes(i)));
  while (ids.length < QUESTIONS_PER_ROUND && review.length) ids.push(review.pop());
  round = { game: 'pack', number: 0, correct: 0, items: ids, total: ids.length };
  nextWordQuestion();
}

function showPackQuestion(id) {
  const item = practicePack.questions[id];
  document.getElementById('gameTitle').textContent =
    `🧠 ${item.topic || practicePack.title}  (${round.number} of ${round.total})`;
  const question = document.getElementById('gameQuestion');
  question.style.fontSize = item.q.length > 80 ? '22px' : '28px';
  question.textContent = item.q;

  const right = item.choices[item.a];
  showWordChoices(shuffle(item.choices), right, item.why || `The answer is ${right}.`);
  // Remember which ones were right, so wrong ones come back later
  document.querySelectorAll('#gameChoices .choice').forEach(button =>
    button.addEventListener('click', () => markPackAnswer(id, button.textContent === right)));
}

function markPackAnswer(id, isRight) {
  const stats = practicePack.stats[id] || (practicePack.stats[id] = { right: 0, wrong: 0 });
  const spot = practicePack.queue.indexOf(id);
  if (isRight) {
    stats.right += 1;
    if (spot !== -1) practicePack.queue.splice(spot, 1);         // learned it
  } else {
    stats.wrong += 1;
    if (spot !== -1) practicePack.queue.splice(spot, 1);
    practicePack.queue.push(id);                                  // try again later
  }
  savePack();
}

// Called by endRound after a pack round
function afterPackRound() {
  if (packLeft() === 0 && !practicePack.finished) {
    practicePack.finished = new Date().toLocaleDateString();
    savePack();
    addStars(10);
    setTimeout(() => celebrate(`🏆 You finished "${practicePack.title}"! +10 ⭐`, '🧠', true), 600);
  }
}

// ---------- Parent side (inside Grown-ups, behind the PIN) ----------
function showParentPack() {
  const box = document.getElementById('parentPack');
  if (!box) return;
  box.textContent = '';
  const add = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    box.appendChild(el);
    return el;
  };

  if (practicePack) {
    const total = practicePack.questions.length;
    add('p', `Now playing: "${practicePack.title}". ${total - packLeft()} of ${total} learned` +
             (practicePack.finished ? ` (finished ${practicePack.finished}) 🏆` : '.'));
    // The ones that were hardest, so you know what to help with
    const hard = practicePack.questions
      .map((q, i) => ({ q: q, wrong: (practicePack.stats[i] || {}).wrong || 0 }))
      .filter(x => x.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 5);
    if (hard.length) {
      add('b', 'Hardest so far:');
      hard.forEach(x => add('div', `❌ ${x.wrong}× ${x.q.topic ? x.q.topic + ': ' : ''}${x.q.q}`));
    }
  } else {
    add('p', 'No practice pack yet.');
  }

  if (!parentUnlocked) {
    add('p', '🔒 Unlock with your PIN to add a new pack.');
    return;
  }
  add('p', 'On the grades page, make a pack and tap "📋 Copy pack code". Paste it here.');
  const code = add('textarea');
  code.style.height = '80px';
  code.placeholder = 'KKPACK1:...';
  const load = add('button', 'Load practice pack');
  const status = add('div');
  load.addEventListener('click', () => {
    const pack = readPackCode(code.value);
    if (!pack) { status.textContent = '⚠️ That code didn\'t work. Copy it again from the grades page.'; return; }
    if (practicePack && packLeft() > 0 &&
        !confirm(`Replace "${practicePack.title}"? ${packLeft()} questions are still left in it.`)) return;
    practicePack = { title: pack.title || 'Practice pack', topics: pack.topics || [],
                     questions: pack.questions, queue: shuffle(pack.questions.map((q, i) => i)),
                     stats: {}, added: new Date().toLocaleDateString() };
    savePack();
    showParentPack();
    showPracticeStats();
  });
}
