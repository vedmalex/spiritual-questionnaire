import type { LanguageCode } from '../types/i18n';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { getGradeDescription } from './i18n';

interface ReportLabels {
  generatedAt: string;
  questionnaire: string;
  completedAt: string;
  student: string;
  score: string;
  grade: string;
  question: string;
  comment: string;
  photos: string;
  photo: string;
  absentQuestions: string;
  missingQuestionPrefix: string;
  curatorFeedback: string;
  curatorFeedbackBy: string;
}

const LABELS: Record<LanguageCode, ReportLabels> = {
  ru: {
    generatedAt: 'Сформировано',
    questionnaire: 'Опросник',
    completedAt: 'Дата прохождения',
    student: 'Студент',
    score: 'Балл',
    grade: 'Оценка словами',
    question: 'Вопрос',
    comment: 'Письменный комментарий',
    photos: 'Фотографии',
    photo: 'Фото',
    absentQuestions: 'Отсутствуют в текущей схеме',
    missingQuestionPrefix: 'Вопрос отсутствует в текущем опроснике',
    curatorFeedback: 'Обратная связь куратора',
    curatorFeedbackBy: 'Куратор',
  },
  en: {
    generatedAt: 'Generated at',
    questionnaire: 'Questionnaire',
    completedAt: 'Completed at',
    student: 'Student',
    score: 'Score',
    grade: 'Grade description',
    question: 'Question',
    comment: 'Written comment',
    photos: 'Photos',
    photo: 'Photo',
    absentQuestions: 'Absent in current schema',
    missingQuestionPrefix: 'Question missing in current questionnaire',
    curatorFeedback: 'Curator feedback',
    curatorFeedbackBy: 'Curator',
  },
};

interface ReportQuestionBlock {
  questionText: string;
  score: number;
  comment: string | null;
  photos: string[];
  feedback: Array<{
    curatorName: string;
    comment: string;
  }>;
}

