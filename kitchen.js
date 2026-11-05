// =====================================================================
// kitchen.js — 🍳 Kat Kitchen: cook real recipes, shop on a budget
// 👩‍🍳 Cook: gather ingredients → measure → steps in order → safety → cook
//    it just right. Finished dishes go in My recipe book, with a button to
//    ask a grown-up to cook it together for real (goes to the wish list).
// 🛒 Shop: buy everything for a recipe without going over budget
//    (name brand vs. store brand, tempting treats, change at the end).
// First win of each activity each day = +1 ⭐ (inside the Arcade limit).
// Uses town.js helpers and lifeSkillLog() from bank.js.
// =====================================================================

// Measuring tools. Cups are counted in quarter cups, spoons in teaspoons.
const KITCHEN_CUPS = [['1 cup', 4], ['½ cup', 2], ['¼ cup', 1]];
const KITCHEN_SPOONS = [['1 tablespoon', 3], ['1 teaspoon', 1]];

// Prices are real-world dollars, so kids learn what groceries actually cost.
// shop: [emoji, name, name-brand price, store-brand price]
const KITCHEN_RECIPES = [
  { id: 'pbj', emoji: '🥪', name: 'PB&J sandwich', ages: ['kitten'],
    need: [['🍞', 'Bread'], ['🥜', 'Peanut butter'], ['🍓', 'Jelly']],
    extras: [['🧅', 'Onion'], ['🐟', 'Fish'], ['🌶️', 'Hot pepper']],
    measure: { emoji: '🥜', what: 'peanut butter', label: '2 tablespoons', amount: 6, tools: KITCHEN_SPOONS },
    steps: ['Wash your hands', 'Lay out 2 slices of bread', 'Spread peanut butter on one slice', 'Spread jelly on the other slice', 'Put them together and cut in half'],
    safety: { q: 'Before you start making food, what do you do first?', options: ['🧼 Wash my hands', '👅 Lick the spoon', '📺 Turn on the TV'], answer: 0,
              why: 'Clean hands keep germs out of your food.' },
    cook: null,
    tip: 'Clean up as you go: lids back on, wipe the counter. Then the kitchen stays easy!',
    shop: [['🍞', 'Bread', 3, 2], ['🥜', 'Peanut butter', 4, 2], ['🍓', 'Jelly', 3, 2]], budget: 8 },
  { id: 'parfait', emoji: '🥣', name: 'Yogurt parfait', ages: ['kitten'],
    need: [['🥛', 'Yogurt'], ['🫐', 'Berries'], ['🥣', 'Granola']],
    extras: [['🥔', 'Potato'], ['🧀', 'Cheese'], ['🥒', 'Pickle']],
    measure: { emoji: '🥣', what: 'granola', label: '½ cup', amount: 2, tools: KITCHEN_CUPS },
    steps: ['Wash your hands', 'Rinse the berries', 'Put yogurt in a cup', 'Add a layer of berries', 'Sprinkle granola on top'],
    safety: { q: 'The berries came from the store. What should you do?', options: ['💧 Rinse them with water', '🤷 Nothing', '🧂 Add salt'], answer: 0,
              why: 'Rinsing washes off dirt and germs from the farm and the store.' },
    cook: null,
    tip: 'Fruit, protein and a crunchy topping make a healthy snack that keeps you full.',
    shop: [['🥛', 'Yogurt', 4, 3], ['🫐', 'Berries', 5, 3], ['🥣', 'Granola', 4, 3]], budget: 10 },
  { id: 'pancakes', emoji: '🥞', name: 'Pancakes', ages: ['tiger'],
    need: [['🌾', 'Flour'], ['🥛', 'Milk'], ['🥚', 'Egg'], ['🧈', 'Butter']],
    extras: [['🥫', 'Ketchup'], ['🥒', 'Pickles'], ['🧅', 'Onion']],
    measure: { emoji: '🥛', what: 'milk', label: '1½ cups', amount: 6, tools: KITCHEN_CUPS },
    steps: ['Wash your hands', 'Mix flour, sugar and baking powder in a bowl', 'Whisk in milk, egg and melted butter', 'Pour ¼ cup of batter on a hot pan',
            'Flip when bubbles pop on top', 'Cook the other side until golden'],
    safety: { q: 'Where should the frying pan\'s handle point?', options: ['↩️ Turned in, away from the edge', '➡️ Sticking out over the edge', '👧 Toward your little sister'], answer: 0,
              why: 'A handle sticking out gets bumped, and hot food spills on someone.' },
    cook: { what: 'pancake', raw: 'Still runny', done: 'Golden brown!', burnt: 'Burnt!' },
    tip: 'Read the whole recipe before you start, so there are no surprises halfway through.',
    shop: [['🌾', 'Flour', 3.99, 2.49], ['🥛', 'Milk', 4.29, 3.19], ['🥚', 'Eggs', 4.99, 3.79], ['🧈', 'Butter', 5.49, 3.99]], budget: 15 },
  { id: 'eggs', emoji: '🍳', name: 'Scrambled eggs', ages: ['tiger'],
    need: [['🥚', 'Eggs'], ['🥛', 'Milk'], ['🧈', 'Butter'], ['🧂', 'Salt']],
    extras: [['🍫', 'Chocolate'], ['🍌', 'Banana'], ['🥫', 'Tomato soup']],
    measure: { emoji: '🥛', what: 'milk', label: '2 tablespoons', amount: 6, tools: KITCHEN_SPOONS },
    steps: ['Wash your hands', 'Crack the eggs into a bowl (fish out any shell)', 'Add milk and a pinch of salt, then whisk', 'Melt butter in a pan on medium heat',
            'Stir the eggs slowly until they\'re set', 'Turn off the stove'],
    safety: { q: 'You just touched raw egg. What next?', options: ['🧼 Wash my hands with soap', '👕 Wipe them on my shirt', '🍳 Keep cooking'], answer: 0,
              why: 'Raw eggs can carry germs (salmonella) that make people sick.' },
    cook: { what: 'eggs', raw: 'Still runny', done: 'Fluffy and set!', burnt: 'Rubbery and brown!' },
    tip: 'Medium heat and patience beat high heat. Most cooking mistakes come from rushing.',
    shop: [['🥚', 'Eggs', 4.99, 3.79], ['🥛', 'Milk', 4.29, 3.19], ['🧈', 'Butter', 5.49, 3.99], ['🧂', 'Salt', 1.99, 0.99]], budget: 14 },
  { id: 'tacos', emoji: '🌮', name: 'Taco night for 4', ages: ['lion'],
    need: [['🥩', 'Ground beef'], ['🫓', 'Tortillas'], ['🧀', 'Cheese'], ['🥬', 'Lettuce'], ['🍅', 'Tomato'], ['🌶️', 'Taco seasoning']],
    extras: [['🍫', 'Chocolate'], ['🥞', 'Pancake mix'], ['🐟', 'Tuna']],
    measure: { emoji: '🌶️', what: 'taco seasoning', label: '2 tablespoons', amount: 6, tools: KITCHEN_SPOONS },
    steps: ['Wash your hands', 'Brown the meat in a pan, breaking it up', 'Drain the grease into a can (never the sink)', 'Stir in the seasoning and a little water',
            'Warm the tortillas', 'Fill with meat, lettuce, tomato and cheese'],
    safety: { q: 'How do you know ground beef is cooked?', options: ['🌡️ No pink left: 160°F inside', '👃 It smells good', '⏱️ It was in the pan 2 minutes'], answer: 0,
              why: 'Ground meat has to reach 160°F inside to be safe. A food thermometer tells you for sure.' },
    scale: { q: 'The recipe uses 1 lb of meat for 4 people. You\'re feeding 8. How much meat?', options: ['2 lb', '1 lb', '4 lb'], answer: 0,
             why: 'Twice the people means twice every ingredient: 1 lb × 2 = 2 lb.' },
    cook: { what: 'meat', raw: 'Still pink', done: 'Browned, no pink!', burnt: 'Dry and burnt!' },
    tip: 'Grease poured down the sink hardens and clogs pipes. A plumber costs way more than tacos!',
    shop: [['🥩', 'Ground beef (1 lb)', 6.99, 5.49], ['🫓', 'Tortillas', 3.99, 2.49], ['🧀', 'Shredded cheese', 4.99, 3.29], ['🥬', 'Lettuce', 2.49, 1.99],
           ['🍅', 'Tomatoes', 2.99, 1.99], ['🌶️', 'Taco seasoning', 1.79, 0.99]], budget: 18 },
  { id: 'sheetpan', emoji: '🍗', name: 'Sheet-pan chicken & veggies', ages: ['lion'],
    need: [['🍗', 'Chicken'], ['🥦', 'Broccoli'], ['🥔', 'Potatoes'], ['🫒', 'Olive oil'], ['🧂', 'Salt']],
    extras: [['🍭', 'Lollipop'], ['🥣', 'Cereal'], ['🍦', 'Ice cream']],
    measure: { emoji: '🫒', what: 'olive oil', label: '2 tablespoons', amount: 6, tools: KITCHEN_SPOONS },
    steps: ['Wash your hands', 'Heat the oven to 425°F', 'Cut potatoes and broccoli into same-size pieces', 'Use a different cutting board for the raw chicken',
            'Toss everything with oil and salt on the pan', 'Bake about 25 minutes, until the chicken hits 165°F'],
    safety: { q: 'You cut raw chicken. The knife and cutting board...', options: ['🧽 Get washed with hot, soapy water', '🥗 Are fine for cutting salad', '💧 Just get a quick rinse'], answer: 0,
              why: 'Raw chicken germs spread to anything they touch. That\'s called cross-contamination.' },
    scale: { q: 'Chicken costs $3.50 a pound. You need 2 pounds. What will it cost?', options: ['$7.00', '$5.50', '$3.50'], answer: 0,
             why: '$3.50 × 2 = $7.00. Price per pound is on every meat label.' },
    cook: { what: 'chicken', raw: 'Still pink inside', done: '165°F, juicy!', burnt: 'Dried out!' },
    tip: 'Same-size pieces cook in the same time. One pan means one pan to wash!',
    shop: [['🍗', 'Chicken (2 lb)', 9.99, 7.49], ['🥦', 'Broccoli', 2.99, 2.29], ['🥔', 'Potatoes', 3.99, 2.99], ['🫒', 'Olive oil', 8.99, 5.99], ['🧂', 'Salt', 1.99, 0.99]], budget: 22 }
];
const KITCHEN_TREATS = [['🍬', 'Candy', 1.99], ['🥤', 'Soda 6-pack', 4.99], ['🍪', 'Cookies', 3.49]];

