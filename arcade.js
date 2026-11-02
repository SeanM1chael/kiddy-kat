// =====================================================================
// arcade.js — 🕹️ Arcade: fun games that still build skills
//   🤖 Code Quest  — program your animal through a maze (real coding ideas:
//                    steps in order, repeats, fewer blocks = better code)
//   🔤 Daily Word  — one new word a day, the same for the whole family
//                    (kittens get an easier 4-letter word with a picture hint)
//   🃏 Memory Match — flip cards to find the pairs
// Stars: up to ARCADE_DAILY_STARS a day from the Arcade, so it can't replace
// lists and practice. After that, games are just for fun.
// =====================================================================

const ARCADE_DAILY_STARS = 10;

function arcadeDayKey(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadArcade() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem('kiddyKatArcade') || 'null'); } catch (err) {}
  if (!a || typeof a !== 'object') a = {};
  if (a.date !== arcadeDayKey()) { a.date = arcadeDayKey(); a.stars = 0; a.memoryWins = 0; }
  a.code = a.code || {};                 // level number → best rating (1-3)
  a.memoryBest = a.memoryBest || {};     // size → fewest moves
  return a;
}
function saveArcade(a) { localStorage.setItem('kiddyKatArcade', JSON.stringify(a)); }

// Gives stars, but no more than the daily Arcade limit. Returns how many were given.
function arcadeStars(n) {
  const a = loadArcade();
  const give = Math.max(0, Math.min(n, ARCADE_DAILY_STARS - a.stars));
  if (give > 0) {
    a.stars += give;
    saveArcade(a);
    if (typeof addStars === 'function') addStars(give);
    if (typeof leagueRecord === 'function') leagueRecord('practice', give);
  }
  return give;
}

function arcadeStarNote(given, wanted) {
  if (given > 0) return `+${given} ⭐`;
  if (wanted > 0) return `Arcade stars are maxed for today (${ARCADE_DAILY_STARS} ⭐). Playing just for fun!`;
  return '';
}

function arcadeAdd(parent, tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  parent.appendChild(el);
  return el;
}

function arcadeTheme() { return typeof animal !== 'undefined' && animal ? animal.theme : 'kitten'; }
function arcadeFace() { return { kitten: '🐱', tiger: '🐯', lion: '🦁', eagle: '🦅' }[arcadeTheme()] || '🐱'; }

// ---------- The Arcade menu ----------
function openArcade() {
  document.getElementById('arcade').style.display = 'block';
  showArcadeMenu();
}

function closeArcade() {
  if (typeof fgStopPoll === 'function') fgStopPoll();
  clearTimeout(codeRun.timer);
  codeRun.running = false;
  document.getElementById('arcade').style.display = 'none';
}

function arcadeBody(title) {
  const box = document.getElementById('arcadeBody');
  box.textContent = '';
  document.getElementById('arcadeTitle').textContent = title;
  return box;
}

function arcadeBack(box) {
  arcadeAdd(box, 'button', '← Arcade', 'arcadeBack').addEventListener('click', showArcadeMenu);
}

function showArcadeMenu() {
  if (typeof fgStopPoll === 'function') fgStopPoll();
  clearTimeout(codeRun.timer);
  codeRun.running = false;
  const box = arcadeBody('🕹️ Arcade');
  const a = loadArcade();
  arcadeAdd(box, 'div', a.stars >= ARCADE_DAILY_STARS
    ? `⭐ You earned all ${ARCADE_DAILY_STARS} Arcade stars today! Keep playing for fun.`
    : `⭐ ${ARCADE_DAILY_STARS - a.stars} Arcade stars left to earn today`, 'arcadeHint');
  const word = loadWordGame();
  const levels = codeLevels().length;
  const solved = Object.keys(a.code).length;
  [
    ['🤖', 'Code Quest', `Program your ${arcadeFace()} through the maze · ${solved} of ${levels} levels`, openCodeQuest],
    ['🔤', 'Daily Word', word.done ? (word.won ? `✅ Solved in ${word.guesses.length}! New word tomorrow.` : '❌ Try again tomorrow!') : 'A new word every day, the same for the whole family', openWordGame],
    ['🃏', 'Memory Match', 'Flip the cards and find the pairs', openMemory],
    ['🎲', 'Family games', typeof fgMyTurns === 'function' && fgMyTurns() ? `👉 ${fgMyTurns()} game${fgMyTurns() === 1 ? '' : 's'} waiting for your move!` : 'Tic-tac-toe and Connect Four against your family',
     () => { if (typeof openFamilyGames === 'function') openFamilyGames(); }]
  ].forEach(([emoji, name, note, open]) => {
    const card = arcadeAdd(box, 'button', undefined, 'arcadeGame');
    arcadeAdd(card, 'span', emoji, 'arcadeGameEmoji');
    const words = arcadeAdd(card, 'span');
    arcadeAdd(words, 'b', name);
    arcadeAdd(words, 'span', note, 'arcadeGameNote');
    card.addEventListener('click', open);
  });
}

