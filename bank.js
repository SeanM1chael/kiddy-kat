// =====================================================================
// bank.js — 🏦 Kat Bank: real money skills, learned by doing
// • Savings jar: stars in savings are safe from shopping and earn weekly
//   interest (10% of the lowest balance that week, at least 1 ⭐, at most 20).
// • A savings goal with a progress bar.
// • Money lessons that match the kid's age, each ending with a 💡 life tip.
//   The first win of each lesson each day gives +1 ⭐ (inside the Arcade limit).
// Uses town.js helpers (townBody, townAdd, townPop, loadTown, saveTown).
// =====================================================================

const BANK_RATE = 0.10;          // per week (real banks pay about 4% a YEAR; this is a game)
const BANK_MAX_INTEREST = 20;

function bankWeekKey(d = new Date()) {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));          // back to Monday
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}
function bankOf(t) {
  if (!t.bank || typeof t.bank !== 'object') t.bank = {};
  const b = t.bank;
  if (typeof b.saved !== 'number') b.saved = 0;
  if (typeof b.low !== 'number') b.low = 0;
  if (!b.week) b.week = bankWeekKey();
  if (!Array.isArray(b.history)) b.history = [];
  return b;
}
function bankLog(b, kind, n) {
  b.history.push({ kind: kind, n: n, at: new Date().toISOString().slice(0, 10) });
  b.history = b.history.slice(-20);
}
// Interest for the stars that stayed in savings all last week. Returns how much was paid.
function bankPayInterest(t) {
  const b = bankOf(t);
  const now = bankWeekKey();
  if (b.week === now) return 0;
  let paid = 0;
  if (b.low >= 5) paid = Math.min(BANK_MAX_INTEREST, Math.max(1, Math.floor(b.low * BANK_RATE)));
  b.saved += paid;
  if (paid) { bankLog(b, 'interest', paid); b.interestTotal = (b.interestTotal || 0) + paid; }
  b.week = now;
  b.low = b.saved;
  return paid;
}
function bankNextInterest(b) { return b.low >= 5 ? Math.min(BANK_MAX_INTEREST, Math.max(1, Math.floor(b.low * BANK_RATE))) : 0; }

function bankDeposit(n) {
  if (typeof pet === 'undefined' || !pet || n <= 0 || pet.stars < n) return false;
  pet.stars -= n;
  if (typeof savePet === 'function') savePet();
  if (typeof showPet === 'function') showPet();
  const t = loadTown();
  bankPayInterest(t);
  const b = bankOf(t);
  b.saved += n;                                    // "low" doesn't go up: interest needs a whole week
  bankLog(b, 'in', n);
  saveTown(t);
  return true;
}
function bankWithdraw(n) {
  const t = loadTown();
  bankPayInterest(t);
  const b = bankOf(t);
  if (n <= 0 || b.saved < n) return false;
  b.saved -= n;
  b.low = Math.min(b.low, b.saved);
  bankLog(b, 'out', n);
  saveTown(t);
  if (typeof addStars === 'function') addStars(n);
  return true;
}

// Practice log for the dashboard: what life skills were practiced
function lifeSkillLog(skill, act) {
  const t = loadTown();
  if (!Array.isArray(t.skills)) t.skills = [];
  t.skills.push({ skill: skill, act: act, at: new Date().toISOString().slice(0, 10) });
  t.skills = t.skills.slice(-60);
  saveTown(t);
}

