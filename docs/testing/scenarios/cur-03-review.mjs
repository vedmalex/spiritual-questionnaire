export const scenarios = [
  {
    id: 'PW-FLOW-CUR-03-REVIEW-DESKTOP',
    flowIds: ['CUR-03', 'CUR-04'],
    profile: 'curator_with_results',
    path: '/dashboard',
    action: 'open_first_curator_review',
    viewport: 'desktop',
    requiredText: ['Отметить как проверено', 'Отправить на доработку'],
    screenshot: 'cur-03-review-expanded-desktop.png',
  },
];