// =====================================================================
// 🤖 Code Quest
// Map: S start, G goal, # wall, * star to collect, . floor
// =====================================================================
const CODE_LEVELS = [                       // easiest first (fewest blocks needed)
  ['S...G'],
  ['S..', '..#', '#.G'],
  ['S.#..', '..#.G', '.....'],
  ['S*..', '##.#', 'G...'],
  ['S...#', '###.#', '*...#', '.####', '....G'],
  ['S.#G', '..#.', '#...', '*.##'],
  ['S.*.#.', '#.#...', '..#.#.', '.##.#.', '.*..#G'],
  ['S..#...', '##.#.#.', '*..#.#.', '.###.#.', '...*.#G'],
  ['S.....#', '#####.#', '*.....#', '.######', '......G'],
  ['S.#*...', '..#.##.', '#...#..', '..#.#.#', '*.#...G'],
  ['S#*....', '.#.###.', '.#...#.', '.###.#.', '.....#.', '#*.#...', '..##.#G'],
  ['S#....', '.#.##.', '.#.*#.', '...##.', '##....', 'G..##*']
];

function codeLevels() {
  // Kittens get the first 8 levels (bigger mazes are tricky at 7); everyone else gets all
  return arcadeTheme() === 'kitten' ? CODE_LEVELS.slice(0, 8) : CODE_LEVELS;
}

const CODE_DIRS = { up: [-1, 0, '⬆️'], down: [1, 0, '⬇️'], left: [0, -1, '⬅️'], right: [0, 1, '➡️'] };
let codeRun = { level: 0, program: [], running: false, timer: null };

function codeParse(rows) {
  const map = { rows: rows.length, cols: rows[0].length, start: null, goal: null, walls: new Set(), stars: [] };
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === 'S') map.start = [r, c];
    if (ch === 'G') map.goal = [r, c];
    if (ch === '#') map.walls.add(r + ',' + c);
    if (ch === '*') map.stars.push(r + ',' + c);
  }));
  return map;
}

function codeOpen(map, r, c) { return r >= 0 && c >= 0 && r < map.rows && c < map.cols && !map.walls.has(r + ',' + c); }

// Fewest blocks to collect every star and reach the goal (each block: one direction, 1-4 steps)
function codePar(map) {
  const full = (1 << map.stars.length) - 1;
  const key = (r, c, m) => `${r},${c},${m}`;
  let frontier = [[map.start[0], map.start[1], 0]];
  const seen = new Set([key(...frontier[0])]);
  for (let blocks = 1; blocks <= 30 && frontier.length; blocks++) {
    const next = [];
    for (const [r0, c0, m0] of frontier) {
      for (const [dr, dc] of Object.values(CODE_DIRS)) {
        let r = r0, c = c0, m = m0;
        for (let n = 1; n <= 4; n++) {
          r += dr; c += dc;
          if (!codeOpen(map, r, c)) break;
          const s = map.stars.indexOf(r + ',' + c);
          if (s >= 0) m |= 1 << s;
          if (m === full && r === map.goal[0] && c === map.goal[1]) return blocks;
          const k = key(r, c, m);
          if (!seen.has(k)) { seen.add(k); next.push([r, c, m]); }
        }
      }
    }
    frontier = next;
  }
  return 99;
}

