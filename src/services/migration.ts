import { APP_BUILD_ID, DATA_VERSION, STORAGE_KEYS } from '../utils/constants';
import { dataAdapter } from './localStorageAdapter';
import { normalizeQuestionnaire } from '../utils/questionnaireSchema';
import type { QuizResult, QuizSession } from '../types/questionnaire';
import { annotateResultsWithSchemaStatus } from '../utils/reconciliation';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';

interface Migration {
  version: number;
  migrate: () => Promise<void>;
}

const RESULTS_RECONCILIATION_KEYS = [
  STORAGE_KEYS.RESULTS_STUDENT,
  STORAGE_KEYS.RESULTS_CURATOR,
  STORAGE_KEYS.RESULTS, // legacy
];

async function runSchemaReconciliationPass(reason: string): Promise<void> {
  console.log(`Running schema reconciliation: ${reason}`);

  const questionnaires = await dataAdapter.getQuestionnaires();
  for (const key of RESULTS_RECONCILIATION_KEYS) {
    const resultsRaw = localStorage.getItem(key);
    if (!resultsRaw) {
      continue;
    }

    try {
      const parsed = JSON.parse(resultsRaw) as QuizResult[];
      const normalized = annotateResultsWithSchemaStatus(parsed, questionnaires);
      localStorage.setItem(key, JSON.stringify(normalized));
    } catch (error) {
      console.error(`Failed to reconcile results schema markers (${key}):`, error);
    }
  }

  const sessionRaw = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw) as QuizSession;
      const activeSchema = questionnaires.find(
        (questionnaire) => getQuestionnaireRuntimeId(questionnaire) === session.questionnaireId
      );

      if (activeSchema) {
        const maxIndex = Math.max(activeSchema.questions.length - 1, 0);
        const nextIndex = Math.min(session.currentQuestionIndex, maxIndex);

        if (nextIndex !== session.currentQuestionIndex) {
          localStorage.setItem(
            STORAGE_KEYS.SESSION,
            JSON.stringify({
              ...session,
              currentQuestionIndex: nextIndex,
              lastActivity: Date.now(),
            })
          );
        }
      }
    } catch (error) {
      console.error('Failed to reconcile active session index:', error);
    }
  }

  const pausedSessionsRaw = localStorage.getItem(STORAGE_KEYS.PAUSED_SESSIONS);
  if (pausedSessionsRaw) {
    try {
      const pausedSessions = JSON.parse(pausedSessionsRaw) as QuizSession[];
      const normalized = (Array.isArray(pausedSessions) ? pausedSessions : []).map((session) => {
        const activeSchema = questionnaires.find(
          (questionnaire) => getQuestionnaireRuntimeId(questionnaire) === session.questionnaireId
        );

        if (!activeSchema) {
          return session;
        }

        const maxIndex = Math.max(activeSchema.questions.length - 1, 0);
        const nextIndex = Math.min(session.currentQuestionIndex, maxIndex);
        if (nextIndex === session.currentQuestionIndex) {
          return session;
        }

        return {
          ...session,
          currentQuestionIndex: nextIndex,
          lastActivity: Date.now(),
        };
      });

      localStorage.setItem(STORAGE_KEYS.PAUSED_SESSIONS, JSON.stringify(normalized));
    } catch (error) {
      console.error('Failed to reconcile paused sessions indexes:', error);
    }
  }
}

