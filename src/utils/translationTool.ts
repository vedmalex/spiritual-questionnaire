/**
 * Translation Tool
 * Utility for translators to save UI translations
 */

import type { TranslationKeys, LanguageCode } from '../types/i18n';
import { translations } from './i18n';

export interface TranslationFile {
  language: LanguageCode;
  translations: Partial<TranslationKeys>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    translator: string;
    version: string;
  };
}

export function createTranslationFile(
  language: LanguageCode,
  newTranslations: Partial<TranslationKeys>,
  translatorName: string
): TranslationFile {
  const now = new Date().toISOString();
  
  return {
    language,
    translations: newTranslations,
    metadata: {
      createdAt: now,
      updatedAt: now,
      translator: translatorName,
      version: '1.0.0',
    },
  };
}

export function downloadTranslationFile(file: TranslationFile, filename?: string): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `translation-${file.language}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadTranslationFile(file: File): Promise<TranslationFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as TranslationFile;
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function mergeTranslations(
  base: Partial<TranslationKeys>,
  override: Partial<TranslationKeys>
): TranslationKeys {
  return { ...base, ...override } as TranslationKeys;
}

export function getMissingTranslations(language: LanguageCode): string[] {
  const baseKeys = Object.keys(translations['en']) as Array<keyof TranslationKeys>;
  const langTranslations = translations[language] || {};
  
  return baseKeys.filter((key) => !langTranslations[key]);
}

export function exportAllTranslations(): void {
  const data = {
    translations,
    exportedAt: new Date().toISOString(),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all-translations-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}