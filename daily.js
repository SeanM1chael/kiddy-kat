// =====================================================================
// daily.js — little everyday helpers
//   • ⓘ info buttons that explain things
//   • tapping Morning / After School / Bedtime scrolls to that list
//   • the clock, and a countdown before leaving for school
//   • weather for where THIS phone is (not one city for everyone)
// =====================================================================

// ---------- ⓘ Info buttons ----------
// infoButton('text') makes a small "i" in a circle. Tapping it shows the text.
function infoButton(text) {
  const button = document.createElement('button');
  button.className = 'info';
  button.type = 'button';
  button.textContent = 'i';
  button.setAttribute('aria-label', 'More info');
  button.addEventListener('click', event => { event.stopPropagation(); showInfo(text); });
  return button;
}

function showInfo(text) {
  let pop = document.getElementById('infoPop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'infoPop';
    pop.addEventListener('click', () => pop.style.display = 'none');
    document.body.appendChild(pop);
  }
  pop.textContent = '';
  const box = document.createElement('div');
  box.className = 'infoBox';
  text.split('\n').forEach(line => { const p = document.createElement('p'); p.textContent = line; box.appendChild(p); });
  const ok = document.createElement('button');
  ok.textContent = 'Got it';
  box.appendChild(ok);
  pop.appendChild(box);
  pop.style.display = 'flex';
}

// Buttons written right in the page: <button class="info" data-info="...">i</button>
document.addEventListener('click', event => {
  const button = event.target.closest && event.target.closest('button.info[data-info]');
  if (!button) return;
  event.stopPropagation();
  showInfo(button.dataset.info);
}, true);

