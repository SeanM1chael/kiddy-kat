// =====================================================================
// rewards.js — real-life rewards kids buy with their stars
// Kid asks for a reward -> stars are held -> a parent approves with a PIN.
// If a parent says "not this time", the stars go back.
// {parent} in a reward name becomes what the kids call you (default "Dad").
// =====================================================================

// Money rewards (like "$15 shopping") now come from the Wallet's take-home pay,
// so these lists are just non-money treats and privileges.
// Rough star math: a kid who does all 3 lists, 3 game rounds and the
// challenge earns about 15-25 stars a day, or 100-150 a week.
const DEFAULT_REWARDS = {
  kitten: [
    ['📖', 'Extra bedtime story', 30],
    ['🎬', 'Pick the family movie', 60],
    ['🛝', 'Trip to the playground', 100],
    ['🍦', 'Ice cream date with {parent}', 120],
    ['🎨', 'Small toy or craft kit', 150],
    ['🎁', 'Favorite-character surprise', 250],
    ['🤸', 'Trampoline park trip', 300]
  ],
  tiger: [
    ['🎮', '30 extra minutes of gaming', 60],
    ['🌙', 'Stay up 30 minutes later (weekend)', 70],
    ['🍕', 'Pick dinner for the family', 80],
    ['🎮', '60 extra minutes of gaming', 110],
    ['🤝', 'One-on-one outing with {parent}', 300],
    ['🏎️', 'Go-karts or arcade outing', 400]
  ],
  // Grown-ups (career mode): treats you earn for yourself
  eagle: [
    ['☕', 'Fancy coffee out', 40],
    ['🎧', 'A new album, book or audiobook', 80],
    ['🎮', 'Guilt-free gaming night', 100],
    ['🛠️', 'A new dev tool or course', 200],
    ['🍽️', 'Dinner out', 250]
  ],
  lion: [
    ['☕', 'Starbucks or favorite food run', 100],
    ['🚗', 'Extra time out with friends', 150],
    ['🗓️', 'Choose a weekend activity', 200],
    ['🍽️', 'Pick the restaurant for family dinner', 250],
    ['🎬', 'Movie night with friends at home', 300]
  ]
};

// Special rewards every kid can work toward
const FAMILY_REWARDS = [
  ['🍝', "Chef's Choice: pick dinner AND dessert", 150],
  ['💛', '{parent} Date: one-on-one outing', 300],
  ['🎟️', 'Golden Ticket: choose a special weekend activity', 350],
  ['👑', 'Principal for a Day: make 3 family decisions', 400],
  ['⭐', 'VIP Weekend: movie, breakfast and an activity', 500]
];

let rewardList = JSON.parse(localStorage.getItem('kiddyKatRewards') || 'null');
let rewardRequests = JSON.parse(localStorage.getItem('kiddyKatRewardRequests') || '[]');
let parentUnlocked = false;   // unlocks with the PIN, locks again when Grown-ups closes

function saveRewards() {
  localStorage.setItem('kiddyKatRewardRequests', JSON.stringify(rewardRequests));
  if (rewardList) localStorage.setItem('kiddyKatRewards', JSON.stringify(rewardList));
}

function parentName() {
  return localStorage.getItem('kiddyKatParentName') || 'Dad';
}

// This kid's rewards: the parent's edited list, or the starting list for their age
function myRewards() {
  const list = rewardList || DEFAULT_REWARDS[animal.theme].concat(FAMILY_REWARDS);
  return list.map(([emoji, name, price]) => ({ emoji, name: name.replace('{parent}', parentName()), rawName: name, price }));
}

function myStars() {
  return pet ? pet.stars : 0;
}

// ---------- The kid's rewards screen ----------
function openRewards() {
  document.getElementById('rewards').style.display = 'block';
  showRewards();
}

function closeRewards() {
  document.getElementById('rewards').style.display = 'none';
  showGoal();
}

