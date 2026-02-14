#!/usr/bin/env bash
set -euo pipefail

# Generate missing screenshots for user manual documentation
# By default, saves to docs/guides/assets/user-manual/
# Override with PW_OUTPUT_DIR environment variable

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"

if [[ ! -x "$PWCLI" ]]; then
  echo "Error: playwright-cli wrapper not found at $PWCLI" >&2
  exit 1
fi

BASE_URL="${PW_BASE_URL:-http://localhost:3000}"
OUTPUT_DIR="${PW_OUTPUT_DIR:-docs/guides/assets/user-manual}"
mkdir -p "$OUTPUT_DIR"

# Helper functions
make_user() {
  local role="$1"
  local name="$2"
  node -e "console.log(JSON.stringify({
    name: '$name',
    role: '$role',
    createdAt: Date.now() - 86400000,
    theme: 'light',
    language: 'ru'
  }))"
}

make_result() {
  local qid="$1"
  local qtitle="$2"
  local qa="$3"
  local qb="$4"
  node -e "
  const now = Date.now();
  const result = {
    id: 'result_' + Date.now(),
    questionnaireId: '$qid',
    questionnaireTitle: '$qtitle',
    userName: 'Студент Поток',
    userRole: 'student',
    completedAt: now - 172800000,
    answers: {
      '$qa': {
        score: 7,
        comment: 'Комментарий студента по вопросу $qa',
        photos: [],
        curatorFeedback: [{
          id: 'feedback_1',
          curatorName: 'Куратор Поток',
          questionId: '$qa',
          comment: 'Проверь, пожалуйста, конкретный шаг практики.',
          timestamp: now - 86400000,
          authorRole: 'curator',
          authorName: 'Куратор Поток'
        }]
      },
      '$qb': {
        score: 8,
        comment: 'Комментарий студента по вопросу $qb',
        photos: [],
        curatorFeedback: []
      }
    },
    totalScore: 15,
    maxPossibleScore: 20,
    percentage: 75,
    reviewStatus: 'needs_revision',
    assignedCurator: 'Куратор Поток',
    reviewCompletedAt: now - 43200000,
    absentInCurrentSchemaQuestionIds: []
  };
  console.log(JSON.stringify(result));
  "
}

make_curator_result() {
  local qid="$1"
  local qtitle="$2"
  local qa="$3"
  local qb="$4"
  node -e "
  const now = Date.now();
  const result = {
    id: 'curator_result_' + Date.now(),
    questionnaireId: '$qid',
    questionnaireTitle: '$qtitle',
    userName: 'Студент Курируемый',
    userRole: 'student',
    completedAt: now - 259200000,
    answers: {
      '$qa': {
        score: 4,
        comment: 'Комментарий курируемого студента',
        photos: [],
        curatorFeedback: []
      },
      '$qb': {
        score: 5,
        comment: 'Еще один комментарий',
        photos: [],
        curatorFeedback: []
      }
    },
    totalScore: 9,
    maxPossibleScore: 20,
    percentage: 45,
    reviewStatus: 'pending',
    assignedCurator: 'Куратор Поток',
    absentInCurrentSchemaQuestionIds: []
  };
  console.log(JSON.stringify(result));
  "
}

