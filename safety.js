// =====================================================================
// safety.js — 🛡️ Safety HQ: staying safe in real life and online
// Kittens: "Safe or not safe?" and "What would you do?" (strangers, fire, lost).
// Tigers: spot the scam message, build a strong password, online choices.
// Lions: phishing and real-world scams, passwords + 2-step login, digital footprint.
// First win of each lesson each day = +1 ⭐ (inside the Arcade limit), and every
// answer explains WHY, so the lesson sticks. Uses town.js, bank.js and toys.js helpers.
// =====================================================================

const SAFETY_LESSONS = {
  safeornot: { emoji: '🚦', name: 'Safe or not safe?', ages: ['kitten'] },
  whatif: { emoji: '🤔', name: 'What would you do?', ages: ['kitten', 'tiger'] },
  scam: { emoji: '🎣', name: 'Spot the scam', ages: ['tiger', 'lion'] },
  password: { emoji: '🔐', name: 'Password builder', ages: ['tiger', 'lion'] },
  footprint: { emoji: '👣', name: 'Privacy & digital footprint', ages: ['lion'] }
};

function safetyAge() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }
function safetyLessonsFor() { return Object.keys(SAFETY_LESSONS).filter(id => SAFETY_LESSONS[id].ages.includes(safetyAge())); }

function showTownSafety(message) {
  townView = 'safety';
  const box = townBody('🛡️ Safety HQ');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  townAdd(box, 'div', 'Train like a safety pro, in real life and online. First win of each lesson today = +1 ⭐', 'arcadeHint');
  const row = townAdd(box, 'div', undefined, 'bankLessons');
  safetyLessonsFor().forEach(id => {
    const L = SAFETY_LESSONS[id];
    const done = typeof kitchenWonToday === 'function' && kitchenWonToday('safety-' + id);
    townAdd(row, 'button', `${L.emoji} ${L.name}${done ? ' ✅' : ''}`, 'bankLesson safetyLesson').addEventListener('click', () => openSafetyLesson(id));
  });
  townAdd(box, 'div', '💡 If something online or in real life feels scary, weird or too good to be true: stop, and tell a grown-up you trust. You will never be in trouble for asking.', 'bankTip');
}

function openSafetyLesson(id) {
  const L = SAFETY_LESSONS[id];
  townView = 'safety:' + id;
  const box = townBody(`${L.emoji} ${L.name}`);
  townAdd(box, 'button', '← Safety HQ', 'arcadeBack').addEventListener('click', () => showTownSafety());
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const area = townAdd(box, 'div', undefined, 'toyArea bankArea safety-' + id);
  if (id === 'password') { safetyPassword(area, say); return; }
  const age = safetyAge();
  const sets = {
    safeornot: () => safetySorted(SAFETY_SAFE_OR_NOT, 8, ['✅ Safe', '🚫 Not safe']),
    whatif: () => safetyChoices(age === 'kitten' ? SAFETY_WHATIF_KITTEN : SAFETY_WHATIF_ONLINE, 5),
    scam: () => safetyMessages(age === 'lion' ? SAFETY_SCAMS_LION : SAFETY_SCAMS_TIGER, 4, 2),
    footprint: () => safetyChoices(SAFETY_FOOTPRINT, 5)
  };
  const rounds = sets[id]();
  const pass = rounds.length - 1;
  const tips = {
    safeornot: 'Helmets, seatbelts and asking a grown-up first keep you safe. Strangers, fire and medicine are grown-up jobs.',
    whatif: age === 'kitten' ? 'Learn your grown-up\'s phone number by heart, and have a family password that safe grown-ups know.'
      : 'Online, never share your password, address, school or pictures with people you haven\'t met in real life. Tell a grown-up if something feels off.',
    scam: age === 'lion' ? 'Scams rush you, ask you to pay first (gift cards, Zelle, Cash App), or link to a look-alike website. Stop, and go to the real app or call the real number yourself.'
      : 'Red flags: "FREE!", hurry up, asking for your password, a strange link, or moving to a secret chat. When in doubt, don\'t click. Ask a grown-up.',
    footprint: 'Anything you post can be screenshotted and found years later by colleges and bosses. Post like your future self is watching.'
  };
  bankRounds('safety-' + id, area, say, rounds, pass, '', tips[id], (right, total) => {
    if (right >= pass) safetyWin(id, `${right} of ${total} right! You'd make a great safety pro.`, tips[id]);
    else townPop('💪', `${right} of ${total}. You need ${pass} to win.\n\n💡 ${tips[id]}`, [['🔁 Try again', () => openSafetyLesson(id)], ['🛡️ Safety HQ', () => showTownSafety()]], 'townBounceIn');
  });
}

