// =====================================================================
// pet.js — the Kiddy Kat virtual pet
// The pet grows when the kid finishes real routines (and, later, games).
// It never gets sick or dies. On a skipped day it just waits for them.
// =====================================================================

const PET_TYPES = {
  kitten: { stages: ['🥚', '🐱', '😺', '🐈'], sounds: ['Purr!', 'Meow!', '*swishes tail happily*'] },
  puppy:  { stages: ['🥚', '🐶', '🐕', '🦮'], sounds: ['Woof!', '*wags tail*', 'Arf arf!'] },
  bunny:  { stages: ['🥚', '🐰', '🐇', '🐇'], sounds: ['*hop hop*', '*wiggles nose*', '*happy thump*'] },
  flower: { stages: ['🌰', '🌱', '🌷', '🌻'], sounds: ['*sways in the sun*', '*leaves wiggle*', '*smells sweet*'] }
};

const STAGE_NAMES  = ['egg', 'baby', 'big kid', 'grown-up'];
const FLOWER_NAMES = ['seed', 'sprout', 'bud', 'full bloom'];
const STAGE_POINTS = [0, 3, 15, 40];      // points needed for each stage
const TREATS_PER_DAY = 3;                 // games can give up to 3 treats a day

// What the pet gets when each list is finished
const CARE = {
  morning:   'breakfast 🍎',
  afternoon: 'playtime 🎾',
  bedtime:   'a cozy nap 😴'
};

let pet = JSON.parse(localStorage.getItem('kiddyKatPet') || 'null');
let pickedType = null;

// Pets saved before the shop existed get the new fields
if (pet) {
  pet.stars = pet.stars || 0;
  pet.owned = pet.owned || [];
  pet.wearing = pet.wearing || null;
  pet.poops = pet.poops || 0;
}

function savePet() {
  localStorage.setItem('kiddyKatPet', JSON.stringify(pet));
}

function petToday() {
  return new Date().toDateString();
}

function petStage() {
  let stage = 0;
  STAGE_POINTS.forEach((points, i) => { if (pet.points >= points) stage = i; });
  return stage;
}

function stageName(stage) {
  return pet.type === 'flower' ? FLOWER_NAMES[stage] : STAGE_NAMES[stage];
}

// ---------- Drawing the pet card ----------
function showPet() {
  const emoji = document.getElementById('petEmoji');
  const button = document.getElementById('petChooseButton');

  if (!pet) {
    emoji.textContent = '🥚';
    emoji.className = 'petEmoji';
    document.getElementById('petName').textContent = 'Someone is waiting to meet you!';
    document.getElementById('petMood').textContent = '';
    document.getElementById('petBar').style.display = 'none';
    button.style.display = 'inline-block';
    showPetExtras();
    return;
  }

  const stage = petStage();
  emoji.textContent = PET_TYPES[pet.type].stages[stage];
  emoji.className = 'petEmoji stage' + stage;
  document.getElementById('petName').textContent = `${pet.name} the ${stageName(stage)}`;
  button.style.display = 'none';

  // Mood is always kind: happy, or waiting for them
  const cared = Object.keys(CARE).filter(list => pet.cared[list] === petToday());
  let mood;
  if (cared.length === 0) mood = `${pet.name} is waiting for you! 💛`;
  else if (cared.length === 3) mood = `${pet.name} is SO happy today! 🌟`;
  else mood = `${pet.name} had ${cared.map(list => CARE[list]).join(' and ')}!`;
  document.getElementById('petMood').textContent = mood;

  // Progress bar to the next stage
  const bar = document.getElementById('petBar');
  bar.style.display = 'block';
  const next = STAGE_POINTS[stage + 1];
  const fill = next
    ? (pet.points - STAGE_POINTS[stage]) / (next - STAGE_POINTS[stage]) * 100
    : 100;
  document.getElementById('petBarFill').style.width = fill + '%';

  showPetExtras();
}

// Tap the pet: it bounces and makes a sound
function petPoke() {
  if (!pet) { openPetChooser(); return; }
  const emoji = document.getElementById('petEmoji');
  emoji.classList.remove('bounce');
  void emoji.offsetWidth;                 // restarts the animation
  emoji.classList.add('bounce');
  const sounds = PET_TYPES[pet.type].sounds;
  document.getElementById('petMood').textContent = sounds[Math.floor(Math.random() * sounds.length)];
}

// ---------- Choosing and naming a pet ----------
function openPetChooser() {
  document.getElementById('petChooser').style.display = 'block';
}

