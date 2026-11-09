// =====================================================================
// holidays.js — 🎉 Birthdays and holidays in Kat Town
// • Holidays: a banner, a free decoration for your room (once a year), and
//   a 3-question holiday activity with a 💡 tip (first win of the day = +1 ⭐).
//   A grown-up picks which ones the family celebrates, and can add their own
//   (dashboard → Holidays). Saved on the phone as kiddyKatHolidays.
// • Birthday: set in ⚙️ Grown-ups (month and day only; stays on this phone).
//   On the day: a party, +10 ⭐ and a 🎂 cake, and brothers and sisters
//   can send a preset birthday gift when they visit.
// =====================================================================

// Dates. month is 1–12.
function hdMD(m, d) { return String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function hdNth(year, month, weekday, n) {               // the nth weekday (0 = Sunday) of a month
  const first = new Date(year, month - 1, 1).getDay();
  return hdMD(month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
}
function hdEaster(year) {                                 // Anonymous Gregorian computus
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return hdMD(Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}

// Quiz questions: [emoji, question, [right answer first, ...wrong], why]
const HD_KINDNESS = [
  ['💌', 'A great gift that costs nothing is...', ['Doing a chore without being asked', 'Asking for money', 'Nothing at all'], 'Helping out shows you care, and it\'s free!'],
  ['🙏', 'When someone does something nice for you...', ['Say thank you', 'Say nothing', 'Ask for more'], 'Thank you is two small words that make a big difference.'],
  ['🧮', 'You have 10 ⭐ and a card costs 3 ⭐. How many are left?', ['7', '13', '3'], '10 − 3 = 7. Always check what\'s left after you spend.']
];
const HD_WINTER = [
  ['🎁', 'Giving means...', ['Sharing time, help or gifts with others', 'Only getting presents', 'Something only grown-ups do'], 'Giving feels good, and it doesn\'t have to cost money.'],
  ['🧤', 'It\'s freezing outside. What do you wear?', ['Layers, a hat and gloves', 'Shorts', 'Flip-flops'], 'Layers trap warm air. Hats and gloves keep heat in.'],
  ['🧮', 'You have 20 ⭐ for gifts for 4 people. How much for each?', ['5', '4', '20'], '20 ÷ 4 = 5. Making a gift budget keeps you from overspending.']
];

// [id, emoji, name, date(year) → 'MM-DD' or a list, on by default?, [decor id, emoji, decor name, what it says], quiz, tip]
const HOLIDAYS = [
  ['newyear', '🎆', 'New Year\'s Day', () => '01-01', true, ['h-newyear', '🎆', 'Fireworks poster', 'Happy New Year! 🎆'], [
    ['🎯', 'A good New Year\'s goal is...', ['Specific, like "read 10 minutes a day"', 'Vague, like "be better"', 'Something you\'ll quit tomorrow'], 'Specific goals are easier to keep and to check off.'],
    ['🐷', 'You want to save 52 ⭐ this year. How many each week?', ['1', '5', '10'], 'There are 52 weeks in a year, so 1 a week gets you there.'],
    ['📈', 'What helps you keep a goal?', ['Tracking it every day', 'Never thinking about it', 'Telling no one'], 'Tracking progress (like a streak!) keeps you going.']],
    'A goal without a plan is just a wish. Write it down and track it.'],
  ['mlk', '🕊️', 'Martin Luther King Jr. Day', y => hdNth(y, 1, 1, 3), false, ['h-mlk', '🕊️', 'Peace dove', 'Peace and fairness for everyone. 🕊️'], [
    ['✊', 'Dr. Martin Luther King Jr. worked for...', ['Equal rights for all people, peacefully', 'Faster cars', 'More homework'], 'He led peaceful protests for civil rights and gave the "I Have a Dream" speech in 1963.'],
    ['🗣️', 'A peaceful way to solve a disagreement is...', ['Talk it out and listen', 'Yell louder', 'Push'], 'Listening first helps everyone feel heard.'],
    ['🤝', 'Treating everyone fairly means...', ['The same respect, no matter how someone looks', 'Only being nice to friends', 'Picking favorites'], 'Fairness means everyone gets the same respect.']],
    'Stand up for what\'s fair, and do it with kindness.'],
  ['valentine', '💝', 'Valentine\'s Day', () => '02-14', true, ['h-valentine', '💝', 'Heart garland', 'Spread the love! 💝'], [
    ['💌', 'A great way to show kindness is...', ['Writing a nice note to someone', 'Ignoring the new kid', 'Taking the last cookie'], 'Kind words cost nothing and can make someone\'s whole day.'],
    ['😢', 'Your friend is sad. What do you do?', ['Ask if they want to talk', 'Laugh', 'Walk away'], 'Just asking "are you okay?" helps a lot.'],
    ['🙅', 'Is it okay to say no if someone wants a hug?', ['Yes, your body, your choice', 'No, you have to hug', 'Only on Valentine\'s Day'], 'You can always say no to a hug, and other people can too.']],
    'Kindness is free, and it always comes back around.'],
  ['stpatrick', '🍀', 'St. Patrick\'s Day', () => '03-17', true, ['h-stpatrick', '🍀', 'Lucky clover', 'Feeling lucky! 🍀'], [
    ['🍀', 'What\'s the most reliable way to get something you want?', ['Hard work and saving', 'Waiting for luck', 'Wishing really hard'], 'Luck is nice, but a plan and savings work every time.'],
    ['🪙', 'A pot has 100 gold coins and you spend 20. How many are left?', ['80', '120', '20'], '100 − 20 = 80.'],
    ['🎨', 'Green is a mix of which two colors?', ['Blue and yellow', 'Red and blue', 'Red and yellow'], 'Blue + yellow = green. Try it in the 🔬 Science kit!']],
    'You make your own luck by showing up and doing the work.'],
  ['easter', '🐣', 'Easter', y => hdEaster(y), false, ['h-easter', '🐣', 'Spring chick', 'Peep peep! Happy spring! 🐣'], [
    ['🌱', 'Plants need ___ to grow.', ['Water, sunlight and soil', 'Candy', 'Darkness'], 'Spring is when lots of plants start growing again.'],
    ['🧺', 'At an egg hunt, your little cousin found none. What do you do?', ['Share some of yours', 'Hide the rest', 'Laugh'], 'Sharing makes the hunt fun for everyone.'],
    ['🥚', 'You find 12 eggs and give away 4. How many are left?', ['8', '16', '4'], '12 − 4 = 8.']],
    'Spring is a fresh start. What new habit will you plant?'],
  ['earth', '🌎', 'Earth Day', () => '04-22', true, ['h-earth', '🌱', 'Seedling pot', 'Grow, little plant, grow! 🌱'], [
    ['♻️', 'Where does an empty plastic bottle go?', ['The recycling bin', 'On the ground', 'Down the sink'], 'Recycling turns old bottles into new things.'],
    ['💡', 'Which saves the most energy?', ['Turning off lights when you leave', 'Leaving the TV on', 'Opening the fridge a lot'], 'Saving energy saves money too!'],
    ['🍌', 'Food scraps like banana peels can become...', ['Compost that helps plants grow', 'Plastic', 'Nothing useful'], 'Composting turns scraps into food for gardens.']],
    'Reduce, reuse, recycle, in that order. Using less is the best of all.'],
  ['mothers', '💐', 'Mother\'s Day', y => hdNth(y, 5, 0, 2), false, ['h-mothers', '💐', 'Flower vase', 'Flowers for someone special! 💐'], HD_KINDNESS,
    'Show the people who care for you that you notice what they do.'],
  ['fathers', '👔', 'Father\'s Day', y => hdNth(y, 6, 0, 3), false, ['h-fathers', '🏅', 'Best Dad medal', 'World\'s best! 🏅'], HD_KINDNESS,
    'Show the people who care for you that you notice what they do.'],
  ['july4', '🇺🇸', 'Fourth of July', () => '07-04', true, ['h-july4', '🇺🇸', 'Flag', 'Happy birthday, USA! 🇺🇸'], [
    ['🎂', 'What is the Fourth of July?', ['The birthday of the United States (1776)', 'The first day of school', 'Thanksgiving'], 'The Declaration of Independence was adopted on July 4, 1776.'],
    ['🎆', 'Fireworks are...', ['For grown-ups only. Watch from a safe distance', 'Fine for kids to light', 'Toys'], 'Fireworks cause thousands of injuries every year. Leave them to grown-ups.'],
    ['☀️', 'It\'s a hot, sunny day outside. What do you need?', ['Water, shade and sunscreen', 'A heavy jacket', 'Nothing'], 'Drink water before you feel thirsty on hot days.']],
    'Freedom comes with responsibility: to follow rules and help your community.'],
  ['halloween', '🎃', 'Halloween', () => '10-31', true, ['h-halloween', '🎃', 'Jack-o\'-lantern', 'Boo! 🎃👻'], [
    ['🔦', 'Trick-or-treating, which is safest?', ['Go with a grown-up and carry a flashlight', 'Go alone in the dark', 'Go inside strangers\' houses'], 'Stay with your group, stay in the light, and stay outside.'],
    ['🍬', 'Before you eat your candy...', ['Let a grown-up check it first', 'Eat it all right away', 'Trade for unwrapped candy'], 'Only eat treats in sealed wrappers that a grown-up has checked.'],
    ['🧮', 'You got 30 pieces of candy and eat 3 a day. How many days will it last?', ['10', '3', '30'], '30 ÷ 3 = 10 days. That\'s budgeting, with candy!']],
    'Making your treats last is the same skill as making your money last.'],
  ['thanksgiving', '🦃', 'Thanksgiving', y => hdNth(y, 11, 4, 4), true, ['h-thanksgiving', '🦃', 'Turkey centerpiece', 'Gobble gobble! 🦃'], [
    ['🙏', 'Gratitude means...', ['Noticing and saying thanks for good things', 'Wanting more stuff', 'Being bored'], 'People who practice gratitude are usually happier.'],
    ['🍽️', 'A good way to help with Thanksgiving dinner is...', ['Set the table or help clean up', 'Hide until it\'s ready', 'Eat before everyone else'], 'Helping out is a great way to say thanks.'],
    ['🧮', 'A recipe serves 4, but 8 people are coming. You need...', ['Double everything', 'Half of everything', 'The same amounts'], 'Twice the people, twice the ingredients.']],
    'Name 3 things you\'re thankful for today. Try it at dinner!'],
  ['winter', '❄️', 'Winter holidays', () => ['12-24', '12-25', '12-26'], true, ['h-winter', '⛄', 'Snowman', 'Brrr! Happy holidays! ⛄'], HD_WINTER,
    'The best gifts are often time together, not things.'],
  ['christmas', '🎄', 'Christmas', () => '12-25', false, ['h-christmas', '🎄', 'Christmas tree', 'Merry Christmas! 🎄'], HD_WINTER,
    'The best gifts are often time together, not things.']
];
const HD_CUSTOM_DECOR = ['h-custom', '🎉', 'Party banner', 'Let\'s celebrate! 🎉'];
const HD_BIRTHDAY_DECOR = ['h-birthday', '🎂', 'Birthday cake', 'Make a wish! 🎂'];
const HD_BIRTHDAY_STARS = 10;
const BIRTHDAY_GIFTS = { cake: ['🎂', 'a birthday cake'], balloon: ['🎈', 'a balloon'], present: ['🎁', 'a present'], card: ['💌', 'a birthday card'] };

// The family's holiday choices (set from the dashboard). Unset = the defaults.
function hdSettings() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('kiddyKatHolidays') || 'null'); } catch (err) { s = null; }
  if (!s || !Array.isArray(s.on)) s = { on: HOLIDAYS.filter(h => h[4]).map(h => h[0]), custom: [] };
  if (!Array.isArray(s.custom)) s.custom = [];
  return s;
}
function hdToday(now = new Date()) { return hdMD(now.getMonth() + 1, now.getDate()); }
function hdDateKey(now = new Date()) { return `${now.getFullYear()}-${hdToday(now)}`; }

