import type { LanguageCode } from '../types/i18n';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { getGradeDescription } from './i18n';
import { getGradingMeaning } from './gradingSystem';
import {
  extractMarkdownImageSources,
  hasMarkdownTextContent,
  markdownToPlainText,
  mergeLegacyCommentWithPhotos,
  renderMarkdownToSafeHtml,
} from './markdown';

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
  commentMarkdown: string | null;
  commentText: string | null;
  photos: string[];
  feedback: Array<{
    curatorName: string;
    commentMarkdown: string;
    commentText: string;
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

    const commentMarkdown = mergeLegacyCommentWithPhotos(answer.comment || '', answer.photos || []);
    const commentText = hasMarkdownTextContent(commentMarkdown)
      ? markdownToPlainText(commentMarkdown)
      : null;

    const photos = extractMarkdownImageSources(commentMarkdown)
      .map(sanitizeImageUrl)
      .filter(Boolean);

    const feedback = (answer.curatorFeedback || [])
      .map((entry) => {
        const feedbackMarkdown = String(entry.comment || '').trim();
        if (!feedbackMarkdown) {
          return null;
        }

        const feedbackText = markdownToPlainText(feedbackMarkdown);
        if (!feedbackText) {
          return null;
        }

        return {
          curatorName: String(entry.curatorName || labels.curatorFeedbackBy),
          commentMarkdown: feedbackMarkdown,
          commentText: feedbackText,
        };
      })
      .filter(
        (
          entry
        ): entry is { curatorName: string; commentMarkdown: string; commentText: string } =>
          Boolean(entry)
      );

    const questionText = questionLookup[questionId] || labels.missingQuestionPrefix;

    return [
      {
        questionText,
        score: answer.score,
        commentMarkdown: commentMarkdown || null,
        commentText,
        photos,
        feedback,
      },
    ];
  });
}

function getScaleMax(questionnaire: Questionnaire | null): number {
  return questionnaire?.grading_system.scale_max ?? 10;
}

function getScoreMeaningForReport(questionnaire: Questionnaire | null, score: number): string {
  if (questionnaire) {
    return getGradingMeaning(questionnaire.grading_system, score);
  }
  return getGradeDescription(score);
}

function getOverallGradeForReport(
  questionnaire: Questionnaire | null,
  percentage: number
): string {
  if (!questionnaire) {
    return getGradeDescription(Math.round((percentage / 100) * 10));
  }

  const scale = questionnaire.grading_system;
  const score = scale.scale_min + ((scale.scale_max - scale.scale_min) * percentage) / 100;
  return getGradingMeaning(scale, score);
}

function buildFormattedText(options: {
  result: QuizResult;
  questionnaire: Questionnaire | null;
  labels: ReportLabels;
  language: LanguageCode;
  generatedAt: number;
  questionBlocks: ReportQuestionBlock[];
}): string {
  const { result, questionnaire, labels, language, generatedAt, questionBlocks } = options;
  const grade = getOverallGradeForReport(questionnaire, result.percentage);
  const scaleMax = getScaleMax(questionnaire);

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
    lines.push(
      `${labels.score}: ${block.score}/${scaleMax} - ${getScoreMeaningForReport(questionnaire, block.score)}`
    );

    if (block.commentText) {
      lines.push(`${labels.comment}:`);
      lines.push(block.commentText);
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
          `- ${feedbackIndex + 1}. ${labels.curatorFeedbackBy}: ${entry.curatorName}. ${entry.commentText}`
        );
      });
    }
  });

  return lines.join('\n');
}

function buildPlainText(options: {
  result: QuizResult;
  questionnaire: Questionnaire | null;
  labels: ReportLabels;
  language: LanguageCode;
  generatedAt: number;
  questionBlocks: ReportQuestionBlock[];
}): string {
  const { result, questionnaire, labels, language, generatedAt, questionBlocks } = options;
  const grade = getOverallGradeForReport(questionnaire, result.percentage);
  const scaleMax = getScaleMax(questionnaire);

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
    lines.push(
      `${labels.score}: ${block.score}/${scaleMax} - ${getScoreMeaningForReport(questionnaire, block.score)}`
    );

    if (block.commentText) {
      lines.push(`${labels.comment}: ${block.commentText}`);
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
        lines.push(
          `${feedbackIndex + 1}. ${labels.curatorFeedbackBy}: ${entry.curatorName}. ${entry.commentText}`
        );
      });
    }
  });

  return lines.join('\n');
}