// ---------- The bank screen ----------
function showTownBank(message) {
  townView = 'bank';
  const t = loadTown();
  const paid = bankPayInterest(t);
  saveTown(t);
  const b = bankOf(t);
  const box = townBody('🏦 Kat Bank');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');

  const accounts = townAdd(box, 'div', undefined, 'bankAccounts');
  const wallet = townAdd(accounts, 'div', undefined, 'bankAccount');
  townAdd(wallet, 'div', '👛 Wallet', 'bankLabel');
  townAdd(wallet, 'div', `${townStars()} ⭐`, 'bankAmount bankWallet');
  townAdd(wallet, 'div', 'For spending', 'bankSmall');
  const jar = townAdd(accounts, 'div', undefined, 'bankAccount saving');
  townAdd(jar, 'div', '🐷 Savings', 'bankLabel');
  townAdd(jar, 'div', `${b.saved} ⭐`, 'bankAmount bankSaved');
  townAdd(jar, 'div', 'Safe from shopping', 'bankSmall');

  const moves = townAdd(box, 'div', undefined, 'bankMoves');
  [1, 5, 10].forEach(n => {
    const put = townAdd(moves, 'button', `➕ Save ${n}`, 'arcadeGo bankSave');
    put.disabled = townStars() < n;
    put.addEventListener('click', () => { if (bankDeposit(n)) { townFly('⭐', put, document.querySelector('.bankSaved')); showTownBank(`🐷 You saved ${n} ⭐!`); } });
  });
  [1, 5, 10].forEach(n => {
    const take = townAdd(moves, 'button', `➖ Take out ${n}`, 'arcadeSmall bankTake');
    take.disabled = b.saved < n;
    take.addEventListener('click', () => { if (bankWithdraw(n)) showTownBank(`👛 You took out ${n} ⭐. They're in your wallet now.`); });
  });

  const next = bankNextInterest(b);
  townAdd(box, 'div', next
    ? `📈 Interest day is Monday. If you keep at least ${b.low} ⭐ saved until then, the bank pays you ${next} ⭐!`
    : '📈 Save at least 5 ⭐ and leave them all week. On Monday the bank pays you interest!', 'arcadeHint bankInterest');
  townAdd(box, 'div', '💡 Interest is the bank paying YOU to keep your money there. Real banks pay about 4% a year.', 'bankTip');

  // 💵 Real money: the wallet for real dollars (allowance, paydays)
  if (typeof openWallet === 'function') {
    townAdd(box, 'h3', '💵 My real money', 'fgHead');
    townAdd(box, 'div', 'Stars are for Kat Town. Your real dollars from finishing lists live in your wallet.', 'arcadeHint');
    townAdd(box, 'button', '💵 Open my wallet', 'arcadeGo bankRealMoney').addEventListener('click', () => townGoTo('openWallet', 'bank'));
  }

  // Savings goal
  townAdd(box, 'h3', '🎯 My savings goal', 'fgHead');
  if (b.goal) {
    const pct = Math.min(100, Math.round(b.saved / b.goal.stars * 100));
    townAdd(box, 'div', `${b.goal.emoji || '⭐'} ${b.goal.name}: ${b.saved} of ${b.goal.stars} ⭐`, 'bankGoalName');
    const bar = townAdd(box, 'div', undefined, 'bankBar');
    townAdd(bar, 'div', '', 'bankBarFill').style.width = pct + '%';
    if (pct >= 100) townAdd(box, 'div', `🎉 You reached your goal by saving! Tell ${typeof parentName === 'function' ? parentName() : 'your grown-up'}.`, 'arcadeMessage');
    else townAdd(box, 'div', `${b.goal.stars - b.saved} ⭐ to go.` + (next ? ` Interest will help!` : ''), 'arcadeHint');
    townAdd(box, 'button', 'Change goal', 'arcadeSmall').addEventListener('click', () => { const f = loadTown(); bankOf(f).goal = null; saveTown(f); showTownBank(); });
  } else {
    const row = townAdd(box, 'div', undefined, 'townWishAdd');
    const name = townAdd(row, 'input');
    name.placeholder = 'Saving for... (like "new sneakers")';
    name.maxLength = 30;
    name.className = 'bankGoalInput';
    const stars = townAdd(row, 'input');
    stars.type = 'number'; stars.min = '5'; stars.max = '999'; stars.value = '50'; stars.style.width = '70px';
    stars.className = 'bankGoalStars';
    townAdd(row, 'button', '🎯 Set', 'arcadeSmall').addEventListener('click', () => {
      const n = Math.round(Number(stars.value));
      if (!name.value.trim() || !(n >= 5 && n <= 999)) return;
      const f = loadTown();
      bankOf(f).goal = { name: name.value.trim(), stars: n, emoji: '🎯' };
      saveTown(f);
      lifeSkillLog('money', 'goal');
      showTownBank('🎯 Goal set! Saving a little at a time adds up.');
    });
  }

  // Money lessons for this age
  townAdd(box, 'h3', '🎓 Money lessons', 'fgHead');
  townAdd(box, 'div', 'First win of each lesson today = +1 ⭐', 'arcadeHint');
  const lessons = townAdd(box, 'div', undefined, 'bankLessons');
  bankLessonsFor().forEach(id => {
    const L = BANK_LESSONS[id];
    const done = bankWonToday(id);
    townAdd(lessons, 'button', `${L.emoji} ${L.name}${done ? ' ✅' : ''}`, 'bankLesson').addEventListener('click', () => openBankLesson(id));
  });

  if (paid) setTimeout(() => townPop('📈', `It's interest day! The bank paid you ${paid} ⭐ for keeping your stars saved. That's money you earned just by waiting!`, [['🤑 Yay!', null]], 'townBounceIn'), 300);
}