function showRewards() {
  document.getElementById('rewardStars').textContent = pet
    ? `You have ⭐ ${myStars()}`
    : 'Hatch a pet first to start earning stars!';

  // Waiting for a parent
  const waiting = document.getElementById('rewardWaiting');
  waiting.textContent = '';
  rewardRequests.filter(r => r.status === 'waiting').forEach(r => {
    const card = document.createElement('div');
    card.className = 'waitingCard';
    card.textContent = `⏳ ${r.emoji} ${r.name}: waiting for ${parentName()} to say yes. You get a message when ${parentName()} decides!`;
    const text = document.createElement('a');
    text.className = 'textParent';
    text.textContent = `📲 Text ${parentName()}`;
    const phone = localStorage.getItem('kiddyKatParentPhone') || '';
    const who = profile ? callName() : 'Your kid';
    text.href = `sms:${phone}&body=${encodeURIComponent(`${who} earned "${r.name}" in Kiddy Kat! ⭐ Please approve it in Grown-ups.`)}`;
    card.appendChild(text);
    waiting.appendChild(card);
  });

  // All rewards
  const goal = localStorage.getItem('kiddyKatGoal');
  const list = document.getElementById('rewardItems');
  list.textContent = '';
  myRewards().forEach(reward => {
    const card = document.createElement('div');
    card.className = 'rewardCard' + (goal === reward.rawName ? ' goal' : '');

    const title = document.createElement('div');
    title.className = 'rewardTitle';
    title.textContent = `${reward.emoji} ${reward.name}`;
    const price = document.createElement('div');
    price.className = 'rewardPrice';
    price.textContent = `⭐ ${reward.price}`;

    const bar = document.createElement('div');
    bar.className = 'rewardBar';
    const fill = document.createElement('div');
    fill.className = 'rewardBarFill';
    fill.style.width = Math.min(100, myStars() / reward.price * 100) + '%';
    bar.appendChild(fill);

    const buttons = document.createElement('div');
    const goalButton = document.createElement('button');
    goalButton.textContent = goal === reward.rawName ? '🎯 My goal' : '🎯 Save for this';
    goalButton.addEventListener('click', () => {
      localStorage.setItem('kiddyKatGoal', reward.rawName);
      showRewards();
    });
    const getButton = document.createElement('button');
    const short = reward.price - myStars();
    getButton.textContent = short > 0 ? `${short} more ⭐` : 'Get it! 🎉';
    getButton.disabled = short > 0 || !pet;
    getButton.addEventListener('click', () => requestReward(reward));
    buttons.append(goalButton, getButton);

    card.append(title, price, bar, buttons);
    list.appendChild(card);
  });

  // Recently approved
  const done = rewardRequests.filter(r => r.status === 'approved').slice(-5).reverse();
  document.getElementById('rewardHistory').textContent = done.length
    ? 'Recent rewards: ' + done.map(r => `${r.emoji} ${r.name}`).join(' · ')
    : '';
}

function requestReward(reward) {
  if (myStars() < reward.price) return;
  if (!confirm(`Spend ⭐ ${reward.price} on "${reward.name}"?`)) return;
  pet.stars -= reward.price;               // held until a parent decides
  savePet();
  rewardRequests.push({ id: Date.now(), emoji: reward.emoji, name: reward.name, price: reward.price,
                        date: new Date().toDateString(), status: 'waiting' });
  if (localStorage.getItem('kiddyKatGoal') === reward.rawName) localStorage.removeItem('kiddyKatGoal');
  saveRewards();
  if (typeof kidAlert === 'function') kidAlert('reward', reward.name);        // alert the grown-ups
  showPet();
  showRewards();
  celebrate(`⏳ Asked ${parentName()} for "${reward.name}"! You'll find out soon.`, reward.emoji, false);
}

// Goal line on the pet card
function showGoal() {
  const box = document.getElementById('petGoal');
  if (!box) return;
  const goalName = localStorage.getItem('kiddyKatGoal');
  const reward = goalName && myRewards().find(r => r.rawName === goalName);
  box.textContent = reward && pet
    ? `🎯 ${reward.emoji} ${reward.name}: ${Math.min(myStars(), reward.price)} / ${reward.price} ⭐`
    : '';
}

