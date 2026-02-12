import type { QuizResult } from '../types/questionnaire';
import { getGradeDescription } from './i18n';
import { buildResultsTransferPayload } from './resultsTransfer';

export type ExportFormat = 'json' | 'csv';

function generateJSON(data: QuizResult[]): string {
  const exportData = buildResultsTransferPayload(data);

  return JSON.stringify(exportData, null, 2);
}

function generateCSV(data: QuizResult[]): string {
  const headers = [
    'ID',
    'User Name',
    'Questionnaire',
    'Completed At',
    'Total Score',
    'Max Score',
    'Percentage',
    'Review Status',
    'Question ID',
    'Absent In Current Schema',
    'Score',
    'Grade Description',
    'Comment',
    'Photo Count',
  ];
  
  const rows: string[] = [headers.join(',')];
  
  data.forEach(result => {
    Object.entries(result.answers).forEach(([questionId, details]) => {
      const row = [
        result.id,
        `"${result.userName}"`,
        `"${result.questionnaireTitle}"`,
        new Date(result.completedAt).toLocaleString(),
        result.totalScore,
        result.maxPossibleScore,
        `${result.percentage}%`,
        result.reviewStatus,
        questionId,
        result.absentInCurrentSchemaQuestionIds?.includes(questionId) ? 'yes' : 'no',
        details.score,
        `"${getGradeDescription(details.score)}"`,
        details.comment ? `"${details.comment.replace(/"/g, '""')}"` : '',
        details.photos?.length || 0,
      ];
      rows.push(row.join(','));
    });
  });
  
  return rows.join('\n');
}

export function exportResults(results: QuizResult[], format: ExportFormat, filename?: string): void {
  let content: string;
  let mimeType: string;
  let extension: string;
  
  switch (format) {
    case 'json':
      content = generateJSON(results);
      mimeType = 'application/json';
      extension = 'json';
      break;
    case 'csv':
      content = generateCSV(results);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `quiz-results-${Date.now()}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportWithPhotos(result: QuizResult): void {
  // Create a comprehensive export including photos
  const exportData = {
    exportedAt: new Date().toISOString(),
    result: {
      ...result,
      completedAt: new Date(result.completedAt).toLocaleString(),
      answers: Object.entries(result.answers).map(([questionId, details]) => ({
        questionId,
        score: details.score,
        gradeDescription: getGradeDescription(details.score),
        comment: details.comment || '',
        hasPhotos: (details.photos?.length || 0) > 0,
        photoCount: details.photos?.length || 0,
        photos: details.photos || [],
        curatorFeedback: details.curatorFeedback || [],
      })),
    },
    photoArchive: {
      totalPhotos: Object.values(result.answers).reduce(
        (sum, detail) => sum + (detail.photos?.length || 0), 
        0
      ),
      note: 'Photos are embedded as base64 data URLs in the answers array',
    },
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz-result-with-photos-${result.userName}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
