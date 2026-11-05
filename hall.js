// =====================================================================
// hall.js — 🏛️ Town Hall: how a community decides and shares
// 🗳️ Family vote: 3 projects a week, one vote per kid with a reason.
//    When everyone has voted, the winner is built in EVERY kid's town.
// 🏛️ Mayor for a day (tiger, lion): balance the town budget.
// 👩‍🚒 Community helpers (kitten) and 🧾 taxes lessons (tiger, lion).
// First win of each lesson each day = +1 ⭐ (inside the Arcade limit).
// Uses town.js, bank.js (bankRounds, bankPick, lifeSkillLog) and toys.js (toyShuffle).
// =====================================================================

// Projects on the ballot: id → [emoji, name, what it's for, what it says when tapped]
const HALL_PROJECTS = {
  park: ['🏞️', 'Town park', 'Picnics, frisbee and trails for everyone', 'A family picnic in the park! 🧺'],
  library: ['📖', 'Public library', 'Free books, computers and story time', 'Shhh... everyone is reading! 📚'],
  dogpark: ['🦮', 'Dog park', 'A safe place for dogs to run and play', 'Woof woof! Zoomies! 🐕'],
  skatepark: ['🛹', 'Skate park', 'Ramps for skateboards and scooters', 'Kickflip! 🛹'],
  garden: ['🥕', 'Community garden', 'Grow veggies and share them with neighbors', 'The tomatoes are ripe! 🍅'],
  splashpad: ['💦', 'Splash pad', 'Water fountains to cool off in summer', 'SPLASH! 💦'],
  zoo: ['🦒', 'Petting zoo', 'Meet goats, bunnies and a giraffe', 'The goat wants a snack! 🐐'],
  stage: ['🎭', 'Outdoor stage', 'Concerts, plays and movie nights', 'The show is starting! 🎶']
};
const HALL_REASONS = { everyone: '👨‍👩‍👧 Everyone can use it', nature: '🌳 It\'s good for nature', healthy: '💪 It keeps us healthy',
                       fun: '🎉 It\'s the most fun', learn: '📚 We can learn there' };

function hallAge() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }
function hallToken() { return typeof cloudGet === 'function' && typeof CLOUD !== 'undefined' ? cloudGet(CLOUD.token) : null; }

// Put each family-vote winner into my town (once), on a free lot
function hallBuildWinners(winners) {
  const t = loadTown();
  let added = [];
  (winners || []).forEach(w => {
    const id = 'c-' + w.choice;
    if (!HALL_PROJECTS[w.choice] || t.built.some(b => b.id === id)) return;
    const lot = townFreeLot(t);
    if (!lot) return;
    t.built.push({ lot: lot, id: id, name: '', community: true, fresh: true, at: new Date().toISOString().slice(0, 10) });
    added.push(w.choice);
  });
  if (added.length) saveTown(t);
  return added;
}

let hallBallot = null;

async function showTownHall(message) {
  townView = 'hall';
  const box = townBody('🏛️ Town Hall');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');

  // 🗳️ Family vote
  townAdd(box, 'h3', '🗳️ This week\'s family vote', 'fgHead');
  const voteBox = townAdd(box, 'div', undefined, 'hallVote');
  // 🎓 Lessons
  townAdd(box, 'h3', '🎓 Learn how a town works', 'fgHead');
  townAdd(box, 'div', 'First win of each one today = +1 ⭐', 'arcadeHint');
  const row = townAdd(box, 'div', undefined, 'bankLessons');
  const lessons = hallAge() === 'kitten' ? [['helpers', '👩‍🚒 Community helpers']] : [['mayor', '🏛️ Mayor for a day'], ['taxes', hallAge() === 'lion' ? '🧾 Taxes 101' : '🧾 Where do taxes go?']];
  lessons.forEach(([id, label]) => {
    const done = typeof kitchenWonToday === 'function' && kitchenWonToday('hall-' + id);
    townAdd(row, 'button', label + (done ? ' ✅' : ''), 'bankLesson hallLesson').addEventListener('click', () => openHallLesson(id));
  });
  townAdd(box, 'div', '💡 In a democracy, everyone gets one vote. The choice with the most votes wins, even when it wasn\'t yours. That\'s called majority rule.', 'bankTip');

  const token = hallToken();
  if (!token) { townAdd(voteBox, 'div', '☁️ This phone isn\'t in the online family yet, so it can\'t vote with your brothers and sisters. Ask a grown-up to set it up in ⚙️ Grown-ups.', 'arcadeHint'); return; }
  townAdd(voteBox, 'div', '⏳ Getting the ballot...', 'arcadeHint');
  const r = await cloudCall('town_ballot', { p_token: token });
  if (townView !== 'hall') return;
  hallDrawVote(voteBox, r);
}

