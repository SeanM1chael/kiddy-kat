// =====================================================================
// sync.js — saves each kid's progress online, so it follows them
// from phone to Chromebook and survives a new phone.
//
// How it works:
// 1. A grown-up links this device to a kid (⚙️ Grown-ups → ☁️ Online family),
//    or a kid logs in with the family code + their PIN.
// 2. The device gets a login token (a "wristband"), good for 90 days.
// 3. Whenever the app saves something, a copy goes online a few seconds later.
// 4. When the app opens (or comes back on screen), it checks for newer
//    progress saved from another device and loads it.
// Real names, photos and the parent phone number stay on this device only.
// =====================================================================

const CLOUD_ANIMALS = { kitten: '🐱', tiger: '🐯', lion: '🦁' };
const LOCAL_ONLY = ['kiddyKatProofPhotos', 'kiddyKatParentPhone'];   // never sent online

// Cloud bookkeeping (these stay on this device)
const CLOUD = {
  token: 'kiddyKatCloudToken',     // the login wristband
  nick: 'kiddyKatCloudNick',       // which kid this device is linked to
  seen: 'kiddyKatCloudSeen',       // time of the last online save we know about
  dirty: 'kiddyKatCloudDirty',     // "1" when there are changes not sent yet
  savedAt: 'kiddyKatCloudSavedAt'  // for the "Last saved" line
};

function isSynced(key) {
  return key.startsWith('kiddyKat') && !key.startsWith('kiddyKatCloud') && !LOCAL_ONLY.includes(key);
}

// ---------- Notice every save the app makes ----------
// The app saves with localStorage.setItem everywhere. Instead of changing
// every file, we wrap setItem: it still saves, then also flags "send this online".
const rawSetItem = Storage.prototype.setItem;
const rawRemoveItem = Storage.prototype.removeItem;

Storage.prototype.setItem = function (key, value) {
  const old = this.getItem(key);
  rawSetItem.call(this, key, value);
  if (this === localStorage && isSynced(key) && old !== String(value)) cloudChanged();
};
Storage.prototype.removeItem = function (key) {
  const old = this.getItem(key);
  rawRemoveItem.call(this, key);
  if (this === localStorage && isSynced(key) && old !== null) cloudChanged();
};

// Family codes forgive phone typing: "kat 7qm4xz", "KAT–7QM4XZ " and "7QM4XZ" all become "KAT-7QM4XZ"
function cleanFamilyCode(text) {
  let code = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.startsWith('KAT') && code.length > 6) code = code.slice(3);
  return 'KAT-' + code;
}

function cloudGet(key) { return localStorage.getItem(key); }
function cloudSet(key, value) { rawSetItem.call(localStorage, key, value); }
function cloudRemove(key) { rawRemoveItem.call(localStorage, key); }
function cloudLinked() { return !!cloudGet(CLOUD.token); }

let cloudTimer = null;
let cloudBusy = false;
let cloudStatus = '';

function cloudChanged() {
  if (!cloudLinked()) return;
  cloudSet(CLOUD.dirty, '1');
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudPush, 3000);     // wait 3 seconds, so many saves go as one
}

