const cacheName = 'v1';
const cacheFiles = [
  './',
  './index.html',
  './健康數據計算器.css', // 換成你的 CSS 檔名
  './健康數據計算器.js', // 換成你的 JS 檔名
  './健康數據計算器image/192icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(cacheFiles)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
