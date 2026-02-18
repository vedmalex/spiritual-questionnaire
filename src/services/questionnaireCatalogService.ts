import type { Questionnaire } from '../types/questionnaire';
import { normalizeQuestionnaire } from '../utils/questionnaireSchema';
import { toPublicPath } from '../utils/publicPath';
import { withQuestionnaireRuntimeIdentity } from '../utils/questionnaireIdentity';
import {
  normalizeQuestionnaireIndexEntry,
  withServerFolderMetadata,
} from '../utils/questionnaireServerFolders';
import { dataAdapter } from './localStorageAdapter';

export interface QuestionnaireLoadProgress {
  state: 'loading' | 'retrying';
  attempt: number;
  maxAttempts: number;
  lastError?: string;
}

export interface QuestionnairesLoadResult {
  questionnaires: Questionnaire[];
  staticCount: number;
  localCount: number;
  staticLoaded: boolean;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${path})`);
  }
  return (await response.json()) as T;
}

async function loadStaticQuestionnairesOnce(): Promise<Questionnaire[]> {
  const indexPath = toPublicPath('questionnaires/index.json');
  const files = await fetchJson<string[]>(indexPath);

  if (!Array.isArray(files)) {
    throw new Error('Invalid questionnaires index format');
  }

  const questionnaires = await Promise.all(
    files.map(async (fileNameRaw) => {
      const fileName = normalizeQuestionnaireIndexEntry(fileNameRaw);
      const filePath = toPublicPath(`questionnaires/${fileName}`);
      const parsed = await fetchJson<unknown>(filePath);
      return withServerFolderMetadata(normalizeQuestionnaire(parsed), fileName);
    })
  );

  return questionnaires;
}

export async function loadQuestionnairesFromSources(options?: {
  maxAttempts?: number;
  retryDelayMs?: number;
  onProgress?: (progress: QuestionnaireLoadProgress) => void;
}): Promise<QuestionnairesLoadResult> {
  const maxAttempts = Math.max(1, Math.floor(options?.maxAttempts ?? 3));
  const retryDelayMs = Math.max(0, Math.floor(options?.retryDelayMs ?? 2000));

  let staticQuestionnaires: Questionnaire[] = [];
  let staticLoaded = false;
  let attempts = 0;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    options?.onProgress?.({
      state: attempt === 1 ? 'loading' : 'retrying',
      attempt,
      maxAttempts,
      lastError,
    });

    try {
      staticQuestionnaires = await loadStaticQuestionnairesOnce();
      staticLoaded = true;
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < maxAttempts) {
        await wait(retryDelayMs);
      }
    }
  }

  let localQuestionnaires: Questionnaire[] = [];
  try {
    localQuestionnaires = await dataAdapter.getCustomQuestionnaires();
  } catch (error) {
    const localError = error instanceof Error ? error.message : String(error);
    lastError = lastError ? `${lastError}; ${localError}` : localError;
  }

  const staticWithIdentity = staticQuestionnaires.map((questionnaire) =>
    withQuestionnaireRuntimeIdentity(questionnaire, 'static')
  );
  const localWithIdentity = localQuestionnaires.map((questionnaire) =>
    withQuestionnaireRuntimeIdentity(questionnaire, 'local')
  );

  return {
    questionnaires: [...staticWithIdentity, ...localWithIdentity],
    staticCount: staticWithIdentity.length,
    localCount: localWithIdentity.length,
    staticLoaded,
    attempts,
    maxAttempts,
    lastError,
  };
}