function hallDrawVote(voteBox, r) {
  voteBox.textContent = '';
  if (!r || !r.ok) { townAdd(voteBox, 'div', '📡 ' + ((r && r.error) || 'Couldn\'t reach Town Hall. Try again soon.'), 'arcadeHint'); return; }
  hallBallot = r;
  const added = hallBuildWinners(r.winners);
  const counts = r.counts || {};
  const most = Math.max(0, ...Object.values(counts));
  if (r.final && r.winner) {
    const [emoji, name] = HALL_PROJECTS[r.winner];
    const tie = Object.values(counts).filter(n => n === most).length > 1;
    townAdd(voteBox, 'div', `🎉 The results are in! ${emoji} ${name} wins` + (added.includes(r.winner) ? ', and it\'s being built in everyone\'s town right now!' : '. Look for it in your town!'), 'arcadeMessage hallResult');
    if (tie) townAdd(voteBox, 'div', '⚖️ It was a tie, so the first choice on the ballot won. Next time, try talking it over first. That\'s called compromise!', 'arcadeHint');
  } else {
    townAdd(voteBox, 'div', r.mine
      ? `✅ You voted for ${HALL_PROJECTS[r.mine][0]} ${HALL_PROJECTS[r.mine][1]}. You can change your vote until everyone has voted.`
      : 'Pick the project you want for the whole family\'s town, and say why.', 'arcadeHint');
  }
  r.options.forEach(id => {
    const [emoji, name, what] = HALL_PROJECTS[id];
    const card = townAdd(voteBox, 'div', undefined, 'hallOption' + (r.mine === id ? ' mine' : '') + (r.final && r.winner === id ? ' winner' : ''));
    card.dataset.project = id;
    townAdd(card, 'div', emoji, 'hallEmoji');
    const info = townAdd(card, 'div', undefined, 'townJobInfo');
    townAdd(info, 'div', name, 'townJobName');
    townAdd(info, 'div', what, 'townJobGoal');
    const n = counts[id] || 0;
    townAdd(info, 'div', '🗳️'.repeat(n) + (n ? ` ${n} vote${n === 1 ? '' : 's'}` : 'No votes yet'), 'hallCount');
    if (!r.final) townAdd(card, 'button', r.mine === id ? '✅ My vote' : 'Vote', 'arcadeGo hallVoteBtn').addEventListener('click', () => hallPickReason(voteBox, id));
  });
  townAdd(voteBox, 'div', `👥 ${r.voted.length} of ${r.kids} kids voted` + (r.voted.length ? `: ${r.voted.join(', ')}` : '') + '.', 'arcadeHint hallVoted');
}

function hallPickReason(voteBox, id) {
  const [emoji, name] = HALL_PROJECTS[id];
  const pop = townPop(emoji, `Why should the town build the ${name}?`, []);
  const list = townAdd(pop.card, 'div', undefined, 'bankOptions hallReasons');
  Object.entries(HALL_REASONS).forEach(([key, text]) => {
    const b = townAdd(list, 'button', text, 'bankOption hallReason');
    b.dataset.reason = key;
    b.addEventListener('click', async () => {
      list.querySelectorAll('button').forEach(x => { x.disabled = true; });
      const r = await cloudCall('town_vote', { p_token: hallToken(), p_choice: id, p_reason: key });
      pop.box.remove();
      if (r && r.ok) {
        if (typeof lifeSkillLog === 'function') lifeSkillLog('community', 'vote');
        hallDrawVote(voteBox, r);
        if (!r.final) townToast(`🗳️ Vote counted: ${emoji} ${name}!`);
      } else townToast('⚠️ ' + ((r && r.error) || 'Couldn\'t send your vote. Try again.'));
    });
  });
  townAdd(pop.card, 'button', 'Cancel', 'arcadeSmall').addEventListener('click', () => pop.box.remove());
}

