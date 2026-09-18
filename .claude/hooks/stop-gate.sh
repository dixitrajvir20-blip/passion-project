#!/usr/bin/env bash
# Stop hook: Claude Code may not end its turn while the unit tests or the build are broken.
# Exit 2 blocks the stop and feeds stderr back to Claude as the reason.
set -u
input="$(cat)"
# Loop guard: if this hook already blocked once, let the stop through.
if printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then
  exit 0
fi
cd "$(dirname "$0")/../.." || exit 0
if ! npm run -s test:unit >/tmp/lp-stop-unit.log 2>&1; then
  echo "Unit tests are failing. Fix them before stopping. Last lines:" >&2
  tail -n 25 /tmp/lp-stop-unit.log >&2
  exit 2
fi
if ! npm run -s build >/tmp/lp-stop-build.log 2>&1; then
  echo "The build is broken. Fix it before stopping. Last lines:" >&2
  tail -n 25 /tmp/lp-stop-build.log >&2
  exit 2
fi
exit 0
