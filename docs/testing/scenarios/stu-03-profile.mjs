export const scenarios = [
  {
    id: 'PW-FLOW-STU-03-PROFILE-DESKTOP',
    flowIds: ['STU-03'],
    profile: 'student_clean',
    path: '/profile',
    viewport: 'desktop',
    requiredText: ['Профиль и настройки', 'Сохранить имя'],
    screenshot: 'stu-03-profile-desktop.png',
  },
  {
    id: 'PW-FLOW-STU-03-PROFILE-MOBILE',
    flowIds: ['STU-03'],
    profile: 'student_clean',
    path: '/profile',
    viewport: 'mobile',
    requiredText: ['Профиль и настройки', 'Сохранить имя'],
    screenshot: 'stu-03-profile-mobile.png',
  },
];
