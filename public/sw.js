const CACHE_NAME = 'tapdel-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Перехват запросов
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

  // Пропускаем модули JavaScript
  if (request.destination === 'script' && 
      (url.pathname.endsWith('.js') || url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx'))) {
    return;
  }

  // Пропускаем CSS модули
  if (request.destination === 'style' && 
      (url.pathname.endsWith('.css') || url.pathname.includes('?import'))) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Возвращаем кешированный ресурс если есть
        if (response) {
          console.log('Service Worker: Serving from cache:', url.pathname);
          return response;
        }

        // Иначе делаем сетевой запрос
        return fetch(request)
          .then((response) => {
            // Кешируем только успешные GET запросы для статических ресурсов
            if (!response || response.status !== 200 || response.type !== 'basic' || request.method !== 'GET') {
              return response;
            }

            // Кешируем только определенные типы ресурсов
            const shouldCache = url.pathname === '/' || 
                              url.pathname === '/index.html' ||
                              url.pathname.startsWith('/manifest') ||
                              url.pathname.startsWith('/icon') ||
                              url.pathname.startsWith('/vite.svg');

            if (shouldCache) {
              // Клонируем ответ для кеширования
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                  console.log('Service Worker: Cached:', url.pathname);
                });
            }

            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Fetch failed:', url.pathname, error);
            return new Response('Network error', { status: 503 });
          });
      })
  );
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть',
        icon: '/vite.svg'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/vite.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TAPDEL', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}); 