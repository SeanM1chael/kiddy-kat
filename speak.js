// =====================================================================
// speak.js — 🔊 Read-aloud for Kat Town lessons
// Uses the phone's built-in voice (nothing goes online).
// • A 🔊 button next to questions, explanations, tips and pop-ups.
// • "Read to me" mode reads each new question, explanation and tip by
//   itself. It's on by default for kittens (ages 7 to 9).
// =====================================================================

function kkReadAloudOn() {
  let saved = null;
  try { saved = localStorage.getItem('kiddyKatReadAloud'); } catch (err) {}
  if (saved === 'on') return true;
  if (saved === 'off') return false;
  return typeof animal !== 'undefined' && !!animal && animal.theme === 'kitten';      // default: on for kittens
}
function kkSetReadAloud(on) {
  try { localStorage.setItem('kiddyKatReadAloud', on ? 'on' : 'off'); } catch (err) {}
  if (!on) kkStopSpeaking();
}

// Turn screen text into something that sounds right out loud
function kkSpeakable(text) {
  return String(text || '')
    .replace(/\b1 ⭐/g, '1 star').replace(/⭐/g, ' stars ')
    .replace(/(\d)¢/g, '$1 cents').replace(/🪙/g, ' coins ')
    .replace(/(\d)\s*°F/g, '$1 degrees')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, ' ')
    .replace(/[→➡️↩️]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function kkStopSpeaking() {
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (err) {}
}

// Read text out loud (stops whatever was being read first)
function kkSpeak(text) {
  const words = kkSpeakable(text);
  window.kkLastSpoken = words;                          // for the tests
  if (!words || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const say = new SpeechSynthesisUtterance(words);
    say.lang = 'en-US';
    say.rate = typeof animal !== 'undefined' && animal && animal.theme === 'kitten' ? 0.85 : 0.95;
    const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    const voice = voices.find(v => /en-US/.test(v.lang) && /Samantha|Google US English|Aria|Jenny/.test(v.name)) || voices.find(v => /en-US/.test(v.lang));
    if (voice) say.voice = voice;
    speechSynthesis.speak(say);
  } catch (err) {}
}

// Read it only when "Read to me" is on
function kkAutoSpeak(text) { if (kkReadAloudOn()) kkSpeak(text); }

// A 🔊 button. getText is a function, so it reads what's on screen when tapped.
function kkSpeakButton(parent, getText, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'kkSpeakBtn';
  b.textContent = '🔊';
  b.setAttribute('aria-label', label || 'Read this out loud');
  b.addEventListener('click', e => { e.stopPropagation(); kkSpeak(typeof getText === 'function' ? getText() : getText); });
  parent.appendChild(b);
  return b;
}

// The "Read to me" switch (shown at the top of Kat Town)
function kkReadAloudToggle(parent) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'kkReadToggle' + (kkReadAloudOn() ? ' on' : '');
  b.textContent = kkReadAloudOn() ? '🔊 Read to me: On' : '🔈 Read to me: Off';
  b.addEventListener('click', () => {
    const on = !kkReadAloudOn();
    kkSetReadAloud(on);
    b.className = 'kkReadToggle' + (on ? ' on' : '');
    b.textContent = on ? '🔊 Read to me: On' : '🔈 Read to me: Off';
    if (on) kkSpeak('Read to me is on. I will read questions and tips out loud.');
  });
  parent.appendChild(b);
  return b;
}