function pickPetType(type) {
  pickedType = type;
  document.querySelectorAll('.petOption').forEach(b => b.classList.remove('picked'));
  document.getElementById('option-' + type).classList.add('picked');
}

function hatchPet() {
  const name = document.getElementById('petNameInput').value.trim();
  if (!pickedType || !name) {
    alert('Pick a pet and give it a name!');
    return;
  }
  pet = { type: pickedType, name: name, points: 0, cared: {}, treats: { date: '', count: 0 },
          stars: 0, owned: [], wearing: null, poops: 0 };
  savePet();
  document.getElementById('petChooser').style.display = 'none';
  showPet();
  celebrate(`🎉 Welcome, ${name}!`, PET_TYPES[pet.type].stages[0]);
}

// ---------- Caring for the pet ----------
// Called when a whole list is finished. Each list counts once a day.
// Returns a message for the celebration screen, or null.
function carePet(listName) {
  if (!pet || pet.cared[listName] === petToday()) return null;
  const before = petStage();
  pet.cared[listName] = petToday();
  pet.points += 1;
  pet.stars += 3;
  maybePoop();
  savePet();
  showPet();
  if (petStage() > before) return `🎉 ${pet.name} grew into a ${stageName(petStage())}! +3 ⭐`;
  return `${pet.name} got ${CARE[listName]}! +3 ⭐`;
}

// Called by the learning games. Up to 3 treats a day.
// Returns a message, or null when the pet is full for today.
function givePetTreat() {
  if (!pet) return null;
  if (pet.treats.date !== petToday()) pet.treats = { date: petToday(), count: 0 };
  if (pet.treats.count >= TREATS_PER_DAY) return null;
  const before = petStage();
  pet.treats.count += 1;
  pet.points += 1;
  maybePoop();
  savePet();
  showPet();
  if (petStage() > before) return `🎉 ${pet.name} grew into a ${stageName(petStage())}!`;
  return `${pet.name} loved the treat! 🍪`;
}

function petTreatsLeft() {
  if (!pet) return 0;
  if (pet.treats.date !== petToday()) return TREATS_PER_DAY;
  return TREATS_PER_DAY - pet.treats.count;
}

// =====================================================================
// Stars, poop scooping and the pet shop
// Stars come from finished lists (+3), game rounds (+1 per right answer)
// and scooping poop (+1, or +2 with a poop mat).
// =====================================================================

const SHOP = [
  { id: 'mat',        name: 'Poop mat',      emoji: '🟫', price: 5,  kind: 'room', note: 'Scooping gives 2 ⭐ instead of 1!' },
  { id: 'ball',       name: 'Bouncy ball',   emoji: '⚽', price: 10, kind: 'room' },
  { id: 'bow',        name: 'Bow',           emoji: '🎀', price: 12, kind: 'wear' },
  { id: 'bed',        name: 'Cozy bed',      emoji: '🛏️', price: 15, kind: 'room' },
  { id: 'sunglasses', name: 'Cool shades',   emoji: '🕶️', price: 20, kind: 'wear' },
  { id: 'tophat',     name: 'Top hat',       emoji: '🎩', price: 20, kind: 'wear' },
  { id: 'teddy',      name: 'Teddy bear',    emoji: '🧸', price: 25, kind: 'room' },
  { id: 'crown',      name: 'Royal crown',   emoji: '👑', price: 40, kind: 'wear' },
  // Halloween items: only in the shop from Oct 15 to Nov 7
  { id: 'pumpkin',    name: 'Jack-o-lantern', emoji: '🎃', price: 8,  kind: 'room', season: 'halloween' },
  { id: 'candy',      name: 'Candy bowl',     emoji: '🍬', price: 10, kind: 'room', season: 'halloween' },
  { id: 'ghost',      name: 'Ghost costume',  emoji: '👻', price: 15, kind: 'wear', season: 'halloween' },
  { id: 'witch',      name: 'Witch hat',      emoji: '🧙', price: 15, kind: 'wear', season: 'halloween' }
];

function inSeason(item) {
  if (item.season !== 'halloween') return true;
  const now = new Date();
  const month = now.getMonth() + 1, day = now.getDate();
  return (month === 10 && day >= 15) || (month === 11 && day <= 7);
}

function shopItem(id) {
  return SHOP.find(item => item.id === id);
}

// Sometimes the pet poops after eating (never more than 3 at once)
function maybePoop() {
  if (pet.poops < 3 && Math.random() < 0.6) pet.poops += 1;
}

