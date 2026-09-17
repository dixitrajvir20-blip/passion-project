# Project Brief: LaunchPad

Version 2.0, 17 September 2026. Author: Rajvir Dixit (with research help from Claude).

This brief is the scope and roadmap. It now has companion docs that go deeper, and they win on
their subject if they ever disagree with this file: `BRAND_GUIDE.md` and `DESIGN.md` (look and
build), `LEARNING_DESIGN.md` (how lessons teach), `REGIONAL_TEACHING.md` (what's local per
edition), `SECURITY.md`, `LEGAL_AND_PRIVACY.md`, `AUTH_AND_ACCOUNTS.md`, and `BOSS_PLAYBOOK.md`
(the phased build plan and gates). What changed in v2: the site is now Astro with three live
editions (India/Europe/US), the brand is blue/gold/black, and the accounts and advanced-visual
work below is specified rather than hypothetical.

## 1. Vision
LaunchPad is a free, clean, fast website where anyone aged 15-21, anywhere in the world, can learn how money and business work, then practice with interactive tools. It's a hub: short articles on ideas that affect this age group, plus calculators, quizzes, and builders you can use on a phone.

**Why it matters**
- Across OECD countries, about 18% of 15-year-olds lack basic financial literacy (PISA 2022, 20 countries and economies). Access to financial education in school explains about 20% of the variation in scores.
- India has about 958 million active internet users (IAMAI, 2025). 57% are rural, and rural growth runs about 4x faster than urban. About 18% access the internet through shared devices. Many young people there have internet but no advisor and no business tools. That's who this is for.
- It extends Business Lab's mission ("business is a life skill") from one school to the world.

## 2. Audience and personas (fictional)
| Persona | Context | Needs |
|---|---|---|
| **Priya, 16, Nagpur (India)** | Budget Android phone, sometimes shared with family, patchy 4G, reads English but prefers Hindi for hard ideas | Short lessons, works on slow data, Hindi later, INR and lakh formatting, no sign-up |
| **Marcus, 17, Rochester (USA)** | Business Lab member, school Chromebook plus iPhone | Quick explainers before club events, tools to use in club challenges |
| **Ana, 19, São Paulo (Brazil)** | First-year university student selling crochet on Instagram | Pricing and profit tools, how to register a small business (general, points to official sources) |
| **Rahul, 21, Indore (India)** | Wants to open a small tea and snacks stall | Break-even and loan/EMI tools, one-page business plan, scam awareness |

## 3. Product principles
1. **Useful in 5 minutes.** Every page teaches one idea or helps finish one task.
2. **Phone first, slow network first.** Test on a mid-range Android over throttled 4G.
3. **No sign-up, no tracking.** Nothing personal is collected in v1.
4. **Peer voice, not "kiddie," not corporate.** Talk like a smart older student.
5. **Global by default.** Examples from India, the US, Brazil, Nigeria, and Europe. Currency and number formats adapt.
6. **Do, don't just read.** Every article ends with a tool, a quiz, or a small challenge.
7. **Honest.** Sources on every article, clear "education, not advice" limits.
8. **Accessible to everyone.** WCAG 2.2 AA minimum.
9. **Human-designed look, quietly advanced.** See BRAND_GUIDE.md and DESIGN.md. Modern web-platform features (View Transitions, scroll-reveal, frosted bars, container/anchor queries) are used only as progressive enhancement behind `@supports`/`prefers-reduced-motion`, so the page is complete with them off. The test: does it still look finished with the feature disabled?
10. **Built to last cheaply.** Static site, free hosting tier, no servers to maintain in v1.

## 4. Scope
### v1 (MVP), target 6 weeks
- 3 learning tracks, 12 articles (4 per track), English only
- 5 tools: Budget Planner, Savings & Compound Growth, Pricing & Break-even, Side-Hustle Profit, Loan/EMI
- Quiz component (3-5 questions per article, with instant feedback)
- Glossary (40+ terms) with tap-to-define inside articles
- Site search (Pagefind)
- Currency/locale picker (INR, USD, EUR, BRL, NGN, GBP) saved in localStorage
- Local progress: "read" and "quiz passed" checkmarks (localStorage)
- Pages: Home, Learn, Track, Article, Tools, Tool, Glossary, Search, About, Write for Us, Privacy, Disclaimer, 404
- Cookieless analytics with events: article_read, quiz_completed, tool_used (no personal data)

### v2, months 2-4
- Hindi (hi) translation of all v1 content and UI (human-reviewed)
- 24+ articles; contributor program (student writers)
- One-Page Business Plan Builder (local only, print or save as PDF)
- "Run a Chai Stall" scenario simulator
- Offline reading (PWA: cache read articles)
- Teacher/club kit pages (printable lesson plans for Business Lab-style clubs)

