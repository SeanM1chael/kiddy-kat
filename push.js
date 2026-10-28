// =====================================================================
// push.js — turning alerts on and off, and asking for one to be sent.
// Used by the kid app, the dashboard, the grades page and the Fans page.
// Each page passes its own login token.
// =====================================================================

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// iPhones only allow alerts for apps opened from the Home Screen icon
function pushNeedsHomeScreen() {
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const fromHomeScreen = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  return iphone && !fromHomeScreen;
}

function pushKeyBytes(base64) {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function pushRpc(name, args) {
  try {
    const response = await fetch(`${KIDDY_KAT_CLOUD.url}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { apikey: KIDDY_KAT_CLOUD.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? body : { ok: false, error: body.message || `Server error ${response.status}` };
  } catch (err) {
    return { ok: false, error: 'No internet right now' };
  }
}

// Is this device getting alerts right now?
async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration('./');
  return !!(reg && await reg.pushManager.getSubscription());
}

// Must be called from a tap (phones only ask permission after a tap)
async function pushTurnOn(token) {
  if (pushNeedsHomeScreen()) return { ok: false, error: 'On iPhone, open Kiddy Kat from its Home Screen icon to turn on alerts.' };
  if (!pushSupported()) return { ok: false, error: "This browser can't show alerts." };
  if (!KIDDY_KAT_CLOUD.pushKey) return { ok: false, error: "Alerts aren't set up on the server yet." };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'Alerts are blocked. Turn them on in this device\'s Settings → Notifications.' };
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKeyBytes(KIDDY_KAT_CLOUD.pushKey) });
    const saved = await pushRpc('save_push', { p_token: token, p_sub: sub.toJSON() });
    return saved.ok ? { ok: true } : { ok: false, error: 'The server couldn\'t save this device: ' + saved.error };
  } catch (err) {
    return { ok: false, error: "Couldn't turn on alerts: " + err.message };
  }
}

async function pushTurnOff() {
  const reg = pushSupported() ? await navigator.serviceWorker.getRegistration('./') : null;
  const sub = reg && await reg.pushManager.getSubscription();
  if (sub) {
    await pushRpc('remove_push', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return { ok: true };
}

// Ask the server to send an alert. kind = what happened ("reward", "yes", ...),
// kid = which kid it's for (alerts to kids), detail = a few words (like the reward name).
// Never waits and never shows an error: an alert is a nice extra, not a must.
function pushSend(token, kind, detail, kid) {
  if (!token || !KIDDY_KAT_CLOUD.pushKey) return;
  fetch(`${KIDDY_KAT_CLOUD.url}/functions/v1/kiddy-push`, {
    method: 'POST', headers: { apikey: KIDDY_KAT_CLOUD.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, kind: kind, detail: detail || '', kid: kid || '' })
  }).catch(() => {});
}

// A "🔔 Alerts" switch for any page. getToken() returns that page's login.
async function pushSwitch(box, getToken, label) {
  box.textContent = '';
  const line = document.createElement('div');
  const button = document.createElement('button');
  const note = document.createElement('div');
  note.className = 'pushNote';
  const draw = async () => {
    const on = await pushIsOn();
    line.textContent = on ? `🔔 Alerts are ON for ${label}.` : `🔕 Alerts are off for ${label}.`;
    // Each time, make sure the server still knows this device (and show any problem)
    if (on) {
      const reg = await navigator.serviceWorker.getRegistration('./');
      const sub = reg && await reg.pushManager.getSubscription();
      const saved = sub ? await pushRpc('save_push', { p_token: getToken(), p_sub: sub.toJSON() }) : { ok: true };
      if (!saved.ok) {
        line.textContent = `⚠️ Alerts are on here, but the server couldn't save this device.`;
        note.textContent = 'Problem: ' + saved.error;
      }
    }
    button.textContent = on ? 'Turn off alerts' : '🔔 Turn on alerts';
    button.onclick = async () => {
      note.textContent = '⏳ ...';
      const result = on ? await pushTurnOff() : await pushTurnOn(getToken());
      note.textContent = result.ok ? '' : '⚠️ ' + result.error;
      draw();
    };
  };
  box.append(line, button, note);
  if (pushNeedsHomeScreen()) note.textContent = 'On iPhone, alerts only work when Kiddy Kat is opened from its Home Screen icon.';
  await draw();
}
