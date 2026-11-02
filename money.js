// =====================================================================
// money.js — 💰 Money goals for grown-ups (eagle / career mode)
//   🐷 Savings challenges: a goal amount, log what you set aside,
//      celebrations at 25%, 50%, 75% and 100% (a trophy at 100%)
//   💳 Debt payoff: starting balance, log payments, celebrate down to $0
//   ⚡ Pay-early game: paying a bill before its due date earns ⭐,
//      an on-time streak, and trophies (works with bills.js)
// Privacy: every dollar amount stays on THIS phone only (never sent online)
// and the details are behind the parent PIN. The main-screen card shows
// percentages, streaks and trophies only, so the kids can see the habits
// without seeing the numbers.
// =====================================================================

const MONEY_MILESTONES = [25, 50, 75, 100];
const MONEY_TROPHIES = {
  'early-5':   ['⚡', 'Early bird', '5 bills paid early'],
  'early-20':  ['🚀', 'Way ahead', '20 bills paid early'],
  'streak-10': ['🔥', 'On a roll', '10 bills in a row on time'],
  'streak-25': ['💎', 'Rock solid', '25 bills in a row on time'],
  'saved':     ['🐷', 'Goal reached', 'a savings goal'],
  'paidoff':   ['🎉', 'Paid off', 'a debt down to $0']
};
let moneyUnlocked = false;
let moneyAdding = null;          // 'save' | 'debt' while the new-goal form is open