function safetyWin(id, text, tip) {
  const key = 'safety-' + id;
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
  if (typeof lifeSkillLog === 'function') lifeSkillLog('safety', key);
  townPop(SAFETY_LESSONS[id].emoji, `🎉 ${text}${note}\n\n💡 ${tip}`, [['🔁 Again', () => openSafetyLesson(id)], ['🛡️ Safety HQ', () => showTownSafety()]], 'townBounceIn');
}

// ---------- Round builders (they feed bankRounds in bank.js) ----------
function safetySorted(list, n, labels) {
  return bankPick(list, n).map(([emoji, text, kind, why]) => ({
    show: q => { townAdd(q, 'div', emoji, 'bankBigEmoji'); townAdd(q, 'div', text, 'bankItemName'); },
    options: labels, answer: kind, why: why
  }));
}
function safetyChoices(list, n) {
  return bankPick(list, n).map(([emoji, q, options, why]) => {
    const order = toyShuffle(options.map((text, i) => [text, i]));
    return {
      show: box => { townAdd(box, 'div', emoji, 'bankBigEmoji'); townAdd(box, 'div', q, 'bankItemName safetyQ'); },
      options: order.map(o => o[0]), answer: order.findIndex(o => o[1] === 0), why: why
    };
  });
}
function safetyMessages(list, scams, safe) {
  const picked = toyShuffle([...bankPick(list.filter(m => m.scam), scams), ...bankPick(list.filter(m => !m.scam), safe)]);
  return picked.map(m => ({
    show: q => {
      townAdd(q, 'div', 'Is this message a scam?', 'toyLabel');
      const phone = townAdd(q, 'div', undefined, 'safetyPhone');
      townAdd(phone, 'div', m.from, 'safetyFrom');
      townAdd(phone, 'div', m.text, 'safetyBubble');
    },
    options: ['🚩 Scam', '✅ Safe'], answer: m.scam ? 0 : 1, why: m.why
  }));
}

// ---------- 🔐 Password builder ----------
const SAFETY_WORDS = ['Purple', 'Taco', 'Rocket', 'Giraffe', 'Thunder', 'Pickle', 'Galaxy', 'Waffle', 'Cactus', 'Banjo', 'Volcano', 'Penguin'];
function safetyStrength(parts) {
  const pw = parts.map(p => p.text).join('');
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(pw)).length;
  const trap = parts.find(p => p.trap);
  if (trap) return { level: 0, name: 'Weak', crack: 'in seconds', why: `"${trap.text}" is easy to guess. ${trap.trap}` };
  if (pw.length < 8) return { level: 0, name: 'Weak', crack: 'in seconds', why: 'Too short. Longer is stronger!' };
  if (pw.length < 12) return { level: 1, name: 'Okay', crack: 'in a few days', why: 'Getting there. Add another word.' };
  if (pw.length < 16 || types < 4) return { level: 2, name: 'Strong', crack: 'in about 100 years', why: types < 4 ? 'Add a number AND a symbol to make it very strong.' : 'Add one more word.' };
  return { level: 3, name: 'Very strong', crack: 'in millions of years', why: 'Long, random words, a number and a symbol. Hackers give up!' };
}
function safetyPassword(area, say) {
  const me = (() => { try { return JSON.parse(localStorage.getItem('kiddyKatProfile') || '{}'); } catch (err) { return {}; } })();
  const first = String(me.name || 'MyName').split(' ')[0];
  const traps = [
    { text: first, trap: 'Never use your name.' },
    { text: String(me.birthYear || '2014'), trap: 'Birthdays and birth years are the first thing hackers try.' },
    { text: typeof pet !== 'undefined' && pet && pet.name ? pet.name : 'Fluffy', trap: 'Pet names are easy to find on social media.' },
    { text: 'password', trap: 'It\'s the most-guessed password in the world!' },
    { text: '123', trap: 'Number patterns like 123 get guessed first.' }
  ];
  const tiles = toyShuffle([...bankPick(SAFETY_WORDS, 5).map(text => ({ text })), ...['7', '42', '19'].map(text => ({ text })),
                            ...['!', '#', '?'].map(text => ({ text })), ...traps]);
  let parts = [];
  say.textContent = '🔐 Build a VERY STRONG password from the tiles.';
  const box = townAdd(area, 'div', '', 'safetyPassword');
  const meter = townAdd(area, 'div', undefined, 'safetyMeter');
  const fill = townAdd(meter, 'div', '', 'safetyMeterFill');
  const label = townAdd(area, 'div', '', 'safetyStrength');
  const why = townAdd(area, 'div', '', 'bankWhy');
  const grid = townAdd(area, 'div', undefined, 'safetyTiles');
  const draw = () => {
    box.textContent = parts.map(p => p.text).join('') || 'Tap tiles to build...';
    const s = safetyStrength(parts);
    fill.style.width = parts.length ? [20, 45, 75, 100][s.level] + '%' : '0';
    fill.style.background = ['#fa5252', '#fab005', '#40c057', '#2b8a3e'][s.level];
    label.textContent = parts.length ? `${s.name}: a computer could crack it ${s.crack}` : '';
    why.textContent = parts.length ? s.why : '';
    grid.querySelectorAll('button').forEach(b => { b.disabled = parts.includes(tiles[Number(b.dataset.i)]); });
  };
  tiles.forEach((tile, i) => {
    const b = townAdd(grid, 'button', tile.text, 'safetyTile');
    b.dataset.i = i;
    b.dataset.text = tile.text;
    b.addEventListener('click', () => { if (parts.length < 8) { parts.push(tile); draw(); } });
  });
  const row = townAdd(area, 'div', undefined, 'toyRow');
  townAdd(row, 'button', '⌫ Undo', 'arcadeSmall').addEventListener('click', () => { parts.pop(); draw(); });
  townAdd(row, 'button', '🔒 Lock it in', 'arcadeGo safetyLock').addEventListener('click', () => {
    const s = safetyStrength(parts);
    if (s.level === 3) {
      safetyWin('password', `"${parts.map(p => p.text).join('')}" would take millions of years to crack!`,
        'Use a passphrase: 3 or 4 random words + a number + a symbol. Never your name, birthday or pet, and a different one for every account.' +
        (safetyAge() === 'lion' ? ' Turn on 2-step login too, so a stolen password alone isn\'t enough.' : ''));
    } else say.textContent = `Not yet: ${s.why}`;
  });
  window.safetyTiles = () => tiles.map(t => ({ text: t.text, trap: !!t.trap }));    // for the tests
  draw();
}

