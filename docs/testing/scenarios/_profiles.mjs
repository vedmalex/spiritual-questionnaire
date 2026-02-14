// Questionnaire constants (stable, do not change between runs)
const Q = {
  id: 'dama',
  title: 'Дама — Самообладание: Владение чувствами',
  questionA: 'dama_01_manifestation_in_activity',
  questionB: 'dama_02_turtle_method',
};

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function createUser(role, name) {
  return {
    name,
    role,
    createdAt: NOW - DAY,
    theme: 'light',
    language: 'ru',
  };
}

function buildResult({
  id,
  userName,
  userRole,
  scoreA,
  scoreB,
  completedAt,
  reviewStatus,
  assignedCurator,
  withFeedback,
}) {
  const feedbackThread = withFeedback
    ? [
        {
          id: `${id}_feedback_curator`,
          curatorName: assignedCurator,
          questionId: Q.questionA,
          comment: 'Проверь, пожалуйста, конкретный шаг практики.',
          timestamp: completedAt + 1000,
          authorRole: 'curator',
          authorName: assignedCurator,
        },
        {
          id: `${id}_feedback_student`,
          curatorName: userName,
          questionId: Q.questionA,
          comment: 'Добавил уточнение и новый комментарий к ответу.',
          timestamp: completedAt + 2000,
          authorRole: 'student',
          authorName: userName,
        },
      ]
    : [];

  const totalScore = scoreA + scoreB;
  const maxPossibleScore = 20;

  return {
    id,
    questionnaireId: Q.id,
    questionnaireTitle: Q.title,
    userName,
    userRole,
    completedAt,
    answers: {
      [Q.questionA]: {
        score: scoreA,
        comment: `Комментарий студента по вопросу ${Q.questionA}`,
        photos: [],
        curatorFeedback: feedbackThread,
      },
      [Q.questionB]: {
        score: scoreB,
        comment: `Комментарий студента по вопросу ${Q.questionB}`,
        photos: [],
        curatorFeedback: [],
      },
    },
    totalScore,
    maxPossibleScore,
    percentage: Math.round((totalScore / maxPossibleScore) * 100),
    reviewStatus,
    assignedCurator,
    reviewCompletedAt:
      reviewStatus === 'reviewed' || reviewStatus === 'needs_revision'
        ? completedAt + 3000
        : undefined,
    absentInCurrentSchemaQuestionIds: [],
  };
}

// --- Seed data ---

const studentName = 'Студент Поток';
const curatorName = 'Куратор Поток';

const reviewedStudent = buildResult({
  id: 'seed_student_result_1',
  userName: studentName,
  userRole: 'student',
  scoreA: 5,
  scoreB: 6,
  completedAt: NOW - 7 * DAY,
  reviewStatus: 'reviewed',
  assignedCurator: curatorName,
  withFeedback: false,
});

const revisionStudent = buildResult({
  id: 'seed_student_result_2',
  userName: studentName,
  userRole: 'student',
  scoreA: 7,
  scoreB: 8,
  completedAt: NOW - 2 * DAY,
  reviewStatus: 'needs_revision',
  assignedCurator: curatorName,
  withFeedback: true,
});

const curatorPending = buildResult({
  id: 'seed_curator_result_pending',
  userName: 'Студент Курируемый',
  userRole: 'student',
  scoreA: 4,
  scoreB: 5,
  completedAt: NOW - 3 * DAY,
  reviewStatus: 'pending',
  assignedCurator: curatorName,
  withFeedback: false,
});

const curatorReviewed = buildResult({
  id: 'seed_curator_result_reviewed',
  userName: 'Студент Курируемый',
  userRole: 'student',
  scoreA: 6,
  scoreB: 6,
  completedAt: NOW - 5 * DAY,
  reviewStatus: 'reviewed',
  assignedCurator: curatorName,
  withFeedback: true,
});

const pausedSession = {
  id: 'seed_paused_session_1',
  questionnaireId: Q.id,
  userName: studentName,
  userRole: 'student',
  startTime: NOW - 60 * 60 * 1000,
  lastActivity: NOW - 30 * 60 * 1000,
  currentQuestionIndex: 1,
  answers: {
    [Q.questionA]: {
      score: 6,
      comment: 'Черновой комментарий в paused-сессии',
      photos: [],
      curatorFeedback: [],
    },
  },
  status: 'paused',
  returnUrl: '/',
};

// --- Profiles in localStorage format ---

export const profiles = {
  anonymous: {
    localStorage: {
      'app-language': 'ru',
    },
  },

  student_clean: {
    localStorage: {
      'app-language': 'ru',
      spiritual_questionnaire_user: createUser('student', studentName),
      spiritual_questionnaire_results_student: [],
      spiritual_questionnaire_results_curator: [],
      spiritual_questionnaire_paused_sessions: [],
    },
  },

  student_with_results: {
    localStorage: {
      'app-language': 'ru',
      spiritual_questionnaire_user: createUser('student', studentName),
      spiritual_questionnaire_results_student: [revisionStudent, reviewedStudent],
      spiritual_questionnaire_results_curator: [],
      spiritual_questionnaire_paused_sessions: [],
    },
  },

  student_with_paused: {
    localStorage: {
      'app-language': 'ru',
      spiritual_questionnaire_user: createUser('student', studentName),
      spiritual_questionnaire_results_student: [],
      spiritual_questionnaire_results_curator: [],
      spiritual_questionnaire_paused_sessions: [pausedSession],
    },
  },

  curator_with_results: {
    localStorage: {
      'app-language': 'ru',
      spiritual_questionnaire_user: createUser('curator', curatorName),
      spiritual_questionnaire_results_student: [],
      spiritual_questionnaire_results_curator: [curatorPending, curatorReviewed],
      spiritual_questionnaire_paused_sessions: [],
    },
  },

  admin_clean: {
    localStorage: {
      'app-language': 'ru',
      spiritual_questionnaire_user: createUser('admin', 'Админ Поток'),
      spiritual_questionnaire_results_student: [],
      spiritual_questionnaire_results_curator: [],
      spiritual_questionnaire_paused_sessions: [],
    },
  },
};
