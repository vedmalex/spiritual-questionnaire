export const scenarios = [
  {
    id: 'PW-FLOW-STU-09-FEEDBACK-DESKTOP',
    flowIds: ['STU-09'],
    profile: 'student_with_results',
    path: '/dashboard?tab=feedback',
    viewport: 'desktop',
    requiredText: ['Обратная связь куратора', 'Переписка'],
    screenshot: 'stu-09-feedback-desktop.png',
  },
  {
    id: 'PW-FLOW-STU-10-REVISION-DESKTOP',
    flowIds: ['STU-10'],
    profile: 'student_with_results',
    path: '/dashboard?tab=feedback',
    action: 'open_first_feedback_question',
    viewport: 'desktop',
    requiredText: ['Источники:', 'Выберите оценку:'],
    screenshot: 'stu-10-revision-desktop.png',
  },
];
