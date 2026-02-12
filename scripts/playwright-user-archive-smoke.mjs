import { chromium } from 'playwright';

const baseUrl = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function clickFirstVisible(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      return true;
    }
  }
  return false;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#name', { timeout: 60000 });

    const profileName = `Smoke User ${nowTag()}`;
    await page.fill('#name', profileName);
    await page.click('button[type="submit"]');

    const started = await clickFirstVisible(
      page.locator('button').filter({ hasText: /Начать опрос|Start Quiz/i })
    );
    if (!started) {
      throw new Error('Start quiz button is not available.');
    }

    await page.locator('button').filter({ hasText: /^5$/ }).first().click();

    const addCommentButton = page
      .locator('button')
      .filter({ hasText: /Добавить комментарий|Add comment/i })
      .first();
    if (await addCommentButton.isVisible().catch(() => false)) {
      await addCommentButton.click();
    }

    const proseMirror = page.locator('.ProseMirror').first();
    const textarea = page.locator('textarea').first();

    if (await proseMirror.isVisible().catch(() => false)) {
      await proseMirror.click();
      await page.keyboard.type('abcd');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.type('X');
    } else if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('abXcd');
    } else {
      throw new Error('Comment editor is not available.');
    }

    const textContent = await page.evaluate(
      () => document.querySelector('.ProseMirror')?.textContent || document.querySelector('textarea')?.value || ''
    );
    if (!textContent.includes('abXcd')) {
      throw new Error(`Unexpected editor text after inline edit: ${textContent}`);
    }

    const nextButton = page.locator('button').filter({ hasText: /Далее|Next/i }).first();
    await nextButton.waitFor({ state: 'visible', timeout: 10000 });
    if (!(await nextButton.isEnabled())) {
      throw new Error('Next button remains disabled after comment edit.');
    }

    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await page.locator('button').filter({ hasText: /Выйти|Logout/i }).first().click();

    await page.locator('button').filter({ hasText: /Выйти|Logout/i }).first().waitFor({ state: 'visible' });

    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount += 1;
      await dialog.accept();
    });
    await page.locator('button').filter({ hasText: /Выйти|Logout/i }).first().click();

    await page.waitForSelector('#name', { timeout: 30000 });
    if (dialogCount < 2) {
      throw new Error('Logout did not trigger both confirm and warning dialogs.');
    }

    const restoreButton = page
      .locator('button')
      .filter({ hasText: /Войти как|Continue as/i })
      .first();
    await restoreButton.waitFor({ state: 'visible', timeout: 10000 });
    await restoreButton.click();

    await page
      .locator('h1')
      .filter({ hasText: /Привет|Hello/i })
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    console.log('Playwright archive smoke: OK');
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error('Playwright archive smoke failed:', error);
  process.exit(1);
});
