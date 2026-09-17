# LaunchPad accounts & sign-in

Version 1.0 · 17 September 2026. How the optional "sync your progress" feature is designed, why
it stays optional, and what has to be true before it goes live. The UI exists today as a
**preview** (`/account`), fully built and tested, wired to a stub provider that stores nothing.

## Principle: local-first, account-optional

Progress lives in the browser (`localStorage`, `src/lib/progress.ts`). An account exists only to
keep that progress in step across devices. This is a deliberate privacy choice, straight from
Apple's guidance ("ask people to create an account only if your core functionality requires it;
otherwise let people enjoy your app without one" — HIG, Managing accounts): no account means no
email, which means no parental-consent machinery and almost no compliance surface. It is also the
right UX for a site whose whole argument is about not being steered.

Three tiers, in order of how much we'd rather you use:

1. **No account (default).** Everything works. Move progress between devices with a **sync code**
   — the whole progress record encoded as `LP1.…`, copy-paste or (later) a QR. Zero personal
   data, no age gate. Like Brave Sync or a Cookie Clicker save string.
2. **Email account.** Email → 6-digit code (primary) or magic link (secondary). After first
   sign-in, offer a passkey.
3. **Optional Google/Apple** later. Not at launch (Sign in with Apple on the web needs a paid
   Apple Developer membership and a Services ID; not worth it initially).

## Screen-by-screen flow (Apple-style: one thing per screen, one primary action)

Built in `src/islands/SignIn.tsx`. Each screen moves focus to its heading so screen readers
announce the change; each has one primary button, a secondary, and a way out.

| Step | Screen | The one job | Key states |
|---|---|---|---|
| entry | "Keep your progress on every device." | Choose email / sync code / no account | Only reachable from a progress card, never forced on first visit |
| age | Year of birth + region | Neutral age screen | No default year, no hint at the minimum; session flag stops back-button retries |
| email | "What's your email?" | Collect email | `autocomplete="email webauthn"` so a passkey can autofill |
| code | "Check your email." | Enter 6-digit code | Paste allowed; expires 10 min; resend on a 60s cooldown; wrong code explained in text + `aria-invalid` |
| passkey | "Sign in faster next time." | Offer a passkey (only if a platform authenticator exists) | "Not now" is always there; never nag more than once/30 days |
| merge | "Combine progress from this device?" | Merge local + account progress | Shows counts; "keep this device only" is an option |
| done | "You're signed in." | Confirm + return | — |
| parent | "A parent or guardian needs to set this up." | Under-local-age path | Parent email; nothing created until they confirm |
| local | "Your progress stays on this device." | Under-13 / no-account path | Offers a sync code instead |
| sync | "Move progress with a code." | Export/import the sync code | Warns the code is a key; import validates the `LP1.` prefix |

## Age gate & parental consent by region

Logic in `src/lib/auth/validate.ts`, unit-tested. Self-consent ages: **India 18** (DPDP: under-18
is a child), **EU 16** (GDPR Art. 8 default), **UK 13**, **US 13** (COPPA). No accounts under 13
anywhere. Under the local age routes to the parent screen; under 13 routes to device-local.

The parental path today collects a parent email and a confirmation. Before India accounts launch,
this upgrades to verifiable consent (DPDP Rule 10: parent verified via identity details or a
DigiLocker virtual token). Simplest compliant launch: **India accounts 18+ only**, under-18
Indians use device-local progress + sync code, which needs no consent at all.

## Provider architecture

The UI talks only to the `AuthProvider` interface (`src/lib/auth/provider.ts`), so the backend is
swappable without touching the island.

- **`createPreviewProvider()`** — the current stub. No network, nothing stored, the code shows on
  screen. It exists so the flow can be designed, tested and reviewed before a backend and the
  legal sign-off exist. It must never be the live provider (guarded by `site.accountsEnabled`,
  which reads `PUBLIC_ACCOUNTS_ENABLED`).
- **Live provider (recommended): Better Auth on Cloudflare Workers + D1**, with Resend for email.
  It's the only free option with production-grade passkeys, conditional-UI autofill and email
  OTP, no per-user pricing cliff, and you own the data and its region (pick EU/India). Runner-up:
  Supabase Auth (Mumbai or Frankfurt project), managed but its passkey support is still marked
  experimental and free projects pause when idle.

The account backend runs on that separate origin, **not** GitHub Pages (Pages can't run server
code or set the cookie headers auth needs). The static site calls it via `connect-src`.

## Security essentials (full register in `docs/SECURITY.md`)

- **Passkeys primary** (WebAuthn, synced): phishing-resistant, broad 2026 support (Android 9+,
  iOS 16+, macOS 13+, Windows Hello; conditional UI in all major browsers; QR for cross-device).
- **Email code**: CSPRNG, hashed at rest, ≤10 min, single use, 5 attempts, 60s resend cooldown,
  identical responses to prevent enumeration. The magic **link** is secondary and consumed by a
  click (POST), so mail-scanner prefetch (Defender/Mimecast) can't burn it — a real operational
  bug for teens on school Wi-Fi, which is why the code is primary.
- **No passwords** at all, which avoids NIST's password rules entirely.
- **Sessions**: `__Host-` `Secure` `HttpOnly` `SameSite=Lax` cookie, regenerated on login,
  server-side logout, idle + absolute timeouts. Never a token in localStorage.

## Accessibility (WCAG 2.2, tested)

- **3.3.8 Accessible Authentication:** paste is allowed in the code field; passkey and magic-link
  alternatives exist; no CAPTCHA without an alternative. No cognitive-function test.
- **3.3.7 Redundant Entry:** the email is echoed on the code screen, not re-typed.
- **1.3.5 Input purpose:** `autocomplete="email webauthn"`, `one-time-code`, `bday-year`.
- **2.5.8 Target size:** all controls ≥44px.
- **3.3.1 / 4.1.3:** errors in text (not colour) with `aria-invalid`; status via `role="status"`.
- Visible labels (never placeholder-only); focus moves to each step's heading.

## What has to be true before flipping `PUBLIC_ACCOUNTS_ENABLED=true`

1. A real backend implementing `AuthProvider` (Better Auth on Workers + D1), in an EU/India region.
2. A transactional email domain with SPF + DKIM + DMARC (Resend/Postmark/Brevo).
3. The lawyer checklist in `docs/LEGAL_AND_PRIVACY.md` cleared, especially the India parental-consent flow.
4. The privacy policy updated with the provider, region, retention and the exact data collected.
5. Header-capable hosting for the auth origin (CSP, HSTS, `__Host-` cookies).
6. Rate limiting, Turnstile threshold, and a breach-notification runbook (GDPR 72h / DPDP).
7. The `/account` page's `noindex` stays until it's real, then is removed.
