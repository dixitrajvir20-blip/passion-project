---
name: ship-check
description: The release gate for Business Lab. Run before every commit that touches UI, content or config. Builds, tests, checks contrast, takes screenshots and produces a short report.
---

# Ship check

Run every step; do not skip one because an earlier one passed. Paste real output, not summaries.

1. `npm run contrast` — all pairs pass.
2. `npm run build` — zero warnings you do not understand. Note total pages built.
3. `npm run test:unit` — all green.
4. `npm run rules` — no failure. It checks every Rule a calculator prints (src/lib/tools/<slug>.ts)
   against today: a rule checked more than 12 months ago fails; one past 11 months, or past its
   `reviewBy` date, prints a warning. List any warning in the report.
5. `npm run test:e2e` — all green at mobile and desktop. If Playwright browsers are missing,
   install them (`npx playwright install chromium`) or set `PW_CHROMIUM` to a local Chromium.
6. `npm run preview -- --ignore-lock` in the background, then `npm run screenshots`. Look at the
   360px light/dark and 1280px light/dark screenshots of every page you touched. Check: nothing
   overflows, the sticky header never covers focused elements, dark mode has no white boxes,
   type is not smaller than 15px, buttons are pills, cards have 20px radius and no borders.
7. Budget: list `dist/_astro/*.js` sizes; flag any page over its budget in docs/PROJECT_BRIEF.md.
8. Grep the diff for: `style=`, `#[0-9a-f]{6}` outside tokens.css, `console.log`, `TODO`,
   `dangerouslySetInnerHTML`, `set:html`, `target="_blank"` without noopener.
9. Ask the design-reviewer and a11y-perf-auditor subagents to review the change; include their
   verdicts.
10. Release check, before a branch that adds tools merges. Each of these finds a placeholder where
    the real thing should be, and any hit blocks the merge:
    - `grep -n "ready: false" src/lib/tools.ts` finds nothing (a calculator still a stub);
    - `npx vitest run tests/unit` reports zero skipped in `tests/unit/drills.test.ts` (stub banks)
      and zero todo in `tests/unit/tools/` and `tests/unit/tools.test.ts`;
    - `grep -rn "test.fixme" tests/e2e/tools` finds nothing: zero test.fixme in tests/e2e/tools.

Finish with a report:

```
Ship check — <branch> — <date>
Build: pass (N pages) | Unit: N/N | Rules: pass (warnings: none | list) | E2E: N/N | Contrast: pass
Screenshots reviewed: <list>
Budget: <sizes>
Reviewer verdicts: design <verdict>, a11y <verdict>
Release check: clear | <stubs, skips, todos and fixmes left>
Open issues: <none | list>
```

Then commit on the feature branch with a message that says what changed and why. Never push.
