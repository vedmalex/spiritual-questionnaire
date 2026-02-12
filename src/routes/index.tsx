import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import { UserSetup } from '../components/UserSetup';
import { QuestionnaireList } from '../components/QuestionnaireList';
import { QuizTaker } from '../components/QuizTaker';
import { CuratorDashboard } from '../components/CuratorDashboard';
import { AdminDashboard } from '../components/AdminDashboard';
import { useUser } from '../hooks/useUser';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { useQuizSession } from '../hooks/useQuizSession';
import type { Questionnaire, AnswerDetails, UserRole } from '../types/questionnaire';
import { runMigrations } from '../services/migration';
import { trackFormActivity } from '../utils/analytics';
import { initializeLanguage, t } from '../utils/i18n';
import { isAdminFeaturesEnabled, isRoleEnabled } from '../config/appProfile';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';

interface HomeSearch {
  quiz?: string;
  q?: number;
  returnUrl?: string;
}

const DEFAULT_RETURN_URL = '/';

function parseQuestionnaireId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function parseQuestionIndex(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return undefined;
}

function parseDashboardTab(value: unknown): 'results' | 'analytics' | 'feedback' | undefined {
  return value === 'results' || value === 'analytics' || value === 'feedback' ? value : undefined;
}

function parseAdminTab(value: unknown): 'overview' | 'questionnaires' | 'translations' | 'operations' | undefined {
  if (
    value === 'overview' ||
    value === 'questionnaires' ||
    value === 'translations' ||
    value === 'operations'
  ) {
    return value;
  }
  return undefined;
}

function parseFocusId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function parseFocusTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return undefined;
}

function parseReturnUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized, 'https://local.invalid');
    if (parsed.pathname !== '/' && parsed.pathname !== '/dashboard') {
      return undefined;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return undefined;
  }
}

