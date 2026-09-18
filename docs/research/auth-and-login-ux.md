# Sign-in research + spec for the "Sync your progress" page (17 Sep 2026)

"UNVERIFIED" marks claims not confirmed from a primary page.

## A. Recommended architecture
**Principle: accounts stay optional, local-first.** Apple HIG: "Ask people to create an account only if your core functionality requires it; otherwise, let people enjoy your app or game without one" and "Delay sign-in for as long as possible" (https://developer.apple.com/design/human-interface-guidelines/managing-accounts). Compliance reason: no email = no personal data = no parental-consent machinery.

**Three tiers**: (1) no account: local progress + "sync code" (Brave-style) + export/import; (2) email → 6-digit code (primary) with magic link as secondary; then offer a passkey — FIDO: "Prompt during account tasks… not during sign-in" (https://www.passkeycentral.org/design-guidelines/principles/); (3) optional Google/Apple later — Sign in with Apple on the web needs a $99/yr Developer Program membership and a Services ID (https://developer.apple.com/help/account/configure-app-capabilities/configure-sign-in-with-apple-for-the-web/), secret regenerated every 6 months.

**Stack:** Astro on Cloudflare Pages/Workers (https://docs.astro.build/en/guides/integrations-guide/cloudflare/) + **Better Auth** (passkey, magic-link, email-OTP, anonymous plugins; Astro handler at `/api/auth/[...all]`: https://www.better-auth.com/docs/integrations/astro) + D1 via better-auth-cloudflare (https://github.com/zpg6/better-auth-cloudflare) + **Resend** free tier (3,000/mo: https://resend.com/pricing). GitHub Pages cannot host the auth route (https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) — if you must stay there, use Supabase.

## B. Screen-by-screen flow (Apple-style)
| # | Screen | Copy | States / errors |
|---|---|---|---|
| S0 | Entry | "Keep your progress on every device." / "Sign in with your email. No password needed." **Continue with email** · "Use a sync code instead" · "Keep going without an account" | Shown only after the user has progress worth saving |
| S1 | Age | "What year were you born?" — neutral numeric field, no default | Under-threshold → "A parent needs to set this up" or stay local; session flag stops back-button retries (FTC FAQ D.7) |
| S2 | Email | `type=email autocomplete="email webauthn"`, **Continue**; conditional-UI passkey request on load | Invalid: "That doesn't look like an email address." In-app browser: "Open this page in Safari or Chrome to sign in." |
| S3 | Check your email | "Enter the code we sent to name@example.com" — `inputmode="numeric" autocomplete="one-time-code"`, paste allowed; "Resend code" (60 s) · "Wrong address?" | Wrong: "That code didn't match. Check the newest email." 5 tries: "Too many tries — request a new code." Expired (10 min). |
| S4 | Magic-link landing | "Confirm it's you" + **Continue**; token in URL fragment; consumed by POST on click | Different device / already used states |
| S5 | Passkey offer | "Sign in faster next time." "Passkeys are encrypted digital keys you create using your fingerprint, face, or screen lock." **Create a passkey** · "Not now" | Only if `isUserVerifyingPlatformAuthenticatorAvailable()`; never nag more than once per 30 days |
| S6 | Merge | "Combine progress from this device with your account?" **Combine** · "Keep account only" · "Keep this device only" | Show counts |
| S7 | Returning | Same as S2; autofill shows passkey; visible **Sign in with a passkey** on Windows 10 | Hybrid stall: "Can't reach your phone? Use your email instead." |
| S8 | Settings | Passkey cards (name, created, Remove), Email, **Sign out**, **Delete account** (not buried — HIG) | Deletion within 24 hours |

## C. Provider comparison (fetched 17 Sep 2026)
| Provider | Passkeys | Magic link / code | Free tier | Residency | Static-site fit |
|---|---|---|---|---|---|
| **Better Auth** | Stable plugin, conditional UI (better-auth.com/docs/plugins/passkey) | Magic link 5 min + email-OTP plugin | Free; Workers/D1 free tiers | Your DB | Needs server route → Cloudflare, not GitHub Pages |
| **Supabase Auth** | "Experimental. The API may change without notice." (supabase.com/docs/guides/auth/passkeys) | Magic link + OTP, 1 h default, 60 s cooldown | 50,000 MAU; **free projects pause after 1 week inactivity** | Mumbai + 6 EU regions | Best pure-static option |
| **Clerk** | Not on free plan | Email codes + links | 50,000 MRU | UNVERIFIED | Client SDK works static |
| **Auth.js** | "experimental and not yet recommended for production" | Email provider | Free | Your DB | Needs server |
| **Firebase Auth** | No native passkeys (UNVERIFIED) | Email-link | 50K MAU | "run only from US data centers" | Client SDK OK |
| **Kinde** | Not on free plan | Email passwordless code | 10,500 MAU | Choice of residency (regions UNVERIFIED) | Hosted UI |
| **Stytch** | Yes | "Protected Email Magic Links" defeat scanners | 10,000 MAU | UNVERIFIED | Good SDK |
| **WorkOS AuthKit** | Yes | 6-digit code | 1,000,000 MAU | UNVERIFIED | B2B-oriented |
| **Cloudflare Access** | No | Email OTP; docs warn scanners can consume PINs | Free ≤50 users | — | Wrong tool |

**Recommendation: Better Auth on Cloudflare Pages/Workers + D1 + Resend.** Runner-up: Supabase.

## D. Age gate + parental consent by region
- **Neutral age screen (all regions):** FTC COPPA FAQ D.7: "Ask age information in a neutral manner… does not default to an age 13 or over"; use "technical means, such as a cookie, to prevent children from back-buttoning" (https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions). ICO: self-declaration "may be suitable for low risk processing".
- **US:** COPPA under-13 only; "email plus" acceptable only for internal-use data (FAQ I.4).
- **UK:** self-consent at 13; below that, "reasonable efforts to verify" parental consent.
- **EU:** GDPR Art. 8: 16 default, member states may lower to 13. Google's/Apple's per-country account ages are a handy table (https://support.google.com/accounts/answer/1350409 ; https://support.apple.com/en-us/125666).
- **India:** DPDP Rules notified 13 Nov 2025; Rule 10 from 13 May 2027: verify the consenting parent "is an adult by using reliable identity details or a virtual token" (DigiLocker-style). Everyone under 18 is a child.

**How peers do it:** Khan Academy — under-13 accounts are parent-created, "cannot have email addresses attached" (https://support.khanacademy.org/hc/en-us/articles/360040168512). Quizlet — parental confirmation email in certain locations (https://help.quizlet.com/hc/en-us/articles/360029190271). Brilliant — no under-13 data without verifiable parental consent (https://brilliant.org/privacy/). Roblox — parent links via email then verifies with ID or card (https://about.roblox.com/parental-controls). Discord — 13+, teen-by-default with age estimation (https://discord.com/safety/how-discord-is-building-safer-experiences-for-teens). Google Classroom — under-13 only with Workspace for Education (https://support.google.com/edu/classroom/answer/7582372).

## E. Accessibility checklist (WCAG 2.2)
- **3.3.8 Accessible Authentication (Minimum):** no cognitive function test without an alternative; allow paste; WebAuthn/OAuth count as passing; CAPTCHA without alternative fails (https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html).
- **3.3.7 Redundant Entry:** prefill email on later screens (https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html).
- **1.3.5 Identify Input Purpose:** `autocomplete="email"` / `"one-time-code"`; "The webauthn token must appear at the end" (https://www.corbado.com/blog/webauthn-autocomplete).
- **2.5.8 Target Size:** ≥24×24 CSS px (use 44px) (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **3.3.1 Error Identification** in text; **4.1.3 Status Messages** via `role="status"`; **2.4.11 Focus Not Obscured**.

## F. Research notes
**Passkeys (2026).** FIDO World Passkey Day (7 May 2026): ~5 billion passkeys in use; 75% have enabled one; 49% use them regularly (https://fidoalliance.org/fido-alliance-reports-accelerating-global-passkey-adoption-on-world-passkey-day-2026/). Support (passkeys.dev, 20 May 2026): synced passkeys on Android 9+, iOS 16+, macOS 13+, ChromeOS 129+; Windows synced "Planned"; conditional UI: Chrome/Edge 108+, Safari 16.1+, Firefox 122+ (https://passkeys.dev/device-support/). Conditional UI mechanics: `mediation:"conditional"`, one request at a time, AbortController before modal (https://www.corbado.com/blog/webauthn-conditional-ui-passkeys-autofill). Pitfalls: in-app browsers fail silently; iframes need `allow="publickey-credentials-get"`; preview domains break rpID (https://mojoauth.com/blog/known-broken-passkey-combinations-and-workarounds). Copy: FIDO "Sign in with a passkey" (https://www.passkeycentral.org/design-guidelines/required-patterns/sign-in-with-a-passkey/); Google: say "passkeys", never "WebAuthn" (https://developers.google.com/identity/passkeys/ux/communicating-passkeys). **Minors:** no official statement found that iCloud Keychain or Google Password Manager blocks passkey creation for 13–17 (UNVERIFIED).

**Magic links.** Expiry 10 min, ≥128-bit tokens, hashed, single-use; scanners prefetch links → use POST confirmation buttons (https://github.com/orgs/supabase/discussions/41618). Make the **6-digit code primary** for teens on school Wi-Fi. Deliverability: Google requires SPF/DKIM, spam <0.3% (https://support.google.com/mail/answer/81126). Providers: Resend 3,000/mo free; Postmark 100/mo free; Brevo 300/day; **Amazon SES free tier ended for new customers 21 Jul 2026** (https://aws.amazon.com/blogs/messaging-and-targeting/introducing-amazon-simple-email-service-ses-pricing-plans/).

**Google/Apple for teens.** Google minimum age 13 default; 14–16 in listed EU countries; younger via Family Link. Apple child accounts require Family Sharing; 18 in Brazil and Texas. Sign in with Google carries no age signal in basic scopes; People API `ageRanges` under a sensitive scope (UNVERIFIED). Apple's guideline 4.8 (must offer Sign in with Apple as an equivalent option) is an **App Store Review Guideline** for apps, not websites. Button branding: Google (https://developers.google.com/identity/branding-guidelines); Apple min 140×30pt (https://developer.apple.com/documentation/signinwithapple/displaying-sign-in-with-apple-buttons-on-the-web.md).

**Apple HIG quotes to reuse:** "If you don't use Sign in with Apple… prefer using a passkey"; "Don't ask people to supply a password"; "Give people a chance to engage with your app before asking for optional data"; "Provide a clear way to initiate account deletion… don't bury it"; "Postpone nonessential setup flows".

**Sync without accounts.** Brave Sync: "there is no Brave 'account'" — 24-word phrase or QR; no recovery if lost (https://support.brave.app/hc/en-us/articles/360047642371-Sync-FAQ). Cookie Clicker: "Export Save" string. Wordle: NYT added account login to track progress across devices. Trade-offs: phrase/QR = zero PII and no age-gate burden, but lost code = lost progress and anyone with the code can read/write.

## G. Open items to verify before build
Passkey creation on Apple child / Google supervised accounts; Clerk/Stytch/WorkOS/Kinde EU residency; D1 location guarantees; DPDP Fourth-Schedule education exemptions and vendors for DigiLocker age tokens; EU DSA applicability to a no-UGC site.
