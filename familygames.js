// =====================================================================
// familygames.js — 🎲 Family games, inside the 🕹️ Arcade
// Tic-tac-toe, Connect Four, Dots and Boxes and Battleship against anyone in the family (brothers,
// sisters, and grown-ups in career mode), each on their own phone.
// The server checks every move (step 42), and an alert says "Your turn!".
// A win earns 2 ⭐ and a tie 1 ⭐ (part of the daily Arcade stars).
// =====================================================================

const FG_NAMES = { ttt: '❌⭕ Tic-tac-toe', c4: '🔴🟡 Connect Four', dots: '🟦 Dots and Boxes', bs: '🚢 Battleship' };
const FG_SHORT = { ttt: 'tic-tac-toe', c4: 'Connect Four', dots: 'Dots and Boxes', bs: 'Battleship' };
const FG_MARKS = { ttt: { X: '❌', O: '⭕' }, c4: { X: '🔴', O: '🟡' }, dots: { X: '🟥', O: '🟨' }, bs: { X: '⚓', O: '⚓' } };
const FG_FACES = { kitten: '🐱', tiger: '🐯', lion: '🦁', eagle: '🦅' };
let fgState = { list: null, game: null, poll: null, busy: false };

function fgLinked() { return typeof cloudLinked === 'function' && cloudLinked(); }
function fgToken() { return localStorage.getItem('kiddyKatCloudToken'); }

async function fgLoad() {
  if (!fgLinked()) return null;
  try {
    const r = await cloudCall('game_list', { p_token: fgToken() });
    if (r && r.ok) { fgState.list = r; fgPayOut(r.games); fgBadge(); }
    return r;
  } catch (err) { return null; }
}

// Number of games waiting for my move, shown on the Arcade button
function fgMyTurns() {
  return fgState.list ? fgState.list.games.filter(g => g.status === 'playing' && g.turn === g.me).length : 0;
}
function fgBadge() {
  const button = [...document.querySelectorAll('button')].find(b => b.getAttribute('onclick') === 'openArcade()');
  if (button) button.textContent = fgMyTurns() ? `🕹️ Arcade (${fgMyTurns()} 🎲)` : '🕹️ Arcade';
}

// Stars for finished games, once each
function fgPayOut(games) {
  const a = loadArcade();
  a.gamesPaid = a.gamesPaid || [];
  let changed = false;
  games.filter(g => g.status !== 'playing' && !a.gamesPaid.includes(g.id)).forEach(g => {
    a.gamesPaid.push(g.id);
    changed = true;
    g._stars = g.winner === g.me ? 2 : g.status === 'draw' ? 1 : 0;
  });
  if (!changed) return;
  a.gamesPaid = a.gamesPaid.slice(-60);
  saveArcade(a);
  const stars = games.reduce((n, g) => n + (g._stars || 0), 0);
  if (stars) arcadeStars(stars);
}

function fgStopPoll() { clearInterval(fgState.poll); fgState.poll = null; }