function addStars(count) {
  if (!pet || count <= 0) return;
  pet.stars += count;
  savePet();
  showPet();
}

function scoopPoop() {
  if (!pet || pet.poops === 0) return;
  pet.poops -= 1;
  const reward = pet.owned.includes('mat') ? 2 : 1;
  pet.stars += reward;
  savePet();
  showPet();
  const emoji = document.getElementById('petEmoji');
  emoji.classList.remove('bounce');
  void emoji.offsetWidth;
  emoji.classList.add('bounce');
  const lines = pet.type === 'flower'
    ? ['*fresh and tidy!*', '*leaves sparkle*']
    : ['Thank you! 😊', 'Ahh, so clean!', '*happy wiggle*'];
  document.getElementById('petMood').textContent =
    `${lines[Math.floor(Math.random() * lines.length)]}  +${reward} ⭐`;
}

// Stars, what the pet is wearing, its room, and poop to scoop
function showPetExtras() {
  const stars = document.getElementById('petStars');
  const wear = document.getElementById('petWear');
  const room = document.getElementById('petRoom');
  const poops = document.getElementById('petPoops');
  const shopButton = document.getElementById('shopButton');

  if (!pet) {
    stars.textContent = '';
    wear.textContent = '';
    room.textContent = '';
    poops.textContent = '';
    shopButton.style.display = 'none';
    return;
  }

  shopButton.style.display = 'inline-block';
  stars.textContent = `⭐ ${pet.stars}`;
  wear.textContent = pet.wearing ? shopItem(pet.wearing).emoji : '';
  room.textContent = pet.owned
    .map(shopItem)
    .filter(item => item && item.kind === 'room')
    .map(item => item.emoji)
    .join(' ');

  // Flowers drop leaves instead of poop
  const mess = pet.type === 'flower' ? '🍂' : '💩';
  poops.textContent = '';
  for (let i = 0; i < pet.poops; i++) {
    const button = document.createElement('button');
    button.className = 'poop' + (pet.owned.includes('mat') ? ' onMat' : '');
    button.textContent = mess;
    button.title = 'Tap to clean up';
    button.addEventListener('click', scoopPoop);
    poops.appendChild(button);
  }
  if (pet.poops > 0) {
    document.getElementById('petMood').textContent =
      pet.type === 'flower' ? 'Some leaves fell! Tap to tidy up 🍂' : 'Uh oh! Tap the 💩 to scoop it!';
  }
}

// ---------- The shop ----------
function openShop() {
  document.getElementById('shop').style.display = 'block';
  showShop();
}

function closeShop() {
  document.getElementById('shop').style.display = 'none';
}

function showShop() {
  document.getElementById('shopStars').textContent = `You have ⭐ ${pet.stars}`;
  const grid = document.getElementById('shopItems');
  grid.textContent = '';

  SHOP.filter(inSeason).forEach(item => {
    const card = document.createElement('div');
    card.className = 'shopCard';

    const top = document.createElement('div');
    top.className = 'shopEmoji';
    top.textContent = item.emoji;
    const name = document.createElement('div');
    name.textContent = item.name + (item.season ? ' 🎃' : '');
    card.append(top, name);

    if (item.note) {
      const note = document.createElement('div');
      note.className = 'shopNote';
      note.textContent = item.note;
      card.appendChild(note);
    }

    const button = document.createElement('button');
    const owned = pet.owned.includes(item.id);
    if (!owned) {
      button.textContent = `Buy ⭐ ${item.price}`;
      button.disabled = pet.stars < item.price;
      button.addEventListener('click', () => buyItem(item));
    } else if (item.kind === 'wear') {
      const wearing = pet.wearing === item.id;
      button.textContent = wearing ? 'Take off' : 'Wear it';
      button.addEventListener('click', () => {
        pet.wearing = wearing ? null : item.id;
        savePet();
        showPet();
        showShop();
      });
    } else {
      button.textContent = '✅ In the room';
      button.disabled = true;
    }
    card.appendChild(button);
    grid.appendChild(card);
  });
}

function buyItem(item) {
  if (pet.stars < item.price || pet.owned.includes(item.id)) return;
  pet.stars -= item.price;
  pet.owned.push(item.id);
  if (item.kind === 'wear') pet.wearing = item.id;   // put it on right away
  savePet();
  showPet();
  showShop();
  celebrate(`${pet.name} got a ${item.name.toLowerCase()}!`, item.emoji, false);
}
