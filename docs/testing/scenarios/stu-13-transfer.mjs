export const scenarios = [
  {
    id: 'PW-FLOW-STU-13-TRANSFER-DESKTOP',
    flowIds: ['STU-13'],
    profile: 'student_with_results',
    path: '/profile',
    viewport: 'desktop',
    requiredText: ['Параметры обмена', 'Выйти и сохранить файл профиля'],
    screenshot: 'stu-13-transfer-desktop.png',
  },
  {
    id: 'PW-FLOW-STU-13-TRANSFER-MOBILE',
    flowIds: ['STU-13'],
    profile: 'student_with_results',
    path: '/profile',
    viewport: 'mobile',
    requiredText: ['Параметры обмена', 'Выйти и сохранить файл профиля'],
    screenshot: 'stu-13-transfer-mobile.png',
  },
];
