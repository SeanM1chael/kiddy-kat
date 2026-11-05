// =====================================================================
// toys.js — 🧸 every toy bought in Kat Town opens a real little game
// The first win of each toy each day gives +1 ⭐ (it counts toward the
// Arcade's daily star limit, so it can't be farmed). Uses town.js helpers.
// =====================================================================

const TOY_GAMES = {
  puzzle: { title: '🧩 Puzzle', how: 'Tap two pieces to swap them. Make the picture match!', start: toyPuzzle },
  blocks: { title: '🧱 Building blocks', how: 'Tap DROP when the block is over the tower. Stack 8 high!', start: toyBlocks },
  soccer: { title: '⚽ Soccer ball', how: 'Watch the goalie, then kick where they are NOT. Score 3 goals!', start: toySoccer },
  art: { title: '🎨 Art set', how: 'Pick a color, then tap every square with its number.', start: toyArt },
  plush: { title: '🧸 Teddy\'s tea party', how: 'Flip two cards at a time. Find all the matching pairs!', start: toyPlush },
  rccar: { title: '🏎️ Remote control car', how: 'Tap ⬅️ and ➡️ to dodge the cones. Pass 20 rows!', start: toyCar },
  science: { title: '🔬 Science kit', how: 'Mix two potions to make the color shown.', start: toyScience },
  books: { title: '📚 Book set', how: 'Tap the letters in order to spell the word.', start: toyBooks },
  game: { title: '🎲 Board game', how: 'Roll the dice and race Kat to the 🏁. Ladders go up, slides go down!', start: toyBoard },
  slime: { title: '🟢 Slime kit', how: 'Watch the recipe, then tap the same ingredients in the same order.', start: toySlime }
};

let toyTimers = [];
let toyId = null;

function toyStop() {
  toyTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
  toyTimers = [];
}
function toyLater(fn, ms) { const t = setTimeout(() => { if (toyActive()) fn(); }, ms); toyTimers.push(t); return t; }
function toyEvery(fn, ms) { const t = setInterval(() => { if (toyActive()) fn(); else toyStop(); }, ms); toyTimers.push(t); return t; }
function toyActive() { return typeof townView !== 'undefined' && townView === 'toy:' + toyId && document.getElementById('town').style.display !== 'none'; }
function toyKid() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }   // kitten, tiger, lion
function toyShuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Opens a toy's game. Returns false if the toy has no game.
function openToy(id) {
  const game = TOY_GAMES[id];
  if (!game) return false;
  toyStop();
  toyId = id;
  townView = 'toy:' + id;
  const box = townBody(game.title);
  townAdd(box, 'button', '← My House', 'arcadeBack').addEventListener('click', () => { toyStop(); showTownHome(); });
  const how = townAdd(box, 'div', game.how, 'arcadeHint');
  if (typeof kkSpeakButton === 'function') { kkSpeakButton(how, game.how, 'How to play'); kkAutoSpeak(game.how); }
  const say = townAdd(box, 'div', '', 'arcadeMessage toySay');
  const area = townAdd(box, 'div', undefined, 'toyArea toy-' + id);
  game.start(area, say);
  return true;
}

// A win: +1 ⭐ the first time this toy is won today (inside the Arcade's daily limit)
function toyWin(id, text) {
  toyStop();
  const t = loadTown();
  const today = new Date().toDateString();
  if (!t.toyWins || t.toyWins.date !== today) t.toyWins = { date: today, won: [] };
  let note = '';
  if (!t.toyWins.won.includes(id)) {
    t.toyWins.won.push(id);
    const given = typeof arcadeStars === 'function' ? arcadeStars(1) : 0;
    note = given ? ' +1 ⭐' : (typeof ARCADE_DAILY_STARS !== 'undefined' ? ' (Arcade stars are maxed for today, so this one is just for fun!)' : '');
  } else note = ' (You already got today\'s ⭐ for this toy. Playing for fun!)';
  t.toyPlays = (t.toyPlays || 0) + 1;
  saveTown(t);
  townPop(TOWN_STORES.toys.items.find(i => i[0] === id)[1], `🎉 ${text}${note}`, [['🔁 Play again', () => openToy(id)], ['🏠 My House', () => showTownHome()]], 'townBounceIn');
}
function toyTryAgain(id, text) {
  toyStop();
  townPop('💪', text, [['🔁 Try again', () => openToy(id)], ['🏠 My House', () => showTownHome()]], 'townNope');
}

