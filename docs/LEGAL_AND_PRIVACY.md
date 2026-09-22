# Business Lab legal & privacy notes

Version 1.0 · 17 September 2026. **Not legal advice.** This is a sourced working brief so the
owner can build compliantly now and know exactly what to confirm with a lawyer before accounts
launch. Audience: India, EU and US (UK possible). Sources are named inline with dates.

## The design decision that removes most of the problem

**Collect no personal data until there is a clear reason.** With no accounts, no cookies and no
analytics, Business Lab processes essentially no personal data, which means no consent banner is
required, no parental-consent machinery is needed, and the breach surface is near zero. Every
feature that changes this (accounts, analytics, a newsletter, embeds) is gated and adds its own
compliance step. Build privacy-first and stay there as long as possible.

## Cookies and device storage (today: nothing to consent to)

- ePrivacy Art. 5(3) and EDPB Guidelines 2/2023 cover *any* storage or access on the device, not
  just cookies — so localStorage is in scope. But storage that is **strictly necessary for a
  feature the user asked for** is exempt (WP29 Opinion 04/2012; CNIL 2020). Remembering the
  edition, the currency, the reader's own progress, and the consent choice itself are all exempt.
- The UK's Data (Use and Access) Act 2025 (in force 5 Feb 2026) added explicit PECR exemptions
  for **preference** and **statistical** storage, with clear information and an easy opt-out.
- **Result: no banner is required for the site's necessary storage.** We still publish a full
  `/cookies` page listing every key, and a "Privacy choices" dialog, because transparency is the
  actual obligation.