function openCodeQuest() {
  const box = arcadeBody('🤖 Code Quest');
  arcadeBack(box);
  arcadeAdd(box, 'div', `Build a program with arrow blocks to get your ${arcadeFace()} to the 🏁. Tap a block to repeat it (×2, ×3, ×4). ` +
                        'Grab every ⭐ and use as few blocks as you can for 3 stars!', 'arcadeHint');
  const a = loadArcade();
  const grid = arcadeAdd(box, 'div', undefined, 'codeLevels');
  codeLevels().forEach((rows, i) => {
    const best = a.code[i + 1] || 0;
    const open = i === 0 || a.code[i];                 // finish a level to open the next one
    const b = arcadeAdd(grid, 'button', open ? `${i + 1}\n${'⭐'.repeat(best) || '·'}` : '🔒', 'codeLevel' + (best ? ' done' : ''));
    b.disabled = !open;
    b.addEventListener('click', () => playCodeLevel(i));
  });
}

function playCodeLevel(i) {
  codeRun = { level: i, program: [], running: false, timer: null };
  drawCodeLevel();
}

function drawCodeLevel(pos, got, bonk) {
  const rows = codeLevels()[codeRun.level];
  const map = codeParse(rows);
  const box = arcadeBody(`🤖 Level ${codeRun.level + 1}`);
  const back = arcadeAdd(box, 'button', '← Levels', 'arcadeBack');
  back.addEventListener('click', () => { clearTimeout(codeRun.timer); codeRun.running = false; openCodeQuest(); });
  const at = pos || map.start;
  const collected = got || new Set();
  const board = arcadeAdd(box, 'div', undefined, 'codeBoard');
  board.style.gridTemplateColumns = `repeat(${map.cols}, 1fr)`;
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const k = r + ',' + c;
      let show = '';
      if (map.walls.has(k)) show = '🌳';
      else if (map.stars.includes(k) && !collected.has(k)) show = '⭐';
      if (r === map.goal[0] && c === map.goal[1]) show = '🏁';
      if (r === at[0] && c === at[1]) show = bonk ? '💥' : arcadeFace();
      arcadeAdd(board, 'div', show, 'codeCell' + (map.walls.has(k) ? ' wall' : ''));
    }
  }
  const par = codePar(map);
  arcadeAdd(box, 'div', `🎯 Best possible: ${par} block${par === 1 ? '' : 's'}${map.stars.length ? ' (with every ⭐)' : ''}`, 'arcadeHint');

  // The program
  const prog = arcadeAdd(box, 'div', undefined, 'codeProgram');
  if (!codeRun.program.length) arcadeAdd(prog, 'span', 'Your program is empty. Tap the arrows below.', 'arcadeHint');
  codeRun.program.forEach((step, n) => {
    const b = arcadeAdd(prog, 'button', `${CODE_DIRS[step.dir][2]}${step.times > 1 ? '×' + step.times : ''}`, 'codeBlock' + (codeRun.active === n ? ' active' : ''));
    b.disabled = codeRun.running;
    b.addEventListener('click', () => { step.times = step.times % 4 + 1; drawCodeLevel(); });
  });

  const pad = arcadeAdd(box, 'div', undefined, 'codePad');
  [['up', '⬆️'], ['left', '⬅️'], ['right', '➡️'], ['down', '⬇️']].forEach(([dir, label]) => {
    const b = arcadeAdd(pad, 'button', label, 'codeArrow');
    b.disabled = codeRun.running || codeRun.program.length >= 20;
    b.addEventListener('click', () => { codeRun.program.push({ dir: dir, times: 1 }); drawCodeLevel(); });
  });
  const tools = arcadeAdd(box, 'div', undefined, 'codeTools');
  const undo = arcadeAdd(tools, 'button', '⌫ Undo', 'arcadeSmall');
  undo.disabled = codeRun.running || !codeRun.program.length;
  undo.addEventListener('click', () => { codeRun.program.pop(); drawCodeLevel(); });
  const clear = arcadeAdd(tools, 'button', '🗑️ Clear', 'arcadeSmall');
  clear.disabled = codeRun.running || !codeRun.program.length;
  clear.addEventListener('click', () => { codeRun.program = []; drawCodeLevel(); });
  const run = arcadeAdd(tools, 'button', codeRun.running ? '⏳ Running...' : '▶️ Run', 'arcadeGo');
  run.disabled = codeRun.running || !codeRun.program.length;
  run.addEventListener('click', () => runCode(map, par));
  arcadeAdd(box, 'div', codeRun.message || '', 'arcadeMessage');
}