// Today's holiday, or null. { id, emoji, name, decor, quiz, tip }
function holidayToday(now = new Date()) {
  const md = hdToday(now), s = hdSettings();
  for (const h of HOLIDAYS) {
    if (!s.on.includes(h[0])) continue;
    const dates = [].concat(h[3](now.getFullYear()));
    if (dates.includes(md)) return { id: h[0], emoji: h[1], name: h[2], decor: h[5], quiz: h[6], tip: h[7] };
  }
  const c = s.custom.find(x => x && x.date === md && x.name);
  if (c) return { id: 'custom-' + md, emoji: String(c.emoji || '🎉').slice(0, 4), name: String(c.name).slice(0, 30), decor: HD_CUSTOM_DECOR, quiz: null, tip: 'Traditions bring families together. Ask a grown-up why this day is special to your family!' };
  return null;
}
function birthdayToday(now = new Date()) {
  let b = null;
  try { b = localStorage.getItem('kiddyKatBirthday'); } catch (err) {}
  return !!b && b === hdToday(now);
}

// Holiday decorations and the birthday cake live in the room like any decoration
function hdDecorItem(id) {
  if (id === HD_BIRTHDAY_DECOR[0]) return [id, HD_BIRTHDAY_DECOR[1], HD_BIRTHDAY_DECOR[2], 0, 'bounce', HD_BIRTHDAY_DECOR[3]];
  if (id === HD_CUSTOM_DECOR[0]) return [id, HD_CUSTOM_DECOR[1], HD_CUSTOM_DECOR[2], 0, 'bounce', HD_CUSTOM_DECOR[3]];
  const h = HOLIDAYS.find(x => x[5][0] === id);
  return h ? [id, h[5][1], h[5][2], 0, 'bounce', h[5][3]] : null;
}
function hdGiveDecor(t, decor) {
  const room = townRoom(t);
  if (room.items.some(i => i.id === decor[0])) return 'already';
  const used = new Set(room.items.map(i => i.spot));
  for (let r = 0; r < TOWN_ROOM_ROWS; r++) for (let c = 0; c < TOWN_ROOM_COLS; c++) {
    const spot = c + ',' + r;
    if (!used.has(spot)) { room.items.push({ spot: spot, id: decor[0], fresh: true }); return 'placed'; }
  }
  return 'full';
}