function kitchenAge() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }
function kitchenRecipes() { return KITCHEN_RECIPES.filter(r => r.ages.includes(kitchenAge())); }
function kitchenRecipe(id) { return KITCHEN_RECIPES.find(r => r.id === id); }
function kitchenMoney(n) { return kitchenAge() === 'kitten' && Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`; }
function kitchenWonToday(key) {
  const t = loadTown();
  return !!(t.lessonWins && t.lessonWins.date === new Date().toDateString() && t.lessonWins.won.includes(key));
}

// ---------- The kitchen screen ----------
function showTownKitchen(message) {
  townView = 'kitchen';
  const t = loadTown();
  const box = townBody('🍳 Kat Kitchen');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  townAdd(box, 'div', 'Cook real recipes and shop on a budget. First win of each one today = +1 ⭐', 'arcadeHint');

  townAdd(box, 'h3', '👩‍🍳 Cook', 'fgHead');
  const cookRow = townAdd(box, 'div', undefined, 'bankLessons');
  kitchenRecipes().forEach(r => {
    townAdd(cookRow, 'button', `${r.emoji} ${r.name}${kitchenWonToday('cook-' + r.id) ? ' ✅' : ''}`, 'bankLesson kitchenCook')
      .addEventListener('click', () => openKitchenCook(r.id));
  });
  townAdd(box, 'h3', '🛒 Shop for a meal', 'fgHead');
  const shopRow = townAdd(box, 'div', undefined, 'bankLessons');
  kitchenRecipes().forEach(r => {
    townAdd(shopRow, 'button', `🛒 ${r.name}${kitchenWonToday('shop-' + r.id) ? ' ✅' : ''}`, 'bankLesson kitchenShop')
      .addEventListener('click', () => openKitchenShop(r.id));
  });

  townAdd(box, 'h3', '📖 My recipe book', 'fgHead');
  const book = t.recipes || {};
  const made = KITCHEN_RECIPES.filter(r => book[r.id]);
  if (!made.length) townAdd(box, 'div', 'Cook something and it goes in your recipe book!', 'arcadeHint');
  made.forEach(r => {
    const row = townAdd(box, 'div', undefined, 'townWishRow kitchenBookRow');
    townAdd(row, 'div', `${r.emoji} ${r.name} · made ${book[r.id]}×`, 'townWishName');
    const asked = (t.wishes || []).some(w => w.id === 'cook-' + r.id);
    const b = townAdd(row, 'button', asked ? '✅ Asked' : '👨‍🍳 Cook it for real', 'arcadeSmall kitchenReal');
    b.disabled = asked;
    b.addEventListener('click', () => {
      const f = loadTown();
      if (!f.wishes.some(w => w.id === 'cook-' + r.id)) {
        f.wishes.push({ id: 'cook-' + r.id, emoji: r.emoji, name: `Cook ${r.name} together for real`, store: 'Kat Kitchen', kind: 'food', note: '', at: new Date().toISOString().slice(0, 10) });
        saveTown(f);
      }
      showTownKitchen(`👨‍🍳 ${typeof parentName === 'function' ? parentName() : 'Your grown-up'} will see that you want to cook ${r.name} together!`);
    });
  });
}

function kitchenWin(key, emoji, text, tip, again) {
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
  if (typeof lifeSkillLog === 'function') lifeSkillLog('kitchen', key);
  townPop(emoji, `🎉 ${text}${note}\n\n💡 ${tip}`, [['🔁 Again', again], ['🍳 Kitchen', () => showTownKitchen()]], 'townBounceIn');
}

// ---------- 👩‍🍳 Cook ----------
function openKitchenCook(id) {
  const r = kitchenRecipe(id);
  if (!r) return;
  townView = 'kitchen:cook';
  const box = townBody(`${r.emoji} ${r.name}`);
  townAdd(box, 'button', '← Kitchen', 'arcadeBack').addEventListener('click', () => { if (typeof toyStop === 'function') toyStop(); showTownKitchen(); });
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const area = townAdd(box, 'div', undefined, 'toyArea kitchenArea');
  const stages = ['gather'];
  if (r.measure) stages.push('measure');
  stages.push('steps', 'safety');
  if (r.scale) stages.push('scale');
  if (r.cook) stages.push('cook');
  let s = 0;
  const next = () => {
    s++;
    if (s >= stages.length) {
      const t = loadTown();
      if (!t.recipes) t.recipes = {};
      t.recipes[r.id] = (t.recipes[r.id] || 0) + 1;
      saveTown(t);
      kitchenWin('cook-' + r.id, r.emoji, `You made ${r.name}! It's in your recipe book.`, r.tip, () => openKitchenCook(id));
      return;
    }
    run();
  };
  const run = () => {
    area.textContent = '';
    const stage = stages[s];
    window.kitchenStage = () => stage;                        // for the tests
    const label = `Step ${s + 1} of ${stages.length}: `;
    setTimeout(() => { if (typeof kkAutoSpeak === 'function' && stage !== 'safety' && stage !== 'scale') kkAutoSpeak(say.textContent); }, 0);
    if (stage === 'gather') kitchenGather(area, say, r, label, next);
    else if (stage === 'measure') kitchenMeasure(area, say, r, label, next);
    else if (stage === 'steps') kitchenSteps(area, say, r, label, next);
    else if (stage === 'safety') kitchenQuestion(area, say, r.safety, label + '🛡️ Safety check', next);
    else if (stage === 'scale') kitchenQuestion(area, say, r.scale, label + '🧮 Kitchen math', next);
    else if (stage === 'cook') kitchenCookIt(area, say, r, label, next);
  };
  run();
}

