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
  addMenuButton(menu, '✏️ Fix the sentence', startGrammar);
  addMenuButton(menu, '🔊 Spelling', startSpelling);
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
  document.getElementById('gameQuestion').style.fontSize = '';   // back to the big math size
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
  addStars(round.correct);                       // 1 star for each right answer
  clearGame();
  document.getElementById('gameTitle').textContent = '🎉 Round done!';
  document.getElementById('gameQuestion').textContent =
    `You got ${round.correct} out of ${QUESTIONS_PER_ROUND}! ${'⭐'.repeat(round.correct)}`;
  document.getElementById('gameFeedback').textContent = pet
    ? `${treat || ''} +${round.correct} ⭐ for the shop!`
    : 'Hatch a pet to give it treats!';

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
  const names = { math: 'Math', grammar: 'Fix the sentence', spelling: 'Spelling' };
  const lines = Object.keys(byGame).map(g =>
    `${names[g] || g}: ${byGame[g].rounds} round${byGame[g].rounds === 1 ? "" : "s"}, ${Math.round(byGame[g].correct / byGame[g].total * 100)}% right`);
  lines.unshift(`Last 7 days: ${week.length} rounds, ${Math.round(correct / total * 100)}% right`);
  lines.push(`Math level now: ${MATH_LEVELS[getMathLevel()].name}`);
  box.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
}

// =====================================================================
// Word games: "Fix the sentence" (grammar) and "Spelling"
// Each kid gets questions for their animal: kitten, tiger or lion.
// =====================================================================

