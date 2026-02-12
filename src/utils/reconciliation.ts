import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { getQuestionnaireRuntimeId } from './questionnaireIdentity';

export interface ReconciliationIssue {
  type: 'missing_questionnaire' | 'missing_question';
  resultId: string;
  questionnaireId: string;
  questionId?: string;
  message: string;
}

export interface ReconciliationReport {
  totalResults: number;
  missingQuestionnaires: number;
  missingQuestions: number;
  compatibleResults: number;
  incompatibleResults: number;
  compatible: boolean;
  issues: ReconciliationIssue[];
}

function buildQuestionIdIndex(questionnaires: Questionnaire[]): Map<string, Set<string>> {
  const schemaById = new Map<string, Set<string>>();

  for (const questionnaire of questionnaires) {
    schemaById.set(
      getQuestionnaireRuntimeId(questionnaire),
      new Set(questionnaire.questions.map((question) => question.id))
    );
  }

  return schemaById;
}

function getAbsentQuestionIds(
  result: QuizResult,
  questionIndex: Map<string, Set<string>>
): string[] {
  const questionIds = questionIndex.get(result.questionnaireId);
  if (!questionIds) {
    return Object.keys(result.answers);
  }

  return Object.keys(result.answers).filter((questionId) => !questionIds.has(questionId));
}

export function annotateResultsWithSchemaStatus(
  results: QuizResult[],
  questionnaires: Questionnaire[]
): QuizResult[] {
  const questionIndex = buildQuestionIdIndex(questionnaires);

  return results.map((result) => ({
    ...result,
    absentInCurrentSchemaQuestionIds: getAbsentQuestionIds(result, questionIndex),
  }));
}

export function reconcileImportedResults(
  importedResults: QuizResult[],
  questionnaires: Questionnaire[]
): ReconciliationReport {
  const schemaById = buildQuestionIdIndex(questionnaires);

  const issues: ReconciliationIssue[] = [];
  const incompatibleResultIds = new Set<string>();

  for (const result of importedResults) {
    const absentQuestionIds = getAbsentQuestionIds(result, schemaById);
    if (absentQuestionIds.length === 0) {
      continue;
    }

    if (!schemaById.has(result.questionnaireId)) {
      issues.push({
        type: 'missing_questionnaire',
        resultId: result.id,
        questionnaireId: result.questionnaireId,
        message: `Опросник "${result.questionnaireId}" отсутствует в текущем наборе схем.`,
      });
      incompatibleResultIds.add(result.id);
      continue;
    }

    for (const answerQuestionId of absentQuestionIds) {
      issues.push({
        type: 'missing_question',
        resultId: result.id,
        questionnaireId: result.questionnaireId,
        questionId: answerQuestionId,
        message: `Вопрос "${answerQuestionId}" отсутствует в текущей версии опросника "${result.questionnaireId}".`,
      });
    }
  }

  const missingQuestionnaires = issues.filter((issue) => issue.type === 'missing_questionnaire').length;
  const missingQuestions = issues.filter((issue) => issue.type === 'missing_question').length;
  const incompatibleResults = incompatibleResultIds.size;
  const compatibleResults = Math.max(importedResults.length - incompatibleResults, 0);

  return {
    totalResults: importedResults.length,
    missingQuestionnaires,
    missingQuestions,
    compatibleResults,
    incompatibleResults,
    compatible: missingQuestionnaires === 0,
    issues,
  };
}
