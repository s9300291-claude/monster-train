/* 怪獸訓練紀錄 — Service Worker（離線可用 + 可安裝）
   - 網頁本身（HTML / config.js）：網路優先 → 有新版一打開就是新版；離線時改用快取
   - 其他靜態檔（圖示、函式庫）：快取優先，背景更新
   - Supabase 資料 API：一律不經快取
   改版時把 VERSION 加 1，舊快取會自動清掉。 */
const VERSION = 'v2';
const CACHE = 'monster-train-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isSupabase(url) { return url.hostname.endsWith('.supabase.co'); }

function putInCache(req, res) {
  if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isSupabase(url)) return;

  const sameOrigin = url.origin === self.location.origin;
  const isPage = req.mode === 'navigate' || (sameOrigin && /\/(index\.html)?$|config\.js$/.test(url.pathname));

  if (isPage) {
    /* 網路優先：抓到就更新快取；失敗（離線）才用快取，查詢參數不同也能對到 */
    e.respondWith(
      fetch(req).then(res => putInCache(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(c => c || caches.match('./index.html')))
    );
    return;
  }

  /* 快取優先，背景更新 */
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => putInCache(req, res)).catch(() => cached);
      return cached || net;
    })
  );
});
