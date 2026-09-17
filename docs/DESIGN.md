# DESIGN.md: LaunchPad

Goal: **clean, interactive, human-made, easy to use.** It should feel like a well-edited student magazine plus a set of good tools, not a template or an AI-generated landing page.

## 1. Personality
- Confident, calm, practical. Like a sharp older student explaining something over lunch.
- Editorial, not "startup SaaS." Real structure, real content, very little decoration.
- Keeps LaunchPad's existing deep green as the brand accent (already in css/style.css).

## 2. Color tokens (contrast checked on `--paper`)
```css
:root {
  --paper:        #FBFAF7; /* page background (warm off-white) */
  --paper-2:      #F4F1EA; /* section / card background */
  --ink:          #16181D; /* headings + primary text (17.0:1) */
  --ink-2:        #3A3F4B; /* body text (10.1:1) */
  --muted:        #5B6270; /* captions, meta (5.9:1): smallest text allowed */
  --line:         #E3DED3; /* borders, dividers (decorative only) */
  --accent:       #1C5D3A; /* LaunchPad green: buttons (white text 7.9:1), links (7.5:1) */
  --accent-deep:  #154A2E; /* hover / pressed (9.8:1) */
  --accent-soft:  #E6F2EA; /* tinted panels; accent text on it is 6.8:1 */
  --highlight:    #F2C14E; /* highlight fills only, always with --ink text (10.6:1) */
  --error:        #B42318; /* (6.3:1) */
  --focus:        #1C5D3A; /* 2px outline + 2px offset */
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #12161B;  --paper-2: #1A2027;
    --ink:   #EDEBE6;  --ink-2:   #D5D2CB;  --muted: #B9BEC8;
    --line:  #2B333D;  --accent:  #8FD1A8;  --accent-deep: #B5E3C6;
    --accent-soft: #1D3327;
  }
}
```
Rules: one dominant color (dark ink on warm paper), one accent (green), one highlight (warm yellow) used sparingly (highlighted numbers, the "In 30 seconds" box). In dark mode, buttons use `--accent` with `--paper` text (10.3:1). Never put text in light grays like `#9AA0AE` (fails contrast).

## 3. Typography
- Headings: **Literata** (serif, readable, warm), weights 600/700.
- Body and UI: **Atkinson Hyperlegible Next** (made for legibility, distinct from the usual defaults), weights 400/700.
- Hindi (v2): **Noto Serif Devanagari** (headings) + **Noto Sans Devanagari** (body).
- Numbers in tools: body font with `font-variant-numeric: tabular-nums`.
- Scale (mobile → desktop): body 17px → 18px; line-height 1.6; H1 32 → 44px; H2 24 → 30px; measure 60-72ch.
- Sentence case for headings and buttons. No ALL CAPS labels.
- **Banned fonts** (overused in AI-generated sites): Inter, Roboto, Arial, Space Grotesk, Geist, Instrument Serif, Poppins, Montserrat. Don't use a serif italic on a single word inside a sans headline.

## 4. Layout
- Left-aligned, editorial. Content column max 720px; tools use a 2-column layout at ≥ 900px (inputs left, results right).
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 6px on inputs, buttons, and cards (the current CSS uses 10px; bring it down). No pill-shaped everything.
- Shadows: none by default. A single 1px border (`--line`) defines cards. No glows, no layered colored shadows.
- **One card style** across the site. Don't invent variants per section.
- Sticky header is small (≤ 56px) and must never hide the focused element.

## 5. Components
- **Button:** primary (green bg, white text), secondary (ink border, transparent), text link. Min height 44px. Verb-first labels ("Try the calculator").
- **Card:** paper-2 bg, 1px line border, 6px radius, title + one line + meta. Whole card clickable with a real link inside.
- **Callout "In 30 seconds":** no colored left border; use a full soft marigold tint background (`color-mix(in srgb, var(--marigold) 22%, var(--paper))`) with ink text and a small heading.
- **Term (glossary):** dotted underline, button semantics, popover.
- **ToolShell:** title, "answers:" line, inputs, live results, "What this means," collapsible "How it works," reset + copy-link.
- **Quiz:** one question per view, big tappable options (full-width), feedback text in success/error colors plus an icon and words (not color alone).
- **Progress mark:** a small check next to finished lessons. No streaks, badges, confetti, or leaderboards in v1.

## 6. Imagery and icons
- Prefer simple, custom diagrams (SVG) that explain an idea: a supply/demand curve, a cash flow arrow, a chai-stall cost breakdown.
- Photos only if real (club events with consent) or clearly credited. No generic stock "diverse team high-fiving," no 3D blobs, no abstract gradient orbs.
- Icons: one outline set (for example Phosphor or Lucide), 1.5px stroke, only where they add meaning (tool type, warning). Never emoji as icons. Never an icon in a colored circle above every card.

## 7. Motion
- Only functional: results updating (150-200ms fade/number tween), popovers opening, accordions.
- No parallax, no scroll-jacking, no floating decorative animations.
- Respect `prefers-reduced-motion: reduce` (turn tweens off).

## 8. Writing in the interface (microcopy)
- Plain and direct. "Start learning," not "Unlock your potential."
- Avoid hype words: revolutionize, unlock, supercharge, seamless, empower, elevate, journey, game-changer, "in today's fast-paced world."
- Don't talk down ("Hey kids!") and don't try too hard to be cool. Teens reject "kiddie" design; young adults dislike being patronized.
- Numbers and examples > adjectives.

## 9. The "does this look AI-made?" checklist (fail any → fix it)
- [ ] Centered hero with a badge/pill above a giant headline
- [ ] Purple/lavender or rainbow gradients, glowing blurred shadows
- [ ] Three identical feature cards with an icon on top
- [ ] "1, 2, 3" step rows or a stat banner ("10K+ users") with made-up numbers
- [ ] Emoji used as icons in nav or lists
- [ ] Permanent dark mode with low-contrast gray body text
- [ ] Colored left-border accent on every card
- [ ] Glassmorphism panels
- [ ] ALL CAPS section labels everywhere
- [ ] Generic copy ("Empowering the next generation of leaders")
- [ ] Mixed card styles and inconsistent spacing
- [ ] Banned fonts from section 3

## 10. Usability rules for 15-21 year-olds
- Content in short chunks with clear H2s; one idea per section; bold the key sentence.
- Aim for reading level around grade 8 (Hemingway/Flesch-Kincaid). Define every term the first time.
- Speed is part of the design: slow pages lose teens.
- Interactivity must do something (calculate, test, decide), not decorate.
- No forced sign-up. Sharing = copy link.
- Labels over icons in navigation. Max 5 top-level items.
- Big touch targets, forgiving inputs (accept "1,00,000" and "100000").

## 11. Screens to verify on every UI change
- 360×800 (budget Android), 390×844 (iPhone), 768×1024 (tablet), 1280×800 (laptop)
- Light and dark mode, 200% zoom, keyboard-only pass, reduced motion on

## 12. Fix list for the current pages
- Remove the eyebrow line above the H1 ("Free · Global · For ages 15-21"); fold that info into the intro sentence.
- Remove the hero stats row (Free / Global / Plain); say it in one plain sentence instead.
- Replace the system font stack (it falls back to Roboto/Arial) with the fonts in section 3.
- Left-align the hero; keep one card style for topics and articles.
