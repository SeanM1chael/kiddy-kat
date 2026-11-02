// =====================================================================
// bills.js — 🧾 Bill tracker for grown-ups (eagle / career mode)
//   • Add weekly bills (every Friday) and monthly bills (every 15th).
//   • Mark each one paid. See what's overdue, due this week and this month.
//   • Reminders: an alert to this phone at about 9 AM on the day you pick
//     (on the due day, 1 day before or 3 days before).
// Privacy: bill amounts stay on THIS phone only (never sent online).
// Only the bill name and due date go online, so the reminder can be sent.
// The bill list is behind the parent PIN. The main-screen card only shows
// names and dates, no amounts.
// =====================================================================

const BILL_REMIND = [[0, 'On the due day'], [1, '1 day before'], [3, '3 days before'], [-1, 'No alert']];
const BILL_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let billsUnlocked = false;
let billEditing = null;          // id of the bill being edited, or 'new'

function billDayKey(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function billDate(key) { return new Date(key + 'T12:00'); }
function billAddDays(key, n) { const d = billDate(key); d.setDate(d.getDate() + n); return billDayKey(d); }
function billDaysBetween(from, to) { return Math.round((billDate(to) - billDate(from)) / 86400000); }
function billNice(key) { return billDate(key).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }); }
function billMoney(n) { return '$' + (Number(n) || 0).toFixed(2); }

function loadBills() {
  let b = null;
  try { b = JSON.parse(localStorage.getItem('kiddyKatBills') || 'null'); } catch (err) {}
  if (!b || !Array.isArray(b.list)) b = { list: [], paid: {} };
  if (!b.paid || typeof b.paid !== 'object') b.paid = {};
  return b;
}

function saveBills(b) {
  // Forget paid marks older than 3 months
  const old = billAddDays(billDayKey(), -92);
  Object.keys(b.paid).forEach(k => { if (k.split('|')[1] < old) delete b.paid[k]; });
  localStorage.setItem('kiddyKatBills', JSON.stringify(b));
  if (typeof cloudChanged === 'function' && localStorage.getItem('kiddyKatCloudToken')) cloudChanged();   // send the new reminder dates
}

// Every due date for a bill between two days (both included)
function billDueDates(bill, from, to) {
  const out = [];
  if (bill.start && bill.start > from) from = bill.start;
  if (from > to) return out;
  if (bill.every === 'week') {
    let k = from;
    const shift = (Number(bill.day) - billDate(k).getDay() + 7) % 7;
    k = billAddDays(k, shift);
    for (; k <= to; k = billAddDays(k, 7)) out.push(k);
  } else {
    const d = billDate(from);
    for (let y = d.getFullYear(), m = d.getMonth(); ; m++) {
      if (m > 11) { m = 0; y++; }
      const last = new Date(y, m + 1, 0).getDate();
      const k = billDayKey(new Date(y, m, Math.min(Number(bill.day) || 1, last)));   // the 31st → last day of short months
      if (k > to) break;
      if (k >= from) out.push(k);
    }
  }
  return out;
}

// Every bill due in a window, soonest first: { bill, due, paid }
function billsDue(from, to, b = loadBills()) {
  const rows = [];
  b.list.forEach(bill => billDueDates(bill, from, to).forEach(due =>
    rows.push({ bill: bill, due: due, paid: !!b.paid[bill.id + '|' + due] })));
  return rows.sort((x, y) => x.due.localeCompare(y.due) || x.bill.name.localeCompare(y.bill.name));
}

function billOverdue(b = loadBills()) {
  const today = billDayKey();
  return billsDue(billAddDays(today, -31), billAddDays(today, -1), b).filter(r => !r.paid && !r.bill.autopay);
}

