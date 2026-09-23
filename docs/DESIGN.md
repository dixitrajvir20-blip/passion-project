# Business Lab design system

Version 4.1 · 21 September 2026 (the page is white; blue is the header band, the rules and the outlines; `.on-band` carries the white-ink remap, `.on-field` is now a white surface with a blue rule under it). v4.0 (19 September) supersedes v3 (the light ledger look) and v2 (LaunchPad). Read `docs/BRAND_GUIDE.md` first —
this file is how the brand is built in code. The machine source of truth is
`src/styles/tokens.css`; this document explains the rules behind it and how to extend them.

## 0. The two jobs

Every screen has to do two things at once, and the tension between them is the whole design:

- **Feel at home** — familiar patterns, system-like controls, nothing to learn.
- **Be unmistakable** — you could crop out the logo and still know it's Business Lab.

Resolve it the way Apple does: structure and controls are quiet and conventional; identity lives
in the dark-blue field and white sheets, the ledger (every sum set like a cash book), the gold
panel, the highlighter, and the badge.

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
- The page is `--field`, white since v4.1. The header carries `.on-band` (the one blue band,
  `--band`), which re-maps ink to white and links and focus to gold (`tokens.css`); heroes and
  title bands carry `.on-field`, now a `--band-surface` (white; the field in dark mode) with a
  3px `--frame` rule under it; `.panel-field` and `.panel-deep` are outlined in `--frame`.
  `.section-dark` (navy) is the footer. Because `color` inherits as a computed value, `base.css`
  also sets `color` on those classes. The contrast script checks `--frame` against both surfaces.
- Sheets and cards are `--bg` (white); soft panels `--field-pale`; the calculator bench `--bg-2`.
  Receipts, flashcards and the edition menu use `--paper`, white in both modes.
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
  signature. Rows wrap on narrow screens so a long figure drops to its own line (WCAG 1.4.10).
  Used by `Worked.astro` (on a receipt), `EditionSum.astro` and every calculator's `Result`
  (`minus` prints a deduction, `main` closes the total); `Figure` is the headline answer above it.
- **EditionSum** — an edition's break-even example as a ledger, computed from `finance.ts`.
- **Edition menu** `RegionTabs.astro` — a `<details>` dropdown in the header with `Flag.astro`
  (drawn SVG flags, the one place besides the logo where raw hex is allowed). Escape and outside
  clicks close it; the choice is remembered in `lp:region`.
- **Header** — on the field: badge + wordmark, a white pill group (Learn, Tools, Glossary,
  Dashboard, About, Search), the edition menu. One row and sticky from 1040px, where the pills fit
  beside the brand; the one-row header is 72px (`--header-h`), which the scroll padding and sticky
  offsets are sized from. Below 1040px the nav takes its own row and the header scrolls away.
- **Footer** — navy, badge + wordmark, editions, site, legal.
- **Button** `.btn` (navy on sheets, gold on the field), `.btn-secondary` (white pill with a
  navy outline, everywhere), `.btn-link`, and `.cta` (label block + separate arrow box).
- **Panels and sheets** `.panel` + `-field | -deep | -pale | -white | -gold`; `.sheet` and
  `.page-sheet` (a white sheet with rounded top corners).
- **Pills and stickers** `.pill`, `.pill-white`, `.pill-outline`, `.sticker`.
- **Grid table** `.grid-table` — outlined cards sharing borders (tracks on the edition front, the
  starter lessons on the front page).
- **HandNote** — a short aside drawn from Kalam at build time (`src/lib/hand.ts`); the text stays
  in the page for screen readers. Front page and edition receipts only.
- **Blobs**, **Doodle** — decoration behind heroes and at card edges; hidden from assistive tech.
- **Poll** `Poll.astro` — the question card: a small label, options as outlined rows, one navy
  reveal button. Works without JavaScript.
- **Lesson template v2 pieces** — `Document.astro` (the drawn payslip, statement, offer, loan
  sheet, payout or app screen, each line a `<details>` hint), `Video.astro` + `VideoPlayer.tsx`
  (poster drawn in tokens; the youtube-nocookie iframe only after play and a yes to `embeds`),
  `ShowMe.astro` + `ShowMeStep.astro` (the ledger one captioned line at a time, nested
  `<details>`), `Practice.astro` (the faded ledger, three `.practice-hint` disclosures, the poll),
  `.key-idea` (the one highlighted sentence, `.hl`), the `.lesson-steps` nav under the title,
  `.lesson-after` (objectives as type under a hairline) and `.practice-more` (a folded second run).
  All HTML-first; only the video player and the explorers are islands.
