import { viewports } from './_viewports.mjs';
import { profiles } from './_profiles.mjs';
import { actions } from './_actions.mjs';

import { scenarios as stu01 } from './stu-01-setup.mjs';
import { scenarios as stu03 } from './stu-03-profile.mjs';
import { scenarios as stu04 } from './stu-04-list.mjs';
import { scenarios as stu05 } from './stu-05-quiz.mjs';
import { scenarios as stu06 } from './stu-06-paused.mjs';
import { scenarios as stu07 } from './stu-07-results.mjs';
import { scenarios as stu09 } from './stu-09-feedback.mjs';
import { scenarios as stu12 } from './stu-12-report.mjs';
import { scenarios as stu13 } from './stu-13-transfer.mjs';
import { scenarios as cur01 } from './cur-01-dashboard.mjs';
import { scenarios as cur03 } from './cur-03-review.mjs';
import { scenarios as adm01 } from './adm-01-admin.mjs';

const scenarios = [
  ...stu01,
  ...stu03,
  ...stu04,
  ...stu05,
  ...stu06,
  ...stu07,
  ...stu09,
  ...stu12,
  ...stu13,
  ...cur01,
  ...cur03,
  ...adm01,
];

export default {
  version: '2.0.0',
  updatedAt: '2026-02-13',
  description: 'Modular .mjs scenario pack for spiritual-questionnaire Playwright flows.',
  viewports,
  profiles,
  actions,
  scenarios,
};
