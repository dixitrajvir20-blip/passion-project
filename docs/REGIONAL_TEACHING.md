# Business Lab regional teaching guide

Version 1.0 · 17 September 2026. How each edition is made local — the money situations that
actually hit 15–21-year-olds there, the payment rails and institutions to use in examples, the
scams to teach against, the regulator limits, and interactive formats that fit. Every claim has a
source with a date; verify before publishing (numbers move). The three live editions are India,
the EU and the US; the rest are the roadmap.

The shared method (from `docs/LEARNING_DESIGN.md`): the *skill* is universal, the *situation* is
not. A "debt" lesson is loan apps and UPI fraud in India, regulated BNPL in Europe, and student
loans and credit scores in the US. One codebase, `src/lib/regions.ts` per-edition data, a tab on
every page.

---

## India (live)

**The gap:** payment rails arrived faster than the knowledge to use them safely. UPI hit ~24.5bn
transactions/month in Aug 2026 (NPCI); ~27% of adults are financially literate (NCFE survey).
Fraud is the headline risk: NCRP recorded ₹22,846 crore lost in 2024 (Lok Sabha, Dec 2025), and
68% of digital-fraud victims are graduates — education is not the protection people assume.

**Money situations:** first job (CTC vs in-hand: EPF, professional tax, TDS); UPI scams; unregulated
loan apps; fake part-time-job offers; derivatives gambling (under-30s were 43% of F&O traders in
FY26, 89% of them losing — SEBI, Aug 2026); shared/borrowed phones (18% of Indians go online via
someone else's device — IAMAI-Kantar 2025).

**Rails & products for examples:** UPI, RuPay; PPF (7.1%, Jul–Sep 2026), RD, NSC, SSY; kirana
*udhaar*, chit funds, gold as family savings.

**Scams to teach:** phishing/fake-KYC links, counterfeit QR, screen-share apps, SIM swap, "digital
arrest" video calls, money-mule recruitment. Always end with "call 1930 / cybercrime.gov.in within
the golden hour". Link RBI Sachet, SEBI SCORES.

**Regulator limit:** SEBI's education-only rule (29 Jan 2025, updated 8 May 2026) — no advice on
named securities without registration, no returns claims, market price data lagged (now ≥30 days).
We use ≥30-day-old or fictional data and never name a security with a target.

**Learning habits:** demand for Indian-language content (98% access content in Indic languages);
YouTube/WhatsApp as channels; family co-decisions; low-end Android; Hindi edition is the priority
v2 localisation.

**Formats:** (1) UPI "spot the fake" scam simulator; (2) offer-letter decoder (CTC → in-hand);
(3) chai/tiffin-stall P&L; (4) "tips group" trap — find the unregistered adviser; (5) PPF/RD/FD/SIP
goal ladder. Businesses: chai stall, tiffin service, kirana store, WhatsApp/Instagram reselling.

## Europe (live)

**The gap:** strong consumer protection, low confidence, 27 rulebooks. Only 18% of EU citizens
score high on financial literacy (Flash Eurobarometer); ~49% couldn't cover three months from
savings; young people score lowest. The EU's own Financial Literacy Strategy (COM(2025) 681)
names them as a priority.

**Money situations:** first payslip/apprentice wage (49% of upper-secondary students are in
vocational tracks); building a three-month buffer; BNPL-is-a-loan; crossing a border changes tax
and invoicing; non-euro currencies (Poland, Sweden, Czechia, Hungary, Denmark, Romania — so every
calculator switches currency).

**Rails & products:** SEPA Instant (euro-area PSPs must receive instant transfers since Jan 2025,
send + verification-of-payee since Oct 2025) and **Wero** (EPI wallet, live in BE/FR/DE); national
Savings & Investment Accounts.

**Scams:** money-mule recruitment (Europol: >90% of mule transactions are linked to cybercrime),
fake-seller marketplace fraud, IBAN-mismatch. Frame around "don't be a mule".

**Regulator limit:** MAR treats frequent public investment recommendations as regulated; no
product inducement. The EU/OECD-INFE **Financial Competence Framework for Children and Youth**
(2023, 238 competences, 16–18 band covers payslips, phishing, crypto, "BNPL is credit") is the
curriculum spine to map lessons to.

**Learning habits:** 24 official languages (multilingual UI matters); apprenticeship-heavy.

**Formats:** (1) apprentice payslip decoder with country presets; (2) SEPA/Wero verification-of-payee
drill; (3) "don't be a mule" job-ad classifier; (4) crypto/gamified-app risk meter mapped to the
framework; (5) market-stall / Erasmus-budget simulator in €. Businesses: school kiosk, festival
stand, small cross-border online shop.

## United States (live)

**The gap:** the biggest financial decisions arrive early — student loans at 17, credit, a first
untaxed side-hustle. Gen Z scores lowest on the P-Fin index (38%); 30 states now require a
personal-finance course (NGPF, Sep 2026), so many readers have *some* schooling to build on.

**Money situations:** student loans (major 2026 changes under OBBBA — Grad PLUS closed, new caps
and Repayment Assistance Plan, from 1 Jul 2026); the credit score nobody teaches; BNPL stacked
across apps (FICO now scores it); self-employment/gig tax arriving late (15.3% SE tax over $400).

**Rails:** Venmo/Zelle/Cash App (and the scams that ride them — FTC: payment-app scam median loss
$380); Roth IRA as a "first-job superpower".

**Scams:** FTC logged $15.9bn lost in 2025; young adults hit hardest by job scams (5×) and
investment scams (4×) vs older adults; social-media-originated losses $2.1bn. Link
reportfraud.ftc.gov, investor.gov, BrokerCheck, IRS gig-economy center.

**Regulator limit:** FINRA/SEC on finfluencers — disclose any compensation, no specific-security
"buy" calls, clear "not advice" framing.

**Learning habits:** project/simulation-based; NGPF Arcade is the reference for interactives.

**Formats:** (1) first-paycheck decoder (W-4, FICA, 401k match); (2) BNPL basket simulator; (3)
student-loan monthly-payment translator; (4) credit-score sandbox; (5) side-hustle tax set-aside.
Businesses: lemonade stand → food truck, sneaker resale, lawn-care LLC, Etsy print shop.

---

## Roadmap editions (research done, not built)

Each links youth account ownership (World Bank Global Findex 2025) to a teaching hook. Informal
savings groups are the universal bridge from what a reader already knows to formal finance.

- **Brazil** — 84% youth account ownership; Pix is universal; *rotativo* credit-card rates are
  extraordinary (428%/yr, Mar 2026), so the anchor lesson is a Pix-in-full vs rotativo simulator,
  plus a *brigadeiro/açaí seller → MEI formalisation* path (a Brazil RCT found financial education
  raised MEI ownership). Consórcio as a savings hook. Portuguese, LTR.
- **Nigeria** — 44% youth account ownership; **basic phones are the majority (40%)**, so pages
  must be ≤50KB, text-light, Pidgin-first with audio and printables. Hooks: *ajo/esusu* ledger,
  POS-agent economics, an inflation "price of a plate of rice" mini-sim (inflation ~15% Aug 2026).
  PalmPay/Moniepoint. Suya stand, POS kiosk, okada.
- **Kenya** — 90% youth account ownership, M-Pesa near-universal; the teachable data is fraud
  (52% of youth have sent money to a wrong number, 38% got a scam SMS — Findex 2025). Hooks:
  wrong-number/reversal drill, Fuliza/M-Shwari cost calculator, *chama* constitution builder.
  Mama mboga, boda boda, M-Pesa agent. English + Swahili.
- **Gulf/MENA (UAE, Saudi, Egypt)** — Arabic **RTL** (mirrored layouts). A distinct **Islamic
  finance** track: riba/gharar prohibitions, murabaha vs interest, ijara, takaful vs insurance, a
  zakat calculator (2.5%), sukuk. Egypt's inflation story (peaked ~38% in 2023) drives an
  "inflation diary". Karak stall, koshary cart, Riyadh food truck.
- **Southeast Asia (Indonesia, Philippines)** — QRIS/GCash/Maya; **remittances** are the Philippine
  story (~$36bn in 2025, 7% of GDP) → an OFW-family budget game; Indonesia gets a *sharia savings*
  track and a *pinjol*/online-gambling red-flag quiz; *arisan/paluwagan* ledgers. Sari-sari store,
  warung, ojol driver. Bahasa Indonesia; Filipino/Taglish.

## Cross-cutting design implications

- **Informal savings groups** (chit fund, ajo, chama, arisan, paluwagan, gam'eya, consórcio) are
  the best on-ramp everywhere: start from the group the reader knows, then build to formal tools.
- **Just-in-time framing** localises naturally: "you just got your first payslip / UPI request /
  student loan offer" is the same lesson shape with a local trigger.
- **Bandwidth and device** set hard limits in Nigeria and rural India: assume a cheap Android or a
  basic phone, offer audio and printables, keep pages tiny.
- **Language**: Hindi, Portuguese, Arabic (RTL), Swahili, Bahasa and Filipino are the localisation
  queue; the i18n architecture (`docs/PROJECT_BRIEF.md`) must support RTL and non-Latin scripts
  from the start (logical CSS properties, Devanagari/Arabic fonts).