function kitchenNope(b) { b.classList.remove('townNope'); void b.offsetWidth; b.classList.add('townNope'); }

function kitchenGather(area, say, r, label, next) {
  say.textContent = `${label}🧺 Get the ingredients`;
  const counter = townAdd(area, 'div', '🍽️', 'toyTarget kitchenCounter');
  townAdd(area, 'div', `Tap the ${r.need.length} things this recipe needs.`, 'toyLabel');
  const pantry = townAdd(area, 'div', undefined, 'toyGrid3');
  const got = new Set();
  toyShuffle([...r.need, ...r.extras]).forEach(([emoji, name]) => {
    const b = townAdd(pantry, 'button', undefined, 'kitchenItem');
    townAdd(b, 'span', emoji, 'kitchenItemEmoji');
    townAdd(b, 'span', name);
    b.dataset.name = name;
    b.addEventListener('click', () => {
      if (got.has(name)) return;
      if (!r.need.some(n => n[1] === name)) { kitchenNope(b); say.textContent = `🤔 ${name} isn't in this recipe!`; return; }
      got.add(name);
      b.classList.add('right');
      counter.textContent = '🍽️ ' + r.need.filter(n => got.has(n[1])).map(n => n[0]).join('');
      say.textContent = `${label}🧺 ${got.size} of ${r.need.length}`;
      if (got.size === r.need.length) setTimeout(next, 600);
    });
  });
  window.kitchenNeeds = () => r.need.map(n => n[1]);          // for the tests
}