function billWhen(due) {
  const n = billDaysBetween(billDayKey(), due);
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} late`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

function billHow(bill) {
  if (bill.every === 'week') return `Every ${BILL_WEEKDAYS[bill.day]}`;
  const d = Number(bill.day);
  const th = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th';
  return `Every month on the ${d}${th}`;
}

// What goes online for reminders: names, schedules and paid dates. No amounts or notes.
// The server works out the due dates itself, so reminders come even if the app isn't opened.
function billsForCloud() {
  const b = loadBills();
  const today = billDayKey();
  const late = b.lateAt === undefined ? '18:00' : b.lateAt;      // "still not paid" check time ('' = off)
  return b.list.filter(bill => bill.remind >= 0).slice(0, 30).map(bill => ({
    name: String(bill.name).slice(0, 30), every: bill.every, day: Number(bill.day), remind: bill.remind,
    start: bill.start || '', autopay: !!bill.autopay, late: late,
    paid: billDueDates(bill, billAddDays(today, -1), billAddDays(today, 10)).filter(d => b.paid[bill.id + '|' + d])
  }));
}

function setBillPaid(bill, due, paid) {
  const b = loadBills();
  const key = bill.id + '|' + due;
  if (paid) b.paid[key] = true; else delete b.paid[key];
  saveBills(b);
  // 💰 Pay-early game (money.js): points, streak and trophies for paying on time or early
  const bonus = typeof moneyBillPaid === 'function' ? moneyBillPaid(bill, due, paid) : '';
  if (paid && typeof careerToast === 'function') careerToast(bonus || `✅ ${bill.name} marked paid`);
  showBills();
  showBillsCard();
}

// ---------- 🧾 The card on the main screen (names and dates, no amounts) ----------
function showBillsCard() {
  const card = document.getElementById('billsCard');
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
  const b = loadBills();
  const today = billDayKey();
  const late = billOverdue(b);
  const week = billsDue(today, billAddDays(today, 6), b).filter(r => !r.paid);
  card.classList.toggle('billsAlert', late.length > 0 || week.some(r => r.due === today && !r.bill.autopay));

  const title = add(card, 'div', '🧾 Bills', 'careerTitle');
  title.appendChild(infoButton('Weekly and monthly bills with reminders. Amounts stay on this phone only and are behind your parent PIN. ' +
    'Reminders come at about 9 AM to this phone when alerts are on (⚙️ Grown-ups → 🔔).'));
  if (!b.list.length) add(card, 'div', 'Add your bills to get reminders before they\'re due.', 'billLine');
  if (late.length) add(card, 'div', `⚠️ ${late.length} overdue: ${late.map(r => r.bill.name).join(', ')}`, 'billLine billLate');
  week.slice(0, 4).forEach(r => add(card, 'div', `${r.due === today ? '🔔' : '📅'} ${r.bill.name}: ${r.due > billAddDays(today, 1) ? billNice(r.due) : billWhen(r.due)}${r.bill.autopay ? ' (autopay)' : ''}`,
    'billLine' + (r.due === today && !r.bill.autopay ? ' billToday' : '')));
  if (week.length > 4) add(card, 'div', `+${week.length - 4} more this week`, 'billLine');
  if (b.list.length && !week.length && !late.length) add(card, 'div', '✅ Nothing due in the next 7 days.', 'billLine');
  add(card, 'button', '🧾 My bills 🔒', 'careerOpen').addEventListener('click', openBills);
}

// ---------- 🧾 The bill list (behind the parent PIN) ----------
function openBills() {
  document.getElementById('bills').style.display = 'block';
  billsUnlocked = !localStorage.getItem('kiddyKatParentPin');      // no PIN set yet: open
  billEditing = null;
  showBills();
}

function closeBills() {
  document.getElementById('bills').style.display = 'none';
  billsUnlocked = false;
  showBillsCard();
}

function showBills() {
  const box = document.getElementById('billsBody');
  if (!box || document.getElementById('bills').style.display !== 'block') return;
  box.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };

  if (!billsUnlocked) {
    add(box, 'p', '🔒 Your bills are private. Type your parent PIN to open them.');
    const pin = add(box, 'input');
    pin.type = 'password';
    pin.inputMode = 'numeric';
    const go = add(box, 'button', 'Open', 'careerSave');
    const note = add(box, 'div', '', 'careerNote');
    go.addEventListener('click', () => {
      if (pin.value !== localStorage.getItem('kiddyKatParentPin')) { note.textContent = "That's not the right PIN."; pin.value = ''; return; }
      billsUnlocked = true;
      showBills();
    });
    return;
  }

  if (billEditing) { showBillForm(box, add); return; }

  const b = loadBills();
  const today = billDayKey();
  const now = billDate(today);
  const monthStart = billDayKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = billDayKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const weekEnd = billAddDays(today, 6);

  // 💵 Totals
  const month = billsDue(monthStart, monthEnd, b);
  const sum = rows => rows.reduce((n, r) => n + (Number(r.bill.amount) || 0), 0);
  const tot = add(box, 'div', undefined, 'careerSection');
  add(tot, 'h3', '💵 Totals');
  add(tot, 'div', `Next 7 days: ${billMoney(sum(billsDue(today, weekEnd, b).filter(r => !r.paid)))} still to pay`, 'careerNext');
  add(tot, 'div', `${now.toLocaleDateString([], { month: 'long' })}: ${billMoney(sum(month))} in bills · ${billMoney(sum(month.filter(r => r.paid)))} paid · ${billMoney(sum(month.filter(r => !r.paid)))} left`, 'careerNext');

  const row = (parent, r) => {
    const line = add(parent, 'div', undefined, 'billRow' + (r.paid ? ' billPaid' : ''));
    const text = add(line, 'div');
    add(text, 'div', `${r.bill.name} · ${billMoney(r.bill.amount)}`, 'careerItemName');
    add(text, 'div', `${r.paid ? '✅ Paid · ' : ''}${billNice(r.due)} (${billWhen(r.due)})${r.bill.autopay ? ' · autopay' : ''}`, 'careerItemRole');
    const btn = add(line, 'button', r.paid ? 'Undo' : '✓ Paid', r.paid ? 'careerDelete' : 'careerSave');
    btn.addEventListener('click', () => setBillPaid(r.bill, r.due, !r.paid));
  };

  // ⚠️ Overdue
  const late = billOverdue(b);
  if (late.length) {
    const sec = add(box, 'div', undefined, 'careerSection');
    add(sec, 'h3', '⚠️ Overdue');
    late.forEach(r => row(sec, r));
  }

  // 📅 Coming up (next 30 days), plus this month's paid ones
  const soon = billsDue(today, billAddDays(today, 30), b);
  const sec = add(box, 'div', undefined, 'careerSection');
  add(sec, 'h3', '📅 Coming up (next 30 days)');
  if (!soon.length) add(sec, 'div', b.list.length ? 'Nothing due.' : 'No bills yet. Add one below.', 'careerNote');
  soon.forEach(r => row(sec, r));

  // 🧾 All bills
  const all = add(box, 'div', undefined, 'careerSection');
  add(all, 'h3', `🧾 My bills (${b.list.length})`);
  b.list.slice().sort((x, y) => x.name.localeCompare(y.name)).forEach(bill => {
    const item = add(all, 'div', undefined, 'careerItem');
    add(item, 'div', `${bill.name} · ${billMoney(bill.amount)}`, 'careerItemName');
    const remind = (BILL_REMIND.find(x => x[0] === bill.remind) || BILL_REMIND[0])[1];
    add(item, 'div', `${billHow(bill)} · 🔔 ${remind}${bill.autopay ? ' · autopay' : ''}`, 'careerItemRole');
    if (bill.note) add(item, 'div', bill.note, 'careerNote');
    const buttons = add(item, 'div', undefined, 'careerItemButtons');
    add(buttons, 'button', '✏️ Edit', 'careerDelete').addEventListener('click', () => { billEditing = bill.id; showBills(); });
  });
  add(all, 'button', '➕ Add a bill', 'careerSave').addEventListener('click', () => { billEditing = 'new'; showBills(); });
  // ⚠️ Still-not-paid alert time
  const lateSec = add(box, 'div', undefined, 'careerSection');
  add(lateSec, 'h3', '⚠️ Not-paid alert');
  add(lateSec, 'div', 'On a due day, if a bill still isn\'t marked paid by this time, you get an alert. If it\'s still not paid the next morning, the 9 AM alert says it\'s overdue. Autopay bills are skipped.', 'careerNote');
  const lateAt = add(lateSec, 'select');
  [['', 'Off'], ['12:00', '12 PM'], ['15:00', '3 PM'], ['17:00', '5 PM'], ['18:00', '6 PM'], ['20:00', '8 PM']].forEach(([v, l]) => lateAt.add(new Option(l, v)));
  lateAt.value = b.lateAt === undefined ? '18:00' : b.lateAt;
  lateAt.addEventListener('change', () => {
    const fresh = loadBills();
    fresh.lateAt = lateAt.value;
    saveBills(fresh);
    if (typeof careerToast === 'function') careerToast(lateAt.value ? `⚠️ Not-paid alert at ${lateAt.options[lateAt.selectedIndex].text}` : '⚠️ Not-paid alert off');
  });

  add(box, 'div', '🔒 Amounts stay on this phone only. Only bill names and due dates go online, so reminders can reach you. ' +
                  'Reminders come at about 9 AM when alerts are on (⚙️ Grown-ups → 🔔).', 'careerNote');
}

function showBillForm(box, add) {
  const b = loadBills();
  const bill = b.list.find(x => x.id === billEditing) || { name: '', amount: '', every: 'month', day: new Date().getDate(), remind: 1, autopay: false, note: '' };
  const sec = add(box, 'div', undefined, 'careerSection');
  add(sec, 'h3', billEditing === 'new' ? '➕ New bill' : `✏️ ${bill.name}`);

  add(sec, 'label', 'Name (like Rent, Phone, Car)');
  const name = add(sec, 'input'); name.value = bill.name; name.maxLength = 30;
  add(sec, 'label', 'Amount ($)');
  const amount = add(sec, 'input'); amount.type = 'number'; amount.inputMode = 'decimal'; amount.step = '0.01'; amount.min = '0'; amount.value = bill.amount;
  add(sec, 'label', 'How often');
  const every = add(sec, 'select');
  every.add(new Option('Every month', 'month'));
  every.add(new Option('Every week', 'week'));
  every.value = bill.every;
  add(sec, 'label', 'Due on');
  const day = add(sec, 'select');
  const fillDays = keep => {
    day.textContent = '';
    if (every.value === 'week') BILL_WEEKDAYS.forEach((w, i) => day.add(new Option(w, i)));
    else for (let i = 1; i <= 31; i++) day.add(new Option(i === 31 ? '31st (or the last day)' : `${i}${i % 10 === 1 && i !== 11 ? 'st' : i % 10 === 2 && i !== 12 ? 'nd' : i % 10 === 3 && i !== 13 ? 'rd' : 'th'} of the month`, i));
    day.value = keep !== undefined ? keep : (every.value === 'week' ? new Date().getDay() : new Date().getDate());
  };
  fillDays(bill.day);
  every.addEventListener('change', () => fillDays());
  add(sec, 'label', '🔔 Reminder');
  const remind = add(sec, 'select');
  BILL_REMIND.forEach(([v, t]) => remind.add(new Option(t, v)));
  remind.value = bill.remind;
  const autoLine = add(sec, 'label', undefined, 'billCheck');
  const autopay = add(autoLine, 'input'); autopay.type = 'checkbox'; autopay.checked = !!bill.autopay;
  add(autoLine, 'span', 'Autopay (still reminds you, but never shows as overdue)');
  add(sec, 'label', 'Note (optional, like the website or account nickname)');
  const note = add(sec, 'input'); note.value = bill.note || ''; note.maxLength = 80;
  const msg = add(sec, 'div', '', 'careerNote');

  const buttons = add(sec, 'div', undefined, 'careerItemButtons');
  add(buttons, 'button', '💾 Save', 'careerSave').addEventListener('click', () => {
    const n = name.value.trim();
    if (!n) { msg.textContent = 'Please type a name.'; return; }
    const saved = Object.assign(bill, {
      name: n, amount: Math.max(0, Math.round((parseFloat(amount.value) || 0) * 100) / 100), every: every.value,
      day: Number(day.value), remind: Number(remind.value), autopay: autopay.checked, note: note.value.trim()
    });
    if (billEditing === 'new') {
      saved.id = 'b' + Date.now().toString(36);
      saved.start = billDayKey();            // no "overdue" for dates before the bill was added
      b.list.push(saved);
    }
    saveBills(b);
    if (typeof careerToast === 'function') careerToast(`🧾 ${n} saved`);
    billEditing = null;
    showBills();
    showBillsCard();
  });
  add(buttons, 'button', 'Cancel', 'careerDelete').addEventListener('click', () => { billEditing = null; showBills(); });
  if (billEditing !== 'new') {
    add(buttons, 'button', '🗑️ Delete', 'careerDelete').addEventListener('click', () => {
      if (!confirm(`Delete ${bill.name}?`)) return;
      b.list = b.list.filter(x => x.id !== bill.id);
      Object.keys(b.paid).forEach(k => { if (k.startsWith(bill.id + '|')) delete b.paid[k]; });
      saveBills(b);
      billEditing = null;
      showBills();
      showBillsCard();
    });
  }
}
