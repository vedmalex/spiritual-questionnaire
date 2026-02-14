declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
const GA_TAG_ID = String(import.meta.env.VITE_GA_TAG_ID || '').trim();
const GA_IDS = Array.from(new Set([GA_TAG_ID, GA_MEASUREMENT_ID].filter(Boolean)));
const GA_SCRIPT_ID = 'ga-measurement-script';
let analyticsInitialized = false;

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isAnalyticsEnabled(): boolean {
  return GA_IDS.length > 0;
}

export function initializeAnalytics(): void {
  if (!isClient() || !isAnalyticsEnabled() || analyticsInitialized) {
    return;
  }

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      GA_TAG_ID || GA_MEASUREMENT_ID
    )}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }

  window.gtag('js', new Date());
  if (GA_TAG_ID) {
    window.gtag('config', GA_TAG_ID);
  }
  if (GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  }

  analyticsInitialized = true;
}

export function trackPageView(path: string): void {
  initializeAnalytics();

  if (!isClient() || !isAnalyticsEnabled() || typeof window.gtag !== 'function') {
    return;
  }

  const eventParams: Record<string, string> = {
    page_path: path,
    page_title: document.title,
    page_location: window.location.href,
  };

  if (GA_MEASUREMENT_ID) {
    eventParams.send_to = GA_MEASUREMENT_ID;
  }

  window.gtag('event', 'page_view', eventParams);
}

export function trackEvent(
  eventName: string,
  params: Record<string, string | number | boolean> = {}
): void {
  initializeAnalytics();

  if (!isClient() || !isAnalyticsEnabled() || typeof window.gtag !== 'function') {
    return;
  }

  if (GA_MEASUREMENT_ID) {
    window.gtag('event', eventName, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
    return;
  }

  window.gtag('event', eventName, params);
}

export function trackFormActivity(
  formId: string,
  action: string,
  extra: Record<string, string | number | boolean> = {}
): void {
  trackEvent('form_activity', {
    form_id: formId,
    action,
    ...extra,
  });
}