// ---------- On the map ----------
function hdMapBanner(box) {
  const t = loadTown();
  if (birthdayToday()) {
    if (t.partyDay !== hdDateKey()) { t.partyDay = hdDateKey(); saveTown(t); }      // tells brothers and sisters it's a party
    const b = townAdd(box, 'button', `🎂🎈 Happy birthday! Tap for your party 🎉`, 'hdBanner birthday');
    b.addEventListener('click', showBirthdayParty);
  }
  const h = holidayToday();
  if (h) townAdd(box, 'button', `${h.emoji} Happy ${h.name}! Tap to celebrate`, 'hdBanner').addEventListener('click', showHolidayFun);
}

// ---------- 🎂 Birthday party ----------
function showBirthdayParty() {
  townView = 'party';
  const t = loadTown();
  const box = townBody('🎂 Birthday party!');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  const scene = townAdd(box, 'div', undefined, 'townClosedScene party');
  townAdd(scene, 'div', '🎈 🎂 🎉 🎁 🎈', 'townClosedEmoji');
  if (t.avatar) scene.appendChild(townAvatarSvg(t.avatar, 100));
  townAdd(box, 'div', `Happy birthday, ${typeof callName === 'function' ? callName() : 'birthday star'}! The whole town is celebrating you today. 🎉`, 'arcadeMessage');
  const year = String(new Date().getFullYear());
  if ((t.birthdayGift || '') !== year) {
    townAdd(box, 'button', `🎁 Open your birthday gift`, 'arcadeGo toyBig hdOpenGift').addEventListener('click', () => {
      const f = loadTown();
      if (f.birthdayGift === year) return;
      f.birthdayGift = year;
      const placed = hdGiveDecor(f, HD_BIRTHDAY_DECOR);
      saveTown(f);
      if (typeof addStars === 'function') addStars(HD_BIRTHDAY_STARS);
      townPop('🎂', `+${HD_BIRTHDAY_STARS} ⭐` + (placed === 'placed' ? '\nAnd a 🎂 birthday cake for your room!' : '') + '\n\n💡 Another year older, and smarter too! Make a goal for your new year.',
        [['🎉 Yay!', () => showBirthdayParty()]], 'townBounceIn');
    });
  } else townAdd(box, 'div', '✅ You opened your birthday gift. Check your room for the 🎂!', 'arcadeHint');
  const today = new Date().toISOString().slice(0, 10);
  const gifts = (t.visits || []).filter(v => v.at === today && BIRTHDAY_GIFTS[v.reaction]);
  townAdd(box, 'h3', '🎁 Gifts from your family', 'fgHead');
  if (!gifts.length) townAdd(box, 'div', 'When your brothers and sisters visit your town today, their gifts show up here!', 'arcadeHint');
  gifts.forEach(g => townAdd(box, 'div', `${BIRTHDAY_GIFTS[g.reaction][0]} ${g.from} sent you ${BIRTHDAY_GIFTS[g.reaction][1]}!`, 'townJobDone hdGift'));
}