// ---------- Lessons ----------
const BANK_LESSONS = {
  coins: { emoji: '🪙', name: 'Coin counter', ages: ['kitten'], start: bankCoins },
  needs: { emoji: '🛒', name: 'Needs or wants?', ages: ['kitten', 'tiger', 'lion'], start: bankNeeds },
  deal: { emoji: '🏷️', name: 'The better deal', ages: ['tiger', 'lion'], start: bankDeal },
  interest: { emoji: '📈', name: 'Interest math', ages: ['tiger'], start: bankInterestMath },
  paycheck: { emoji: '💵', name: 'My first paycheck', ages: ['lion'], start: bankPaycheck },
  budget: { emoji: '📊', name: 'Budget 50/30/20', ages: ['lion'], start: bankBudget }
};
function bankAge() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }
function bankLessonsFor() { return Object.keys(BANK_LESSONS).filter(id => BANK_LESSONS[id].ages.includes(bankAge())); }
function bankWonToday(id) {
  const t = loadTown();
  return !!(t.lessonWins && t.lessonWins.date === new Date().toDateString() && t.lessonWins.won.includes(id));
}

function openBankLesson(id) {
  const L = BANK_LESSONS[id];
  townView = 'bank:' + id;
  const box = townBody(`${L.emoji} ${L.name}`);
  townAdd(box, 'button', '← Kat Bank', 'arcadeBack').addEventListener('click', () => showTownBank());
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const area = townAdd(box, 'div', undefined, 'toyArea bankArea bank-' + id);
  L.start(area, say);
}

function bankLessonWin(id, text, tip) {
  const t = loadTown();
  const today = new Date().toDateString();
  if (!t.lessonWins || t.lessonWins.date !== today) t.lessonWins = { date: today, won: [] };
  let note = '';
  if (!t.lessonWins.won.includes(id)) {
    t.lessonWins.won.push(id);
    saveTown(t);
    const given = typeof arcadeStars === 'function' ? arcadeStars(1) : 0;
    note = given ? ' +1 ⭐' : ' (Arcade stars are maxed for today.)';
  } else saveTown(t);
  lifeSkillLog('money', id);
  townPop(BANK_LESSONS[id].emoji, `🎉 ${text}${note}\n\n💡 ${tip}`, [['🔁 Again', () => openBankLesson(id)], ['🏦 Kat Bank', () => showTownBank()]], 'townBounceIn');
}
function bankLessonRetry(id, text, tip) {
  townPop('💪', `${text}\n\n💡 ${tip}`, [['🔁 Try again', () => openBankLesson(id)], ['🏦 Kat Bank', () => showTownBank()]], 'townBounceIn');
}

