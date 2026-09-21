# Kickoff prompts for Claude Code

Version 2.0 · 17 September 2026. Paste these into Claude Code (the desktop app's Code tab or the
CLI) in the repo folder. Each one names the docs to read, the branch to make, and the gate to
hit. Phases come from `docs/BOSS_PLAYBOOK.md`. Never let it push or merge — that's yours.

## Step 0 — Every session starts like this

```
Read CLAUDE.md and docs/BOSS_PLAYBOOK.md. Tell me in five lines what phase we're in, what's
done, and what the next gate is. Then run `npm run ship-check` and confirm the baseline is green
before touching anything. If it isn't green, that's the first task.
```

## Phase 1 — Land the brand release (what Claude Cowork built today)

```
The working tree has uncommitted changes from the brand/legal/security release (see CLAUDE.md
"Current state"). Do this in order:
1. `git switch -c brand-v2` and review `git diff --stat`. Read docs/BRAND_GUIDE.md and
   docs/DESIGN.md so you know what the change is meant to be.
2. Run `npm run ship-check` and `npm run contrast`. Fix anything red; report anything you had to fix.
3. Start `npm run preview -- --ignore-lock` in the background and run `npm run screenshots`.
   Look at the 360/1280 light/dark shots and tell me what you see, specifically.
4. Ask the design-reviewer and security-reviewer subagents to review the diff. Paste verdicts.
5. Commit in three logical commits: (a) brand + design system + pages, (b) legal pages + consent
   + account preview, (c) security posture (CSP, workflows, npmrc, .claude/). Don't push.
6. `git rm` the unused Literata fonts in public/fonts and update fonts.css if anything references
   them. Note: the old `phase-0-astro` branch was never pushed; tell me if that matters for the
   deploy workflow.
```

## Phase 2 — The lesson engine (the next big build)

```
Plan first, then build: the lesson engine. Read docs/CONTENT_GUIDE.md, docs/LEARNING_DESIGN.md
and docs/REGIONAL_TEACHING.md before planning.
Scope: a `lessons` content collection with the Zod schema in CONTENT_GUIDE; a LessonLayout that
implements the template in LEARNING_DESIGN (hook + prediction poll → concept → worked example →
explorable → faded practice → retrieval check → summary → "explain it to a friend"); a Quiz
island; a Term popover (use the Popover API behind @supports with a plain details fallback);
the Leitner review queue in src/lib/progress.ts; and the FIRST THREE India lessons, written per
REGIONAL_TEACHING (a coaching centre's break-even, spotting a UPI fraud, your first payslip) with
sources the content-reviewer can open.
Gates: lesson page ≤50KB JS; quiz keyboard-accessible; content-reviewer verified every source;
a11y-perf-auditor passes; design-reviewer says Ship. Before you build, critique your own plan:
would you have proposed the same plan for any other site? If yes, it's a default — make it
specific to Business Lab and say what changed.
```

## Phase 3 — The calculator set

```
Ship the four remaining calculators from docs/PROJECT_BRIEF.md §7 (budget planner, savings &
compound growth, side-hustle profit, loan/EMI) reusing src/islands/tools.css and the tested
functions in src/lib/finance.ts. Each: a plain-language "what this means" sentence, a "how this
is worked out" panel, per-edition defaults in src/lib/regions.ts, unit tests for the maths, and
an e2e test. The savings chart uses hand-built SVG with the --series tokens, a data table, and
direct labels (docs/BRAND_GUIDE.md §6b). Then build one region simulator: India "UPI: spot the
fake" (see REGIONAL_TEACHING). Gate: ≤90KB JS per tool page; a11y-perf-auditor passes.
```

## Phase 4 — Search, share, polish

```
Add Pagefind search (astro-pagefind, respects the /passion-project base, loads on focus so
article pages stay at 0KB extra), build-time OG images per page with satori + resvg using the
Bricolage font file, Web Share for calculator results with a clipboard fallback, and the SubNav
on every long page. Gate: search works in `npm run preview`; OG images render for every page;
Lighthouse mobile ≥95 on home and a lesson. Report bundle sizes before/after.
```

## Phase 5 — Content at scale and Hindi

```
Fill all three editions' tracks to 12 lessons each per REGIONAL_TEACHING and CONTENT_GUIDE, add
printable club worksheets (print stylesheet), then stand up i18n (Astro i18n routing, hi
locale, Noto Devanagari fonts subset and self-hosted, CSS logical properties everywhere) and
translate the India edition. Human review before any Hindi ships. Gate: no layout breaks in
Devanagari; every lesson reviewed; fonts still ≤120KB per page.
```

## Phase 6 — Accounts (only when I say so)

```
Do not start this phase unless I have said "open phase 6". When I do: implement a live
AuthProvider (Better Auth on Cloudflare Workers + D1, EU or India region) behind the interface in
src/lib/auth/provider.ts, move the production deploy to a header-capable host with the headers
in docs/SECURITY.md, complete the parental-consent verification, update /privacy with the
provider, region and retention, and only then flip PUBLIC_ACCOUNTS_ENABLED. Every item in
docs/AUTH_AND_ACCOUNTS.md "before flipping" must be checked off, with the security-reviewer's
verdict. The protect-files hook will stop you editing the legal pages — that's when you ask me.
```

## Useful one-liners

- "Run the ship-check skill and paste the report."
- "Use the design-reviewer subagent on src/pages/index.astro and tell me the one thing to remove."
- "Take screenshots at 360 and 1280 in light and dark and describe what changed."
- "Would you have proposed this for any other product? Make it Business Lab-specific."
- "What in this diff would fail the anti-slop checklist in docs/BRAND_GUIDE.md §8?"