function runCode(map, par) {
  // Unroll the program into single steps, remembering which block each step came from
  const steps = [];
  codeRun.program.forEach((s, n) => { for (let t = 0; t < s.times; t++) steps.push([s.dir, n]); });
  let pos = map.start.slice();
  const got = new Set();
  let i = 0;
  codeRun.running = true;
  codeRun.message = '';
  const tick = () => {
    if (!codeRun.running) return;
    if (i >= steps.length) {                         // program finished but not at the goal
      codeRun.running = false;
      codeRun.active = undefined;
      codeRun.message = '🤔 The program ended before the 🏁. Add more blocks and try again!';
      drawCodeLevel(pos, got);
      return;
    }
    const [dir, n] = steps[i++];
    codeRun.active = n;
    const [dr, dc] = CODE_DIRS[dir];
    const r = pos[0] + dr, c = pos[1] + dc;
    if (!codeOpen(map, r, c)) {
      codeRun.running = false;
      codeRun.message = `💥 Bonk! Block ${n + 1} ran into ${r < 0 || c < 0 || r >= map.rows || c >= map.cols ? 'the edge' : 'a tree'}. Fix it and run again.`;
      drawCodeLevel(pos, got, true);
      return;
    }
    pos = [r, c];
    if (map.stars.includes(r + ',' + c)) got.add(r + ',' + c);
    if (r === map.goal[0] && c === map.goal[1]) {
      codeRun.running = false;
      codeRun.active = undefined;
      codeWin(map, par, got);
      return;
    }
    drawCodeLevel(pos, got);
    codeRun.timer = setTimeout(tick, 280);
  };
  drawCodeLevel(pos, got);
  codeRun.timer = setTimeout(tick, 280);
}

function codeWin(map, par, got) {
  const blocks = codeRun.program.length;
  const allStars = got.size === map.stars.length;
  const rating = 1 + (allStars ? 1 : 0) + (allStars && blocks <= par ? 1 : 0);
  const a = loadArcade();
  const level = codeRun.level + 1;
  const before = a.code[level] || 0;
  if (rating > before) { a.code[level] = rating; saveArcade(a); }
  const wanted = Math.max(0, rating - before);
  const given = arcadeStars(wanted);
  const box = arcadeBody(`🤖 Level ${level}`);
  arcadeAdd(box, 'div', '🏁', 'arcadeBig');
  arcadeAdd(box, 'h2', `Level ${level} done! ${'⭐'.repeat(rating)}${'☆'.repeat(3 - rating)}`);
  arcadeAdd(box, 'div', `You used ${blocks} block${blocks === 1 ? '' : 's'}${allStars ? '' : ` and grabbed ${got.size} of ${map.stars.length} ⭐`}.`, 'arcadeHint');
  if (!allStars) arcadeAdd(box, 'div', '💡 Grab every ⭐ on the way for more stars.', 'arcadeHint');
  else if (blocks > par) arcadeAdd(box, 'div', `💡 It can be done in ${par} blocks. Try using repeats (tap a block for ×2, ×3).`, 'arcadeHint');
  arcadeAdd(box, 'div', arcadeStarNote(given, wanted), 'arcadeMessage');
  const buttons = arcadeAdd(box, 'div', undefined, 'codeTools');
  arcadeAdd(buttons, 'button', '🔁 Try again', 'arcadeSmall').addEventListener('click', () => { codeRun.message = ''; drawCodeLevel(); });
  if (codeRun.level + 1 < codeLevels().length) {
    arcadeAdd(buttons, 'button', 'Next level →', 'arcadeGo').addEventListener('click', () => playCodeLevel(codeRun.level + 1));
  } else {
    arcadeAdd(buttons, 'button', '🏆 All levels!', 'arcadeGo').addEventListener('click', openCodeQuest);
  }
}

