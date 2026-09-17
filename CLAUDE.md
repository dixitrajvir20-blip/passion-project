# LaunchPad

Free, global learning hub teaching money and business to ages 15–21, especially those without an
adviser or family guidance (for example, students in India with internet but no advisor). Lessons +
interactive calculators + quizzes, built for phones and slow connections, with a separate edition
for the money system each reader lives in. Owner: Rajvir Dixit (college passion project; grew out
of his school club, Business Lab).

## Read before feature work
- @docs/BRAND_GUIDE.md — the blue/gold/black brand: colour (with contrast figures), type, logo, voice, anti-slop checklist
- @docs/DESIGN.md — how the brand is built in code: tokens, components, the advanced visual layer, motion
- @docs/PROJECT_BRIEF.md — scope, pages, tools, roadmap, performance budget, acceptance criteria
- @docs/CONTENT_GUIDE.md — lesson schema, voice, and the legal limits on finance content
- @docs/LEARNING_DESIGN.md — evidence-based lesson template and teaching formats
- @docs/REGIONAL_TEACHING.md — what's local per edition (rails, scams, regulators, formats)
- @docs/SECURITY.md — threat model and risk register (static site + future accounts)
- @docs/LEGAL_AND_PRIVACY.md — cookies, children's rules, financial-content limits, by region
- @docs/AUTH_AND_ACCOUNTS.md — the optional accounts design (preview only today)
- @docs/BOSS_PLAYBOOK.md — how this gets built, sprint by sprint, with the gates
- docs/KICKOFF_PROMPTS.md is Rajvir's paste-in prompts; the *_Build_Brief.pdf files are these docs as PDFs

## Current state (Sept 2026) — Phase 1
- **Astro 7 static build** with **Preact islands**, deployed to **GitHub Pages** under
  `/passion-project` (`astro.config.mjs` sets `base`; every internal link goes through it).
- Three editions — **India `/in`, Europe `/eu`, United States `/us`** — rendered from one
  `src/lib/regions.ts` data file, switched by a tab on every page. The front page asks the reader
  to choose rather than guessing from their IP.
- **Blue/gold/black brand** applied: tokens in `src/styles/tokens.css`, display font Bricolage
  Grotesque + body Atkinson Hyperlegible Next (both self-hosted, no CDN). Original launch-pad logo.
- **Break-even calculator** works end to end in all three editions/currencies; maths is pure
  functions with Vitest tests.
- **Legal pages** live: `/privacy`, `/cookies`, `/terms`, `/accessibility`, `/disclaimer`, plus a
  **consent manager** (no banner today because nothing optional is on), `security.txt`, `SECURITY.md`.
- **Accounts are a preview only** at `/account` (passkey + email-code + sync-code flow), wired to a
  stub provider that stores nothing. Gated behind `PUBLIC_ACCOUNTS_ENABLED` (default off).
- **Security**: strict CSP (meta, per-inline hashes), pinned GitHub Actions, Dependabot with
  cooldown, `.npmrc ignore-scripts`, least-privilege workflows, CodeQL.
- **Not built yet**: lesson pages/content engine, the other four calculators, quiz + search, i18n/
  Hindi, the real account backend. See docs/PROJECT_BRIEF.md §roadmap and docs/BOSS_PLAYBOOK.md.

## Stack
- Astro static output, Preact islands (`client:load`/`client:visible`), plain CSS custom
  properties. No Tailwind, no UI kits. Calculator maths as pure functions with Vitest; pages get
  Playwright + `@axe-core/playwright`.
- Fonts self-hosted and subset. Money via `Intl.NumberFormat` on the chosen locale (en-IN shows
  1,00,000). Cross-document View Transitions + IntersectionObserver reveals, both behind
  `prefers-reduced-motion` and `@supports`.
- Analytics: cookieless only, and off until documented on `/privacy`. Never GA, Meta pixel, or any
  third-party tracker or font.

## Hard rules
- **Tokens only.** No raw hex, px radius/size, shadow or font-family in a component. No `style=""`
  attributes and no runtime-injected `<style>` — the CSP blocks them. Add or reuse a token.
- **Education, not advice.** No buy/sell/hold, no named securities with prices or targets, no
  promised returns. Market data ≥30 days old (SEBI). No product recommendations.
- **Privacy-first.** No accounts, personal-data forms, or third-party trackers on by default.
  Progress is localStorage; documented keys only. Honour Global Privacy Control.
- **Accessibility is enforced.** WCAG 2.2 AA, keyboard, both appearances, reduced motion; `npm run
  test:e2e` fails on any serious/critical axe issue at 360px and 1280px. `npm run contrast` must pass.
- Follow BRAND_GUIDE.md and DESIGN.md. No purple/gradients, glows, glassmorphism-as-decoration,
  stat banners without sources, default fonts, ALL CAPS labels, or emoji icons.

## Workflow
- Plan first for anything over two files; then build. Prove it with `npm run ship-check` (build +
  unit + e2e/axe + contrast) and screenshots at 360px and 1280px, light and dark.
- Ask the reviewer subagents (design-reviewer, content-reviewer, a11y-perf-auditor,
  security-reviewer) before committing the kind of change each covers.
- Small commits on a feature branch. **Never push, merge, or deploy** — Rajvir does that.
