const SERVICE_WORKER_FILE = 'sw.js'

export async function registerPwaServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV) {
    return
  }

  try {
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href)
    const serviceWorkerUrl = new URL(SERVICE_WORKER_FILE, baseUrl)

    await navigator.serviceWorker.register(serviceWorkerUrl.href, {
      scope: baseUrl.pathname,
    })
  } catch (error) {
    console.warn('Service worker registration failed', error)
  }
}