function buildHtml(options: {
  result: QuizResult;
  questionnaire: Questionnaire | null;
  labels: ReportLabels;
  language: LanguageCode;
  generatedAt: number;
  questionBlocks: ReportQuestionBlock[];
}): string {
  const { result, questionnaire, labels, language, generatedAt, questionBlocks } = options;

  const grade = getOverallGradeForReport(questionnaire, result.percentage);
  const scaleMax = getScaleMax(questionnaire);

  const absentQuestionsHtml =
    result.absentInCurrentSchemaQuestionIds && result.absentInCurrentSchemaQuestionIds.length > 0
      ? `<p class="warning"><strong>${escapeHtml(labels.absentQuestions)}:</strong> ${escapeHtml(
          result.absentInCurrentSchemaQuestionIds.join(', ')
        )}</p>`
      : '';

  const questionsHtml = questionBlocks
    .map((block, index) => {
      const commentMarkdown = block.commentMarkdown || '';
      const safeCommentHtml = commentMarkdown
        ? `
            <div>
              <h5>${escapeHtml(labels.comment)}</h5>
              ${renderMarkdownToSafeHtml(commentMarkdown)}
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
                          ${renderMarkdownToSafeHtml(entry.commentMarkdown)}
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
          <p><strong>${escapeHtml(labels.score)}:</strong> ${block.score}/${scaleMax} - ${escapeHtml(
        getScoreMeaningForReport(questionnaire, block.score)
      )}</p>
          ${safeCommentHtml}
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
        color: #111827;
      }
      .report-shell :where(h1, h2, h3, h4, h5, h6, p, li, strong, em, span, div) {
        color: inherit;
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
    questionnaire,
    labels,
    language,
    generatedAt,
    questionBlocks,
  });

  const plainText = buildPlainText({
    result,
    questionnaire,
    labels,
    language,
    generatedAt,
    questionBlocks,
  });

  const html = buildHtml({
    result,
    questionnaire,
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

export function downloadHtmlReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function createOffscreenReportElement(html: string): {
  reportNode: HTMLElement;
  cleanup: () => void;
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Document is not available.');
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = '1200px';
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  // PDF rendering should stay readable regardless of app light/dark theme.
  host.style.color = '#111827';
  host.style.background = '#ffffff';
  host.style.colorScheme = 'light';

  const style = document.createElement('style');
  style.textContent = Array.from(parsed.head.querySelectorAll('style'))
    .map((entry) => entry.textContent || '')
    .join('\n');

  const bodyWrapper = document.createElement('div');
  bodyWrapper.innerHTML = parsed.body.innerHTML;
  bodyWrapper.style.color = '#111827';
  bodyWrapper.style.background = '#ffffff';
  bodyWrapper.style.colorScheme = 'light';

  host.appendChild(style);
  host.appendChild(bodyWrapper);
  document.body.appendChild(host);

  const reportNode =
    (bodyWrapper.querySelector('.report-shell') as HTMLElement | null) ||
    (bodyWrapper.firstElementChild as HTMLElement | null) ||
    bodyWrapper;

  return {
    reportNode,
    cleanup: () => {
      host.remove();
    },
  };
}

async function waitForImagesToLoad(root: HTMLElement, timeoutMs = 7000): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  const pendingImages = images.filter((image) => !image.complete);
  if (pendingImages.length === 0) return;

  const waitForAll = Promise.all(
    pendingImages.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );

  await Promise.race([
    waitForAll,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

export async function downloadPdfReport(html: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const { reportNode, cleanup } = createOffscreenReportElement(html);

  try {
    await waitForImagesToLoad(reportNode);

    const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    const canvas = await html2canvas(reportNode, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      imageTimeout: 7000,
      logging: false,
    });

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let heightLeft = imageHeight;
    let yPosition = 0;

    pdf.addImage(imageData, 'JPEG', 0, yPosition, imageWidth, imageHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      yPosition = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(imageData, 'JPEG', 0, yPosition, imageWidth, imageHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    cleanup();
  }
}

export function printReportHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Document is not available.'));
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    let isSettled = false;
    const finish = (error?: Error) => {
      if (isSettled) return;
      isSettled = true;
      iframe.remove();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    iframe.onload = () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        finish(new Error('Unable to access print frame.'));
        return;
      }

      const fallbackTimer = window.setTimeout(() => {
        finish();
      }, 2000);

      printWindow.onafterprint = () => {
        window.clearTimeout(fallbackTimer);
        finish();
      };

      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        window.clearTimeout(fallbackTimer);
        finish(error instanceof Error ? error : new Error('Failed to print report.'));
      }
    };

    document.body.appendChild(iframe);

    const frameDocument = iframe.contentDocument;
    if (!frameDocument) {
      finish(new Error('Unable to create print frame document.'));
      return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
  });
}