// =====================================================================
// 🔤 Daily Word
// =====================================================================
const WORDS_5 = ['APPLE', 'BEACH', 'BRAVE', 'BREAD', 'BRICK', 'CANDY', 'CHAIR', 'CHALK', 'CLOUD', 'CRANE', 'DANCE', 'DREAM',
  'EAGLE', 'EARTH', 'FIELD', 'FLAME', 'FRUIT', 'GHOST', 'GIANT', 'GLOVE', 'GRAPE', 'GRASS', 'HAPPY', 'HEART', 'HONEY',
  'HORSE', 'HOUSE', 'JELLY', 'JUICE', 'KNIFE', 'LEMON', 'LIGHT', 'LUCKY', 'MAGIC', 'MANGO', 'MONEY', 'MOUSE', 'MUSIC',
  'NIGHT', 'NOISE', 'OCEAN', 'PAINT', 'PANDA', 'PAPER', 'PARTY', 'PEACH', 'PIANO', 'PIZZA', 'PLANT', 'PLATE', 'QUEEN',
  'QUIET', 'RIVER', 'ROBOT', 'SALAD', 'SCARF', 'SHARK', 'SHEEP', 'SHELL', 'SHIRT', 'SKATE', 'SLEEP', 'SMILE', 'SNACK',
  'SNAKE', 'SPACE', 'SPOON', 'STORM', 'SUGAR', 'SUNNY', 'SWEET', 'TABLE', 'TIGER', 'TOAST', 'TOOTH', 'TRAIN', 'TRUCK',
  'UNCLE', 'VOICE', 'WATER', 'WHALE', 'WHEEL', 'WORLD', 'YOUNG', 'ZEBRA', 'BLOCK', 'BRUSH', 'CABIN', 'CAMEL', 'CLOCK',
  'CROWN', 'DRINK', 'FROST', 'GLASS', 'GUESS', 'LASER', 'LLAMA', 'MEDAL', 'OTTER', 'PILOT', 'PUPPY', 'RADIO', 'SAUCE',
  'SCORE', 'SPORT', 'STAMP', 'STONE', 'SWING', 'TEETH', 'THUMB', 'TOWER', 'TREAT', 'VIDEO', 'WAGON', 'WATCH', 'BERRY'];
const WORDS_4 = [['CAKE', '🎂'], ['FISH', '🐟'], ['MOON', '🌙'], ['STAR', '⭐'], ['FROG', '🐸'], ['BEAR', '🐻'], ['BOOK', '📖'],
  ['BALL', '⚽'], ['DUCK', '🦆'], ['TREE', '🌳'], ['RAIN', '🌧️'], ['BIKE', '🚲'], ['MILK', '🥛'], ['SHIP', '🚢'], ['KITE', '🪁'],
  ['LION', '🦁'], ['SNOW', '❄️'], ['SOCK', '🧦'], ['DOOR', '🚪'], ['BIRD', '🐦'], ['CORN', '🌽'], ['GIFT', '🎁'], ['HAND', '✋'],
  ['LAMP', '💡'], ['NOSE', '👃'], ['PEAR', '🍐'], ['ROSE', '🌹'], ['SEAL', '🦭'], ['TOYS', '🧸'], ['WOLF', '🐺'], ['BELL', '🔔'],
  ['COAT', '🧥'], ['DRUM', '🥁'], ['GOAT', '🐐'], ['LEAF', '🍃'], ['NEST', '🪺'], ['RING', '💍'], ['SOAP', '🧼'], ['TENT', '⛺'], ['FIRE', '🔥']];

// The same word for everyone on the same day
function todaysWord() {
  const day = Math.floor((Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - Date.UTC(2026, 0, 1)) / 86400000);
  const pick = (list, salt) => list[((day * 37 + salt) % list.length + list.length) % list.length];
  if (arcadeTheme() === 'kitten') { const [word, hint] = pick(WORDS_4, 11); return { word: word, hint: hint }; }
  return { word: pick(WORDS_5, 3), hint: '' };
}

function loadWordGame() {
  const a = loadArcade();
  const today = todaysWord();
  if (!a.word || a.word.day !== a.date || a.word.length !== today.word.length) {
    a.word = { day: a.date, length: today.word.length, guesses: [], done: false, won: false };
  }
  return a.word;
}

