// =====================================================================
// tour.js — a 1-minute guided tour the first time someone sets up Kiddy Kat
// Each step highlights one part of the screen with a short explanation.
// Kids and grown-ups (career mode) get their own steps. Replay any time
// from ⚙️ Grown-ups → 🧭 Show me around.
// =====================================================================

let tourSteps = [];
let tourIndex = 0;

function tourStepsFor() {
  const who = typeof callName === 'function' ? callName() : 'there';
  const parent = typeof parentName === 'function' ? parentName() : 'a grown-up';
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const homeScreen = iphone
    ? 'In Safari, tap Share, then "Add to Home Screen". Open Kiddy Kat from that icon from now on. On iPhone, alerts only work from the icon.'
    : 'In Chrome, open the ⋮ menu and choose "Install" or "Add to Home screen", so Kiddy Kat opens like an app.';

  if (typeof animal !== 'undefined' && animal.theme === 'eagle') {
    return [
      { target: '#hello', title: `👋 Welcome, ${who}!`, text: 'This is career mode. Here\'s a 1-minute tour of how it works.' },
      { target: '#careerCard', title: '🦅 Weekly career goals', text: 'Tap +1 each time you send an application, reach out, learn or practice. Every step earns ⭐ and 🏆 league points. Goals reset every Monday.' },
      { target: '.careerOpen', title: '📋 Your private tracker', text: 'Track job applications and freelance clients by stage, with next steps and dates. It\'s locked with your parent PIN, so the kids only see your goals and streak.' },
      { target: '.tabs', title: '✅ Daily lists', text: 'Morning, Work and Bedtime lists. Tap each task when it\'s done. Finishing a list earns 3 ⭐ and keeps your streak going.' },
      { target: '#petCard', title: '🚀 Your project', text: 'Pick a project, like a startup, a bonsai or a summit. It grows through 4 levels as you finish your lists and practice.' },
      { target: 'button[onclick="openPractice()"]', title: '🎮 Interview prep', text: 'Short tech and leadership quiz rounds. Each finished round counts toward your interview prep goal.' },
      { target: '#streakCard', title: '🔥 Morning streak', text: 'Finish your morning list each school day to grow your streak. The kids can see it, so lead by example!' },
      { target: 'button[onclick="toggleSettings()"]', title: '☁️ Link to your family', text: 'In Grown-ups → ☁️ Online family, log in and link this device to yourself, so your progress shows on the family dashboard. Set a parent PIN in 🎁 Rewards to lock your tracker.' },
      { target: null, title: '📲 Make it an app', text: homeScreen },
      { target: null, title: '✅ You\'re all set!', text: 'Replay this tour any time from ⚙️ Grown-ups → 🧭 Show me around.' }
    ];
  }
  return [
    { target: '#hello', title: `👋 Hi, ${who}!`, text: 'Welcome to Kiddy Kat! Let\'s take a quick tour. It takes 1 minute.' },
    { target: '.tabs', title: '✅ Your lists', text: 'Tap Morning, After School or Bedtime to see a list. Tap each task when you finish it. A whole list done = 3 ⭐!' },
    { target: '#petCard', title: '🥚 Your pet', text: 'Pick a pet and give it a name. It hatches and grows every time you finish a list.' },
    { target: '#petStars', title: '⭐ Stars', text: 'You earn stars for lists, practice and challenges. Spend them in the 🛍️ Shop or on 🎁 Rewards.' },
    { target: 'button[onclick="openRewards()"]', title: '🎁 Rewards', text: `Save up for real rewards, like a movie pick or extra game time. ${parent} says yes, then it's yours!` },
    { target: 'button[onclick="openPractice()"]', title: '🎮 Practice', text: 'Quick math, spelling and grammar rounds. Each right answer earns a star.' },
    { target: '#challengeButton', title: '🔴 Challenge of the Day', text: 'A new challenge every day, like push-ups or finding something red. Win it for trophies and followers!' },
    { target: '#streakCard', title: '🔥 Your streak', text: 'Finish your morning list every school day to grow your streak. Weekends are rest days.' },
    { target: 'button[onclick="toggleSettings()"]', title: '☁️ Connect to your family', text: `Ask ${parent} to open ⚙️ Grown-ups → ☁️ Online family and link this device to you. Then your stars and pet are saved online.` },
    { target: null, title: '📲 Make it an app', text: homeScreen },
    { target: null, title: '🎉 You\'re ready!', text: 'Go finish your first list! A grown-up can replay this tour from ⚙️ Grown-ups → 🧭 Show me around.' }
  ];
}

function startTour() {
  closeTourSpot();
  // Only steps whose part of the screen is showing right now (plus the no-target steps)
  tourSteps = tourStepsFor().filter(s => {
    if (!s.target) return true;
    const el = document.querySelector(s.target);
    return el && el.offsetParent !== null;
  });
  tourIndex = 0;
  let box = document.getElementById('tour');
  if (!box) {
    box = document.createElement('div');
    box.id = 'tour';
    document.body.appendChild(box);
  }
  box.style.display = 'block';
  showTourStep();
}

function closeTourSpot() {
  document.querySelectorAll('.tourSpot').forEach(el => el.classList.remove('tourSpot'));
}

function showTourStep() {
  const step = tourSteps[tourIndex];
  const box = document.getElementById('tour');
  closeTourSpot();
  box.textContent = '';
  const target = step.target ? document.querySelector(step.target) : null;
  if (target) {
    target.classList.add('tourSpot');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const count = document.createElement('div');
  count.className = 'tourCount';
  count.textContent = `${tourIndex + 1} of ${tourSteps.length}`;
  const title = document.createElement('div');
  title.className = 'tourTitle';
  title.textContent = step.title;
  const text = document.createElement('div');
  text.className = 'tourText';
  text.textContent = step.text;
  const buttons = document.createElement('div');
  buttons.className = 'tourButtons';
  const last = tourIndex === tourSteps.length - 1;
  const skip = document.createElement('button');
  skip.className = 'tourSkip';
  skip.textContent = last ? '' : 'Skip tour';
  skip.style.visibility = last ? 'hidden' : 'visible';
  skip.addEventListener('click', endTour);
  const back = document.createElement('button');
  back.className = 'tourBack';
  back.textContent = '← Back';
  back.style.visibility = tourIndex === 0 ? 'hidden' : 'visible';
  back.addEventListener('click', () => { tourIndex -= 1; showTourStep(); });
  const next = document.createElement('button');
  next.className = 'tourNext';
  next.textContent = last ? "Let's go! 🚀" : 'Next →';
  next.addEventListener('click', () => {
    if (last) { endTour(); return; }
    tourIndex += 1;
    showTourStep();
  });
  buttons.append(skip, back, next);
  box.append(count, title, text, buttons);
}

function endTour() {
  closeTourSpot();
  const box = document.getElementById('tour');
  if (box) box.style.display = 'none';
  try { localStorage.setItem('kiddyKatTourDone', new Date().toISOString().slice(0, 10)); } catch (err) {}
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// First time only: right after someone sets up their name and age
function maybeStartTour() {
  try { if (localStorage.getItem('kiddyKatTourDone')) return; } catch (err) { return; }
  setTimeout(startTour, 700);
}

// Grown-ups → 🧭 Show me around
function showTourButton() {
  const box = document.getElementById('parentTour');
  if (!box) return;
  box.textContent = '';
  const b = document.createElement('button');
  b.textContent = '🧭 Show me around';
  b.addEventListener('click', () => {
    if (typeof toggleSettings === 'function') toggleSettings();      // close Grown-ups first
    setTimeout(startTour, 300);
  });
  box.appendChild(b);
}