function kitchenMeasure(area, say, r, label, next) {
  const m = r.measure;
  say.textContent = `${label}📏 Measure ${m.label} of ${m.what}`;
  let total = 0;
  const unit = m.tools === KITCHEN_CUPS ? 'cup' : 'spoon';
  const show = () => {
    if (unit === 'cup') {
      const whole = Math.floor(total / 4), part = ['', '¼', '½', '¾'][total % 4];
      return (whole || !part ? whole : '') + part + (total === 4 ? ' cup' : ' cups');
    }
    const tb = Math.floor(total / 3), tsp = total % 3;
    return [tb ? `${tb} tbsp` : '', tsp ? `${tsp} tsp` : ''].filter(Boolean).join(' + ') || '0';
  };
  townAdd(area, 'div', `${m.emoji} The recipe says: ${m.label}`, 'kitchenRecipeSays');
  const bowl = townAdd(area, 'div', '🥣 0', 'toyTarget kitchenBowl');
  const row = townAdd(area, 'div', undefined, 'toyRow');
  m.tools.forEach(([name, size]) => {
    const b = townAdd(row, 'button', `🥄 ${name}`, 'arcadeGo kitchenTool');
    b.dataset.size = size;
    b.addEventListener('click', () => {
      total += size;
      bowl.textContent = '🥣 ' + show();
      if (total === m.amount) { say.textContent = `✅ Exactly ${m.label}!`; setTimeout(next, 700); }
      else if (total > m.amount) {
        say.textContent = `💦 Too much! That's more than ${m.label}. Pour it back and try again.`;
        total = 0;
        setTimeout(() => { bowl.textContent = '🥣 0'; }, 600);
      }
    });
  });
  if (unit === 'spoon') townAdd(area, 'div', '💡 1 tablespoon = 3 teaspoons', 'bankTip');
  else townAdd(area, 'div', '💡 2 quarter cups = ½ cup, and 2 half cups = 1 cup', 'bankTip');
  window.kitchenMeasureLeft = () => m.amount - total;         // for the tests
}

