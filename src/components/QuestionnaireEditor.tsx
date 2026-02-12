import { useMemo, useState } from 'react';
import type { LocalizedStringList, LocalizedText, Questionnaire } from '../types/questionnaire';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import {
  downloadQuestionnaire,
  normalizeQuestionnaire,
  parseQuestionnaireFile,
  validateQuestionnaire,
} from '../utils/questionnaireSchema';
import { t } from '../utils/i18n';
import {
  FormField,
  FormFileInput,
  FormInput,
  FormSelect,
  FormTextarea,
} from './ui/FormPrimitives';
import {
  getQuestionnaireRuntimeId,
  isLocalQuestionnaire,
} from '../utils/questionnaireIdentity';

const DEFAULT_QUESTION_LANGUAGES = ['ru', 'en'];

interface EditorQuestion {
  id: string;
  localizedQuestions: Record<string, string>;
  localizedContextSources: Record<string, string>;
  localizedSelfCheckPrompts: Record<string, string>;
  requiresComment: boolean;
}

interface EditorState {
  quality: string;
  languages: string[];
  localizedTitle: Record<string, string>;
  localizedSourceLecture: Record<string, string>;
  questions: EditorQuestion[];
}

function normalizeLanguageCode(value: string): string {
  return value.trim().toLowerCase();
}

function isValidLanguageCode(value: string): boolean {
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(value);
}

function uniqueLanguages(languages: string[]): string[] {
  const normalized = languages
    .map((entry) => normalizeLanguageCode(entry))
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : [...DEFAULT_QUESTION_LANGUAGES];
}

function localizeText(value: string | LocalizedText, languages: string[]): Record<string, string> {
  if (typeof value === 'string') {
    return Object.fromEntries(languages.map((language) => [language, value]));
  }

  const fallback =
    languages.map((language) => value[language]).find((candidate) => typeof candidate === 'string' && candidate.trim()) ||
    Object.values(value).find((candidate) => typeof candidate === 'string' && candidate.trim()) ||
    '';

  return Object.fromEntries(
    languages.map((language) => [language, String(value[language] || fallback || '')])
  );
}

function localizeStringList(
  value: string[] | LocalizedStringList,
  languages: string[]
): Record<string, string> {
  if (Array.isArray(value)) {
    const text = value.join('\n');
    return Object.fromEntries(languages.map((language) => [language, text]));
  }

  const fallback =
    languages.map((language) => value[language]).find((candidate) => Array.isArray(candidate) && candidate.length > 0) ||
    Object.values(value).find((candidate) => Array.isArray(candidate) && candidate.length > 0) ||
    [];

  return Object.fromEntries(
    languages.map((language) => {
      const entries = value[language] || fallback;
      return [language, (entries || []).join('\n')];
    })
  );
}

function createLocalizedMap(
  languages: string[],
  initial: Record<string, string> = {}
): Record<string, string> {
  return Object.fromEntries(languages.map((language) => [language, initial[language] || '']));
}

const createEmptyQuestion = (index: number, languages: string[]): EditorQuestion => ({
  id: `question_${index + 1}`,
  localizedQuestions: createLocalizedMap(languages),
  localizedContextSources: createLocalizedMap(languages),
  localizedSelfCheckPrompts: createLocalizedMap(languages),
  requiresComment: false,
});

const createInitialState = (): EditorState => {
  const languages = [...DEFAULT_QUESTION_LANGUAGES];
  return {
    quality: '',
    languages,
    localizedTitle: createLocalizedMap(languages),
    localizedSourceLecture: createLocalizedMap(languages),
    questions: [createEmptyQuestion(0, languages)],
  };
};

