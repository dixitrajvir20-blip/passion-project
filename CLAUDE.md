# LaunchPad

Free, global learning hub that teaches business ideas, entrepreneurship, and money skills to people aged 15-21, especially those without a financial adviser or family guidance (for example, students in India with internet but no advisor).
Articles + interactive tools + quizzes, built for phones and slow connections. Owner: Rajvir Dixit (college passion project; grew out of his school club, Business Lab).

Read these before feature work:
- @docs/PROJECT_BRIEF.md: scope, pages, tools, roadmap, acceptance criteria
- @docs/DESIGN.md: visual system and the "don't look AI-made" rules
- @docs/CONTENT_GUIDE.md: article schema, voice, and legal limits on finance content
- docs/KICKOFF_PROMPTS.md is for Rajvir; docs/LaunchPad_Build_Brief.pdf is the same plan as a PDF

## Current state (Sept 2026)
- Plain HTML/CSS/JS, no build step: index.html, about.html, articles/index.html, css/style.css, js/main.js, assets/.
- Run locally: `python3 -m http.server 8000` (also in .claude/launch.json), then open http://localhost:8000.
- GitHub remote: dixitrajvir20-blip/passion-project. Planned hosting: GitHub Pages.
- Known gaps vs DESIGN.md: the hero has an eyebrow badge above the H1 and a stats row (both on the "looks AI-made" checklist); the font stack uses system fonts incl. Roboto/Arial; no tools, quizzes, glossary, or article pages yet.

## Stack
- Recommended next step (PROJECT_BRIEF section 8): move to Astro (static output, still deploys to GitHub Pages) before content and tools grow. IMPORTANT: ask Rajvir before migrating. Never migrate or delete existing pages silently.
- Either way: no Tailwind, no UI kits. Plain CSS with custom properties (tokens in DESIGN.md). Interactive tools as small islands (Preact if Astro, vanilla JS modules if not).
- Calculator math lives in pure functions with unit tests (Vitest). Pages get Playwright + axe checks once the build exists.
- Analytics: cookieless only (Plausible or Umami). Never Google Analytics, Meta pixel, or other trackers.

## Hard rules
- IMPORTANT: No accounts, logins, forms that collect personal data, or third-party trackers in v1. Progress lives in localStorage only.
- No stock tips, buy/sell calls, or "best fund to buy." Education only. Indian market prices in examples must be at least 3 months old.
- Every page must meet WCAG 2.2 AA, work by keyboard, and meet the mobile performance budget in PROJECT_BRIEF.md.
- Money is formatted with `Intl.NumberFormat` using the chosen locale and currency (en-IN shows 1,00,000).
- Follow DESIGN.md. No purple gradients, glowing shadows, emoji icons, or fonts from its banned list.
- Keep user-facing text in one place per locale (JSON) once i18n starts; don't scatter strings.

## Workflow
- For anything touching more than 2 files: plan first, then build.
- Prove it works: run tests/build, and for UI changes screenshot at 360px and 1280px and compare against DESIGN.md.
- Small commits with clear messages on a feature branch. Don't push or merge without Rajvir's OK.