// A run of multiple-choice rounds. rounds: [{ show(area), options: [text], answer, why }]
// finish(right, total): optional; other places (like 🛡️ Safety HQ) use it to show their own win screen
function bankRounds(id, area, say, rounds, pass, winText, tip, finish) {
  let r = 0, right = 0;
  const q = townAdd(area, 'div', undefined, 'bankQuestion');
  const opts = townAdd(area, 'div', undefined, 'bankOptions');
  const why = townAdd(area, 'div', '', 'bankWhy');
  const next = townAdd(area, 'button', 'Next ➡️', 'arcadeGo bankNext');
  next.style.display = 'none';
  const show = () => {
    const round = rounds[r];
    q.textContent = '';
    round.show(q);
    const readQuestion = () => `${q.textContent}. ${round.options.join('. Or, ')}.`;
    if (typeof kkSpeakButton === 'function') { kkSpeakButton(q, readQuestion, 'Read the question'); kkAutoSpeak(readQuestion()); }
    opts.textContent = '';
    why.textContent = '';
    next.style.display = 'none';
    say.textContent = `Question ${r + 1} of ${rounds.length} · ✅ ${right}`;
    round.options.forEach((text, i) => {
      const b = townAdd(opts, 'button', text, 'bankOption');
      b.dataset.i = i;
      b.addEventListener('click', () => {
        if (opts.dataset.done === '1') return;
        opts.dataset.done = '1';
        const ok = i === round.answer;
        if (ok) right++;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) opts.children[round.answer].classList.add('right');
        why.textContent = (ok ? '✅ ' : '❌ ') + round.why;
        if (typeof kkAutoSpeak === 'function') kkAutoSpeak((ok ? 'Right! ' : 'Not quite. ') + round.why);
        if (typeof kkSpeakButton === 'function') kkSpeakButton(why, () => why.textContent, 'Read why');
        say.textContent = `Question ${r + 1} of ${rounds.length} · ✅ ${right}`;
        next.style.display = '';
      });
    });
    opts.dataset.done = '0';
  };
  next.addEventListener('click', () => {
    r++;
    if (r < rounds.length) { show(); return; }
    if (finish) { finish(right, rounds.length); return; }
    if (right >= pass) bankLessonWin(id, `${right} of ${rounds.length} right! ${winText}`, tip);
    else bankLessonRetry(id, `${right} of ${rounds.length}. You need ${pass} to win.`, tip);
  });
  window.bankRoundAnswer = () => rounds[r] && rounds[r].answer;       // for the tests
  show();
}
function bankPick(list, n) { return toyShuffle(list).slice(0, n); }

// 🪙 Coin counter (kitten): tap coins to make the exact amount
const BANK_COINS = [[1, '🟤', 'penny'], [5, '⚪', 'nickel'], [10, '🔘', 'dime'], [25, '🪙', 'quarter']];
function bankCoins(area, say) {
  const targets = bankPick([7, 11, 15, 20, 26, 30, 35, 41, 50, 52, 60, 75], 3);
  let round = 0, total = 0;
  const goal = townAdd(area, 'div', '', 'toyTarget');
  const jar = townAdd(area, 'div', '', 'bankJar');
  const row = townAdd(area, 'div', undefined, 'toyGrid2');
  const show = () => {
    goal.textContent = `Make ${targets[round]}¢`;
    if (total === 0 && typeof kkAutoSpeak === 'function') kkAutoSpeak(`Make ${targets[round]} cents`);
    jar.textContent = `🫙 ${total}¢`;
    say.textContent = `Round ${round + 1} of ${targets.length}`;
  };
  BANK_COINS.forEach(([cents, emoji, name]) => {
    const b = townAdd(row, 'button', `${emoji} ${name}\n${cents}¢`, 'bankCoin');
    b.dataset.cents = cents;
    b.addEventListener('click', () => {
      total += cents;
      show();
      if (total === targets[round]) {
        round++;
        total = 0;
        if (round >= targets.length) {
          bankLessonWin('coins', 'You counted every amount!', 'Start with the biggest coins that fit, then fill in with smaller ones. That\'s how cashiers make change fast!');
          return;
        }
        say.textContent = '✅ Exactly right!';
        setTimeout(show, 700);
      } else if (total > targets[round]) {
        say.textContent = `Too much! That's ${total}¢. Start over.`;
        total = 0;
        setTimeout(show, 900);
      }
    });
  });
  window.bankCoinTarget = () => targets[round] - total;              // for the tests
  show();
}