export interface ResultReportBundle {
  formattedText: string;
  plainText: string;
  html: string;
  filenameBase: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeImageUrl(url: string): string {
  const normalized = String(url || '').trim();
  if (!normalized) return '';

  if (
    normalized.startsWith('data:image/') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('https://')
  ) {
    return normalized;
  }

  return '';
}

function formatDate(timestamp: number, language: LanguageCode): string {
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  return new Date(timestamp).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function slugify(value: string): string {
  const next = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return next || 'questionnaire-report';
}

function getLocalizedQuestionText(
  question: Questionnaire['questions'][number],
  language: LanguageCode
): string {
  if (typeof question.question === 'string') {
    return question.question;
  }

  return question.question[language] || question.question.en || question.question.ru || question.id;
}

function getOrderedQuestionIds(result: QuizResult, questionnaire: Questionnaire | null): string[] {
  const answerIds = Object.keys(result.answers);
  if (!questionnaire) {
    return answerIds;
  }

  const schemaOrder = questionnaire.questions.map((question) => question.id);
  const orderedFromSchema = schemaOrder.filter((questionId) => answerIds.includes(questionId));
  const outOfSchema = answerIds.filter((questionId) => !schemaOrder.includes(questionId));
  return [...orderedFromSchema, ...outOfSchema];
}

function getQuestionLookup(
  questionnaire: Questionnaire | null,
  language: LanguageCode
): Record<string, string> {
  if (!questionnaire) return {};

  return Object.fromEntries(
    questionnaire.questions.map((question) => [question.id, getLocalizedQuestionText(question, language)])
  );
}

function toQuestionBlocks(
  result: QuizResult,
  questionnaire: Questionnaire | null,
  language: LanguageCode,
  labels: ReportLabels
): ReportQuestionBlock[] {
  const questionLookup = getQuestionLookup(questionnaire, language);
  const orderedQuestionIds = getOrderedQuestionIds(result, questionnaire);

  return orderedQuestionIds.flatMap((questionId) => {
    const answer = result.answers[questionId];
    if (!answer) {
      return [];
    }

    const comment = typeof answer.comment === 'string' && answer.comment.trim()
      ? answer.comment.trim()
      : null;

    const photos = (answer.photos || []).map(sanitizeImageUrl).filter(Boolean);

    const feedback = (answer.curatorFeedback || [])
      .map((entry) => {
        const feedbackComment = String(entry.comment || '').trim();
        if (!feedbackComment) {
          return null;
        }

        return {
          curatorName: String(entry.curatorName || labels.curatorFeedbackBy),
          comment: feedbackComment,
        };
      })
      .filter((entry): entry is { curatorName: string; comment: string } => Boolean(entry));

    const questionText = questionLookup[questionId] || labels.missingQuestionPrefix;

    return [
      {
        questionText,
        score: answer.score,
        comment,
        photos,
        feedback,
      },
    ];
  });
}

function buildFormattedText(options: {
  result: QuizResult;
  labels: ReportLabels;
  language: LanguageCode;
  generatedAt: number;
  questionBlocks: ReportQuestionBlock[];
}): string {
  const { result, labels, language, generatedAt, questionBlocks } = options;
  const grade = getGradeDescription(Math.round((result.percentage / 100) * 10));

  const lines: string[] = [
    `# ${result.questionnaireTitle}`,
    '',
    `- ${labels.generatedAt}: ${formatDate(generatedAt, language)}`,
    `- ${labels.questionnaire}: ${result.questionnaireTitle}`,
    `- ${labels.completedAt}: ${formatDate(result.completedAt, language)}`,
    `- ${labels.student}: ${result.userName}`,
    `- ${labels.score}: ${result.totalScore}/${result.maxPossibleScore} (${result.percentage}%)`,
    `- ${labels.grade}: ${grade}`,
  ];

  if (result.absentInCurrentSchemaQuestionIds && result.absentInCurrentSchemaQuestionIds.length > 0) {
    lines.push(`- ${labels.absentQuestions}: ${result.absentInCurrentSchemaQuestionIds.join(', ')}`);
  }

  questionBlocks.forEach((block, index) => {
    lines.push('');
    lines.push(`## ${labels.question} ${index + 1}`);
    lines.push(block.questionText);
    lines.push(`${labels.score}: ${block.score}/10 - ${getGradeDescription(block.score)}`);

    if (block.comment) {
      lines.push(`${labels.comment}:`);
      lines.push(block.comment);
    }

    if (block.photos.length > 0) {
      lines.push(`${labels.photos}:`);
      block.photos.forEach((photo, photoIndex) => {
        lines.push(`- ${labels.photo} ${photoIndex + 1}: ${photo}`);
      });
    }

    if (block.feedback.length > 0) {
      lines.push(`${labels.curatorFeedback}:`);
      block.feedback.forEach((entry, feedbackIndex) => {
        lines.push(
          `- ${feedbackIndex + 1}. ${labels.curatorFeedbackBy}: ${entry.curatorName}. ${entry.comment}`
        );
      });
    }
  });

  return lines.join('\n');
}

function buildPlainText(options: {
  result: QuizResult;
  labels: ReportLabels;
  language: LanguageCode;
  generatedAt: number;
  questionBlocks: ReportQuestionBlock[];
}): string {
  const { result, labels, language, generatedAt, questionBlocks } = options;
  const grade = getGradeDescription(Math.round((result.percentage / 100) * 10));

  const lines: string[] = [
    `${labels.questionnaire}: ${result.questionnaireTitle}`,
    `${labels.generatedAt}: ${formatDate(generatedAt, language)}`,
    `${labels.completedAt}: ${formatDate(result.completedAt, language)}`,
    `${labels.student}: ${result.userName}`,
    `${labels.score}: ${result.totalScore}/${result.maxPossibleScore} (${result.percentage}%)`,
    `${labels.grade}: ${grade}`,
  ];

  if (result.absentInCurrentSchemaQuestionIds && result.absentInCurrentSchemaQuestionIds.length > 0) {
    lines.push(`${labels.absentQuestions}: ${result.absentInCurrentSchemaQuestionIds.join(', ')}`);
  }

  questionBlocks.forEach((block, index) => {
    lines.push('');
    lines.push(`${labels.question} ${index + 1}: ${block.questionText}`);
    lines.push(`${labels.score}: ${block.score}/10 - ${getGradeDescription(block.score)}`);

    if (block.comment) {
      lines.push(`${labels.comment}: ${block.comment}`);
    }

    if (block.photos.length > 0) {
      lines.push(`${labels.photos}:`);
      block.photos.forEach((photo, photoIndex) => {
        lines.push(`${labels.photo} ${photoIndex + 1}: ${photo}`);
      });
    }

    if (block.feedback.length > 0) {
      lines.push(`${labels.curatorFeedback}:`);
      block.feedback.forEach((entry, feedbackIndex) => {
        lines.push(`${feedbackIndex + 1}. ${labels.curatorFeedbackBy}: ${entry.curatorName}. ${entry.comment}`);
      });
    }
  });

  return lines.join('\n');
}

function buildHtml(options: {
  result: QuizResult;
  labels: ReportLabels;
  language: LanguageCode;
  generatedAt: number;
  questionBlocks: ReportQuestionBlock[];
}): string {
  const { result, labels, language, generatedAt, questionBlocks } = options;

  const grade = getGradeDescription(Math.round((result.percentage / 100) * 10));

  const absentQuestionsHtml =
    result.absentInCurrentSchemaQuestionIds && result.absentInCurrentSchemaQuestionIds.length > 0
      ? `<p class="warning"><strong>${escapeHtml(labels.absentQuestions)}:</strong> ${escapeHtml(
          result.absentInCurrentSchemaQuestionIds.join(', ')
        )}</p>`
      : '';

  const questionsHtml = questionBlocks
    .map((block, index) => {
      const commentHtml = block.comment
        ? `
            <div>
              <h5>${escapeHtml(labels.comment)}</h5>
              <p>${escapeHtml(block.comment).replace(/\n/g, '<br />')}</p>
            </div>
          `
        : '';

      const photosHtml =
        block.photos.length > 0
          ? `
              <div>
                <h5>${escapeHtml(labels.photos)}</h5>
                <div class="photos-grid">
                  ${block.photos
                    .map(
                      (photo, photoIndex) =>
                        `<figure><img src="${escapeHtml(photo)}" alt="${escapeHtml(
                          `${labels.photo} ${photoIndex + 1}`
                        )}" /></figure>`
                    )
                    .join('')}
                </div>
              </div>
            `
          : '';

      const feedbackHtml =
        block.feedback.length > 0
          ? `
              <div class="feedback-block">
                <h5>${escapeHtml(labels.curatorFeedback)}</h5>
                <ul>
                  ${block.feedback
                    .map(
                      (entry) => `
                        <li>
                          <strong>${escapeHtml(labels.curatorFeedbackBy)}:</strong> ${escapeHtml(
                            entry.curatorName
                          )}<br />
                          ${escapeHtml(entry.comment).replace(/\n/g, '<br />')}
                        </li>
                      `
                    )
                    .join('')}
                </ul>
              </div>
            `
          : '';

      return `
        <article class="question-block">
          <h4>${escapeHtml(labels.question)} ${index + 1}</h4>
          <p>${escapeHtml(block.questionText)}</p>
          <p><strong>${escapeHtml(labels.score)}:</strong> ${block.score}/10 - ${escapeHtml(
        getGradeDescription(block.score)
      )}</p>
          ${commentHtml}
          ${photosHtml}
          ${feedbackHtml}
        </article>
      `;
    })
    .join('');

  return `
<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(result.questionnaireTitle)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f3f4f6;
        color: #111827;
      }
      .report-shell {
        max-width: 980px;
        margin: 0 auto;
        padding: 20px;
      }
      .report-header,
      .question-block {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }
      .report-header h1 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 28px;
      }
      .report-header ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 6px;
      }
      .question-block h4 {
        margin: 0 0 8px;
      }
      .question-block h5 {
        margin: 8px 0 6px;
      }
      .warning {
        color: #9a3412;
        background: #fff7ed;
        border: 1px solid #fdba74;
        border-radius: 8px;
        padding: 8px 10px;
      }
      .photos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
      }
      .photos-grid figure {
        margin: 0;
      }
      .photos-grid img {
        width: 100%;
        max-height: 220px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      .feedback-block ul {
        margin: 0;
        padding-left: 18px;
      }
      @media print {
        body {
          background: #ffffff;
        }
        .report-shell {
          max-width: none;
          padding: 0;
        }
        .report-header,
        .question-block {
          break-inside: avoid;
          border-color: #d1d5db;
        }
      }
    </style>
  </head>
  <body>
    <main class="report-shell">
      <header class="report-header">
        <h1>${escapeHtml(result.questionnaireTitle)}</h1>
        <ul>
          <li><strong>${escapeHtml(labels.generatedAt)}:</strong> ${escapeHtml(
    formatDate(generatedAt, language)
  )}</li>
          <li><strong>${escapeHtml(labels.questionnaire)}:</strong> ${escapeHtml(
    result.questionnaireTitle
  )}</li>
          <li><strong>${escapeHtml(labels.completedAt)}:</strong> ${escapeHtml(
    formatDate(result.completedAt, language)
  )}</li>
          <li><strong>${escapeHtml(labels.student)}:</strong> ${escapeHtml(result.userName)}</li>
          <li><strong>${escapeHtml(labels.score)}:</strong> ${result.totalScore}/${
    result.maxPossibleScore
  } (${result.percentage}%)</li>
          <li><strong>${escapeHtml(labels.grade)}:</strong> ${escapeHtml(grade)}</li>
        </ul>
      </header>
      ${absentQuestionsHtml}
      ${questionsHtml}
    </main>
  </body>
</html>`;
}

export function buildResultReportBundle(options: {
  result: QuizResult;
  questionnaire: Questionnaire | null;
  language: LanguageCode;
}): ResultReportBundle {
  const { result, questionnaire, language } = options;
  const labels = LABELS[language];
  const generatedAt = Date.now();
  const questionBlocks = toQuestionBlocks(result, questionnaire, language, labels);

  const formattedText = buildFormattedText({
    result,
    labels,
    language,
    generatedAt,
    questionBlocks,
  });

  const plainText = buildPlainText({
    result,
    labels,
    language,
    generatedAt,
    questionBlocks,
  });

  const html = buildHtml({
    result,
    labels,
    language,
    generatedAt,
    questionBlocks,
  });

  const filenameBase = `${slugify(result.questionnaireTitle)}-attempt-${new Date(result.completedAt)
    .toISOString()
    .slice(0, 10)}-${result.id.replace(/[^a-z0-9_-]/gi, '').slice(-8) || 'result'}`;

  return {
    formattedText,
    plainText,
    html,
    filenameBase,
  };
}

function downloadTextBlob(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadTextReport(text: string, filename: string): void {
  downloadTextBlob(text, filename);
}

export function downloadPlainTextReport(text: string, filename: string): void {
  downloadTextBlob(text, filename);
}

export function printReportHtml(html: string): void {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Unable to open print window.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === 'complete') {
    setTimeout(triggerPrint, 50);
    return;
  }

  printWindow.addEventListener(
    'load',
    () => {
      setTimeout(triggerPrint, 50);
    },
    { once: true }
  );
}
