// =====================================================================
// sw.js — Kiddy Kat's "service worker": a small helper the phone keeps
// running in the background, so alerts arrive even when the app is closed.
// It only shows alerts. It does NOT save copies of the app (so updates still
// show up after a push to GitHub, like before).
// =====================================================================

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// An alert arrived: show it
self.addEventListener('push', event => {
  let alert = {};
  try { alert = event.data ? event.data.json() : {}; } catch (err) { alert = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(alert.title || 'Kiddy Kat', {
    body: alert.body || 'Something new in Kiddy Kat',
    icon: 'icon.png',
    badge: 'icon.png',
    tag: alert.tag,                 // a newer alert of the same kind replaces the older one
    data: { url: alert.url || './' }
  }));
});

// The alert was tapped: open Kiddy Kat (or bring it to the front)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const open = windows.find(w => w.url.startsWith(url.split('?')[0]));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
