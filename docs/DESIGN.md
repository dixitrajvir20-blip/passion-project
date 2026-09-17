# LaunchPad design system

Version 2.0 · 17 September 2026. Supersedes the green v1. Read `docs/BRAND_GUIDE.md` first —
this file is how the brand is built in code. The machine source of truth is
`src/styles/tokens.css`; this document explains the rules behind it and how to extend them.

## 0. The two jobs

Every screen has to do two things at once, and the tension between them is the whole design:

- **Feel at home** — familiar patterns, system-like controls, nothing to learn.
- **Be unmistakable** — you could crop out the logo and still know it's LaunchPad.

Resolve it the way Apple does: structure and controls are quiet and conventional; identity lives
in the type, the one accent, the navy, and one or two signature moments per page.

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
- Cards and alternating bands: `--bg-2`. Deep sections: `.section-dark` (navy) re-maps tokens.
- `color-mix()` is allowed for tints (e.g. the callout is `color-mix(in srgb, var(--gold) 20%,
  var(--bg))`), with a solid fallback where a mix would fail contrast.
- Verify with `npm run contrast` — it parses the tokens and checks every pair.

## 3. Type

Bricolage Grotesque (display) + Atkinson Hyperlegible Next (body), self-hosted and subset,
preloaded (`atkinson-latin`, `bricolage-latin`). Scale and rules in the brand guide §3. The
banned-font list there is enforced in review.

## 4. Components (all in `src/components`, `src/islands`, `base.css`)

- **Button** `.btn` — pill, 44px min height. `.btn` (blue fill), `.btn-secondary` (grey),
  `.btn-link` (text + ›). One primary per view. `.btn-lg` for hero CTAs.
- **Card** `.card` — flat `--bg-2`, 20px radius, no border, no shadow. `.card-arrow` adds a
  corner arrow that slides on hover. `.card-outline` for "coming soon" placeholders.
- **Callout** `.callout` — soft gold tint behind black text, for an "in 30 seconds" summary.
- **Figure** `.figure` — a large display number for editorial statistics; always beside its
  sentence and source link, never in a bare banner.
- **Eyebrow** `.eyebrow` — small dark-gold label above a heading. A text label, not a pill.
- **Header** — sticky, frosted (`backdrop-filter`), with a `prefers-reduced-transparency`
  fallback to a solid bar. Mark-only on phones so the row fits 52px.
- **RegionTabs** — pill segmented control; the active edition is a white pill, state carried by
  fill and weight, not colour alone.
- **SubNav** — sticky in-page nav for long pages; the active section follows the viewport via
  IntersectionObserver and gets `aria-current`; a sentinel adds a hairline when stuck.
- **ConsentManager** island — banner + `<dialog>` privacy-choices panel (see `docs/LEGAL_AND_PRIVACY.md`).
- **SignIn** island — the account flow (see `docs/AUTH_AND_ACCOUNTS.md`).
- **Tool shell** — `.tool` in `src/islands/tools.css`: two columns, inputs left, a sticky
  results panel right, a "how this works" `<details>` with the formula.

## 5. The advanced visual layer (progressive enhancement)

Everything here is additive: the page is complete and correct without it. Each feature sits
behind `@supports` and/or `prefers-reduced-motion`, so old browsers and reduced-motion users get
a clean static page. Support notes are current as of September 2026.

- **Cross-document View Transitions** (`@view-transition { navigation: auto }`): a short root
  fade between pages. Chrome + Safari; Firefox degrades to an instant swap. We do *not* use
  Astro's `<ClientRouter/>` — native cross-doc transitions do the job and keep the JS budget and
  the CSP simple. Reduced motion disables it.
- **Reveal on enter**: content rises 14px and fades as it scrolls in. Driven by IntersectionObserver
  (universal), *not* `animation-timeline: view()` — that has no Firefox support yet, and the JS
  version gives us a safety net that guarantees content is never left hidden. Starts hidden only
  when `.js` is present, so no-JS readers see everything; a 1.5s timeout reveals anything the
  observer misses. Off under reduced motion.
- **Frosted sticky header and sub-nav**: `backdrop-filter: blur()` with a solid-background
  fallback via `@supports not` and `prefers-reduced-transparency`.
- **Scroll-state, container queries, anchor positioning, Popover API, customizable `<select>`**:
  approved for use *only* behind `@supports`, because Firefox and/or Safari support is still
  partial in 2026. Prefer a plain sticky + IntersectionObserver pattern (as SubNav does) until a
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
blue→purple gradients → one flat accent; three identical icon cards → varied editorial sections;
glows and glass decoration → one shadow, frosting only on functional bars; stat banners →
figures with sources; centred hero + badge → left-aligned editions, a text eyebrow; hype copy →
specific numbers. The design-reviewer subagent checks these on every change.
