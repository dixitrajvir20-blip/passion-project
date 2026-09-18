# Business Lab

A free, global learning hub that teaches money and business to people aged 15–21 — with a focus on
those who don't have a financial adviser or family guidance to lean on. Lessons and interactive
calculators, written for phones and slow connections, in a separate edition for the money system
each reader actually lives in (India, Europe, the United States, with more planned).

Built in the open as a college passion project. The full plan, brand, editorial standards and
security posture live in [`docs/`](docs/) and are summarised for contributors and for Claude Code
in [`CLAUDE.md`](CLAUDE.md).

## Running it

```bash
npm install
npm run dev      # http://localhost:4321/passion-project/
```

It's an [Astro](https://astro.build) static build with [Preact](https://preactjs.com) islands for
the interactive tools. It deploys to GitHub Pages as a project site under `/passion-project`, so
`astro.config.mjs` sets `base` and every internal link goes through it.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built site |
| `npm run test:unit` | Vitest — the finance maths, consent, progress and auth logic |
| `npm run test:e2e` | Playwright — behaviour + axe accessibility at mobile and desktop |
| `npm run test:a11y` | Just the accessibility suite |
| `npm run contrast` | Check every design-token colour pair against WCAG AA |
| `npm run screenshots` | Full-page shots at 360/1280, light and dark (needs `npm run preview` running) |
| `npm run ship-check` | The release gate: build + unit + e2e |

To run the browser tests without downloading Chromium, set `PW_CHROMIUM=/path/to/chromium`.

## Layout

| Path | Purpose |
| --- | --- |
| `src/pages/` | One file per route; `[region]/` renders the three editions |
| `src/layouts/BaseLayout.astro` | Shell: head, metadata, skip link, header, footer, consent |
| `src/components/` | Logo, header, footer, region tabs, sticky sub-nav |
| `src/islands/` | Interactive Preact tools: break-even calculator, consent manager, sign-in |
| `src/lib/finance.ts` | Pure calculation functions — no DOM, fully unit-tested |
| `src/lib/regions.ts` | Per-edition content (framing, stats + sources, tracks, tool defaults) |
| `src/lib/format.ts` | `Intl` wrappers so money formats per locale |
| `src/lib/consent.ts` · `progress.ts` · `auth/` | Consent logic, local progress + sync codes, auth interface |
| `src/styles/` | `tokens.css` (the design system source of truth), `base.css`, `fonts.css` |
| `public/fonts/` | Self-hosted Bricolage Grotesque + Atkinson Hyperlegible Next |
| `docs/` | Brand, design, project brief, learning + regional guides, security, legal, playbook |
| `.claude/` | Claude Code agents, the ship-check skill, hooks and permissions |

## Conventions worth knowing

- **Design tokens only.** Colours, type, space, radius and motion live in `src/styles/tokens.css`.
  Nothing is hard-coded in a component, and there are no inline styles (a strict Content Security
  Policy blocks them).
- **No tracking, nothing personal.** No analytics, cookies, or third-party requests; fonts are
  self-hosted. Tool inputs stay in the browser; only preferences and progress are stored locally.
- **Education, not advice.** No buy/sell recommendations, no return promises, no named securities
  with prices; market examples use data at least 30 days old.
- **Accessibility is enforced, not aspirational.** The build fails on any serious or critical axe
  violation across every page, at mobile and desktop widths, and a script checks colour contrast.

## Status

**Phases 1–3 done, Phase 4 in progress** (see [`docs/BOSS_PLAYBOOK.md`](docs/BOSS_PLAYBOOK.md)):
the Astro foundation, the blue/gold/black brand, three editions, the legal/privacy layer, a strict
security posture, the account preview, the HTML-first lesson engine with the first three India
lessons and spaced review, all five calculators plus the India scam drill, and on-device search.
Next: social images at build time, EU and US lessons, the Hindi edition, and the real account
backend. Details in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md).

## Licence

Site content is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); the code is
MIT. Third-party statistics and quotations belong to their sources and are cited.