function saveWordGame(w) { const a = loadArcade(); a.word = w; saveArcade(a); }

let wordTyping = '';

function openWordGame() {
  wordTyping = '';
  drawWordGame();
}

function wordColors(guess, word) {
  const colors = Array(word.length).fill('gray');
  const left = {};
  [...word].forEach((ch, i) => { if (guess[i] === ch) colors[i] = 'green'; else left[ch] = (left[ch] || 0) + 1; });
  [...guess].forEach((ch, i) => { if (colors[i] !== 'green' && left[ch]) { colors[i] = 'yellow'; left[ch] -= 1; } });
  return colors;
}

function drawWordGame(message) {
  const { word, hint } = todaysWord();
  const w = loadWordGame();
  const tries = 6;
  const box = arcadeBody('🔤 Daily Word');
  arcadeBack(box);
  arcadeAdd(box, 'div', `Guess the ${word.length}-letter word in ${tries} tries. 🟩 right spot · 🟨 in the word, wrong spot · ⬜ not in the word.` +
                        (hint ? ` Hint: ${hint}` : ' Everyone in the family gets the same word today!'), 'arcadeHint');
  const board = arcadeAdd(box, 'div', undefined, 'wordBoard');
  const letterColor = {};
  for (let r = 0; r < tries; r++) {
    const row = arcadeAdd(board, 'div', undefined, 'wordRow');
    const guess = w.guesses[r] || (r === w.guesses.length && !w.done ? wordTyping : '');
    const colors = w.guesses[r] ? wordColors(w.guesses[r], word) : null;
    for (let c = 0; c < word.length; c++) {
      arcadeAdd(row, 'div', guess[c] || '', 'wordTile' + (colors ? ' ' + colors[c] : ''));
      if (colors) {
        const rank = { gray: 0, yellow: 1, green: 2 };
        const ch = w.guesses[r][c];
        if (!(ch in letterColor) || rank[colors[c]] > rank[letterColor[ch]]) letterColor[ch] = colors[c];
      }
    }
  }
  arcadeAdd(box, 'div', message || '', 'arcadeMessage');
  if (w.done) {
    arcadeAdd(box, 'h3', w.won ? `🎉 You got it in ${w.guesses.length}!` : `The word was ${word}. New word tomorrow!`);
    arcadeAdd(box, 'div', 'Come back tomorrow for a new word.', 'arcadeHint');
    return;
  }
  const keys = arcadeAdd(box, 'div', undefined, 'wordKeys');
  ['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'].forEach(line => {
    const row = arcadeAdd(keys, 'div', undefined, 'wordKeyRow');
    [...line].forEach(ch => {
      const k = arcadeAdd(row, 'button', ch === '⏎' ? 'Enter' : ch, 'wordKey' + (letterColor[ch] ? ' ' + letterColor[ch] : '') + (ch === '⏎' || ch === '⌫' ? ' wide' : ''));
      k.addEventListener('click', () => wordKey(ch));
    });
  });
}

function wordKey(ch) {
  const { word } = todaysWord();
  const w = loadWordGame();
  if (w.done) return;
  if (ch === '⌫') { wordTyping = wordTyping.slice(0, -1); drawWordGame(); return; }
  if (ch !== '⏎') { if (wordTyping.length < word.length) wordTyping += ch; drawWordGame(); return; }
  if (wordTyping.length < word.length) { drawWordGame(`Type ${word.length} letters first.`); return; }
  w.guesses.push(wordTyping);
  wordTyping = '';
  let message = '';
  if (w.guesses[w.guesses.length - 1] === word) {
    w.done = true; w.won = true;
    saveWordGame(w);
    const wanted = w.guesses.length <= 3 ? 4 : 3;
    message = arcadeStarNote(arcadeStars(wanted), wanted);
    if (typeof celebrate === 'function') celebrate(`🔤 You solved the Daily Word in ${w.guesses.length}!`, arcadeFace(), false);
  } else if (w.guesses.length >= 6) {
    w.done = true;
    saveWordGame(w);
  } else {
    saveWordGame(w);
  }
  drawWordGame(message);
}

// For the dashboard: today's Daily Word result
function wordForDashboard() {
  const a = loadArcade();
  return a.word && a.word.day === a.date ? { done: a.word.done, won: a.word.won, guesses: a.word.guesses.length } : null;
}

