import { STORAGE_KEYS } from './constants';
import { t } from './i18n';
import { toPublicPath } from './publicPath';

const QUESTIONNAIRE_INDEX_URL = toPublicPath('questionnaires/index.json');
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MAX_NAMES_IN_NOTIFICATION = 3;

interface QuestionnaireIndexSnapshot {
  files: string[];
  updatedAt: string;
}

export function normalizeQuestionnaireIndexPayload(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const files = payload
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.toLowerCase().endsWith('.json'));

  return [...new Set(files)].sort((left, right) => left.localeCompare(right));
}

export function getNewQuestionnaireFiles(previousFiles: string[], nextFiles: string[]): string[] {
  if (!previousFiles.length) {
    return [];
  }

  const knownFiles = new Set(previousFiles);
  return nextFiles.filter((file) => !knownFiles.has(file));
}

export function isStandalonePwaMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const mediaFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const mediaMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
  const iosStandalone =
    typeof (window.navigator as Navigator & { standalone?: boolean }).standalone === 'boolean' &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return mediaStandalone || mediaFullscreen || mediaMinimalUi || iosStandalone;
}

function canUseNotificationApi(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function formatQuestionnaireName(fileName: string): string {
  return fileName
    .replace(/\.json$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function readIndexSnapshot(): QuestionnaireIndexSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEYS.STATIC_QUESTIONNAIRE_INDEX_SNAPSHOT);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<QuestionnaireIndexSnapshot>;
    if (!Array.isArray(parsed.files)) {
      return null;
    }

    return {
      files: normalizeQuestionnaireIndexPayload(parsed.files),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeIndexSnapshot(files: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: QuestionnaireIndexSnapshot = {
    files,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.STATIC_QUESTIONNAIRE_INDEX_SNAPSHOT, JSON.stringify(payload));
}

async function fetchStaticQuestionnaireIndex(): Promise<string[] | null> {
  try {
    const response = await fetch(QUESTIONNAIRE_INDEX_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return normalizeQuestionnaireIndexPayload(payload);
  } catch {
    return null;
  }
}

async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseNotificationApi()) {
    return 'denied';
  }

  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  if (typeof window === 'undefined') {
    return 'denied';
  }

  const promptedFlag = localStorage.getItem(
    STORAGE_KEYS.QUESTIONNAIRE_NOTIFICATION_PERMISSION_PROMPTED
  );

  if (promptedFlag === 'true') {
    return Notification.permission;
  }

  localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE_NOTIFICATION_PERMISSION_PROMPTED, 'true');

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function buildNotificationBody(addedFiles: string[]): string {
  const labels = addedFiles.map(formatQuestionnaireName).filter(Boolean);
  const visibleLabels = labels.slice(0, MAX_NAMES_IN_NOTIFICATION);
  const names = visibleLabels.join(', ');

  return t('pwa.updates.body', {
    count: addedFiles.length,
    names,
  });
}

async function showQuestionnaireUpdateNotification(addedFiles: string[]): Promise<void> {
  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  const title = t('pwa.updates.title');
  const body = buildNotificationBody(addedFiles);

  const notificationOptions: NotificationOptions = {
    body,
    tag: 'questionnaire-updates',
    renotify: true,
    icon: './icons/qwiz-icon-192.png',
    badge: './icons/qwiz-icon-192.png',
    data: {
      addedFiles,
    },
  };

  const serviceWorkerRegistration = await navigator.serviceWorker?.ready.catch(() => null);

  if (serviceWorkerRegistration) {
    await serviceWorkerRegistration.showNotification(title, notificationOptions);
    return;
  }

  new Notification(title, notificationOptions);
}

async function checkQuestionnaireUpdatesOnce(): Promise<void> {
  if (!isStandalonePwaMode() || !canUseNotificationApi()) {
    return;
  }

  const nextIndex = await fetchStaticQuestionnaireIndex();
  if (!nextIndex || nextIndex.length === 0) {
    return;
  }

  const previousSnapshot = readIndexSnapshot();

  if (!previousSnapshot) {
    writeIndexSnapshot(nextIndex);
    return;
  }

  const addedFiles = getNewQuestionnaireFiles(previousSnapshot.files, nextIndex);

  if (addedFiles.length > 0) {
    await showQuestionnaireUpdateNotification(addedFiles);
  }

  writeIndexSnapshot(nextIndex);
}

export function startQuestionnaireUpdateNotifications(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  let inFlight = false;

  const runCheck = () => {
    if (inFlight || !navigator.onLine) {
      return;
    }

    inFlight = true;
    void checkQuestionnaireUpdatesOnce().finally(() => {
      inFlight = false;
    });
  };

  runCheck();

  const intervalId = window.setInterval(runCheck, UPDATE_CHECK_INTERVAL_MS);

  const handleOnline = () => runCheck();
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      runCheck();
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
