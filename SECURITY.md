# Security policy

Business Lab is a static educational site with no accounts and no server-side data (see
`docs/SECURITY.md` for the full threat model and risk register).

## Reporting a vulnerability

- Email: hello@business-lab.example (replace with the live address before launch)
- Or open a private report: https://github.com/dixitrajvir20-blip/passion-project/security/advisories/new
- Machine-readable contact: `/.well-known/security.txt`

Please include the page URL, steps to reproduce, and what you think the impact is. You will get
a reply within 7 days. Do not test against real users' data (there is none) or run automated
scanners against the live site without asking first.

## What is in scope

- The built site (`dist/`), its client-side code, and the GitHub Actions workflows.
- The content: financial claims that are wrong or unsourced count as bugs too.

## Supported versions

Only `main` is deployed. Fixes ship on the next deploy; there are no release branches.
