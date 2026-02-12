import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
const outputDir = path.resolve(
  process.cwd(),
  'output/playwright/2026-02-12-task-046-header-ultrasmall'
);

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#name', { timeout: 60000 });

    const profileName = 'Ultra Header User';
    await page.fill('#name', profileName);
    await page.click('button[type="submit"]');

    await page
      .locator('h1')
      .filter({ hasText: /Привет|Hello/i })
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    const brandText = page
      .locator('header a[aria-label]')
      .first()
      .locator('span', { hasText: 'Spiritual Self-Assessment' });
    const brandIcon = page.locator('header [title="Spiritual Self-Assessment"]').first();

    await brandIcon.waitFor({ state: 'visible', timeout: 10000 });
    assertCondition(!(await brandText.isVisible().catch(() => false)), 'Brand text should be hidden on ultra-small viewport.');

    const visibleProfileButtons = page.locator('header [data-profile-menu-root="true"] > button:visible');
    const visibleButtonsCount = await visibleProfileButtons.count();
    assertCondition(visibleButtonsCount === 1, `Expected exactly one visible profile button, got ${visibleButtonsCount}.`);

    const profileButton = visibleProfileButtons.first();
    const profileButtonText = (await profileButton.innerText()).replace(/\s+/g, ' ').trim();
    assertCondition(profileButtonText.includes(profileName), 'Visible profile button should include user name.');
    assertCondition(!profileButtonText.includes('•'), 'Ultra-small visible profile button should not include role marker.');

    const roleControl = page
      .locator('button')
      .filter({ hasText: /Студент|Student/i })
      .first();
    await roleControl.waitFor({ state: 'visible', timeout: 10000 });

    const profileButtonBox = await profileButton.boundingBox();
    const roleControlBox = await roleControl.boundingBox();
    assertCondition(Boolean(profileButtonBox), 'Could not read profile button bounds.');
    assertCondition(Boolean(roleControlBox), 'Could not read role control bounds.');
    assertCondition(
      profileButtonBox.y < roleControlBox.y,
      'Profile button should be positioned in the top row above controls on ultra-small viewport.'
    );

    await page.screenshot({
      path: path.join(outputDir, 'header-ultrasmall-320.png'),
      fullPage: true,
    });

    const report = {
      baseUrl,
      viewport: { width: 320, height: 640 },
      checks: {
        brandIconVisible: true,
        brandTextHidden: true,
        profileNameInTopRow: true,
        profileRoleHiddenInCompactMode: true,
      },
    };
    await fs.writeFile(
      path.join(outputDir, 'assert-header-ultrasmall.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    );

    await fs.writeFile(path.join(outputDir, 'console-errors.log'), '', 'utf8');
    console.log('Playwright ultra-small header smoke: OK');
  } catch (error) {
    await fs.writeFile(
      path.join(outputDir, 'console-errors.log'),
      `${String(error)}\n`,
      'utf8'
    );
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Playwright ultra-small header smoke failed:', error);
  process.exit(1);
});