// ---------- Content ----------
// [emoji, text, 0 = safe / 1 = not safe, why]
const SAFETY_SAFE_OR_NOT = [
  ['🚲', 'Wearing a helmet on your bike', 0, 'Helmets protect your brain if you fall.'],
  ['🦺', 'Buckling your seatbelt in the car', 0, 'Seatbelts keep you in your seat if the car stops fast.'],
  ['🏊', 'Swimming with a grown-up watching', 0, 'Even good swimmers need a grown-up watching.'],
  ['💊', 'Taking medicine only from a grown-up', 0, 'Medicine can look like candy, but too much can make you very sick.'],
  ['📞', 'Knowing your grown-up\'s phone number', 0, 'If you get lost, a helper can call them.'],
  ['🔥', 'Playing with matches or a lighter', 1, 'Fire spreads super fast. Matches are a grown-up tool.'],
  ['🍬', 'Taking candy from a stranger', 1, 'Only take treats from grown-ups your family knows.'],
  ['🔌', 'Touching a plug with wet hands', 1, 'Water and electricity together can shock you.'],
  ['🚪', 'Opening the door for someone you don\'t know', 1, 'Get a grown-up instead. They\'ll decide.'],
  ['✂️', 'Running with scissors', 1, 'If you trip, sharp things can hurt you. Walk!'],
  ['🌊', 'Swimming alone', 1, 'Always swim with a buddy and a grown-up nearby.'],
  ['🍳', 'Asking a grown-up before using the stove', 0, 'Stoves get very hot. A grown-up helps you cook safely.']
];
// [emoji, question, [right answer first, ...wrong], why]  (choices get shuffled)
const SAFETY_WHATIF_KITTEN = [
  ['🍬', 'A grown-up you don\'t know says, "Your mom sent me to get you. Want some candy?"', ['Say NO, run, and tell a grown-up you trust', 'Go with them', 'Take the candy and stay'],
    'Safe grown-ups know your family password. Never go anywhere with someone you don\'t know.'],
  ['🚨', 'The smoke alarm goes BEEP BEEP and you see smoke.', ['Get out fast and stay out', 'Hide under the bed', 'Grab my toys first'],
    'Get out, stay out, and go to your family meeting spot. Toys can be replaced. You can\'t!'],
  ['🛒', 'You get lost in a big store.', ['Stay put and ask a worker or a mom with kids', 'Go out to the parking lot', 'Leave with someone nice'],
    'Store workers wear name tags and can call your grown-up over the speaker.'],
  ['🎮', 'Someone in a game chat asks where you live.', ['Don\'t tell. Show a grown-up', 'Tell them my street', 'Tell them my school'],
    'Your address and school are private, even if they seem nice.'],
  ['💊', 'You find pills on the floor.', ['Don\'t touch them. Tell a grown-up', 'Taste one', 'Put them in my pocket'],
    'Pills can be very dangerous for kids. Let a grown-up pick them up.'],
  ['🚑', 'A grown-up falls and won\'t wake up, and no one else is home.', ['Call 911', 'Wait until tomorrow', 'Go play outside'],
    '911 is for emergencies. Say your address and what happened, and stay on the phone.'],
  ['🚸', 'You need to cross the street.', ['Stop, look left, right, left, then walk', 'Run across fast', 'Walk while looking at a tablet'],
    'Look both ways, and cross at a crosswalk with a grown-up when you can.'],
  ['🐕', 'A dog you don\'t know runs up to you.', ['Stand still like a tree and don\'t stare', 'Run away screaming', 'Pull its tail'],
    'Standing still helps the dog calm down. Ask the owner before petting any dog.']
];
const SAFETY_WHATIF_ONLINE = [
  ['💬', 'A kid in your class posts a mean comment about your friend.', ['Don\'t pile on. Support my friend and tell a grown-up', 'Add a laughing emoji', 'Post something mean back'],
    'Being an upstander means not joining in, checking on your friend, and reporting it.'],
  ['📍', 'A new game asks to use your location.', ['Ask a grown-up first, and usually say no', 'Always tap Allow', 'Share my location in chat'],
    'Most games don\'t need to know where you are. Location is private info.'],
  ['😨', 'You see something online that scares or upsets you.', ['Close it and tell a grown-up', 'Keep watching', 'Send it to my friends'],
    'You\'re never in trouble for telling. Grown-ups can report it and help you feel better.'],
  ['🔑', 'Your best friend asks for your game password to help you level up.', ['Keep it private, even from friends', 'Share it, they\'re my friend', 'Post it so I don\'t forget'],
    'Friendships change, and accounts get stolen that way. Passwords are only for you and your grown-ups.'],
  ['🤝', 'Someone online says they\'re 12 too and wants to meet at the park.', ['Never meet. Tell a grown-up right away', 'Meet them at the park', 'Send them my address'],
    'People online can lie about who they are. Never meet someone from online without your grown-up.'],
  ['🤳', 'You want to post a selfie in your school shirt.', ['Pick a photo without my school name or address', 'Post it and tag my school', 'Add my street name too'],
    'School logos, street signs and house numbers tell strangers where to find you.'],
  ['🕵️', 'Someone says, "Don\'t tell your parents we\'re talking."', ['Tell a grown-up right away', 'Keep the secret', 'Delete the chat and forget it'],
    'Safe people never ask you to keep secrets from your grown-ups. That\'s a big red flag.']
];
const SAFETY_FOOTPRINT = [
  ['📸', 'Someone tagged you in a party photo with drinks on the table.', ['Untag it and ask them to take it down', 'Leave it, it\'s just a photo', 'Make it my profile picture'],
    'Colleges and employers search names online. You control your digital footprint.'],
  ['🔑', 'An app wants "Sign in with Google" plus access to all your contacts.', ['Allow only what it needs, deny contacts', 'Allow everything', 'Make a new account with the same password'],
    'Apps collect and sell data. Give the least access that still works.'],
  ['📲', 'What does 2-step login (two-factor) do?', ['Needs a code from my phone too, so a stolen password isn\'t enough', 'Makes me use two passwords', 'Slows my phone down'],
    'Turn on 2-step login for email, bank and social accounts. It blocks most account takeovers.'],
  ['🔁', 'You used the same password on every site, and one site got hacked.', ['Change it everywhere and use a password manager', 'Nothing, it was only one site', 'Add a 1 to the end'],
    'Hackers try leaked passwords on every other site. That\'s called credential stuffing.'],
  ['☕', 'You\'re on free coffee shop Wi-Fi and want to check your bank.', ['Use my phone\'s data or wait until I\'m home', 'Go ahead, Wi-Fi is Wi-Fi', 'Log in on the shop\'s computer'],
    'Public Wi-Fi can be watched. Save banking for a secure connection.'],
  ['📍', 'Someone you\'re dating wants your location shared 24/7.', ['I can say no. Healthy relationships respect privacy', 'I have to say yes', 'Share my password too'],
    'Wanting to track you all the time is about control, not love. Talk to a trusted adult if it feels off.'],
  ['😤', 'You\'re mad at your manager and want to post about it.', ['Talk it out privately instead', 'Post it publicly with their name', 'Post it and tag the company'],
    'Posts are forever, and people get fired for them. Vent to a friend, not the internet.']
];
const SAFETY_SCAMS_TIGER = [
  { scam: true, from: 'FreeRobux.gg', text: '🎉 Get 10,000 FREE Robux! Just type your username and password here 👉 free-robux.gg', why: 'No one gives free Robux. Never type your password into a link someone sent you.' },
  { scam: true, from: 'Unknown number', text: 'You WON a new iPhone!! Tap within 10 minutes to claim before it expires!!', why: 'You can\'t win a contest you never entered, and "hurry!" is a trick.' },
  { scam: true, from: 'xX_GamerPro_Xx', text: 'hey ur cool. lets talk on a different app where ur parents cant see. send a pic?', why: 'A secret app and asking for pictures are huge red flags. Tell a grown-up right away.' },
  { scam: true, from: 'Roblox Support (robloxsupport@gmail.com)', text: 'Your account will be DELETED today. Reply with your password to keep it.', why: 'Real companies never ask for your password, and they don\'t use @gmail.com.' },
  { scam: true, from: 'YouTube_Prizes', text: 'Congrats! Pay $1 shipping with your parent\'s card to get your FREE headphones.', why: '"Free" that needs a card number isn\'t free. Never use a card without your grown-up.' },
  { scam: false, from: 'Coach Rivera', text: 'Practice moved to 5:00 tomorrow because of the rain. See you there!', why: 'Someone you know, no links, and not asking for anything private.' },
  { scam: false, from: 'School Library', text: 'Your book "Dog Man" is due Friday. You can return it at the front desk.', why: 'Expected info, nothing to click and nothing to give.' },
  { scam: false, from: 'Grandma', text: 'So proud of you for your spelling test! Love you 💕', why: 'Someone you know, just saying hi.' }
];
const SAFETY_SCAMS_LION = [
  { scam: true, from: 'Chase Alerts <alerts@chase-secure-login.co>', text: 'Unusual sign-in. Verify your account within 24 hours or it will be locked: chase-secure-login.co/verify', why: 'A look-alike website plus a deadline. Open your real bank app yourself instead of tapping the link.' },
  { scam: true, from: 'Hiring Team (via Telegram)', text: 'You\'re hired! Remote job, $45/hr. Buy your work laptop with $300 in gift cards and we\'ll pay you back.', why: 'Real employers never make you pay to work, and no real business takes gift cards.' },
  { scam: true, from: 'Landlord Mike', text: 'Apartment downtown, only $650/mo! I\'m out of the country so you can\'t see it. Zelle the $1,300 deposit to hold it.', why: 'Too cheap, can\'t see it, pay first by Zelle: classic rental scam. Never pay before you see a place and sign a lease.' },
  { scam: true, from: 'Unknown number', text: 'Hi it\'s Mom, I broke my phone, this is my new number. Can you send $200 on Cash App? I\'ll explain later', why: 'Call the old number or ask a question only Mom would know before sending anything.' },
  { scam: true, from: 'Student Loan Relief Center', text: 'You qualify for 100% loan forgiveness! Pay a $99 processing fee today to apply.', why: 'Real government programs are free. Go to studentaid.gov yourself.' },
  { scam: true, from: 'USPS <usps-redelivery.info>', text: 'Your package can\'t be delivered. Pay a $1.99 fee to reschedule: usps-redelivery.info', why: 'USPS doesn\'t text you for fees, and that isn\'t usps.com. Small fees steal card numbers.' },
  { scam: false, from: 'Target <orders@target.com>', text: 'Your order has shipped! Track it any time in the Target app.', why: 'Something you ordered, from the real domain, and it doesn\'t ask for anything. (Opening the app yourself is still the safest way to check.)' },
  { scam: false, from: 'Ms. Patel, school counselor', text: 'Reminder: FAFSA workshop Thursday at 6pm in the library. Bring a parent!', why: 'Someone you know, expected info, and no money or passwords asked for.' },
  { scam: false, from: 'Coach (team group chat)', text: 'Great game today! Team dinner Saturday at 6, reply if you can make it.', why: 'A group you\'re in, normal plans, nothing private requested.' }
];
