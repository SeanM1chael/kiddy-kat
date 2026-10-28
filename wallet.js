// =====================================================================
// wallet.js — the Kiddy Kat Wallet: real money lessons
// Kids earn dollars for real work, bills come out on payday, and what's
// left is paid out by a parent in cash or Apple Cash. No real money moves
// through the app; it only keeps track.
// All money is stored in CENTS (whole numbers), so $1.25 is 125.
// That avoids rounding mistakes like 0.1 + 0.2 = 0.30000000000000004.
// =====================================================================

const DAY = 24 * 60 * 60 * 1000;

const DEFAULT_MONEY = {
  payEveryDays: 14,                                  // payday every 2 weeks
  wages: { list: 10, round: 10, challenge: 25 },    // cents
  interestPercent: 2,                                // on savings, each payday
  taxPercent: { kitten: 0, tiger: 0, lion: 10 },     // "paycheck tax" for teens
  bills: {
    kitten: [['🗑️', 'Trash Valet', 100], ['📺', 'Kids streaming', 100]],
    tiger:  [['🗑️', 'Trash Valet', 100], ['📱', 'Cell phone', 300], ['🎮', 'Gaming subscription', 200], ['📶', 'Wi-Fi share', 100]],
    lion:   [['🗑️', 'Trash Valet', 100], ['📱', 'Cell phone', 500], ['📶', 'Wi-Fi share', 100], ['📺', 'Streaming', 100], ['🏠', 'Room rent', 200]]
  },
  jobs: [['🚗', 'Wash the car', 300], ['🧺', 'Fold a load of laundry', 100], ['🍽️', 'Empty the dishwasher', 50]]
};

let money = JSON.parse(localStorage.getItem('kiddyKatMoney') || 'null');    // parent settings
let wallet = JSON.parse(localStorage.getItem('kiddyKatWallet') || 'null');  // the kid's money

function moneySettings() {
  const m = money || {};
  return {
    payEveryDays: m.payEveryDays || DEFAULT_MONEY.payEveryDays,
    wages: m.wages || DEFAULT_MONEY.wages,
    interestPercent: m.interestPercent ?? DEFAULT_MONEY.interestPercent,
    taxPercent: m.taxPercent ?? DEFAULT_MONEY.taxPercent[animal.theme],
    bills: m.bills || DEFAULT_MONEY.bills[animal.theme],
    jobs: m.jobs || DEFAULT_MONEY.jobs
  };
}

function freshWallet() {
  return { spend: 0, save: 0, give: 0, earnedThisPeriod: 0, history: [], stubs: [],
           lastPayday: new Date().toDateString(), billsPaidMonth: '', pastDue: [],
           payoutDue: 0, paidToday: { date: '', lists: [] }, jobRequests: [], familyFund: 0 };
}

function saveWallet() {
  localStorage.setItem('kiddyKatWallet', JSON.stringify(wallet));
}

function saveMoneySettings() {
  localStorage.setItem('kiddyKatMoney', JSON.stringify(money));
}

