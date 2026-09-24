# Business Lab design system

Version 5.1 · 23 September 2026; supersedes v4.1 (21 September), v4.0 (19 September), v3 (the light
ledger look) and v2 (LaunchPad). Read `docs/BRAND_GUIDE.md` (v4) first: this file is how the brand
is built in code. The machine source of truth is `src/styles/tokens.css`; this document explains
the rules behind it and how to extend them. The owner's decisions behind v5.1 are in the brand
guide §0; the reference notes are in `docs/research/redesign-references.md`, and the full build
spec in `docs/research/redesign-v5.1-spec.json`.

## 0. The two jobs

Every screen has to do two things at once, and the tension between them is the whole design:

- **Feel at home**: familiar patterns, system-like controls, nothing to learn.
- **Be unmistakable**: you could crop out the logo and still know it's Business Lab.

Structure and controls are quiet and conventional, but not a copy of any one system (owner
decision 10: GOV.UK for type rules, rhythm and restraint only). Identity lives in the ledger (every
sum set like a cash book), the badge, the navy ink and well-set type.

## 1. Tokens

All colour, type, space, shape and motion are CSS custom properties in `src/styles/tokens.css`, in
this order: colour (`--bg`, `--surface`, `--tint`, `--ink`, `--ink-2`, `--muted`, `--rule`,
`--border`, `--blue`, `--blue-dark`, `--on-blue`, `--focus`, `--error`, `--success`), chart series
and grid, print, type (`--font-body`, `--text-xs` … `--text-display`, leadings, `--tracking-h1`),
space (`--space-1` … `--space-9`, `--space-section`), layout (`--gutter`, `--wide`, `--column`,
`--measure`, `--rail`, `--bar-h`, `--edition-row-h`, `--sticky-top`, `--target`, `--target-lg`),
shape (`--radius`, `--radius-pill`, `--rule-w`, `--control-w`, `--bar-w`) and motion (`--dur-fast`,
`--ease`). Then a `prefers-contrast: more` block (light), and the two band remaps, `.on-band` and
`.on-band-wide` (§2).

Rules:

- No raw hex, px radius, px font-size, shadow or `font-family` in a component. Add a token.
  (`Logo.astro` and `Flag.astro` draw the badge and the flags and are the only raw-hex exceptions.)
  One documented duplicate: `themeColor` in `src/lib/site.ts` repeats `--blue` (`#0b4aa2`) for
  `<meta name="theme-color">`, because a meta attribute cannot read a CSS token; change both together.
- No `style=""` attributes and no runtime-injected `<style>`. The site ships a strict Content
  Security Policy with per-inline hashes (see `docs/SECURITY.md`); an inline style attribute or a
  script-built style tag is blocked. Put the value in a stylesheet or a token and toggle a class.
  `tests/e2e/design.spec.ts` reads every built page in `dist/` and fails on a `style=` attribute.
- **No dark block** and no `var()` aliases: every token is a plain value. The site is light only.
- `scripts/contrast-check.mjs` (via `scripts/tokens.mjs`) reads 6-digit hex from the first root
  block, the more-contrast block, `.on-band` and `.on-band-wide`, and fails the build on any pair
  under WCAG 2.2 AA. `scripts/og-images.mjs` reads its colours from the same root block by name.
- `--banner-reserve` is not used: the consent banner is a static block, so it reserves nothing.
  There are no component-scoped custom properties.

### The rename map (v4 → v5.1, applied 22–23 September 2026)

The v4 names are gone, not aliased; the grep in `docs/research/redesign-v5.1-spec.json` step 22 is
the check that none comes back.

| v4 name | v5.1 |
|---|---|
| `--field`, `--paper`, `--band-surface` | `--bg` |
| `--band` | `--blue` (the bar) |
| `--accent`, `--accent-text` | `--blue` |
| `--accent-hover` | `--blue-dark` |
| `--on-accent` | `--on-blue` |
| `--field-deep`, `--field-pale`, `--bg-2` | `--surface` |
| `--bg-3`, `--accent-soft`, `--gold-pale`, `--highlight` | `--tint` |
| `--frame`, `--line` | `--rule` |
| `--line-strong`, `--bg-inverse`, `--brand-navy`, `--brand-black`, `--on-gold` | `--ink` |
| `--gold-text` | `--muted` |
| `--gold`, `--brand-gold` | removed (gold is retired) |
| `--brand-blue` | the badge's own `#0C61C4` in `Logo.astro`; `--series-1` in charts |
| `--font-display`, `--font-mono` | `--font-body` |
| `--text-ui`, `--text-sticker` | `--text-sm` |
| `--text-h3`, `--text-wordmark` | `--text-lg` |
| `--text-result` | `--text-h2` |
| `--text-figure` | `--text-h1` |
| `--text-mega` | `--text-display` |
| `--text-hand` | removed |
| `--leading-tight`, `--leading-mega` | `--leading-h1` |
| `--leading-snug` | `--leading-heading` |
| `--tracking-display` | `--tracking-h1` |
| `--tracking-heading` | 0 (no token) |
| `--radius-xs` … `--radius-xl` | `--radius` (4px) |
| `--dur`, `--dur-slow` | removed; `--dur-fast` moves the consent switch knob only |
| `--header-h`, `--edition-h` | `--bar-h`, `--edition-row-h` |
| `--space-10` | removed |

