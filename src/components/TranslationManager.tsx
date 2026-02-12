import { useEffect, useMemo, useState } from 'react';
import type { LanguageCode } from '../types/i18n';
import { translations, t } from '../utils/i18n';
import {
  getFormTranslationCoverage,
  summarizeFormTranslationCoverage,
} from '../utils/formTranslationCoverage';
import {
  createTranslationFile,
  downloadTranslationFile,
  exportAllTranslations,
  getMissingTranslations,
  loadTranslationFile,
} from '../utils/translationTool';
import {
  FormField,
  FormFileInput,
  FormInput,
  FormSelect,
  FormTextarea,
} from './ui/FormPrimitives';

export function TranslationManager() {
  const [language, setLanguage] = useState<LanguageCode>('ru');
  const [translator, setTranslator] = useState('');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(translations.ru, null, 2));
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [importedMeta, setImportedMeta] = useState('');

  const missingKeys = getMissingTranslations(language);
  const formCoverage = useMemo(() => getFormTranslationCoverage(['ru', 'en']), []);
  const coverageSummary = useMemo(
    () => summarizeFormTranslationCoverage(formCoverage),
    [formCoverage]
  );

  useEffect(() => {
    setJsonText(JSON.stringify(translations[language], null, 2));
    setStatus(t('translation.status.loadedForLanguage', { language }));
    setError('');
  }, [language]);

  const handleLoadCurrentTranslations = () => {
    setJsonText(JSON.stringify(translations[language], null, 2));
    setStatus(t('translation.status.currentLoaded', { language }));
    setError('');
  };

  const handleDownloadTranslation = () => {
    setStatus('');
    setError('');

    try {
      const parsed = JSON.parse(jsonText);
      const file = createTranslationFile(language, parsed, translator || 'Unknown translator');
      downloadTranslationFile(file);
      setStatus(t('translation.status.fileDownloaded'));
    } catch {
      setError(t('translation.error.invalidJson'));
    }
  };

  const handleImportTranslation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('');
    setError('');

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const loaded = await loadTranslationFile(file);
      setLanguage(loaded.language);
      setJsonText(JSON.stringify(loaded.translations, null, 2));
      setTranslator(loaded.metadata.translator || '');
      setImportedMeta(
        t('translation.status.importMeta', {
          fileName: file.name,
          translator: loaded.metadata.translator || '-',
          version: loaded.metadata.version || '-',
        })
      );
      setStatus(t('translation.status.fileLoaded'));
    } catch {
      setError(t('translation.error.fileRead'));
    }
  };

  const handleExportCoverageReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: coverageSummary,
      forms: formCoverage,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `translation-coverage-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('translation.title')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('translation.subtitle')}
        </p>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField label={t('translation.language')}>
            <FormSelect
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            >
              <option value="ru">{t('translation.language.option.ru')}</option>
              <option value="en">{t('translation.language.option.en')}</option>
            </FormSelect>
          </FormField>

          <FormField label={t('translation.translator')}>
            <FormInput
              type="text"
              value={translator}
              onChange={(event) => setTranslator(event.target.value)}
              placeholder={t('translation.translator.placeholder')}
            />
          </FormField>

          <FormField label={t('translation.import')}>
            <FormFileInput
              accept="application/json,.json"
              onChange={handleImportTranslation}
            />
          </FormField>
        </div>

        <FormField label={t('translation.json')}>
          <FormTextarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            rows={14}
            className="font-mono text-sm"
          />
        </FormField>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLoadCurrentTranslations}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          >
            {t('translation.actions.loadCurrent')}
          </button>
          <button
            type="button"
            onClick={handleDownloadTranslation}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
          >
            {t('translation.actions.save')}
          </button>
          <button
            type="button"
            onClick={exportAllTranslations}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            {t('translation.actions.exportAll')}
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          {t('translation.keys.title')}
        </h2>
        {missingKeys.length === 0 ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            {t('translation.keys.noneMissing')}
          </p>
        ) : (
          <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
            {missingKeys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('translation.audit.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('translation.audit.summary', {
                forms: coverageSummary.totalForms,
                covered: coverageSummary.fullyCoveredForms,
                missing: coverageSummary.totalMissingKeys,
              })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('translation.audit.missingRu', { count: coverageSummary.languageMissingTotals.ru })} •{' '}
              {t('translation.audit.missingEn', { count: coverageSummary.languageMissingTotals.en })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCoverageReport}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            {t('translation.audit.exportCoverage')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-3">{t('translation.audit.table.form')}</th>
                <th className="py-2 pr-3">{t('translation.audit.table.keys')}</th>
                <th className="py-2 pr-3">{t('translation.audit.table.missingRu')}</th>
                <th className="py-2 pr-3">{t('translation.audit.table.missingEn')}</th>
                <th className="py-2 pr-3">{t('translation.audit.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {formCoverage.map((entry) => (
                <tr
                  key={entry.formId}
                  className="border-b border-gray-100 dark:border-gray-700/60 align-top"
                >
                  <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{entry.formId}</p>
                  </td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">
                    {entry.requiredKeys.length}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">
                    {entry.missingByLanguage.ru.length}
                    {entry.missingByLanguage.ru.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {entry.missingByLanguage.ru.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">
                    {entry.missingByLanguage.en.length}
                    {entry.missingByLanguage.en.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {entry.missingByLanguage.en.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        entry.fullyCovered
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {entry.fullyCovered
                        ? t('translation.audit.status.ok')
                        : t('translation.audit.status.needsWork')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {importedMeta && (
        <section className="p-3 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {importedMeta}
        </section>
      )}

      {status && (
        <section className="p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {status}
        </section>
      )}

      {error && (
        <section className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </section>
      )}
    </div>
  );
}
