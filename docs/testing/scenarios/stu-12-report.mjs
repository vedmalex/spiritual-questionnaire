export const scenarios = [
  {
    id: 'PW-FLOW-STU-12-REPORT-DESKTOP',
    flowIds: ['STU-12'],
    profile: 'student_with_results',
    path: '/dashboard',
    action: 'open_first_report_preview',
    viewport: 'desktop',
    requiredText: ['Отчет по оценке:', 'Предпросмотр отчета'],
    screenshot: 'stu-12-report-preview-desktop.png',
  },
];