function kitchenSteps(area, say, r, label, next) {
  say.textContent = `${label}📝 Put the steps in order`;
  const done = townAdd(area, 'ol', undefined, 'kitchenDone');
  const pile = townAdd(area, 'div', undefined, 'kitchenSteps');
  if (typeof kkSpeakButton === 'function') kkSpeakButton(area, () => 'The steps left are: ' + [...pile.querySelectorAll('.kitchenStep')].map(b => b.textContent).join('. '), 'Read the steps');
  let at = 0;
  toyShuffle(r.steps.map((text, i) => [text, i])).forEach(([text, i]) => {
    const b = townAdd(pile, 'button', text, 'kitchenStep');
    b.dataset.i = i;
    b.addEventListener('click', () => {
      if (i !== at) { kitchenNope(b); say.textContent = `🤔 Not yet. What has to happen ${at === 0 ? 'first' : 'next'}?`; return; }
      b.remove();
      townAdd(done, 'li', text);
      at++;
      say.textContent = `${label}📝 ${at} of ${r.steps.length}`;
      if (at === r.steps.length) setTimeout(next, 600);
    });
  });
}

function kitchenQuestion(area, say, q, title, next) {
  say.textContent = title;
  const qBox = townAdd(area, 'div', q.q, 'bankItemName');
  const opts = townAdd(area, 'div', undefined, 'bankOptions');
  const readQ = () => `${q.q} ${[...opts.querySelectorAll('button')].map(b => b.textContent).join('. Or, ')}.`;
  const why = townAdd(area, 'div', '', 'bankWhy');
  toyShuffle(q.options.map((text, i) => [text, i])).forEach(([text, i]) => {
    const b = townAdd(opts, 'button', text, 'bankOption kitchenOption');
    b.dataset.right = i === q.answer ? '1' : '0';
    b.addEventListener('click', () => {
      if (i !== q.answer) { b.classList.add('wrong'); why.textContent = '❌ Not quite. Try again!'; return; }
      b.classList.add('right');
      why.textContent = '✅ ' + q.why;
      if (typeof kkAutoSpeak === 'function') kkAutoSpeak('Right! ' + q.why);
      opts.querySelectorAll('button').forEach(x => { x.disabled = true; });
      townAdd(area, 'button', 'Next ➡️', 'arcadeGo bankNext').addEventListener('click', next);
    });
  });
  if (typeof kkSpeakButton === 'function') { kkSpeakButton(qBox, readQ, 'Read the question'); kkAutoSpeak(readQ()); }
}

