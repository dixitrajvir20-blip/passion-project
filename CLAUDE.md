# Business Lab

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

## Current state (22 Sept 2026) — Phases 1–4 done; design v4.1 (white page) and every lesson on template v2
- **Astro 7 static build** with **Preact islands**, deployed to **GitHub Pages** under
  `/passion-project` (`astro.config.mjs` sets `base`; every internal link goes through it).
- Three editions — **India `/in`, Europe `/eu`, United States `/us`** — rendered from one
  `src/lib/regions.ts` data file, switched by a dropdown with flags in the header. The front
  page asks the reader to choose rather than guessing from their IP.
- **Name and brand.** Renamed from LaunchPad to **Business Lab** (Rajvir's school club) on 18 Sept.
  Design v4 (`docs/BRAND_GUIDE.md` v3, `docs/DESIGN.md` v4): a dark-blue field with white sheets and
  gold, rounded panels, the ledger as the signature, an edition dropdown with flags, no shadows or
  fade-ins. Display Bricolage Grotesque + body Atkinson Hyperlegible Next, self-hosted; Kalam is
  used only at build time to draw a few hand-lettered notes. The logo is an interim drawn badge
  until the licensed file arrives (see BRAND_GUIDE §4).
- **Tone.** Rajvir wants lessons that are serious, professional and research-based. No
  street-stall or toy-business framing; every lesson answers a documented struggle in its region.
  Section labels are "Key points", "The calculation", "Check your understanding".
- **Lesson engine** (`src/content.config.ts`, `src/layouts/LessonLayout.astro`, `src/components/lesson/`):
  HTML-first. Polls, practice steps and quick checks are forms + CSS reveals that work with JS off;
  worked examples come from `src/lib/lesson-math.ts` (tested maths, never prose); glossary terms are
  jump links upgraded to popovers; spaced review per question in `lp:progress` with `/<edition>/review`.
  **36 lessons, 12 per edition**, rewritten on 20 Sept from the research curriculum in
  `docs/CONTENT_GUIDE.md` and `docs/research/regional-core.md`. Tracks differ by edition: India
  money-basics / protect-your-money / start-something; Europe money-basics / credit-and-fraud /
  start-something; the US money-basics / start-something / how-business-works.
  Every lesson carries a CC BY-NC-SA 4.0 notice, `rel="license"` and LearningResource JSON-LD.
- **Template v2 (21–22 Sept), all 36 lessons**: a tester found the lessons too long and not
  teaching, so every lesson is now teaching-first: the moment and a drawn document with a "find
  this line" question, a short verified video in a click-to-load player (32 lessons; four run on
  "show me" alone), the body ("why it works"), "show me" one captioned ledger line at a time, a
  highlighted key idea, your turn with three free hints (method, sum, answer) and a folded "one
  more", change one thing (the lesson's own calculation, or "decide before you look" for the nine
  drills), three actions, a details fold, three checks matched to three objectives. Engine:
  `Video.astro` + `VideoPlayer.tsx`, `ShowMe.astro`, `Document.astro`, `Practice.astro` hints,
  the `deduction` kind, `captions` on the other kinds, `template: v2` in the schema; rules in
  `docs/CONTENT_GUIDE.md` and `tests/unit/lessons.test.ts`. Written by a writer + independent
  editor agent per lesson on 22 Sept (`workflows/scripts/lessons-to-template-v2-*.js`). CSP allows
  frames from youtube-nocookie.com only; the `embeds` consent category is on by default. The
  v1 fields (`prediction`, `transfer`) are still in the schema and can go.
- **Five calculators** in every edition (break-even, budget, savings growth, side-hustle, loan) on one
  kit (`src/islands/tool-kit.tsx`), plus India's **"UPI: spot the fake"** drill, from
  `src/pages/[region]/tools/[tool].astro` and `src/lib/tools.ts`. Per-edition defaults in `regions.ts`.
- **Dashboard** at `/dashboard` (`src/islands/Dashboard.tsx`): lessons done, checks, review queue,
  learning time by day, next lesson, progress by track. All from this device. Learning time
  (`lp:activity`, `src/lib/activity.ts`) is recorded only after a yes to the `stats` consent
  category; the consent banner now appears on a first visit for that reason.
- **Search** at `/search`: Pagefind index built at deploy, engine loaded on focus, edition filter.
  `'wasm-unsafe-eval'` is allowed on that page only.
- **Legal pages** live: `/privacy`, `/cookies`, `/terms`, `/accessibility`, `/disclaimer`, plus a
  **consent manager** (the banner asks about learning time on the first visit), `security.txt`, `SECURITY.md`.
- **Accounts are a preview only** at `/account` (the login screen exists and is linked from the
  dashboard), wired to a stub provider that stores nothing. Gated behind `PUBLIC_ACCOUNTS_ENABLED`
  (default off); the build fails if it is on without `PUBLIC_AUTH_ORIGIN`. Going live is Phase 6.
- **Security**: strict CSP (meta, per-inline hashes), pinned GitHub Actions, Dependabot with
  cooldown, `.npmrc ignore-scripts`, least-privilege workflows, CodeQL.
- **Gates**: `npm run ship-check` = build + `scripts/js-budget.mjs` + contrast + unit + e2e/axe.
  Content rules are tests (`tests/unit/lessons.test.ts`): sentence/section length, banned words,
  market-signal language, undefined terms, quote length, no embedded media.
- **Share images** are drawn at build time (`scripts/og-images.mjs`, resvg); `scripts/brand-icons.mjs`
  writes the favicon and app icons from `scripts/brand-mark.mjs`.
- **Not built yet**: Hindi/i18n, root LICENSE files, the real account backend, the `lp:activity`
  row on `/cookies` and the learning-time sentence on `/privacy` (protected pages, Rajvir's edit),
  per-edition glossary examples (shared entries such as `interest` show ₹ examples in Europe and
  US popovers), and the standalone interactive tools beyond the five calculators (research and
  spec in progress on 22 Sept). See docs/BOSS_PLAYBOOK.md.

## Stack
- Astro static output, Preact islands (`client:load`/`client:visible`), plain CSS custom
  properties. No Tailwind, no UI kits. Calculator maths as pure functions with Vitest; pages get
  Playwright + `@axe-core/playwright`.
- Fonts self-hosted and subset. Money via `Intl.NumberFormat` on the chosen locale (en-IN shows
  1,00,000). Cross-document View Transitions behind `prefers-reduced-motion`; no scroll reveals.
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
