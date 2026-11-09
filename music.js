// =====================================================================
// music.js — 🎵 Kat Music Studio: make a beat, learn how music works
//   🥁 Beat maker: 8 steps (one bar: 1 & 2 & 3 & 4 &), 3 drums and 5 notes.
//      The notes are a "pentatonic" scale, so anything a kid taps sounds good.
//   🐢🚶🐆 Tempo: slow, medium, fast (beats per minute)
//   💾 Save up to 5 songs (kept in the town record, t.songs)
//   🎓 Lessons: Echo the beat (listening), Note math / High or low, Music words
//      First win of each lesson a day = +1 ⭐ (inside the Arcade's daily cap)
// All sounds are made right on the phone (Web Audio). Nothing is recorded.
// =====================================================================

const MUSIC_STEPS = 8;
const MUSIC_COUNTS = ['1', '&', '2', '&', '3', '&', '4', '&'];
// Rows: [id, emoji, name, kind, pitch in Hz for notes]
const MUSIC_ROWS = [
  ['la', '🟣', 'La', 'note', 440.00],
  ['sol', '🔵', 'Sol', 'note', 392.00],
  ['mi', '🟢', 'Mi', 'note', 329.63],
  ['re', '🟡', 'Re', 'note', 293.66],
  ['do', '🔴', 'Do', 'note', 261.63],
  ['hat', '🎩', 'Hi-hat', 'drum'],
  ['clap', '👏', 'Clap', 'drum'],
  ['kick', '🥁', 'Kick', 'drum']
];
const MUSIC_TEMPOS = [['🐢 Slow', 80], ['🚶 Medium', 100], ['🐆 Fast', 130]];
const MUSIC_MAX_SONGS = 5;

let musicCtx = null;          // the phone's sound maker, started on the first tap
let musicTimer = null;
let musicStep = 0;
let musicGrid = null;         // { kick: [true, false, ...], ... }
let musicTempo = 100;

function musicEmptyGrid() {
  const g = {};
  MUSIC_ROWS.forEach(([id]) => { g[id] = new Array(MUSIC_STEPS).fill(false); });
  return g;
}
// A starter beat so the first tap of ▶️ already sounds like music
function musicStarterGrid() {
  const g = musicEmptyGrid();
  [0, 4].forEach(i => { g.kick[i] = true; });
  [2, 6].forEach(i => { g.clap[i] = true; });
  for (let i = 0; i < MUSIC_STEPS; i++) g.hat[i] = true;
  g.do[0] = true; g.mi[2] = true; g.sol[4] = true; g.mi[6] = true;
  return g;
}
// Songs are saved as short strings: one "10101010" per row
function musicPack(g) { const o = {}; MUSIC_ROWS.forEach(([id]) => { o[id] = g[id].map(b => (b ? '1' : '0')).join(''); }); return o; }
function musicUnpack(o) {
  const g = musicEmptyGrid();
  MUSIC_ROWS.forEach(([id]) => { const s = String((o || {})[id] || ''); for (let i = 0; i < MUSIC_STEPS; i++) g[id][i] = s[i] === '1'; });
  return g;
}

// ---------- 🔊 Sounds (made on the phone) ----------
function musicAudio() {
  if (!musicCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { musicCtx = new AC(); } catch (err) { return null; }
  }
  if (musicCtx.state === 'suspended' && musicCtx.resume) musicCtx.resume();
  return musicCtx;
}
function musicNoise(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}
function musicPlay(rowId) {
  const ctx = musicAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const row = MUSIC_ROWS.find(r => r[0] === rowId);
  if (!row) return;
  if (row[3] === 'note') {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = row[4];
    out.gain.setValueAtTime(0.35, t0);
    out.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
    osc.connect(out); osc.start(t0); osc.stop(t0 + 0.36);
  } else if (rowId === 'kick') {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.15);
    out.gain.setValueAtTime(0.9, t0);
    out.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    osc.connect(out); osc.start(t0); osc.stop(t0 + 0.21);
  } else {
    const hat = rowId === 'hat';
    const src = musicNoise(ctx, hat ? 0.06 : 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = hat ? 'highpass' : 'bandpass';
    filter.frequency.value = hat ? 7000 : 1500;
    out.gain.setValueAtTime(hat ? 0.25 : 0.6, t0);
    out.gain.exponentialRampToValueAtTime(0.001, t0 + (hat ? 0.05 : 0.14));
    src.connect(filter); filter.connect(out); src.start(t0);
  }
}

