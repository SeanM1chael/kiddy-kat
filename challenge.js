// =====================================================================
// challenge.js — Kiddy Kat Challenge of the Day
// A pretend live stream: LIVE badge, viewers, chat from pet friends,
// floating hearts. Nothing is filmed or shared; it all stays on the phone.
// =====================================================================

// Challenge kinds:
//   move  = do it before the timer ends, then tap "I did it!"
//   hold  = keep going until the timer ends (balance, plank)
//   find  = find something, then tap "I found it!"
//   kind  = a kindness challenge, no timer
//   math / spell = get enough right answers before time runs out
const CHALLENGES = {
  kitten: [
    { kind: 'move',  text: 'Do 10 jumping jacks!', seconds: 30, reps: 10, strength: 17 },
    { kind: 'move',  text: 'Hop on one foot 10 times!', seconds: 30, reps: 10, strength: 15 },
    { kind: 'move',  text: 'Touch your toes 10 times!', seconds: 30, reps: 10, strength: 13 },
    { kind: 'hold',  text: 'Dance like your pet!', seconds: 20 },
    { kind: 'hold',  text: 'Balance on one foot!', seconds: 15 },
    { kind: 'move',  text: 'Crab walk across the room!', seconds: 45 },
    { kind: 'find',  text: 'Find something red!', seconds: 60 },
    { kind: 'find',  text: 'Find something super soft!', seconds: 60 },
    { kind: 'find',  text: 'Find 3 things shaped like a circle!', seconds: 90 },
    { kind: 'kind',  text: 'Make someone in your family laugh!' },
    { kind: 'kind',  text: 'Give someone a high five!' },
    { kind: 'kind',  text: 'Tell a grown-up one thing you learned today!' },
    { kind: 'move',  text: 'Put away 5 toys!', seconds: 60 },
    { kind: 'math',  text: 'Get 5 math problems right!', goal: 5, seconds: 60 },
    { kind: 'spell', text: 'Spell 3 words right!', goal: 3, seconds: 60 }
  ],
  tiger: [
    { kind: 'move',  text: 'Do 20 jumping jacks!', seconds: 40, reps: 20, strength: 17 },
    { kind: 'move',  text: 'Do 10 push-ups!', seconds: 40 },
    { kind: 'hold',  text: 'Wall sit!', seconds: 30 },
    { kind: 'hold',  text: 'Hold a plank!', seconds: 30 },
    { kind: 'find',  text: 'Find something older than you!', seconds: 60 },
    { kind: 'kind',  text: 'Do a chore nobody asked you to do!' },
    { kind: 'kind',  text: 'Give someone a real compliment!' },
    { kind: 'math',  text: 'Get 8 times-table problems right!', goal: 8, seconds: 60 },
    { kind: 'spell', text: 'Spell 4 tricky words right!', goal: 4, seconds: 60 }
  ],
  lion: [
    { kind: 'move',  text: 'Do 25 squats!', seconds: 45, reps: 25, strength: 13 },
    { kind: 'move',  text: 'Do 15 push-ups!', seconds: 45 },
    { kind: 'hold',  text: 'Hold a plank!', seconds: 45 },
    { kind: 'kind',  text: 'Make your bed hotel-perfect!' },
    { kind: 'kind',  text: 'Help someone in your family without being asked!' },
    { kind: 'math',  text: 'Get 10 math problems right!', goal: 10, seconds: 60 },
    { kind: 'spell', text: 'Spell 5 hard words right!', goal: 5, seconds: 60 }
  ]
};

const FANS = ['Bunny42', 'PuppyPal', 'KittyQueen', 'TigerTom', 'LuckyLion', 'Sprinkles', 'MrWiggles', 'StarFish7'];
const CHEERS = ['You got this!! 💪', 'GO GO GO 🔥', 'SO FAST 😮', 'this is the best stream ever', 'hi from the chat 👋',
                'LET\'S GOOO 🚀', 'wow wow wow', '❤️❤️❤️', 'you\'re amazing!!', 'keep going!!', 'legend 🏆'];