// 🛒 Needs or wants
const BANK_NEEDS = [['🍎', 'Healthy food'], ['🧥', 'A winter coat'], ['💧', 'Clean water'], ['🏠', 'A place to live'], ['💊', 'Medicine when you\'re sick'],
                    ['🪥', 'A toothbrush'], ['📚', 'School supplies'], ['🛏️', 'A bed'], ['👟', 'Shoes that fit'], ['💡', 'Electricity bill']];
const BANK_WANTS = [['🎮', 'A new video game'], ['🍭', 'Candy'], ['🧸', 'Another toy'], ['📱', 'The newest phone'], ['👟', 'Designer sneakers'],
                    ['🍦', 'Ice cream'], ['🎢', 'A theme park trip'], ['💎', 'Jewelry'], ['🎧', 'Fancy headphones'], ['🍕', 'Pizza delivery']];
function bankNeeds(area, say) {
  const items = toyShuffle([...bankPick(BANK_NEEDS, 4).map(i => [...i, 0]), ...bankPick(BANK_WANTS, 4).map(i => [...i, 1])]);
  const rounds = items.map(([emoji, name, kind]) => ({
    show: q => { townAdd(q, 'div', emoji, 'bankBigEmoji'); townAdd(q, 'div', name, 'bankItemName'); },
    options: ['✅ Need', '💭 Want'],
    answer: kind,
    why: kind === 0 ? `${name}: you need it to be healthy, safe or ready for school.` : `${name}: fun to have, but you'd be OK without it.`
  }));
  bankRounds('needs', area, say, rounds, 7, 'You know your needs from your wants.', 'Pay for needs first. Wants are fine once the needs are covered!');
}

// 🏷️ The better deal: compare unit prices
const BANK_DEAL_THINGS = [['🧃', 'juice boxes'], ['🍪', 'cookies'], ['✏️', 'pencils'], ['🧻', 'paper towel rolls'], ['🍫', 'granola bars'], ['🧦', 'pairs of socks']];
function bankDeal(area, say) {
  const rounds = bankPick(BANK_DEAL_THINGS, 5).map(([emoji, thing]) => {
    let a, b;
    do {
      a = { n: 2 + Math.floor(Math.random() * 5), each: 1 + Math.floor(Math.random() * 4) };
      b = { n: a.n + 1 + Math.floor(Math.random() * 6), each: 1 + Math.floor(Math.random() * 4) };
    } while (a.each === b.each);
    const pa = a.n * a.each, pb = b.n * b.each;
    const better = a.each < b.each ? 0 : 1;
    return {
      show: q => { townAdd(q, 'div', `${emoji} Which is the better deal?`, 'bankItemName'); },
      options: [`${a.n} ${thing} for ${pa} ⭐`, `${b.n} ${thing} for ${pb} ⭐`],
      answer: better,
      why: `${pa} ÷ ${a.n} = ${a.each} ⭐ each, and ${pb} ÷ ${b.n} = ${b.each} ⭐ each. ${better === 0 ? 'The first' : 'The second'} costs less for each one.`
    };
  });
  bankRounds('deal', area, say, rounds, 4, 'You found the better deals!', 'Divide the price by how many you get. That\'s the unit price, and stores print it on the shelf tag!');
}

// 📈 Interest math (tiger)
function bankInterestMath(area, say) {
  const rounds = bankPick([10, 20, 30, 40, 50, 60, 80, 100], 4).map(saved => {
    const right = saved + saved / 10;
    const options = toyShuffle([right, saved + 10, saved + 1].filter((v, i, a) => a.indexOf(v) === i));
    while (options.length < 3) options.push(right + options.length * 2);
    return {
      show: q => { townAdd(q, 'div', `🐷 You save ${saved} ⭐. The bank pays 10% interest. How many do you have after one week?`, 'bankItemName'); },
      options: options.map(o => `${o} ⭐`),
      answer: options.indexOf(right),
      why: `10% of ${saved} is ${saved / 10} (move the decimal one spot). ${saved} + ${saved / 10} = ${right} ⭐.`
    };
  });
  bankRounds('interest', area, say, rounds, 3, 'You can do interest math!', 'To find 10%, divide by 10. The longer you save, the more interest you earn on your interest. That\'s called compound interest!');
}

