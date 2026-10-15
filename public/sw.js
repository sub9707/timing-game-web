// 앱 설치·오프라인 기능은 없앴어요 — 예전에 설치된 브라우저에서 스스로 정리하는 서비스 워커
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      // 열린 창은 서비스 워커 없이 새로 불러옴
      for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
    })(),
  );
});