const WIN_LINES = ['OMG YOU DID IT!! 🎉', 'CHAMPION 🏆🏆', 'best challenge ever!!', 'GG!! 🥳', 'I knew you could do it ❤️'];

let challengeTimer = null;
let chatTimer = null;
let live = null;   // the challenge being played right now

function todayChallenge() {
  const list = CHALLENGES[animal.theme];
  const dayNumber = Math.floor(Date.now() / 86400000);
  return list[(dayNumber * 7) % list.length];   // same challenge all day, a new one tomorrow
}

function challengeStatus() {
  const saved = JSON.parse(localStorage.getItem('kiddyKatChallenge') || 'null');
  return saved && saved.date === new Date().toDateString() ? saved : { date: new Date().toDateString(), done: false };
}

function trophies() {
  return Number(localStorage.getItem('kiddyKatTrophies') || 0);
}

function followers() {
  return Number(localStorage.getItem('kiddyKatFollowers') || 0);
}

// Days in a row with a challenge win
function winStreak() {
  const streak = JSON.parse(localStorage.getItem('kiddyKatStreak') || 'null');
  if (!streak) return 0;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  return (streak.last === new Date().toDateString() || streak.last === yesterday) ? streak.count : 0;
}

function addWinToStreak() {
  const today = new Date().toDateString();
  const count = winStreak() + 1;
  localStorage.setItem('kiddyKatStreak', JSON.stringify({ last: today, count: count }));
  return count;
}

// Chat lines that know the kid: their name, the pet's outfit, trophies, streak
function personalCheers() {
  const name = callName();   // her name or a nickname
  const lines = [`GO ${name.toUpperCase()}!! 🔥`, `${name} is the best streamer ever`, `hi ${name}!! 👋`,
                 `${name} for president 😂`, `I came back just to watch ${name}!!`, `${callName().toUpperCase()}!!! ❤️`];
  if (pet) {
    lines.push(`${pet.name} is sooo cute 😍`, `say hi to ${pet.name}!!`);
    if (pet.wearing) {
      const item = shopItem(pet.wearing);
      lines.push(`love ${pet.name}'s ${item.name.toLowerCase()} ${item.emoji}`);
    }
  }
  if (trophies() > 0) lines.push(`${trophies()} ${trophies() === 1 ? 'trophy' : 'trophies'} already?! legend 🏆`);
  if (winStreak() > 1) lines.push(`${winStreak()} days in a row!! 🔥🔥`);
  if (followers() > 0) lines.push(`one of your ${followers()} followers here ❤️`);
  return lines;
}

function showChallengeButton() {
  const button = document.getElementById('challengeButton');
  if (!button) return;
  const done = challengeStatus().done;
  button.textContent = done ? `🏆 ${trophies()}` : '🔴 Challenge';
  button.classList.toggle('newChallenge', !done);
}

// ---------- Opening the live screen ----------
function openChallenge() {
  // More followers means more viewers show up
  const startViewers = 3 + Math.floor(followers() / 3) + Math.floor(Math.random() * 6);
  live = { item: todayChallenge(), right: 0, viewers: startViewers };
  document.getElementById('challenge').style.display = 'block';
  document.getElementById('chChat').textContent = '';
  document.getElementById('chTimer').textContent = '';
  document.getElementById('chTitle').textContent = live.item.text;
  updateViewers();

  const host = pet ? pet.name : 'Kiddy Kat';
  const name = callName();
  const area = document.getElementById('chArea');
  area.textContent = '';
  if (challengeStatus().done) {
    addChat(host, `You already won today, ${name}! 🏆 New challenge tomorrow!`);
    addChallengeButton(area, '🔁 Do it again for fun', startCountdown);
  } else {
    addChat(host, `Welcome to ${name}'s stream!! Today's challenge is ready 👀`);
    addChallengeButton(area, '▶️ Start the challenge!', startCountdown);
  }
  startChat();
}

