import { useState } from 'react';
import { QuestionnaireEditor } from './QuestionnaireEditor';
import { TranslationManager } from './TranslationManager';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { runMigrations } from '../services/migration';
import { parseResultsTransferPayload } from '../utils/resultsTransfer';
import {
  reconcileImportedResults,
  type ReconciliationReport,
} from '../utils/reconciliation';
import { t } from '../utils/i18n';
import { FormField, FormFileInput } from './ui/FormPrimitives';

export type AdminTab = 'overview' | 'questionnaires' | 'translations' | 'operations';

interface AdminDashboardProps {
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export function AdminDashboard({ activeTab, onTabChange }: AdminDashboardProps) {
  const [internalTab, setInternalTab] = useState<AdminTab>('overview');
  const [opsStatus, setOpsStatus] = useState('');
  const [opsError, setOpsError] = useState('');
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const { questionnaires, loading: questionnairesLoading } = useQuestionnaires();
  const currentTab = activeTab ?? internalTab;

  const switchTab = (tab: AdminTab) => {
    if (!onTabChange) {
      setInternalTab(tab);
      return;
    }
    onTabChange(tab);
  };

  const handleRunMigrations = async () => {
    setOpsStatus('');
    setOpsError('');

    try {
      await runMigrations();
      setOpsStatus(t('admin.ops.status.migrations.success'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('admin.ops.error.migrations.failed');
      setOpsError(message);
    }
  };

  const handleReconciliationFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setOpsStatus('');
    setOpsError('');
    setReport(null);

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseResultsTransferPayload(content);

      if (parsed.totalRaw === 0) {
        throw new Error(t('admin.ops.error.reconciliation.emptyFile'));
      }

      const nextReport = reconcileImportedResults(parsed.valid, questionnaires);
      setReport(nextReport);
      setOpsStatus(
        t('admin.ops.status.reconciliation.completed', {
          total: nextReport.totalResults,
          compatible: nextReport.compatibleResults,
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('admin.ops.error.reconciliation.failed');
      setOpsError(message);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('admin.title')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('admin.subtitle')}
        </p>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 md:p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => switchTab('overview')}
            className={`px-3 py-2 rounded-lg text-sm ${
              currentTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            {t('admin.tab.overview')}
          </button>
          <button
            type="button"
            onClick={() => switchTab('questionnaires')}
            className={`px-3 py-2 rounded-lg text-sm ${
              currentTab === 'questionnaires'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            {t('admin.tab.questionnaires')}
          </button>
          <button
            type="button"
            onClick={() => switchTab('translations')}
            className={`px-3 py-2 rounded-lg text-sm ${
              currentTab === 'translations'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            {t('admin.tab.translations')}
          </button>
          <button
            type="button"
            onClick={() => switchTab('operations')}
            className={`px-3 py-2 rounded-lg text-sm ${
              currentTab === 'operations'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            {t('admin.tab.operations')}
          </button>
        </div>
      </section>

      {currentTab === 'overview' && (
        <section className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => switchTab('questionnaires')}
            className="text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/20 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{t('editor.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.overview.editor.description')}
            </p>
          </button>
          <button
            type="button"
            onClick={() => switchTab('translations')}
            className="text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/20 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{t('translation.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.overview.translation.description')}
            </p>
          </button>
          <button
            type="button"
            onClick={() => switchTab('operations')}
            className="text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/20 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{t('admin.tab.operations')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.overview.operations.description')}
            </p>
          </button>
        </section>
      )}

      {currentTab === 'questionnaires' && <QuestionnaireEditor />}

      {currentTab === 'translations' && <TranslationManager />}

      {currentTab === 'operations' && (
        <section className="space-y-4">
          <article className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('admin.ops.migrations.title')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('admin.ops.migrations.description')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunMigrations}
                className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
                >
                {t('admin.ops.migrations.run')}
              </button>
            </div>
          </article>

          <article className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('admin.ops.reconciliation.title')}
                </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.ops.reconciliation.description')}
              </p>
            </div>

            <FormField label={t('admin.ops.reconciliation.file')}>
              <FormFileInput
                accept="application/json,.json"
                onChange={handleReconciliationFile}
                disabled={questionnairesLoading}
              />
            </FormField>

            {report && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p>{t('admin.ops.report.totalResults', { count: report.totalResults })}</p>
                <p>{t('admin.ops.report.compatibleResults', { count: report.compatibleResults })}</p>
                <p>{t('admin.ops.report.incompatibleResults', { count: report.incompatibleResults })}</p>
                <p>{t('admin.ops.report.missingQuestionnaires', { count: report.missingQuestionnaires })}</p>
                <p>{t('admin.ops.report.missingQuestions', { count: report.missingQuestions })}</p>
              </div>
            )}
          </article>

          {opsStatus && (
            <p className="text-sm text-green-700 dark:text-green-400">{opsStatus}</p>
          )}
          {opsError && (
            <p className="text-sm text-red-700 dark:text-red-400">{opsError}</p>
          )}
        </section>
      )}
    </div>
  );
}