function getQuestionnaireLanguages(questionnaire: Questionnaire): string[] {
  const languagePool = new Set<string>();
  const metadataLanguages = questionnaire.metadata.languages || [];
  for (const language of metadataLanguages) {
    languagePool.add(normalizeLanguageCode(language));
  }

  if (typeof questionnaire.metadata.title !== 'string') {
    Object.keys(questionnaire.metadata.title).forEach((language) =>
      languagePool.add(normalizeLanguageCode(language))
    );
  }
  if (typeof questionnaire.metadata.source_lecture !== 'string') {
    Object.keys(questionnaire.metadata.source_lecture).forEach((language) =>
      languagePool.add(normalizeLanguageCode(language))
    );
  }

  for (const question of questionnaire.questions) {
    if (typeof question.question !== 'string') {
      Object.keys(question.question).forEach((language) =>
        languagePool.add(normalizeLanguageCode(language))
      );
    }
    if (!Array.isArray(question.context_sources)) {
      Object.keys(question.context_sources).forEach((language) =>
        languagePool.add(normalizeLanguageCode(language))
      );
    }
    if (!Array.isArray(question.self_check_prompts)) {
      Object.keys(question.self_check_prompts).forEach((language) =>
        languagePool.add(normalizeLanguageCode(language))
      );
    }
  }

  return uniqueLanguages(Array.from(languagePool));
}

function questionnaireToEditorState(questionnaire: Questionnaire): EditorState {
  const languages = getQuestionnaireLanguages(questionnaire);

  return {
    quality: questionnaire.metadata.quality,
    languages,
    localizedTitle: localizeText(questionnaire.metadata.title, languages),
    localizedSourceLecture: localizeText(questionnaire.metadata.source_lecture, languages),
    questions: questionnaire.questions.map((question, index) => ({
      id: question.id || `question_${index + 1}`,
      localizedQuestions: localizeText(question.question, languages),
      localizedContextSources: localizeStringList(question.context_sources, languages),
      localizedSelfCheckPrompts: localizeStringList(question.self_check_prompts, languages),
      requiresComment: Boolean(question.requires_comment),
    })),
  };
}

function buildLocalizedTextPayload(
  languages: string[],
  localized: Record<string, string>
): LocalizedText {
  return Object.fromEntries(
    languages.map((language) => [language, String(localized[language] || '').trim()])
  );
}

function buildLocalizedStringListPayload(
  languages: string[],
  localized: Record<string, string>
): LocalizedStringList {
  return Object.fromEntries(
    languages.map((language) => [
      language,
      String(localized[language] || '')
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ])
  );
}

function editorStateToQuestionnaire(state: EditorState): Questionnaire {
  const languages = uniqueLanguages(state.languages);

  return normalizeQuestionnaire({
    metadata: {
      title: buildLocalizedTextPayload(languages, state.localizedTitle),
      source_lecture: buildLocalizedTextPayload(languages, state.localizedSourceLecture),
      quality: state.quality.trim(),
      languages,
    },
    questions: state.questions.map((question) => ({
      id: question.id.trim(),
      question: buildLocalizedTextPayload(languages, question.localizedQuestions),
      context_sources: buildLocalizedStringListPayload(languages, question.localizedContextSources),
      self_check_prompts: buildLocalizedStringListPayload(
        languages,
        question.localizedSelfCheckPrompts
      ),
      requires_comment: question.requiresComment,
      user_score: null,
    })),
  });
}

function getLocalizedTitle(questionnaire: Questionnaire): string {
  const title = questionnaire.metadata.title;
  if (typeof title === 'string') {
    return title;
  }

  const language = document.documentElement.lang || 'ru';
  return title[language] || title.en || title.ru || questionnaire.metadata.quality;
}

function formatExistingQuestionnaireLabel(questionnaire: Questionnaire): string {
  const baseTitle = getLocalizedTitle(questionnaire);
  if (!isLocalQuestionnaire(questionnaire)) {
    return baseTitle;
  }

  const language =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru' : 'ru';
  const suffix = language === 'en' ? ' (local)' : ' (локальный)';
  return `${baseTitle}${suffix}`;
}

