# Business Lab brand guide

Version 2.0 · 18 September 2026 · owner: Rajvir Dixit. v2 renames the site from LaunchPad to
Business Lab and replaces the launch-page layout, which read as generated, with the ledger
and edition-line system below.

This is the one place the brand is defined. If a colour, font size, radius or spacing value
is not in here (or its machine form in `src/styles/tokens.css`), it should not appear in the
product. The rule that keeps Business Lab from looking generated is that every choice traces back
to this document, and this document says why.

## 1. What Business Lab is

A free learning hub that teaches money and business to 15–21-year-olds who don't have an
adviser or a family member to ask, with editions for the money system each reader actually
lives in. It is named after the school club it grew out of, whose idea is that business is a
life skill. The brand has to read as **trustworthy, calm and grown-up**, the opposite of the
loud "finance bro" and "get rich" look these readers are surrounded by, while still feeling
made for them, not for their parents.

One-line thesis: **work shown, nothing sold.** The site looks like a club's well-kept
notebook: sums written out the way a cash book writes them, the key sentence highlighted, the
edition named at the top of every page. Nothing on it looks like an advert, because nothing
on it is one.

Where each choice comes from, so it is never a default:

- **The ledger** (§5) comes from money itself: shopkeepers, cash books and receipts put the
  label on the left, the figure on the right and a double rule under the total.
- **The edition line** (§5) comes from news sites, which switch between national editions in a
  strip at the top of the page. The site is organised the same way.
- **The highlighter** (§2) comes from how students actually mark a textbook.
- **The badge** (§4) is the club's own logo.

## 2. Colour

Three brand colours: **blue, gold, black**, on white and near-white. Navy is the deep anchor;
gold is the single spark; blue does the work. Every value below is contrast-checked against the
surface it sits on (WCAG 2.2 AA: 4.5:1 for text, 3:1 for large text and non-text). Run
`npm run contrast` after any change — it prints these numbers and fails the build on a miss.

### Core

| Token | Hex | Role |
|---|---|---|
| Ink black | `#0B0B0F` | Primary text, the "black" of blue/gold/black |
| Deep navy | `#0B1240` | Brand anchor: logo tile, dark sections, deepest surface |
| Signal blue | `#0C61C4` | Actions, links, the working brand colour |
| Marigold | `#F2C14E` | One accent: the spark on the logo, a highlight, a callout tint |
| Paper white | `#FFFFFF` | Base surface |

### Light mode (surface → tokens)

| Token | Hex | On white | Use |
|---|---|---:|---|
| `--ink` | `#0B0B0F` | 19.6:1 | Headings, primary text |
| `--ink-2` | `#3C3F47` | 10.5:1 | Body text |
| `--muted` | `#5F6472` | 5.9:1 | Secondary text, captions |
| `--accent` (blue) | `#0C61C4` | white on it 6.0:1 | Button fills, focus ring |
| `--accent-text` | `#0C61C4` | 6.0:1 | Links |
| `--gold` | `#F2C14E` | black on it 11.7:1 | Fills and marks only |
| `--gold-text` | `#7A5A0E` | 6.4:1 | The one place gold becomes text: eyebrow labels |
| `--bg-2` | `#F2F5FA` | — | Panels, the calculator bench, alternating sections (a faint blue, not grey) |
| `--highlight` | `#FBE3A6` | ink on it 15.6:1 | The highlighter behind a lesson's key sentence (dark: `#4A3C12`, 9.9:1) |
| `--error` | `#C42B1C` | 5.7:1 | Errors |
| `--success` | `#1B7F4E` | 5.0:1 | Confirmations |

**The gold rule, because it is the easy mistake.** Gold on white is 1.7:1 — it fails for text.
So gold is never small text on a light surface. It is: the logo spark, a fill behind black text
(11.7:1), a hairline or underline, the tint of a callout, or text on navy/black (10.7:1). The
eyebrow "label" you see above headings uses `--gold-text` (a dark ochre), not marigold.

### Dark mode

Dark is a designed set, not an inversion. Surfaces are near-black (`#0B0B0F` / `#16171C` /
`#1F2027`); text softens to `#F5F5F7`. Blue links brighten to `#8FBEFF` (10.3:1); the blue
*fill* stays `#0C61C4` with white text (6.0:1). Marigold now passes as text (11.7:1), so the
focus ring and eyebrows switch to gold. Full values live in `tokens.css` under the
`prefers-color-scheme: dark` block.

### Navy: the frame

