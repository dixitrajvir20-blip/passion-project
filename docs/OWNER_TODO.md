# Owner to-do (Rajvir)

Things only the owner can do, because the file is protected or the decision is his. Dated
19 September 2026. Delete items as they are done.

## 1. Two protected pages need one line each

The `protect-files.sh` hook stops Claude editing these, by design.

**`src/pages/cookies.astro`** — add a row to the storage table:

```ts
{ key: 'lp:activity', purpose: 'Minutes you spent on the site, per calendar day, for the dashboard. Recorded only after you say yes in Privacy choices; a later no removes it. Never sent anywhere.', lifetime: 'Ninety days on this device, or until you say no or clear browser data' },
```

**`src/pages/privacy.astro`** — in "What we collect", add to the list of things the browser stores:

```html
<li>if you agree in Privacy choices, the minutes you spend on the site each day, for your dashboard;</li>
```

Also in `src/pages/cookies.astro` (about line 57), the sentence "Two optional categories exist…
Neither is switched on today" is now wrong. Replace with: "Three optional categories exist. One,
learning time on this device, is live and asks first; the other two are not in use."

And in `src/pages/privacy.astro` under "What we collect", one line about the Write for us page:
"If you email us a lesson or a question, we keep the email for as long as it takes to answer or
publish, then delete it. Do not include personal details you do not want us to hold."

**Videos (21 Sep 2026).** The `embeds` category ("Videos from other sites") is now live. On
`src/pages/cookies.astro`, the sentence about optional categories should read: "Three optional
categories exist. Two are live and ask first: learning time on this device, and videos from other
sites; the third is not in use." On `src/pages/privacy.astro`, under third parties: "Lessons
include short videos from YouTube. Nothing loads from YouTube until you tap play and say yes in
Privacy choices; YouTube's own privacy terms apply once a video plays."

## 2. A real contact address

`src/lib/site.ts` still has `hello@business-lab.example`. It appears on Privacy, Terms,
Accessibility, Write for us and `public/.well-known/security.txt`. Until it is real, the Write
for us page has no working way to send a lesson.

## 3. The licensed logo

The badge on the site is an interim drawing. When the licensed, unwatermarked file is
bought, follow `docs/BRAND_GUIDE.md` §4 (two files to replace, one script to run).

## 4. Domain and repository settings

- Pick and buy the domain; then the DNS items in `docs/SECURITY.md` risk 19.
- In repository settings: secret scanning, push protection, a ruleset on `main`, 2FA.

## 5. Accounts (Phase 6) stay off

The login screen at `/account` is a preview and stores nothing. Turning it on needs the
checklist in `docs/AUTH_AND_ACCOUNTS.md`: a backend, an email domain, the lawyer items in
`docs/LEGAL_AND_PRIVACY.md` (India under-18 parental consent above all), a header-capable
host. Say "open phase 6" when that is the plan.

## 6. Two things the lesson editors left for a person (22 Sep 2026)