export function QuestionnaireEditor() {
  const { questionnaires, loading, saveCustomQuestionnaire, deleteCustomQuestionnaire } =
    useQuestionnaires();
  const [state, setState] = useState<EditorState>(createInitialState());
  const [selectedQuality, setSelectedQuality] = useState('');
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const availableQuestionnaires = useMemo(
    () =>
      questionnaires
        .slice()
        .sort((a, b) => getLocalizedTitle(a).localeCompare(getLocalizedTitle(b), 'ru')),
    [questionnaires]
  );

  const setMetaTranslation = (
    field: 'localizedTitle' | 'localizedSourceLecture',
    language: string,
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [language]: value,
      },
    }));
  };

  const setQuestionField = (index: number, field: keyof EditorQuestion, value: string) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((question, qIndex) =>
        qIndex === index ? { ...question, [field]: value } : question
      ),
    }));
  };

  const setQuestionTranslation = (
    index: number,
    language: string,
    field: 'localizedQuestions' | 'localizedContextSources' | 'localizedSelfCheckPrompts',
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((question, qIndex) => {
        if (qIndex !== index) return question;
        return {
          ...question,
          [field]: {
            ...question[field],
            [language]: value,
          },
        };
      }),
    }));
  };

  const setQuestionRequiresComment = (index: number, requiresComment: boolean) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((question, qIndex) =>
        qIndex === index ? { ...question, requiresComment } : question
      ),
    }));
  };

  const addQuestion = () => {
    setState((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion(prev.questions.length, prev.languages)],
    }));
  };

  const removeQuestion = (index: number) => {
    setState((prev) => ({
      ...prev,
      questions:
        prev.questions.length <= 1
          ? [createEmptyQuestion(0, prev.languages)]
          : prev.questions.filter((_, qIndex) => qIndex !== index),
    }));
  };

  const addLanguage = () => {
    const languageCode = normalizeLanguageCode(newLanguageCode);

    if (!languageCode) {
      setErrorMessage(t('editor.error.language.empty'));
      return;
    }

    if (!isValidLanguageCode(languageCode)) {
      setErrorMessage(t('editor.error.language.invalid'));
      return;
    }

    if (state.languages.includes(languageCode)) {
      setErrorMessage(t('editor.error.language.duplicate', { language: languageCode }));
      return;
    }

    setState((prev) => ({
      ...prev,
      languages: [...prev.languages, languageCode],
      localizedTitle: { ...prev.localizedTitle, [languageCode]: '' },
      localizedSourceLecture: { ...prev.localizedSourceLecture, [languageCode]: '' },
      questions: prev.questions.map((question) => ({
        ...question,
        localizedQuestions: { ...question.localizedQuestions, [languageCode]: '' },
        localizedContextSources: { ...question.localizedContextSources, [languageCode]: '' },
        localizedSelfCheckPrompts: { ...question.localizedSelfCheckPrompts, [languageCode]: '' },
      })),
    }));
    setNewLanguageCode('');
    setErrorMessage('');
    setStatusMessage(t('editor.status.language.added', { language: languageCode }));
  };

  const removeLanguage = (languageCode: string) => {
    if (state.languages.length <= 1) {
      setErrorMessage(t('editor.error.language.last'));
      return;
    }

    setState((prev) => {
      const nextTitle = { ...prev.localizedTitle };
      const nextSource = { ...prev.localizedSourceLecture };
      delete nextTitle[languageCode];
      delete nextSource[languageCode];

      return {
        ...prev,
        languages: prev.languages.filter((language) => language !== languageCode),
        localizedTitle: nextTitle,
        localizedSourceLecture: nextSource,
        questions: prev.questions.map((question) => {
          const nextLocalizedQuestions = { ...question.localizedQuestions };
          const nextContext = { ...question.localizedContextSources };
          const nextPrompts = { ...question.localizedSelfCheckPrompts };
          delete nextLocalizedQuestions[languageCode];
          delete nextContext[languageCode];
          delete nextPrompts[languageCode];

          return {
            ...question,
            localizedQuestions: nextLocalizedQuestions,
            localizedContextSources: nextContext,
            localizedSelfCheckPrompts: nextPrompts,
          };
        }),
      };
    });

    setErrorMessage('');
    setStatusMessage(t('editor.status.language.removed', { language: languageCode }));
  };

  const loadQuestionnaire = (quality: string) => {
    setSelectedQuality(quality);
    setStatusMessage('');
    setErrorMessage('');

    const questionnaire = questionnaires.find(
      (item) => getQuestionnaireRuntimeId(item) === quality
    );
    if (!questionnaire) return;

    setState(questionnaireToEditorState(questionnaire));
  };

  const validateCurrentState = () => {
    const questionnaire = editorStateToQuestionnaire(state);
    return validateQuestionnaire(questionnaire);
  };

  const handleSaveToApp = async () => {
    const validation = validateCurrentState();
    if (!validation.valid) {
      setErrorMessage(validation.errors.join('\n'));
      setStatusMessage('');
      return;
    }

    const questionnaire = editorStateToQuestionnaire(state);
    await saveCustomQuestionnaire(questionnaire);

    setStatusMessage(
      t('editor.status.saved', {
        title: getLocalizedTitle(questionnaire),
      })
    );
    setErrorMessage('');
  };

  const handleExport = () => {
    const validation = validateCurrentState();
    if (!validation.valid) {
      setErrorMessage(validation.errors.join('\n'));
      setStatusMessage('');
      return;
    }

    const questionnaire = editorStateToQuestionnaire(state);
    downloadQuestionnaire(questionnaire);
    setStatusMessage(t('editor.status.exported'));
    setErrorMessage('');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage('');
    setErrorMessage('');

    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const parsed = parseQuestionnaireFile(content);
    if (!parsed.valid || !parsed.questionnaire) {
      setErrorMessage(parsed.errors.join('\n'));
      return;
    }

    setState(questionnaireToEditorState(parsed.questionnaire));
    setSelectedQuality('');
    setStatusMessage(t('editor.status.imported', { fileName: file.name }));
  };

  const handleDeleteCustom = async () => {
    if (!state.quality.trim()) {
      setErrorMessage(t('editor.error.deleteCustom.qualityMissing'));
      return;
    }

    const quality = state.quality.trim();
    await deleteCustomQuestionnaire(quality);
    setStatusMessage(t('editor.status.deleteCustom.success', { quality }));
    setErrorMessage('');
  };

  const handleReset = () => {
    setState(createInitialState());
    setSelectedQuality('');
    setNewLanguageCode('');
    setStatusMessage('');
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('editor.title')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('editor.subtitle')}</p>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField className="md:col-span-2" label={t('editor.loadExisting')}>
            <FormSelect
              value={selectedQuality}
              onChange={(event) => loadQuestionnaire(event.target.value)}
              disabled={loading}
            >
              <option value="">{t('editor.loadExisting.placeholder')}</option>
              {availableQuestionnaires.map((questionnaire) => (
                <option
                  key={getQuestionnaireRuntimeId(questionnaire)}
                  value={getQuestionnaireRuntimeId(questionnaire)}
                >
                  {formatExistingQuestionnaireLabel(questionnaire)}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label={t('editor.import')}>
            <FormFileInput accept="application/json,.json" onChange={handleImport} />
          </FormField>
        </div>

        <FormField label={t('editor.meta.quality')}>
          <FormInput
            type="text"
            value={state.quality}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                quality: event.target.value,
              }))
            }
            placeholder="titiksha"
          />
        </FormField>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('editor.languages.title')}
            </p>
            {state.languages.map((language) => (
              <span
                key={language}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {language}
                <button
                  type="button"
                  onClick={() => removeLanguage(language)}
                  className="text-red-600 dark:text-red-400"
                  aria-label={t('editor.languages.remove.aria', { language })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <FormInput
              type="text"
              value={newLanguageCode}
              onChange={(event) => setNewLanguageCode(event.target.value)}
              className="flex-1"
              placeholder={t('editor.languages.new.placeholder')}
            />
            <button
              type="button"
              onClick={addLanguage}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {t('editor.languages.add')}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">{t('editor.languages.hint')}</p>
        </div>

        <div className="space-y-4">
          {state.languages.map((language) => (
            <div
              key={`meta-${language}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {language.toUpperCase()}
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <FormField label={`${t('editor.meta.title')} (${language.toUpperCase()})`}>
                  <FormInput
                    type="text"
                    value={state.localizedTitle[language] || ''}
                    onChange={(event) =>
                      setMetaTranslation('localizedTitle', language, event.target.value)
                    }
                    placeholder={t('editor.meta.title.placeholder')}
                  />
                </FormField>
                <FormField label={`${t('editor.meta.source')} (${language.toUpperCase()})`}>
                  <FormInput
                    type="text"
                    value={state.localizedSourceLecture[language] || ''}
                    onChange={(event) =>
                      setMetaTranslation('localizedSourceLecture', language, event.target.value)
                    }
                    placeholder={t('editor.meta.source.placeholder')}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {state.questions.map((question, index) => (
          <article
            key={`${question.id}_${index}`}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('editor.question.title', { index: index + 1 })}
              </h2>
              <button
                type="button"
                onClick={() => removeQuestion(index)}
                className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs"
              >
                {t('editor.question.delete')}
              </button>
            </div>

            <FormField label={t('editor.question.id')}>
              <FormInput
                type="text"
                value={question.id}
                onChange={(event) => setQuestionField(index, 'id', event.target.value)}
              />
            </FormField>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={question.requiresComment}
                onChange={(event) => setQuestionRequiresComment(index, event.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              {t('editor.question.requiresComment')}
            </label>

            {state.languages.map((language) => (
              <div
                key={`${question.id}_${language}`}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3"
              >
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {language.toUpperCase()}
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  <FormField label={t('editor.question.localized', { language: language.toUpperCase() })}>
                    <FormTextarea
                      value={question.localizedQuestions[language] || ''}
                      onChange={(event) =>
                        setQuestionTranslation(
                          index,
                          language,
                          'localizedQuestions',
                          event.target.value
                        )
                      }
                      rows={3}
                    />
                  </FormField>
                  <FormField label={t('editor.question.contextSources')}>
                    <FormTextarea
                      value={question.localizedContextSources[language] || ''}
                      onChange={(event) =>
                        setQuestionTranslation(
                          index,
                          language,
                          'localizedContextSources',
                          event.target.value
                        )
                      }
                      rows={3}
                    />
                  </FormField>
                  <FormField label={t('editor.question.selfCheckPrompts')}>
                    <FormTextarea
                      value={question.localizedSelfCheckPrompts[language] || ''}
                      onChange={(event) =>
                        setQuestionTranslation(
                          index,
                          language,
                          'localizedSelfCheckPrompts',
                          event.target.value
                        )
                      }
                      rows={3}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </article>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addQuestion}
          className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          {t('editor.actions.addQuestion')}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSaveToApp();
          }}
          className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
        >
          {t('editor.actions.save')}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
        >
          {t('editor.actions.export')}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleDeleteCustom();
          }}
          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
        >
          {t('editor.actions.deleteCustom')}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
        >
          {t('editor.actions.reset')}
        </button>
      </section>

      {statusMessage && (
        <section className="p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 whitespace-pre-wrap">
          {statusMessage}
        </section>
      )}

      {errorMessage && (
        <section className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 whitespace-pre-wrap">
          {errorMessage}
        </section>
      )}
    </div>
  );
}
