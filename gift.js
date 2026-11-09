// =====================================================================
// gift.js — 🎁 Daily gift: show up every day, it adds up
// One gift a day from the town map. Days 1–6: +1 ⭐. Day 7: +5 ⭐ and a
// surprise for your room. Missing a day starts the streak over.
// Every gift comes with a 💡 tip of the day.
// =====================================================================

const GIFT_TIPS = [
  'Pay yourself first: put some stars in savings before you spend.',
  'A want can wait. A need can\'t. Check which one it is before you buy.',
  'Wash your hands for 20 seconds. That\'s two Happy Birthdays!',
  'Never share your password, even with your best friend.',
  'Read the whole recipe before you start cooking.',
  'If a message says "hurry" or "free", slow down. That\'s how scams work.',
  'Lay out tomorrow\'s clothes tonight, and mornings get easier.',
  'Saying thank you makes people want to help you again.',
  'Small things every day beat big things once in a while.',
  'Turn off the lights when you leave a room. It saves money and energy.',
  'Ask before you post a picture of someone else.',
  'Drink water first when you feel tired or grumpy.',
  'Compare the price per item, not just the price on the tag.',
  'Make your bed. It\'s the first thing you finish every day!'
];
const GIFT_SURPRISES = ['plant', 'teddy', 'lamp', 'picture', 'books', 'trophy'];

function giftDay(d = new Date()) { return d.toDateString(); }
function giftYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); }
function giftReady(t) { return !!t.avatar && (!t.gift || t.gift.last !== giftDay()); }
function giftNextStreak(t) {
  const g = t.gift || {};
  if (g.last === giftYesterday()) return (g.streak || 0) % 7 + 1;   // 1 → 7, then back to 1
  return 1;
}

// The button on the map (only while today's gift is waiting)
function giftButton(parent) {
  const t = loadTown();
  if (!giftReady(t)) return null;
  const day = giftNextStreak(t);
  const b = townAdd(parent, 'button', day === 7 ? '🎁 Day 7 BIG gift!' : `🎁 Open today's gift (day ${day} of 7)`, 'arcadeGo giftBtn' + (day === 7 ? ' big' : ''));
  b.addEventListener('click', openGift);
  return b;
}

function openGift() {
  const t = loadTown();
  if (!giftReady(t)) return;
  const day = giftNextStreak(t);
  const stars = day === 7 ? 5 : 1;
  t.gift = { last: giftDay(), streak: day, total: ((t.gift || {}).total || 0) + 1 };
  let extra = '';
  if (day === 7 && typeof townRoom === 'function') {
    const room = townRoom(t);
    const id = GIFT_SURPRISES[Math.floor(Math.random() * GIFT_SURPRISES.length)];
    const used = new Set(room.items.map(i => i.spot));
    let spot = null;
    for (let r = 0; r < TOWN_ROOM_ROWS && !spot; r++) for (let c = 0; c < TOWN_ROOM_COLS; c++) if (!used.has(c + ',' + r)) { spot = c + ',' + r; break; }
    const d = townDecorItem(id);
    if (spot && d) { room.items.push({ spot: spot, id: id, fresh: true }); extra = `\nPlus a surprise for your room: ${d[1]} ${d[2]}!`; }
  }
  saveTown(t);
  if (typeof addStars === 'function') addStars(stars);
  const tip = GIFT_TIPS[Math.floor(Date.now() / 86400000) % GIFT_TIPS.length];
  const dots = Array.from({ length: 7 }, (_, i) => i < day ? '🟢' : '⚪').join('');
  townPop(day === 7 ? '🎉' : '🎁', `Day ${day} of 7: +${stars} ⭐${extra}\n${dots}\n\n💡 Tip of the day: ${tip}`,
    [[day === 7 ? '🎉 Awesome!' : '😄 Thanks!', () => showTownMap()]], 'townBounceIn');
}
