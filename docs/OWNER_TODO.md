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
