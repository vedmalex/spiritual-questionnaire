import { useRef, useState } from 'react';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import {
  createQuestionnaireTemplate,
  downloadQuestionnaire,
  parseQuestionnaireFile,
} from '../utils/questionnaireSchema';
import { t } from '../utils/i18n';

interface QuestionnaireLoaderProps {
  className?: string;
  onLoaded?: () => Promise<void> | void;
}

export function QuestionnaireLoader({ className, onLoaded }: QuestionnaireLoaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { saveCustomQuestionnaire, refresh } = useQuestionnaires();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getQuestionnaireTitle = (title: string | Record<string, string>): string => {
    if (typeof title === 'string') {
      return title;
    }

    const language = document.documentElement.lang || 'ru';
    return title[language] || title.en || title.ru || '';
  };

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage('');
    setError('');

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseQuestionnaireFile(content);

      if (!parsed.valid || !parsed.questionnaire) {
        setError(parsed.errors.join('\n'));
        return;
      }

      await saveCustomQuestionnaire(parsed.questionnaire);
      await refresh();
      if (onLoaded) {
        await onLoaded();
      }
      setMessage(
        t('loader.status.success', {
          title: getQuestionnaireTitle(parsed.questionnaire.metadata.title),
        })
      );
    } catch (loadError) {
      setError(t('loader.status.error'));
      console.error(loadError);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    const template = createQuestionnaireTemplate();
    downloadQuestionnaire(template, 'questionnaire-template.json');
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className || ''}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('loader.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('loader.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('loader.actions.downloadTemplate')}
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm text-white"
          >
            {t('loader.actions.upload')}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileLoad}
      />

      {message && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">{error}</p>
      )}
    </div>
  );
}