// ---------- ▶️ Playing the grid ----------
function musicStop() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  document.querySelectorAll('.musicCell.now').forEach(c => c.classList.remove('now'));
  const b = document.querySelector('.musicPlay');
  if (b) b.textContent = '▶️ Play';
}
function musicTick() {
  document.querySelectorAll('.musicCell.now').forEach(c => c.classList.remove('now'));
  document.querySelectorAll(`.musicCell[data-step="${musicStep}"]`).forEach(c => c.classList.add('now'));
  MUSIC_ROWS.forEach(([id]) => { if (musicGrid && musicGrid[id][musicStep]) musicPlay(id); });
  musicStep = (musicStep + 1) % MUSIC_STEPS;
}
function musicStart() {
  musicStop();
  musicAudio();
  musicStep = 0;
  musicTick();
  musicTimer = setInterval(musicTick, 60000 / musicTempo / 2);     // 2 steps per beat
  const b = document.querySelector('.musicPlay');
  if (b) b.textContent = '⏹ Stop';
}

// ---------- 🎵 The studio screen ----------
function showTownMusic(message) {
  musicStop();
  townView = 'music';
  if (!musicGrid) musicGrid = musicStarterGrid();
  const box = townBody('🎵 Music Studio');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  townAdd(box, 'div', 'Tap the squares to make a beat, then press ▶️ Play. Each column is half a beat: count "1 and 2 and 3 and 4 and".', 'arcadeHint');

  const grid = townAdd(box, 'div', undefined, 'musicGrid');
  townAdd(grid, 'span', '', 'musicCount');
  MUSIC_COUNTS.forEach(c => townAdd(grid, 'span', c, 'musicCount'));
  MUSIC_ROWS.forEach(([id, emoji, name, kind]) => {
    const label = townAdd(grid, 'button', emoji, 'musicLabel ' + kind);
    label.setAttribute('aria-label', name);
    label.title = name;
    label.addEventListener('click', () => musicPlay(id));
    for (let i = 0; i < MUSIC_STEPS; i++) {
      const cell = townAdd(grid, 'button', '', 'musicCell ' + kind + ' ' + id + (musicGrid[id][i] ? ' on' : '') + (i % 2 ? '' : ' beat'));
      cell.dataset.row = id;
      cell.dataset.step = String(i);
      cell.setAttribute('aria-label', `${name}, count ${MUSIC_COUNTS[i]}`);
      cell.addEventListener('click', () => {
        musicGrid[id][i] = !musicGrid[id][i];
        cell.classList.toggle('on', musicGrid[id][i]);
        if (musicGrid[id][i] && !musicTimer) musicPlay(id);
      });
    }
  });
  townAdd(box, 'div', '🔴 Do  🟡 Re  🟢 Mi  🔵 Sol  🟣 La: these 5 notes always sound good together. Tap an emoji to hear it.', 'musicKey');

  const controls = townAdd(box, 'div', undefined, 'musicControls');
  townAdd(controls, 'button', '▶️ Play', 'arcadeGo musicPlay').addEventListener('click', () => (musicTimer ? musicStop() : musicStart()));
  townAdd(controls, 'button', '🧹 Clear', 'arcadeSmall').addEventListener('click', () => { musicGrid = musicEmptyGrid(); showTownMusic(); });
  townAdd(controls, 'button', '🎲 Starter beat', 'arcadeSmall').addEventListener('click', () => { musicGrid = musicStarterGrid(); showTownMusic(); });

  const tempos = townAdd(box, 'div', undefined, 'musicTempos');
  MUSIC_TEMPOS.forEach(([label, bpm]) => {
    const b = townAdd(tempos, 'button', label, 'arcadeSmall musicTempo' + (bpm === musicTempo ? ' picked' : ''));
    b.addEventListener('click', () => {
      musicTempo = bpm;
      document.querySelectorAll('.musicTempo').forEach(x => x.classList.toggle('picked', x === b));
      if (musicTimer) musicStart();
    });
  });
  townAdd(box, 'div', `⏱️ Tempo is how fast the beat goes. It's counted in BPM (beats per minute). Slow = 80, Medium = 100, Fast = 130.`, 'arcadeHint musicTempoTip');

  // 💾 My songs
  const t = loadTown();
  const songs = Array.isArray(t.songs) ? t.songs : [];
  townAdd(box, 'h3', `💾 My songs (${songs.length} of ${MUSIC_MAX_SONGS})`, 'fgHead');
  const saveRow = townAdd(box, 'div', undefined, 'townWishAdd');
  const name = townAdd(saveRow, 'input');
  name.placeholder = 'Name your song';
  name.maxLength = 24;
  name.className = 'musicSongName';
  townAdd(saveRow, 'button', '💾 Save', 'arcadeSmall musicSave').addEventListener('click', () => musicSaveSong(name.value));
  const list = townAdd(box, 'div', undefined, 'musicSongs');
  songs.forEach((s, i) => {
    const row = townAdd(list, 'div', undefined, 'musicSong');
    townAdd(row, 'span', `🎵 ${s.name} · ${s.tempo} BPM`, 'musicSongTitle');
    townAdd(row, 'button', '▶️ Load', 'arcadeSmall musicLoad').addEventListener('click', () => {
      musicGrid = musicUnpack(s.grid);
      musicTempo = s.tempo || 100;
      showTownMusic(`🎵 Loaded "${s.name}". Press ▶️ Play!`);
    });
    townAdd(row, 'button', '🗑️', 'arcadeSmall musicDelete').addEventListener('click', () => {
      const f = loadTown();
      f.songs = (f.songs || []).filter((x, j) => j !== i);
      saveTown(f);
      showTownMusic('🗑️ Song deleted.');
    });
  });

  // 🎓 Lessons
  townAdd(box, 'h3', '🎓 Music lessons', 'fgHead');
  townAdd(box, 'div', 'First win of each lesson today = +1 ⭐', 'arcadeHint');
  const lessons = townAdd(box, 'div', undefined, 'bankLessons');
  musicLessonsForMe().forEach(([id, emoji, title]) => {
    const b = townAdd(lessons, 'button', `${emoji} ${title}`, 'bankLesson' + (musicWonToday(id) ? ' won' : ''));
    b.dataset.lesson = id;
    b.addEventListener('click', () => openMusicLesson(id));
  });
  townAdd(box, 'div', '💡 Music is math you can hear! Beats are counted, rhythms are patterns, and notes are fractions of a beat.', 'bankTip');
  townAdd(box, 'div', '🔇 No sound? Turn off silent mode on the phone and turn up the volume.', 'arcadeHint musicNoSound');
}