// ---------- 🎃 Holiday fun ----------
function showHolidayFun() {
  const h = holidayToday();
  if (!h) { showTownMap(); return; }
  townView = 'holiday';
  const t = loadTown();
  const box = townBody(`${h.emoji} ${h.name}`);
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  townAdd(box, 'div', `${h.emoji} Kat Town is celebrating ${h.name}!`, 'arcadeMessage');
  const key = `${h.id}-${new Date().getFullYear()}`;
  if (!(t.holidayGifts || []).includes(key)) {
    townAdd(box, 'button', `🎁 Get your free ${h.decor[1]} ${h.decor[2]}`, 'arcadeGo hdDecorBtn').addEventListener('click', () => {
      const f = loadTown();
      if (!Array.isArray(f.holidayGifts)) f.holidayGifts = [];
      if (f.holidayGifts.includes(key)) return;
      f.holidayGifts.push(key);
      const placed = hdGiveDecor(f, h.decor);
      saveTown(f);
      townPop(h.decor[1], placed === 'full' ? 'Your room is full! Make some space in 🎨 Decorate, then come back.' : `A ${h.decor[2]} is in your room now! ${h.decor[3]}`,
        [['😄 Cool!', () => showHolidayFun()]], 'townBounceIn');
      if (placed === 'full') { const g = loadTown(); g.holidayGifts = g.holidayGifts.filter(k => k !== key); saveTown(g); }
    });
  } else townAdd(box, 'div', `✅ Your ${h.decor[1]} ${h.decor[2]} is in your room.`, 'arcadeHint');
  if (h.quiz) {
    townAdd(box, 'button', `${h.emoji} Holiday challenge (3 questions)`, 'arcadeGo hdQuizBtn').addEventListener('click', () => openHolidayQuiz(h));
  }
  townAdd(box, 'div', '💡 ' + h.tip, 'bankTip');
}

