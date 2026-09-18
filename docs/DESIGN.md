# Business Lab design system

Version 3.0 · 18 September 2026. Supersedes v2 (the LaunchPad launch-page look). Read `docs/BRAND_GUIDE.md` first —
this file is how the brand is built in code. The machine source of truth is
`src/styles/tokens.css`; this document explains the rules behind it and how to extend them.

## 0. The two jobs

Every screen has to do two things at once, and the tension between them is the whole design:

- **Feel at home** — familiar patterns, system-like controls, nothing to learn.
- **Be unmistakable** — you could crop out the logo and still know it's Business Lab.

Resolve it the way Apple does: structure and controls are quiet and conventional; identity lives
in the ledger (every sum set like a cash book), the navy edition line and footer that frame each
page, the highlighter, and the badge.

## 1. Tokens

All colour, type, space, radius and motion are CSS custom properties in `src/styles/tokens.css`,
redefined under `prefers-color-scheme: dark` and nudged under `prefers-contrast: more`. Rules:

- No raw hex, px radius, px font-size, shadow or `font-family` in a component. Add a token.
- No `style=""` attributes and no runtime-injected `<style>`. The site ships a strict Content
  Security Policy with per-inline hashes (see `docs/SECURITY.md`); an inline style attribute or a
  script-built style tag is blocked. Put the value in a stylesheet or a token and toggle a class.
- Stagger and index values (`--i`) are set with `:nth-child` rules in `base.css`, not inline.

## 2. Colour in practice

Palette, roles and every contrast figure are in the brand guide §2. In code:

- Links and button fills: `--accent` / `--accent-text`. Focus ring: `--focus`.
- Gold is a fill or a mark, never small text on light. Eyebrows use `--gold-text`.
- Panels and tinted bands: `--bg-2` (a faint blue). Navy: `.section-dark` re-maps tokens; it is
  used for the edition line and the footer only.
- The highlighter: `--highlight` behind ink, for a lesson's key sentence (`.lesson-body p strong`).
- `color-mix()` is allowed for tints (e.g. the callout is `color-mix(in srgb, var(--gold) 20%,
  var(--bg))`), with a solid fallback where a mix would fail contrast.
- Verify with `npm run contrast` — it parses the tokens and checks every pair.

## 3. Type

Bricolage Grotesque (display) + Atkinson Hyperlegible Next (body), self-hosted and subset,
preloaded (`atkinson-latin`, `bricolage-latin`). Scale and rules in the brand guide §3. The
banned-font list there is enforced in review.

## 4. Components (all in `src/components`, `src/islands`, `base.css`)

- **Ledger** `.ledger` / `.ledger-row` / `.ledger-label` / `.ledger-figure` / `.ledger-total` — the
  signature. Label left, figure right, dotted leader, a rule above a total and `--rule-total` (a
  double rule) under the final answer. Used by `Worked.astro`, `EditionSum.astro` and every
  calculator's `Result` (`main` marks the tool's one answer).
- **EditionSum** — an edition's break-even example as a ledger, computed from `finance.ts` with
  the edition's calculator defaults. On the front page (one per edition) and each edition front.
- **Edition line** `RegionTabs.astro` — navy strip above the header on every page; text links,
  current one bold with a marigold underline (`aria-current`). Remembers the choice in `lp:region`.
- **Header** — solid, sticky, badge + wordmark (badge only under 640px). No blur.
- **Footer** — navy, badge + wordmark, editions, site, legal.
- **Button** `.btn` — 8px radius, 44px min height. `.btn` (blue fill), `.btn-secondary` (paper
  with a rule), `.btn-link` (text + ›). One primary per view. `.btn-lg` for page-level actions.
- **Index rows** `.index-list` / `.index-row` — ruled rows, title first, an "Open" in the margin.
  Calculators are listed by the question they answer. `LessonList` is the numbered variant
  (`compact` for the three-track contents on an edition front).
- **Card** `.card` — flat `--bg-2`, 14px radius. Rare; prefer index rows.
- **Callout** `.callout` — gold tint with a gold left edge, for "In 30 seconds". Floats into the
  margin at ≥1180px (`lesson.css`).
- **Figure** `.figure` — a large display number for an editorial statistic; always beside its
  sentence and source link, never in a bare banner.
- **Eyebrow** `.eyebrow` — small dark-gold label above a heading. A text label, not a pill.
- **ConsentManager** island — banner + `<dialog>` privacy-choices panel (see `docs/LEGAL_AND_PRIVACY.md`).
- **SignIn** island — the account flow (see `docs/AUTH_AND_ACCOUNTS.md`).
- **Tool shell** — `.tool` in `src/islands/tools.css`: two columns, inputs left, a sticky results
  ledger right on a `--bg-2` bench, a "how this works" `<details>` with the formula.

## 5. The advanced visual layer (progressive enhancement)

Everything here is additive: the page is complete and correct without it. Each feature sits
behind `@supports` and/or `prefers-reduced-motion`, so old browsers and reduced-motion users get
a clean static page. Support notes are current as of September 2026.

- **Cross-document View Transitions** (`@view-transition { navigation: auto }`): a short root
  fade between pages. Chrome + Safari; Firefox degrades to an instant swap. We do *not* use
  Astro's `<ClientRouter/>` — native cross-doc transitions do the job and keep the JS budget and
  the CSP simple. Reduced motion disables it.
- **No reveal-on-scroll and no frosted bars** (removed in v3). Fade-ins left pages looking
  half-loaded and are a generated-page tell; blur is costly on budget phones.
- **Subgrid** aligns the three edition columns on the front page so their ledgers read across;
  behind `@supports (grid-template-rows: subgrid)`, with a plain stacked fallback.
- **Scroll-state, container queries, anchor positioning, Popover API, customizable `<select>`**:
  approved for use *only* behind `@supports`, because Firefox and/or Safari support is still
  partial in 2026. Prefer a plain sticky + IntersectionObserver pattern until a
  feature is Baseline. Document the fallback next to any use.
- **`color-mix()`, `light-dark()`, `clamp()` fluid type, `text-wrap: balance/pretty`,
  `:has()`, `@property`**: safe to use directly; all are widely available. `light-dark()` is
  available but we keep explicit light/dark token blocks so the values are auditable.

When you reach for something new, the test is: does the page still look finished with the
feature off? If not, it's decoration, and it doesn't ship.

## 6. Motion

`--dur` 240ms default, `--ease` `cubic-bezier(0.2,0.7,0.2,1)`. Everything animated is gated
behind `prefers-reduced-motion: no-preference`, and the global reduce-motion block collapses all
durations to ~0. Never animate a frequent interaction (typing, tab switches you do constantly),
never make motion the only signal, always let it be interrupted.

## 7. Screens to verify before shipping UI

360×800, 390×844, 768×1024, 1280×800, in light and dark, plus: 200% zoom, keyboard-only, reduced
motion, `prefers-contrast: more`. `npm run screenshots` captures the 360/1280 light/dark set.

## 8. What "AI-made" looks like, and our answers

The brand guide §8 is the checklist. In one line each: default fonts → Bricolage + Atkinson;
gradients and glows → flat fills, no shadows; centred hero + mock device → left-aligned contents
with real lessons and real sums; three identical icon cards → three editions with different
content on shared rows; scroll fade-ins → none; slogan copy → specific numbers; pill everything →
square corners. The design-reviewer subagent checks these on every change.