function musicSaveSong(rawName) {
  const name = String(rawName || '').trim().slice(0, 24) || 'My song';
  const t = loadTown();
  if (!Array.isArray(t.songs)) t.songs = [];
  if (!MUSIC_ROWS.some(([id]) => musicGrid[id].some(Boolean))) { showTownMusic('🎵 Tap some squares first, then save your song.'); return; }
  if (t.songs.length >= MUSIC_MAX_SONGS) { showTownMusic(`💾 You have ${MUSIC_MAX_SONGS} songs. Delete one to make room.`); return; }
  t.songs.push({ name: name, tempo: musicTempo, grid: musicPack(musicGrid), at: new Date().toISOString().slice(0, 10) });
  saveTown(t);
  if (typeof lifeSkillLog === 'function') lifeSkillLog('music', 'music-song');
  showTownMusic(`💾 Saved "${name}"! You're a songwriter. 🎶`);
}

// ---------- 🎓 Lessons ----------
function musicAge() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }
function musicLessonsForMe() {
  const kitten = musicAge() === 'kitten';
  return [
    ['echo', '👂', 'Echo the beat'],
    kitten ? ['highlow', '🎹', 'High or low?'] : ['notemath', '🧮', 'Note math'],
    ['words', '📖', 'Music words']
  ];
}
function musicWonToday(id) {
  const t = loadTown();
  return !!(t.lessonWins && t.lessonWins.date === new Date().toDateString() && t.lessonWins.won.includes('music-' + id));
}
function musicWin(id, text, tip) {
  const t = loadTown();
  const today = new Date().toDateString();
  if (!t.lessonWins || t.lessonWins.date !== today) t.lessonWins = { date: today, won: [] };
  let note = '';
  if (!t.lessonWins.won.includes('music-' + id)) {
    t.lessonWins.won.push('music-' + id);
    saveTown(t);
    const given = typeof arcadeStars === 'function' ? arcadeStars(1) : 0;
    note = given ? ' +1 ⭐' : ' (Arcade stars are maxed for today.)';
  } else saveTown(t);
  if (typeof lifeSkillLog === 'function') lifeSkillLog('music', 'music-' + id);
  townPop('🎵', `🎉 ${text}${note}\n\n💡 ${tip}`, [['🔁 Again', () => openMusicLesson(id)], ['🎵 Studio', () => showTownMusic()]], 'townBounceIn');
}