// 💵 My first paycheck (lion): gross vs net, with taxes taken out
const BANK_JOBS = [['☕', 'Café barista'], ['🛒', 'Grocery cashier'], ['🏊', 'Lifeguard'], ['🐶', 'Dog walker'], ['🍔', 'Burger cook'], ['👕', 'Store clerk']];
function bankPaycheck(area, say) {
  const money = n => '$' + n.toFixed(2);
  const rounds = bankPick(BANK_JOBS, 3).map(([emoji, job]) => {
    const wage = [12, 14, 15, 16, 18][Math.floor(Math.random() * 5)];
    const hours = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
    const gross = wage * hours;
    const lines = [['Federal income tax (10%)', gross * 0.10], ['Social Security (6.2%)', gross * 0.062], ['Medicare (1.45%)', gross * 0.0145], ['State tax (3%)', gross * 0.03]];
    const taxes = Math.round(lines.reduce((s, l) => s + l[1], 0) * 100) / 100;
    const net = Math.round((gross - taxes) * 100) / 100;
    const options = toyShuffle([net, gross, Math.round((gross - gross * 0.10) * 100) / 100]);
    return {
      show: q => {
        townAdd(q, 'div', `${emoji} ${job}: ${money(wage)} an hour × ${hours} hours`, 'bankItemName');
        const stub = townAdd(q, 'div', undefined, 'bankStub');
        townAdd(stub, 'div', `Gross pay: ${money(gross)}`, 'bankStubGross');
        lines.forEach(([name, amt]) => townAdd(stub, 'div', `− ${name}: ${money(amt)}`));
        townAdd(stub, 'div', 'Take-home (net) pay: ?', 'bankStubNet');
      },
      options: options.map(money),
      answer: options.indexOf(net),
      why: `${money(gross)} − ${money(taxes)} in taxes = ${money(net)}. That's what lands in your bank account.`
    };
  });
  bankRounds('paycheck', area, say, rounds, 2, 'You can read a pay stub!', 'Your take-home (net) pay is smaller than wage × hours (gross). Always plan your budget with the net number. Social Security and Medicare help pay for retirement and health care later.');
}

// 📊 Budget 50/30/20 (lion): sort what you spend on
const BANK_BUDGET = [['🏠', 'Rent', 0], ['🛒', 'Groceries', 0], ['🚗', 'Car insurance', 0], ['💡', 'Electric bill', 0], ['📱', 'Phone bill', 0],
                     ['🎬', 'Streaming apps', 1], ['🎤', 'Concert tickets', 1], ['🍣', 'Eating out', 1], ['👗', 'New outfit for fun', 1],
                     ['🆘', 'Emergency fund', 2], ['👵', 'Retirement account', 2], ['🎓', 'Saving for college', 2]];
function bankBudget(area, say) {
  const items = toyShuffle([...bankPick(BANK_BUDGET.filter(i => i[2] === 0), 3), ...bankPick(BANK_BUDGET.filter(i => i[2] === 1), 3), ...bankPick(BANK_BUDGET.filter(i => i[2] === 2), 2)]);
  const names = ['🏠 Needs (50%)', '🎉 Wants (30%)', '🐷 Savings (20%)'];
  const rounds = items.map(([emoji, name, kind]) => ({
    show: q => { townAdd(q, 'div', emoji, 'bankBigEmoji'); townAdd(q, 'div', name, 'bankItemName'); },
    options: names,
    answer: kind,
    why: kind === 0 ? `${name} is a need: you have to pay it every month.` : kind === 1 ? `${name} is a want: fun, and it fits in your 30%.` : `${name} is savings: money for future you.`
  }));
  bankRounds('budget', area, say, rounds, 7, 'You can build a budget!', '50/30/20: half your take-home pay for needs, 30% for wants, 20% for savings. On $2,000 a month that\'s $1,000 / $600 / $400.');
}