function withFocusReturnUrl(
  returnUrl: string,
  options: {
    focusResultId?: string;
    focusResultAt?: number;
    focusQuestionId?: string;
    defaultTab?: 'results' | 'feedback';
  }
): string {
  const normalized = parseReturnUrl(returnUrl) || DEFAULT_RETURN_URL;
  if (normalized === DEFAULT_RETURN_URL) {
    return normalized;
  }

  const parsed = new URL(normalized, 'https://local.invalid');
  if (parsed.pathname !== '/dashboard') {
    return normalized;
  }

  if (!parseDashboardTab(parsed.searchParams.get('tab'))) {
    parsed.searchParams.set('tab', options.defaultTab || 'results');
  }
  if (options.focusResultId) {
    parsed.searchParams.set('focusResultId', options.focusResultId);
  }
  if (options.focusResultAt !== undefined) {
    parsed.searchParams.set('focusResultAt', String(options.focusResultAt));
  }
  if (options.focusQuestionId) {
    parsed.searchParams.set('focusQuestionId', options.focusQuestionId);
  } else {
    parsed.searchParams.delete('focusQuestionId');
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function readFocusFromReturnUrl(returnUrl: string): {
  focusResultId?: string;
  focusResultAt?: number;
} {
  const normalized = parseReturnUrl(returnUrl);
  if (!normalized) {
    return {};
  }

  const parsed = new URL(normalized, 'https://local.invalid');
  if (parsed.pathname !== '/dashboard') {
    return {};
  }

  return {
    focusResultId: parseFocusId(parsed.searchParams.get('focusResultId')),
    focusResultAt: parseFocusTimestamp(parsed.searchParams.get('focusResultAt')),
  };
}

export const Route = createFileRoute('/')({
  validateSearch: (search): HomeSearch => {
    const quiz = parseQuestionnaireId(search.quiz);
    const q = quiz ? parseQuestionIndex(search.q) : undefined;
    const parsedReturnUrl = parseReturnUrl(search.returnUrl);

    return {
      quiz,
      q,
      returnUrl: quiz ? parsedReturnUrl || DEFAULT_RETURN_URL : undefined,
    };
  },
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const {
    user,
    archivedUsers,
    loading: userLoading,
    saveUser,
    restoreFromBackup,
    restoreFromArchive,
  } = useUser();
  const {
    questionnaires,
    loading: questionnairesLoading,
    serverStatus,
    retryLoad,
  } = useQuestionnaires();

  const userName = user?.name || '';
  const userRole = user?.role || 'student';
  const {
    session,
    pausedSessions,
    loading: sessionLoading,
    createSession,
    updateAnswer,
    setQuestionIndex,
    pauseSession,
    resumeSession,
    completeSession,
  } = useQuizSession(userName, userRole);
  const resumeInFlightRef = useRef(false);

  const selectedQuestionnaire = useMemo<Questionnaire | null>(() => {
    if (!search.quiz) return null;
    return (
      questionnaires.find((questionnaire) => getQuestionnaireRuntimeId(questionnaire) === search.quiz) || null
    );
  }, [questionnaires, search.quiz]);
  const selectedQuestionnaireId = selectedQuestionnaire
    ? getQuestionnaireRuntimeId(selectedQuestionnaire)
    : null;
  const pausedQuestionnaireIds = useMemo(
    () => new Set(pausedSessions.map((item) => item.questionnaireId)),
    [pausedSessions]
  );

  const isQuizSessionActive =
    Boolean(session) &&
    session?.status === 'active' &&
    Boolean(selectedQuestionnaire) &&
    session?.questionnaireId === selectedQuestionnaireId;

  const maxQuestionIndex = Math.max((selectedQuestionnaire?.questions.length || 1) - 1, 0);
  const resolvedQuestionIndex = Math.max(
    0,
    Math.min(search.q ?? session?.currentQuestionIndex ?? 0, maxQuestionIndex)
  );
  const activeReturnUrl =
    parseReturnUrl(search.returnUrl) ||
    parseReturnUrl(session?.returnUrl) ||
    DEFAULT_RETURN_URL;
  const returnUrlFocus = readFocusFromReturnUrl(activeReturnUrl);
  const activeQuestionId = selectedQuestionnaire?.questions?.[resolvedQuestionIndex]?.id;
  const focusedReturnUrl = withFocusReturnUrl(activeReturnUrl, {
    focusResultId: returnUrlFocus.focusResultId || session?.sourceResultId,
    focusResultAt:
      returnUrlFocus.focusResultAt !== undefined
        ? returnUrlFocus.focusResultAt
        : session?.sourceResultCompletedAt,
    focusQuestionId: activeQuestionId,
    defaultTab: 'results',
  });

  // Initialize language
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Run migrations on mount
  useEffect(() => {
    runMigrations().catch(console.error);
  }, []);

  const updateQuizUrl = (
    questionnaireId: string,
    questionIndex: number,
    returnUrl: string,
    replace = false
  ) => {
    void navigate({
      to: '/',
      replace,
      search: (): HomeSearch => ({
        quiz: questionnaireId,
        q: Math.max(0, questionIndex),
        returnUrl: parseReturnUrl(returnUrl) || DEFAULT_RETURN_URL,
      }),
    });
  };

  const clearQuizUrl = (replace = false) => {
    void navigate({
      to: '/',
      replace,
      search: (): HomeSearch => ({
        quiz: undefined,
        q: undefined,
        returnUrl: undefined,
      }),
    });
  };

  const navigateToReturnUrl = (returnUrl: string, replace = false) => {
    const normalized = parseReturnUrl(returnUrl) || DEFAULT_RETURN_URL;
    if (normalized === DEFAULT_RETURN_URL) {
      clearQuizUrl(replace);
      return;
    }

    const parsed = new URL(normalized, 'https://local.invalid');
    const tab = parseDashboardTab(parsed.searchParams.get('tab'));
    const adminTab = parseAdminTab(parsed.searchParams.get('adminTab'));
    const focusResultId = parseFocusId(parsed.searchParams.get('focusResultId'));
    const focusResultAt = parseFocusTimestamp(parsed.searchParams.get('focusResultAt'));
    const focusQuestionId = parseFocusId(parsed.searchParams.get('focusQuestionId'));

    if (parsed.pathname === '/dashboard') {
      void navigate({
        to: '/dashboard',
        replace,
        search: () => ({
          tab,
          adminTab,
          focusResultId,
          focusResultAt,
          focusQuestionId,
        }),
      });
      return;
    }

    clearQuizUrl(replace);
  };

  // Sync active quiz session to URL (quiz, question index and mandatory return URL)
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const sessionReturnUrl = parseReturnUrl(session.returnUrl) || activeReturnUrl;
    const hasSessionQuiz = search.quiz === session.questionnaireId;
    const hasQuestionIndex = search.q !== undefined;
    const hasReturnUrl = Boolean(search.returnUrl);
    if (hasSessionQuiz && hasQuestionIndex && hasReturnUrl) {
      return;
    }

    updateQuizUrl(
      session.questionnaireId,
      hasSessionQuiz && search.q !== undefined ? search.q : session.currentQuestionIndex,
      parseReturnUrl(search.returnUrl) || sessionReturnUrl,
      true
    );
  }, [activeReturnUrl, search.q, search.quiz, search.returnUrl, session]);

  // Keep URL question index aligned and support browser back/forward
  useEffect(() => {
    if (!isQuizSessionActive || !session) return;

    if (resolvedQuestionIndex !== session.currentQuestionIndex) {
      void setQuestionIndex(resolvedQuestionIndex);
      return;
    }

    if (search.q !== resolvedQuestionIndex || search.returnUrl !== activeReturnUrl) {
      updateQuizUrl(
        session.questionnaireId,
        resolvedQuestionIndex,
        activeReturnUrl,
        true
      );
    }
  }, [
    activeReturnUrl,
    isQuizSessionActive,
    resolvedQuestionIndex,
    search.q,
    search.returnUrl,
    session,
    setQuestionIndex,
  ]);

  // If session is paused, keep user on list view URL
  useEffect(() => {
    if (!session || session.status !== 'paused') return;
    if (resumeInFlightRef.current) return;
    if (!search.quiz && search.q === undefined && !search.returnUrl) return;

    clearQuizUrl(true);
  }, [search.q, search.quiz, search.returnUrl, session]);

  useEffect(() => {
    if (session?.status !== 'paused') {
      resumeInFlightRef.current = false;
    }
  }, [session?.status]);

  // Clear stale URL if questionnaire from URL is missing
  useEffect(() => {
    if (!search.quiz || selectedQuestionnaire || questionnairesLoading) return;

    clearQuizUrl(true);
  }, [questionnairesLoading, search.quiz, selectedQuestionnaire]);

  const handlePrevQuestion = () => {
    if (!selectedQuestionnaire) return;
    const nextIndex = Math.max(0, resolvedQuestionIndex - 1);
    trackFormActivity('quiz_taker', 'prev_question', {
      questionnaire: selectedQuestionnaireId || selectedQuestionnaire.metadata.quality,
      question: nextIndex + 1,
    });
    updateQuizUrl(
      selectedQuestionnaireId || selectedQuestionnaire.metadata.quality,
      nextIndex,
      activeReturnUrl
    );
  };

  const handleNextQuestion = () => {
    if (!selectedQuestionnaire) return;
    const nextIndex = Math.min(
      selectedQuestionnaire.questions.length - 1,
      resolvedQuestionIndex + 1
    );
    trackFormActivity('quiz_taker', 'next_question', {
      questionnaire: selectedQuestionnaireId || selectedQuestionnaire.metadata.quality,
      question: nextIndex + 1,
    });
    updateQuizUrl(
      selectedQuestionnaireId || selectedQuestionnaire.metadata.quality,
      nextIndex,
      activeReturnUrl
    );
  };

  const handleResumePausedQuiz = async () => {
    const targetQuestionnaireId =
      (selectedQuestionnaireId && pausedQuestionnaireIds.has(selectedQuestionnaireId)
        ? selectedQuestionnaireId
        : pausedSessions[0]?.questionnaireId) || null;
    if (!targetQuestionnaireId) return;

    resumeInFlightRef.current = true;
    const resumed = await resumeSession(targetQuestionnaireId);
    if (!resumed) {
      resumeInFlightRef.current = false;
      return;
    }
    const questionnaire = questionnaires.find(
      (item) => getQuestionnaireRuntimeId(item) === resumed.questionnaireId
    );
    if (!questionnaire) {
      resumeInFlightRef.current = false;
      return;
    }
    trackFormActivity('quiz_taker', 'resume', {
      questionnaire: getQuestionnaireRuntimeId(questionnaire),
    });
    updateQuizUrl(
      getQuestionnaireRuntimeId(questionnaire),
      resumed.currentQuestionIndex,
      parseReturnUrl(resumed.returnUrl) || DEFAULT_RETURN_URL
    );
  };

  const handleBackToQuestionnaireList = async () => {
    if (session?.status === 'active') {
      await pauseSession();
    }
    trackFormActivity('quiz_taker', 'back_to_return_url', {
      returnUrl: focusedReturnUrl,
    });
    navigateToReturnUrl(focusedReturnUrl);
  };

  const openDashboard = () => {
    void navigate({ to: '/dashboard' });
  };

  const handleSelectQuestionnaire = async (questionnaire: Questionnaire) => {
    const questionnaireId = getQuestionnaireRuntimeId(questionnaire);
    const resumedFromPause = pausedQuestionnaireIds.has(questionnaireId);
    const created = await createSession(questionnaire, {
      returnUrl: DEFAULT_RETURN_URL,
    });
    updateQuizUrl(
      questionnaireId,
      created.currentQuestionIndex,
      parseReturnUrl(created.returnUrl) || DEFAULT_RETURN_URL
    );
    trackFormActivity('questionnaire_list', 'start_quiz', {
      questionnaire: questionnaireId,
      source: resumedFromPause ? 'paused' : 'new',
    });
  };

  const handleUserSetup = async (name: string, role: UserRole) => {
    await saveUser(name, role);
    trackFormActivity('user_setup', 'submit', { role });
  };

  const handleRestoreFromBackup = async (file: File) => {
    await restoreFromBackup(file);
  };

  const handleRestoreFromArchive = async (archiveId: string) => {
    await restoreFromArchive(archiveId);
  };

  const handleComplete = async () => {
    if (!selectedQuestionnaire) return;

    const completed = await completeSession(selectedQuestionnaire);
    trackFormActivity('quiz_taker', 'complete', {
      questionnaire: selectedQuestionnaireId || selectedQuestionnaire.metadata.quality,
    });
    if (activeReturnUrl !== DEFAULT_RETURN_URL) {
      const completedReturnUrl = withFocusReturnUrl(activeReturnUrl, {
        focusResultId: completed?.id,
        focusResultAt: completed?.completedAt,
        defaultTab: 'results',
      });
      navigateToReturnUrl(completedReturnUrl, true);
    } else {
      clearQuizUrl(true);
      openDashboard();
    }
  };

  const handlePause = async () => {
    await pauseSession();
    trackFormActivity('quiz_taker', 'pause');
    navigateToReturnUrl(focusedReturnUrl);
  };

  const handleAnswerUpdate = (questionId: string, details: AnswerDetails) => {
    updateAnswer(questionId, details);
  };

  if (userLoading || sessionLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <UserSetup
        onSubmit={handleUserSetup}
        onImportBackup={handleRestoreFromBackup}
        archivedUsers={archivedUsers}
        onRestoreArchivedUser={handleRestoreFromArchive}
      />
    );
  }

  // Curator view
  if (user.role === 'curator' && isRoleEnabled('curator')) {
    return <CuratorDashboard />;
  }

  if (user.role === 'admin' && isAdminFeaturesEnabled()) {
    return <AdminDashboard />;
  }

  // Student taking quiz
  if (isQuizSessionActive && selectedQuestionnaire && session) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <button
            type="button"
            onClick={() => void handleBackToQuestionnaireList()}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">{t('common.back')}</span>
          </button>
        </div>
        
        <QuizTaker
          questionnaire={selectedQuestionnaire}
          currentQuestionIndex={resolvedQuestionIndex}
          answers={session.answers}
          onAnswer={handleAnswerUpdate}
          onNext={handleNextQuestion}
          onPrev={handlePrevQuestion}
          onPause={handlePause}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  // Student dashboard
  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('quiz.title', { name: user.name })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
          {t('quiz.subtitle')}
        </p>
      </div>

      {pausedSessions.length > 0 && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm md:text-base">
                {t('quiz.paused.title')}
              </p>
              <p className="text-xs md:text-sm text-yellow-700 dark:text-yellow-300">
                {t('quiz.paused.description')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleResumePausedQuiz();
              }}
              className="px-3 py-2 md:px-4 md:py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm md:text-base whitespace-nowrap"
            >
              {t('quiz.paused.continue')}
            </button>
          </div>
        </div>
      )}

      <QuestionnaireList
        questionnaires={questionnaires}
        loading={questionnairesLoading}
        serverStatus={serverStatus}
        pausedQuestionnaireIds={pausedQuestionnaireIds}
        onRetryLoad={() => {
          void retryLoad();
        }}
        onSelect={handleSelectQuestionnaire}
      />
    </div>
  );
}
