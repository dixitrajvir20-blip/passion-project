# Business Lab brand guide

Version 4 · 23 September 2026 · owner: Rajvir Dixit. The site is white at every setting, with one
blue bar, one typeface and no decoration. v4 records Rajvir's decisions of 22 September 2026, as
built on 23 September (design v5.1, `docs/DESIGN.md`). The v3 and v3.1 history is in the changelog
at the end.

This is the one place the brand is defined. If a colour, font size, radius or spacing value is not
in here (or its machine form in `src/styles/tokens.css`), it should not appear in the product. The
rule that keeps Business Lab from looking generated is that every choice traces back to this
document, and this document says why.

## 0. The owner's decisions (22 September 2026)

Rajvir looked at the live site with his Mac in dark mode, saw every page painted dark blue, and
asked for the opposite: the whole page white, the header the only blue block, blue for accents,
"as professional as possible and simple to follow" (his notes are in
`docs/research/redesign-references.md`). As built:

1. **One blue block.** The header bar (`#0B4AA2`) is the only blue area on a page. Headings are
   navy ink, never blue, even when a heading is a link.
2. **White at every OS setting.** There is no dark theme. The page stays white when the computer
   is in dark mode; the browser's own forced colours and `prefers-contrast: more` still work.
3. **No gold.** Gold panels, stickers, the highlighter, tag pills and the gold share-image label
   are gone. Gold appears nowhere.
4. **Navy ink stays.** `#0B1240` for headings, `#262F57` for body, `#434D73` for secondary text;
   every grey is that navy mixed into white.
5. **One typeface.** Atkinson Hyperlegible Next, 400 and 700, for everything: headings, body,
   figures, the ledger, buttons and the wordmark.
6. **Blue has five jobs**, and only these: the header bar, links inside running text, the one
   primary button per screen, the focus ring, and the 4px bar that marks the current item. Chart
   data series are data, not brand, and keep their own palette (§6b).
7. **The badge swaps its two colours on the bar**: a white disc with a blue B. Everywhere else it
   is the blue disc with a white B.
8. **A lesson opens lean**: one line back to its track with "Lesson n of N · m min", the title,
   the summary, "In this lesson" on one line (a column on the left on a laptop), and "After this
   you can". The "Reviewed … Written by …" line sits at the foot.
9. **Nothing moves** except the knob of the consent switch.
10. **Quiet structure, not a copy of anyone.** GOV.UK is followed for type rules, rhythm and
    restraint only; secondary buttons are neutral (white, a 2px ink edge, an ink label).

Also decided while building: folds use the site's own "+" / "−" summary; the consent banner is a
static block under the header, never fixed over the page; every link row, summary and text button
is at least 44px tall.

## 1. What Business Lab is

A free learning hub that teaches money and business to 15–21-year-olds who don't have an adviser
or a family member to ask, with editions for the money system each reader actually lives in. It is
named after the school club it grew out of, whose idea is that business is a life skill. The brand
has to read as **trustworthy, calm and grown-up**, the opposite of the loud "finance bro" and "get
rich" look these readers are surrounded by, while still feeling made for them, not for their
parents. The tone is serious and professional: lessons are built from research into what young
people in each region actually struggle with, never from toy businesses.

One-line thesis: **work shown, nothing sold: white pages, navy type, one blue, and every sum set
as a ledger.**

Where each choice comes from, so it is never a default:

- **The ledger** (§5) comes from money itself: cash books and receipts put the label on the left,
  the figure on the right and a double rule under the total.
- **The badge** (§4) is the club's own logo, and its blue is the badge's blue.
- **The white page, the one blue and the plain structure** come from the reference sites Rajvir
  opened on 22 September (`docs/research/redesign-references.md`): Zerodha Varsity's one blue for
  links and the single button, and its chapter pages; Khan Academy's single dark bar over a white
  page; the CFPB's colour used only for links; GOV.UK's type rules and restraint.

## 2. Colour

The brand colours are **blue and navy**, on white. Navy is the ink; blue does five jobs and no
more. Every value below is contrast-checked against the surfaces it sits on (WCAG 2.2 AA: 4.5:1
for text, 3:1 for large text and non-text). Run `npm run contrast` after any change: it prints
these numbers and fails the build on a miss.

### The palette

