#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required for playwright-cli wrapper. Install Node.js/npm first." >&2
  exit 1
fi

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"

if [[ ! -x "$PWCLI" ]]; then
  echo "playwright-cli wrapper not found: $PWCLI" >&2
  exit 1
fi

BASE_URL="${PW_BASE_URL:-http://localhost:3000}"

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! curl -sSf "$BASE_URL/" >/dev/null 2>&1; then
  npm run dev >/tmp/spiritual-flow-scenarios-dev.log 2>&1 &
  SERVER_PID="$!"

  for i in $(seq 1 60); do
    if curl -sSf "$BASE_URL/" >/dev/null 2>&1; then
      break
    fi
    sleep 1
    if [[ "$i" -eq 60 ]]; then
      echo "Dev server did not start for playwright flow scenarios." >&2
      tail -n 100 /tmp/spiritual-flow-scenarios-dev.log >&2 || true
      exit 1
    fi
  done
fi

node "$CODEX_HOME/skills/playwright-flow-scenario-builder/scripts/collect-flow-artifacts.mjs" \
  --scenario docs/testing/scenarios/index.mjs \
  --base-url "$BASE_URL" \
  --output-dir "output/playwright/flow-scenarios" \
  --output-screenshots-dir "docs/guides/assets/user-manual" \
  "$@"