// Grammar: a sentence, 4 choices, the right one (a), and why it's right
const GRAMMAR = {
  kitten: [
    { s: 'We saw three fox at the zoo.', c: ['Change fox to foxes', 'Change fox to foxs', 'Change fox to foxies', 'No change is needed'], a: 0, why: 'Words ending in x add -es: foxes.' },
    { s: 'My dog likes to run.', c: ['Change dog to dogs', 'Change likes to like', 'Change run to runs', 'No change is needed'], a: 3, why: 'This sentence is already right!' },
    { s: 'The babys are sleeping.', c: ['Change babys to babies', 'Change babys to babyes', 'Change are to is', 'No change is needed'], a: 0, why: 'For words ending in y, change y to i and add -es: babies.' },
    { s: 'She has two new dress.', c: ['Change dress to dresss', 'Change dress to dresses', 'Change has to have', 'No change is needed'], a: 1, why: 'Words ending in ss add -es: dresses.' },
    { s: 'i like to read books.', c: ['Change i to I', 'Change books to book', 'Change read to reads', 'No change is needed'], a: 0, why: 'The word I is always a capital letter.' },
    { s: 'Where is my hat.', c: ['Change . to ?', 'Change . to !', 'Change hat to hats', 'No change is needed'], a: 0, why: 'A question ends with a question mark.' },
    { s: 'We lives on Oak Street.', c: ['Change We to we', 'Change lives to live', 'Change Street to street', 'No change is needed'], a: 1, why: 'We live. (He lives, but we live.)' },
    { s: 'Yesterday I walk to the park.', c: ['Change walk to walked', 'Change walk to walks', 'Change park to parks', 'No change is needed'], a: 0, why: 'Yesterday means it already happened, so add -ed: walked.' },
    { s: 'The children played outside.', c: ['Change children to childs', 'Change played to play', 'Change outside to outsides', 'No change is needed'], a: 3, why: 'This sentence is already right!' },
    { s: 'I lost two tooths.', c: ['Change tooths to teeth', 'Change tooths to toothes', 'Change tooths to teeths', 'No change is needed'], a: 0, why: 'One tooth, two teeth. Some words change instead of adding -s.' },
    { s: 'My friend sam is funny.', c: ['Change friend to Friend', 'Change sam to Sam', 'Change funny to Funny', 'No change is needed'], a: 1, why: 'Names start with a capital letter: Sam.' },
    { s: 'The bus stops in three citys.', c: ['Change citys to cities', 'Change citys to cityes', 'Change stops to stop', 'No change is needed'], a: 0, why: 'Change y to i and add -es: cities.' },
    { s: 'Look at that big dog!', c: ['Change ! to ?', 'Change dog to dogs', 'Change Look to look', 'No change is needed'], a: 3, why: 'This sentence is already right!' },
    { s: 'He have a red bike.', c: ['Change have to has', 'Change red to reds', 'Change bike to bikes', 'No change is needed'], a: 0, why: 'He has. (I have, but he has.)' },
    { s: 'We went to the beach on saturday.', c: ['Change beach to Beach', 'Change went to goed', 'Change saturday to Saturday', 'No change is needed'], a: 2, why: 'Days of the week start with a capital letter.' },
    { s: 'Two mouses ran under the bed.', c: ['Change mouses to mice', 'Change mouses to mouse', 'Change mouses to mices', 'No change is needed'], a: 0, why: 'One mouse, two mice.' },
    { s: 'The cat are hungry.', c: ['Change are to is', 'Change cat to Cat', 'Change hungry to hungrier', 'No change is needed'], a: 0, why: 'One cat is. Two cats are.' },
    { s: 'I has three wishes.', c: ['Change has to have', 'Change wishes to wishs', 'Change I to i', 'No change is needed'], a: 0, why: 'I have. (She has, but I have.)' },
    { s: 'Can you help me.', c: ['Change . to ?', 'Change me to I', 'Change help to helps', 'No change is needed'], a: 0, why: 'A question ends with a question mark.' },
    { s: 'The boxes are heavy.', c: ['Change boxes to boxs', 'Change are to is', 'Change heavy to heavys', 'No change is needed'], a: 3, why: 'This sentence is already right!' }
  ],
  tiger: [
    { s: 'Its going to rain today.', c: ["Change Its to It's", 'Change rain to rains', 'Change today to todays', 'No change is needed'], a: 0, why: "It's = it is. It is going to rain." },
    { s: "The dog wagged it's tail.", c: ["Change it's to its", 'Change wagged to wags', 'Change tail to tails', 'No change is needed'], a: 0, why: "Its (no apostrophe) means belonging to it. It's always means it is." },
    { s: 'Their going to the game tonight.', c: ["Change Their to They're", 'Change Their to There', 'Change going to go', 'No change is needed'], a: 0, why: "They're = they are." },
    { s: 'Me and Jake went fishing.', c: ['Change Me and Jake to Jake and I', 'Change Me and Jake to Jake and me', 'Change went to goes', 'No change is needed'], a: 0, why: 'Take out Jake: "I went fishing," not "Me went fishing."' },
    { s: 'Each of the students have a locker.', c: ['Change have to has', 'Change students to student', 'Change locker to lockers', 'No change is needed'], a: 0, why: 'Each is singular, so it takes has.' },
    { s: 'I could of finished sooner.', c: ['Change of to have', 'Change could to can', 'Change sooner to more soon', 'No change is needed'], a: 0, why: '"Could of" is a mishearing of "could\'ve," which means could have.' },
    { s: 'She runs faster then her brother.', c: ['Change then to than', 'Change runs to run', 'Change faster to more fast', 'No change is needed'], a: 0, why: 'Use than to compare. Then is about time.' },
    { s: 'The team played well, and they won the game.', c: ['Change well to good', 'Change won to winned', 'Change they to them', 'No change is needed'], a: 3, why: 'This sentence is already right!' },
    { s: 'Your the best goalie on the team.', c: ["Change Your to You're", 'Change Your to Yore', 'Change best to bestest', 'No change is needed'], a: 0, why: "You're = you are." },
    { s: 'We bought apples oranges and bananas.', c: ['Change to: apples, oranges, and bananas', 'Change to: apples oranges, and, bananas', 'Change to: apples. oranges. and bananas', 'No change is needed'], a: 0, why: 'Use commas to separate items in a list.' },
    { s: 'The weather affected our plans.', c: ['Change affected to effected', 'Change our to are', "Change plans to plan's", 'No change is needed'], a: 3, why: 'This sentence is already right! Affect is usually the action word.' },
    { s: 'Him and his sister walked home.', c: ['Change Him to He', 'Change Him to His', 'Change walked to walks', 'No change is needed'], a: 0, why: 'Take out his sister: "He walked home," not "Him walked home."' },
    { s: 'There are less people here today.', c: ['Change less to fewer', 'Change There to Their', 'Change are to is', 'No change is needed'], a: 0, why: 'Use fewer for things you can count, like people.' },
    { s: 'I seen that movie twice.', c: ['Change seen to saw', 'Change seen to seed', 'Change twice to two', 'No change is needed'], a: 0, why: 'I saw it, or I have seen it. Never "I seen."' },
    { s: 'Neither of the answers are correct.', c: ['Change are to is', 'Change answers to answer', 'Change Neither to Either', 'No change is needed'], a: 0, why: 'Neither means not one of them, so it is singular: is.' }
  ],
  lion: [
    { s: 'Between you and I, the test was hard.', c: ['Change I to me', 'Change you to yourself', 'Change was to were', 'No change is needed'], a: 0, why: 'After a preposition like between, use me.' },
    { s: 'Having finished the essay, the TV was turned on.', c: ['Change to: Having finished the essay, I turned on the TV.', 'Change to: Having finished the essay the TV was turned on.', 'Change to: The essay having finished, the TV was turned on.', 'No change is needed'], a: 0, why: 'The opening phrase must describe the person who finished, not the TV (a dangling modifier).' },
    { s: "Who's backpack is this?", c: ["Change Who's to Whose", "Change Who's to Whos", 'Change this to these', 'No change is needed'], a: 0, why: "Whose shows ownership. Who's means who is." },
    { s: 'The committee has made its decision.', c: ['Change has to have', "Change its to it's", 'Change made to make', 'No change is needed'], a: 3, why: 'This sentence is already right!' },
    { s: 'I wanted to go, however it was raining.', c: ['Change to: I wanted to go; however, it was raining.', 'Change to: I wanted to go, however, it was raining.', 'Change to: I wanted to go. however it was raining.', 'No change is needed'], a: 0, why: 'However joining two sentences needs a semicolon before it and a comma after it.' },
    { s: 'If I was taller, I would play basketball.', c: ['Change was to were', 'Change would to will', 'Change taller to more tall', 'No change is needed'], a: 0, why: 'For wishes and "what if" ideas, use were (the subjunctive).' },
    { s: 'Yesterday she lay the book on the table.', c: ['Change lay to laid', 'Change lay to lied', 'Change table to tables', 'No change is needed'], a: 0, why: 'To lay something down; yesterday she laid it.' },
    { s: 'Neither the coach nor the players was ready.', c: ['Change was to were', 'Change nor to or', "Change players to player's", 'No change is needed'], a: 0, why: 'With neither/nor, the verb matches the closer word: players were.' },
    { s: 'The reason is because I overslept.', c: ['Change because to that', 'Change is to was', 'Change overslept to oversleeped', 'No change is needed'], a: 0, why: '"The reason is because" says because twice. Use "the reason is that."' },
    { s: "Its' a long drive to the coast.", c: ["Change Its' to It's", "Change Its' to Its", 'Change drive to drives', 'No change is needed'], a: 0, why: "It's = it is. Its' is never correct." },
    { s: 'The principle reason for the delay was weather.', c: ['Change principle to principal', 'Change reason to reasons', 'Change was to were', 'No change is needed'], a: 0, why: 'Principal means main. A principle is a rule or belief.' },
    { s: 'Fewer than ten students attended.', c: ['Change Fewer to Less', 'Change attended to attend', "Change students to student's", 'No change is needed'], a: 3, why: 'This sentence is already right! Fewer is for things you can count.' },
    { s: 'Whoever finishes first will win the prize.', c: ['Change Whoever to Whomever', 'Change finishes to finish', 'Change win to won', 'No change is needed'], a: 3, why: 'This sentence is already right! Whoever is the one doing the finishing.' }
  ]
};