| Token | Hex | On white | On `--surface` | On `--tint` | Role |
|---|---|---:|---:|---:|---|
| `--ink` | `#0B1240` | 17.88:1 | 16.52:1 | 15.14:1 | Headings (never blue), labels, figures, list-row titles, standalone links, input edges, the secondary button |
| `--ink-2` | `#262F57` | 12.91:1 | 11.93:1 | 10.94:1 | Body text, footer links |
| `--muted` | `#434D73` | 8.24:1 | 7.62:1 | 6.98:1 | Captions, meta, hints, sources, fine print |
| `--blue` | `#0B4AA2` | 8.35:1 | 7.72:1 | 7.07:1 | The five jobs (below) |
| `--blue-dark` | `#08357A` | 11.66:1 | 10.78:1 | 9.88:1 | Hover and active for links and the primary button |
| `--on-blue` | `#FFFFFF` | — | — | — | Text on the bar and on the primary button: 8.35:1 on blue, 11.66:1 on blue-dark |
| `--error` | `#B3261E` | 6.54:1 | 6.04:1 | 5.54:1 | Errors, always with words or a minus sign |
| `--success` | `#17683F` | 6.80:1 | 6.28:1 | 5.76:1 | Confirmations, always with words |
| `--border` | `#797D96` | 4.05:1 | 3.74:1 | 3.43:1 | The 1px edge of a control or an instrument (non-text, 3:1) |
| `--focus` | `#0B4AA2` | 8.35:1 | 7.72:1 | 7.07:1 | The 3px focus ring; white inside the bar (8.35:1) |

Surfaces and rules. The greys are the navy `#0B1240` mixed into white, so every grey comes from the
ink:

| Token | Hex | Navy in white | Use |
|---|---|---:|---|
| `--bg` | `#FFFFFF` | 0% | Every page, the footer, boxes, dialogs, the dropdown, the popover |
| `--surface` | `#F5F6F7` | 4% | The one pale surface (results bench, explorer, video poster, formula, code), always with an edge |
| `--tint` | `#EBECF0` | 8% | Selected states only: a checked option, a pressed key, a `:target` entry, `<mark>` |
| `--rule` | `#CED0D9` | 20% | Decorative 1px dividers; never the only edge of a control |
| `--border` | `#797D96` | 55% | The edge of anything you operate |

Under `prefers-contrast: more` the muted text becomes `#262F57` (12.91:1), rules `#6D718C` and
borders `#484D70` (8.17:1).

