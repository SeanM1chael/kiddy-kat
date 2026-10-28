// =====================================================================
// league.js — weekly effort points, the Sibling Challenge and the League
//
// Points come only from things the app records itself (no stars, gifts or money):
//   ✅ finished checklist  2 points (up to 3 lists a day)
//   🎮 right practice answer 1 point (up to 15 a day)
//   🔴 challenge win        3 points (once a day)
//   📚 approved catch-up    5 points each (up to 5 a day)
// Points start over every Monday. The weekly goal is 60.
// =====================================================================

const LEAGUE_GOAL = 60;
const TEAM_BONUS = 10;            // stars for everyone when the siblings reach the team goal
const ANIMAL_FACES = { kitten: '🐱', tiger: '🐯', lion: '🦁' };

// Monday of this week, like "2026-10-26" (same week the server uses)
function leagueWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function leagueDay() {
  return new Date().toDateString();
}

function loadLeague() {
  let league = null;
  try { league = JSON.parse(localStorage.getItem('kiddyKatLeague') || 'null'); } catch (err) {}
  if (!league || league.week !== leagueWeek()) league = { week: leagueWeek(), days: {}, teamBonus: '' };
  return league;
}

function saveLeague(league) {
  localStorage.setItem('kiddyKatLeague', JSON.stringify(league));
}

// Called by the app when something worth points happens
function leagueRecord(kind, detail) {
  const league = loadLeague();
  const day = league.days[leagueDay()] || (league.days[leagueDay()] = { lists: [], practice: 0, challenge: 0, catchup: 0 });
  if (kind === 'list' && !day.lists.includes(detail)) day.lists.push(detail);
  if (kind === 'practice') day.practice += Number(detail) || 0;
  if (kind === 'challenge') day.challenge = 1;
  if (kind === 'catchup') day.catchup += 1;
  saveLeague(league);
  showLeagueCard();
}

// This week's points, with the daily limits applied
function leaguePoints(league = loadLeague()) {
  const parts = { lists: 0, practice: 0, challenge: 0, catchup: 0 };
  Object.values(league.days).forEach(day => {
    parts.lists += Math.min(day.lists.length, 3) * 2;
    parts.practice += Math.min(day.practice, 15);
    parts.challenge += Math.min(day.challenge, 1) * 3;
    parts.catchup += Math.min(day.catchup, 5) * 5;
  });
  return { total: parts.lists + parts.practice + parts.challenge + parts.catchup, parts: parts };
}

// What goes online with the kid's progress (sync.js)
function leagueForCloud() {
  return { week: leagueWeek(), points: leaguePoints().total };
}

// ---------- The card on the main screen ----------
function showLeagueCard() {
  const card = document.getElementById('leagueCard');
  if (!card) return;
  const points = leaguePoints().total;
  card.style.display = 'block';
  card.textContent = '';
  const title = document.createElement('div');
  title.className = 'leagueTitle';
  title.textContent = points >= LEAGUE_GOAL
    ? `🏆 ${points} points this week. ⭐ Goal reached!`
    : `🏆 ${points} of ${LEAGUE_GOAL} points this week`;
  const bar = document.createElement('div');
  bar.className = 'leagueBar';
  const fill = document.createElement('div');
  fill.style.width = Math.min(100, points / LEAGUE_GOAL * 100) + '%';
  bar.appendChild(fill);
  title.appendChild(infoButton('🏆 League points show how hard you worked this week:\n' +
    '✅ Finished checklist: 2 · 🎮 Right practice answer: 1 · 🔴 Challenge win: 3 · 📚 Catch-up turned in: 5\n' +
    'Reach 60 for a ⭐ goal badge. Points start over every Monday. Tap the card to see your team and league.'));
  card.append(title, bar);
  card.onclick = openLeague;
}

// ---------- The League screen ----------
function openLeague() {
  document.getElementById('league').style.display = 'block';
  showLeague();
}

function closeLeague() {
  document.getElementById('league').style.display = 'none';
}