// ---------- Parent side (inside Grown-ups, behind a PIN) ----------
function showParentRewards() {
  const box = document.getElementById('parentRewards');
  box.textContent = '';
  const pin = localStorage.getItem('kiddyKatParentPin');
  const banner = document.getElementById('pinBanner');
  if (banner) banner.style.display = pin ? 'none' : 'block';

  if (!pin || !parentUnlocked) {
    const note = document.createElement('p');
    note.textContent = pin
      ? '🔒 Locked. Type your PIN and tap Unlock to approve rewards, edit the rewards list and prices, and add your phone number.'
      : 'Set a 4-digit parent PIN. Only grown-ups who know it can approve or change rewards.';
    const input = document.createElement('input');
    input.type = 'password';
    input.inputMode = 'numeric';
    input.maxLength = 4;
    input.placeholder = '4-digit PIN';
    const button = document.createElement('button');
    button.textContent = pin ? 'Unlock' : 'Set PIN';
    button.addEventListener('click', () => {
      if (!/^\d{4}$/.test(input.value)) { alert('Please use exactly 4 numbers.'); return; }
      if (!pin) localStorage.setItem('kiddyKatParentPin', input.value);
      else if (input.value !== pin) { alert('That PIN is not right.'); input.value = ''; return; }
      parentUnlocked = true;
      showParentRewards();
    });
    box.append(note, input, button);
    return;
  }

  // Waiting requests
  const waiting = rewardRequests.filter(r => r.status === 'waiting');
  const heading = document.createElement('h3');
  heading.textContent = waiting.length ? '⏳ Waiting for you' : '✅ No rewards waiting';
  box.appendChild(heading);
  waiting.forEach(r => {
    const row = document.createElement('div');
    row.className = 'parentRow';
    row.textContent = `${r.emoji} ${r.name} (⭐ ${r.price}, ${r.date}) `;
    const yes = document.createElement('button');
    yes.textContent = '✅ Approve';
    yes.addEventListener('click', () => decideReward(r, true));
    const no = document.createElement('button');
    no.textContent = '↩️ Not this time';
    no.addEventListener('click', () => decideReward(r, false));
    row.append(yes, no);
    box.appendChild(row);
  });

  // Money approved this month
  const month = new Date().getMonth(), year = new Date().getFullYear();
  const dollars = rewardRequests
    .filter(r => r.status === 'approved' && new Date(r.decided).getMonth() === month && new Date(r.decided).getFullYear() === year)
    .reduce((sum, r) => sum + (Number((r.name.match(/\$(\d+)/) || [])[1]) || 0), 0);
  const money = document.createElement('p');
  money.textContent = `💵 Money rewards approved this month: $${dollars}`;
  box.appendChild(money);

  // Settings
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'What do your kids call you?';
  const nameInput = document.createElement('input');
  nameInput.value = parentName();
  const phoneLabel = document.createElement('label');
  phoneLabel.textContent = 'Your phone number (for the "Text Dad" button, optional)';
  const phoneInput = document.createElement('input');
  phoneInput.type = 'tel';
  phoneInput.value = localStorage.getItem('kiddyKatParentPhone') || '';

  const listLabel = document.createElement('label');
  listLabel.textContent = 'Rewards: one per line, as  emoji name | stars';
  const listInput = document.createElement('textarea');
  listInput.style.height = '220px';
  listInput.value = (rewardList || DEFAULT_REWARDS[animal.theme].concat(FAMILY_REWARDS))
    .map(([emoji, name, price]) => `${emoji} ${name} | ${price}`).join('\n');

  const save = document.createElement('button');
  save.textContent = 'Save rewards';
  const status = document.createElement('div');
  save.addEventListener('click', () => {
    const parsed = parseRewardLines(listInput.value);
    if (parsed.length === 0) { alert('Add at least one reward, like:  🍦 Ice cream date | 120'); return; }
    rewardList = parsed;
    localStorage.setItem('kiddyKatParentName', nameInput.value.trim() || 'Dad');
    localStorage.setItem('kiddyKatParentPhone', phoneInput.value.trim());
    saveRewards();
    showGoal();
    status.textContent = `✅ Saved ${parsed.length} rewards.`;
  });

  const pinLabel = document.createElement('label');
  pinLabel.textContent = 'Change the parent PIN';
  const newPin = document.createElement('input');
  newPin.type = 'password';
  newPin.inputMode = 'numeric';
  newPin.maxLength = 4;
  newPin.placeholder = 'New 4-digit PIN';
  const pinButton = document.createElement('button');
  pinButton.textContent = 'Change PIN';
  pinButton.addEventListener('click', () => {
    if (!/^\d{4}$/.test(newPin.value)) { alert('Please use exactly 4 numbers.'); return; }
    localStorage.setItem('kiddyKatParentPin', newPin.value);
    newPin.value = '';
    status.textContent = '✅ PIN changed.';
  });

  const lock = document.createElement('button');
  lock.textContent = '🔒 Lock';
  lock.addEventListener('click', () => { parentUnlocked = false; showParentRewards(); });

  box.append(nameLabel, nameInput, phoneLabel, phoneInput, listLabel, listInput, save,
             pinLabel, newPin, pinButton, lock, status);
}

// "🍦 Ice cream date | 120"  ->  ['🍦', 'Ice cream date', 120]
function parseRewardLines(text) {
  return text.split('\n').map(line => {
    const [left, right] = line.split('|');
    const price = Number((right || '').trim());
    const label = (left || '').trim();
    if (!label || !Number.isInteger(price) || price <= 0) return null;
    const firstSpace = label.indexOf(' ');
    if (firstSpace === -1) return ['🎁', label, price];
    return [label.slice(0, firstSpace), label.slice(firstSpace + 1).trim(), price];
  }).filter(Boolean);
}

function decideReward(request, approved) {
  if (!request || request.status !== 'waiting') return;     // already decided
  request.status = approved ? 'approved' : 'returned';
  request.decided = new Date().toISOString();
  if (!approved && pet) {               // give the stars back
    pet.stars += request.price;
    savePet();
    showPet();
  }
  saveRewards();
  showParentRewards();
}
