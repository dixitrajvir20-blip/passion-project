#!/usr/bin/env bash
# PreToolUse hook for Edit/Write: refuse edits to files that need a human decision first.
set -u
input="$(cat)"
path="$(printf '%s' "$input" | sed -n 's/.*"file_path": *"\([^"]*\)".*/\1/p' | head -1)"
case "$path" in
  *package-lock.json|*.github/workflows/*|*LICENSE*|*src/pages/privacy.astro|*src/pages/terms.astro|*src/pages/cookies.astro)
    echo "That file changes legal, security or dependency posture: $path. Ask Rajvir first (say what and why), then edit." >&2
    exit 2
    ;;
esac
exit 0