### Later (gated; see BOSS_PLAYBOOK.md phases 5-6)
- More editions and languages (Hindi first, then Brazil/Portuguese, Nigeria, Kenya, MENA/Arabic RTL, SE Asia — research in REGIONAL_TEACHING.md)
- Optional accounts, live (the preview at `/account` exists now; the backend, parental-consent verification and legal sign-off are Phase 6 — see AUTH_AND_ACCOUNTS.md)
- Cookieless analytics, only once documented on `/privacy`
- Moderated community Q&A (only after a moderation plan exists; out of scope until then)

### Non-goals
- Stock tips or personalized financial advice
- Paid courses, ads, affiliate links, or selling user data
- AI chatbot "advisor" in v1 (risk of wrong or personalized advice)
- Comments or user uploads in v1

## 5. Information architecture
```
/                      Home
/learn                 All tracks
/learn/[track]         Track overview (ordered lessons)
/learn/[track]/[slug]  Article (lesson)
/tools                 Tools index
/tools/[tool]          Tool page
/glossary              Glossary (A-Z, searchable)
/search                Search results (Pagefind)
/about                 Mission, team, impact numbers
/write                 Write for us (student contributors)
/privacy               Privacy notice (plain language)
/disclaimer            Education-not-advice + limitations
/hi/...                Hindi mirror (v2)
```
Main nav (max 5): Learn · Tools · Glossary · About · Search. Language and currency picker lives in the header, on the right.

## 6. Page specs
**Home.** Left-aligned intro: one plain sentence on what the site is, then two buttons ("Start learning", "Try a tool"). Then "Start here" (3 hand-picked lessons), "Popular tools" (4), "New this month" (3 articles), and an impact line ("Read in 12 countries so far"). No carousel, no video autoplay.

**Track page.** Title, one-paragraph summary, numbered lesson list with read time and a checkmark once done, and a "Practice" tool at the end.

**Article page (lesson template).**
1. Title (6-10 words), one-line summary, read time, last reviewed date, author first name + country
2. "In 30 seconds" box: 3 bullet takeaways
3. Body: short sections with H2s, one idea per section, examples from 2+ countries
4. At least one inline interactive element (mini-calculator, tap-to-reveal, or glossary term)
5. "Try it" block linking to the matching tool, with pre-filled values
6. Quiz (3-5 questions)
7. Sources (2+ reputable, linked), "education not advice" line
8. Next lesson / previous lesson

**Tool page.** Tool title, one sentence on what it answers, inputs on top (or left on desktop), results update live, a plain-language "What this means" sentence under the results, "How it works" (formula, collapsible), and "Learn more" links. Includes a reset button. Share = copy link with inputs in the URL query string (no personal data).

**Glossary.** A-Z list, search filter, each term with a 1-2 sentence definition + an example. Terms in articles get dotted underlines; tapping one opens a small popover (keyboard accessible).

**About.** Mission, who built it (first names only for minors unless they consent), how content is reviewed, impact numbers (countries, readers, tool uses), contact email.

**Write for Us.** Who can write, topics wanted, the style guide link, and how to submit (Google Form or email for v1). Must say: don't include personal info; writers under 18 need a parent's or teacher's OK.

## 7. Interactive tools (v1 specs)
All math lives in `src/lib/*.ts` as pure functions with unit tests. All money uses the selected currency via `Intl.NumberFormat`. Inputs are `type="number"` with `inputmode="decimal"`, visible labels, units, sensible min/max, and inline validation messages.

| Tool | Inputs | Outputs | Notes |
|---|---|---|---|
| **Budget Planner** | Monthly income; expense rows (name, amount, needs/wants/savings) | Totals by category, % split, comparison with 50/30/20, leftover | Explain that 50/30/20 is a guideline, not a rule. Allow a custom split. |
| **Savings & Compound Growth** | Starting amount, monthly contribution, annual rate (%), years, compounding (monthly default) | Final value, total contributed, growth earned, year-by-year table + simple line chart | Rate is user-entered, no default promises. Show "rates are not guaranteed." |
| **Pricing & Break-even** | Fixed costs, variable cost per unit, price per unit | Contribution margin, break-even units and revenue, profit at N units | Formula: BE units = fixed / (price − variable). Handle price ≤ variable with a clear message. |
| **Side-Hustle Profit** | Units sold/month, price, cost per unit, platform fees %, hours/month | Monthly profit, profit per hour | Helps compare "is this worth my time?" |
| **Loan / EMI** | Principal, annual rate, months | EMI, total interest, total paid, amortization table | EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = monthly rate. Handle rate = 0. |

