const CACHE_NAME = 'tapdel-v3'; // Обновляем версию кэша
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Устанавливаем кэш при установке SW
self.addEventListener('install', (event) => {
  // console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        // console.error('Service Worker: Installation failed:', error);
      })
  );
});

// Активируем SW и очищаем старые кэши
self.addEventListener('activate', (event) => {
  // console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              // console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Перехватываем fetch запросы
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем API запросы
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Пропускаем Vite dev server запросы
  if (url.pathname.startsWith('/@vite/') ||
      url.pathname.startsWith('/@react-refresh') ||
      url.pathname.startsWith('/node_modules/') ||
      url.pathname.includes('?t=') ||
      url.pathname.includes('?v=')) {
    return;
  }

  // Пропускаем JavaScript модули (критично!)
  if (request.destination === 'script' ||
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.ts') || 
      url.pathname.endsWith('.tsx') ||
      url.pathname.endsWith('.mjs')) {
    // console.log('Service Worker: Skipping JavaScript module:', url.pathname);
    return;
  }

  // Пропускаем CSS модули
  if (request.destination === 'style' ||
      url.pathname.endsWith('.css') || 
      url.pathname.includes('?import')) {
    // console.log('Service Worker: Skipping CSS module:', url.pathname);
    return;
  }

  // Пропускаем HTML модули
  if (request.destination === 'document' ||
      url.pathname.endsWith('.html')) {
    // console.log('Service Worker: Skipping HTML module:', url.pathname);
    return;
  }

  // Кэшируем только статические ресурсы
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          // console.log('Service Worker: Serving from cache:', url.pathname);
          return response;
        }

        return fetch(request)
          .then((response) => {
            // Кэшируем только успешные ответы для статических ресурсов
            if (response && response.status === 200 && 
                (request.destination === 'image' || 
                 request.destination === 'font' ||
                 STATIC_ASSETS.includes(url.pathname))) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Fallback для статических ресурсов
            if (STATIC_ASSETS.includes(url.pathname)) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  // console.log('Service Worker: Push event received');
  
  const options = {
    body: 'TAPDEL: Новое уведомление!',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('TAPDEL', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  // console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
}); 