// ---------- The list of games ----------
async function openFamilyGames() {
  fgStopPoll();
  const box = arcadeBody('🎲 Family games');
  arcadeBack(box);
  if (!fgLinked()) {
    arcadeAdd(box, 'div', '☁️ Ask a grown-up to link this device to the online family (⚙️ Grown-ups → ☁️ Online family). Then you can play your family!', 'arcadeHint');
    return;
  }
  const wait = arcadeAdd(box, 'div', '⏳ Loading your games...', 'arcadeHint');
  const r = await fgLoad();
  wait.remove();
  if (!r || !r.ok) { arcadeAdd(box, 'div', '⚠️ ' + ((r && r.error) || 'Could not load games. Check the internet and try again.'), 'arcadeMessage'); return; }
  if (document.getElementById('arcadeTitle').textContent !== '🎲 Family games') return;   // they left already

  const games = r.games;
  const mine = games.filter(g => g.status === 'playing' && g.turn === g.me);
  const theirs = games.filter(g => g.status === 'playing' && g.turn !== g.me);
  const over = games.filter(g => g.status !== 'playing').slice(0, 5);
  const section = (title, list) => {
    if (!list.length) return;
    arcadeAdd(box, 'h3', title, 'fgHead');
    list.forEach(g => {
      const b = arcadeAdd(box, 'button', undefined, 'arcadeGame fgRow');
      arcadeAdd(b, 'span', FG_FACES[g.opponentAnimal] || '🙂', 'arcadeGameEmoji');
      const words = arcadeAdd(b, 'span');
      arcadeAdd(words, 'b', `${FG_NAMES[g.kind]} vs ${g.opponent}`);
      arcadeAdd(words, 'span', fgStatusLine(g), 'arcadeGameNote');
      b.addEventListener('click', () => openFamilyGame(g));
    });
  };
  section('👉 Your turn', mine);
  section('⏳ Waiting for them', theirs);
  section('🏁 Finished', over);
  if (!games.length) arcadeAdd(box, 'div', 'No games yet. Start one below!', 'arcadeHint');

  // New game
  arcadeAdd(box, 'h3', '➕ New game', 'fgHead');
  if (!r.family.length) { arcadeAdd(box, 'div', 'Nobody else in your family is linked yet.', 'arcadeHint'); return; }
  let kind = 'ttt';
  const kinds = arcadeAdd(box, 'div', undefined, 'codeTools');
  const kindButtons = Object.keys(FG_NAMES).map(k => {
    const b = arcadeAdd(kinds, 'button', FG_NAMES[k], 'arcadeSmall' + (k === kind ? ' fgPicked' : ''));
    b.addEventListener('click', () => { kind = k; kindButtons.forEach(x => x.classList.toggle('fgPicked', x === b)); });
    return b;
  });
  arcadeAdd(box, 'div', 'Play against:', 'arcadeHint');
  const people = arcadeAdd(box, 'div', undefined, 'codeTools');
  const note = arcadeAdd(box, 'div', '', 'arcadeMessage');
  r.family.forEach(p => {
    const b = arcadeAdd(people, 'button', `${FG_FACES[p.animal] || '🙂'} ${p.nickname}`, 'arcadeGo');
    b.addEventListener('click', async () => {
      if (fgState.busy) return;
      fgState.busy = true;
      note.textContent = '⏳ Starting...';
      const res = await cloudCall('game_new', { p_token: fgToken(), p_kind: kind, p_opponent: p.nickname });
      fgState.busy = false;
      if (!res.ok) { note.textContent = '⚠️ ' + res.error; return; }
      openFamilyGame(res.game);
    });
  });
}

function fgDotsScore(g) {
  const boxes = g.board.slice(45);
  const mine = [...boxes].filter(ch => ch === String(g.me)).length;
  const theirs = [...boxes].filter(ch => ch === String(3 - g.me)).length;
  return { mine, theirs };
}

function fgStatusLine(g) {
  if (g.status === 'playing' && g.kind === 'dots') {
    const { mine, theirs } = fgDotsScore(g);
    return `${g.turn === g.me ? 'Your move!' : `${g.opponent}'s move`} · Boxes: you ${mine}, ${g.opponent} ${theirs}`;
  }
  if (g.status === 'playing') return g.turn === g.me ? (g.moves ? 'Your move!' : 'You go first!') : `${g.opponent}'s move`;
  if (g.status === 'draw') return '🤝 Tie game';
  const won = g.winner === g.me;
  if (g.status === 'resigned') return won ? `🏆 ${g.opponent} gave up. You win!` : '🏳️ You gave up';
  return won ? '🏆 You won!' : `${g.opponent} won`;
}

// ---------- One game ----------
function openFamilyGame(g) {
  fgState.game = g;
  drawFamilyGame();
  fgStopPoll();
  // Check for the other player's move every few seconds while this game is open
  fgState.poll = setInterval(async () => {
    if (document.getElementById('arcade').style.display !== 'block' || !fgState.game) { fgStopPoll(); return; }
    if (fgState.game.status !== 'playing' || fgState.game.turn === fgState.game.me) return;
    const r = await fgLoad();
    const fresh = r && r.ok && r.games.find(x => x.id === fgState.game.id);
    if (fresh && (fresh.moves !== fgState.game.moves || fresh.status !== fgState.game.status)) {
      fgState.game = fresh;
      drawFamilyGame(fresh.status === 'playing' ? `${fresh.opponent} moved. Your turn!` : '');
    }
  }, 4000);
}

