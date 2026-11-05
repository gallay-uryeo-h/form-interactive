// sw.js — Self-cleaning Service Worker
// 기존에 설치된 캐시와 서비스 워커를 완전히 삭제하여 구글 로그인 충돌을 제거합니다.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});
