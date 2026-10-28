// =====================================================================
// catchup.js — catching up on missing schoolwork, a few a day
// A parent pastes the missing list (copied from the grades page).
// The kid sees a few at a time, oldest first, and taps each one when
// it's turned in. Each one asks a parent to check and pay (Wallet).
// =====================================================================

let catchUp = JSON.parse(localStorage.getItem('kiddyKatCatchUp') || 'null') || { items: [], perDay: 3, pay: 50 };

function saveCatchUp() {
  localStorage.setItem('kiddyKatCatchUp', JSON.stringify(catchUp));
}

// ---------- The kid's catch-up card ----------
function showCatchUp() {
  const card = document.getElementById('catchupCard');
  if (!card) return;
  const left = catchUp.items.filter(i => !i.done);
  if (left.length === 0) { card.style.display = 'none'; return; }

  card.style.display = 'block';
  card.textContent = '';
  const title = document.createElement('div');
  title.className = 'catchupTitle';
  title.textContent = `📚 Catch-up: ${left.length} to go · ${dollars(catchUp.pay)} each when ${parentName()} checks`;
  card.appendChild(title);

  left.slice(0, catchUp.perDay).forEach(item => {
    const button = document.createElement('button');
    button.className = 'catchupItem';
    button.textContent = `⬜ ${item.text}`;
    button.addEventListener('click', () => turnedIn(item));
    card.appendChild(button);
  });

  const waiting = wallet ? wallet.jobRequests.filter(r => r.catchUp && r.status === 'waiting').length : 0;
  if (waiting) {
    const note = document.createElement('div');
    note.className = 'catchupNote';
    note.textContent = `⏳ ${waiting} turned in, waiting for ${parentName()} to check`;
    card.appendChild(note);
  }
}

function turnedIn(item) {
  if (!confirm(`Did you turn in "${item.text}"?`)) return;
  item.done = true;
  item.doneDate = new Date().toLocaleDateString();
  saveCatchUp();

  // Ask a parent to check it and pay (shows in Grown-ups → Wallet)
  if (!wallet) wallet = freshWallet();
  wallet.jobRequests.push({ id: Date.now(), emoji: '📚', name: `Turned in: ${item.text}`, cents: catchUp.pay,
                            date: item.doneDate, status: 'waiting', catchUp: true });
  saveWallet();
  if (typeof kidAlert === 'function') kidAlert('catchup', item.text);         // alert the grown-ups

  const left = catchUp.items.filter(i => !i.done).length;
  showCatchUp();
  if (left === 0) celebrate('🎉 ALL CAUGHT UP! That is huge!', '🏆', true);
  else celebrate(`📚 Nice! ${left} to go. ${parentName()} will check it and pay ${dollars(catchUp.pay)}.`, '📚', false);
}

// ---------- Parent side (inside Grown-ups, behind the PIN) ----------
function showParentCatchUp() {
  const box = document.getElementById('parentCatchUp');
  if (!box) return;
  box.textContent = '';
  if (!parentUnlocked) {
    const p = document.createElement('p');
    p.textContent = '🔒 Unlock with your PIN to set up a catch-up list.';
    box.appendChild(p);
    return;
  }
  const add = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    box.appendChild(el);
    return el;
  };
  add('p', 'Paste the missing assignments here, one per line, oldest first. ' +
           'On the grades page, use "📋 Copy catch-up list".');
  const list = add('textarea');
  list.style.height = '140px';
  list.value = catchUp.items.filter(i => !i.done).map(i => i.text).join('\n');

  add('label', 'How many to show at a time');
  const perDay = add('input');
  perDay.type = 'number';
  perDay.value = catchUp.perDay;

  add('label', 'Pay for each one turned in ($)');
  const pay = add('input');
  pay.value = (catchUp.pay / 100).toFixed(2);

  const save = add('button', 'Save catch-up list');
  const status = add('div');
  save.addEventListener('click', () => {
    const lines = list.value.split('\n').map(l => l.trim()).filter(l => l);
    const cents = toCents(pay.value);
    if (cents === null) { alert('Please type the pay like 0.50'); return; }
    const done = catchUp.items.filter(i => i.done);
    catchUp = {
      items: done.concat(lines.map((text, i) => ({ id: Date.now() + i, text: text, done: false }))),
      perDay: Math.max(1, Number(perDay.value) || 3),
      pay: cents
    };
    saveCatchUp();
    showCatchUp();
    status.textContent = `✅ Saved ${lines.length} to catch up on.`;
  });

  const finished = catchUp.items.filter(i => i.done);
  if (finished.length) add('p', `✅ Turned in so far: ${finished.length}. Approve the pay in 💵 Wallet (parents).`);
}