// ---------- 🧩 Puzzle: swap pieces until the picture matches ----------
const TOY_PUZZLES = [['🌞', '☁️', '🌈', '🌳', '🏠', '🌳', '🌷', '🐶', '🌷'], ['🌙', '⭐', '🚀', '🪐', '👽', '⭐', '🌍', '🛸', '☄️'],
                     ['🐟', '🌊', '🐠', '🐙', '🫧', '🦀', '🪸', '🐢', '🐚']];
function toyPuzzle(area, say) {
  const goal = TOY_PUZZLES[Math.floor(Math.random() * TOY_PUZZLES.length)];
  let order = toyShuffle(goal.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [1, 0, ...order.slice(2)];
  let picked = null;
  let moves = 0;
  townAdd(area, 'div', 'Make it look like this:', 'toyLabel');
  const sample = townAdd(area, 'div', undefined, 'toyGrid3 toySmall');
  goal.forEach(e => townAdd(sample, 'div', e, 'toyCell'));
  const board = townAdd(area, 'div', undefined, 'toyGrid3');
  const draw = () => {
    board.textContent = '';
    order.forEach((piece, i) => {
      const b = townAdd(board, 'button', goal[piece], 'toyCell toyPiece' + (picked === i ? ' picked' : '') + (piece === i ? ' right' : ''));
      b.dataset.i = i;
      b.addEventListener('click', () => {
        if (picked === null) { picked = i; draw(); return; }
        if (picked !== i) { [order[picked], order[i]] = [order[i], order[picked]]; moves++; }
        picked = null;
        draw();
        if (order.every((v, k) => v === k)) toyLater(() => toyWin('puzzle', `Puzzle done in ${moves} moves!`), 300);
      });
    });
  };
  window.toyPuzzleState = () => order;          // for the tests
  say.textContent = 'Green pieces are in the right spot.';
  draw();
}

// ---------- 🧱 Building blocks: drop each block on the tower ----------
function toyBlocks(area, say) {
  const need = 8;
  const width = 34;                           // % of the play area
  let stack = [33];                           // the base block's left edge (%)
  let x = 0, dir = 1, speed = toyKid() === 'kitten' ? 1.2 : 1.8;
  const field = townAdd(area, 'div', undefined, 'toyBlocksField');
  const mover = townAdd(field, 'div', '', 'toyBlock moving');
  mover.style.width = width + '%';
  const drawStack = () => {
    field.querySelectorAll('.toyBlock.placed').forEach(b => b.remove());
    stack.forEach((left, i) => {
      const b = townAdd(field, 'div', '', 'toyBlock placed');
      b.style.width = width + '%';
      b.style.left = left + '%';
      b.style.bottom = (i * 11) + '%';
      b.style.background = ['#fa5252', '#fd7e14', '#fab005', '#40c057', '#228be6', '#7950f2', '#e64980', '#15aabf', '#82c91e'][i % 9];
    });
    mover.style.bottom = (stack.length * 11) + '%';
  };
  const drop = townAdd(area, 'button', '⬇️ DROP', 'arcadeGo toyBig');
  const tryDrop = () => {
    const top = stack[stack.length - 1];
    if (Math.abs(x - top) <= width * 0.6) {
      stack.push(x);
      drawStack();
      speed += 0.25;
      if (stack.length - 1 >= need) { toyWin('blocks', `Your tower is ${need} blocks tall!`); return; }
      say.textContent = `🧱 ${stack.length - 1} of ${need}`;
    } else {
      toyTryAgain('blocks', '💥 Crash! The block missed the tower.');
    }
  };
  drop.addEventListener('click', tryDrop);
  window.toyBlocksDrop = (at) => { x = at; tryDrop(); };          // for the tests
  toyEvery(() => {
    x += dir * speed;
    if (x <= 0) { x = 0; dir = 1; }
    if (x >= 100 - width) { x = 100 - width; dir = -1; }
    mover.style.left = x + '%';
  }, 30);
  say.textContent = `🧱 0 of ${need}`;
  drawStack();
}

// ---------- ⚽ Soccer: kick where the goalie isn't ----------
function toySoccer(area, say) {
  let goalie = 1, goals = 0, shots = 0;
  const need = 3, max = 6;
  const goal = townAdd(area, 'div', undefined, 'toyGoal');
  const spots = [0, 1, 2].map(i => townAdd(goal, 'div', '', 'toyGoalSpot'));
  const draw = () => spots.forEach((s, i) => { s.textContent = i === goalie ? '🧤' : ''; });
  const kicks = townAdd(area, 'div', undefined, 'toyRow');
  ['⬅️ Left', '⬆️ Middle', '➡️ Right'].forEach((label, i) => {
    townAdd(kicks, 'button', label, 'arcadeGo toyKick').addEventListener('click', () => {
      shots++;
      if (i !== goalie) { goals++; spots[i].textContent = '⚽'; say.textContent = `⚽ GOAL! ${goals} of ${need} (${max - shots} kicks left)`; }
      else say.textContent = `🧤 Saved! ${goals} of ${need} (${max - shots} kicks left)`;
      if (goals >= need) { toyLater(() => toyWin('soccer', `You scored ${goals} goals!`), 400); return; }
      if (shots >= max) toyLater(() => toyTryAgain('soccer', `${goals} goals. So close! Try again.`), 400);
    });
  });
  window.toySoccerGoalie = () => goalie;           // for the tests
  toyEvery(() => { goalie = Math.floor(Math.random() * 3); draw(); }, toyKid() === 'kitten' ? 1100 : 800);
  say.textContent = `Score ${need} goals in ${max} kicks!`;
  draw();
}

// ---------- 🎨 Art: color by number ----------
const TOY_ART = [            // 4 across, 5 down; each digit is a color number (0 = background)
  { name: 'a heart', colors: ['#ffffff', '#fa5252', '#ffc9c9'], cells: '1001' + '1221' + '1111' + '0110' + '0000' },
  { name: 'a flower', colors: ['#d3f9d8', '#fab005', '#e64980', '#2b8a3e'], cells: '0220' + '2112' + '0220' + '0330' + '0330' },
  { name: 'a sunny day', colors: ['#a5d8ff', '#fab005', '#ffffff', '#51cf66'], cells: '1100' + '1100' + '0022' + '0000' + '3333' }
];
function toyArt(area, say) {
  const pic = TOY_ART[Math.floor(Math.random() * TOY_ART.length)];
  const cells = pic.cells.split('').map(Number);          // 5 rows of 4
  const painted = cells.map(() => null);
  let brush = 1;
  const pal = townAdd(area, 'div', undefined, 'toyRow');
  const brushes = pic.colors.map((c, i) => {
    const b = townAdd(pal, 'button', String(i + 1), 'toyBrush' + (i === brush ? ' picked' : ''));
    b.style.background = c;
    b.addEventListener('click', () => { brush = i; brushes.forEach((x, k) => x.classList.toggle('picked', k === i)); });
    return b;
  });
  const grid = townAdd(area, 'div', undefined, 'toyGrid4');
  cells.forEach((n, i) => {
    const c = townAdd(grid, 'button', String(n + 1), 'toyCell toyPaint');
    c.dataset.i = i;
    c.addEventListener('click', () => {
      painted[i] = brush;
      c.style.background = pic.colors[brush];
      c.textContent = brush === n ? '' : String(n + 1);
      if (painted.every((p, k) => p === cells[k])) toyLater(() => toyWin('art', `You painted ${pic.name}!`), 300);
    });
  });
  window.toyArtCells = () => cells;               // for the tests
  say.textContent = 'Tap a number color, then tap its squares.';
}

// ---------- 🧸 Teddy's tea party: memory match ----------
function toyPlush(area, say) {
  const pairs = toyKid() === 'kitten' ? 3 : 4;
  const faces = toyShuffle(['🧸', '🫖', '🍪', '🧁', '🍓', '🍰']).slice(0, pairs);
  const deck = toyShuffle([...faces, ...faces]);
  const open = [], done = new Set();
  let busy = false, tries = 0;
  const grid = townAdd(area, 'div', undefined, 'toyGrid4');
  const cards = deck.map((face, i) => {
    const b = townAdd(grid, 'button', '❔', 'toyCell toyCard');
    b.dataset.i = i;
    b.addEventListener('click', () => {
      if (busy || done.has(i) || open.includes(i)) return;
      open.push(i);
      b.textContent = face;
      if (open.length < 2) return;
      tries++;
      const [a, c] = open;
      if (deck[a] === deck[c]) {
        done.add(a); done.add(c); open.length = 0;
        cards[a].classList.add('right'); cards[c].classList.add('right');
        say.textContent = `💕 A match! ${done.size / 2} of ${pairs}`;
        if (done.size === deck.length) toyLater(() => toyWin('plush', `Tea party ready in ${tries} tries!`), 400);
      } else {
        busy = true;
        toyLater(() => { cards[a].textContent = '❔'; cards[c].textContent = '❔'; open.length = 0; busy = false; }, 700);
      }
    });
    return b;
  });
  window.toyPlushDeck = () => deck;               // for the tests
  say.textContent = `Find ${pairs} pairs for Teddy's tea party.`;
}

// ---------- 🏎️ Remote control car: dodge the cones ----------
function toyCar(area, say) {
  const lanes = 3, rows = 6, need = 20;
  let car = 1, passed = 0, grid = [];             // grid[row] = lane with a cone, or -1
  for (let r = 0; r < rows; r++) grid.push(-1);
  const road = townAdd(area, 'div', undefined, 'toyRoad');
  const draw = () => {
    road.textContent = '';
    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < lanes; l++) {
        const isCar = r === rows - 1 && l === car;
        townAdd(road, 'div', isCar ? '🏎️' : grid[r] === l ? '🚧' : '', 'toyLane');
      }
    }
  };
  let ticks = 0;
  const tick = () => {
    ticks++;
    grid.pop();
    grid.unshift(Math.random() < 0.75 ? Math.floor(Math.random() * lanes) : -1);
    if (grid[rows - 1] === car) { draw(); toyTryAgain('rccar', `💥 Bonk! You passed ${passed} rows.`); return; }
    passed = Math.max(0, ticks - (rows - 1));
    say.textContent = `🏁 ${Math.min(passed, need)} of ${need}`;
    draw();
    if (passed >= need) toyWin('rccar', 'You dodged every cone! 🏁');
  };
  const controls = townAdd(area, 'div', undefined, 'toyRow');
  townAdd(controls, 'button', '⬅️', 'arcadeGo toyBig').addEventListener('click', () => { car = Math.max(0, car - 1); draw(); });
  townAdd(controls, 'button', '➡️', 'arcadeGo toyBig').addEventListener('click', () => { car = Math.min(lanes - 1, car + 1); draw(); });
  window.toyCarState = () => ({ car, grid: grid.slice(), passed });   // for the tests
  window.toyCarTick = tick;
  toyEvery(tick, toyKid() === 'kitten' ? 750 : 550);
  say.textContent = `🏁 0 of ${need}`;
  draw();
}