function moneyToday() { return typeof billDayKey === 'function' ? billDayKey() : new Date().toISOString().slice(0, 10); }
function moneyFmt(n) { return '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function moneyPct(g) { return g.target > 0 ? Math.min(100, Math.round(g.done / g.target * 100)) : 0; }

function loadMoney() {
  let m = null;
  try { m = JSON.parse(localStorage.getItem('kiddyKatMoneyGoals') || 'null'); } catch (err) {}
  if (!m || typeof m !== 'object') m = {};
  if (!Array.isArray(m.goals)) m.goals = [];
  if (!Array.isArray(m.payLog)) m.payLog = [];
  if (!Array.isArray(m.trophies)) m.trophies = [];
  return m;
}
function saveMoney(m) {
  m.payLog = m.payLog.slice(-200);
  localStorage.setItem('kiddyKatMoneyGoals', JSON.stringify(m));
}

function moneyCelebrate(text, emoji) {
  if (typeof celebrate === 'function') setTimeout(() => celebrate(text, emoji, false), 300);
  else if (typeof careerToast === 'function') careerToast(text);
}

// Gives a trophy once. Returns true when it's new.
function moneyTrophy(m, id, detail) {
  if (m.trophies.some(t => t.id === id)) return false;
  m.trophies.push({ id: id, at: moneyToday(), detail: detail || '' });
  return true;
}

// ---------- 🐷 Savings and 💳 debt ----------
function moneyLog(goalId, amount) {
  const m = loadMoney();
  const g = m.goals.find(x => x.id === goalId);
  amount = Math.round((Number(amount) || 0) * 100) / 100;
  if (!g || !(amount > 0)) return;
  const before = moneyPct(g);
  g.done = Math.round((g.done + amount) * 100) / 100;
  g.log.push({ at: moneyToday(), amount: amount });
  g.log = g.log.slice(-100);
  const after = moneyPct(g);
  const crossed = MONEY_MILESTONES.filter(p => before < p && after >= p && !g.hit.includes(p));
  g.hit = g.hit.concat(crossed);
  const top = crossed.at(-1);
  if (top === 100) {
    g.finishedAt = moneyToday();
    // A unique trophy id per goal, so every goal reached gets its own trophy
    moneyTrophy(m, (g.kind === 'debt' ? 'paidoff-' : 'saved-') + g.id, g.name);
    if (typeof addStars === 'function') addStars(5);
  } else if (top && typeof addStars === 'function') addStars(1);
  saveMoney(m);
  if (top === 100) {
    moneyCelebrate(g.kind === 'debt'
      ? `🎉 PAID OFF! ${g.name} is down to $0. That's ${moneyFmt(g.target)} of debt gone! +5 ⭐`
      : `🐷 GOAL REACHED! You saved ${moneyFmt(g.done)} for ${g.name}! +5 ⭐`, g.kind === 'debt' ? '🎉' : '🐷');
  } else if (top) {
    moneyCelebrate(g.kind === 'debt'
      ? `💳 ${top}% of ${g.name} paid off! ${moneyFmt(g.target - g.done)} to go. +1 ⭐`
      : `🐷 ${top}% of the way to ${g.name}! ${moneyFmt(g.target - g.done)} to go. +1 ⭐`, top >= 75 ? '🔥' : '💪');
  } else if (typeof careerToast === 'function') {
    careerToast(`${g.kind === 'debt' ? '💳' : '🐷'} +${moneyFmt(amount)} · ${after}%`);
  }
  showMoney();
  showMoneyCard();
}

function moneyUndo(goalId) {
  const m = loadMoney();
  const g = m.goals.find(x => x.id === goalId);
  if (!g || !g.log.length) return;
  const last = g.log.pop();
  g.done = Math.max(0, Math.round((g.done - last.amount) * 100) / 100);
  g.hit = g.hit.filter(p => p <= moneyPct(g));
  if (moneyPct(g) < 100) delete g.finishedAt;
  saveMoney(m);
  showMoney();
  showMoneyCard();
}

// ---------- ⚡ Pay-early game (called by bills.js when a bill is marked paid or un-paid) ----------
function moneyBillPaid(bill, due, paid) {
  const m = loadMoney();
  const key = bill.id + '|' + due;
  m.payLog = m.payLog.filter(p => p.key !== key);
  if (!paid) { saveMoney(m); showMoneyCard(); return ''; }
  const today = moneyToday();
  const early = typeof billDaysBetween === 'function' ? billDaysBetween(today, due) : 0;   // days before the due date
  m.payLog.push({ key: key, name: bill.name, due: due, paidOn: today });
  let text, stars = 0;
  if (early >= 3) { stars = 2; text = `⚡ ${bill.name} paid ${early} days early! +2 ⭐`; }
  else if (early >= 1) { stars = 1; text = `⚡ ${bill.name} paid ${early === 1 ? 'a day' : early + ' days'} early! +1 ⭐`; }
  else if (early === 0) text = `✅ ${bill.name} paid on time!`;
  else text = `✅ ${bill.name} paid. Back on track!`;
  const s = moneyStats(m);
  const fresh = [];
  if (s.earlyTotal >= 5 && moneyTrophy(m, 'early-5')) fresh.push('early-5');
  if (s.earlyTotal >= 20 && moneyTrophy(m, 'early-20')) fresh.push('early-20');
  if (s.streak >= 10 && moneyTrophy(m, 'streak-10')) fresh.push('streak-10');
  if (s.streak >= 25 && moneyTrophy(m, 'streak-25')) fresh.push('streak-25');
  saveMoney(m);
  if (stars && typeof addStars === 'function') addStars(stars);
  if (fresh.length) {
    const [emoji, name, what] = MONEY_TROPHIES[fresh.at(-1)];
    moneyCelebrate(`${emoji} New trophy: ${name}! ${what[0].toUpperCase() + what.slice(1)}. ${text}`, emoji);
  }
  showMoneyCard();
  return text;
}

// On-time streak, early payments this month and in total
function moneyStats(m = loadMoney()) {
  const log = m.payLog.slice().sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.due.localeCompare(b.due));
  let streak = 0;
  for (let i = log.length - 1; i >= 0 && log.at(i).paidOn <= log.at(i).due; i--) streak++;
  // An overdue bill that isn't paid yet breaks the streak too
  if (typeof billOverdue === 'function' && billOverdue().length) streak = 0;
  const month = moneyToday().slice(0, 7);
  const early = log.filter(p => p.paidOn < p.due);
  return { streak: streak, earlyMonth: early.filter(p => p.paidOn.slice(0, 7) === month).length, earlyTotal: early.length };
}

function moneyTrophyList(m) {
  return m.trophies.map(t => {
    const base = MONEY_TROPHIES[t.id] || MONEY_TROPHIES[t.id.split('-')[0]] || ['🏆', 'Trophy', ''];
    return { emoji: base[0], name: base[1], detail: t.detail || base[2], at: t.at };
  });
}