## 2. Colour in practice

Palette, roles and every contrast figure are in the brand guide §2. In code:

- **Three kinds of link** (`base.css`):
  (a) inside running text: `--blue`, always underlined, `--blue-dark` with a 3px underline on
  hover; (b) a row in a ruled list (`.index-row`, `.lesson-row`, `.taxonomy-list a`, search
  `.r-title`): ink 700, the whole row is the link, the title underlines on hover and focus; (c) a
  standalone link (`.crumb a`, `.tool-handoffs a`, `.taxonomy-all a`, `.tool-jumps a`,
  `.review-line a`, `.lesson-next a`): ink 700, always underlined, on its own 44px line. A heading
  that is only a link is a 44px target too. No visited colour, no arrow glyphs.
- **The bar.** `.on-band` remaps `--ink`, `--ink-2`, `--muted` and `--focus` to white. It sits on
  what always lives on the bar: the brand link, the Menu summary and the wide nav. `.on-band-wide`
  does the same from 1024px only, for the edition summary, which sits in the white row below that.
  Because `color` inherits as a computed value, `base.css` also sets `color` on those classes.
- `--surface` is for the results bench, the explorer, the video poster, the formula and inline
  code, always with an edge. `--tint` is for selected states and `<mark>` only. `--border` is the
  edge of anything you operate (4.05:1); `--rule` is decoration (dividers, box edges).
- There is no `.on-field`, `.section-dark`, `--paper` or gold, and no coloured panel below the
  header.
- `color-mix()` stays allowed where a tint is needed (the dialog backdrop is ink at 55%).
- Verify with `npm run contrast`.

## 3. Type

Atkinson Hyperlegible Next only, 400 and 700, self-hosted and subset (`public/fonts/atkinson-latin`
and `-latin-ext`), with `atkinson-latin` preloaded. Scale and rules in the brand guide §3.
Bricolage Grotesque and Kalam are removed from the site. Build-time fonts in `scripts/fonts/`:

- `BricolageGrotesque[opsz,wdth,wght].ttf` and its `OFL.txt`: the share images
  (`scripts/og-images.mjs`), until Rajvir approves an Atkinson Hyperlegible Next TTF (OFL); then the
  script's `FONT` and `FAMILY` swap and these two files go. The badge's B is a drawn path, so it
  needs no font file.

## 4. Components (all in `src/components`, `src/islands`, `base.css`, `lesson.css`, `tools.css`)

Every current-item bar is a border (`border-inline-start` or `border-bottom`), never a box-shadow or
a background, so it survives forced colours.

- **Header** (`Header.astro`): one blue bar at every width (56px, 64px from 1024px), painted by
  `.site-header::before`; static, never sticky. Below 1024px the bar holds the inverse badge, the
  wordmark and a Menu `<details>` whose summary sits in the bar and whose panel opens in the flow;
  the edition menu is a white 48px row under the bar. From 1024px: badge, wordmark, six links in
  white (the current one with a 4px white bottom bar) and the edition summary. One script handles
  every `details[data-disclosure]`: Escape closes and returns focus, an outside click or focus
  leaving closes it, and opening one closes the other. Exactly one `nav[aria-label=Main]` is
  exposed at a time.
- **Edition menu** (`RegionTabs.astro`): a `<details>` with `Flag.astro` flags; below 1024px its
  list opens in the flow, from 1024px it is a 280px dropdown. The current edition is 700 with a
  4px blue bar and a drawn check. The choice is remembered in `lp:region`.
- **Logo** (`Logo.astro`): `variant` default (blue disc, white B) or inverse (white disc, blue B,
  on the bar); `scripts/brand-mark.mjs` has `badge()` and `badgeInverse()` for build scripts.