# Get questionnaire context
QID=$(node -e "
const fs = require('fs');
const index = JSON.parse(fs.readFileSync('public/questionnaires/index.json', 'utf8'));
const q = JSON.parse(fs.readFileSync('public/questionnaires/' + index[0], 'utf8'));
console.log(q.metadata.quality);
")

QTITLE=$(node -e "
const fs = require('fs');
const index = JSON.parse(fs.readFileSync('public/questionnaires/index.json', 'utf8'));
const q = JSON.parse(fs.readFileSync('public/questionnaires/' + index[0], 'utf8'));
const t = q.metadata.title;
console.log(typeof t === 'string' ? t : (t.ru || t.en || Object.values(t)[0]));
")

QA=$(node -e "
const fs = require('fs');
const index = JSON.parse(fs.readFileSync('public/questionnaires/index.json', 'utf8'));
const q = JSON.parse(fs.readFileSync('public/questionnaires/' + index[0], 'utf8'));
console.log(q.questions[0].id);
")

QB=$(node -e "
const fs = require('fs');
const index = JSON.parse(fs.readFileSync('public/questionnaires/index.json', 'utf8'));
const q = JSON.parse(fs.readFileSync('public/questionnaires/' + index[0], 'utf8'));
console.log(q.questions[1]?.id || q.questions[0].id);
")

echo "Questionnaire context: QID=$QID, TITLE=$QTITLE, QA=$QA, QB=$QB"

# Screenshot 1 & 2: STU-05-QUIZ (Desktop + Mobile)
echo ""
echo "=== Generating stu-05-quiz-desktop.png ==="
SESSION="stu-05-desktop"
"$PWCLI" --session "$SESSION" close-all >/dev/null 2>&1 || true
"$PWCLI" --session "$SESSION" open "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-clear >/dev/null || true
"$PWCLI" --session "$SESSION" localstorage-set app-language ru >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_user "$(make_user student 'Студент Поток')" >/dev/null
"$PWCLI" --session "$SESSION" resize 1366 900 >/dev/null
"$PWCLI" --session "$SESSION" goto "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" snapshot >/dev/null

# Click "Начать опрос"
"$PWCLI" --session "$SESSION" run-code "{
  const btn = page.getByRole('button', { name: /Начать опрос|Start Quiz|Продолжить|Continue/i }).first();
  await btn.waitFor({ state: 'visible', timeout: 20000 });
  await btn.click();
  await page.waitForTimeout(2000);
}" >/dev/null 2>&1 || echo "Warning: Could not click start button"

# Click "Показать подсказки"
"$PWCLI" --session "$SESSION" run-code "{
  const help = page.getByRole('button', { name: /Показать подсказки|Show self-check prompts/i });
  if (await help.count() > 0) {
    await help.first().click();
    await page.waitForTimeout(500);
  }
}" >/dev/null 2>&1 || echo "Warning: Could not click help button"

SCREENSHOT_OUT=$("$PWCLI" --session "$SESSION" screenshot 2>&1)
SCREENSHOT_PATH=$(echo "$SCREENSHOT_OUT" | sed -n 's/.*\](\([^)]*\)).*/\1/p' | head -1)
if [[ -n "$SCREENSHOT_PATH" && -f "$SCREENSHOT_PATH" ]]; then
  cp "$SCREENSHOT_PATH" "$OUTPUT_DIR/stu-05-quiz-desktop.png"
  echo "✓ Generated: stu-05-quiz-desktop.png"
else
  echo "✗ Failed to generate: stu-05-quiz-desktop.png"
fi
"$PWCLI" --session "$SESSION" close >/dev/null

echo ""
echo "=== Generating stu-05-quiz-mobile.png ==="
SESSION="stu-05-mobile"
"$PWCLI" --session "$SESSION" close-all >/dev/null 2>&1 || true
"$PWCLI" --session "$SESSION" open "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-clear >/dev/null || true
"$PWCLI" --session "$SESSION" localstorage-set app-language ru >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_user "$(make_user student 'Студент Поток')" >/dev/null
"$PWCLI" --session "$SESSION" resize 390 844 >/dev/null
"$PWCLI" --session "$SESSION" goto "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" snapshot >/dev/null

"$PWCLI" --session "$SESSION" run-code "{
  const btn = page.getByRole('button', { name: /Начать опрос|Start Quiz|Продолжить|Continue/i }).first();
  await btn.waitFor({ state: 'visible', timeout: 20000 });
  await btn.click();
  await page.waitForTimeout(2000);
}" >/dev/null 2>&1 || echo "Warning: Could not click start button"

"$PWCLI" --session "$SESSION" run-code "{
  const help = page.getByRole('button', { name: /Показать подсказки|Show self-check prompts/i });
  if (await help.count() > 0) {
    await help.first().click();
    await page.waitForTimeout(500);
  }
}" >/dev/null 2>&1 || echo "Warning: Could not click help button"

SCREENSHOT_OUT=$("$PWCLI" --session "$SESSION" screenshot 2>&1)
SCREENSHOT_PATH=$(echo "$SCREENSHOT_OUT" | sed -n 's/.*\](\([^)]*\)).*/\1/p' | head -1)
if [[ -n "$SCREENSHOT_PATH" && -f "$SCREENSHOT_PATH" ]]; then
  cp "$SCREENSHOT_PATH" "$OUTPUT_DIR/stu-05-quiz-mobile.png"
  echo "✓ Generated: stu-05-quiz-mobile.png"
