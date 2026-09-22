# Business Lab brand guide

Version 3.1 · 21 September 2026 · owner: Rajvir Dixit. v3.1 turns the page white: blue is kept for the
header band, the rules under heroes and title bands, and card outlines, after Rajvir found the blue
field hard to read against ("less blue"). v3 set the dark-blue, white and gold
palette, the rounded-panel layout drawn from Aardvark Book Club and Ivy Kids (their layouts, not
their colours), the edition dropdown with flags, and the dashboard. v2 (18 Sept) did the rename
from LaunchPad and the ledger. The tone is serious and professional: lessons are built from
research into what young people in each region actually struggle with, never from toy
businesses.

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

One-line thesis: **work shown, nothing sold.** White pages with blue as the frame, gold
for the one thing that matters on a screen. Every sum is written out the way a cash book writes
it. Nothing looks like an advert, because nothing is one.

Where each choice comes from, so it is never a default:

- **The ledger** (§5) comes from money itself: cash books and receipts put the label on the
  left, the figure on the right and a double rule under the total.
- **The dark-blue field and white sheets** come from the badge (blue, white B) and from paper:
  reading happens on white.
- **The rounded panels, pill navigation and stacked display words** are layout devices from
  Aardvark Book Club; the **outlined card grid with corner stickers** and the **white sheet with
  rounded top corners** are from Ivy Kids. Their colours are not used.
- **The badge** (§4) is the club's own logo.

## 2. Colour

Three brand colours: **blue, gold, black**, on white and near-white. Navy is the deep anchor;
gold is the single spark; blue does the work. Every value below is contrast-checked against the
surface it sits on (WCAG 2.2 AA: 4.5:1 for text, 3:1 for large text and non-text). Run
`npm run contrast` after any change — it prints these numbers and fails the build on a miss.

### Core

| Token | Hex | Role |
|---|---|---|
| Band blue | `#0B4AA2` | The header band only (`--band`); the page itself is white since v3.1 |
| Link blue | `#0C61C4` | Links, the rule under heroes and title bands, the outline of the front-page panels |
| Navy ink | `#0B1240` | All text on white and gold; the footer; outlines |
| Marigold | `#F2C14E` | The one accent: links and the primary action on the field, stickers, the loud panel |
| Paper white | `#FFFFFF` | Sheets, cards, receipts |

### On a white sheet (light mode)

| Token | Hex | On white | Use |
|---|---|---:|---|
| `--ink` | `#0B1240` | 16.0:1 | Headings |
| `--ink-2` | `#262F57` | 12.6:1 | Body text |
| `--muted` | `#434D73` | 8.0:1 | Secondary text, captions |
| `--accent` | `#0B1240` | white on it 16.0:1 | Primary buttons on sheets |
| `--accent-text` | `#0C61C4` | 6.0:1 | Links |
| `--gold` | `#F2C14E` | navy on it 10.7:1 | Fills, stickers, the taxonomy panel |
| `--gold-pale` | `#FBE3A6` | navy on it 13.6:1 | Tag pills, sticky notes, the highlighter |
| `--gold-text` | `#7A5A0E` | 6.4:1 | The one place gold is text on white: small labels |
| `--field-pale` | `#E8F0FB` | — | Soft panels and question cards on a sheet |
| `--bg-2` | `#EEF3FB` | — | The calculator bench |
| `--error` | `#B3261E` | 6.4:1 | Errors |
| `--success` | `#17683F` | 6.5:1 | Confirmations |

### On the field (`.on-field`, dark panels)

White text on field blue is 8.3:1, `--ink-2` `#E4EDFB` 7.1:1, `--muted` `#C2D4F0` 5.6:1. Links and
the focus ring go marigold (5.0:1). The primary action on the field is a gold block with navy
text (10.7:1) and a white arrow box. Anything that sits directly on the field carries the
`.on-field` class (the header, heroes, the lesson title band); `.panel-field` and `.panel-deep`
carry the same remap. `npm run contrast` checks every pair in both contexts.

**The gold rule.** Gold on white is 1.7:1, so gold is never small text on a light surface. It is a
fill behind navy text, a sticker, a link on the field, or the highlighter.

### Dark mode

The field deepens to `#071A4A`, sheets become `#101A4F` with light ink, gold stays. Receipts,
flashcards and the edition menu stay white paper with navy ink in both modes (`--paper`), because
a receipt is white. Full values in `tokens.css`.

### Don't

- No baby blue, pastel or purple; no gradients, no gradient text. One accent, flat fills.
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
- Radius: 4 / 8 / 12 / 20 / 32px. Buttons and question rows 8px; inputs 12px; cards 20px; the
  big section panels and reading sheets 32px. Pills only for navigation and tags.
- **The field and the sheet.** The page is the dark-blue field. Reading happens on a white sheet
  with rounded top corners laid over it (Ivy Kids). Ordinary pages are one sheet; the home and
  edition fronts alternate rounded panels of one colour each (field blue, gold, pale blue,
  white), joined by gaps (Aardvark).
- **Contents first.** The front page shows each edition's real worked sum (its receipt) and
  real lessons. An edition front is a contents page: three tracks of numbered lessons in an
  outlined grid, the calculators as a stack of giant questions on a gold panel, sourced figures.
- **The ledger** is the signature (`.ledger` in `base.css`): label left, figure right, dotted
  leader, single rule above a total, **double rule under the final answer**. Worked examples sit
  on a receipt card; calculator results are a ledger whose rows add up, with a headline figure
  above it when the answer is a count or a payment. Never decoration.
- **The edition menu** is a dropdown in the header: the current edition's flag and name; open it
  for the three editions with flags. Same place on every page.
- **Stickers and hand-lettering** are front-page devices only, and restrained: a minutes sticker on
  a card, the "a worked example" note on a receipt. Inside a lesson every label is set type.
- Lesson questions are cards on a pale panel with outlined option rows and one navy button. The
  key sentence of a section wears the pale-gold highlighter. "Key points" is a sticky note that
  steps into the margin on wide screens.
- **The dashboard** (`/dashboard`) is a sidebar of pills and a grid of outlined cards: four
  figures, a weekly bar chart with a table, the next lesson, progress by track, a timer. Every
  number on it comes from this device.
- Whitespace is the main tool. Vary the rhythm: a tall hero, a tight band of figures, a gold panel.

## 6. Depth and motion

- **No shadows and no blur.** Depth comes from surface colour (field → sheet → panel) and from
  outlines. Blobs behind a hero are flat shapes in two tones.
- Motion is one thing: a short cross-page fade (View Transitions), off under reduced motion, and a
  slight lift on a button. No scroll fade-ins.

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