// =====================================================================
// 🃏 Memory Match
// =====================================================================
const MEMORY_FACES = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦄', '🐙', '🦋', '🐢', '🍕', '🚀', '⚽', '🎸', '🌈', '🍩'];
let memory = null;

function openMemory() {
  const box = arcadeBody('🃏 Memory Match');
  arcadeBack(box);
  arcadeAdd(box, 'div', 'Pick a size. Flip two cards at a time and find all the pairs in as few moves as you can.', 'arcadeHint');
  const a = loadArcade();
  const sizes = arcadeTheme() === 'kitten' ? [[6, 'Easy (12 cards)'], [8, 'Medium (16 cards)']] : [[8, 'Medium (16 cards)'], [10, 'Hard (20 cards)'], [12, 'Expert (24 cards)']];
  sizes.forEach(([pairs, label]) => {
    const b = arcadeAdd(box, 'button', `${label}${a.memoryBest[pairs] ? ` · best: ${a.memoryBest[pairs]} moves` : ''}`, 'arcadeGame arcadeSize');
    b.addEventListener('click', () => startMemory(pairs));
  });
}

function startMemory(pairs) {
  const faces = MEMORY_FACES.slice().sort(() => Math.random() - 0.5).slice(0, pairs);
  const deck = faces.concat(faces).sort(() => Math.random() - 0.5);
  memory = { pairs: pairs, deck: deck, open: [], matched: new Set(), moves: 0, busy: false };
  drawMemory();
}

function drawMemory(message) {
  const box = arcadeBody('🃏 Memory Match');
  const back = arcadeAdd(box, 'button', '← Sizes', 'arcadeBack');
  back.addEventListener('click', openMemory);
  arcadeAdd(box, 'div', `Moves: ${memory.moves} · Pairs: ${memory.matched.size / 2} of ${memory.pairs}`, 'arcadeHint');
  const grid = arcadeAdd(box, 'div', undefined, 'memoryGrid');
  grid.style.gridTemplateColumns = `repeat(${memory.pairs >= 10 ? 5 : 4}, 1fr)`;
  memory.deck.forEach((face, i) => {
    const up = memory.open.includes(i) || memory.matched.has(i);
    const card = arcadeAdd(grid, 'button', up ? face : '❓', 'memoryCard' + (up ? ' up' : '') + (memory.matched.has(i) ? ' matched' : ''));
    card.addEventListener('click', () => flipMemory(i));
  });
  arcadeAdd(box, 'div', message || '', 'arcadeMessage');
}

function flipMemory(i) {
  if (memory.busy || memory.open.includes(i) || memory.matched.has(i)) return;
  memory.open.push(i);
  if (memory.open.length < 2) { drawMemory(); return; }
  memory.moves += 1;
  const [x, y] = memory.open;
  if (memory.deck[x] === memory.deck[y]) {
    memory.matched.add(x); memory.matched.add(y);
    memory.open = [];
    if (memory.matched.size === memory.deck.length) { memoryWin(); return; }
    drawMemory('✨ A match!');
    return;
  }
  memory.busy = true;
  drawMemory();
  setTimeout(() => { memory.open = []; memory.busy = false; if (document.getElementById('arcade').style.display === 'block') drawMemory(); }, 900);
}

function memoryWin() {
  const a = loadArcade();
  const best = a.memoryBest[memory.pairs];
  const record = !best || memory.moves < best;
  if (record) a.memoryBest[memory.pairs] = memory.moves;
  a.memoryWins = (a.memoryWins || 0) + 1;
  saveArcade(a);
  // Stars for the first 3 wins a day
  const wanted = a.memoryWins <= 3 ? (memory.pairs >= 10 ? 3 : 2) : 0;
  const given = arcadeStars(wanted);
  drawMemory(`🎉 All pairs in ${memory.moves} moves!${record ? ' 🏆 New best!' : ''} ${arcadeStarNote(given, wanted)}`);
  const again = arcadeAdd(document.getElementById('arcadeBody'), 'button', '🔁 Play again', 'arcadeGo');
  again.addEventListener('click', () => startMemory(memory.pairs));
}