else
  echo "✗ Failed to generate: stu-05-quiz-mobile.png"
fi
"$PWCLI" --session "$SESSION" close >/dev/null

# Screenshot 3: STU-09-FEEDBACK
echo ""
echo "=== Generating stu-09-feedback-desktop.png ==="
SESSION="stu-09-feedback"
RESULT=$(make_result "$QID" "$QTITLE" "$QA" "$QB")
"$PWCLI" --session "$SESSION" close-all >/dev/null 2>&1 || true
"$PWCLI" --session "$SESSION" open "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-clear >/dev/null || true
"$PWCLI" --session "$SESSION" localstorage-set app-language ru >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_user "$(make_user student 'Студент Поток')" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_results_student "[$RESULT]" >/dev/null
"$PWCLI" --session "$SESSION" resize 1366 900 >/dev/null
"$PWCLI" --session "$SESSION" goto "$BASE_URL/dashboard?tab=feedback" >/dev/null
"$PWCLI" --session "$SESSION" run-code "await page.waitForTimeout(1500);" >/dev/null 2>&1
"$PWCLI" --session "$SESSION" snapshot >/dev/null

SCREENSHOT_OUT=$("$PWCLI" --session "$SESSION" screenshot 2>&1)
SCREENSHOT_PATH=$(echo "$SCREENSHOT_OUT" | sed -n 's/.*\](\([^)]*\)).*/\1/p' | head -1)
if [[ -n "$SCREENSHOT_PATH" && -f "$SCREENSHOT_PATH" ]]; then
  cp "$SCREENSHOT_PATH" "$OUTPUT_DIR/stu-09-feedback-desktop.png"
  echo "✓ Generated: stu-09-feedback-desktop.png"
else
  echo "✗ Failed to generate: stu-09-feedback-desktop.png"
fi
"$PWCLI" --session "$SESSION" close >/dev/null

# Screenshot 4: STU-10-REVISION
echo ""
echo "=== Generating stu-10-revision-desktop.png ==="
SESSION="stu-10-revision"
"$PWCLI" --session "$SESSION" close-all >/dev/null 2>&1 || true
"$PWCLI" --session "$SESSION" open "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-clear >/dev/null || true
"$PWCLI" --session "$SESSION" localstorage-set app-language ru >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_user "$(make_user student 'Студент Поток')" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_results_student "[$RESULT]" >/dev/null
"$PWCLI" --session "$SESSION" resize 1366 900 >/dev/null
"$PWCLI" --session "$SESSION" goto "$BASE_URL/dashboard?tab=feedback" >/dev/null
"$PWCLI" --session "$SESSION" run-code "await page.waitForTimeout(1500);" >/dev/null 2>&1
"$PWCLI" --session "$SESSION" snapshot >/dev/null

# Click "Открыть вопрос"
"$PWCLI" --session "$SESSION" run-code "{
  const openBtn = page.getByRole('button', { name: /Открыть вопрос|Open question/i }).first();
  await openBtn.waitFor({ state: 'visible', timeout: 20000 });
  await openBtn.click();
  await page.waitForTimeout(2000);
}" >/dev/null 2>&1 || echo "Warning: Could not click open question button"

SCREENSHOT_OUT=$("$PWCLI" --session "$SESSION" screenshot 2>&1)
SCREENSHOT_PATH=$(echo "$SCREENSHOT_OUT" | sed -n 's/.*\](\([^)]*\)).*/\1/p' | head -1)
if [[ -n "$SCREENSHOT_PATH" && -f "$SCREENSHOT_PATH" ]]; then
  cp "$SCREENSHOT_PATH" "$OUTPUT_DIR/stu-10-revision-desktop.png"
  echo "✓ Generated: stu-10-revision-desktop.png"
else
  echo "✗ Failed to generate: stu-10-revision-desktop.png"
fi
"$PWCLI" --session "$SESSION" close >/dev/null