function closeChallenge() {
  stopRepCounter();
  clearInterval(challengeTimer);
  clearInterval(chatTimer);
  document.getElementById('challenge').style.display = 'none';
  live = null;
  showChallengeButton();
}

function addChallengeButton(box, label, action) {
  const button = document.createElement('button');
  button.className = 'chButton';
  button.textContent = label;
  button.addEventListener('click', action);
  box.appendChild(button);
  return button;
}

// ---------- 3, 2, 1, GO! ----------
async function startCountdown() {
  if (live.item.reps) live.motionOK = await askForMotion();
  const area = document.getElementById('chArea');
  area.textContent = '';
  let count = 3;
  const timerBox = document.getElementById('chTimer');
  timerBox.textContent = count;
  clearInterval(challengeTimer);
  challengeTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      timerBox.textContent = count;
    } else {
      clearInterval(challengeTimer);
      timerBox.textContent = 'GO!';
      addChat(randomFan(), 'GOOOO 🏁');
      runChallenge();
    }
  }, 1000);
}

function runChallenge() {
  const item = live.item;
  const area = document.getElementById('chArea');
  area.textContent = '';

  if (item.kind === 'kind') {
    // Someone in the family has to say they saw it
    document.getElementById('chTimer').textContent = '💛';
    const note = document.createElement('p');
    note.textContent = 'When you\'re done, ask someone who saw it to tap the button!';
    area.appendChild(note);
    addChallengeButton(area, '👀 I saw it! (family member taps)', () => {
      if (confirm(`Did you see ${profile ? callName() : 'them'} do it? Tap OK if yes!`)) winChallenge();
    });
    return;
  }
  if (item.kind === 'move' && item.reps && live.motionOK) startRepCounter(item);
  else if (item.kind === 'move') addChallengeButton(area, '✅ I did it!', winChallenge);
  if (item.kind === 'find') addPhotoProof(area);
  if (item.kind === 'math' || item.kind === 'spell') nextBlitzQuestion();

  let left = item.seconds;
  showSeconds(left);
  challengeTimer = setInterval(() => {
    left -= 1;
    showSeconds(left);
    if (left <= 0) {
      clearInterval(challengeTimer);
      timeUp();
    }
  }, 1000);
}

function showSeconds(left) {
  document.getElementById('chTimer').textContent = `⏱️ ${left}`;
}

function timeUp() {
  stopRepCounter();
  const item = live.item;
  if (item.kind === 'hold') { winChallenge(); return; }   // kept going the whole time!
  const area = document.getElementById('chArea');
  area.textContent = '';
  document.getElementById('chTimer').textContent = '⏰ Time!';
  if (item.kind === 'math' || item.kind === 'spell') {
    addChat(randomFan(), `so close!! ${live.right} out of ${item.goal} 💪`);
  } else if (item.reps && live.motionOK) {
    addChat(randomFan(), `so close!! ${live.reps} out of ${item.reps} 💪 try again!`);   // the counter is the proof
  } else if (item.kind === 'find') {
    addChat(randomFan(), 'take the photo when you find it!! 📸');
    addPhotoProof(area);
  } else {
    addChat(randomFan(), 'did you finish?? 👀');
    addChallengeButton(area, '✅ Yes, I did it!', winChallenge);
  }
  addChallengeButton(area, '🔁 Try again', startCountdown);
}