function openHolidayQuiz(h) {
  townView = 'holiday:quiz';
  const box = townBody(`${h.emoji} ${h.name} challenge`);
  townAdd(box, 'button', '← Back', 'arcadeBack').addEventListener('click', () => showHolidayFun());
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const area = townAdd(box, 'div', undefined, 'toyArea bankArea');
  const rounds = h.quiz.map(([emoji, q, options, why]) => {
    const order = toyShuffle(options.map((text, i) => [text, i]));
    return { show: b => { townAdd(b, 'div', emoji, 'bankBigEmoji'); townAdd(b, 'div', q, 'bankItemName'); }, options: order.map(o => o[0]), answer: order.findIndex(o => o[1] === 0), why: why };
  });
  bankRounds('holiday-' + h.id, area, say, rounds, 2, '', h.tip, (right, total) => {
    if (right < 2) { townPop('💪', `${right} of ${total}. You need 2 to win.\n\n💡 ${h.tip}`, [['🔁 Try again', () => openHolidayQuiz(h)], ['← Back', () => showHolidayFun()]], 'townBounceIn'); return; }
    const t = loadTown();
    const today = new Date().toDateString(), k = 'holiday-' + h.id;
    if (!t.lessonWins || t.lessonWins.date !== today) t.lessonWins = { date: today, won: [] };
    let note = '';
    if (!t.lessonWins.won.includes(k)) {
      t.lessonWins.won.push(k);
      saveTown(t);
      note = typeof arcadeStars === 'function' && arcadeStars(1) ? ' +1 ⭐' : '';
    }
    if (typeof lifeSkillLog === 'function') lifeSkillLog('holiday', k);
    townPop(h.emoji, `🎉 ${right} of ${total}! Happy ${h.name}!${note}\n\n💡 ${h.tip}`, [['🎉 Yay!', () => showHolidayFun()]], 'townBounceIn');
  });
}

// When a brother or sister visits on my birthday: preset gifts instead of reactions
function hdIsPartyToday(o) { return !!o && o.partyDay === hdDateKey(); }