// ---------- 🔬 Science kit: mix two potions ----------
const TOY_MIXES = [['🟣', 'purple', ['red', 'blue'], 'Red and blue make purple!'], ['🟢', 'green', ['blue', 'yellow'], 'Blue and yellow make green!'],
                   ['🟠', 'orange', ['red', 'yellow'], 'Red and yellow make orange!']];
const TOY_POTIONS = { red: '🔴', blue: '🔵', yellow: '🟡' };
function toyScience(area, say) {
  const rounds = toyShuffle(TOY_MIXES);
  let round = 0, chosen = [];
  const target = townAdd(area, 'div', '', 'toyTarget');
  const flask = townAdd(area, 'div', '🧪', 'toyTarget toyFlask');
  const row = townAdd(area, 'div', undefined, 'toyRow');
  const show = () => {
    const [emoji, name] = rounds[round];
    target.textContent = `Make ${emoji} ${name}`;
    flask.textContent = '🧪 ' + chosen.map(c => TOY_POTIONS[c]).join(' + ');
  };
  Object.entries(TOY_POTIONS).forEach(([key, emoji]) => {
    const b = townAdd(row, 'button', emoji, 'toyBrush toyPotion');
    b.dataset.color = key;
    b.addEventListener('click', () => {
      if (chosen.includes(key)) return;
      chosen.push(key);
      show();
      if (chosen.length < 2) return;
      const want = rounds[round][2];
      if (want.every(c => chosen.includes(c))) {
        say.textContent = `✨ ${rounds[round][3]}`;
        round++;
        chosen = [];
        if (round >= rounds.length) { toyLater(() => toyWin('science', 'You mixed every color! 🔬'), 600); return; }
        toyLater(show, 900);
      } else {
        say.textContent = '💨 Fizz! That made a different color. Try again!';
        chosen = [];
        toyLater(show, 700);
      }
    });
  });
  window.toyScienceWant = () => rounds[round] && rounds[round][2];   // for the tests
  show();
}

