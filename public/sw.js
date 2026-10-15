// 오프라인 실행용 서비스 워커
//  · 설치 때 빌드 파일 목록(precache.json)을 모두 받아 둠
//  · 화면(HTML)은 네트워크 먼저 → 실패하면 보관본, 나머지(해시 붙은 파일)는 보관본 먼저
//  · 다른 사이트(광고 등)는 건드리지 않음
const CACHE = 'time-challenge-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const list = await (await fetch('precache.json', { cache: 'no-store' })).json();
        // 하나가 실패해도 나머지는 받음
        await Promise.allSettled(list.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
      } catch {
        /* 개발 서버 등 목록이 없으면 그냥 진행 */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('index.html', res.clone());
          return res;
        } catch {
          return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html'));
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })(),
  );
});