**Blue's five jobs.** The header bar; links inside running text (always underlined, because blue
is only 2.14:1 against the ink around it); the one primary button per screen; the focus ring; and
the 4px bar that marks the current item (the Menu row, the edition row, the dashboard's side nav).
Headings, labels, list-row titles, secondary buttons, option borders and rules are never blue.

**No dark theme.** The site is light at every OS setting: `:root { color-scheme: light }` and one
`theme-color`. Why: a dark OS turned every page navy, which is what Rajvir asked to undo; reading
here happens on white, like the payslips and receipts the lessons draw; and one set of colours is
one set of contrast figures to keep right. The browser's own dark and forced-colours modes still
work, because every state edge is a border.

### Don't

- No gold, no baby blue, pastel or purple; no gradients, no gradient text. One blue, flat fills.
- No glows and no drop shadows. Depth comes from rules and one pale surface (§6).
- No coloured panels or bands below the header.
- No blue headings, labels, list rows or secondary buttons.
- No colour as the only signal: pair it with text, weight or an icon.
- Never hard-code a hex in a component. Add or reuse a token (`Logo.astro` and `Flag.astro`, which
  draw the badge and the flags, are the only exceptions).

## 3. Typography

One family: **Atkinson Hyperlegible Next**, 400 and 700, self-hosted (no font CDN, so a page load
reveals nothing about the reader), SIL Open Font License. Designed by the Braille Institute for
low-vision readers: its letterforms are disambiguated (I, l, 1; O, 0), which is right for a site
whose readers include people on cheap screens in bright light. It sets headings, body, UI,
figures, the ledger and the wordmark. No italics ship.

Bricolage Grotesque left the pages on 22 September (decision 5): two families were one more
download and one more voice than a quiet site needs. It survives only at build time, as the font of
the share images (until an Atkinson TTF is approved; `docs/OWNER_TODO.md`) and as the outline of
the badge's drawn B. Kalam, the hand-lettering face, is removed.

**Never** ship in: Inter, Roboto, Arial, Helvetica-as-brand, Space Grotesk, Geist, Instrument
Serif/Sans, Poppins, Montserrat. They are the generated-page defaults; using them undoes the point
of choosing a face at all.

- **Devanagari** (planned, Hindi edition): Noto Sans Devanagari 400/700 at the same sizes, with
  the measure re-checked for that script.

### Scale (fluid; clamps in `tokens.css`)

| Token | Size | Use |
|---|---|---|
| `--text-display` | 36 → 52px | The home h1 only |
| `--text-h1` | 32 → 44px | Page titles, headline figures |
| `--text-h2` | 24 → 32px | Section headings, ledger totals |
| `--text-lg` | 20 → 24px | Lede (once a page), h3, legends, the key idea, list-row titles, ledger figures |
| `--text-md` | 18 → 19px | Body, labels, inputs, options, buttons |
| `--text-sm` | 16px | Nav, crumb, meta, hints, captions, tables, footer, small buttons |
| `--text-xs` | 14px | Fine print, sources, licence, chart labels (minimum) |

Rules: reading text never drops below 18px and nothing drops below 14px; at most three sizes in one
view; headings are ink 700 with `text-wrap: balance`, and never above 52px; body uses
`text-wrap: pretty`, line-height 1.5 and a 32em measure inside a 640px column; money and data use
`font-variant-numeric: tabular-nums`. Sentence case everywhere; no ALL CAPS.

## 4. The logo

The Business Lab logo is the club's badge: a blue circular badge with a white B.

**Status: interim.** The version on the site today is a stand-in drawn for this repo: a `#0C61C4`
disc, a thin white inner ring and a white B cut from Bricolage Grotesque 800 as a path (white on
the blue is 5.96:1). It exists so the rename could ship. The club's real badge will replace it once
there is a **licensed, unwatermarked file** (SVG preferred, or a PNG at least 1024px). The image
shared on 18 September 2026 carries a Design.com watermark, which marks it as a preview: it must
not be published until the licence is bought and the clean file downloaded.

Two versions of the one drawing, nothing recoloured:

- **Default**: the blue `#0C61C4` disc with a white ring and B. The footer, the favicon, the app
  icons.
- **Inverse**, on the blue bar: a white disc with the `#0C61C4` ring and B (the disc is 8.35:1
  against the bar; the B is 5.96:1 on the disc). The header and the top of the share images.

To swap in the licensed badge:

1. Put the file in `public/brand/` and replace the drawing in `src/components/Logo.astro` (both
   variants) and `scripts/brand-mark.mjs` (`badge()` and `badgeInverse()`).
2. Run `node scripts/brand-icons.mjs` to rewrite the favicon, `logo-mark.svg` and the app icons.
3. Check the badge at 32px in both versions. Fine detail such as rays or ribbon text disappears at
   that size, and a mostly blue mark needs a one-colour white version for the header.

Rules for either version:

- Files: `public/brand/logo-mark.svg`, `public/favicon.svg`, `public/icons/` (PWA + maskable).
- Minimum size: 24px. Header 32px, footer 32px, share images 60px.
- The wordmark is Atkinson Hyperlegible Next 700, tracking 0: white on the bar, ink in the footer.
- The logo appears in the header and the footer only. Don't recolour it beyond the two versions,
  add a gradient or glow, stretch it, put it on a busy photo, or repeat it around the page.
  Branding defers to content.

## 5. Layout and shape

- Grid: a 960px container, a 640px reading column, a 256px lesson rail from 1024px; a 16–32px side
  gutter; the 4px spacing scale.
- Shape: one 4px radius everywhere (a pill only on the consent switch); rules of 1px, control edges
  of 2px, current-item and key-idea bars of 4px.
- **White pages.** Sections are separated by space and rules. A box only where it holds a figure or
  mixed content (the results bench, a worked example, the drawn document, a question); editions,
  tracks, lessons, tools and search results are **ruled lists**, not cards. The row is the link and
  its title is ink 700.
- **The header** is one blue bar: the inverse badge, the wordmark, and on a laptop six links and the
  edition menu with its flag. On a phone the bar holds a Menu button, and the edition menu sits in a
  white row just under it. Both open in the flow and push the page down; neither covers anything.
- **The ledger** is the signature (`.ledger` in `base.css`): label left, figure right, dotted
  leader, a single rule above a total, a **double rule under the final answer**. Worked examples,
  calculator results and every sum on the site use it. Never decoration.
- **A lesson** opens with the crumb line (the track name as a link, and "Lesson n of N · m min"),
  the title, the summary, "In this lesson" on one line (closed on a phone, an open list in the left
  rail on a laptop) and "After this you can". The byline sits at its foot.
- **The dashboard** (`/dashboard`) is a side nav and a grid of ruled boxes: four figures, a weekly
  bar chart with a table, the next lesson, progress by track, a timer. Every number on it comes
  from this device.
- Removed: stickers, hand-lettering, blobs, doodles, track cards, the gold panel, the field and the
  sheet.
- Whitespace is the main tool. Vary the rhythm: a tall intro, a tight band of figures, a long list.

## 6. Depth and motion

- **No shadows and no blur.** Depth comes from the one pale surface and from rules and edges.
- **No motion** except the consent switch's knob (150ms, and none under reduced motion). The
  page-transition fade, smooth scrolling, button lifts and chevron rotations are removed. No scroll
  fade-ins.

## 6b. Charts

Charts follow the data-viz method in the `dataviz` skill: pick the form first, colour by job
(categorical / sequential / diverging / status), thin marks, direct labels, a legend for two or
more series, a data table always, and one axis, never a dual-axis chart. The categorical palette
is machine-validated (lightness band, chroma floor, colour-vision separation, normal-vision
separation) with the skill's `validate_palette.js`. Tokens `--series-1` … `--series-8` in
`tokens.css`; assign in fixed order, never cycle. The site is light only, so there is one column.

| Slot | Hex | On white |
|---|---|---:|
| 1 (the badge blue) | `#0C61C4` | 5.96:1 |
| 2 | `#EB6834` | 3.20:1 |
| 3 | `#1BAF7A` | 2.82:1 |
| 4 | `#E0A400` | 2.22:1 |
| 5 | `#E87BA4` | 2.69:1 |
| 6 | `#008300` | 4.95:1 |
| 7 | `#4A3AA7` | 8.56:1 |
| 8 | `#E34948` | 3.95:1 |

Slots 3–5 sit under 3:1 against white, which the validator flags as "relief required": every chart
therefore carries direct labels and a table view, so identity never depends on colour alone. Slot 1
is the badge blue, not `--blue`, so a chart line never reads as a link; slot 4 is data, not brand.
Sequential ramps use one hue (blue) light→dark; diverging uses blue vs the slot-2 orange with a
neutral grey midpoint. "Today" on the dashboard's week chart is its bar in ink and the word
"Today" under it, never colour alone.

## 7. Voice

Plain, direct, peer-level, never hype. Sentence case everywhere. Verbs on buttons ("Start
learning", not "Submit"). Numbers with units and a source. No "Oops", no "supercharge", no "in
today's fast-paced world", no exclamation marks in UI, no arrow glyphs in link text. Say when
something is hard. The tone is a smart older sibling who has read the rules, not a brand.

Words we don't use: unlock, supercharge, seamless, revolutionary, game-changer, effortless,
journey (as in "your financial journey"), empower.

## 8. The anti-slop checklist

A change ships only if it passes all of these (the design-reviewer subagent enforces them):

1. No eyebrow *badge/pill* floating over a centred hero; the eyebrow is a small text label.
2. No stat banner of three identical numbers with no source. Every figure carries its sentence and
   its link.
3. No three-column grid of identical icon-in-rounded-square cards.
4. No gradient (especially blue→purple), no glow, no glassmorphism, no drop shadow.
5. Not the default font. Not ALL CAPS labels. Not emoji as icons.
6. Section sizes vary; the page is not five equal stacked bands.
7. Copy is specific and numeric, not "powerful, seamless, effortless", and not a slogan in two
   parallel halves ("Short enough for X. Deep enough for Y.").
8. One bold thing per screen; everything around it is quiet.
9. Works at 320, 360, 768 and 1280px, at 200% zoom (640×400), with reduced motion,
   `prefers-contrast: more` and forced colours; a dark OS shows white.
10. No mock devices or fake app screenshots standing in for content; show the real thing.
11. No scroll-triggered fade-ins.
12. Every colour and size is a token.
13. Headings are never blue, and never above 52px.
14. Blue only in its five jobs.
15. One primary button per screen.
16. No card unless it holds a figure or mixed content.
17. No stickers, hand notes, blobs, doodles or coloured panels.

## Changelog

- **v4 · 23 September 2026.** White at every setting, one blue bar, one typeface, no gold, no
  decoration, no motion (Rajvir's decisions of 22 September; design v5.1). Contrast figures
  corrected: navy on white is 17.88:1 (v3 printed 16.0), body 12.91:1 (12.6), muted 8.24:1 (8.0).
  The Aardvark Book Club and Ivy Kids layout references are removed as sources.
- **v3.1 · 21 September 2026.** The page turned white; blue kept for the header band, the rules
  under heroes and title bands, and card outlines ("less blue").
- **v3 · 19 September 2026.** The dark-blue, white and gold palette; rounded panels after Aardvark
  Book Club and Ivy Kids (their layouts, not their colours); the edition dropdown with flags; the
  dashboard.
- **v2 · 18 September 2026.** The rename from LaunchPad to Business Lab, and the ledger.
