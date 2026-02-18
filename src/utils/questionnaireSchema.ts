import type {
  LocalizedText,
  LocalizedStringList,
  Questionnaire,
  Question,
} from '../types/questionnaire';
import {
  normalizeQuestionnaireProcessingRules,
  validateQuestionnaireProcessingRules,
} from './questionnaireRules';
import {
  clampScoreToScale,
  normalizeGradingSystemInput,
  validateGradingSystemInput,
} from './gradingSystem';

export interface QuestionnaireValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_LANGUAGES = ['ru', 'en'];

function isLocalizedText(value: unknown): value is LocalizedText {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isLocalizedStringList(value: unknown): value is LocalizedStringList {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => Array.isArray(entry));
}

function normalizeLanguageCode(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function uniqueLanguages(values: unknown[]): string[] {
  const normalized = values.map(normalizeLanguageCode).filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : [...DEFAULT_LANGUAGES];
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeSystemFolders(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return undefined;
  }

  return normalized;
}

function pickFallbackText(source: Record<string, unknown>, languages: string[]): string {
  for (const language of languages) {
    const candidate = source[language];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const candidate of Object.values(source)) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

function normalizeLocalizedTextValue(value: unknown, languages: string[]): LocalizedText {
  if (isLocalizedText(value)) {
    const fallback = pickFallbackText(value as Record<string, unknown>, languages);
    return Object.fromEntries(
      languages.map((language) => {
        const raw = (value as Record<string, unknown>)[language];
        const localized = typeof raw === 'string' ? raw.trim() : '';
        return [language, localized || fallback];
      })
    );
  }

  const fallback = typeof value === 'string' ? value.trim() : '';
  return Object.fromEntries(languages.map((language) => [language, fallback]));
}

function normalizeLocalizedStringListValue(
  value: unknown,
  languages: string[]
): LocalizedStringList {
  if (isLocalizedStringList(value)) {
    const source = value as Record<string, unknown>;
    const fallback =
      languages.map((language) => normalizeStringList(source[language])).find((entry) => entry.length > 0) ||
      Object.values(source).map((entry) => normalizeStringList(entry)).find((entry) => entry.length > 0) ||
      [];

    return Object.fromEntries(
      languages.map((language) => {
        const localized = normalizeStringList(source[language]);
        return [language, localized.length > 0 ? localized : [...fallback]];
      })
    );
  }

  const fallback = normalizeStringList(value);
  return Object.fromEntries(languages.map((language) => [language, [...fallback]]));
}

function collectLanguagesFromQuestions(rawQuestions: unknown[]): string[] {
  const pool: string[] = [];

  for (const question of rawQuestions) {
    if (!question || typeof question !== 'object') continue;

    const asRecord = question as Record<string, unknown>;
    if (isLocalizedText(asRecord.question)) {
      pool.push(...Object.keys(asRecord.question));
    }
    if (isLocalizedStringList(asRecord.context_sources)) {
      pool.push(...Object.keys(asRecord.context_sources));
    }
    if (isLocalizedStringList(asRecord.self_check_prompts)) {
      pool.push(...Object.keys(asRecord.self_check_prompts));
    }
  }

  return pool;
}

function normalizeQuestion(
  question: any,
  index: number,
  languages: string[],
  questionnaire: Pick<Questionnaire, 'grading_system'>
): Question {
  const normalizedScore =
    typeof question?.user_score === 'number' && Number.isFinite(question.user_score)
      ? clampScoreToScale(Math.round(question.user_score), questionnaire.grading_system)
      : null;

  return {
    id: String(question?.id || `question_${index + 1}`),
    question: normalizeLocalizedTextValue(question?.question, languages),
    context_sources: normalizeLocalizedStringListValue(question?.context_sources, languages),
    self_check_prompts: normalizeLocalizedStringListValue(question?.self_check_prompts, languages),
    requires_comment: Boolean(question?.requires_comment),
    user_score: normalizedScore,
  };
}

export function normalizeQuestionnaire(input: any): Questionnaire {
  const rawQuestions = Array.isArray(input?.questions) ? input.questions : [];
  const gradingSystem = normalizeGradingSystemInput(input?.grading_system);
  const metadata = input?.metadata || {};
  const metadataTitle = metadata?.title;
  const metadataSource = metadata?.source_lecture;
  const languages = uniqueLanguages([
    ...(Array.isArray(metadata?.languages) ? metadata.languages : []),
    ...(isLocalizedText(metadataTitle) ? Object.keys(metadataTitle) : []),
    ...(isLocalizedText(metadataSource) ? Object.keys(metadataSource) : []),
    ...collectLanguagesFromQuestions(rawQuestions),
  ]);

  const questions = Array.isArray(input?.questions)
    ? input.questions.map((question: any, index: number) =>
        normalizeQuestion(
          question,
          index,
          languages,
          {
            grading_system: gradingSystem,
          }
        )
      )
    : [];
  const processingRules = normalizeQuestionnaireProcessingRules(input?.processing_rules);

  return {
    $schema: input?.$schema || 'http://json-schema.org/draft-07/schema#',
    title: input?.title || 'Spiritual Assessment Structure',
    type: 'object',
    required: ['metadata', 'grading_system', 'questions'],
    metadata: {
      title: normalizeLocalizedTextValue(metadataTitle, languages),
      source_lecture: normalizeLocalizedTextValue(metadataSource, languages),
      quality: String(input?.metadata?.quality || ''),
      languages,
      system_folders: normalizeSystemFolders(metadata?.system_folders),
    },
    grading_system: gradingSystem,
    questions,
    ...(processingRules ? { processing_rules: processingRules } : {}),
  };
}

export function validateQuestionnaire(input: unknown): QuestionnaireValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['JSON должен быть объектом'] };
  }

  const questionnaire = input as any;
  const metadata = questionnaire.metadata || {};
  const gradingSystem = questionnaire.grading_system;
  const strictLanguages = Array.isArray(metadata?.languages)
    ? uniqueLanguages(metadata.languages)
    : [];

  if (gradingSystem !== undefined) {
    const gradingErrors = validateGradingSystemInput(gradingSystem);
    if (gradingErrors.length > 0) {
      errors.push(...gradingErrors);
    }
  }

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Отсутствует metadata');
  } else {
    const titleIsString = typeof metadata.title === 'string';
    const titleIsLocalized = isLocalizedText(metadata.title);
    if (!titleIsString && !titleIsLocalized) {
      errors.push('metadata.title должен быть строкой или объектом локализации');
    }

    const sourceIsString = typeof metadata.source_lecture === 'string';
    const sourceIsLocalized = isLocalizedText(metadata.source_lecture);
    if (!sourceIsString && !sourceIsLocalized) {
      errors.push('metadata.source_lecture должен быть строкой или объектом локализации');
    }
    if (!metadata.quality || typeof metadata.quality !== 'string') {
      errors.push('metadata.quality должен быть строкой');
    }
    if (Array.isArray(metadata.languages) && metadata.languages.length === 0) {
      errors.push('metadata.languages не должен быть пустым');
    }
    if (metadata.system_folders !== undefined) {
      if (!Array.isArray(metadata.system_folders)) {
        errors.push('metadata.system_folders должен быть массивом строк');
      } else {
        const hasInvalid = metadata.system_folders.some(
          (entry: unknown) => typeof entry !== 'string' || !entry.trim()
        );
        if (hasInvalid) {
          errors.push('metadata.system_folders должен содержать непустые строки');
        }
      }
    }
  }

  if (!Array.isArray(questionnaire.questions) || questionnaire.questions.length === 0) {
    errors.push('questions должен быть непустым массивом');
  } else {
    questionnaire.questions.forEach((question: any, index: number) => {
      if (!question || typeof question !== 'object') {
        errors.push(`questions[${index}] должен быть объектом`);
        return;
      }

      if (!question.id || typeof question.id !== 'string') {
        errors.push(`questions[${index}].id должен быть строкой`);
      }

      const isQuestionString = typeof question.question === 'string';
      const isQuestionLocalizedText = isLocalizedText(question.question);
      if (!isQuestionString && !isQuestionLocalizedText) {
        errors.push(`questions[${index}].question должен быть строкой или объектом локализации`);
      }

      const isContextList = Array.isArray(question.context_sources);
      const isContextLocalized = isLocalizedStringList(question.context_sources);
      if (!isContextList && !isContextLocalized) {
        errors.push(
          `questions[${index}].context_sources должен быть массивом строк или объектом {lang: string[]}`
        );
      }

      const isPromptsList = Array.isArray(question.self_check_prompts);
      const isPromptsLocalized = isLocalizedStringList(question.self_check_prompts);
      if (!isPromptsList && !isPromptsLocalized) {
        errors.push(
          `questions[${index}].self_check_prompts должен быть массивом строк или объектом {lang: string[]}`
        );
      }

      if (
        question.requires_comment !== undefined &&
        typeof question.requires_comment !== 'boolean'
      ) {
        errors.push(`questions[${index}].requires_comment должен быть boolean`);
      }

      if (strictLanguages.length > 0) {
        if (!isQuestionLocalizedText) {
          errors.push(
            `questions[${index}].question должен быть объектом локализации для языков: ${strictLanguages.join(', ')}`
          );
        } else {
          for (const language of strictLanguages) {
            const localizedValue = question.question[language];
            if (typeof localizedValue !== 'string' || !localizedValue.trim()) {
              errors.push(`questions[${index}].question.${language} должен быть непустой строкой`);
            }
          }
        }

        if (!isContextLocalized) {
          errors.push(
            `questions[${index}].context_sources должен быть локализованным объектом для языков: ${strictLanguages.join(', ')}`
          );
        } else {
          for (const language of strictLanguages) {
            if (!Array.isArray(question.context_sources[language])) {
              errors.push(`questions[${index}].context_sources.${language} должен быть массивом строк`);
            }
          }
        }

        if (!isPromptsLocalized) {
          errors.push(
            `questions[${index}].self_check_prompts должен быть локализованным объектом для языков: ${strictLanguages.join(', ')}`
          );
        } else {
          for (const language of strictLanguages) {
            if (!Array.isArray(question.self_check_prompts[language])) {
              errors.push(`questions[${index}].self_check_prompts.${language} должен быть массивом строк`);
            }
          }
        }
      }
    });
  }

  if (questionnaire.processing_rules !== undefined) {
    const rulesValidation = validateQuestionnaireProcessingRules(questionnaire.processing_rules);
    if (!rulesValidation.valid) {
      errors.push(...rulesValidation.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createQuestionnaireTemplate(): Questionnaire {
  return normalizeQuestionnaire({
    metadata: {
      title: {
        ru: 'Новый опросник',
        en: 'New questionnaire',
      },
      source_lecture: {
        ru: 'Источник/лекция',
        en: 'Source / lecture',
      },
      quality: 'new-quality',
      languages: ['ru', 'en'],
    },
    questions: [
      {
        id: 'question_1',
        question: {
          ru: 'Формулировка вопроса на русском',
          en: 'Question wording in English',
        },
        context_sources: {
          ru: ['Источник 1'],
          en: ['Source 1'],
        },
        self_check_prompts: {
          ru: ['Подсказка для самопроверки'],
          en: ['Self-check prompt'],
        },
        requires_comment: false,
      },
    ],
  });
}

export function parseQuestionnaireFile(content: string): QuestionnaireValidationResult & {
  questionnaire?: Questionnaire;
} {
  try {
    const parsed = JSON.parse(content);
    const validation = validateQuestionnaire(parsed);

    if (!validation.valid) {
      return validation;
    }

    return {
      valid: true,
      errors: [],
      questionnaire: normalizeQuestionnaire(parsed),
    };
  } catch {
    return {
      valid: false,
      errors: ['Некорректный JSON файл'],
    };
  }
}

export function downloadQuestionnaire(questionnaire: Questionnaire, filename?: string): void {
  const payload = normalizeQuestionnaire(questionnaire);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${payload.metadata.quality || 'questionnaire'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
