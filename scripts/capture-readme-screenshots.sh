#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/images"
BASE="${COPPER_SCREENSHOT_BASE:-http://127.0.0.1:1422}"
SESSION="${AGENT_BROWSER_SESSION:-copper-readme}"

mkdir -p "$OUT"

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser is required to capture README screenshots." >&2
  exit 1
fi

agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
agent-browser --session "$SESSION" set viewport 1440 900 2

capture() {
  local name="$1"
  local path="$2"
  local wait="$3"
  agent-browser --session "$SESSION" open "$BASE$path"
  agent-browser --session "$SESSION" wait "$wait"
  agent-browser --session "$SESSION" wait 2000
  agent-browser --session "$SESSION" screenshot "$OUT/$name"
  echo "wrote $OUT/$name"
}

capture welcome.png "/welcome?preview=1" ".copper-welcome"
capture editor.png "/vault/demo-vault?preview=1" ".cm-editor"
capture settings.png "/settings/appearance?preview=1" ".copper-settings"

agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
