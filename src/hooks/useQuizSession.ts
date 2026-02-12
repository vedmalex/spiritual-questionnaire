import { useState, useEffect, useCallback } from 'react';
import type { QuizSession, QuizResult, Questionnaire, AnswerDetails, UserRole } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import { getQuestionnaireRuntimeId, isLocalQuestionnaire } from '../utils/questionnaireIdentity';

interface CreateSessionOptions {
  returnUrl?: string;
}

const DEFAULT_RETURN_URL = '/';

function getQuestionnaireTitle(questionnaire: Questionnaire): string {
  const title = questionnaire.metadata.title;
  const language =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru' : 'ru';
  const localSuffix = isLocalQuestionnaire(questionnaire)
    ? language === 'en'
      ? ' (local)'
      : ' (локальный)'
    : '';

  if (typeof title === 'string') {
    return `${title}${localSuffix}`;
  }

  const resolved = title[language] || title.en || title.ru || questionnaire.metadata.quality;
  return `${resolved}${localSuffix}`;
}

function normalizeSessionReturnUrl(session: QuizSession): QuizSession {
  return {
    ...session,
    returnUrl: session.returnUrl || DEFAULT_RETURN_URL,
  };
}

function upsertPausedSession(
  sessions: QuizSession[],
  pausedSession: QuizSession
): QuizSession[] {
  const normalized = {
    ...normalizeSessionReturnUrl(pausedSession),
    status: 'paused' as const,
  };

  return [
    normalized,
    ...sessions.filter((item) => item.questionnaireId !== pausedSession.questionnaireId),
  ];
}

function normalizePausedSessions(input: QuizSession[]): QuizSession[] {
  const latestByQuestionnaire = new Map<string, QuizSession>();

  for (const item of input) {
    const normalized = {
      ...normalizeSessionReturnUrl(item),
      status: 'paused' as const,
    };
    const existing = latestByQuestionnaire.get(normalized.questionnaireId);
    if (!existing || normalized.lastActivity > existing.lastActivity) {
      latestByQuestionnaire.set(normalized.questionnaireId, normalized);
    }
  }

  return Array.from(latestByQuestionnaire.values()).sort(
    (a, b) => b.lastActivity - a.lastActivity
  );
}