- **Callout** `.callout` — the "Key points" sticky note.
- **Dashboard** island (`src/islands/Dashboard.tsx`, `/dashboard`) — reads `lp:progress`,
  `lp:activity` and `lp:region`; sidebar + cards; SVG bars and ring coloured by class; a table for
  the chart. `Privacy choices` opens the consent dialog through the `lp:open-consent` event.
- **ConsentManager** island — banner + `<dialog>`; the `stats` category (learning time) is the
  first optional category to be active, so the banner now appears on a first visit.
- **SignIn** island — the account flow, a preview until Phase 6 (see `docs/AUTH_AND_ACCOUNTS.md`).
- **Tool shell** — `.tool`: inputs left, a sticky results bench right with a `Figure` and a ledger.
- **Tool kit** (`src/islands/tool-kit.tsx`), shared by every calculator:
  - `NumberField` — label, optional hint, and an optional `note` (`.field-note`, `--text-sm` in
    `--ink-2`: a line that is not an error, such as "Counted as 2"), all tied to the input with
    `aria-describedby`; errors are text, never the border alone.
  - `SelectField` — a choice from a fixed list, with the same markup as `NumberField`. It renders
    only its listed options, and a link may set only one of them (`allowed` in `useFields`).
  - `RowList` — repeated rows (payslip lines, pay-later plans) in a `fieldset`, each row its own
    `fieldset` with a numbered legend. After Add, focus moves to the new row's first field; after
    Remove, to the first field of the row now in that place, or to Add when none is left; the
    removal is announced in a `role="status"` line. At the cap, Add is disabled and says why in
    visible text.
  - `Result` rows — `op` prints the step before the figure (`minus` is '−'); `subtotal` draws a
    single rule above a running figure (`.ledger-subtotal`, never the double rule); `note` sits on
    its own line under the row (`.ledger-note`); `main` closes the answer with the double rule.
  - `ToolNotes` — plain-text notes under a result (`.tool-notes`): what the tool assumed or left out.
  - `ToolActions` — Reset, Copy link and (where the device has one) Share, with the link note under
    the buttons (`.link-note`): "The link holds the numbers on screen, so anyone you send it to
    will see them. This site never receives them."
  - `useLocale` — **a tool whose config carries edition rules shows no currency field**: it formats
    in its edition's locale (or calls `useLocale(code, { fixed: true })`, which never reads or
    writes `lp:locale`), so a saved currency can never put one country's rates in another's money.
- **RulesLine** `RulesLine.astro` — server-rendered under a calculator: "Rules as of {date}:" and
  each edition rule the tool uses, with its source link and the day it was checked. Rules come
  from the tool's own module (`src/lib/tools/<slug>.ts`), keyed on the page's edition.
- **ToolTerms** `ToolTerms.astro` — "Terms on this page": the glossary entries a tool page uses, as
  a definition list linked to `/glossary`. A missing glossary id fails the build.
- **Tools index** `/<edition>/tools` — grouped by life moment (`GROUPS` in `src/lib/tools.ts`):
  plain jump links under the lede (`.tool-jumps`, no pills), then one `section.tool-group` per group
  with an `h2` and `.index-list` rows. Each row is the question it answers (`h3`), the tool's
  title, and a meta line in set type (`.index-meta`, `--text-sm`, `--muted`): "Calculator, about 2
  minutes" or "Drill, 6 situations, about 5 minutes". No icon, pill, sticker or badge. Group sizes
  differ, so the page is not a stack of equal bands. The edition fronts' gold panel shows one
  giant question per group plus "All N tools"; the home panel shows the all-edition ones.
- **Lesson hand-offs** `.tool-handoffs` — server-rendered links from a lesson to its `tool` and
  `moreTools` ("Try your own numbers: what reaches my account?", "Practise on more situations in
  “UPI: spot the fake”"), inside the explorable section; the explorer's own link is fixed by its
  kind (`EXPLORER_TOOL`).
- **Tools still being built** — a calculator whose island is a stub carries `ready: false` in
  `TOOLS`. It gets no page, no index row, no line on the fronts or the home panel and no lesson
  hand-off (`toolsFor` leaves it out; `registeredFor` still lists it, for checking lesson links).
  The builder deletes the line when the island is real; the release check allows none.

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
- **Learning time** is a five-second tick in `BaseLayout.astro` that adds to `lp:activity` only
  while the page is visible and only after a yes to the `stats` category; a later no clears it.
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
