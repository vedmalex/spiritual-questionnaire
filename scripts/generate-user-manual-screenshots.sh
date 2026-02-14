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
ASSETS_DIR="docs/guides/assets/user-manual"
ARTIFACT_DIR="output/playwright/2026-02-12-task-059-user-manual"
mkdir -p "$ASSETS_DIR" "$ARTIFACT_DIR"

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! curl -sSf "$BASE_URL/" >/dev/null 2>&1; then
  npm run dev >/tmp/spiritual-user-manual-dev.log 2>&1 &
  SERVER_PID="$!"

  for i in $(seq 1 60); do
    if curl -sSf "$BASE_URL/" >/dev/null 2>&1; then
      break
    fi
    sleep 1
    if [[ "$i" -eq 60 ]]; then
      echo "Dev server did not start for user manual screenshots." >&2
      tail -n 100 /tmp/spiritual-user-manual-dev.log >&2 || true
      exit 1
    fi
  done
fi

make_user_json() {
  local role="$1"
  local name="$2"
  node -e "console.log(JSON.stringify({name: process.argv[2], role: process.argv[1], createdAt: Date.now(), theme: 'light', language: 'ru'}))" "$role" "$name"
}

capture_role() {
  local role="$1"
  local name="$2"
  local session="manual-${role}"
  local user_json
  user_json="$(make_user_json "$role" "$name")"

  "$PWCLI" --session "$session" close-all >/dev/null 2>&1 || true
  "$PWCLI" --session "$session" open "$BASE_URL" >/dev/null
  "$PWCLI" --session "$session" localstorage-clear >/dev/null || true
  "$PWCLI" --session "$session" localstorage-set app-language ru >/dev/null
  "$PWCLI" --session "$session" localstorage-set spiritual_questionnaire_user "$user_json" >/dev/null
  "$PWCLI" --session "$session" goto "$BASE_URL/dashboard" >/dev/null
  "$PWCLI" --session "$session" snapshot >/dev/null

  "$PWCLI" --session "$session" resize 1366 900 >/dev/null
  local desktop_out
  desktop_out="$("$PWCLI" --session "$session" screenshot 2>&1)"
  local desktop_src
  desktop_src="$(echo "$desktop_out" | grep -oP '(?<=\]\().*?(?=\))' | head -1)"
  if [[ -n "$desktop_src" && -f "$desktop_src" ]]; then
    cp "$desktop_src" "$ASSETS_DIR/${role}-desktop.png"
  else
    echo "WARNING: desktop screenshot not captured for $role" >&2
  fi

  "$PWCLI" --session "$session" resize 390 844 >/dev/null
  "$PWCLI" --session "$session" snapshot >/dev/null
  local mobile_out
  mobile_out="$("$PWCLI" --session "$session" screenshot 2>&1)"
  local mobile_src
  mobile_src="$(echo "$mobile_out" | grep -oP '(?<=\]\().*?(?=\))' | head -1)"
  if [[ -n "$mobile_src" && -f "$mobile_src" ]]; then
    cp "$mobile_src" "$ASSETS_DIR/${role}-mobile.png"
  else
    echo "WARNING: mobile screenshot not captured for $role" >&2
  fi

  "$PWCLI" --session "$session" close >/dev/null
}

capture_role student "Студент"
capture_role curator "Куратор"
capture_role admin "Админ"

node <<'EOF'
const fs = require('fs');
const path = require('path');

const files = [
  'student-desktop.png',
  'student-mobile.png',
  'curator-desktop.png',
  'curator-mobile.png',
  'admin-desktop.png',
  'admin-mobile.png',
];

const base = path.resolve('docs/guides/assets/user-manual');
const artifact = path.resolve('output/playwright/2026-02-12-task-059-user-manual/assert.json');
const payload = files.map((file) => {
  const full = path.join(base, file);
  const stat = fs.statSync(full);
  return {
    file,
    size: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
});
fs.writeFileSync(artifact, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify(payload, null, 2));
EOF

echo "User manual screenshots refreshed in $ASSETS_DIR"