// ---------- 💰 The card on the main screen (percentages only, no dollars) ----------
function showMoneyCard() {
  const card = document.getElementById('moneyCard');
  if (!card) return;
  const show = typeof profile !== 'undefined' && profile && typeof isEagle === 'function' && isEagle();
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
  const m = loadMoney();
  const s = moneyStats(m);
  const title = add(card, 'div', '💰 Money goals', 'careerTitle');
  title.appendChild(infoButton('Savings challenges, debt payoff and the pay-early game. Dollar amounts stay on this phone only, ' +
    'behind your parent PIN. This card only shows percentages, streaks and trophies.'));
  const active = m.goals.filter(g => moneyPct(g) < 100);
  if (!m.goals.length) add(card, 'div', 'Start a savings challenge or a debt payoff, and pay bills early to earn ⭐.', 'billLine');
  active.slice(0, 4).forEach(g => {
    const row = add(card, 'div', undefined, 'moneyRow');
    add(row, 'div', `${g.kind === 'debt' ? '💳' : '🐷'} ${g.name}: ${moneyPct(g)}%${g.kind === 'debt' ? ' paid off' : ''}`, 'billLine');
    const bar = add(row, 'div', undefined, 'careerBar moneyBar');
    add(bar, 'div').style.width = moneyPct(g) + '%';
  });
  add(card, 'div', `🔥 On-time streak: ${s.streak} bill${s.streak === 1 ? '' : 's'} · ⚡ ${s.earlyMonth} paid early this month`, 'billLine');
  const trophies = moneyTrophyList(m);
  if (trophies.length) add(card, 'div', `🏆 ${trophies.map(t => t.emoji).join(' ')}`, 'billLine moneyTrophies');
  add(card, 'button', '💰 My money goals 🔒', 'careerOpen').addEventListener('click', openMoney);
}

// ---------- 💰 Details (behind the parent PIN) ----------
function openMoney() {
  document.getElementById('money').style.display = 'block';
  moneyUnlocked = !localStorage.getItem('kiddyKatParentPin');
  moneyAdding = null;
  showMoney();
}

function closeMoney() {
  document.getElementById('money').style.display = 'none';
  moneyUnlocked = false;
  showMoneyCard();
}

function showMoney() {
  const box = document.getElementById('moneyBody');
  if (!box || document.getElementById('money').style.display !== 'block') return;
  box.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };

  if (!moneyUnlocked) {
    add(box, 'p', '🔒 Your money goals are private. Type your parent PIN to open them.');
    const pin = add(box, 'input');
    pin.type = 'password';
    pin.inputMode = 'numeric';
    const go = add(box, 'button', 'Open', 'careerSave');
    const note = add(box, 'div', '', 'careerNote');
    go.addEventListener('click', () => {
      if (pin.value !== localStorage.getItem('kiddyKatParentPin')) { note.textContent = "That's not the right PIN."; pin.value = ''; return; }
      moneyUnlocked = true;
      showMoney();
    });
    return;
  }
  if (moneyAdding) { showMoneyForm(box, add); return; }

  const m = loadMoney();
  const goalCard = (parent, g) => {
    const item = add(parent, 'div', undefined, 'careerItem');
    const pct = moneyPct(g);
    add(item, 'div', `${g.name}${pct >= 100 ? (g.kind === 'debt' ? ' · 🎉 Paid off!' : ' · 🏆 Reached!') : ''}`, 'careerItemName');
    add(item, 'div', g.kind === 'debt'
      ? `Paid ${moneyFmt(g.done)} of ${moneyFmt(g.target)} · ${moneyFmt(Math.max(0, g.target - g.done))} left · ${pct}%`
      : `Saved ${moneyFmt(g.done)} of ${moneyFmt(g.target)} · ${moneyFmt(Math.max(0, g.target - g.done))} to go · ${pct}%`, 'careerItemRole');
    const bar = add(item, 'div', undefined, 'careerBar moneyBar');
    add(bar, 'div').style.width = pct + '%';
    add(item, 'div', MONEY_MILESTONES.map(p => (g.hit.includes(p) ? '✅' : '⬜') + ` ${p}%`).join('  '), 'careerNote');
    const buttons = add(item, 'div', undefined, 'careerItemButtons moneyLogRow');
    if (pct < 100) {
      const amount = add(buttons, 'input');
      amount.type = 'number'; amount.inputMode = 'decimal'; amount.min = '0'; amount.step = '0.01';
      amount.placeholder = g.kind === 'debt' ? 'Payment $' : 'Amount $';
      add(buttons, 'button', g.kind === 'debt' ? '➕ Log payment' : '➕ Add', 'careerSave').addEventListener('click', () => moneyLog(g.id, amount.value));
    }
    if (g.log.length) add(buttons, 'button', '↩ Undo last', 'careerDelete').addEventListener('click', () => moneyUndo(g.id));
    add(buttons, 'button', '🗑️', 'careerDelete').addEventListener('click', () => {
      if (!confirm(`Delete ${g.name}?`)) return;
      const fresh = loadMoney();
      fresh.goals = fresh.goals.filter(x => x.id !== g.id);
      saveMoney(fresh);
      showMoney();
      showMoneyCard();
    });
  };

  const saves = add(box, 'div', undefined, 'careerSection');
  add(saves, 'h3', '🐷 Savings challenges');
  const s1 = m.goals.filter(g => g.kind === 'save');
  if (!s1.length) add(saves, 'div', 'Save up for something: an emergency fund, a vacation, a new laptop.', 'careerNote');
  s1.forEach(g => goalCard(saves, g));
  add(saves, 'button', '➕ New savings challenge', 'careerSave').addEventListener('click', () => { moneyAdding = 'save'; showMoney(); });

  const debts = add(box, 'div', undefined, 'careerSection');
  add(debts, 'h3', '💳 Debt payoff');
  const d1 = m.goals.filter(g => g.kind === 'debt');
  if (!d1.length) add(debts, 'div', 'Track a credit card, car loan or home loan down to $0.', 'careerNote');
  d1.forEach(g => goalCard(debts, g));
  add(debts, 'button', '➕ New debt to pay off', 'careerSave').addEventListener('click', () => { moneyAdding = 'debt'; showMoney(); });

  const s = moneyStats(m);
  const game = add(box, 'div', undefined, 'careerSection');
  add(game, 'h3', '⚡ Pay-early game');
  add(game, 'div', 'Mark a bill ✓ Paid in 🧾 My bills before its due date: 1 day early = +1 ⭐, 3 or more days early = +2 ⭐. Paying on time keeps your streak going.', 'careerNote');
  add(game, 'div', `🔥 On-time streak: ${s.streak} bill${s.streak === 1 ? '' : 's'} in a row`, 'careerNext');
  add(game, 'div', `⚡ Paid early: ${s.earlyMonth} this month, ${s.earlyTotal} in total`, 'careerNext');

  const shelf = add(box, 'div', undefined, 'careerSection');
  add(shelf, 'h3', '🏆 Money trophies');
  const trophies = moneyTrophyList(m);
  if (!trophies.length) add(shelf, 'div', 'Next up: ⚡ Early bird (5 bills paid early), 🔥 On a roll (10 on time in a row), 🐷 your first savings goal.', 'careerNote');
  trophies.forEach(t => add(shelf, 'div', `${t.emoji} ${t.name}: ${t.detail} (${t.at})`, 'careerNext'));

  add(box, 'div', '🔒 Dollar amounts stay on this phone only and are never sent online.', 'careerNote');
}