// ---------- 📚 Book set: spell the word ----------
const TOY_WORDS = {
  kitten: [['🐱', 'CAT'], ['🐶', 'DOG'], ['☀️', 'SUN'], ['🐟', 'FISH'], ['🚌', 'BUS'], ['🍰', 'CAKE'], ['🐸', 'FROG'], ['⭐', 'STAR']],
  tiger: [['🚀', 'ROCKET'], ['🌋', 'VOLCANO'], ['🐯', 'TIGER'], ['🦖', 'DINOSAUR'], ['🎸', 'GUITAR'], ['🪐', 'PLANET'], ['🏰', 'CASTLE'], ['🌈', 'RAINBOW']],
  lion: [['🔭', 'TELESCOPE'], ['🧬', 'SCIENCE'], ['🏛️', 'MUSEUM'], ['🧭', 'ADVENTURE'], ['🎭', 'THEATER'], ['🦋', 'BUTTERFLY'], ['🌍', 'GEOGRAPHY'], ['💡', 'INVENTION']]
};
function toyBooks(area, say) {
  const list = toyShuffle(TOY_WORDS[toyKid()] || TOY_WORDS.tiger).slice(0, 3);
  let w = 0, typed = '';
  const pic = townAdd(area, 'div', '', 'toyTarget');
  const slots = townAdd(area, 'div', '', 'toySpell');
  const letters = townAdd(area, 'div', undefined, 'toyRow toyLetters');
  const show = () => {
    const [emoji, word] = list[w];
    pic.textContent = emoji;
    typed = '';
    slots.textContent = '_ '.repeat(word.length).trim();
    letters.textContent = '';
    let mixed = toyShuffle(word.split(''));
    if (mixed.join('') === word && word.length > 1) mixed = mixed.reverse();
    mixed.forEach(ch => {
      const b = townAdd(letters, 'button', ch, 'toyLetter');
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (word[typed.length] !== ch) { b.classList.remove('townNope'); void b.offsetWidth; b.classList.add('townNope'); return; }
        b.disabled = true;
        typed += ch;
        slots.textContent = (typed + '_'.repeat(word.length - typed.length)).split('').join(' ');
        if (typed === word) {
          say.textContent = `📖 ${word}!`;
          w++;
          if (w >= list.length) { toyLater(() => toyWin('books', 'You spelled every word! 📚'), 500); return; }
          toyLater(show, 800);
        }
      });
    });
    say.textContent = `📖 Word ${w + 1} of ${list.length}`;
  };
  window.toyBooksWord = () => list[w] && list[w][1];   // for the tests
  show();
}

