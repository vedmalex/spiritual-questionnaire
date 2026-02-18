import type { Questionnaire } from '../types/questionnaire';

function normalizeSystemFolderList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function uniqueInOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    next.push(value);
  }

  return next;
}

export function normalizeQuestionnaireIndexEntry(rawEntry: unknown): string {
  const raw = String(rawEntry || '').trim();
  if (!raw) {
    throw new Error('Empty file name in questionnaires index');
  }

  const segments = raw
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Invalid questionnaire index entry: ${raw}`);
  }

  const normalized = segments.join('/');
  if (!normalized.toLowerCase().endsWith('.json')) {
    throw new Error(`Invalid questionnaire file extension: ${raw}`);
  }

  return normalized;
}

export function deriveServerSystemFolder(indexEntry: string): string | null {
  const normalized = normalizeQuestionnaireIndexEntry(indexEntry);
  const segments = normalized.split('/');
  if (segments.length <= 1) {
    return null;
  }
  return segments.slice(0, -1).join('/');
}

export function withServerFolderMetadata(
  questionnaire: Questionnaire,
  indexEntry: string
): Questionnaire {
  const serverFolder = deriveServerSystemFolder(indexEntry);
  const existing = normalizeSystemFolderList(questionnaire.metadata.system_folders);
  const merged = uniqueInOrder([...(serverFolder ? [serverFolder] : []), ...existing]);

  if (merged.length === 0) {
    if (!questionnaire.metadata.system_folders) {
      return questionnaire;
    }
    return {
      ...questionnaire,
      metadata: {
        ...questionnaire.metadata,
        system_folders: undefined,
      },
    };
  }

  return {
    ...questionnaire,
    metadata: {
      ...questionnaire.metadata,
      system_folders: merged,
    },
  };
}
