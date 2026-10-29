// =====================================================================
// pet.js — the Kiddy Kat virtual pet
// The pet grows when the kid finishes real routines (and, later, games).
// It never gets sick or dies. On a skipped day it just waits for them.
// =====================================================================

const PET_TYPES = {
  kitten: { stages: ['🥚', '🐱', '😺', '🐈'], sounds: ['Purr!', 'Meow!', '*swishes tail happily*'] },
  puppy:  { stages: ['🥚', '🐶', '🐕', '🦮'], sounds: ['Woof!', '*wags tail*', 'Arf arf!'] },
  bunny:  { stages: ['🥚', '🐰', '🐇', '🐇'], sounds: ['*hop hop*', '*wiggles nose*', '*happy thump*'] },
  flower: { stages: ['🌰', '🌱', '🌷', '🌻'], sounds: ['*sways in the sun*', '*leaves wiggle*', '*smells sweet*'] },
  // Special pets, unlocked by milestones (see UNLOCKS below)
  hamster: { stages: ['🥚', '🐭', '🐹', '🐹'], sounds: ['*stuffs cheeks*', '*runs on wheel*', 'Squeak!'] },
  turtle:  { stages: ['🥚', '🐢', '🐢', '🐢'], sounds: ['*slow happy blink*', '*peeks out of shell*', '*tiny yawn*'] },
  parrot:  { stages: ['🥚', '🐣', '🐥', '🦜'], sounds: ['Hello! Hello!', 'Pretty bird!', '*whistles a song*'] },
  unicorn: { stages: ['🥚', '🦄', '🦄', '🦄'], sounds: ['*sparkles* ✨', '*rainbow neigh* 🌈', '*magic glitter*'] },
  dragon:  { stages: ['🥚', '🦎', '🐲', '🐉'], sounds: ['*tiny puff of smoke*', 'RAWR! 🔥', '*flaps wings*'] },
  // Grown-ups (career mode) grow a project instead of a pet
  startup: { adult: true, stages: ['💡', '🛠️', '🚀', '🏢'], names: ['idea', 'prototype', 'launch', 'company'], mess: '🐛',
             sounds: ['*ships a new feature*', 'Revenue is up 📈', '*whiteboard full of ideas*'] },
  bonsai:  { adult: true, stages: ['🌰', '🌱', '🪴', '🌳'], names: ['seed', 'sprout', 'bonsai', 'oak'], mess: '🍂',
             sounds: ['*steady growth*', '*new leaves*', '*roots go deeper*'] },
  summit:  { adult: true, stages: ['🏕️', '🥾', '🧗', '🏔️'], names: ['base camp', 'trail', 'climb', 'summit'], mess: '🪨',
             sounds: ['*one step at a time*', '*view keeps getting better*', '*clear skies ahead*'] },
  home:    { adult: true, stages: ['📐', '🧱', '🏗️', '🏡'], names: ['blueprint', 'foundation', 'framing', 'dream home'], mess: '🔩',
             sounds: ['*measure twice, cut once*', '*the walls go up*', '*feels like home*'] },
  dog:     { adult: true, stages: ['🐾', '🐶', '🐕', '🦮'], names: ['paw prints', 'puppy', 'good dog', 'best friend'], mess: '💩',
             sounds: ['Woof!', '*wags tail*', '*brings you your shoes*'] },
  eaglet:  { adult: true, stages: ['🪺', '🐣', '🐥', '🦅'], names: ['nest', 'hatchling', 'fledgling', 'eagle'], mess: '🪶',
             sounds: ['*soars over the city*', '*sharp eyes on the goal*', '*rides the wind*'] }
};

// Grown-up projects vs. kid pets
const isAdultType = type => !!(PET_TYPES[type] && PET_TYPES[type].adult);
const grownUpUser = () => typeof animal !== 'undefined' && animal.theme === 'eagle';
const petMess = (p = pet) => PET_TYPES[p.type].mess || (p.type === 'flower' ? '🍂' : '💩');
// "Kiddy hatched!" for pets, "Startup is underway!" for projects
function levelUpLine(p = pet) {
  if (petStage(p) === 1) return isAdultType(p.type) ? `🎉 ${p.name} is underway!` : `🐣 ${p.name} hatched!`;
  return `⬆️ ${p.name} leveled up to Level ${petStage(p) + 1}!`;
}