- `docs/research/lesson-v2-editor-notes.md` lists, per lesson, what the independent editor
  could not settle from this machine: EUR-Lex directive texts that do not load without a browser
  (the claims were checked against the Commission's own summaries instead), and a few judgement
  calls. A read-through with the source open takes a minute a lesson.
- Glossary entries are shared across editions, so a Europe or US popover can show a rupee
  example (`interest`, `budget`, `money-mule`). Per-edition examples are a content change Claude
  can make once you say which entries matter most.

## 7. Design v5.1 is built (23 Sep 2026): seven things for you

The site is now white at every setting, with one blue bar, navy ink and one typeface
(`docs/BRAND_GUIDE.md` v4, `docs/DESIGN.md` v5.1). None of these blocks the build.

1. **Confirm the ten decisions as built.** They are listed in `docs/BRAND_GUIDE.md` §0 (one blue
   block; white under a dark OS; no gold; navy ink; one typeface; blue in five jobs; the inverse
   badge on the bar; the lean lesson opening; no motion; neutral secondary buttons). Look at the
   screenshots (`npm run screenshots` with the preview running: 360, 768 and 1280, plus the
   `*_dark-os.png` captures) and say yes, or name what to change.
2. **Share images in the site's typeface (optional).** The cards are drawn at build time with
   the Bricolage Grotesque file in `scripts/fonts/`, because no Atkinson Hyperlegible Next TTF is
   in the repo. If you want them to match the site: download the Atkinson Hyperlegible Next TTF
   (SIL OFL, from the Braille Institute or Google Fonts) into `scripts/fonts/` with its licence
   file, and say so; Claude then swaps `FONT` and `FAMILY` in `scripts/og-images.mjs` and removes
   the Bricolage file and `scripts/fonts/OFL.txt`.
3. **A shorter consent banner (optional).** Today's copy ships and works (63 words). If you want it
   shorter, a 42-word draft for you to approve or rewrite, not applied:
   > No cookies and no profile: your progress stays in this browser. Two things ask first: lesson
   > videos from YouTube, which load only when you tap play, and a record of your learning time on
   > this device. Nothing optional runs until you choose.
4. **The axe widths.** `CLAUDE.md` says the axe audit fails on serious issues "at 360px and 1280px".
   It actually runs at the Pixel 5 size (393px) and at 1280px (`playwright.config.ts`); the checks
   at 320px, 360px and 640×400 (200% zoom) are reflow and target-size checks in
   `tests/e2e/design.spec.ts`. `/accessibility` already says this correctly. The `CLAUDE.md` line
   is in item 5.
5. **Approve the `CLAUDE.md`, ship-check and reviewer edits.** Claude does not edit these without
   your yes. The proposed `CLAUDE.md` changes:
   - Heading: `## Current state (23 Sept 2026) — Phases 1–4 done; design v5.1 (white, one blue bar,
     one typeface) and every lesson on template v2`.
   - Replace the **Name and brand** bullet's design sentences with: "Design v5.1
     (`docs/BRAND_GUIDE.md` v4, `docs/DESIGN.md` v5.1): white pages at every OS setting (no dark
     theme), one blue header bar, navy ink, blue only for links in text, the one primary button,
     focus and current-item bars, Atkinson Hyperlegible Next only, the ledger as the signature, no
     gold, no motion except the consent switch. The logo is an interim drawn badge (inverse on the
     bar) until the licensed file arrives (see BRAND_GUIDE §4)." The Kalam sentence goes (Kalam,
     `HandNote`, `Blobs`, `Doodle` and `src/lib/hand.ts` are deleted).
   - **Template v2** bullet: "a highlighted key idea" becomes "a key idea set off by an ink bar".
   - **Gates** bullet, add: "`tests/e2e/design.spec.ts` checks a white page and one blue bar under a
     dark OS, no sideways scroll at 320, 360 and 640×400, 44px targets in the header, footer,
     consent banner and lesson contents, one primary button in the video question, no Bricolage,
     and no `style=` attribute in any built page."
   - **Share images** bullet: "drawn at build time as a white card under the blue bar with the
     inverse badge (`scripts/og-images.mjs`, resvg, Bricolage TTF until an Atkinson TTF is added)".
   - **Stack**: "Cross-document View Transitions behind `prefers-reduced-motion`; no scroll
     reveals" becomes "No page transitions and no scroll reveals".
   - **Hard rules**, accessibility: "WCAG 2.2 AA, keyboard, light only (plus forced colours and
     `prefers-contrast: more`), reduced motion; `npm run test:e2e` fails on any serious/critical axe
     issue at 393px (Pixel 5) and 1280px, and on sideways scroll at 320px, 360px and 640×400."
   - **Hard rules**, brand: add "gold" and "blue headings" to the list of things not to use.
   - **Workflow**: "screenshots at 360px and 1280px, light and dark" becomes "screenshots at 360,
     768 and 1280px, plus a dark-OS check that the page stays white".
   - `.claude/skills/ship-check/SKILL.md` and `.claude/agents/design-reviewer.md` (and
     `a11y-perf-auditor.md` if it checks dark mode): light only; a `prefers-color-scheme: dark`
     block or a blue heading is a finding; one primary per view, a neutral secondary, a 4px radius,
     rules instead of boxes, no card unless it holds a figure, list-row titles in ink; check 320 and
     360 for overflow and that a dark OS still shows white.
6. **The old name on the protected pages.** `src/pages/privacy.astro` and `src/pages/terms.astro`
   (and `cookies.astro`) still say "LaunchPad": replace it with `{site.name}` in the text, and in
   the `title` and `description` attributes use a template, e.g. ``title={`Privacy — ${site.name}`}``
   (`site` is already imported in all three).
7. **Lost spaces before links on the protected pages.** Where a line ends in a word and the next
   line starts with `<a`, the build drops the space ("emailhello@…", "on theCookies & storage
   page"): end each such line with `{' '}` (privacy.astro lines 27, 39, 51, 97 and 138; terms.astro
   34, 48, 51 and 58; cookies.astro 94).

Also, for later:

- **When accounts go live (Phase 6)**, the header's seventh link ("Sign in") does not fit the bar
  at 1024px: raise the header's 1024px breakpoint to 1100px in `Header.astro` and `RegionTabs.astro`
  (and `tokens.css`'s `--bar-h` query) at the same time.
- **Optional**: a short "Contents" list at the top of `/privacy` and `/cookies` (protected pages,
  your edit), like the lessons' "In this lesson".