- **Learning time (19 Sep 2026).** The dashboard can show minutes spent on the site per day. That
  is not strictly necessary for anything the reader asked for, so it is an optional category
  (`stats`, key `lp:activity`) and a banner asks on the first visit: "Reject all" is as easy as
  "Accept all", nothing is recorded before a choice, a later no removes what was kept, and Global
  Privacy Control counts as no. It stays in the browser; nothing is sent. `/cookies` must list the
  key (owner's edit; the page is protected).
- **Lesson videos (21 Sep 2026).** Every lesson opens with a short teaching video from YouTube.
  The page ships a drawn poster and nothing from Google; on play, the privacy-enhanced player
  (youtube-nocookie.com) loads only if the reader has said yes to the `embeds` category ("Videos
  from other sites"), otherwise the choice is put to them in place, with a plain link out as the
  alternative. The category is active by default now, so the banner names it; Global Privacy
  Control counts as no. `/cookies` and `/privacy` need a line each (owner's edit; the pages are
  protected). YouTube's own terms and cookies apply once a video plays, and the player says so.
- If analytics or embeds are ever switched on, a banner appears with "Reject all" as easy as
  "Accept all" (EDPB cookie-banner taskforce, Jan 2023; CNIL fines on Google/Facebook Jan 2022),
  nothing runs before a choice, and Global Privacy Control is honoured as "reject". The consent
  logic (`src/lib/consent.ts`) already enforces this; the categories are defined in
  `src/lib/site.ts` and default to inactive.

## Children (the core compliance question for a 15–21 site)

| Region | Rule | What we do |
|---|---|---|
| **EU** | GDPR Art. 8: digital-consent age 13–16 by member state; a service "likely accessed by children" must design for them | No data collected today. If accounts launch, a per-region age gate; under the local age → parental consent or no account. No profiling or nudges. |
| **UK** | Children's Code (AADC): applies to any service likely accessed by under-18s; high-privacy defaults, DPIA, no manipulative nudges; self-consent at 13 | Consent UI has no dark patterns; DPIA before accounts; 13+ self-consent, parental below. |
| **India** | DPDP Act 2023 s.9 + Rules 2025 (notified 13 Nov 2025; s.9 in force ~13 May 2027): **under-18 = child**, verifiable parental consent required, **absolute ban on tracking, behavioural monitoring and targeted ads to children** | No tracking/ads/profiling of anyone, by design. India under-18 accounts require a parental-consent flow (built as a screen; verification via parent email now, DigiLocker virtual-token when available). Simplest compliant option at launch: India accounts 18+, under-18 stays device-local. |
| **US** | COPPA (under-13); FTC amended rule (compliance 22 Apr 2026): neutral age screen, no default age; "actual knowledge" triggers duties for a 13+ service | Neutral year-of-birth screen; no accounts under 13; delete on actual knowledge. |
| **US states** | CCPA (13–15 opt-in for sale/share; for-profit "businesses" only), Colorado, others; honour GPC | We are not a "business" and never sell/share; we honour GPC globally anyway. |

The age gate is a **neutral** year-of-birth field (FTC guidance: no default, no hint at the
minimum, a session flag to stop back-button retries). The logic is in
`src/lib/auth/validate.ts` and is unit-tested per region.

## Required pages (all built, in `src/pages`)

| Page | Satisfies |
|---|---|
| `/privacy` | GDPR Art. 13/14, UK GDPR, DPDP Rule 3 notice, CCPA notice-at-collection, COPPA-style notice; controller identity, data, purposes, retention, rights, complaint routes per region |
| `/cookies` | ePrivacy/PECR storage transparency; full key list; consent categories and their status |
| `/terms` | House rules; education-not-advice; reuse licence; minors' contracts kept simple |
| `/accessibility` | Voluntary WCAG 2.2 AA statement + feedback route |
| `/disclaimer` | Education-not-advice; no buy/sell; ≥30-day market data |
| `/.well-known/security.txt`, `SECURITY.md` | RFC 9116 + disclosure policy |

Notes: a German **Impressum** (DDG §5 / MStV §18) is unlikely to bind a US-run non-commercial
site, but MStV §18 expressly *relaxes* the rules for young people running youth-oriented
telemedia — confirm with a lawyer if the site is ever operated from Germany. The European
Accessibility Act (28 Jun 2025) lists commercial services, not a free educational site, so our
accessibility statement is voluntary but published anyway.

## Analytics & third parties

- Google Analytics needs consent under Art. 5(3) regardless of the EU-US Data Privacy Framework
  — we don't use it. Any future analytics is cookieless, single-site, no cross-site IDs,
  aggregate-only, with an opt-out, meeting CNIL's audience-measurement conditions.
- **Self-hosted fonts** (already done) avoid the Google Fonts IP-transfer problem (LG München I,
  Jan 2022).
- YouTube: only `youtube-nocookie` **click-to-load** (a thumbnail; the iframe loads on tap and
  only with consent), so nothing reaches Google until the reader chooses.
- Newsletter (if added): double opt-in (the German BGH standard) and CAN-SPAM basics (accurate
  headers, a physical address, working unsubscribe).

## Financial-education content rules (this is where a money site gets into trouble)

The single most important editorial constraint. Enforced by the content-reviewer subagent and
`docs/CONTENT_GUIDE.md`.

- **India (SEBI, 29 Jan 2025, updated 8 May 2026):** an "education-only" person must not (i)
  advise or recommend on specific securities without registration, or (ii) claim returns or
  performance. Market **price data must be lagged** — the rule was three months, updated in 2026
  to **30 days** for education-only use. Practical rule for Business Lab: never name a security with
  a price or target; use data ≥30 days old or fictional; no "returns" claims; no ties to
  unregistered tipsters. (We standardise on the stricter, simpler rule: ≥30 days, no named
  securities, no forecasts.) *Confirm the current wording before publishing any market example.*
- **UK (FCA FG24/1, 2024):** a financial promotion is an invitation or inducement to engage in
  investment activity; promoting a regulated product without approval can be a criminal offence.
  Generic education without inducement is outside this — so no "buy this", no product links.
- **EU (MAR / ESMA):** frequent public investment recommendations are regulated. We publish none.
- **US (Advisers Act; FINRA/SEC on finfluencers):** advice about securities for compensation is
  regulated; a bona fide general-education publication is not. No paid promotion, no specific
  buy/sell calls.
- Disclaimers ("education, not advice") evidence intent but do **not** cure a specific
  recommendation, a performance claim, or undisclosed paid promotion. The protection is not
  making those in the first place.

## Do-Not-Track / Global Privacy Control

California and Colorado require honouring GPC for opt-out of sale/sharing. We don't sell or
share, so there's nothing to opt out of, but the consent manager treats a GPC signal as "reject
all" for optional categories anyway, globally. No "Do Not Sell" link is required because there
is no sale; the privacy policy says so plainly.

## The lawyer checklist (before accounts or analytics launch)

1. Whether a US-run, non-commercial site is "established"/targeted enough to trigger per-country
   EU rules and any Impressum duty.
2. The analytics-without-consent position for Germany, the Netherlands and Austria specifically.
3. Whether lesson-progress localStorage is "strictly necessary" vs "requested by the user" (we
   treat it as exempt; get this confirmed).
4. DPDP: whether Business Lab is a Data Fiduciary for Indian users, the adequacy of the Rule 10
   parental-consent flow, and the exact current SEBI price-data wording.
5. UK Children's Code DPIA scope; newsletter consent under PECR.
6. CCPA / state thresholds (confirm we are not a "business"/controller).
7. Enforceability of terms against minors in each region.

## What the app already does to stay on the right side of this

- No accounts, cookies, analytics or ads shipped; all gated behind env flags default-off.
- Consent logic honours GPC and "reject all" parity, and never runs anything optional without an
  explicit yes.
- Age gate is neutral and per-region; India under-18 routes to a parental-consent screen.
- Every legal page is real, dated, and versioned in the public repo.
- The disclaimer and per-edition notes carry the ≥30-day, no-advice, no-named-security rule.