function showMoneyForm(box, add) {
  const debt = moneyAdding === 'debt';
  const sec = add(box, 'div', undefined, 'careerSection');
  add(sec, 'h3', debt ? '💳 New debt to pay off' : '🐷 New savings challenge');
  add(sec, 'label', debt ? 'Name (like Visa card, Car loan, Home loan)' : 'Name (like Emergency fund, Vacation)');
  const name = add(sec, 'input'); name.maxLength = 30;
  add(sec, 'label', debt ? 'Balance when you start ($)' : 'Goal amount ($)');
  const target = add(sec, 'input'); target.type = 'number'; target.inputMode = 'decimal'; target.min = '0'; target.step = '0.01';
  add(sec, 'label', debt ? 'Already paid toward it, if you want to count it ($, optional)' : 'Already saved ($, optional)');
  const start = add(sec, 'input'); start.type = 'number'; start.inputMode = 'decimal'; start.min = '0'; start.step = '0.01';
  const msg = add(sec, 'div', '', 'careerNote');
  const buttons = add(sec, 'div', undefined, 'careerItemButtons');
  add(buttons, 'button', '💾 Save', 'careerSave').addEventListener('click', () => {
    const n = name.value.trim();
    const t = Math.round((parseFloat(target.value) || 0) * 100) / 100;
    const s = Math.max(0, Math.round((parseFloat(start.value) || 0) * 100) / 100);
    if (!n) { msg.textContent = 'Please type a name.'; return; }
    if (!(t > 0)) { msg.textContent = 'Please type an amount.'; return; }
    const m = loadMoney();
    const g = { id: 'g' + Date.now().toString(36), kind: debt ? 'debt' : 'save', name: n, target: t, done: Math.min(s, t), log: [], hit: [], createdAt: moneyToday() };
    g.hit = MONEY_MILESTONES.filter(p => p < 100 && moneyPct(g) >= p);     // milestones already behind you don't celebrate
    m.goals.push(g);
    saveMoney(m);
    moneyAdding = null;
    if (typeof careerToast === 'function') careerToast(`${debt ? '💳' : '🐷'} ${n} added. You've got this!`);
    showMoney();
    showMoneyCard();
  });
  add(buttons, 'button', 'Cancel', 'careerDelete').addEventListener('click', () => { moneyAdding = null; showMoney(); });
}