const migrations: Migration[] = [
  {
    version: 1,
    migrate: async () => {
      // Initial migration - set up initial data structure
      console.log('Running migration v1: Initial setup');
      // Any initial data transformation can go here
    },
  },
  {
    version: 2,
    migrate: async () => {
      console.log('Running migration v2: normalize results and custom questionnaires');

      for (const key of RESULTS_RECONCILIATION_KEYS) {
        const resultsRaw = localStorage.getItem(key);
        if (!resultsRaw) {
          continue;
        }

        const parsed = JSON.parse(resultsRaw) as QuizResult[];
        const normalizedResults = parsed.map((result) => ({
          ...result,
          reviewStatus: result.reviewStatus || 'pending',
          answers: Object.fromEntries(
            Object.entries(result.answers || {}).map(([questionId, answer]) => [
              questionId,
              {
                score: typeof answer.score === 'number' ? answer.score : 0,
                comment: answer.comment || '',
                photos: Array.isArray(answer.photos) ? answer.photos : [],
                curatorFeedback: Array.isArray(answer.curatorFeedback) ? answer.curatorFeedback : [],
              },
            ])
          ),
        }));
        localStorage.setItem(key, JSON.stringify(normalizedResults));
      }

      const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES);
      if (customRaw) {
        const parsed = JSON.parse(customRaw);
        const normalized = Array.isArray(parsed)
          ? parsed.map((questionnaire) => normalizeQuestionnaire(questionnaire))
          : [];
        localStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES, JSON.stringify(normalized));
      }
    },
  },
  {
    version: 3,
    migrate: async () => {
      await runSchemaReconciliationPass('migration v3');
    },
  },
  {
    version: 4,
    migrate: async () => {
      console.log('Running migration v4: split student and curator result stores');

      const legacyRaw = localStorage.getItem(STORAGE_KEYS.RESULTS);
      if (!legacyRaw) {
        return;
      }

      try {
        const parsed = JSON.parse(legacyRaw) as QuizResult[];
        const legacyResults = Array.isArray(parsed) ? parsed : [];

        if (!localStorage.getItem(STORAGE_KEYS.RESULTS_STUDENT)) {
          localStorage.setItem(STORAGE_KEYS.RESULTS_STUDENT, JSON.stringify(legacyResults));
        }

        if (!localStorage.getItem(STORAGE_KEYS.RESULTS_CURATOR)) {
          // We cannot reliably infer curator-imported entries in legacy store.
          // Keep curator storage isolated by default.
          localStorage.setItem(STORAGE_KEYS.RESULTS_CURATOR, JSON.stringify([]));
        }
      } catch (error) {
        console.error('Failed to split legacy result store:', error);
      } finally {
        localStorage.removeItem(STORAGE_KEYS.RESULTS);
      }
    },
  },
  {
    version: 5,
    migrate: async () => {
      console.log('Running migration v5: normalize multilingual questionnaire schema');

      const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES);
      if (customRaw) {
        try {
          const parsed = JSON.parse(customRaw);
          const normalized = Array.isArray(parsed)
            ? parsed.map((questionnaire) => normalizeQuestionnaire(questionnaire))
            : [];
          localStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES, JSON.stringify(normalized));
        } catch (error) {
          console.error('Failed to normalize custom questionnaires for v5:', error);
        }
      }

      await runSchemaReconciliationPass('migration v5');
    },
  },
];

export async function runMigrations(): Promise<void> {
  const [currentVersion, storedBuildId] = await Promise.all([
    dataAdapter.getDataVersion(),
    dataAdapter.getBuildId(),
  ]);
  const versionMigrationNeeded = currentVersion < DATA_VERSION;
  const buildChanged = storedBuildId !== APP_BUILD_ID;

  if (!versionMigrationNeeded && !buildChanged) {
    return;
  }

  if (versionMigrationNeeded) {
    console.log(`Migrating data from version ${currentVersion} to ${DATA_VERSION}`);

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        try {
          await migration.migrate();
          await dataAdapter.setDataVersion(migration.version);
          console.log(`Migration v${migration.version} completed`);
        } catch (error) {
          console.error(`Migration v${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }

  if (buildChanged) {
    console.log(`Build change detected: ${storedBuildId || 'none'} -> ${APP_BUILD_ID}`);
    await runSchemaReconciliationPass('build change');
  }

  await Promise.all([dataAdapter.setDataVersion(DATA_VERSION), dataAdapter.setBuildId(APP_BUILD_ID)]);
  console.log('Migrations/build reconciliation completed');
}