// Cooking: the heat bar fills. Tap when it's in the golden zone.
function kitchenCookIt(area, say, r, label, next) {
  say.textContent = `${label}🔥 Cook the ${r.cook.what}: tap when it's in the green zone!`;
  const meter = townAdd(area, 'div', undefined, 'kitchenMeter');
  townAdd(meter, 'div', '', 'kitchenZone');
  const fill = townAdd(meter, 'div', '', 'kitchenFill');
  const words = townAdd(area, 'div', r.cook.raw, 'kitchenWords');
  const b = townAdd(area, 'button', '🍽️ Take it off the heat!', 'arcadeGo toyBig kitchenTake');
  let heat = 0, timer = null;
  const speed = kitchenAge() === 'kitten' ? 0.8 : 1.2;
  const start = () => {
    heat = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      if (!document.body.contains(meter)) { clearInterval(timer); return; }
      heat = Math.min(100, heat + speed);
      fill.style.width = heat + '%';
      words.textContent = heat < 55 ? r.cook.raw : heat <= 78 ? r.cook.done : r.cook.burnt;
    }, 40);
  };
  const take = () => {
    clearInterval(timer);
    if (heat >= 55 && heat <= 78) { say.textContent = `✅ ${r.cook.done}`; b.disabled = true; setTimeout(next, 700); }
    else { say.textContent = heat < 55 ? `😬 ${r.cook.raw}! Let's try again.` : `🔥 ${r.cook.burnt} Let's try again.`; setTimeout(start, 900); }
  };
  b.addEventListener('click', take);
  window.kitchenCookAt = (h) => { heat = h; take(); };       // for the tests
  start();
}

