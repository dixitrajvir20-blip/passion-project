# LaunchPad brand guide

Version 1.0 · 17 September 2026 · owner: Rajvir Dixit

This is the one place the brand is defined. If a colour, font size, radius or spacing value
is not in here (or its machine form in `src/styles/tokens.css`), it should not appear in the
product. The rule that keeps LaunchPad from looking generated is that every choice traces back
to this document, and this document says why.

## 1. What LaunchPad is

A free learning hub that teaches money and business to 15–21-year-olds who don't have an
adviser or a family member to ask, with editions for the money system each reader actually
lives in. The brand has to read as **trustworthy, calm and grown-up** — the opposite of the
loud "finance bro" and "get rich" aesthetic these readers are surrounded by — while still
feeling made for them, not for their parents.

One-line thesis: **a launch pad, not a billboard.** Quiet, precise, and pointed upward.

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
| `--bg-2` | `#F5F6F8` | — | Cards, alternating sections |
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

### Dark sections in light mode

A navy section (`.section-dark`, `#0B1240`) re-maps the tokens for everything inside it: text
goes light, links go pale blue (9.3:1), eyebrows go marigold (10.7:1). Use it once or twice per
page as a rhythm change, never back to back.

### Don't

- No purple, no violet-to-blue gradients, no gradient text. One accent, flat fills.
- No glows or coloured drop shadows. There is exactly one shadow in the system (§6).
- No colour as the only signal: pair it with text, weight or an icon.
- Never hard-code a hex in a component. Add or reuse a token.

## 3. Typography

Two families, both self-hosted (no font CDN, so a page load reveals nothing about the reader),
both licensed under the SIL Open Font License.

- **Bricolage Grotesque** — display. Headlines, big numbers, the wordmark. It has warmth and a
  slight irregularity that keeps headings from feeling like a default grotesque (Inter, Roboto,
  Geist), which is the number-one "AI slop" tell. Weights 600–700.
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

An **L whose upright is a launch arrow** (marigold) and whose foot is the pad (blue), on a navy
rounded tile. It reads as a rocket and a letter L at once, and it uses all three brand colours
in their correct roles: navy anchor, gold spark, blue base.

- The pad is drawn in a lighter tint, `#5FA0F5`, not signal blue: `#0C61C4` on the navy tile is
  only 3.0:1 and the foot of the L sinks into it. The tint is 6.7:1 on navy. It is a logo-only
  colour and is not a token, because nothing else may use it.
- Files: `public/brand/logo-mark.svg` (tile), `public/favicon.svg`, `logo-lockup.svg` and
  `logo-lockup-dark.svg` (mark + wordmark), `public/icons/` (PWA + maskable).
- Clear space: keep at least the height of the arrowhead clear on every side.
- Minimum size: 20px for the mark, 24px in the header.
- The wordmark is Bricolage Grotesque 700, tracking −0.02em, in ink (or `#F5F5F7` on dark).
- Don't: recolour it, add a gradient or glow, stretch it, put it on a busy photo, or repeat it
  around the page. Apple's rule applies — branding defers to content and the logo is not a
  wallpaper.

## 5. Layout and shape

- Grid: 1120px max content width, 720px reading column, 16px side gutter, 4px spacing scale.
- Radius: 8 / 12 / 20px. Cards use 20px. Buttons and tabs are pills (999px). Inputs 12px.
- Cards are **flat**: a `--bg-2` fill, no border, no shadow, 24–32px padding. One card style,
  used everywhere; variants change content, not chrome.
- Hairlines (1px `--line`) separate sections and rows instead of boxing everything.
- Whitespace is the main tool. Sections breathe (64–96px vertical). Vary section rhythm — a tall
  hero, a tight band of figures, a dark section — rather than stacking equal blocks.

## 6. Depth and motion

- **One shadow** in the whole system: `--shadow-signature`, a soft navy-tinted drop used on the
  hero preview device and nothing else. Depth otherwise comes from surface colour (white →
  `#F5F6F8` → navy) and a frosted, blurred sticky header, the way Apple's product pages do it.
- Motion is functional and brief (≤500ms, `--ease`): a short cross-page fade (View Transitions),
  content that rises 14px as it enters, a bar that grows once. All of it is gated behind
  `prefers-reduced-motion: no-preference` and never carries meaning on its own.

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
4. No gradient (especially blue→purple), no glow, no glassmorphism as decoration.
5. Not the default font. Not ALL CAPS labels. Not emoji as icons.
6. Section sizes vary; the page is not five equal stacked bands.
7. Copy is specific and numeric, not "powerful, seamless, effortless".
8. One bold thing per screen; everything around it is quiet.
9. Works in light and dark, at 360px and 1280px, at 200% zoom, with reduced motion.
10. Every colour and size is a token.