// ---------- Lessons ----------
function openHallLesson(id) {
  townView = 'hall:' + id;
  const titles = { helpers: '👩‍🚒 Community helpers', mayor: '🏛️ Mayor for a day', taxes: hallAge() === 'lion' ? '🧾 Taxes 101' : '🧾 Where do taxes go?' };
  const box = townBody(titles[id]);
  townAdd(box, 'button', '← Town Hall', 'arcadeBack').addEventListener('click', () => showTownHall());
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const area = townAdd(box, 'div', undefined, 'toyArea bankArea hall-' + id);
  if (id === 'mayor') { hallMayor(area, say); return; }
  const list = id === 'helpers' ? HALL_HELPERS : hallAge() === 'lion' ? HALL_TAXES_LION : HALL_TAXES_TIGER;
  const rounds = (typeof safetyChoices === 'function' ? safetyChoices : hallChoices)(list, 6);
  const tip = id === 'helpers' ? 'Lots of community helpers are paid with taxes: money everyone chips in, so the whole town gets help when they need it.'
    : hallAge() === 'lion' ? 'Taxes pay for schools, roads and safety. Voting decides how they\'re spent, so register to vote when you turn 18. Your vote is your say.'
      : 'Taxes are how a town shares the cost of things everyone uses. Voting is how people decide what to spend them on.';
  bankRounds('hall-' + id, area, say, rounds, 5, '', tip, (right, total) => {
    if (right >= 5) hallWin(id, `${right} of ${total} right!`, tip);
    else townPop('💪', `${right} of ${total}. You need 5 to win.\n\n💡 ${tip}`, [['🔁 Try again', () => openHallLesson(id)], ['🏛️ Town Hall', () => showTownHall()]], 'townBounceIn');
  });
}
function hallChoices(list, n) {
  return bankPick(list, n).map(([emoji, q, options, why]) => {
    const order = toyShuffle(options.map((text, i) => [text, i]));
    return { show: box => { townAdd(box, 'div', emoji, 'bankBigEmoji'); townAdd(box, 'div', q, 'bankItemName'); },
             options: order.map(o => o[0]), answer: order.findIndex(o => o[1] === 0), why: why };
  });
}

function hallWin(id, text, tip) {
  const key = 'hall-' + id;
  const t = loadTown();
  const today = new Date().toDateString();
  if (!t.lessonWins || t.lessonWins.date !== today) t.lessonWins = { date: today, won: [] };
  let note = '';
  if (!t.lessonWins.won.includes(key)) {
    t.lessonWins.won.push(key);
    saveTown(t);
    const given = typeof arcadeStars === 'function' ? arcadeStars(1) : 0;
    note = given ? ' +1 ⭐' : ' (Arcade stars are maxed for today.)';
  } else saveTown(t);
  if (typeof lifeSkillLog === 'function') lifeSkillLog('community', key);
  townPop('🏛️', `🎉 ${text}${note}\n\n💡 ${tip}`, [['🔁 Again', () => openHallLesson(id)], ['🏛️ Town Hall', () => showTownHall()]], 'townBounceIn');
}

