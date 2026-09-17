# LaunchPad

A free, global learning hub that teaches business ideas, entrepreneurship and money
skills to people aged 15–21 — with a focus on those who don't have access to a financial
adviser or family guidance.

Built as a college passion project. Scope, visual rules and editorial standards live in
[`docs/`](docs/) and are summarised for contributors in [`CLAUDE.md`](CLAUDE.md).

## Running it

```bash
npm install
npm run dev
```

The site is an [Astro](https://astro.build) static build with [Preact](https://preactjs.com)
islands for the interactive tools. It deploys to GitHub Pages as a project site, so it is
served under `/passion-project` — `astro.config.mjs` sets `base` accordingly and every
internal link goes through it.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built site |
| `npm run test:unit` | Vitest — the finance maths |
| `npm run test:e2e` | Playwright — tool behaviour + axe accessibility |
| `npm test` | Both suites |

## Layout

| Path | Purpose |
| --- | --- |
| `src/pages/` | One file per route |
| `src/layouts/BaseLayout.astro` | Shell: head, skip link, header, footer |
| `src/components/` | Header and footer |
| `src/islands/` | Interactive tools (Preact, hydrated with `client:visible`) |
| `src/lib/finance.ts` | Pure calculation functions — no DOM, fully unit-tested |
| `src/lib/format.ts` | `Intl` wrappers so money formats per locale |
| `src/styles/` | `fonts.css`, `tokens.css` (from DESIGN.md), `base.css` |
| `public/fonts/` | Self-hosted Literata + Atkinson Hyperlegible Next |
| `tests/` | `unit/` (Vitest) and `e2e/` (Playwright + axe) |

## Conventions worth knowing

- **No tracking.** No analytics, no cookies, no third-party requests. Fonts are
  self-hosted so page loads reveal nothing to a CDN.
- **Nothing personal is collected.** Tool inputs stay in the browser; only the chosen
  currency is persisted, in `localStorage`.
- **Education, not advice.** No buy/sell recommendations, no return promises.
- **Accessibility is enforced, not aspirational.** `npm run test:e2e` fails the build on
  any serious or critical axe violation across every page, at mobile and desktop widths.

## Status

Phase 0 is complete: the Astro foundation, design tokens, the page shell, and the
break-even calculator end to end. The lesson content, the remaining four calculators,
the quiz component and search are still to come — see
[`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) §14.