Navy (`.section-dark`, `#0B1240`) re-maps the tokens for everything inside it: text goes light,
links go pale blue (9.3:1), marigold marks the current item (10.7:1). It is used in exactly two
places, the edition line at the top of every page and the footer at the bottom, so every page is
framed the same way. Content sections stay on paper.

### Don't

- No purple, no violet-to-blue gradients, no gradient text. One accent, flat fills.
- No glows and no drop shadows. Depth comes from surface colour and rules (§6).
- No colour as the only signal: pair it with text, weight or an icon.
- Never hard-code a hex in a component. Add or reuse a token.

## 3. Typography

Two families, both self-hosted (no font CDN, so a page load reveals nothing about the reader),
both licensed under the SIL Open Font License.

- **Bricolage Grotesque** — display. Headlines, big numbers, the wordmark. It has warmth and a
  slight irregularity that keeps headings from feeling like a default grotesque (Inter, Roboto,
  Geist), which is the number-one "AI slop" tell. Weights 600–800.
- **Atkinson Hyperlegible Next** — body and UI. Designed by the Braille Institute for low-vision
  readers: its letterforms are disambiguated (I, l, 1; O, 0), which is exactly right for a site
  whose readers include people on cheap screens in bright light. Weights 400–700.
- **Devanagari** (planned, Hindi edition): Noto Serif Devanagari for display, Noto Sans
  Devanagari for body.

**Never** ship in: Inter, Roboto, Arial, Helvetica-as-brand, Space Grotesk, Geist, Instrument
Serif/Sans, Poppins, Montserrat. They are the generated-page defaults; using them undoes the
point of choosing a face at all.

### Scale (fluid; clamps in `tokens.css`)

| Token | Size | Use |
|---|---|---|
| `--text-display` | 40 → 76px | Home hero only |
| `--text-h1` | 36 → 60px | Page titles |
| `--text-h2` | 28 → 40px | Section headings |
| `--text-h3` | 20 → 24px | Card and sub headings |
| `--text-lg` | 19 → 21px | Lede paragraphs |
| `--text-md` | 17px | Body (never smaller for reading text) |
| `--text-sm` | 15px | Captions, metadata |
| `--text-xs` | 13px | Legal fine print, source lines (minimum) |

Rules: headings use `text-wrap: balance` and tight tracking (−0.025em on display); body uses
`text-wrap: pretty` and a 64ch measure; money and data use `font-variant-numeric: tabular-nums`.
Body text never drops below 15px, and reading text stays at 17px+ (Apple's iOS body minimum,
and what NN/g found teens need — they dislike tiny text).

## 4. The logo

The Business Lab logo is the club's badge: a blue circular badge with a white B.

**Status: interim.** The version on the site today is a stand-in drawn for this repo: a
`#0C61C4` disc, a thin white inner ring and a white B cut from Bricolage Grotesque 800 (white on
the blue is 6.0:1). It exists so the rename could ship. The club's real badge will replace it
once there is a **licensed, unwatermarked file** (SVG preferred, or a PNG at least 1024px). The
image shared on 18 September 2026 carries a Design.com watermark, which marks it as a preview:
it must not be published until the licence is bought and the clean file downloaded.

To swap in the licensed badge:

1. Put the file in `public/brand/` and replace the drawing in `src/components/Logo.astro`
   (header and footer) and `scripts/brand-mark.mjs` (share images and icons).
2. Run `node scripts/brand-icons.mjs` to rewrite the favicon, `logo-mark.svg` and the app icons.
3. Check the badge at 32px in the header: fine detail such as rays or ribbon text disappears at
   that size, so the header may need a simplified version of the mark.

Rules for either version:

- Files: `public/brand/logo-mark.svg`, `public/favicon.svg`, `public/icons/` (PWA + maskable).
- Minimum size: 24px. Header 32px, footer 36px, share images 60px.
- The wordmark is Bricolage Grotesque 800, tracking −0.02em, in ink (or `#F5F5F7` on navy).
- The logo appears in the header and the footer only. Don't recolour it, add a gradient or glow,
  stretch it, put it on a busy photo, or repeat it around the page. Branding defers to content.

## 5. Layout and shape

- Grid: 1120px max content width, 720px reading column, 24px side gutter, 4px spacing scale.
- Radius: 4 / 8 / 12 / 14px. Buttons, keys and the callout use 8px; inputs 12px; panels 14px.
  Nothing is a pill except on/off switches, which people expect to be round. Square corners
  belong to paper, ledgers and receipts; pills belong to app stores.
- **Contents first.** The front page and each edition front show real lessons, real numbers and
  real calculator questions near the top. Nothing on a landing page describes the site in
  place of showing it: no mock phones, no fake app cards, no "how it works" 1-2-3 strip.