// ---------- Talking to Supabase ----------
async function cloudCall(name, args) {
  try {
    const response = await fetch(`${KIDDY_KAT_CLOUD.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: KIDDY_KAT_CLOUD.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      keepalive: true                                  // finishes even if the app is closing
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: body.message || `Server error ${response.status}` };
    return body;
  } catch (err) {
    return { ok: false, offline: true, error: 'No internet right now' };
  }
}

// Everything this kid has saved, ready to send. The real name is left out.
function cloudCollect() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isSynced(key)) data[key] = localStorage.getItem(key);
  }
  if (data.kiddyKatProfile) {
    const profile = JSON.parse(data.kiddyKatProfile);
    delete profile.name;
    data.kiddyKatProfile = JSON.stringify(profile);
  }
  // For the parent dashboard: the task lists this kid sees right now (including the starting lists)
  if (typeof tasks !== 'undefined' && tasks) data._tasks = JSON.stringify(tasks);
  return data;
}

// Puts saved progress from online onto this device
function cloudApply(data) {
  const localProfile = JSON.parse(cloudGet('kiddyKatProfile') || 'null');
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  keys.filter(k => isSynced(k) && !(k in data)).forEach(k => cloudRemove(k));
  Object.keys(data).filter(isSynced).forEach(k => cloudSet(k, data[k]));
  if (data.kiddyKatProfile) {
    const profile = JSON.parse(data.kiddyKatProfile);
    profile.name = (localProfile && localProfile.name) || cloudGet(CLOUD.nick) || 'Kiddo';
    cloudSet('kiddyKatProfile', JSON.stringify(profile));
  }
}

function cloudSaved(when) {
  cloudSet(CLOUD.seen, when);
  cloudSet(CLOUD.savedAt, new Date().toLocaleString());
  cloudRemove(CLOUD.dirty);
  cloudStatus = '';
}

function cloudProblem(result) {
  if (result.error === 'Please log in again') {
    cloudUnlink();
    cloudStatus = '⚠️ The login ran out. A grown-up needs to link this device again.';
  } else {
    cloudStatus = '⚠️ ' + result.error + '. Will try again soon.';
  }
  if (typeof showCloud === 'function') showCloud();
}

// Send this device's progress online
async function cloudPush() {
  if (!cloudLinked() || cloudBusy) return;
  cloudBusy = true;
  const result = await cloudCall('save_my_data', {
    p_token: cloudGet(CLOUD.token), p_data: cloudCollect(), p_seen: cloudGet(CLOUD.seen) || null
  });
  cloudBusy = false;
  if (result.ok) cloudSaved(result.updated_at);
  else if (result.newer) await cloudPull();         // another device saved newer progress: use that
  else {
    cloudProblem(result);
    if (result.offline) setTimeout(cloudPush, 30000);
  }
  if (typeof showCloud === 'function') showCloud();
}

// Load newer progress from online, if there is any
async function cloudPull() {
  if (!cloudLinked() || cloudBusy) return;
  cloudBusy = true;
  const result = await cloudCall('load_my_data', { p_token: cloudGet(CLOUD.token) });
  cloudBusy = false;
  if (!result.ok) { cloudProblem(result); return; }
  if (result.updated_at === cloudGet(CLOUD.seen)) return;           // nothing new

  if (Object.keys(result.data || {}).length === 0) {                // brand-new kid online:
    cloudSet(CLOUD.seen, result.updated_at);                        // send what this device has
    if (cloudGet('kiddyKatProfile')) await cloudPush();
    return;
  }
  // Newer progress from another device: load it and restart the app.
  // (A guard stops it restarting over and over if something goes wrong.)
  const reloads = Number(sessionStorage.getItem('kiddyKatCloudReloads') || 0);
  if (reloads >= 3) return;
  sessionStorage.setItem('kiddyKatCloudReloads', reloads + 1);
  cloudApply(result.data);
  cloudSaved(result.updated_at);
  location.reload();
}

function cloudUnlink() {
  [CLOUD.token, CLOUD.nick, CLOUD.seen, CLOUD.dirty, CLOUD.savedAt].forEach(cloudRemove);
}

// Hook this device up to a kid after a successful kid login
async function cloudLinkWith(login) {
  cloudUnlink();
  cloudSet(CLOUD.token, login.token);
  cloudSet(CLOUD.nick, login.nickname);
  const result = await cloudCall('load_my_data', { p_token: login.token });
  if (!result.ok) { cloudProblem(result); return; }
  if (Object.keys(result.data || {}).length === 0) {
    cloudSet(CLOUD.seen, result.updated_at);
    if (cloudGet('kiddyKatProfile')) await cloudPush();     // first device: send its progress up
    return;                                                  // (no profile yet: setup sends it later)
  }
  cloudApply(result.data);
  cloudSaved(result.updated_at);
  location.reload();
}

// ---------- Grown-up decisions from the online dashboard ----------
// The dashboard leaves decisions in this kid's inbox. The phone carries them out
// with the same code as the Grown-ups buttons, then empties the inbox.
function processParentInbox() {
  let inbox = [];
  try { inbox = JSON.parse(localStorage.getItem('kiddyKatParentInbox') || '[]'); } catch (err) {}
  if (!inbox.length) return;
  const done = JSON.parse(localStorage.getItem('kiddyKatInboxDone') || '[]');
  const messages = [];
  inbox.filter(d => !done.includes(d.id)).forEach(d => {
    if (d.type === 'reward') {
      const request = rewardRequests.find(r => r.id === d.target);
      if (request && request.status === 'waiting') {
        decideReward(request, d.approved);
        messages.push(d.approved ? `🎁 ${parentName()} said YES to ${request.name}!` : `🎁 ${request.name}: not this time. Your stars are back.`);
      }
    } else if (d.type === 'job' && wallet) {
      const job = wallet.jobRequests.find(r => r.id === d.target);
      if (job && job.status === 'waiting') {
        if (d.approved) { payJob(job); messages.push(`💵 ${parentName()} paid you ${dollars(job.cents)} for ${job.name}!`); }
        else declineJob(job);
      }
    } else if (d.type === 'payout' && wallet) {
      markPaidOut(d.cents);
    }
    done.push(d.id);
  });
  localStorage.setItem('kiddyKatInboxDone', JSON.stringify(done.slice(-100)));
  localStorage.setItem('kiddyKatParentInbox', '[]');
  if (typeof showPet === 'function') showPet();
  if (messages.length && typeof celebrate === 'function') celebrate(messages.join(' '), '🎉', false);
}

// ---------- When to sync ----------
function cloudStart() {
  sessionStorage.removeItem('kiddyKatCloudReloads');
  if (!cloudLinked()) return;
  processParentInbox();
  if (cloudGet(CLOUD.dirty)) cloudPush(); else cloudPull();
  setInterval(() => {
    if (document.visibilityState === 'visible' && !cloudGet(CLOUD.dirty)) cloudPull();
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!cloudLinked()) return;
    if (document.visibilityState === 'hidden' && cloudGet(CLOUD.dirty)) cloudPush();
    if (document.visibilityState === 'visible') cloudGet(CLOUD.dirty) ? cloudPush() : cloudPull();
  });
}
window.addEventListener('load', () => setTimeout(cloudStart, 500));

// =====================================================================
// Grown-ups → ☁️ Online family
// =====================================================================
let cloudParent = null;      // grown-up login, kept only until the page closes
let cloudKids = [];

function showCloud() {
  const box = document.getElementById('cloudBox');
  if (!box) return;
  box.textContent = '';
  const add = (tag, text, parent = box) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    parent.appendChild(el);
    return el;
  };

  if (cloudLinked()) {
    add('p', `☁️ This device saves online as ${cloudGet(CLOUD.nick)}.`);
    add('p', cloudStatus || (cloudGet(CLOUD.dirty) ? '⏳ Saving soon...'
             : `✅ Last saved ${cloudGet(CLOUD.savedAt) || 'when it was linked'}`));
    const save = add('button', '☁️ Save now');
    save.addEventListener('click', () => { cloudSet(CLOUD.dirty, '1'); cloudPush(); });
    const unlink = add('button', 'Unlink this device');
    unlink.addEventListener('click', () => {
      if (!confirm('Stop saving online on this device? Progress already saved online stays there.')) return;
      cloudUnlink();
      showCloud();
    });
    return;
  }

  if (cloudStatus) add('p', cloudStatus);

  // Step 1: grown-up logs in
  if (!cloudParent) {
    add('p', 'Save progress online so it follows your kid to a Chromebook or a new phone.');
    add('label', 'Family code');
    const code = add('input');
    code.placeholder = 'KAT-XXXXXX';
    code.autocapitalize = 'characters';
    add('label', 'Online parent PIN');
    const pin = add('input');
    pin.type = 'password';
    pin.inputMode = 'numeric';
    const go = add('button', 'Grown-up log in');
    const note = add('div');
    go.addEventListener('click', async () => {
      note.textContent = '⏳ Checking...';
      const result = await cloudCall('parent_login', { p_code: cleanFamilyCode(code.value), p_pin: pin.value });
      if (!result.ok) { note.textContent = '⚠️ ' + result.error; return; }
      cloudParent = { token: result.token, family: result.family, code: cleanFamilyCode(code.value) };
      await cloudLoadKids();
      showCloud();
    });
    return;
  }

  // Step 2: pick a kid (or add one) and link this device
  add('p', `👋 Welcome, ${cloudParent.family}!`);
  if (cloudKids.length) {
    add('label', 'Link this device to');
    const pick = add('select');
    cloudKids.forEach(k => pick.add(new Option(`${CLOUD_ANIMALS[k.animal] || ''} ${k.nickname}`, k.nickname)));
    add('label', "That kid's 4-digit PIN");
    const pin = add('input');
    pin.type = 'password';
    pin.inputMode = 'numeric';
    const link = add('button', '🔗 Link this device');
    const note = add('div');
    link.addEventListener('click', async () => {
      note.textContent = '⏳ Linking...';
      const login = await cloudCall('kid_login', { p_code: cloudParent.code, p_nickname: pick.value, p_pin: pin.value });
      if (!login.ok) { note.textContent = '⚠️ ' + login.error; return; }
      const saved = await cloudCall('load_my_data', { p_token: login.token });
      const hasOnline = saved.ok && Object.keys(saved.data || {}).length > 0;
      if (hasOnline && cloudGet('kiddyKatProfile') &&
          !confirm(`${login.nickname} already has progress saved online. ` +
                   `Replace what's on this device with it?`)) { note.textContent = ''; return; }
      note.textContent = hasOnline ? '⏳ Loading saved progress...' : '⏳ Saving this device\'s progress online...';
      await cloudLinkWith(login);
      cloudParent = null;
      showCloud();
    });
    add('hr');
  }

  add('b', '➕ Add a kid');
  add('label', 'Nickname (not their real name)');
  const nick = add('input');
  nick.placeholder = 'Juju';
  add('label', 'Animal');
  const animalPick = add('select');
  Object.keys(CLOUD_ANIMALS).forEach(a => animalPick.add(new Option(`${CLOUD_ANIMALS[a]} ${a}`, a)));
  if (typeof animal !== 'undefined') animalPick.value = animal.theme;
  add('label', 'Their 4-digit PIN');
  const kidPin = add('input');
  kidPin.inputMode = 'numeric';
  kidPin.maxLength = 4;
  const addKid = add('button', 'Add kid');
  const addNote = add('div');
  addKid.addEventListener('click', async () => {
    const result = await cloudCall('add_kid', { p_token: cloudParent.token, p_nickname: nick.value,
                                                p_animal: animalPick.value, p_pin: kidPin.value });
    if (!result.ok) { addNote.textContent = '⚠️ ' + result.error; return; }
    await cloudLoadKids();
    showCloud();
  });

  const done = add('button', 'Log out');
  done.addEventListener('click', () => { cloudParent = null; showCloud(); });
}

