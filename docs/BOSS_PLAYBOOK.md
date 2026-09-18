# LaunchPad build playbook

Version 1.0 · 17 September 2026. This is how the site gets built by Claude Code, sprint by sprint,
with the acceptance criteria and verification gates that stop it drifting. Rajvir is the product
owner; Claude Code is the builder; the subagents in `.claude/agents/` are the reviewers. Nothing
merges or deploys without passing the gate for its phase.

## How to work (every task, no exceptions)

1. **Plan first** for anything over two files. Say what you'll change and why before editing. Use
   plan mode.
2. **Build on a feature branch.** Small commits, clear messages. Never `git push` or `git merge`
   (both are denied in `.claude/settings.json`); never deploy. Rajvir merges.
3. **Prove it.** Run the `ship-check` skill: build, unit tests, e2e + axe, contrast, screenshots
   at 360/1280 light and dark. Paste real output.
4. **Get it reviewed.** Ask the relevant subagent(s): `design-reviewer` for UI, `content-reviewer`
   for lessons, `a11y-perf-auditor` before any UI commit, `security-reviewer` for deps/workflows/
   storage/auth. Include their verdicts in the commit message or PR.
5. **Respect the guardrails.** No accounts/analytics/trackers on by default. No named securities
   with prices. Education, not advice. Every colour and size is a token. If a change touches a
   legal page, a workflow or the lockfile, the `protect-files.sh` hook will stop you — that's the
   signal to ask Rajvir first.
6. The **Stop hook** blocks ending a turn while unit tests or the build are broken. Don't fight it;
   fix the break.

## The standard of "done"

A page or feature is done when: it builds with no unexplained warnings; unit + e2e + axe pass at
both widths; contrast passes; it looks right in the 360/1280 light/dark screenshots; it meets its
performance budget (`docs/PROJECT_BRIEF.md`); the design-reviewer says Ship; and, for content,
the content-reviewer verified every source. "It renders" is not done.

## Phases

Each phase has a goal, the work, and a **gate** — the exact thing that must be true to call it
finished. Phase 0 is already done.

### Phase 0 — Foundation ✅ done
Astro static build, design tokens, page shell, three editions (in/eu/us), the break-even
calculator end to end, CI + Pages deploy, WCAG gate. **Gate:** build + unit + e2e/axe green. ✅

### Phase 1 — Brand & platform hardening (this release)
Apply the blue/gold/black brand (`docs/BRAND_GUIDE.md`); rebuild the home and edition pages to the
new design system; add the legal pages (privacy, cookies, terms, accessibility), the consent
manager, the security posture (CSP, pinned actions, Dependabot, npmrc, security.txt), and the
account **preview** (no backend). **Gate:** contrast passes; all legal pages exist and are dated;
CSP present with no console violations; 80+ e2e/axe tests green; design-reviewer + security-reviewer
say Ship. *(This is where the project is now.)*

### Phase 2 — The lesson engine
Build the content collection (`src/content`, Zod schema from `docs/CONTENT_GUIDE.md`), the lesson
layout implementing the template in `docs/LEARNING_DESIGN.md` (hook → concept → worked example →
explorable → faded practice → retrieval check → summary), the quiz island, the term-popover, and
the Leitner review queue (localStorage). Write the first three India lessons end to end.
**Gate:** a lesson renders with a working quiz and inline explorable; ≤50KB JS on the lesson page;
content-reviewer verified every source; a11y pass incl. the quiz.

### Phase 3 — The calculator set
Ship the remaining four calculators (budget planner, savings/compound growth, side-hustle profit,
loan/EMI) reusing the tool shell and the tested `finance.ts`. Add one region simulator (India UPI
scam "spot the fake"). **Gate:** each calculator has unit tests for its maths, ≤90KB JS, and
explains its result in a sentence; a11y pass.

### Phase 4 — Search, share & polish
Pagefind search (loads on focus, respects `base`); build-time OG images per page (satori +
resvg); Web Share for a calculator result with a clipboard fallback; the sticky sub-nav on every
long page. **Gate:** search works under `/passion-project`; OG images render; Lighthouse ≥95 on
mobile for the home and a lesson.

### Phase 5 — Content scale & the India Hindi edition
Fill all three editions' lesson tracks; add the teacher/club printable worksheets; stand up the
i18n architecture and the Hindi India edition (Devanagari fonts, RTL-safe logical CSS for later
Arabic). **Gate:** 12+ lessons per edition, all reviewed; Hindi renders correctly; no layout
breaks with a non-Latin script.

### Phase 6 — Accounts (only when the checklist is clear)
Implement the live `AuthProvider` (Better Auth on Cloudflare Workers + D1), move the production
deploy to a header-capable host, complete the parental-consent flow, and flip
`PUBLIC_ACCOUNTS_ENABLED`. **Gate:** every item in `docs/AUTH_AND_ACCOUNTS.md` §"before flipping"
is done, including the lawyer sign-off and the breach runbook. This phase does not start on
Claude's initiative — Rajvir opens it.

## Kickoff prompts

Ready-to-paste prompts for each phase are in `docs/KICKOFF_PROMPTS.md`. Each one names the docs to
read first, the branch to make, and the gate to hit.

## When to push Claude Code harder

- Ask for a plan before big work, then tell it to critique its own plan ("would you have proposed
  this for a different product? if so it's a default — revise") before building. That one prompt is
  the difference between generated-looking output and something specific.
- Use subagents to review in parallel; don't let the builder mark its own homework.
- Demand screenshots and the failing-then-passing test, not a description.
- Keep CLAUDE.md short and current; when the "current state" drifts from reality, fix it first —
  a stale CLAUDE.md is how an agent rebuilds something that already exists.