- **The ledger** is the signature (`.ledger` in `base.css`). Wherever a sum is done (worked
  examples, calculator results, the edition front's example) it is set the way a cash book sets
  it: label left, figure right, a dotted leader between, a single rule above a total, and a
  **double rule under the final answer**. It is never decoration. If a number isn't the result
  of a sum on the page, it doesn't get a ledger.
- **The edition line** is a navy strip above the header on every page, naming India, Europe and
  United States as plain text links; the current one is bold with a marigold underline.
- **Index rows** (`.index-list`): lessons, tracks and calculators are ruled rows with the
  question or title first. Lessons carry their number in the track, which is a real sequence.
- Panels (`--bg-2`, no border, no shadow) are rare: the calculator bench, the edition's worked
  example and the lesson explorable. Most things are type and rules on paper.
- The "In 30 seconds" note is a gold-edged callout. On wide screens it steps into the margin
  beside the lesson, the way a textbook prints its summary beside the text.
- Whitespace is the main tool. Vary section rhythm (a tall intro, a tight band of figures, a
  tinted calculator band) rather than stacking equal blocks.

## 6. Depth and motion

- **No shadows.** Depth comes from surface colour (paper → blue-tinted panel → navy frame) and
  from rules. The sticky header is a solid bar with a hairline; blur is expensive to repaint on
  the budget Android phones this site is built for.
- Motion is one thing: a short cross-page fade (View Transitions), off under reduced motion.
  Content does not fade or rise in as you scroll. That effect made every page look half-loaded
  in screenshots and is a hallmark of generated landing pages.

## 6b. Charts

Charts follow the data-viz method in the `dataviz` skill: pick the form first, colour by job
(categorical / sequential / diverging / status), thin marks, direct labels, a legend for two or
more series, a data table always, and one axis — never a dual-axis chart. The categorical
palette is brand-blue-led and **machine-validated** (lightness band, chroma floor, colour-vision
separation, normal-vision separation) with the skill's `validate_palette.js`, in both modes.
Tokens `--series-1` … `--series-8` in `tokens.css`; assign in fixed order, never cycle.

| Slot | Light | Dark |
|---|---|---|
| 1 (brand blue) | `#0C61C4` | `#3987E5` |
| 2 | `#EB6834` | `#D95926` |
| 3 | `#1BAF7A` | `#199E70` |
| 4 | `#E0A400` | `#C98500` |
| 5 | `#E87BA4` | `#D55181` |
| 6 | `#008300` | `#008300` |
| 7 | `#4A3AA7` | `#9085E9` |
| 8 | `#E34948` | `#E34948` |

Slots 3–5 sit under 3:1 against white, which the validator flags as "relief required": every
chart therefore carries direct labels and a table view, so identity never depends on colour
alone. Sequential ramps use one hue (blue) light→dark; diverging uses blue vs the slot-2 orange
with a neutral grey midpoint. Marigold is not a chart colour (too light); gold is reserved for
the brand.

## 7. Voice

Plain, direct, peer-level, never hype. Sentence case everywhere. Verbs on buttons ("Start
learning", not "Submit"). Numbers with units and a source. No "Oops", no "supercharge", no "in
today's fast-paced world", no exclamation marks in UI. Say when something is hard. The tone is a
smart older sibling who has read the rules, not a brand.

Words we don't use: unlock, supercharge, seamless, revolutionary, game-changer, effortless,
journey (as in "your financial journey"), empower.

## 8. The anti-slop checklist

A change ships only if it passes all of these (the design-reviewer subagent enforces them):

1. No eyebrow *badge/pill* floating over a centred hero; the eyebrow is a small text label.
2. No stat banner of three identical numbers with no source. Every figure carries its sentence and its link.
3. No three-column grid of identical icon-in-rounded-square cards.
4. No gradient (especially blue→purple), no glow, no glassmorphism, no drop shadow.
5. Not the default font. Not ALL CAPS labels. Not emoji as icons.
6. Section sizes vary; the page is not five equal stacked bands.
7. Copy is specific and numeric, not "powerful, seamless, effortless", and not a slogan in two
   parallel halves ("Short enough for X. Deep enough for Y.").
8. One bold thing per screen; everything around it is quiet.
9. Works in light and dark, at 360px and 1280px, at 200% zoom, with reduced motion.
10. No mock devices or fake app screenshots standing in for content; show the real thing.
11. No scroll-triggered fade-ins.
12. Every colour and size is a token.
