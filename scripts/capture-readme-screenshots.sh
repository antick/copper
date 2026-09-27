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

capture editor.png "/vault/demo-vault?preview=1" ".cm-editor"
# Stay on the same preview document so sample issues remain in memory.
agent-browser --session "$SESSION" eval "$(cat "$ROOT/scripts/screenshot-demo.js")"
agent-browser --session "$SESSION" click 'button[aria-label="Tasks"]'
agent-browser --session "$SESSION" wait '[aria-label="Kanban board"]'
agent-browser --session "$SESSION" click 'button[aria-label="Show list"]'
agent-browser --session "$SESSION" wait 'table'
agent-browser --session "$SESSION" wait 2000
agent-browser --session "$SESSION" screenshot "$OUT/tasks-list.png"
agent-browser --session "$SESSION" click '.copper-task-project-nav-item'
agent-browser --session "$SESSION" wait '[aria-label="Project views"]'
agent-browser --session "$SESSION" find role button click --name Board --exact
agent-browser --session "$SESSION" wait '[aria-label="Kanban board"]'
agent-browser --session "$SESSION" wait 2000
agent-browser --session "$SESSION" set viewport 1920 1000 2
agent-browser --session "$SESSION" wait 1000
agent-browser --session "$SESSION" screenshot "$OUT/tasks-board.png"
agent-browser --session "$SESSION" set viewport 1440 900 2

capture settings.png "/settings/appearance?preview=1" ".copper-settings"

agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