// ---------- 🏛️ Mayor for a day: balance the budget ----------
// [id, emoji, name, needs at least (of 100), what it does, what goes wrong without enough]
const HALL_DEPTS = [
  ['safety', '🚒', 'Fire & police', 25, 'Keeps everyone safe', '🔥 A fire took too long to put out, because there weren\'t enough firefighters.'],
  ['schools', '🏫', 'Schools', 25, 'Teachers, books and buses', '📉 Classes got so crowded that kids couldn\'t get help.'],
  ['roads', '🛣️', 'Roads', 15, 'Fixes streets and stoplights', '🕳️ Potholes everywhere! Two cars got flat tires.'],
  ['trash', '🗑️', 'Trash pickup', 10, 'Trucks and recycling', '🪰 Trash piled up for a week and the whole town smelled!'],
  ['parks', '🏞️', 'Parks', 10, 'Playgrounds and trails', '🛝 The playground broke and had to close.'],
  ['library', '📚', 'Library', 5, 'Books, computers, story time', '📕 The library had to close on weekends.']
];
function hallMayor(area, say) {
  const lion = hallAge() === 'lion';
  const money = n => lion ? `$${n * 10}K` : `${n} 🪙`;
  const budget = 100;
  const plan = {};
  HALL_DEPTS.forEach(d => { plan[d[0]] = 10; });
  townAdd(area, 'div', lion ? 'You\'re the mayor! The town collected $1 million in taxes this year. Split it between the departments. A balanced budget spends exactly what you have.'
    : 'You\'re the mayor! The town collected 100 🪙 in taxes. Split them up. A balanced budget spends exactly 100.', 'toyLabel hallIntro');
  const head = townAdd(area, 'div', '', 'kitchenBudget hallLeft');
  const rows = townAdd(area, 'div', undefined, 'hallDepts');
  const left = () => budget - Object.values(plan).reduce((a, b) => a + b, 0);
  const draw = () => {
    const l = left();
    head.textContent = l === 0 ? `✅ Balanced! All ${money(budget)} is planned.` : l > 0 ? `💰 Left to spend: ${money(l)}` : `⚠️ Over budget by ${money(-l)}`;
    head.classList.toggle('over', l < 0);
    rows.textContent = '';
    HALL_DEPTS.forEach(([id, emoji, name, need, what]) => {
      const row = townAdd(rows, 'div', undefined, 'hallDept');
      row.dataset.dept = id;
      const info = townAdd(row, 'div', undefined, 'townJobInfo');
      townAdd(info, 'div', `${emoji} ${name}`, 'townJobName');
      townAdd(info, 'div', `${what} · needs at least ${money(need)}`, 'townJobGoal');
      townAdd(row, 'button', '−', 'arcadeSmall hallMinus').addEventListener('click', () => { plan[id] = Math.max(0, plan[id] - 5); draw(); });
      townAdd(row, 'div', money(plan[id]), 'hallAmount' + (plan[id] < need ? ' low' : ''));
      townAdd(row, 'button', '+', 'arcadeSmall hallPlus').addEventListener('click', () => { plan[id] += 5; draw(); });
    });
  };
  townAdd(area, 'button', '📜 Pass the budget', 'arcadeGo toyBig hallPass').addEventListener('click', () => {
    const l = left();
    if (l !== 0) { say.textContent = l > 0 ? `You still have ${money(l)} to plan. A balanced budget spends exactly what the town has.` : `You planned ${money(-l)} more than the town has! Cities can't spend money they don't have.`; return; }
    const problems = HALL_DEPTS.filter(d => plan[d[0]] < d[3]);
    if (problems.length) {
      townPop('📰', `📰 The year in review...\n\n${problems.map(d => d[5]).join('\n')}\n\nGive those departments what they need, then try again.`,
        [['🔁 Try again', () => openHallLesson('mayor')], ['🏛️ Town Hall', () => showTownHall()]], 'townBounceIn');
      return;
    }
    const extra = HALL_DEPTS.map(d => [d, plan[d[0]] - d[3]]).sort((a, b) => b[1] - a[1])[0];
    hallWin('mayor', `Great year, Mayor! Every department had enough, and the extra ${money(extra[1])} for ${extra[0][1]} ${extra[0][2]} made people happy.`,
      'Budgets are about choices: needs come first, and the extra goes to what voters care about most. That\'s why it matters who you elect!');
  });
  window.hallSet = (id, n) => { plan[id] = n; draw(); };          // for the tests
  window.hallPlan = () => Object.assign({}, plan);
  draw();
}

