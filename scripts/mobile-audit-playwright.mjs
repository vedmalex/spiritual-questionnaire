import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.MOBILE_AUDIT_BASE_URL || 'http://127.0.0.1:4173';
const outputDir = path.resolve(
  process.cwd(),
  'memory-bank/system/mobile-audit-artifacts/2026-02-11'
);
const sampleImagePath = path.resolve(process.cwd(), 'public/logo192.png');

const profiles = [
  {
    id: 'w320',
    label: '320x640',
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  {
    id: 'w375',
    label: '375x812',
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
  {
    id: 'w768',
    label: '768x1024',
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
];

async function bootstrapUser(page, role) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#name', { timeout: 60000 });

  if (role === 'admin') {
    const roleButtons = page.locator('form .grid button[type="button"]');
    await roleButtons.nth(2).click();
  }

  await page.fill('#name', role === 'admin' ? 'Admin Mobile' : 'Student Mobile');
  await page.click('button[type="submit"]');
}

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: true,
  });
}

async function runStudentFlow(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: profile.deviceScaleFactor,
  });

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#name', { timeout: 60000 });
  await screenshot(page, `${profile.id}-student-setup`);

  await bootstrapUser(page, 'student');

  const startButton = page
    .locator('button')
    .filter({ hasText: /Начать опрос|Start Quiz/i })
    .first();
  await startButton.waitFor({ state: 'visible' });
  await screenshot(page, `${profile.id}-student-list`);

  await startButton.click();
  await page.waitForSelector('h2');

  const scoreFive = page
    .locator('button')
    .filter({ hasText: /^5$/ })
    .first();
  await scoreFive.click();

  await page.setInputFiles('input[type="file"][accept="image/*"]', sampleImagePath);
  await page.waitForTimeout(400);

  await screenshot(page, `${profile.id}-student-quiz-photo`);
  await context.close();
}

async function runAdminFlow(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: profile.deviceScaleFactor,
  });

  const page = await context.newPage();
  await bootstrapUser(page, 'admin');

  await page.waitForURL('**/');
  await page.waitForTimeout(1000);
  await screenshot(page, `${profile.id}-admin-dashboard`);

  await page.goto(`${baseUrl}/editor`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  const addQuestionButton = page
    .locator('button')
    .filter({ hasText: /Добавить вопрос|Add question/i })
    .first();
  await addQuestionButton.click();
  await screenshot(page, `${profile.id}-admin-editor`);

  await page.goto(`${baseUrl}/translations`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  const loadCurrentButton = page
    .locator('button')
    .filter({ hasText: /Подгрузить текущие|Load current/i })
    .first();
  await loadCurrentButton.click();
  await screenshot(page, `${profile.id}-admin-translations`);

  await context.close();
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const profile of profiles) {
      console.log(`Running mobile audit profile: ${profile.label}`);
      await runStudentFlow(browser, profile);
      await runAdminFlow(browser, profile);
    }
  } finally {
    await browser.close();
  }

  console.log(`Mobile audit screenshots saved to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
