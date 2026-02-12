const CACHE_VERSION = 'qwiz-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/qwiz-icon-192.png',
  './icons/qwiz-icon-512.png',
  './icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter((cacheKey) => !cacheKey.startsWith(CACHE_VERSION))
          .map((cacheKey) => caches.delete(cacheKey))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  if (new URL(request.url).origin !== self.location.origin) {
    return
  }

  event.respondWith(handleStaticRequest(request))
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      if (clientList.length > 0) {
        await clientList[0].focus()
        return
      }

      await self.clients.openWindow('./')
    })()
  )
})

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request)
    const cache = await caches.open(RUNTIME_CACHE)
    cache.put(request, networkResponse.clone())
    return networkResponse
  } catch {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const indexFallback = await caches.match('./index.html')
    if (indexFallback) {
      return indexFallback
    }

    const offlineFallback = await caches.match('./offline.html')
    if (offlineFallback) {
      return offlineFallback
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch {
    if (request.destination === 'image') {
      const iconFallback = await caches.match('./icons/qwiz-icon-192.png')
      if (iconFallback) {
        return iconFallback
      }
    }

    return new Response('', {
      status: 504,
      statusText: 'Gateway Timeout',
    })
  }
}