function drawFamilyGame(message) {
  const g = fgState.game;
  const box = arcadeBody(FG_NAMES[g.kind]);
  const back = arcadeAdd(box, 'button', '← Games', 'arcadeBack');
  back.addEventListener('click', () => { fgStopPoll(); openFamilyGames(); });
  const marks = FG_MARKS[g.kind];
  const myMark = g.me === 1 ? 'X' : 'O';
  const theirMark = g.me === 1 ? 'O' : 'X';
  arcadeAdd(box, 'div', `You ${marks[myMark]} vs ${FG_FACES[g.opponentAnimal] || ''} ${g.opponent} ${marks[theirMark]}`, 'fgPlayers');
  const status = arcadeAdd(box, 'div', fgStatusLine(g), 'fgStatus' + (g.status === 'playing' && g.turn === g.me ? ' mine' : ''));
  if (g.status !== 'playing' && g.winner === g.me) status.textContent += ' 🎉';

  const canMoveNow = g.status === 'playing' && g.turn === g.me && !fgState.busy;
  if (g.kind === 'dots') { fgDrawDots(box, g, canMoveNow); fgFinishDraw(box, g, message); return; }
  if (g.kind === 'bs') { fgDrawBattleship(box, g, canMoveNow); fgFinishDraw(box, g, message); return; }
  const cols = g.kind === 'ttt' ? 3 : 7;
  const board = arcadeAdd(box, 'div', undefined, 'fgBoard ' + g.kind);
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  const canMove = g.status === 'playing' && g.turn === g.me && !fgState.busy;
  [...g.board].forEach((ch, i) => {
    const cell = arcadeAdd(board, 'button', ch === '.' ? '' : marks[ch], 'fgCell' + (i === g.lastCell ? ' last' : ''));
    cell.disabled = !canMove || (g.kind === 'ttt' && ch !== '.');
    cell.addEventListener('click', () => fgMove(g.kind === 'ttt' ? i : i % 7));
  });
  if (g.kind === 'c4' && canMove) arcadeAdd(box, 'div', 'Tap a column to drop your piece. Get 4 in a row!', 'arcadeHint');
  if (g.kind === 'ttt' && canMove) arcadeAdd(box, 'div', 'Tap a square. Get 3 in a row!', 'arcadeHint');
  fgFinishDraw(box, g, message);
}

// The message line and the Give up / Play again buttons under every game
function fgFinishDraw(box, g, message) {
  arcadeAdd(box, 'div', message || '', 'arcadeMessage');

  const tools = arcadeAdd(box, 'div', undefined, 'codeTools');
  if (g.status === 'playing') {
    arcadeAdd(tools, 'button', '🏳️ Give up', 'arcadeSmall').addEventListener('click', async () => {
      if (!confirm(`Give up this game against ${g.opponent}?`)) return;
      const r = await cloudCall('game_resign', { p_token: fgToken(), p_game: g.id });
      if (r.ok) { fgState.game = r.game; kidAlert('gameover', `${FG_SHORT[g.kind]}: you win!`, g.opponent); drawFamilyGame(); }
    });
  } else {
    arcadeAdd(tools, 'button', '🔁 Play again', 'arcadeGo').addEventListener('click', async () => {
      const r = await cloudCall('game_new', { p_token: fgToken(), p_kind: g.kind, p_opponent: g.opponent });
      if (r.ok) { if (!r.existing) kidAlert('game', FG_SHORT[g.kind], g.opponent); openFamilyGame(r.game); }
    });
    fgLoad();                                           // pays out stars for the finished game
  }
}

async function fgMove(cell) {
  const g = fgState.game;
  if (fgState.busy || g.status !== 'playing' || g.turn !== g.me) return;
  fgState.busy = true;
  const r = await cloudCall('game_move', { p_token: fgToken(), p_game: g.id, p_cell: cell }).catch(() => null);
  fgState.busy = false;
  if (!r) { drawFamilyGame('⚠️ No internet. Try again.'); return; }
  if (r.game) fgState.game = r.game;
  if (!r.ok) { drawFamilyGame('⚠️ ' + r.error); return; }
  const now = fgState.game;
  // Tell the other player (not when I get to go again after finishing a box)
  if (now.status === 'playing' && now.turn !== now.me) kidAlert(now.moves === 1 ? 'game' : 'turn', FG_SHORT[now.kind], now.opponent);
  else if (now.status === 'won') kidAlert('gameover', `${callNameForGames()} won ${FG_SHORT[now.kind]}`, now.opponent);
  else if (now.status === 'draw') kidAlert('gameover', `${FG_SHORT[now.kind]} ended in a tie`, now.opponent);
  if (now.status === 'won' && typeof celebrate === 'function') {
    setTimeout(() => celebrate(`🏆 You beat ${now.opponent} at ${FG_SHORT[now.kind]}!`, FG_FACES[arcadeTheme()] || '🏆', false), 600);
  }
  let say = now.status === 'playing' ? `Nice move! Now it's ${now.opponent}'s turn.` : '';
  if (now.status === 'playing' && now.kind === 'dots' && now.turn === now.me) say = '🟦 You finished a box! Go again.';
  if (now.kind === 'bs' && now.status === 'playing') {
    const hit = (now.myHits || []).includes(now.lastCell);
    const sunkNow = (now.theirSunk || []).some(ship => ship.includes(now.lastCell));
    say = sunkNow ? `💥 You sank a ship! ${now.opponent}'s turn.` : hit ? `💥 Hit! ${now.opponent}'s turn.` : `🌊 Splash, a miss. ${now.opponent}'s turn.`;
  }
  drawFamilyGame(say);
}

