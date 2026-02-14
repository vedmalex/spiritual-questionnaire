export const actions = {
  open_first_quiz_question: {
    runCode: `{
  const btn = page.getByRole('button', { name: /Начать опрос|Start Quiz|Продолжить|Continue/i }).first();
  await btn.waitFor({ state: 'visible', timeout: 20000 });
  await btn.click();
  await page.waitForSelector('h2', { timeout: 20000 });
  const help = page.getByRole('button', { name: /Показать подсказки|Show self-check prompts/i });
  if (await help.count()) { await help.first().click() }
  await page.waitForTimeout(400);
}`,
    allowCliError: true,
  },

  open_first_report_preview: {
    runCode: `{
  const reportBtn = page.getByRole('button', { name: /Подготовить отчет по оценке|Prepare attempt report/i }).first();
  await reportBtn.waitFor({ state: 'visible', timeout: 20000 });
  await reportBtn.click();
  await page.locator('iframe').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(400);
}`,
    allowCliError: true,
  },

  open_first_curator_review: {
    runCode: `{
  const reviewBtn = page.getByRole('button', { name: /Проверить|Review/i }).first();
  await reviewBtn.waitFor({ state: 'visible', timeout: 20000 });
  await reviewBtn.click();
  await page.waitForSelector('button', { timeout: 20000 });
  await page.waitForTimeout(400);
}`,
    allowCliError: true,
  },

  open_first_feedback_question: {
    runCode: `{
  const openQuestionBtn = page.getByRole('button', { name: /Открыть вопрос|Open question/i }).first();
  await openQuestionBtn.waitFor({ state: 'visible', timeout: 20000 });
  await openQuestionBtn.click();
  await page.waitForSelector('h2', { timeout: 20000 });
  await page.waitForTimeout(400);
}`,
    allowCliError: true,
  },
};
