/* ════════════════════════════════
   sw.js — Service Worker（PWA・オフライン閲覧）

   方針: オンラインなら常に最新を取りに行き、つながらないときだけ前回の内容を出す。
   オフラインでできるのは「前回見た内容の閲覧」だけ（追加・編集・削除はできない）。

   ・自サイトのファイル（HTML/CSS/JS）… ネットワーク優先 → 失敗したらキャッシュ
   ・Supabase のデータ取得（GET /rest/v1/）… ネットワーク優先 → 失敗したらキャッシュ
   ・Supabase Storage の写真 … キャッシュを即返し、裏で更新
   ・CDN（supabase-js / Leaflet）… キャッシュを即返し、裏で更新
   ・それ以外（認証・地図タイル・住所検索・書き込み）… 何もしない（素通し）

   ★ ページや js ファイルを追加したら、下の PRECACHE にも足すこと。
     （足し忘れても一度開けばキャッシュされるが、未訪問だとオフラインで開けない）
════════════════════════════════ */

const SHELL_CACHE = 'taverna-shell-v1';   // 構成を大きく変えたら v を上げる（古い方は自動削除）
const DATA_CACHE  = 'taverna-data';       // ログアウト時に auth.js が削除する
const IMG_CACHE   = 'taverna-img';
const CDN_CACHE   = 'taverna-cdn';
const IMG_MAX     = 300;                  // 写真キャッシュの上限枚数

const PRECACHE = [
  './',
  'index.html',
  'store-detail.html',
  'store-edit.html',
  'ranking.html',
  'login.html',
  'manifest.json',
  'css/style.css',
  'js/utils.js',
  'js/supabase.js',
  'js/auth.js',
  'js/pwa.js',
  'js/map.js',
  'js/seating.js',
  'js/parking.js',
  'js/winter.js',
  'js/tags.js',
  'js/stores.js',
  'js/store-edit.js',
  'js/ranking.js',
  'js/bulk.js',
  'js/export.js',
  'js/visits.js',
  'js/menu.js',
  'icons/icon-192.png',
];

const PRECACHE_CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com'];

// ─── インストール／有効化 ─────────

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // 1つ失敗しても全体は止めない（allSettled）
    const shell = await caches.open(SHELL_CACHE);
    await Promise.allSettled(PRECACHE.map(async url => {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) await shell.put(url, res);
    }));
    const cdn = await caches.open(CDN_CACHE);
    await Promise.allSettled(PRECACHE_CDN.map(async url => {
      const req = new Request(url, { mode: 'no-cors' });
      await cdn.put(req, await fetch(req));
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n.startsWith('taverna-shell-') && n !== SHELL_CACHE)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ─── 振り分け（純粋関数・判定だけ）───

/**
 * リクエストをどの戦略で扱うか決める。
 * 戻り値: 'shell' | 'data' | 'img' | 'cdn' | null（null は素通し）
 */
function routeFor(method, url, selfOrigin) {
  if (method !== 'GET') return null;
  const u = new URL(url);
  if (u.origin === selfOrigin) return 'shell';
  if (u.hostname.endsWith('.supabase.co')) {
    if (u.pathname.startsWith('/rest/v1/')) return 'data';
    if (u.pathname.startsWith('/storage/v1/object/public/')) return 'img';
    return null;  // 認証（/auth/v1/）などは絶対にキャッシュしない
  }
  if (CDN_HOSTS.includes(u.hostname)) return 'cdn';
  return null;
}

// ─── 戦略 ─────────────────────────

/**
 * ネットワーク優先。失敗したらキャッシュ。
 * key を渡すとそのURLで保存・検索する（HTML を ?id= ごとに重複保存しないため）。
 */
async function networkFirst(request, cacheName, matchOptions, key) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(key || request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(key || request, matchOptions);
    if (cached) return cached;
    throw err;
  }
}

/** キャッシュを即返し、裏で取り直して次回に備える。キャッシュが無ければネットワークを待つ */
async function staleWhileRevalidate(event, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request).then(async res => {
    // no-cors（img / script タグ）の応答は opaque で ok=false になるので type でも通す
    if (res.ok || res.type === 'opaque') {
      await cache.put(event.request, res.clone());
      if (maxEntries) await trimCache(cache, maxEntries);
    }
    return res;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

/** 古い順に削って上限枚数に収める */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}

// ─── fetch ────────────────────────

self.addEventListener('fetch', event => {
  const req = event.request;
  const route = routeFor(req.method, req.url, self.location.origin);
  if (!route) return;

  if (route === 'shell') {
    // store-detail.html?id=… はどの id でも同じファイルなので、クエリを外したURLで保存する
    const key = req.url.split('#')[0].split('?')[0];
    event.respondWith(networkFirst(req, SHELL_CACHE, undefined, key));
  } else if (route === 'data') {
    // 同じURLでも Authorization が違うことがあるので Vary は無視して探す
    event.respondWith(networkFirst(req, DATA_CACHE, { ignoreVary: true }));
  } else if (route === 'img') {
    event.respondWith(staleWhileRevalidate(event, IMG_CACHE, IMG_MAX));
  } else {
    event.respondWith(staleWhileRevalidate(event, CDN_CACHE));
  }
});