const musicPick = list => list[Math.floor(Math.random() * list.length)];
function musicShuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// "👏 · 👏 · · 👏 · ·" — how a clap pattern looks
function musicPatternText(p) { return p.map(b => (b ? '👏' : '·')).join(' '); }
function musicRandomPattern() {
  const p = new Array(MUSIC_STEPS).fill(false);
  musicShuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3 + Math.floor(Math.random() * 2)).forEach(i => { p[i] = true; });
  return p;
}
function musicPlayPattern(p, row = 'clap') {
  const ctx = musicAudio();
  if (!ctx) return;
  p.forEach((on, i) => { if (on) setTimeout(() => musicPlay(row), i * 300); });
}

function musicEchoRounds() {
  return [0, 1, 2].map(() => {
    const answer = musicRandomPattern();
    const wrong = [];
    while (wrong.length < 2) {
      const w = answer.slice();
      const i = Math.floor(Math.random() * MUSIC_STEPS);
      w[i] = !w[i];
      if (!w.some(Boolean)) continue;
      const text = musicPatternText(w);
      if (text !== musicPatternText(answer) && !wrong.some(x => musicPatternText(x) === text)) wrong.push(w);
    }
    const options = musicShuffle([answer, ...wrong]);
    return {
      show: q => {
        townAdd(q, 'div', '👂 Listen to the claps. Which pattern did you hear?');
        townAdd(q, 'button', '🔊 Play it', 'arcadeSmall musicListen').addEventListener('click', () => musicPlayPattern(answer));
        setTimeout(() => musicPlayPattern(answer), 300);
      },
      options: options.map(musicPatternText),
      answer: options.indexOf(answer),
      why: `It was ${musicPatternText(answer)}. A pattern of sounds and quiet spots is called a rhythm.`
    };
  });
}

function musicHighLowRounds() {
  return [0, 1, 2].map(() => {
    const [a, b] = musicShuffle(MUSIC_ROWS.filter(r => r[3] === 'note')).slice(0, 2);
    const firstHigher = a[4] > b[4];
    return {
      show: q => {
        townAdd(q, 'div', '🎹 Listen to two notes. Which one is higher?');
        const play = () => { musicPlay(a[0]); setTimeout(() => musicPlay(b[0]), 600); };
        townAdd(q, 'button', '🔊 Play them', 'arcadeSmall musicListen').addEventListener('click', play);
        setTimeout(play, 300);
      },
      options: ['The first one', 'The second one'],
      answer: firstHigher ? 0 : 1,
      why: `${a[2]} then ${b[2]}: the ${firstHigher ? 'first' : 'second'} one was higher. High notes vibrate faster, like a bird. Low notes vibrate slower, like a bear.`
    };
  });
}

const MUSIC_NOTE_MATH = [
  { q: 'A whole note lasts 4 beats. How many beats is a half note?', options: ['1', '2', '4'], answer: 1, why: 'Half of 4 is 2. A half note lasts 2 beats.' },
  { q: 'A quarter note lasts 1 beat. How many quarter notes fit in a bar of 4 beats?', options: ['2', '4', '8'], answer: 1, why: '4 beats ÷ 1 beat each = 4 quarter notes.' },
  { q: 'Two eighth notes take up the same time as...', options: ['One quarter note', 'One whole note', 'Two half notes'], answer: 0, why: '½ + ½ = 1 beat, the same as one quarter note.' },
  { q: 'A song is 120 BPM (beats per minute). How many beats happen in 30 seconds?', options: ['30', '60', '120'], answer: 1, why: '30 seconds is half a minute. Half of 120 is 60.' },
  { q: 'A song is 60 BPM. How long is one beat?', options: ['1 second', '2 seconds', 'Half a second'], answer: 0, why: '60 beats in 60 seconds = 1 beat every second.' },
  { q: 'Our beat maker has 8 steps in one bar of 4 beats. How long is each step?', options: ['Half a beat', '1 beat', '2 beats'], answer: 0, why: '4 beats ÷ 8 steps = ½ beat each. That\'s why we count "1 and 2 and".' },
  { q: 'A bar has 4 beats. How many beats are in 8 bars?', options: ['12', '32', '16'], answer: 1, why: '8 × 4 = 32 beats.' }
];
const MUSIC_WORDS = {
  kitten: [
    { q: 'What do we call how FAST the music goes?', options: ['Tempo', 'Volume', 'Color'], answer: 0, why: 'Tempo means speed. A fast tempo makes you want to dance!' },
    { q: 'What do we call how LOUD or soft the music is?', options: ['Tempo', 'Volume', 'Melody'], answer: 1, why: 'Volume is how loud or soft the sound is.' },
    { q: 'A drum keeps the...', options: ['Beat', 'Lunch', 'Words'], answer: 0, why: 'Drums keep the steady beat that you can clap or march to.' },
    { q: 'A tune you can hum is called a...', options: ['Melody', 'Drum', 'Speaker'], answer: 0, why: 'A melody is a line of notes, like the tune of a song.' },
    { q: 'Which animal sound is LOW?', options: ['🐻 A bear growl', '🐦 A bird tweet', '🐭 A mouse squeak'], answer: 0, why: 'A bear\'s growl is low. Birds and mice make high sounds.' }
  ],
  older: [
    { q: 'What is tempo?', options: ['How fast the music goes', 'How loud it is', 'Which instrument plays'], answer: 0, why: 'Tempo is the speed of the beat, counted in BPM (beats per minute).' },
    { q: 'What is rhythm?', options: ['A pattern of long, short and quiet sounds', 'The words of a song', 'How high a note is'], answer: 0, why: 'Rhythm is the pattern of sounds and silences in time.' },
    { q: 'What is pitch?', options: ['How high or low a note sounds', 'How long a song is', 'How loud a drum is'], answer: 0, why: 'Pitch is high or low. Faster vibrations make higher pitches.' },
    { q: 'Dynamics in music are about...', options: ['Loud and soft', 'Fast and slow', 'Happy and sad'], answer: 0, why: 'Dynamics are the changes in loudness, like piano (soft) and forte (loud).' },
    { q: 'A melody is...', options: ['A line of notes that makes a tune', 'The drum part', 'The speed of a song'], answer: 0, why: 'The melody is the tune you hum or sing.' },
    { q: 'Several notes played at the same time make a...', options: ['Chord', 'Rest', 'Tempo'], answer: 0, why: 'A chord is 3 or more notes played together, like on a piano or guitar.' },
    { q: 'A "rest" in music means...', options: ['A moment of silence', 'Play louder', 'The song is over'], answer: 0, why: 'A rest is a planned quiet spot. Silence is part of rhythm too!' }
  ]
};
function musicQuizRounds(bank) {
  return musicShuffle(bank).slice(0, 3).map(item => {
    const order = musicShuffle(item.options.map((o, i) => i));
    return { show: q => townAdd(q, 'div', item.q), options: order.map(i => item.options[i]), answer: order.indexOf(item.answer), why: item.why };
  });
}