// ---------- 🛒 Shop for a meal on a budget ----------
function openKitchenShop(id) {
  const r = kitchenRecipe(id);
  if (!r) return;
  townView = 'kitchen:shop';
  const kitten = kitchenAge() === 'kitten';
  const box = townBody(`🛒 Shop for ${r.name}`);
  townAdd(box, 'button', '← Kitchen', 'arcadeBack').addEventListener('click', () => showTownKitchen());
  townAdd(box, 'div', kitten ? 'Get everything on the list. Don\'t spend more than your money!'
    : 'Buy everything on the list without going over budget. Store brands are often just as good for less!', 'arcadeHint');
  const cart = {};                 // item name → 'brand' | 'store'
  const treats = new Set();
  const total = () => {
    let sum = 0;
    r.shop.forEach(([, name, brand, store]) => { if (cart[name]) sum += cart[name] === 'brand' ? brand : store; });
    KITCHEN_TREATS.forEach(([, name, price]) => { if (treats.has(name)) sum += kitten ? Math.round(price) : price; });
    return Math.round(sum * 100) / 100;
  };
  const head = townAdd(box, 'div', undefined, 'kitchenBudget');
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const draw = () => {
    head.textContent = `💵 Budget ${kitchenMoney(r.budget)} · 🛒 Cart ${kitchenMoney(total())} · ${total() <= r.budget ? `Left ${kitchenMoney(Math.round((r.budget - total()) * 100) / 100)}` : `⚠️ Over by ${kitchenMoney(Math.round((total() - r.budget) * 100) / 100)}`}`;
    head.classList.toggle('over', total() > r.budget);
  };
  const list = townAdd(box, 'div', undefined, 'kitchenShelf');
  r.shop.forEach(([emoji, name, brand, store]) => {
    const row = townAdd(list, 'div', undefined, 'kitchenShelfRow');
    townAdd(row, 'div', `${emoji} ${name}`, 'kitchenShelfName');
    const pick = (kind, price, text) => {
      const b = townAdd(row, 'button', `${text}\n${kitchenMoney(price)}`, 'kitchenPrice');
      b.dataset.item = name;
      b.dataset.kind = kind;
      b.addEventListener('click', () => {
        cart[name] = cart[name] === kind ? undefined : kind;
        row.querySelectorAll('.kitchenPrice').forEach(x => x.classList.toggle('picked', cart[name] === x.dataset.kind));
        draw();
      });
    };
    pick('brand', brand, '⭐ Name brand');
    pick('store', store, '🏷️ Store brand');
  });
  townAdd(box, 'div', '🍬 Checkout treats (not on your list!)', 'toyLabel');
  const treatRow = townAdd(box, 'div', undefined, 'toyRow');
  KITCHEN_TREATS.forEach(([emoji, name, price]) => {
    const b = townAdd(treatRow, 'button', `${emoji} ${name}\n${kitchenMoney(kitten ? Math.round(price) : price)}`, 'kitchenPrice kitchenTreat');
    b.dataset.treat = name;
    b.addEventListener('click', () => { if (treats.has(name)) treats.delete(name); else treats.add(name); b.classList.toggle('picked', treats.has(name)); draw(); });
  });
  townAdd(box, 'button', '💳 Check out', 'arcadeGo toyBig kitchenCheckout').addEventListener('click', () => {
    const missing = r.shop.filter(([, name]) => !cart[name]);
    if (missing.length) { say.textContent = `📝 You forgot: ${missing.map(m => m[0] + ' ' + m[1]).join(', ')}`; return; }
    const sum = total();
    if (sum > r.budget) {
      say.textContent = `💸 That's ${kitchenMoney(Math.round((sum - r.budget) * 100) / 100)} over your budget. Swap to store brands${treats.size ? ' or put the treats back' : ''}!`;
      return;
    }
    const change = Math.round((r.budget - sum) * 100) / 100;
    const saved = Math.round(r.shop.reduce((s, [, name, brand, store]) => s + (cart[name] === 'store' ? brand - store : 0), 0) * 100) / 100;
    kitchenWin('shop-' + r.id, '🛒', `You bought everything for ${kitchenMoney(sum)} and got ${kitchenMoney(change)} back in change!` +
      (saved > 0 ? ` Store brands saved you ${kitchenMoney(saved)}.` : ''),
      kitten ? 'Make a list before you go to the store, and only buy what\'s on it!'
        : 'Shop with a list, compare store brands, and skip the checkout treats. Stores put them there on purpose!',
      () => openKitchenShop(id));
  });
  window.kitchenShopTotal = total;                            // for the tests
  draw();
}