// $1.25 from 125 cents
function dollars(cents) {
  const sign = cents < 0 ? '−' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

// 125 cents from "1.25" or "$1.25"
function toCents(text) {
  const clean = String(text).replace('$', '').trim();
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function logMoney(text, cents) {
  wallet.history.push({ date: new Date().toLocaleDateString(), text: text, cents: cents });
  wallet.history = wallet.history.slice(-60);
}

// ---------- Earning ----------
// Called by the app when real work is done. Each list pays once a day;
// game rounds are already limited to 3 a day; the challenge pays on the first win.
function earnMoney(kind, listName) {
  if (!profile) return '';
  if (!wallet) wallet = freshWallet();
  const today = new Date().toDateString();
  if (wallet.paidToday.date !== today) wallet.paidToday = { date: today, lists: [] };
  if (kind === 'list') {
    if (wallet.paidToday.lists.includes(listName)) return '';
    wallet.paidToday.lists.push(listName);
  }
  const pay = moneySettings().wages[kind] || 0;
  if (!pay) return '';
  const labels = { list: 'Finished a checklist', round: 'Practice round', challenge: 'Challenge of the Day' };
  wallet.spend += pay;
  wallet.earnedThisPeriod += pay;
  logMoney(labels[kind], pay);
  saveWallet();
  return `+${dollars(pay)} 💵`;
}

// ---------- Payday ----------
function nextPayday() {
  const last = new Date(wallet.lastPayday).getTime();
  return new Date(last + moneySettings().payEveryDays * DAY);
}

// Runs any paydays that are due (catches up if the app wasn't opened)
function checkPayday() {
  if (!profile || !wallet) return;
  let ran = false;
  while (Date.now() >= nextPayday().getTime()) {
    runPayday(nextPayday());
    ran = true;
  }
  if (ran) saveWallet();
}

function runPayday(when) {
  const s = moneySettings();
  const stub = { date: when.toLocaleDateString(), earned: wallet.earnedThisPeriod, lines: [] };

  // 1. Interest on savings ("Bank of Dad")
  const interest = Math.floor(wallet.save * s.interestPercent / 100);
  if (interest > 0) {
    wallet.save += interest;
    stub.lines.push([`🐷 Savings interest (${s.interestPercent}%)`, interest]);
    logMoney('Savings interest', interest);
  }

  // 2. Paycheck tax for teens, which goes to a family treat fund
  const tax = Math.min(Math.floor(wallet.earnedThisPeriod * s.taxPercent / 100), Math.max(wallet.spend, 0));
  if (tax > 0) {
    wallet.spend -= tax;
    wallet.familyFund += tax;
    stub.lines.push([`🏛️ Paycheck tax (${s.taxPercent}%), goes to the family treat fund`, -tax]);
    logMoney('Paycheck tax', -tax);
  }

  // 3. Past-due bills first, then this month's bills (once a month)
  const toPay = wallet.pastDue.map(b => ({ ...b, late: true }));
  wallet.pastDue = [];
  const month = `${when.getFullYear()}-${when.getMonth()}`;
  if (wallet.billsPaidMonth !== month) {
    wallet.billsPaidMonth = month;
    s.bills.forEach(([emoji, name, cents]) => toPay.push({ emoji, name, cents }));
  }
  toPay.forEach(bill => {
    const paid = Math.min(bill.cents, Math.max(wallet.spend, 0));
    wallet.spend -= paid;
    if (paid > 0) {
      stub.lines.push([`${bill.emoji} ${bill.name}${bill.late ? ' (past due)' : ''}`, -paid]);
      logMoney(`Paid ${bill.name}`, -paid);
    }
    if (paid < bill.cents) {
      wallet.pastDue.push({ emoji: bill.emoji, name: bill.name, cents: bill.cents - paid });
      stub.lines.push([`⚠️ ${bill.name}: ${dollars(bill.cents - paid)} still owed (past due)`, 0]);
    }
  });

  // 4. Whatever is left to spend is the take-home pay
  const takeHome = Math.max(wallet.spend, 0);
  wallet.payoutDue += takeHome;
  wallet.spend -= takeHome;
  stub.takeHome = takeHome;
  stub.saved = wallet.save;
  if (takeHome > 0) logMoney('Take-home pay (from a grown-up)', -takeHome);

  wallet.stubs.push(stub);
  wallet.stubs = wallet.stubs.slice(-12);
  wallet.earnedThisPeriod = 0;
  wallet.lastPayday = when.toDateString();
}

// ---------- Moving money between jars ----------
function moveMoney(from, to, cents) {
  if (wallet[from] < cents) return;
  wallet[from] -= cents;
  wallet[to] += cents;
  const names = { spend: 'Spend', save: 'Savings', give: 'Give' };
  logMoney(`Moved to ${names[to]}`, 0);
  saveWallet();
  showWallet();
}

// ---------- The kid's wallet screen ----------
function openWallet() {
  if (!wallet) { wallet = freshWallet(); saveWallet(); }
  checkPayday();
  document.getElementById('wallet').style.display = 'block';
  showWallet();
}

function closeWallet() {
  document.getElementById('wallet').style.display = 'none';
}

function showWallet() {
  const s = moneySettings();
  const box = document.getElementById('walletBody');
  box.textContent = '';
  const add = (tag, text, cls, parent = box) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const kitten = animal.theme === 'kitten';

  // Jars
  const jars = add('div', undefined, 'jars');
  const jar = (emoji, label, cents) => {
    const j = add('div', undefined, 'jar', jars);
    add('div', emoji, 'jarEmoji', j);
    add('div', dollars(cents), 'jarAmount', j);
    add('div', label, 'jarLabel', j);
  };
  jar('💵', 'to spend', wallet.spend);
  jar('🐷', `saved (+${s.interestPercent}% each payday)`, wallet.save);
  if (kitten) jar('💝', 'to give', wallet.give);

  const moves = add('div', undefined, 'moves');
  const moveButton = (label, from, to, cents) => {
    const b = add('button', label, undefined, moves);
    b.disabled = wallet[from] < cents;
    b.addEventListener('click', () => moveMoney(from, to, cents));
  };
  moveButton('💵→🐷 Save $1', 'spend', 'save', 100);
  moveButton('💵→🐷 Save 25¢', 'spend', 'save', 25);
  moveButton('🐷→💵 Take out $1', 'save', 'spend', 100);
  if (kitten) moveButton('💵→💝 Give 25¢', 'spend', 'give', 25);

  // Payday
  const days = Math.max(0, Math.ceil((nextPayday().getTime() - Date.now()) / DAY));
  add('h3', `📅 Next payday: ${nextPayday().toLocaleDateString()} (${days === 0 ? 'today' : 'in ' + days + ' day' + (days === 1 ? '' : 's')})`);
  add('p', `Earned so far this pay period: ${dollars(wallet.earnedThisPeriod)}`);
  if (wallet.payoutDue > 0) add('p', `🎉 ${dollars(wallet.payoutDue)} take-home pay is waiting for ${parentName()} to pay you!`, 'payoutNote');

  // Bills
  add('h3', '🧾 My monthly bills');
  const thisMonth = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  const paidThisMonth = wallet.billsPaidMonth === thisMonth;
  const total = s.bills.reduce((sum, b) => sum + b[2], 0);
  s.bills.forEach(([emoji, name, cents]) => {
    const late = wallet.pastDue.find(p => p.name === name);
    add('div', `${emoji} ${name}: ${dollars(cents)}  ${late ? `⚠️ Past due ${dollars(late.cents)}` : paidThisMonth ? '✅ Paid this month' : '⏳ Due on payday'}`, 'billRow' + (late ? ' late' : ''));
  });
  add('p', `Total: ${dollars(total)} a month`);
  if (!paidThisMonth && wallet.spend < total) {
    add('p', `💡 You have ${dollars(wallet.spend)} of ${dollars(total)} for this month's bills. Keep earning!`, 'tip');
  }

  // Jobs board
  add('h3', '💼 Ways to earn');
  add('div', `✅ Finish a checklist: ${dollars(s.wages.list)} each (once a day per list)`, 'billRow');
  add('div', `🎮 Practice round: ${dollars(s.wages.round)} each (3 a day)`, 'billRow');
  add('div', `🔴 Challenge of the Day: ${dollars(s.wages.challenge)}`, 'billRow');
  s.jobs.forEach(([emoji, name, cents]) => {
    const row = add('div', `${emoji} ${name}: ${dollars(cents)} `, 'billRow');
    const waiting = wallet.jobRequests.find(r => r.name === name && r.status === 'waiting');
    const b = add('button', waiting ? '⏳ Waiting for ' + parentName() : 'I did it!', undefined, row);
    b.disabled = !!waiting;
    b.addEventListener('click', () => {
      wallet.jobRequests.push({ id: Date.now(), emoji, name, cents, date: new Date().toLocaleDateString(), status: 'waiting' });
      saveWallet();
      if (typeof kidAlert === 'function') kidAlert('job', name);              // alert the grown-ups
      showWallet();
    });
  });

  // Last pay stub
  const stub = wallet.stubs[wallet.stubs.length - 1];
  if (stub) {
    add('h3', `🧾 Last pay stub (${stub.date})`);
    const table = add('div', undefined, 'stub');
    add('div', `Earned: ${dollars(stub.earned)}`, undefined, table);
    stub.lines.forEach(([label, cents]) => add('div', `${label}${cents ? ': ' + dollars(cents) : ''}`, undefined, table));
    add('div', `Take-home pay: ${dollars(stub.takeHome)}`, 'stubTotal', table);
  }

  // Recent activity
  if (wallet.history.length) {
    add('h3', '📒 Recent');
    wallet.history.slice(-8).reverse().forEach(h =>
      add('div', `${h.date} · ${h.text}${h.cents ? ': ' + (h.cents > 0 ? '+' : '') + dollars(h.cents) : ''}`, 'historyRow'));
  }
}

// ---------- Parent side (inside Grown-ups) ----------
function showParentWallet() {
  const box = document.getElementById('parentWallet');
  if (!box) return;
  box.textContent = '';
  if (!parentUnlocked) {
    const p = document.createElement('p');
    p.textContent = localStorage.getItem('kiddyKatParentPin')
      ? '🔒 Unlock with your PIN in the 🎁 Rewards section above to manage the wallet.'
      : 'Set a parent PIN in the 🎁 Rewards section above to manage the wallet.';
    box.appendChild(p);
    return;
  }
  if (!wallet) wallet = freshWallet();
  checkPayday();
  const s = moneySettings();
  const add = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    box.appendChild(el);
    return el;
  };

  // Payout
  add('p', `💵 To spend: ${dollars(wallet.spend)} · 🐷 Saved: ${dollars(wallet.save)}` +
    (animal.theme === 'kitten' ? ` · 💝 Give: ${dollars(wallet.give)}` : '') +
    (wallet.familyFund ? ` · 🏛️ Family treat fund: ${dollars(wallet.familyFund)}` : ''));
  if (wallet.payoutDue > 0) {
    const row = add('div', `🎉 Take-home pay to give: ${dollars(wallet.payoutDue)} `);
    const paid = document.createElement('button');
    paid.textContent = '✅ I paid it (cash or Apple Cash)';
    paid.addEventListener('click', () => { markPaidOut(wallet.payoutDue); showParentWallet(); });
    row.appendChild(paid);
  } else {
    add('p', '✅ Nothing to pay out right now.');
  }

  // Extra job approvals
  wallet.jobRequests.filter(r => r.status === 'waiting').forEach(r => {
    const row = add('div', `${r.emoji} ${r.name} (${dollars(r.cents)}, ${r.date}) `);
    const yes = document.createElement('button');
    yes.textContent = '✅ Pay it';
    yes.addEventListener('click', () => { payJob(r); showParentWallet(); });
    const no = document.createElement('button');
    no.textContent = '↩️ Not done yet';
    no.addEventListener('click', () => { declineJob(r); showParentWallet(); });
    row.append(yes, no);
  });

  // Settings
  const field = (label, value, type = 'text') => {
    add('label', label);
    const input = add('input');
    input.type = type;
    input.value = value;
    return input;
  };
  const every = field('Payday every how many days? (7, 14 or 30)', s.payEveryDays, 'number');
  const wList = field('Pay for each finished checklist ($)', (s.wages.list / 100).toFixed(2));
  const wRound = field('Pay for each practice round ($)', (s.wages.round / 100).toFixed(2));
  const wChallenge = field('Pay for the Challenge of the Day ($)', (s.wages.challenge / 100).toFixed(2));
  const interest = field('Savings interest each payday (%)', s.interestPercent, 'number');
  const tax = field('Paycheck tax (%), goes to a family treat fund', s.taxPercent, 'number');
  add('label', 'Monthly bills: one per line, as  emoji name | amount');
  const bills = add('textarea');
  bills.value = s.bills.map(([e, n, c]) => `${e} ${n} | ${(c / 100).toFixed(2)}`).join('\n');
  add('label', 'Extra jobs: one per line, as  emoji name | pay');
  const jobs = add('textarea');
  jobs.value = s.jobs.map(([e, n, c]) => `${e} ${n} | ${(c / 100).toFixed(2)}`).join('\n');

  const save = add('button', 'Save wallet settings');
  const status = add('div');
  save.addEventListener('click', () => {
    const cents = [wList, wRound, wChallenge].map(i => toCents(i.value));
    if (cents.includes(null)) { alert('Please type pay amounts like 0.10'); return; }
    money = {
      payEveryDays: Math.max(1, Number(every.value) || 14),
      wages: { list: cents[0], round: cents[1], challenge: cents[2] },
      interestPercent: Math.max(0, Number(interest.value) || 0),
      taxPercent: Math.max(0, Number(tax.value) || 0),
      bills: parseMoneyLines(bills.value),
      jobs: parseMoneyLines(jobs.value)
    };
    saveMoneySettings();
    status.textContent = '✅ Saved.';
  });

  const now = add('button', '📅 Run payday now');
  now.addEventListener('click', () => {
    if (!confirm('Run payday now? Bills are paid and take-home pay is figured out.')) return;
    runPayday(new Date());
    saveWallet();
    showParentWallet();
  });
}

// "📱 Cell phone | 3.00"  ->  ['📱', 'Cell phone', 300]
// ---------- Grown-up decisions (used by Grown-ups here AND by the online dashboard) ----------
function markPaidOut(cents) {
  if (!wallet || wallet.payoutDue <= 0) return;
  const amount = Math.min(cents, wallet.payoutDue);       // a newer payday may have added more since
  logMoney(`${parentName()} paid out ${dollars(amount)}`, 0);
  wallet.payoutDue -= amount;
  saveWallet();
}

function payJob(r) {
  if (!r || r.status !== 'waiting') return;
  r.status = 'paid';
  wallet.spend += r.cents;
  wallet.earnedThisPeriod += r.cents;
  logMoney(r.name, r.cents);
  saveWallet();
  if (r.catchUp && typeof leagueRecord === 'function') leagueRecord('catchup');    // 5 league points
  if (typeof showCatchUp === 'function') showCatchUp();
}

function declineJob(r) {
  if (!r || r.status !== 'waiting') return;
  r.status = 'declined';
  saveWallet();
}

function parseMoneyLines(text) {
  return text.split('\n').map(line => {
    const [left, right] = line.split('|');
    const cents = toCents(right || '');
    const label = (left || '').trim();
    if (!label || cents === null) return null;
    const space = label.indexOf(' ');
    return space === -1 ? ['💵', label, cents] : [label.slice(0, space), label.slice(space + 1).trim(), cents];
  }).filter(Boolean);
}