async function showLeague() {
  const box = document.getElementById('leagueBody');
  box.textContent = '';
  const add = (parent, tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const section = title => { const s = add(box, 'div', undefined, 'leagueSection'); add(s, 'h3', title); return s; };

  // My week
  const { total, parts } = leaguePoints();
  add(box, 'h2', '🏆 My week');
  add(box, 'div', total >= LEAGUE_GOAL ? `${total} points. ⭐ You reached the goal!` : `${total} of ${LEAGUE_GOAL} points`, 'leagueBig');
  const mine = section('How I got them');
  [['✅ Checklists', parts.lists], ['🎮 Practice', parts.practice], ['🔴 Challenges', parts.challenge], ['📚 Catch-up', parts.catchup]]
    .forEach(([label, n]) => { const r = add(mine, 'div', undefined, 'leagueRow'); add(r, 'span', label); add(r, 'span', `${n}`); });
  add(mine, 'div', 'Points start over every Monday.', 'leagueHint');

  if (typeof cloudLinked !== 'function' || !cloudLinked()) {
    add(box, 'p', '☁️ Ask a grown-up to link this device to the online family to see the team goal and the league.', 'leagueHint');
    return;
  }
  const token = cloudGet(CLOUD.token);
  const wait = add(box, 'p', '⏳ Loading the team...', 'leagueHint');
  const [team, standings] = await Promise.all([
    cloudCall('family_team', { p_token: token }),
    cloudCall('league_standings', { p_token: token })
  ]);
  wait.remove();

  // 🤝 Sibling Challenge: everyone's points together
  if (team.ok && team.kids.length > 1) {
    const t = section('🤝 Team goal');
    add(t, 'div', `Together: ${team.total} of ${team.goal} points. Reach it and everyone gets +${TEAM_BONUS} ⭐!`);
    const bar = add(t, 'div', undefined, 'leagueBar');
    add(bar, 'div').style.width = Math.min(100, team.total / team.goal * 100) + '%';
    team.kids.forEach(k => {
      const r = add(t, 'div', undefined, 'leagueRow');
      add(r, 'span', `${ANIMAL_FACES[k.animal] || ''} ${k.nickname}${k.me ? ' (me)' : ''}`);
      add(r, 'span', `${k.points}`);
    });
    claimTeamBonus(team);

    // 💛 Kindness star
    const kind = section('💛 Kindness star');
    add(kind, 'div', 'Once a day, send a brother or sister 1 ⭐ to say thanks.', 'leagueHint');
    const pick = add(kind, 'select');
    team.kids.filter(k => !k.me).forEach(k => pick.add(new Option(k.nickname, k.nickname)));
    const note = add(kind, 'input');
    note.placeholder = 'Thanks for...';
    note.maxLength = 80;
    const send = add(kind, 'button', '💛 Send kindness star');
    const sent = add(kind, 'div', undefined, 'leagueHint');
    send.addEventListener('click', async () => {
      const r = await cloudCall('kid_give_kindness', { p_token: token, p_to: pick.value, p_note: note.value });
      sent.textContent = r.ok ? `💛 Sent to ${pick.value}! They'll see it next time they open Kiddy Kat.` : '⚠️ ' + r.error;
      if (r.ok) { send.disabled = true; note.value = ''; }
    });
  }

  // 🏆 League with other families
  if (standings.ok && standings.in_league) {
    const myGroup = standings.groups[animal.theme] || { top: [], others: [] };
    const l = section(`🏆 ${standings.name}: ${ANIMAL_FACES[animal.theme]} ${animal.name}s`);
    if (!myGroup.top.length) add(l, 'div', 'No points yet this week. Be the first!', 'leagueHint');
    myGroup.top.forEach(k => {
      const r = add(l, 'div', undefined, 'leagueRow leagueTop');
      add(r, 'span', `👑 ${k.nickname} (${k.family})`);
      add(r, 'span', `${k.points}`);
    });
    if (myGroup.others.length) {
      add(l, 'div', 'Also playing:', 'leagueHint');
      add(l, 'div', myGroup.others.map(k => `${k.nickname}${k.goal ? ' ⭐' : ''}`).join(' · '));
    }
    add(l, 'div', '👑 = top 3 this week · ⭐ = reached the goal', 'leagueHint');
    if (standings.cup.length > 1) {
      const cup = section('🏅 Family Cup');
      standings.cup.forEach((c, i) => {
        const r = add(cup, 'div', undefined, 'leagueRow');
        add(r, 'span', `${['🥇', '🥈', '🥉'][i]} ${c.family}`);
        add(r, 'span', `${c.average} avg`);
      });
    }
  } else if (standings.ok && standings.league_on !== false) {
    add(box, 'p', '🏆 Want to play against cousins or friends? Ask a grown-up to start a league on the dashboard.', 'leagueHint');
  }
}

// Everyone on the team gets the bonus once a week when the team goal is reached
function claimTeamBonus(team) {
  const league = loadLeague();
  if (team.total < team.goal || league.teamBonus === team.week || !pet) return;
  league.teamBonus = team.week;
  saveLeague(league);
  pet.stars += TEAM_BONUS;
  savePet();
  showPet();
  celebrate(`🤝 TEAM GOAL! You and your siblings did it together! +${TEAM_BONUS} ⭐`, '🤝', false);
}