**Quiz component.** Multiple choice (and true/false). One question at a time, instant feedback with a 1-2 sentence explanation, score at the end, retry. Stores "passed" (≥80%) in localStorage under `lp:progress` (see `src/lib/progress.ts`; the same record powers the cross-device sync code). Retrieval practice (quizzing) is a well-studied way to strengthen long-term learning, so every lesson gets one.

**Glossary popover.** `<Term id="compound-interest">` renders a button with `aria-expanded`. It opens a popover, closes on Esc or tap outside, and returns focus.

**v2: One-Page Business Plan Builder.** Guided fields (problem, customer, solution, price, costs, channels, first 3 steps), saved locally, print stylesheet for "Save as PDF."

**v2: "Run a Chai Stall" simulator.** 4 weekly rounds. Choose price, cups to prepare, and one promotion. See sales, waste, and profit. Teaches demand, cost, and trade-offs. Deterministic seeded randomness so outcomes can be tested.

## 8. Tech architecture
**Where the project is now (Phase 1):** an Astro static build with Preact islands, deployed to
GitHub Pages under `/passion-project`, with three editions (`/in`, `/eu`, `/us`) rendered from
`src/lib/regions.ts`, the break-even calculator, the full legal layer, a consent manager, an
account preview, and a strict security posture. The blue/gold/black brand from `BRAND_GUIDE.md`
is applied. See `CLAUDE.md` "Current state" for the exact list and `BOSS_PLAYBOOK.md` for what's next.

**Base-path gotcha (still true, still bites):** for a project site at
`https://<user>.github.io/passion-project/`, `astro.config.mjs` sets `site` and
`base: "/passion-project"`, and every internal link goes through `import.meta.env.BASE_URL`.
Playwright's `baseURL` needs the trailing slash or `new URL(path, base)` drops the base. Don't
regress this.

- Astro static site, `output: "static"`. MDX content collections for `articles`, `tracks`, `glossary`, `tools` (metadata).
- Preact islands for tools, quiz, glossary popovers, and the locale/currency picker. Default `client:visible`.
- CSS: `tokens.css` (DESIGN.md), `base.css`, component-scoped styles. No CSS framework.
- Fonts: self-hosted, subset, `font-display: swap`, at most 2 families (+ Devanagari in v2).
- Images: Astro `<Image>` with AVIF/WebP, explicit width/height, lazy below the fold.
- Search: Pagefind index at build time.
- i18n: Astro i18n routing (`defaultLocale: "en"`, `locales: ["en","hi"]`, `prefixDefaultLocale: false`, fallback hi→en). UI strings in `src/i18n/*.json`.
- Hosting: GitHub Pages (current plan) via GitHub Actions; Cloudflare Pages or Netlify are fine alternatives. Custom domain optional.
- CI: GitHub Actions runs build, unit tests, Playwright + axe, Lighthouse CI (mobile).

Suggested repo layout:
```
src/
  components/   Header, Footer, Card, Callout, Term, ToolShell ...
  islands/      BudgetPlanner, CompoundGrowth, BreakEven,
                SideHustle, LoanEmi, Quiz, LocalePicker (.tsx)
  lib/          finance.ts (pure math), format.ts (Intl),
                progress.ts (localStorage)
  content/      articles/, tracks/, glossary/ + config.ts (Zod)
  i18n/         en.json, hi.json
  layouts/      BaseLayout, ArticleLayout, ToolLayout (.astro)
  pages/        index, learn/, tools/, glossary, about, write,
                privacy, disclaimer, 404 (.astro)
  styles/       tokens.css, base.css
tests/
  unit/         finance.test.ts
  e2e/          pages.spec.ts, a11y.spec.ts, tools.spec.ts
public/         favicon, social images
```

## 9. Performance budget (mobile)
- Core Web Vitals at the 75th percentile: **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1**
- Lighthouse mobile: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95
- Article page: ≤ 50 KB JS (compressed) before interaction; tool page: ≤ 90 KB JS
- Total page weight (first load): ≤ 500 KB on articles; hero images ≤ 120 KB
- Fonts: ≤ 2 families, subset, ≤ 120 KB total
- Test with Chrome DevTools "Slow 4G" + 4x CPU slowdown at 360-400px width

