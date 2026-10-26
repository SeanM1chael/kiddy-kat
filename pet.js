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
  pet = { type: pickedType, name: name, points: 0, cared: {}, treats: { date: '', count: 0 } };
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
  savePet();
  showPet();
  if (petStage() > before) return `🎉 ${pet.name} grew into a ${stageName(petStage())}!`;
  return `${pet.name} got ${CARE[listName]}!`;
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