// ---------- Quick-fire math or spelling ----------
function nextBlitzQuestion() {
  const item = live.item;
  const area = document.getElementById('chArea');
  area.textContent = '';

  const progress = document.createElement('div');
  progress.className = 'chProgress';
  progress.textContent = `${live.right} / ${item.goal} right`;
  area.appendChild(progress);

  let prompt, options, answer;
  if (item.kind === 'math') {
    const q = mathQuestion(getMathLevel());
    prompt = q.prompt;
    answer = q.answer;
    options = q.choices;
  } else {
    const words = SPELLING[animal.theme];
    const pick = words[Math.floor(Math.random() * words.length)];
    answer = pick[0];
    options = shuffle(pick);
    prompt = '🔊';
    sayWord(answer);
  }

  const question = document.createElement('div');
  question.className = 'chQuestion';
  question.style.whiteSpace = 'pre-line';
  question.textContent = prompt;
  if (item.kind === 'spell') {
    question.style.cursor = 'pointer';
    question.addEventListener('click', () => sayWord(answer));
  }
  area.appendChild(question);

  options.forEach(option => {
    const button = addChallengeButton(area, item.kind === 'math' ? showNumber(option) : option, () => {
      if (option === answer) {
        live.right += 1;
        spawnHearts(2);
        if (live.right >= item.goal) { clearInterval(challengeTimer); winChallenge(); return; }
      } else {
        addChat(randomFan(), 'oops, next one! 😅');
      }
      nextBlitzQuestion();
    });
    button.classList.add('chChoice');
    if (Math.max(...options.map(o => String(o).length)) > 7) button.style.width = '90%';   // long words: full width
  });
}

// ---------- Winning ----------
function winChallenge() {
  stopRepCounter();
  clearInterval(challengeTimer);
  const firstWinToday = !challengeStatus().done;
  document.getElementById('chArea').textContent = '';
  document.getElementById('chTimer').textContent = '🏆';
  spawnHearts(15);
  WIN_LINES.forEach((line, i) => setTimeout(() => addChat(randomFan(), line), i * 400));

  if (firstWinToday) {
    localStorage.setItem('kiddyKatChallenge', JSON.stringify({ date: new Date().toDateString(), done: true }));
    localStorage.setItem('kiddyKatTrophies', trophies() + 1);
    addStars(5);
    const pay = earnMoney('challenge');

    // New followers: more for a streak of days in a row
    const streak = addWinToStreak();
    const newFans = 3 + Math.floor(Math.random() * 5) + Math.min(streak - 1, 5);
    localStorage.setItem('kiddyKatFollowers', followers() + newFans);
    updateViewers();
    setTimeout(() => addChat('Kiddy Kat', `🎉 +${newFans} new followers! You have ${followers()} now!`), 2000);
    setTimeout(() => celebrate(`Challenge complete! 🏆 +5 ⭐ ${pay}  (${trophies()} ${trophies() === 1 ? "trophy" : "trophies"})`, '🏆'), 2200);
  } else {
    setTimeout(() => celebrate('You did it again! 🎉', '🏆', false), 2200);
  }
  showChallengeButton();
}

// ---------- Pretend live chat ----------
function randomFan() {
  return FANS[Math.floor(Math.random() * FANS.length)];
}

function addChat(name, message) {
  const chat = document.getElementById('chChat');
  const line = document.createElement('div');
  const who = document.createElement('b');
  who.textContent = name + ': ';
  line.append(who, message);
  chat.appendChild(line);
  while (chat.children.length > 6) chat.removeChild(chat.firstChild);   // keep the last 6 lines
}

function updateViewers() {
  if (!live) return;
  document.getElementById('viewers').textContent = `👀 ${live.viewers}   ❤️ ${followers()} followers`;
}

function startChat() {
  clearInterval(chatTimer);
  chatTimer = setInterval(() => {
    if (!live) return;
    if (Math.random() < 0.6) {
      // About half the comments are personal
      const pool = Math.random() < 0.5 ? personalCheers() : CHEERS;
      addChat(randomFan(), pool[Math.floor(Math.random() * pool.length)]);
    }
    if (Math.random() < 0.5) { live.viewers += Math.floor(Math.random() * 3); updateViewers(); }
  }, 2500);
}

