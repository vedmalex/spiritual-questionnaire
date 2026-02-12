import type { Questionnaire } from '../types/questionnaire';

const LOCAL_RUNTIME_PREFIX = 'local:';

export function toLocalQuestionnaireRuntimeId(quality: string): string {
  return `${LOCAL_RUNTIME_PREFIX}${quality}`;
}

export function stripLocalRuntimePrefix(id: string): string {
  return id.startsWith(LOCAL_RUNTIME_PREFIX) ? id.slice(LOCAL_RUNTIME_PREFIX.length) : id;
}

export function isLocalQuestionnaireId(id: string): boolean {
  return id.startsWith(LOCAL_RUNTIME_PREFIX);
}

export function getQuestionnaireRuntimeId(questionnaire: Questionnaire): string {
  return questionnaire.runtimeId || questionnaire.metadata.quality;
}

export function isLocalQuestionnaire(questionnaire: Questionnaire): boolean {
  if (questionnaire.source === 'local') {
    return true;
  }
  return isLocalQuestionnaireId(getQuestionnaireRuntimeId(questionnaire));
}

export function withQuestionnaireRuntimeIdentity(
  questionnaire: Questionnaire,
  source: 'static' | 'local'
): Questionnaire {
  const quality = questionnaire.metadata.quality;
  const runtimeId = source === 'local' ? toLocalQuestionnaireRuntimeId(quality) : quality;

  return {
    ...questionnaire,
    source,
    runtimeId,
  };
}
