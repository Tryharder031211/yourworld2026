/* sw.js — Service Worker PWA (bộ đệm app-shell, luôn dùng mạng cho API Supabase) */
'use strict';
const CACHE = 'luachill-v2';
const SHELL = [
  './', './index.html', './config.js', './pwa.webmanifest',
  './assets/style.css', './assets/doodle-icons.js', './assets/voxel-donkey.js', './assets/scenes.js',
  './core/engine.js', './core/ui.js', './core/cloud.js', './core/social.js', './core/lobby.js', './core/demo.js', './core/boot.js',
  './module-suc-khoe/health.html', './module-suc-khoe/tasks.js', './module-suc-khoe/timer.js', './module-suc-khoe/sleep-lock.js',
  './module-tycoon-tamly/tycoon.html', './module-tycoon-tamly/room-decor.js', './module-tycoon-tamly/shop.js',
  './module-tycoon-tamly/fomo.html', './module-tycoon-tamly/game-trend.js', './module-tycoon-tamly/game-monster.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