// When each pet type can be picked. Starter pets are always available.
const UNLOCKS = {
  hamster: { need: () => grownCount() >= 1, hint: 'Get 1 pet to Level 4' },
  turtle:  { need: () => grownCount() >= 1, hint: 'Get 1 pet to Level 4' },
  parrot:  { need: () => grownCount() >= 1, hint: 'Get 1 pet to Level 4' },
  unicorn: { need: () => (typeof trophies === 'function' ? trophies() : 0) >= 10, hint: 'Win 10 challenges' },
  dragon:  { need: () => grownCount() >= 3, hint: 'Get 3 pets to Level 4' },
  eaglet:  { need: () => grownCount() >= 1, hint: 'Get 1 project to Level 4' }
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

// The Pet House: every pet the kid has raised. `pet` is the one out to play.
// Older saves had just one pet under 'kiddyKatPet'; it becomes pet #1.
let petHouse = JSON.parse(localStorage.getItem('kiddyKatPets') || 'null');
if (!petHouse) {
  const onlyPet = JSON.parse(localStorage.getItem('kiddyKatPet') || 'null');
  petHouse = onlyPet ? [onlyPet] : [];
}
let pet = petHouse[Number(localStorage.getItem('kiddyKatActivePet') || 0)] || petHouse[0] || null;
let pickedType = null;

// Pets saved before the shop existed get the new fields
petHouse.forEach(p => {
  p.stars = p.stars || 0;
  p.owned = p.owned || [];
  p.wearing = p.wearing || null;
  p.poops = p.poops || 0;
  p.cared = p.cared || {};
  p.treats = p.treats || { date: '', count: 0 };
});

function savePet() {
  localStorage.setItem('kiddyKatPets', JSON.stringify(petHouse));
  localStorage.setItem('kiddyKatActivePet', Math.max(petHouse.indexOf(pet), 0));
}

function petToday() {
  return new Date().toDateString();
}

// Works for the pet out to play, or any pet passed in
function petStage(p = pet) {
  let stage = 0;
  STAGE_POINTS.forEach((points, i) => { if (p.points >= points) stage = i; });
  return stage;
}

function stageName(stage, p = pet) {
  if (PET_TYPES[p.type].names) return PET_TYPES[p.type].names[stage];
  return p.type === 'flower' ? FLOWER_NAMES[stage] : STAGE_NAMES[stage];
}

function grownCount() {
  return petHouse.filter(p => petStage(p) === 3).length;
}

// A new egg appears when every pet in the house is grown up
function canHatchNewPet() {
  return petHouse.length > 0 && grownCount() >= petHouse.length;
}

// Adds a note when the pet just became a grown-up
function grownUpNote() {
  if (!(petStage() === 3 && canHatchNewPet())) return '';
  return isAdultType(pet.type) ? '  🏗️ Room for a new project in your Projects!' : '  🥚 A new egg appeared in the Pet House!';
}

// ---------- Drawing the pet card ----------
function showPet() {
  const emoji = document.getElementById('petEmoji');
  const button = document.getElementById('petChooseButton');

  if (!pet) {
    emoji.textContent = grownUpUser() ? '🌱' : '🥚';
    emoji.className = 'petEmoji';
    document.getElementById('petName').textContent = grownUpUser()
      ? 'Start a project that grows with your routines!' : 'Someone is waiting to meet you!';
    button.textContent = grownUpUser() ? 'Choose your project' : 'Choose your pet';
    if (document.getElementById('petNext')) document.getElementById('petNext').textContent = '';
    document.getElementById('petMood').textContent = '';
    document.getElementById('petBar').style.display = 'none';
    button.style.display = 'inline-block';
    showPetExtras();
    return;
  }

  const stage = petStage();
  emoji.textContent = PET_TYPES[pet.type].stages[stage];
  emoji.className = 'petEmoji stage' + stage;
  // An egg gets cracks as it gets close to hatching
  if (stage === 0 && pet.points > 0 && !isAdultType(pet.type)) emoji.className += ' cracks' + Math.min(pet.points, 2);
  document.getElementById('petName').textContent = pet.name;
  button.style.display = 'none';

  // Mood is always kind: happy, or waiting for them
  const cared = Object.keys(CARE).filter(list => pet.cared[list] === petToday());
  let mood;
  if (isAdultType(pet.type)) {
    if (cared.length === 0) mood = `Finish a list to move ${pet.name} forward.`;
    else if (cared.length === 3) mood = `All 3 lists done. Great day for ${pet.name}! 🌟`;
    else mood = `${cared.length} of 3 lists done today. Keep going!`;
  } else if (cared.length === 0) mood = `${pet.name} is waiting for you! 💛`;
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

  // What happens next, in plain words
  const nextLine = document.getElementById('petNext');
  if (nextLine) {
    const toGo = next ? next - pet.points : 0;
    const lists = `${toGo} more checklist${toGo === 1 ? '' : 's'}`;
    if (stage === 0 && isAdultType(pet.type)) nextLine.textContent = `${PET_TYPES[pet.type].stages[0]} ${pet.name} is at the ${stageName(0)} stage. ${lists} to get it going!`;
    else if (stage === 0) nextLine.textContent = toGo === 1 ? `🥚💥 ${pet.name} is almost out! Finish 1 more checklist to hatch!`
                                                       : `🥚 ${pet.name} is inside the egg! Finish ${lists} to hatch.`;
    else if (next) nextLine.textContent = `⭐ Level ${stage + 1} of 4 · ${lists} until ${pet.name} levels up!`;
    else nextLine.textContent = `🌟 Level 4 of 4 · ${pet.name} is at the top level!`;
  }

  showPetExtras();
  if (typeof showWeekendCard === 'function') showWeekendCard();     // star count changed
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
// The picture shown for each type in the chooser
const CHOOSER_ICONS = { kitten: '🐱', puppy: '🐶', bunny: '🐰', flower: '🌻', hamster: '🐹',
                        turtle: '🐢', parrot: '🦜', unicorn: '🦄', dragon: '🐉',
                        startup: '🚀', bonsai: '🌳', summit: '🏔️', home: '🏡', dog: '🐕', eaglet: '🦅' };
const CHOOSER_LABELS = { startup: 'Startup', bonsai: 'Bonsai', summit: 'Summit', home: 'Dream home', dog: 'Best friend', eaglet: 'Eagle' };

function openPetChooser() {
  pickedType = null;
  document.getElementById('petNameInput').value = '';
  const box = document.getElementById('petOptions');
  box.textContent = '';
  const adult = grownUpUser();
  document.querySelector('#petChooser h2').textContent = adult ? 'Pick your project!' : 'Pick your pet!';
  document.getElementById('petNameInput').placeholder = adult ? 'Name it (like "Kiddy Kat")' : "Your pet's name";
  document.getElementById('hatchButton').textContent = adult ? 'Start! 🚀' : 'Hatch! 🥚';
  // Grown-ups pick projects, kids pick pets
  Object.keys(PET_TYPES).filter(type => isAdultType(type) === adult).forEach(type => {
    const unlock = UNLOCKS[type];
    const open = !unlock || unlock.need();
    const button = document.createElement('button');
    button.className = 'petOption';
    button.id = 'option-' + type;
    if (open) {
      button.textContent = CHOOSER_ICONS[type];
      if (CHOOSER_LABELS[type]) {
        const label = document.createElement('span');
        label.className = 'petOptionLabel';
        label.textContent = CHOOSER_LABELS[type];
        button.appendChild(label);
      }
      button.addEventListener('click', () => pickPetType(type));
    } else {
      button.textContent = '🔒';
      button.classList.add('locked');
      button.addEventListener('click', () => {
        document.getElementById('petLockHint').textContent = `🔒 ${unlock.hint} to unlock this one!`;
      });
    }
    box.appendChild(button);
  });
  document.getElementById('petLockHint').textContent = '';
  document.getElementById('petChooser').style.display = 'block';
}

function closePetChooser() {
  document.getElementById('petChooser').style.display = 'none';
}

function pickPetType(type) {
  pickedType = type;
  document.querySelectorAll('.petOption').forEach(b => b.classList.remove('picked'));
  document.getElementById('option-' + type).classList.add('picked');
}

function hatchPet() {
  const name = document.getElementById('petNameInput').value.trim();
  if (!pickedType || !name) {
    alert(grownUpUser() ? 'Pick a project and give it a name!' : 'Pick a pet and give it a name!');
    return;
  }
  const newPet = { type: pickedType, name: name, points: 0, cared: {}, treats: { date: '', count: 0 },
                   stars: 0, owned: [], wearing: null, poops: 0 };
  if (pet) moveDailyStuff(pet, newPet);   // stars and today's progress follow the kid
  petHouse.push(newPet);
  pet = newPet;
  savePet();
  document.getElementById('petChooser').style.display = 'none';
  closePetHouse();
  showPet();
  celebrate(isAdultType(pet.type) ? `🚀 ${name} has begun! Finish your lists to grow it.` : `🎉 Welcome, ${name}!`, PET_TYPES[pet.type].stages[0]);
  // Gift stars that were waiting for a pet (sync.js)
  if (typeof processParentInbox === 'function') setTimeout(processParentInbox, 3500);
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
  if (petStage() > before) return `${levelUpLine()} +3 ⭐${grownUpNote()}`;
  return isAdultType(pet.type) ? `+1 progress on ${pet.name}! +3 ⭐` : `${pet.name} got ${CARE[listName]}! +3 ⭐`;
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
  if (petStage() > before) return `${levelUpLine()}${grownUpNote()}`;
  return isAdultType(pet.type) ? `+1 progress on ${pet.name}! 📈` : `${pet.name} loved the treat! 🍪`;
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
    document.getElementById('houseButton').style.display = 'none';
    return;
  }

  const adultPet = isAdultType(pet.type);
  shopButton.style.display = adultPet ? 'none' : 'inline-block';      // pet outfits are a kid thing
  const houseButton = document.getElementById('houseButton');
  houseButton.style.display = (petHouse.length > 1 || canHatchNewPet()) ? 'inline-block' : 'none';
  houseButton.textContent = adultPet ? (canHatchNewPet() ? '🏗️ Projects ✨ NEW!' : '🏗️ Projects')
                                     : (canHatchNewPet() ? '🏠 Pet House 🥚 NEW!' : '🏠 Pet House');
  stars.textContent = `⭐ ${pet.stars} `;
  if (typeof infoButton === 'function') stars.appendChild(infoButton(
    'Stars ⭐ are what you spend in the 🛍️ Shop and on 🎁 Rewards.\n' +
    'Earn them by finishing checklists (+3 each), practice (+1 for each right answer), challenges (+5), scooping poop, and gifts from family.'));
  wear.textContent = pet.wearing ? shopItem(pet.wearing).emoji : '';
  room.textContent = pet.owned
    .map(shopItem)
    .filter(item => item && item.kind === 'room')
    .map(item => item.emoji)
    .join(' ');

  // Flowers drop leaves instead of poop; projects get bugs, rocks, bolts...
  const mess = petMess();
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
      adultPet ? `Tap the ${mess} to clear it! +1 ⭐`
      : pet.type === 'flower' ? 'Some leaves fell! Tap to tidy up 🍂' : 'Uh oh! Tap the 💩 to scoop it!';
  }
  if (typeof showGoal === 'function') showGoal();   // reward goal line (rewards.js)
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

// =====================================================================
// The Pet House: all pets live here. One is out to play at a time;
// the others nap happily and never get hungry or sad.
// =====================================================================

// Stars and today's care belong to the kid, so they move to whichever pet is out
function moveDailyStuff(fromPet, toPet) {
  toPet.stars = fromPet.stars;
  toPet.cared = { ...fromPet.cared };
  toPet.treats = { ...fromPet.treats };
  fromPet.stars = 0;
}

function openPetHouse() {
  document.getElementById('petHouse').style.display = 'block';
  showPetHouse();
}

function closePetHouse() {
  document.getElementById('petHouse').style.display = 'none';
}

function showPetHouse() {
  const box = document.getElementById('houseRooms');
  box.textContent = '';

  petHouse.forEach(p => {
    const card = document.createElement('div');
    card.className = 'shopCard' + (p === pet ? ' playing' : '');
    const look = document.createElement('div');
    look.className = 'shopEmoji';
    look.textContent = PET_TYPES[p.type].stages[petStage(p)] + (p.wearing ? shopItem(p.wearing).emoji : '');
    const name = document.createElement('div');
    name.textContent = petStage(p) === 0 && !isAdultType(p.type) ? `${p.name} (egg)` : `${p.name} · Level ${petStage(p) + 1} (${stageName(petStage(p), p)})`;
    const status = document.createElement('button');
    if (p === pet) {
      status.textContent = isAdultType(p.type) ? '🛠️ Working on it now' : '🎾 Playing now';
      status.disabled = true;
    } else {
      status.textContent = '😴 Napping · Play!';
      status.addEventListener('click', () => playWith(p));
    }
    card.append(look, name, status);
    box.appendChild(card);
  });

  if (canHatchNewPet()) {
    const egg = document.createElement('div');
    egg.className = 'shopCard newEgg';
    const look = document.createElement('div');
    look.className = 'shopEmoji';
    look.textContent = grownUpUser() ? '🌱' : '🥚';
    const name = document.createElement('div');
    name.textContent = grownUpUser() ? 'Room for a new project!' : 'A new egg!';
    const button = document.createElement('button');
    button.textContent = grownUpUser() ? 'Start one!' : 'Hatch it!';
    button.addEventListener('click', openPetChooser);
    egg.append(look, name, button);
    box.appendChild(egg);
  } else {
    const hint = document.createElement('p');
    const growing = petHouse.find(p => petStage(p) < 3);
    hint.textContent = `🥚 Get ${growing.name} to Level 4 to find a new egg!`;
    box.appendChild(hint);
  }
}

function playWith(p) {
  moveDailyStuff(pet, p);
  pet = p;
  savePet();
  showPet();
  showPetHouse();
  if (typeof showChallengeButton === 'function') showChallengeButton();
}