// ---------- 🟦 Dots and Boxes: 5×5 dots, 4×4 boxes ----------
// board = 45 lines (0-19 across, row by row; 20-44 up and down) + 16 box owners
function fgDrawDots(box, g, canMove) {
  const { mine, theirs } = fgDotsScore(g);
  const color = p => (p === '1' ? 'p1' : p === '2' ? 'p2' : '');
  const grid = arcadeAdd(box, 'div', undefined, 'dotsGrid');
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const r = Math.floor(row / 2), c = Math.floor(col / 2);
      if (row % 2 === 0 && col % 2 === 0) { arcadeAdd(grid, 'div', '', 'dotsDot'); continue; }
      if (row % 2 === 1 && col % 2 === 1) {                           // a box
        const owner = g.board[45 + r * 4 + c];
        const face = owner === String(g.me) ? arcadeFace() : owner !== '.' ? (FG_FACES[g.opponentAnimal] || '🙂') : '';
        arcadeAdd(grid, 'div', face, 'dotsBox ' + color(owner));
        continue;
      }
      const line = row % 2 === 0 ? r * 4 + c : 20 + r * 5 + c;        // across : up and down
      const drawn = g.board[line];
      const b = arcadeAdd(grid, 'button', '', (row % 2 === 0 ? 'dotsH ' : 'dotsV ') + (drawn !== '.' ? 'drawn ' + color(drawn) : '') + (line === g.lastCell ? ' last' : ''));
      b.disabled = !canMove || drawn !== '.';
      b.setAttribute('aria-label', `line ${line + 1}`);
      b.addEventListener('click', () => fgMove(line));
    }
  }
  arcadeAdd(box, 'div', `Boxes: ${arcadeFace()} you ${mine} · ${FG_FACES[g.opponentAnimal] || ''} ${g.opponent} ${theirs}`, 'fgPlayers');
  if (canMove) arcadeAdd(box, 'div', 'Tap between two dots to draw a line. Finish a box to claim it and go again!', 'arcadeHint');
}

// ---------- 🚢 Battleship: 7×7 sea, 4 ships each, placed by the server ----------
function fgDrawBattleship(box, g, canMove) {
  const fleetCells = (fleet) => (fleet || []).flat();
  const mySea = fleetCells(g.myFleet);
  const sunkCells = fleetCells(g.theirSunk);
  const myShots = g.myShots || [], myHits = g.myHits || [], theirShots = g.theirShots || [];
  const shipsLeft = (g.myFleet || []).length - (g.theirSunk || []).length;
  arcadeAdd(box, 'h3', `🎯 ${g.opponent}'s sea · ${(g.myFleet || []).length - shipsLeft} of 4 ships sunk`, 'fgHead');
  const target = arcadeAdd(box, 'div', undefined, 'bsGrid');
  for (let i = 0; i < 49; i++) {
    let show = '', cls = 'bsCell';
    if (sunkCells.includes(i)) { show = myHits.includes(i) ? '🔥' : '🚢'; cls += ' sunk'; }
    else if (myHits.includes(i)) { show = '💥'; cls += ' hit'; }
    else if (myShots.includes(i)) { show = '🌊'; cls += ' miss'; }
    if (i === g.lastCell && g.turn !== g.me) cls += ' last';
    const b = arcadeAdd(target, 'button', show, cls);
    b.disabled = !canMove || myShots.includes(i);
    b.addEventListener('click', () => fgMove(i));
  }
  if (canMove) arcadeAdd(box, 'div', 'Tap a square to fire! 💥 hit · 🌊 miss · 🔥 sunk', 'arcadeHint');
  arcadeAdd(box, 'h3', '⚓ Your fleet', 'fgHead');
  const home = arcadeAdd(box, 'div', undefined, 'bsGrid small');
  for (let i = 0; i < 49; i++) {
    const ship = mySea.includes(i), shot = theirShots.includes(i);
    arcadeAdd(home, 'div', ship && shot ? '💥' : ship ? '🚢' : shot ? '🌊' : '', 'bsCell' + (ship ? ' ship' : ''));
  }
}

function callNameForGames() {
  return (fgState.list && fgState.list.me) || (typeof callName === 'function' ? callName() : 'Your opponent');
}

// On startup: show how many games are waiting for a move
function showFamilyTurns() { if (fgLinked()) setTimeout(fgLoad, 2500); }