// ---------- Content: [emoji, question, [right answer first, ...wrong], why] ----------
const HALL_HELPERS = [
  ['🔥', 'There\'s a fire! Who comes to help?', ['Firefighters', 'The mail carrier', 'A baker'], 'Firefighters put out fires. Call 911 and get out!'],
  ['✉️', 'Who brings letters to your house?', ['The mail carrier', 'A doctor', 'A chef'], 'Mail carriers deliver letters and packages almost every day.'],
  ['🤒', 'You feel really sick. Who helps you get better?', ['A doctor or nurse', 'A bus driver', 'A librarian'], 'Doctors and nurses help sick people get well.'],
  ['📚', 'Who helps you find a great book?', ['A librarian', 'A firefighter', 'A farmer'], 'Librarians know where every book is, and library cards are free!'],
  ['🗑️', 'Who takes away the trash every week?', ['Sanitation workers', 'A teacher', 'A dentist'], 'Sanitation workers keep the town clean and healthy.'],
  ['🦷', 'Who checks your teeth?', ['A dentist', 'A pilot', 'A mail carrier'], 'Dentists keep your teeth healthy. Brush twice a day!'],
  ['🍎', 'Who grows the food we eat?', ['Farmers', 'A police officer', 'A lifeguard'], 'Farmers grow fruit, veggies and grain for everyone.'],
  ['🏫', 'Who helps you learn to read?', ['A teacher', 'A plumber', 'A baker'], 'Teachers help kids learn every school day.'],
  ['🚔', 'Who helps if someone is lost or in danger?', ['A police officer', 'A clown', 'A painter'], 'Police officers help keep people safe.']
];
const HALL_TAXES_TIGER = [
  ['🏫', 'Public schools, teachers and school buses are mostly paid for by...', ['Taxes that people pay', 'Ice cream sales', 'The kids'], 'Taxes from the whole community pay for public schools, so every kid can go.'],
  ['🛣️', 'Who pays to fix potholes on city streets?', ['The city, with tax money', 'Whoever drives over them', 'Nobody'], 'Cities use taxes to fix roads everyone drives on.'],
  ['🧾', 'You buy a $10 toy and pay $10.80. What was the extra 80¢?', ['Sales tax', 'A tip', 'A mistake'], 'Sales tax is added at the register. Here it was 8%.'],
  ['🗳️', 'Who decides how a city spends its tax money?', ['Leaders voters choose, like a mayor and city council', 'The richest person in town', 'Whoever asks first'], 'Voters elect leaders, and those leaders make the budget.'],
  ['🚒', 'Why do towns pay for fire stations with taxes?', ['So everyone gets help, even people who can\'t pay', 'So only rich people get help', 'They don\'t'], 'Shared services help everyone, which is the big idea behind taxes.'],
  ['🏞️', 'Which of these is usually paid for with taxes?', ['A public park', 'Your video games', 'Your birthday party'], 'Parks, libraries and playgrounds are shared, so they\'re paid for together.'],
  ['💵', 'When you get your first job, some of your pay goes to...', ['Taxes, before it reaches your bank', 'Your boss', 'Nobody, you keep it all'], 'Taxes come out of your paycheck first. Check out 💵 My first paycheck at Kat Bank someday!']
];
const HALL_TAXES_LION = [
  ['🧾', 'Headphones cost $40 and sales tax is 8%. What do you pay?', ['$43.20', '$48.00', '$40.80'], '8% of $40 is $3.20, so $40 + $3.20 = $43.20.'],
  ['🏠', 'Property tax (paid by homeowners, and by renters through their rent) mostly pays for...', ['Local schools, police and roads', 'Federal student loans', 'Streaming services'], 'That\'s why school quality and property taxes are linked in many towns.'],
  ['💵', 'US income tax is "progressive." That means...', ['Higher income is taxed at higher rates', 'Everyone pays the same dollar amount', 'Only students pay it'], 'Income is taxed in brackets. Each slice of income is taxed at its own rate.'],
  ['🗳️', 'A "ballot measure" is...', ['A question voters decide directly, like funding a new park', 'A ruler for measuring ballots', 'A poll about a TV show'], 'Ballot measures let voters decide things like school funding and new taxes themselves.'],
  ['🎂', 'At what age can US citizens vote in federal elections?', ['18', '16', '21'], 'The 26th Amendment set the voting age at 18 in 1971.'],
  ['📝', 'You\'ll turn 18 before the next election. What do you usually need to do first?', ['Register to vote (rules and deadlines vary by state)', 'Pay a voting fee', 'Get a job'], 'Look up your state\'s rules early. Some states even let you pre-register at 16 or 17.'],
  ['🧮', 'Every spring, people file a tax return to...', ['Figure out if they paid too much or too little tax during the year', 'Ask for a raise', 'Apply for college'], 'Paid too much? You get a refund. Too little? You owe the difference.']
];

// When Kat Town opens: quietly build any family-vote winners this phone doesn't have yet
async function hallSyncQuiet() {
  const token = hallToken();
  if (!token) return;
  const r = await cloudCall('town_ballot', { p_token: token });
  if (!r || !r.ok) return;
  const added = hallBuildWinners(r.winners);
  if (added.length && townView === 'map') {
    const [emoji, name] = HALL_PROJECTS[added[added.length - 1]];
    showTownMap(`🏛️ Your family voted, and a ${emoji} ${name} was just built in your town!`);
  }
}
