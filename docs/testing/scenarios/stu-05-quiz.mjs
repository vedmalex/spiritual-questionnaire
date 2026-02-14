export const scenarios = [
  {
    id: 'PW-FLOW-STU-05-QUIZ-DESKTOP',
    flowIds: ['STU-05'],
    profile: 'student_clean',
    path: '/',
    action: 'open_first_quiz_question',
    viewport: 'desktop',
    requiredText: ['Источники:', 'Выберите оценку:'],
    screenshot: 'stu-05-quiz-desktop.png',
  },
  {
    id: 'PW-FLOW-STU-05-QUIZ-MOBILE',
    flowIds: ['STU-05'],
    profile: 'student_clean',
    path: '/',
    action: 'open_first_quiz_question',
    viewport: 'mobile',
    requiredText: ['Источники:', 'Выберите оценку:'],
    screenshot: 'stu-05-quiz-mobile.png',
  },
];