async function cloudLoadKids() {
  const list = await cloudCall('list_kids', { p_code: cloudParent.code });
  cloudKids = Array.isArray(list) ? list : [];
}

// =====================================================================
// Kid login on a new device (like a Chromebook): family code → tap me → PIN
// =====================================================================
function openCloudLogin() {
  document.getElementById('cloudLogin').style.display = 'block';
  cloudLoginStep({});
}

function closeCloudLogin() {
  document.getElementById('cloudLogin').style.display = 'none';
}

function cloudLoginStep(state) {
  const box = document.getElementById('cloudLoginBody');
  box.textContent = '';
  const add = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    box.appendChild(el);
    return el;
  };
  const note = () => box.querySelector('.cloudNote') || Object.assign(add('div'), { className: 'cloudNote' });

  if (!state.kids) {
    add('h2', '☁️ Log in');
    add('p', 'Type your family code');
    const code = add('input');
    code.placeholder = 'KAT-XXXXXX';
    code.autocapitalize = 'characters';
    const next = add('button', 'Next');
    next.addEventListener('click', async () => {
      const kids = await cloudCall('list_kids', { p_code: cleanFamilyCode(code.value) });
      if (!Array.isArray(kids) || kids.length === 0) {
        note().textContent = kids.offline ? '⚠️ No internet right now.' : '⚠️ That family code didn\'t work.';
        return;
      }
      cloudLoginStep({ code: cleanFamilyCode(code.value), kids: kids });
    });
  } else if (!state.kid) {
    add('h2', 'Who are you?');
    state.kids.forEach(k => {
      const button = add('button', `${CLOUD_ANIMALS[k.animal] || ''} ${k.nickname}`);
      button.className = 'cloudKid';
      button.addEventListener('click', () => cloudLoginStep({ ...state, kid: k }));
    });
  } else {
    add('h2', `${CLOUD_ANIMALS[state.kid.animal] || ''} Hi, ${state.kid.nickname}!`);
    add('p', 'Type your PIN');
    const pin = add('input');
    pin.type = 'password';
    pin.inputMode = 'numeric';
    pin.maxLength = 4;
    const go = add('button', 'Log in');
    const back = add('button', '← Back');
    back.className = 'cloudBack';
    back.addEventListener('click', () => cloudLoginStep({ code: state.code, kids: state.kids }));
    go.addEventListener('click', async () => {
      note().textContent = '⏳ Logging in...';
      const login = await cloudCall('kid_login', { p_code: state.code, p_nickname: state.kid.nickname, p_pin: pin.value });
      if (!login.ok) { note().textContent = '⚠️ ' + login.error; return; }
      note().textContent = '⏳ Getting your stuff...';
      await cloudLinkWith(login);
      closeCloudLogin();
      // Nothing saved online yet: finish setup with the nickname filled in
      const name = document.getElementById('setupName');
      if (name && !name.value) name.value = state.kid.nickname;
    });
  }
  add('button', 'Cancel').addEventListener('click', closeCloudLogin);
}
