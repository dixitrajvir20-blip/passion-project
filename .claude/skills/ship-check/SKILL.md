---
name: ship-check
description: The release gate for LaunchPad. Run before every commit that touches UI, content or config. Builds, tests, checks contrast, takes screenshots and produces a short report.
---

# Ship check

Run every step; do not skip one because an earlier one passed. Paste real output, not summaries.

1. `npm run contrast` — all pairs pass.
2. `npm run build` — zero warnings you do not understand. Note total pages built.
3. `npm run test:unit` — all green.
4. `npm run test:e2e` — all green at mobile and desktop. If Playwright browsers are missing,
   install them (`npx playwright install chromium`) or set `PW_CHROMIUM` to a local Chromium.
5. `npm run preview -- --ignore-lock` in the background, then `npm run screenshots`. Look at the
   360px light/dark and 1280px light/dark screenshots of every page you touched. Check: nothing
   overflows, the sticky header never covers focused elements, dark mode has no white boxes,
   type is not smaller than 15px, buttons are pills, cards have 20px radius and no borders.
6. Budget: list `dist/_astro/*.js` sizes; flag any page over its budget in docs/PROJECT_BRIEF.md.
7. Grep the diff for: `style=`, `#[0-9a-f]{6}` outside tokens.css, `console.log`, `TODO`,
   `dangerouslySetInnerHTML`, `set:html`, `target="_blank"` without noopener.
8. Ask the design-reviewer and a11y-perf-auditor subagents to review the change; include their
   verdicts.

Finish with a report:

```
Ship check — <branch> — <date>
Build: pass (N pages) | Unit: N/N | E2E: N/N | Contrast: pass
Screenshots reviewed: <list>
Budget: <sizes>
Reviewer verdicts: design <verdict>, a11y <verdict>
Open issues: <none | list>
```

Then commit on the feature branch with a message that says what changed and why. Never push.