// Hearts float up from the bottom of the screen
function spawnHearts(count) {
  const box = document.getElementById('challenge');
  const hearts = ['❤️', '💖', '💛', '💜', '⭐'];
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span');
    heart.className = 'floatHeart';
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.left = (10 + Math.random() * 80) + '%';
    heart.style.animationDelay = (Math.random() * 0.6) + 's';
    box.appendChild(heart);
    setTimeout(() => heart.remove(), 2600);
  }
}

// =====================================================================
// Challenge proof
//   move challenges with reps -> the phone's motion sensor counts them
//   find challenges            -> a photo of what they found
//   kindness challenges        -> a family member taps "I saw it!"
// =====================================================================

let motionHandler = null;

// iPhones ask "Allow motion and orientation?" the first time
async function askForMotion() {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; }
    catch (err) { return false; }
  }
  return 'ondevicemotion' in window;
}

function startRepCounter(item) {
  const area = document.getElementById('chArea');
  live.reps = 0;
  const counter = document.createElement('div');
  counter.className = 'chQuestion';
  counter.id = 'repCount';
  counter.textContent = `0 / ${item.reps}`;
  const tip = document.createElement('p');
  tip.textContent = '📱 Hold your phone tight in one hand and GO!';
  area.append(counter, tip);

  let movedHard = false;
  let lastRep = 0;
  motionHandler = event => {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x === null) return;
    const strength = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);   // about 9.8 when still
    const now = Date.now();
    if (!movedHard && strength > item.strength && now - lastRep > 350) {
      movedHard = true;                  // one big move = one rep
      lastRep = now;
      live.reps += 1;
      counter.textContent = `${live.reps} / ${item.reps}`;
      spawnHearts(1);
      if (live.reps >= item.reps) winChallenge();
    } else if (movedHard && strength < 11) {
      movedHard = false;                 // back to normal: ready for the next rep
    }
  };
  window.addEventListener('devicemotion', motionHandler);
}

function stopRepCounter() {
  if (motionHandler) window.removeEventListener('devicemotion', motionHandler);
  motionHandler = null;
}

// ---------- Photo proof ----------
function addPhotoProof(area) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';         // opens the back camera on phones
  input.style.display = 'none';
  input.addEventListener('change', () => {
    if (input.files[0]) savePhotoProof(input.files[0]);
  });
  area.appendChild(input);
  addChallengeButton(area, '📸 Take a photo of it!', () => input.click());
}

// Shrinks the photo so it fits in the phone's storage, then saves it
function savePhotoProof(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 260;
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const small = canvas.toDataURL('image/jpeg', 0.6);

      const photos = JSON.parse(localStorage.getItem('kiddyKatProofPhotos') || '[]');
      photos.push({ text: live.item.text, date: new Date().toDateString(), image: small });
      localStorage.setItem('kiddyKatProofPhotos', JSON.stringify(photos.slice(-12)));   // keep the last 12

      const area = document.getElementById('chArea');
      area.textContent = '';
      const shot = document.createElement('img');
      shot.src = small;
      shot.className = 'proofShot';
      area.appendChild(shot);
      addChat(randomFan(), 'WOW great find 📸🔥');
      setTimeout(winChallenge, 1200);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// Photos for grown-ups to look at (in Grown-ups)
function showProofPhotos() {
  const box = document.getElementById('proofPhotos');
  if (!box) return;
  const photos = JSON.parse(localStorage.getItem('kiddyKatProofPhotos') || '[]');
  box.textContent = photos.length ? '' : 'No challenge photos yet.';
  photos.slice().reverse().forEach(p => {
    const card = document.createElement('div');
    card.className = 'proofCard';
    const shot = document.createElement('img');
    shot.src = p.image;
    const label = document.createElement('div');
    label.textContent = `${p.text} (${p.date})`;
    card.append(shot, label);
    box.appendChild(card);
  });
}
