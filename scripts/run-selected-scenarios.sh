#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

show_help() {
  cat <<'EOF'
Usage: scripts/run-selected-scenarios.sh [OPTIONS]

Generate screenshots for selected Playwright flow scenarios.

Options:
  --flow-ids <IDs>       Comma-separated flow IDs (e.g., STU-05,STU-09,STU-10)
  --scenario-ids <IDs>   Comma-separated scenario IDs (e.g., PW-FLOW-STU-05-QUIZ-DESKTOP)
  --screenshots <FILES>  Comma-separated screenshot filenames (e.g., stu-05-quiz-desktop.png)
  --all                  Run all scenarios (default if no filter specified)
  --help, -h             Show this help message

Environment variables:
  PW_BASE_URL           Base URL for the app (default: http://localhost:3000)
  PW_FLOW_SCENARIOS_FILE Scenarios JSON file (default: docs/testing/playwright-cli-flow-scenarios.json)

Examples:
  # Generate specific screenshots by filename
  scripts/run-selected-scenarios.sh --screenshots "stu-05-quiz-desktop.png,stu-05-quiz-mobile.png"

  # Generate all screenshots for specific flows
  scripts/run-selected-scenarios.sh --flow-ids "STU-05,STU-09,STU-10,STU-12,CUR-03"

  # Generate specific scenario by ID
  scripts/run-selected-scenarios.sh --scenario-ids "PW-FLOW-STU-05-QUIZ-DESKTOP"

  # Generate all scenarios
  scripts/run-selected-scenarios.sh --all

Missing screenshots from user-manual.md:
  - stu-05-quiz-desktop.png
  - stu-05-quiz-mobile.png
  - stu-09-feedback-desktop.png
  - stu-10-revision-desktop.png
  - stu-12-report-preview-desktop.png
  - cur-03-review-expanded-desktop.png

To regenerate only missing screenshots:
  scripts/run-selected-scenarios.sh --screenshots "stu-05-quiz-desktop.png,stu-05-quiz-mobile.png,stu-09-feedback-desktop.png,stu-10-revision-desktop.png,stu-12-report-preview-desktop.png,cur-03-review-expanded-desktop.png"

EOF
}

FLOW_IDS=""
SCENARIO_IDS=""
SCREENSHOTS=""
RUN_ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --flow-ids)
      FLOW_IDS="$2"
      shift 2
      ;;
    --scenario-ids)
      SCENARIO_IDS="$2"
      shift 2
      ;;
    --screenshots)
      SCREENSHOTS="$2"
      shift 2
      ;;
    --all)
      RUN_ALL=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

# If no filter specified, run all
if [[ -z "$FLOW_IDS" && -z "$SCENARIO_IDS" && -z "$SCREENSHOTS" && "$RUN_ALL" == false ]]; then
  echo "No filter specified. Use --all to run all scenarios, or see --help for filtering options." >&2
  show_help
  exit 1
fi

# Export environment variables for the main script
export PW_BASE_URL="${PW_BASE_URL:-http://localhost:3000}"

if [[ -n "$FLOW_IDS" ]]; then
  export PW_FLOW_IDS="$FLOW_IDS"
  echo "Running scenarios with flow IDs: $FLOW_IDS"
elif [[ -n "$SCENARIO_IDS" ]]; then
  export PW_SCENARIO_IDS="$SCENARIO_IDS"
  echo "Running scenarios with IDs: $SCENARIO_IDS"
elif [[ -n "$SCREENSHOTS" ]]; then
  export PW_SCREENSHOTS="$SCREENSHOTS"
  echo "Running scenarios with screenshots: $SCREENSHOTS"
else
  echo "Running all scenarios"
fi

# Check if dev server is running
if ! curl -sSf "$PW_BASE_URL/" >/dev/null 2>&1; then
  echo "Dev server not running at $PW_BASE_URL"
  echo "Starting dev server..."
  npm run dev >/tmp/spiritual-scenarios-dev.log 2>&1 &
  SERVER_PID=$!

  cleanup() {
    if [[ -n "${SERVER_PID:-}" ]]; then
      kill "$SERVER_PID" >/dev/null 2>&1 || true
    fi
  }
  trap cleanup EXIT

  for i in $(seq 1 60); do
    if curl -sSf "$PW_BASE_URL/" >/dev/null 2>&1; then
      echo "Dev server started successfully"
      break
    fi
    sleep 1
    if [[ "$i" -eq 60 ]]; then
      echo "Dev server failed to start" >&2
      tail -n 50 /tmp/spiritual-scenarios-dev.log >&2 || true
      exit 1
    fi
  done
fi

# Run the main script
node scripts/playwright-flow-scenarios.mjs

echo ""
echo "Screenshots generated in: output/playwright/2026-02-12-task-060-playwright-cli-flow-scenarios/screenshots/"
echo "Report: output/playwright/2026-02-12-task-060-playwright-cli-flow-scenarios/report.md"