// Spelling: the right spelling first, then 3 common misspellings
const SPELLING = {
  kitten: [
    ['because', 'becuase', 'becaus', 'beacuse'], ['friend', 'freind', 'frend', 'friennd'],
    ['said', 'sed', 'siad', 'sayd'], ['again', 'agian', 'agen', 'aggain'],
    ['could', 'cood', 'coud', 'culd'], ['their', 'thier', 'ther', 'theyr'],
    ['people', 'peeple', 'poeple', 'pepole'], ['school', 'skool', 'scool', 'schol'],
    ['before', 'befor', 'beefore', 'bifore'], ['every', 'evry', 'everey', 'evrey'],
    ['laugh', 'laf', 'lagh', 'laff'], ['other', 'uther', 'othr', 'othur'],
    ['house', 'hous', 'howse', 'hause'], ['answer', 'anser', 'ansewr', 'answr'],
    ['happy', 'hapy', 'happey', 'hapey'], ['little', 'littel', 'litle', 'lettle'],
    ['night', 'nite', 'nigt', 'niht'], ['write', 'rite', 'wrigt', 'writ'],
    ['thought', 'thot', 'thougt', 'thaught'], ['pretty', 'prity', 'pritty', 'prety']
  ],
  tiger: [
    ['necessary', 'neccessary', 'necesary', 'nesessary'], ['separate', 'seperate', 'separete', 'seprate'],
    ['definitely', 'definately', 'defanitely', 'definitly'], ['beginning', 'begining', 'beggining', 'beginnig'],
    ['believe', 'beleive', 'belive', 'beleve'], ['government', 'goverment', 'govermant', 'governmint'],
    ['environment', 'enviroment', 'envirement', 'environmant'], ['tomorrow', 'tommorow', 'tomorow', 'tommorrow'],
    ['probably', 'probly', 'probaly', 'probabley'], ['restaurant', 'resturant', 'restaraunt', 'restaurent'],
    ['February', 'Febuary', 'Febraury', 'Feburary'], ['library', 'libary', 'liberry', 'librery'],
    ['favorite', 'favrite', 'favorit', 'faverite'], ['surprise', 'suprise', 'surprize', 'serprise'],
    ['weird', 'wierd', 'weerd', 'wiered']
  ],
  lion: [
    ['accommodate', 'accomodate', 'acommodate', 'accommadate'], ['conscientious', 'conscientous', 'consciencious', 'concientious'],
    ['embarrass', 'embarass', 'embarras', 'embaress'], ['occurrence', 'occurence', 'ocurrence', 'occurance'],
    ['privilege', 'priviledge', 'privelege', 'privilige'], ['rhythm', 'rythm', 'rhythym', 'rhytm'],
    ['maintenance', 'maintainance', 'maintenence', 'maintanance'], ['millennium', 'millenium', 'milennium', 'millenniam'],
    ['conscience', 'concience', 'consience', 'conscence'], ['recommend', 'reccommend', 'recomend', 'reccomend'],
    ['questionnaire', 'questionaire', 'questionnare', 'questionnair'], ['liaison', 'liason', 'liasion', 'liaision'],
    ['mischievous', 'mischievious', 'mischevious', 'mischivous'], ['perseverance', 'perseverence', 'persaverance', 'perserverance']
  ]
};