## 10. Accessibility (WCAG 2.2 AA)
- Contrast: text ≥ 4.5:1 (large text ≥ 3:1). Tokens in DESIGN.md are pre-checked.
- Keyboard: everything reachable and operable; visible focus ring (2px+, not hidden by the sticky header: 2.4.11).
- Target size: ≥ 24×24 CSS px minimum (2.5.8); aim for 44×44 for primary buttons.
- No drag-only interactions (2.5.7). Consistent help link placement (3.2.6).
- Forms: visible labels, error text tied with `aria-describedby`, no re-typing the same info (3.3.7).
- Respect `prefers-reduced-motion`. Don't convey meaning by color alone.
- Charts: provide a data table or text summary.
- Language attribute on `<html>` and on any inline foreign-language text.

## 11. Internationalization
- Locales: `en` (v1), `hi` (v2), more later. Every article has `lang` and `translationOf` fields.
- Currency picker (INR, USD, EUR, GBP, BRL, NGN) and number locale are independent of the content language.
- Format with `Intl.NumberFormat(locale, { style: "currency", currency })`. `en-IN` groups as 1,00,000. Never hand-format numbers.
- Dates via `Intl.DateTimeFormat`.
- Region notes in articles use a `<RegionNote region="IN">` component so examples adapt.
- CSS logical properties everywhere so Arabic/Urdu (RTL) can be added later.
- Translations are human-reviewed before publishing. Machine drafts are OK as a starting point, never shipped raw.

## 12. Privacy, safety and legal (not legal advice; get a quick review before launch)
- **Collect nothing personal in v1.** No accounts, no email capture, no contact form (use a plain email address). Progress and preferences stay in localStorage.
- **Why:** India's DPDP Rules (notified Nov 13, 2025) treat anyone under 18 as a child and require verifiable parental consent to process their data; the main obligations take effect May 13, 2027. The EU GDPR (Art. 8) sets a digital consent age between 13 and 16 depending on the country. The US COPPA covers under-13s. Collecting nothing avoids all of this in v1.
- **Analytics:** cookieless and privacy-first (Plausible or Umami); no cookie banner needed when no personal data or cookies are used. Aggregate events only.
- **No third-party embeds** that track (if YouTube is ever used, use `youtube-nocookie.com` and click-to-load).
- **Finance content limits:** education only, no buy/sell recommendations, no performance promises. India's SEBI rule (Jan 2025, updated May 2026) bars unregistered people from giving investment advice under the label of education and requires market prices used in educational material to be lagged (the three-month rule was updated to 30 days for education-only use). We standardise on the stricter, simpler rule everywhere: no named securities with prices or targets, data ≥30 days old or fictional, no returns claims. See `LEGAL_AND_PRIVACY.md`.
- **Disclaimer** on every article and tool: "For learning only. Not financial, legal, or tax advice."
- **Contributors:** first name + country only by default; writers under 18 need a parent's or teacher's OK; no personal stories that identify others.
- **Licensing:** code MIT; articles CC BY-NC-SA 4.0 (lets teachers reuse with credit).

## 13. Metrics (impact)
- Monthly readers and countries (analytics)
- Articles read, quizzes completed, tools used (events)
- Contributors and languages live
- Publish a short monthly "impact note" on About. These numbers also go on Rajvir's college applications.

## 14. Roadmap and acceptance criteria
**Phase 0, Week 1: Setup**
- With Rajvir's OK: migrate the existing pages into Astro (same content), add tokens.css from DESIGN.md, base layout, header/footer, i18n JSON, CI running build + tests, GitHub Pages deploy
- Fix the current hero against DESIGN.md (remove the eyebrow badge and stats row, swap the font stack)
- Done when: `npm run build` passes in CI; home page renders at 375px and 1280px matching DESIGN.md

**Phase 1, Weeks 2-6: MVP**
- Content collections + 12 articles + glossary; 5 tools; quiz; search; locale/currency picker; privacy + disclaimer pages; analytics
- Done when: all unit tests pass (including edge cases like rate 0 and price ≤ variable cost); axe reports zero serious/critical issues on every page type; Lighthouse mobile meets the budget; every article has a quiz, sources, and a "Try it" tool link; site works with JS disabled for reading articles

**Phase 2, Months 2-4**
- Hindi, PWA offline reading, business plan builder, chai stall simulator, contributor program, teacher kit
- Done when: `/hi/` pages are complete and human-reviewed; articles readable offline after one visit; simulator outcomes pass deterministic tests

## 15. Open decisions (Rajvir)
- Keep the name LaunchPad? (check it isn't confusing with other "LaunchPad" programs) and pick a domain
- Who reviews content for accuracy (a teacher? a finance professional?)
- Hosting choice and who owns the accounts (use an adult's account if a service requires 18+)
- Which second language after Hindi
