// =====================================================================
// games.js — Kiddy Kat learning games
// Short rounds of 5 questions. Each finished round gives the pet a treat.
// 3 rounds a day, then the pet is full: a natural place to stop.
// =====================================================================

const ROUNDS_PER_DAY = 3;
const QUESTIONS_PER_ROUND = 5;

// Food that lands in the bowl, by pet type
const PET_FOOD = { kitten: '🐟', puppy: '🦴', bunny: '🥕', flower: '💧' };

// Practice history, so grown-ups can see progress
let practice = JSON.parse(localStorage.getItem('kiddyKatPractice') || '[]');

function savePractice() {
  localStorage.setItem('kiddyKatPractice', JSON.stringify(practice));
}

function roundsToday() {
  const today = new Date().toDateString();
  return practice.filter(p => p.date === today).length;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(list) {
  return list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
}

// ---------- Math levels (easy to hard) ----------
// Each level makes one question: [first number, sign, second number, answer]
const MATH_LEVELS = [
  { name: 'Adding to 10', make: () => {
      const a = randomInt(0, 10), b = randomInt(0, 10 - a);
      return [a, '+', b, a + b];
  }},
  { name: 'Adding and subtracting to 20', make: () => {
      if (Math.random() < 0.5) { const a = randomInt(2, 18), b = randomInt(1, 20 - a); return [a, '+', b, a + b]; }
      const a = randomInt(5, 20), b = randomInt(1, a); return [a, '−', b, a - b];
  }},
  { name: '2-digit numbers, no regrouping', make: () => {
      const tens1 = randomInt(1, 8), ones1 = randomInt(0, 8);
      if (Math.random() < 0.5) {
        const tens2 = randomInt(1, 9 - tens1), ones2 = randomInt(0, 9 - ones1);
        const a = tens1 * 10 + ones1, b = tens2 * 10 + ones2; return [a, '+', b, a + b];
      }
      const a = randomInt(3, 9) * 10 + randomInt(1, 9);
      const b = randomInt(1, Math.floor(a / 10) - 1) * 10 + randomInt(0, a % 10);
      return [a, '−', b, a - b];
  }},
  { name: '2-digit numbers with regrouping', make: () => {
      if (Math.random() < 0.5) {
        const a = randomInt(1, 6) * 10 + randomInt(5, 9), b = randomInt(1, 2) * 10 + randomInt(10 - (a % 10), 9);
        return [a, '+', b, a + b];
      }
      const a = randomInt(3, 9) * 10 + randomInt(0, 4), b = randomInt(1, Math.floor(a / 10) - 1) * 10 + randomInt((a % 10) + 1, 9);
      return [a, '−', b, a - b];
  }},
  { name: 'Times tables', make: () => {
      const a = randomInt(2, 10), b = randomInt(2, 10); return [a, '×', b, a * b];
  }},
  { name: 'Division facts', make: () => {
      const b = randomInt(2, 10), answer = randomInt(2, 10); return [b * answer, '÷', b, answer];
  }}
];

// Kittens practice levels 0-3 (2nd grade); tigers and lions practice 4-5
function mathRange() {
  return animal.theme === 'kitten' ? [0, 3] : [4, 5];
}

function getMathLevel() {
  const [low, high] = mathRange();
  const saved = Number(localStorage.getItem('kiddyKatMathLevel'));
  return Number.isInteger(saved) && saved >= low && saved <= high ? saved : low;
}

// Answer plus 3 close wrong answers, mixed up
function makeChoices(answer) {
  const options = new Set([answer]);
  const nudges = shuffle([1, -1, 2, -2, 10, -10, 3, -3]);
  for (const n of nudges) {
    if (options.size === 4) break;
    if (answer + n >= 0) options.add(answer + n);
  }
  return shuffle([...options]);
}

// ---------- Opening the practice menu ----------
let round = null;

function openPractice() {
  document.getElementById('game').style.display = 'block';
  clearGame();
  document.getElementById('gameTitle').textContent = '🎮 Practice time!';

  const left = ROUNDS_PER_DAY - roundsToday();
  if (left <= 0) {
    const who = pet ? pet.name : 'Your pet';
    document.getElementById('gameQuestion').textContent = `😴 ${who} is full and sleepy. Come back tomorrow!`;
    return;
  }
  document.getElementById('gameFeedback').textContent =
    `${left} ${left === 1 ? 'round' : 'rounds'} left today. Each one gives ${pet ? pet.name : 'your pet'} a treat!`;

  const menu = document.getElementById('gameChoices');
  addMenuButton(menu, '➕ Math', startMath);
  // More games get added here
  if (typeof startGrammar === 'function') addMenuButton(menu, '✏️ Fix the sentence', startGrammar);
}

function addMenuButton(box, label, action) {
  const button = document.createElement('button');
  button.className = 'choice';
  button.textContent = label;
  button.addEventListener('click', action);
  box.appendChild(button);
}

function clearGame() {
  ['gameBowl', 'gameQuestion', 'gameChoices', 'gameFeedback'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

function closeGame() {
  document.getElementById('game').style.display = 'none';
  round = null;
}

// ---------- Playing a math round ----------
function startMath() {
  round = { game: 'math', number: 0, correct: 0, streak: 0, misses: 0, level: getMathLevel() };
  nextMathQuestion();
}

function nextMathQuestion() {
  if (round.number === QUESTIONS_PER_ROUND) { endRound(); return; }
  round.number += 1;

  const [a, sign, b, answer] = MATH_LEVELS[round.level].make();
  document.getElementById('gameTitle').textContent =
    `➕ ${MATH_LEVELS[round.level].name}  (${round.number} of ${QUESTIONS_PER_ROUND})`;
  document.getElementById('gameQuestion').textContent = `${a} ${sign} ${b} = ?`;
  document.getElementById('gameFeedback').textContent = '';

  const box = document.getElementById('gameChoices');
  box.textContent = '';
  makeChoices(answer).forEach(option => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.textContent = option;
    button.addEventListener('click', () => checkMathAnswer(button, option, answer, `${a} ${sign} ${b} = ${answer}`));
    box.appendChild(button);
  });
}

function checkMathAnswer(button, picked, answer, fullProblem) {
  document.querySelectorAll('#gameChoices .choice').forEach(b => b.disabled = true);
  const [low, high] = mathRange();
  const feedback = document.getElementById('gameFeedback');

  if (picked === answer) {
    button.classList.add('right');
    round.correct += 1;
    round.streak += 1;
    round.misses = 0;
    document.getElementById('gameBowl').textContent += pet ? (PET_FOOD[pet.type] || '⭐') : '⭐';
    feedback.textContent = '✅ Yes! ' + fullProblem;
    if (round.streak >= 3 && round.level < high) {       // 3 right in a row: a little harder
      round.level += 1;
      round.streak = 0;
      feedback.textContent += '  ⬆️ Level up!';
    }
    setTimeout(nextMathQuestion, 1300);
  } else {
    button.classList.add('wrong');
    round.streak = 0;
    round.misses += 1;
    feedback.textContent = `Not quite! ${fullProblem}`;
    if (round.misses >= 2 && round.level > low) {        // 2 misses in a row: a little easier
      round.level -= 1;
      round.misses = 0;
    }
    setTimeout(nextMathQuestion, 2500);
  }
}

// ---------- End of a round (shared by all games) ----------
function endRound() {
  if (round.game === 'math') localStorage.setItem('kiddyKatMathLevel', round.level);

  practice.push({ date: new Date().toDateString(), game: round.game,
                  correct: round.correct, total: QUESTIONS_PER_ROUND });
  savePractice();
  showPracticeStats();

  const treat = givePetTreat();
  clearGame();
  document.getElementById('gameTitle').textContent = '🎉 Round done!';
  document.getElementById('gameQuestion').textContent =
    `You got ${round.correct} out of ${QUESTIONS_PER_ROUND}! ${'⭐'.repeat(round.correct)}`;
  document.getElementById('gameFeedback').textContent = treat || (pet ? '' : 'Hatch a pet to give it treats!');

  const box = document.getElementById('gameChoices');
  if (roundsToday() < ROUNDS_PER_DAY) addMenuButton(box, '▶️ Play again', openPractice);
  addMenuButton(box, '🏠 Done', closeGame);
  round = null;
}

// ---------- Practice stats for grown-ups ----------
function showPracticeStats() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = practice.filter(p => new Date(p.date).getTime() >= weekAgo);
  const correct = week.reduce((sum, p) => sum + p.correct, 0);
  const total = week.reduce((sum, p) => sum + p.total, 0);
  const box = document.getElementById('practiceStats');
  if (total === 0) { box.textContent = 'No practice yet this week.'; return; }

  const byGame = {};
  week.forEach(p => {
    byGame[p.game] = byGame[p.game] || { correct: 0, total: 0, rounds: 0 };
    byGame[p.game].correct += p.correct;
    byGame[p.game].total += p.total;
    byGame[p.game].rounds += 1;
  });
  const names = { math: 'Math', grammar: 'Fix the sentence' };
  const lines = Object.keys(byGame).map(g =>
    `${names[g] || g}: ${byGame[g].rounds} rounds, ${Math.round(byGame[g].correct / byGame[g].total * 100)}% right`);
  lines.unshift(`Last 7 days: ${week.length} rounds, ${Math.round(correct / total * 100)}% right`);
  lines.push(`Math level now: ${MATH_LEVELS[getMathLevel()].name}`);
  box.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
}