const MUSIC_LESSON_TIPS = {
  echo: ['You have a great ear!', 'Musicians practice listening every day. Try clapping along to your favorite song.'],
  highlow: ['You can hear high and low!', 'Pitch is how high or low a sound is. Try singing a high note, then a low one!'],
  notemath: ['Music math master!', 'Notes are fractions: whole = 4 beats, half = 2, quarter = 1, eighth = ½.'],
  words: ['You talk like a musician!', 'Knowing the words for music helps you talk about songs, and learn instruments faster.']
};

function openMusicLesson(id) {
  musicStop();
  musicAudio();                                         // start the sound on this tap (phones need a tap first)
  const lesson = musicLessonsForMe().find(l => l[0] === id) || ['words', '📖', 'Music words'];
  townView = 'music:' + id;
  const box = townBody(`${lesson[1]} ${lesson[2]}`);
  townAdd(box, 'button', '← Music Studio', 'arcadeBack').addEventListener('click', () => showTownMusic());
  const say = townAdd(box, 'div', '', 'arcadeHint');
  const area = townAdd(box, 'div');
  const rounds = id === 'echo' ? musicEchoRounds()
    : id === 'highlow' ? musicHighLowRounds()
    : id === 'notemath' ? musicQuizRounds(MUSIC_NOTE_MATH)
    : musicQuizRounds(musicAge() === 'kitten' ? MUSIC_WORDS.kitten : MUSIC_WORDS.older);
  const [winText, tip] = MUSIC_LESSON_TIPS[id] || MUSIC_LESSON_TIPS.words;
  bankRounds('music-' + id, area, say, rounds, 2, winText, tip, (right, total) => {
    if (right >= 2) musicWin(id, `${right} of ${total} right! ${winText}`, tip);
    else townPop('🎵', `${right} of ${total} right. So close! Try again.\n\n💡 ${tip}`, [['🔁 Again', () => openMusicLesson(id)], ['🎵 Studio', () => showTownMusic()]], 'townBounceIn');
  });
}

// Stop the music when the kid leaves the studio
if (typeof leaveTown === 'function') {
  const leaveBefore = leaveTown;
  leaveTown = function () { musicStop(); return leaveBefore.apply(this, arguments); };            // eslint-disable-line no-global-assign
}
if (typeof showTownMap === 'function') {
  const mapBefore = showTownMap;
  showTownMap = function () { musicStop(); return mapBefore.apply(this, arguments); };           // eslint-disable-line no-global-assign
}