# Screenshot 5: STU-12-REPORT
echo ""
echo "=== Generating stu-12-report-preview-desktop.png ==="
SESSION="stu-12-report"
"$PWCLI" --session "$SESSION" close-all >/dev/null 2>&1 || true
"$PWCLI" --session "$SESSION" open "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-clear >/dev/null || true
"$PWCLI" --session "$SESSION" localstorage-set app-language ru >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_user "$(make_user student 'Студент Поток')" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_results_student "[$RESULT]" >/dev/null
"$PWCLI" --session "$SESSION" resize 1366 900 >/dev/null
"$PWCLI" --session "$SESSION" goto "$BASE_URL/dashboard" >/dev/null
"$PWCLI" --session "$SESSION" run-code "await page.waitForTimeout(1500);" >/dev/null 2>&1
"$PWCLI" --session "$SESSION" snapshot >/dev/null

# Click "Подготовить отчёт"
"$PWCLI" --session "$SESSION" run-code "{
  const reportBtn = page.getByRole('button', { name: /Подготовить отчет|Prepare attempt report/i }).first();
  await reportBtn.waitFor({ state: 'visible', timeout: 20000 });
  await reportBtn.click();
  await page.locator('iframe').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(1000);
}" >/dev/null 2>&1 || echo "Warning: Could not click report button"

SCREENSHOT_OUT=$("$PWCLI" --session "$SESSION" screenshot 2>&1)
SCREENSHOT_PATH=$(echo "$SCREENSHOT_OUT" | sed -n 's/.*\](\([^)]*\)).*/\1/p' | head -1)
if [[ -n "$SCREENSHOT_PATH" && -f "$SCREENSHOT_PATH" ]]; then
  cp "$SCREENSHOT_PATH" "$OUTPUT_DIR/stu-12-report-preview-desktop.png"
  echo "✓ Generated: stu-12-report-preview-desktop.png"
else
  echo "✗ Failed to generate: stu-12-report-preview-desktop.png"
fi
"$PWCLI" --session "$SESSION" close >/dev/null

# Screenshot 6: CUR-03-REVIEW
echo ""
echo "=== Generating cur-03-review-expanded-desktop.png ==="
SESSION="cur-03-review"
CURATOR_RESULT=$(make_curator_result "$QID" "$QTITLE" "$QA" "$QB")
"$PWCLI" --session "$SESSION" close-all >/dev/null 2>&1 || true
"$PWCLI" --session "$SESSION" open "$BASE_URL" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-clear >/dev/null || true
"$PWCLI" --session "$SESSION" localstorage-set app-language ru >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_user "$(make_user curator 'Куратор Поток')" >/dev/null
"$PWCLI" --session "$SESSION" localstorage-set spiritual_questionnaire_results_curator "[$CURATOR_RESULT]" >/dev/null
"$PWCLI" --session "$SESSION" resize 1366 900 >/dev/null
"$PWCLI" --session "$SESSION" goto "$BASE_URL/dashboard" >/dev/null
"$PWCLI" --session "$SESSION" run-code "await page.waitForTimeout(1500);" >/dev/null 2>&1
"$PWCLI" --session "$SESSION" snapshot >/dev/null

# Click "Проверить"
"$PWCLI" --session "$SESSION" run-code "{
  const reviewBtn = page.getByRole('button', { name: /Проверить|Review/i }).first();
  await reviewBtn.waitFor({ state: 'visible', timeout: 20000 });
  await reviewBtn.click();
  await page.waitForTimeout(2000);
}" >/dev/null 2>&1 || echo "Warning: Could not click review button"

SCREENSHOT_OUT=$("$PWCLI" --session "$SESSION" screenshot 2>&1)
SCREENSHOT_PATH=$(echo "$SCREENSHOT_OUT" | sed -n 's/.*\](\([^)]*\)).*/\1/p' | head -1)
if [[ -n "$SCREENSHOT_PATH" && -f "$SCREENSHOT_PATH" ]]; then
  cp "$SCREENSHOT_PATH" "$OUTPUT_DIR/cur-03-review-expanded-desktop.png"
  echo "✓ Generated: cur-03-review-expanded-desktop.png"
else
  echo "✗ Failed to generate: cur-03-review-expanded-desktop.png"
fi
"$PWCLI" --session "$SESSION" close >/dev/null

echo ""
echo "=== Summary ==="
echo "Screenshots saved to: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null | tail -6 || echo "No screenshots found"