- **Footer** (`Footer.astro`): white, a 1px rule on top, the default badge at 32px, small ink
  headings, links in 44px rows, the "Privacy choices" text button.
- **Buttons** `.btn` (blue, at most one per screen), `.btn-secondary` (neutral: white, 2px ink
  edge, ink label; `--surface` on hover), `.btn-sm` (44px), `.btn-link` (a text button: ink 700,
  underlined, 44px), `.btn-row`. No transforms, transitions, arrow boxes or shadows. A calculator
  has no primary: Reset, Copy link and Share are `.btn-secondary .btn-sm`.
- **Crumb** `.crumb`: one line, one standalone link back ("All tools", "All tracks", "Learn", or on a
  lesson the track's name), with no arrow glyph, and on a lesson `.crumb-pos` ("Lesson n of N · m
  min").
- **Forms**: the tool kit's order, label, hint, input, note, error. Inputs have a 2px ink edge and
  are 48px tall; radios and checkboxes are 24px in ink.
- **Tables** `.table`: ruled rows, a 2px ink rule under the head, no stripes; money never breaks
  between digits (`.table td.num`, `.table.numbers td`, `.table .numbers td`), so a wide table
  scrolls inside `.table-wrap`; word tables in `.prose` wrap instead.
- **Ledger** `.ledger` / `.ledger-row` / `.ledger-label` / `.ledger-figure` / `.ledger-total`
  (double rule) / `.ledger-subtotal` (single rule) / `.ledger-note`: the signature. The dotted
  leader is the figure's own `::before`, so the two wrap as one: on a narrow screen a long figure
  drops to its own line with its leader (WCAG 1.4.10). The total's double rule is a double underline
  under the figure's text, not a border, so it never runs under the leader. On the results bench the
  row above a total or subtotal drops its hairline, leaving the ink rule alone. Used by `Worked.astro`,
  `ShowMe.astro`, `EditionSum.astro`, the explorers and every calculator's `Result`.
- **Index list** `.index-list` / `.index-row` / `.index-title` / `.index-sub` / `.index-meta` /
  `.index-flag`: ruled rows, the row is the link; a flag spans every line of its row. The home
  editions and starters, the tools index; the taxonomy lists share the look under their own names.
- **Lesson list** (`LessonList.astro`): numbered ruled rows with read and checks-done marks as
  words; its styles are scoped in the component.
- **Folds** `.fold` (and, through `:where()`, `.lesson-details`, `.practice-hint`, `.tool
  details.how`, `.growth details`, `.week-table`, `details.lesson-steps-fold`): the site's own
  disclosure, an ink 700 summary led by "+" ("−" once open), 44px tall, no triangle. An open fold's
  body is set in from a 4px `--rule` bar (`::details-content`, behind `@supports`; flush left
  without it). The poll reveal, Show me, the drawn document's hints and the header menus are not
  folds: they have their own looks.
- **Lesson frame** (`LessonLayout.astro`, `lesson.css`): the crumb, the head (h1, lede), "In this
  lesson" (`nav.lesson-steps`, a closed fold on phones, opened by `LessonScript` and sticky in a
  256px rail from 1024px; each link's text equals its h2), "After this you can", then the lesson;
  the byline and licence in `.lesson-fine` at the foot, then "Next: <title>".
- **Poll** (`Poll.astro`; `Review.tsx` repeats the markup): a framed question, options as outlined
  rows (checked: a 2px ink edge, the tint, 700), the reveal a secondary button, the result in words
  (`.poll-status`, "Correct." in the success green via `data-result`).
- **Document** (`Document.astro`): the payslip or statement drawn in tokens in a white `.box`, its
  lines split by solid `--rule` hairlines; the dotted underline is kept for the tappable label only.
- **Show me** (`ShowMe.astro`, `ShowMeStep.astro`): one ledger line at a time behind a small
  secondary button that turns into quiet text once open.
- **Key idea** `.inset`: a 4px ink bar, ink 700 at `--text-lg`. Never a highlighter, never blue. In
  a lesson it sits inside Show me's last fold, after the answer, so it arrives with the last line.
- **Video** (`Video.astro`, `VideoPlayer.tsx`): a compact drawn poster on `--surface` (title,
  channel, Play, the link out), left-aligned at every width; the 16:9 frame is the player's, once it
  loads. The caption under it is the meta line only (channel · minutes · note). Play is the one
  primary until the question is put, then "Choose, then play" is.
- **Mock screen, term and popover** (`MockScreen.astro`, `Term.astro`): a white `.box` with square
  corners; a dotted-underlined term that opens a sheet at the foot of the screen (Popover API behind
  `@supports`).
- **Explorer** (`explorer.css`): a `.box-surface`; preset keys white with a `--border` edge, the
  pressed key a 2px ink edge and the tint.
- **Results bench** (`tools.css` `.tool .results`): `--surface`, a rule edge, a headline figure and
  a ledger; sticky from 900px only while the whole bench fits the window (`[data-bench-fits]`).
  The result sentence (`p.plain`) is a `role="status"` line in every calculator.
- **Budget lines**: the name on its own line, then amount, kind and Remove, wrapping on the
  narrowest phones; one line with column heads only from 640 to 899px, where the fields have the
  page's whole width. The kind select is never narrower than "Savings".
- **Boxes** `.box`, `.box-surface`: only where a box holds a figure or mixed content.
- **Notes and statistics** `.note`, `.figure`: each figure carries its sentence and its source,
  as ruled rows, never a stat banner.
- **Charts**: savings growth, the dashboard week and ring, lesson SVGs; colour by class from
  `--series-*`, direct labels and a table always.
- **Consent** (`ConsentManager.tsx`, `consent.css`): the first-visit banner is a static block in
  the flow under the header (a 2px ink rule on top), shown from the first paint while
  `html[data-consent-ask]` is set, so it never covers a focused control at any size or zoom; the
  Privacy choices `<dialog>` with On/Off switches. The switch knob is the one thing that moves.
- **Dashboard** (`Dashboard.tsx`, `dashboard.css`): a side nav with a 4px blue current bar and a
  grid of ruled boxes; the week chart marks today in ink with the word "Today".
- **Forced colours**: every state edge is a border already; the switch and the week chart carry
  system colours (`base.css`, `consent.css`, `dashboard.css`).
- **Print**: the header, footer, buttons and progress marks are hidden; ink is black on white.

Removed in v5.1: `HandNote`, `Blobs`, `Doodle`, `TrackCard`, `src/lib/hand.ts`, the panels, pills,
stickers, cards, the gold highlighter and every v4 class in the old LEGACY blocks.

## 5. The advanced visual layer (progressive enhancement)

Everything here is additive: the page is complete and correct without it.

- **Cross-document View Transitions are removed**, with smooth scrolling. There are no page
  transitions, no scroll effects and no frosted bars.
- **`:has()`, `clamp()`, `color-mix()`, `text-wrap: balance/pretty` and native `<details>`**
  disclosures are used directly; all are widely available.
- **Behind `@supports`**: the Popover API (the term sheet) and `::details-content` (the fold body's
  inset rule). Scroll-state, container queries and anchor positioning are not used.

When you reach for something new, the test is: does the page still look finished with the
feature off? If not, it's decoration, and it doesn't ship.

## 6. Motion

None, except the consent switch knob: `--dur-fast` (150ms) with `--ease`, only under
`prefers-reduced-motion: no-preference`, and instant under reduced motion (the global block in
`base.css` collapses every duration). Never make motion the only signal.

## 7. Screens to verify before shipping UI

320×640, 360×800, 390×844, 768×1024 and 1280×800 in light, plus 640×400 (200% zoom), keyboard
only, reduced motion, `prefers-contrast: more` and forced colours. `npm run screenshots` writes
360, 768 and 1280 in light, plus `*_dark-os.png` captures at 360 and 1280 that show the page stays
white under a dark OS.

`tests/e2e/design.spec.ts` proves: a dark OS still gets the white page, the one blue bar and ink
headings; nothing scrolls sideways at 320, 360 and 640×400; every a, button and summary in the site
header, footer, consent banner and "In this lesson" is at least 44px tall and 24px wide at 360 (with
each menu open in turn); the video question keeps one primary button; nothing is set in or fetches
Bricolage; and no built page carries a `style=` attribute. `tests/e2e/og.spec.ts` proves each share
image is its own, a white card under the blue bar, with no gold. The axe audit
(`tests/e2e/a11y.spec.ts`) runs on every page at the Pixel 5 (393px) and desktop (1280px) sizes.

## 8. What "AI-made" looks like, and our answers

The brand guide §8 is the checklist. In one line each: default fonts → one deliberate, accessible
face; gradients and glows → flat white with rules; a centred hero and a mock device → left-aligned
contents with real sums on the first screen; three identical cards → ruled lists; scroll fade-ins →
none; slogan copy → specific numbers; pill everything → one 4px radius and text links; blue
everywhere → blue in five jobs. The design-reviewer subagent checks these on every change.