export function useQuizSession(userName: string, userRole: UserRole) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [pausedSessions, setPausedSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const [currentSession, storedPausedSessions] = await Promise.all([
          dataAdapter.getCurrentSession(),
          dataAdapter.getPausedSessions(),
        ]);

        let nextSession = currentSession ? normalizeSessionReturnUrl(currentSession) : null;
        let nextPausedSessions = normalizePausedSessions(storedPausedSessions);
        let currentSessionChanged = false;
        let pausedSessionsChanged =
          JSON.stringify(nextPausedSessions) !== JSON.stringify(storedPausedSessions);

        if (nextSession?.status === 'paused') {
          nextPausedSessions = upsertPausedSession(nextPausedSessions, nextSession);
          nextSession = null;
          currentSessionChanged = true;
          pausedSessionsChanged = true;
        }

        if (nextSession && nextSession.returnUrl !== currentSession?.returnUrl) {
          currentSessionChanged = true;
        }

        if (currentSessionChanged) {
          if (nextSession) {
            await dataAdapter.saveSession(nextSession);
          } else {
            await dataAdapter.clearSession();
          }
        }

        if (pausedSessionsChanged) {
          await dataAdapter.savePausedSessions(nextPausedSessions);
        }

        setSession(nextSession);
        setPausedSessions(nextPausedSessions);
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const createSession = useCallback(
    async (questionnaire: Questionnaire, options?: CreateSessionOptions) => {
      const questionnaireId = getQuestionnaireRuntimeId(questionnaire);
      const nextReturnUrl = options?.returnUrl || DEFAULT_RETURN_URL;
      const now = Date.now();

      if (session && session.questionnaireId === questionnaireId && session.status === 'active') {
        if (session.returnUrl === nextReturnUrl) {
          return session;
        }

        const updatedCurrent = {
          ...session,
          returnUrl: nextReturnUrl,
          lastActivity: now,
        };
        await dataAdapter.saveSession(updatedCurrent);
        setSession(updatedCurrent);
        return updatedCurrent;
      }

      let nextPausedSessions = pausedSessions;
      if (session && session.status === 'active' && session.questionnaireId !== questionnaireId) {
        nextPausedSessions = upsertPausedSession(nextPausedSessions, {
          ...session,
          status: 'paused',
          lastActivity: now,
        });
      }

      const pausedForQuestionnaire = nextPausedSessions.find(
        (item) => item.questionnaireId === questionnaireId
      );
      if (pausedForQuestionnaire) {
        const resumed = {
          ...pausedForQuestionnaire,
          status: 'active' as const,
          returnUrl: nextReturnUrl,
          lastActivity: now,
        };
        const remainingPaused = nextPausedSessions.filter(
          (item) => item.questionnaireId !== questionnaireId
        );

        await Promise.all([
          dataAdapter.saveSession(resumed),
          dataAdapter.savePausedSessions(remainingPaused),
        ]);

        setSession(resumed);
        setPausedSessions(remainingPaused);
        return resumed;
      }

      const newSession: QuizSession = {
        id: `session_${now}`,
        questionnaireId,
        userName,
        userRole,
        returnUrl: nextReturnUrl,
        startTime: now,
        lastActivity: now,
        currentQuestionIndex: 0,
        answers: {},
        status: 'active',
      };

      if (nextPausedSessions !== pausedSessions) {
        await Promise.all([
          dataAdapter.saveSession(newSession),
          dataAdapter.savePausedSessions(nextPausedSessions),
        ]);
      } else {
        await dataAdapter.saveSession(newSession);
      }

      setSession(newSession);
      setPausedSessions(nextPausedSessions);
      return newSession;
    },
    [pausedSessions, session, userName, userRole]
  );

  const updateAnswer = useCallback(async (questionId: string, details: AnswerDetails) => {
    if (!session) return;
    
    const updated = {
      ...session,
      answers: { ...session.answers, [questionId]: details },
      lastActivity: Date.now(),
    };
    
    await dataAdapter.saveSession(updated);
    setSession(updated);
  }, [session]);

  const nextQuestion = useCallback(async () => {
    if (!session) return;
    
    const updated = {
      ...session,
      currentQuestionIndex: session.currentQuestionIndex + 1,
      lastActivity: Date.now(),
    };

    if (!session.sourceResultId) {
      await dataAdapter.saveSession(updated);
    }
    setSession(updated);
  }, [session]);

  const prevQuestion = useCallback(async () => {
    if (!session) return;
    
    const updated = {
      ...session,
      currentQuestionIndex: Math.max(0, session.currentQuestionIndex - 1),
      lastActivity: Date.now(),
    };

    if (!session.sourceResultId) {
      await dataAdapter.saveSession(updated);
    }
    setSession(updated);
  }, [session]);

  const setQuestionIndex = useCallback(
    async (index: number) => {
      if (!session) return;

      const safeIndex = Math.max(0, Math.min(index, Number.MAX_SAFE_INTEGER));
      if (safeIndex === session.currentQuestionIndex) {
        return;
      }

      const updated = {
        ...session,
        currentQuestionIndex: safeIndex,
        lastActivity: Date.now(),
      };

      if (!session.sourceResultId) {
        await dataAdapter.saveSession(updated);
      }
      setSession(updated);
    },
    [session]
  );

  const pauseSession = useCallback(async () => {
    if (!session) return null;

    const updated = { ...session, status: 'paused' as const, lastActivity: Date.now() };
    const nextPausedSessions = upsertPausedSession(pausedSessions, updated);

    await Promise.all([
      dataAdapter.clearSession(),
      dataAdapter.savePausedSessions(nextPausedSessions),
    ]);

    setSession(null);
    setPausedSessions(nextPausedSessions);
    return updated;
  }, [pausedSessions, session]);

  const resumeSession = useCallback(async (questionnaireId?: string) => {
    if (session?.status === 'active') {
      if (!questionnaireId || session.questionnaireId === questionnaireId) {
        return session;
      }
      return null;
    }

    const target =
      (questionnaireId
        ? pausedSessions.find((item) => item.questionnaireId === questionnaireId)
        : pausedSessions[0]) || null;
    if (!target) {
      return null;
    }

    const resumed = {
      ...target,
      status: 'active' as const,
      returnUrl: target.returnUrl || DEFAULT_RETURN_URL,
      lastActivity: Date.now(),
    };
    const remainingPaused = pausedSessions.filter(
      (item) => item.questionnaireId !== target.questionnaireId
    );

    await Promise.all([
      dataAdapter.saveSession(resumed),
      dataAdapter.savePausedSessions(remainingPaused),
    ]);
    setSession(resumed);
    setPausedSessions(remainingPaused);
    return resumed;
  }, [pausedSessions, session]);

  const completeSession = useCallback(async (questionnaire: Questionnaire) => {
    if (!session) return;

    const answers = session.answers;
    const totalScore = Object.values(answers).reduce((sum, detail) => sum + (detail.score || 0), 0);
    const maxPossibleScore = questionnaire.questions.length * 10;
    const percentage = Math.round((totalScore / maxPossibleScore) * 100);
    const completedAt =
      session.sourceResultId && session.sourceResultCompletedAt
        ? session.sourceResultCompletedAt
        : Date.now();

    const result: QuizResult = {
      id: session.sourceResultId || `result_${Date.now()}`,
      questionnaireId: session.questionnaireId,
      questionnaireTitle: getQuestionnaireTitle(questionnaire),
      userName: session.userName,
      userRole: session.userRole,
      completedAt,
      answers,
      totalScore,
      maxPossibleScore,
      percentage,
      reviewStatus: 'pending',
      absentInCurrentSchemaQuestionIds: [],
    };

    if (session.sourceResultId) {
      await dataAdapter.updateResult(result, 'student');
    } else {
      await dataAdapter.saveResult(result, 'student');
    }
    await dataAdapter.clearSession();
    setSession(null);
    return result;
  }, [session]);

  return {
    session,
    pausedSessions,
    loading,
    createSession,
    updateAnswer,
    nextQuestion,
    prevQuestion,
    setQuestionIndex,
    pauseSession,
    resumeSession,
    completeSession,
  };
}