// ---------- 🎲 Board game: race Kat to the finish ----------
const TOY_BOARD_SIZE = 16;
const TOY_JUMPS = { 3: 8, 6: 2, 9: 13, 12: 5, 14: 10 };          // ladders up, slides down
function toyBoard(area, say) {
  let me = 0, kat = 0, busy = false;
  const board = townAdd(area, 'div', undefined, 'toyBoardGrid');
  const draw = () => {
    board.textContent = '';
    for (let i = 0; i < TOY_BOARD_SIZE; i++) {
      const jump = TOY_JUMPS[i];
      const mark = i === TOY_BOARD_SIZE - 1 ? '🏁' : jump !== undefined ? (jump > i ? '🪜' : '🛝') : '';
      const who = (me === i ? '🙂' : '') + (kat === i ? '🐱' : '');
      townAdd(board, 'div', who || mark || String(i + 1), 'toyCell toySpace' + (who ? ' here' : ''));
    }
  };
  const move = (pos, roll) => {
    let p = Math.min(TOY_BOARD_SIZE - 1, pos + roll);
    if (TOY_JUMPS[p] !== undefined) p = TOY_JUMPS[p];
    return p;
  };
  const rollBtn = townAdd(area, 'button', '🎲 Roll', 'arcadeGo toyBig');
  rollBtn.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    const r1 = 1 + Math.floor(Math.random() * 6);
    me = move(me, r1);
    draw();
    if (me === TOY_BOARD_SIZE - 1) { say.textContent = `You rolled ${r1}!`; toyLater(() => toyWin('game', 'You beat Kat to the finish! 🏁'), 500); return; }
    toyLater(() => {
      const r2 = 1 + Math.floor(Math.random() * 6);
      kat = move(kat, r2);
      draw();
      say.textContent = `You rolled ${r1}. Kat rolled ${r2}.`;
      if (kat === TOY_BOARD_SIZE - 1) { toyLater(() => toyTryAgain('game', '🐱 Kat won this time! Rematch?'), 500); return; }
      busy = false;
    }, 600);
  });
  window.toyBoardMove = move;                      // for the tests
  say.textContent = 'You go first!';
  draw();
}