// Picks 5 different questions from a list
function pickFive(list) {
  return shuffle(list).slice(0, QUESTIONS_PER_ROUND);
}

// Shows answer buttons for word games. Long answers get wide buttons.
function showWordChoices(options, rightOption, explain) {
  const box = document.getElementById('gameChoices');
  box.textContent = '';
  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.textContent = option;
    if (option.length > 14) { button.style.width = '90%'; button.style.fontSize = '20px'; }
    button.addEventListener('click', () => checkWordAnswer(button, option === rightOption, explain));
    box.appendChild(button);
  });
}

function checkWordAnswer(button, isRight, explain) {
  document.querySelectorAll('#gameChoices .choice').forEach(b => b.disabled = true);
  const feedback = document.getElementById('gameFeedback');
  if (isRight) {
    button.classList.add('right');
    round.correct += 1;
    document.getElementById('gameBowl').textContent += pet ? (PET_FOOD[pet.type] || '⭐') : '⭐';
    feedback.textContent = '✅ Yes! ' + explain;
    setTimeout(nextWordQuestion, 2200);
  } else {
    button.classList.add('wrong');
    feedback.textContent = 'Not quite! ' + explain;
    setTimeout(nextWordQuestion, 3800);
  }
}

function nextWordQuestion() {
  if (round.number === QUESTIONS_PER_ROUND) { endRound(); return; }
  const item = round.items[round.number];
  round.number += 1;
  document.getElementById('gameFeedback').textContent = '';
  if (round.game === 'grammar') showGrammarQuestion(item);
  else showSpellingQuestion(item);
}

// ---------- Fix the sentence ----------
function startGrammar() {
  round = { game: 'grammar', number: 0, correct: 0, items: pickFive(GRAMMAR[animal.theme]) };
  nextWordQuestion();
}

function showGrammarQuestion(item) {
  document.getElementById('gameTitle').textContent =
    `✏️ What change should be made?  (${round.number} of ${QUESTIONS_PER_ROUND})`;
  const question = document.getElementById('gameQuestion');
  question.style.fontSize = '28px';
  question.textContent = item.s;
  showWordChoices(item.c, item.c[item.a], item.why);
}

// ---------- Spelling ----------
function startSpelling() {
  round = { game: 'spelling', number: 0, correct: 0, items: pickFive(SPELLING[animal.theme]) };
  nextWordQuestion();
}

function sayWord(word) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(word);
  voice.rate = 0.8;
  speechSynthesis.speak(voice);
}

function showSpellingQuestion(item) {
  const word = item[0];
  document.getElementById('gameTitle').textContent =
    `🔊 Listen, then pick the right spelling  (${round.number} of ${QUESTIONS_PER_ROUND})`;
  const question = document.getElementById('gameQuestion');
  question.style.fontSize = '28px';
  question.textContent = '';
  const hear = document.createElement('button');
  hear.className = 'choice';
  hear.style.width = '90%';
  hear.textContent = '🔊 Hear the word';
  hear.addEventListener('click', () => sayWord(word));
  question.appendChild(hear);
  sayWord(word);
  showWordChoices(shuffle(item), word, `It's spelled ${word}.`);
}