// ---------- Morning / After School / Bedtime: show the list and scroll to it ----------
function pickList(name) {
  show(name);
  const list = document.getElementById(name);
  if (list) setTimeout(() => list.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ---------- School clock and countdown ----------
// A grown-up sets the time to leave for school (⚙️ Grown-ups → ⏰ School mornings).
function leaveTime() {
  return localStorage.getItem('kiddyKatLeaveTime') || '';     // like "07:45"
}

let spokenWarning = '';

function showClock() {
  const card = document.getElementById('clockCard');
  if (!card) return;
  const now = new Date();
  const clock = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  card.className = '';
  card.textContent = '';
  const line = document.createElement('div');
  line.textContent = `🕐 ${clock}`;
  card.appendChild(line);

  const leave = leaveTime();
  const schoolDay = now.getDay() >= 1 && now.getDay() <= 5;
  if (!leave || !schoolDay) {
    card.appendChild(infoButton(leave ? 'No school today, so no countdown.'
      : 'A grown-up can set the time to leave for school in ⚙️ Grown-ups → ⏰ School mornings. Then a countdown shows here on school mornings.'));
    return;
  }

  const [h, m] = leave.split(':').map(Number);
  const leaveAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  const minutes = Math.ceil((leaveAt - now) / 60000);
  const startAt = new Date(leaveAt.getTime() - 3 * 60 * 60000);     // only in the 3 hours before
  if (now < startAt || minutes < -15) {
    card.appendChild(infoButton(`The countdown starts in the morning, before you leave at ${leaveAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`));
    return;
  }

  const left = [...document.querySelectorAll('#morning .task:not(.done)')].map(t => t.textContent);
  const note = document.createElement('div');
  note.className = 'clockNote';
  if (left.length === 0) {
    note.textContent = minutes > 0 ? `✅ Morning list done! ${minutes} min until you leave.` : '✅ Morning list done! Time to go!';
    card.className = 'clockDone';
  } else if (minutes <= 0) {
    note.textContent = `🚨 Time to leave! Still to do: ${left.join(', ')}`;
    card.className = 'clockLate';
  } else if (minutes <= 5) {
    note.textContent = `🚨 Hurry! ${minutes} min left. Still to do: ${left.join(', ')}`;
    card.className = 'clockLate';
    sayOnce(`${minutes} minutes left!`, 'five');
  } else if (minutes <= 15) {
    note.textContent = `⏳ ${minutes} min left! ${left.length} morning task${left.length === 1 ? '' : 's'} to go.`;
    card.className = 'clockSoon';
    sayOnce(`${minutes} minutes until it's time to leave.`, 'fifteen');
  } else {
    note.textContent = `⏰ ${minutes} min until you leave for school`;
  }
  card.appendChild(note);
}

// Says a warning out loud once per morning (if the phone allows sound)
function sayOnce(text, key) {
  const id = new Date().toDateString() + key;
  if (spokenWarning === id || localStorage.getItem('kiddyKatSpoken') === id) return;
  spokenWarning = id;
  try { localStorage.setItem('kiddyKatSpoken', id); } catch (err) {}
  if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

setInterval(showClock, 20000);
document.addEventListener('click', () => setTimeout(showClock, 100));      // update right after a task is tapped

// Grown-ups → ⏰ School mornings
function showParentClock() {
  const box = document.getElementById('parentClock');
  if (!box) return;
  box.textContent = '';
  const label = document.createElement('label');
  label.textContent = 'Time to leave for school (school days, Monday to Friday)';
  const input = document.createElement('input');
  input.type = 'time';
  input.value = leaveTime();
  const save = document.createElement('button');
  save.textContent = 'Save leave time';
  const status = document.createElement('div');
  save.addEventListener('click', () => {
    if (input.value) localStorage.setItem('kiddyKatLeaveTime', input.value);
    else localStorage.removeItem('kiddyKatLeaveTime');
    status.textContent = input.value ? '✅ Saved. The countdown shows on school mornings.' : '✅ Countdown turned off.';
    showClock();
  });
  box.append(label, input, save, status);

  // Bedtime: a reminder alert 30 minutes before, if the bedtime list isn't done
  const bedLabel = document.createElement('label');
  bedLabel.textContent = 'Bedtime (every night)';
  const bedInput = document.createElement('input');
  bedInput.type = 'time';
  bedInput.value = localStorage.getItem('kiddyKatBedTime') || '';
  const bedSave = document.createElement('button');
  bedSave.textContent = 'Save bedtime';
  const bedStatus = document.createElement('div');
  bedSave.addEventListener('click', () => {
    if (bedInput.value) localStorage.setItem('kiddyKatBedTime', bedInput.value);
    else localStorage.removeItem('kiddyKatBedTime');
    bedStatus.textContent = bedInput.value ? '✅ Saved. A reminder comes 30 minutes before bedtime if the bedtime list isn\'t done.' : '✅ Bedtime reminder turned off.';
  });
  const tip = document.createElement('div');
  tip.className = 'pushNote';
  tip.textContent = '🔔 Alerts on this phone come 15 and 5 minutes before leaving (only if the morning list isn\'t done), and grown-ups get one at leave time. Turn on alerts in ☁️ Online family.';
  box.append(document.createElement('br'), bedLabel, bedInput, bedSave, bedStatus, tip);
}

// ---------- Weather for where this phone is ----------
const DEFAULT_PLACE = { lat: 36.17, lon: -115.14, name: 'Las Vegas' };

function getPlace() {
  try { return JSON.parse(localStorage.getItem('kiddyKatPlace') || 'null'); } catch (err) { return null; }
}

function savePlace(place) {
  localStorage.setItem('kiddyKatPlace', JSON.stringify(place));
  showWeather();
}

// Uses the phone's location (asks permission). Rounded, so it's only "which neighborhood".
function placeFromPhone() {
  if (!navigator.geolocation) { placeFromTyping(); return; }
  const box = document.getElementById('weather');
  box.textContent = '📍 Finding where you are...';
  navigator.geolocation.getCurrentPosition(
    spot => savePlace({ lat: Math.round(spot.coords.latitude * 100) / 100,
                        lon: Math.round(spot.coords.longitude * 100) / 100, name: 'near you' }),
    () => placeFromTyping(),
    { timeout: 10000, maximumAge: 3600000 }
  );
}

// Or type a city or ZIP code
async function placeFromTyping() {
  const text = prompt('What city or ZIP code are you in?');
  if (!text || !text.trim()) { showWeather(); return; }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(text.trim())}`;
    const result = await (await fetch(url)).json();
    const spot = result.results && result.results[0];
    if (!spot) { alert("Couldn't find that place. Try a city name, like Phoenix."); showWeather(); return; }
    savePlace({ lat: Math.round(spot.latitude * 100) / 100, lon: Math.round(spot.longitude * 100) / 100,
                name: spot.name + (spot.admin1 ? ', ' + spot.admin1 : '') });
  } catch (err) {
    alert("Couldn't look that up right now.");
    showWeather();
  }
}

// Adds the "📍 change place" link and an ⓘ to the weather card
function weatherFooter(box, place) {
  const row = document.createElement('div');
  row.className = 'weatherPlace';
  const link = document.createElement('button');
  link.className = 'placeLink';
  link.textContent = place ? `📍 ${place.name}` : '📍 Show MY weather';
  link.addEventListener('click', placeFromPhone);
  row.appendChild(link);
  row.appendChild(infoButton(place
    ? `Weather for ${place.name}. Tap 📍 to update it (the phone asks before sharing its location, or you can type a city).`
    : 'This shows Las Vegas until you tap 📍 Show MY weather. The phone asks before using your location, or you can type a city instead.'));
  box.appendChild(row);
}