// ---------- 🟢 Slime kit: remember the recipe ----------
const TOY_SLIME = [['glue', '🧴', 'Glue'], ['water', '💧', 'Water'], ['color', '🎨', 'Color'], ['glitter', '✨', 'Glitter']];
function toySlime(area, say) {
  const need = toyKid() === 'kitten' ? 4 : 5;
  const recipe = [];
  let step = 0, watching = true;
  const bowl = townAdd(area, 'div', '🥣', 'toyTarget toyBowl');
  const row = townAdd(area, 'div', undefined, 'toyGrid2');
  const buttons = TOY_SLIME.map(([key, emoji, name], i) => {
    const b = townAdd(row, 'button', `${emoji} ${name}`, 'toySlimeBtn');
    b.dataset.key = key;
    b.addEventListener('click', () => {
      if (watching) return;
      if (recipe[step] !== i) { toyTryAgain('slime', `🫠 Oops! The slime got runny. You remembered ${recipe.length - 1} steps.`); return; }
      bowl.textContent = '🥣 ' + emoji;
      step++;
      if (step === recipe.length) {
        if (recipe.length >= need) { toyLater(() => toyWin('slime', 'Perfect slime! 💚'), 400); return; }
        say.textContent = '💚 Yes! Watch the next recipe...';
        toyLater(nextRound, 800);
      }
    });
    return b;
  });
  const flash = (k) => {
    if (k >= recipe.length) { watching = false; step = 0; say.textContent = `Your turn! Tap ${recipe.length} ingredient${recipe.length === 1 ? '' : 's'}.`; bowl.textContent = '🥣'; return; }
    const b = buttons[recipe[k]];
    b.classList.add('lit');
    bowl.textContent = '🥣 ' + TOY_SLIME[recipe[k]][1];
    toyLater(() => { b.classList.remove('lit'); toyLater(() => flash(k + 1), 200); }, 550);
  };
  const nextRound = () => {
    recipe.push(Math.floor(Math.random() * TOY_SLIME.length));
    watching = true;
    say.textContent = `👀 Watch the recipe (${recipe.length} of ${need})...`;
    flash(0);
  };
  window.toySlimeState = () => ({ recipe: recipe.slice(), watching });   // for the tests
  toyLater(nextRound, 500);
}
