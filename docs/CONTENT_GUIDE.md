# CONTENT_GUIDE.md: articles, voice, and limits

Version 1.1 · 17 September 2026. Read `LEARNING_DESIGN.md` for how a lesson teaches (the hook → concept → worked example → explorable → check template) and `REGIONAL_TEACHING.md` for what's local to each edition. This file is the schema, the voice, and the hard limits.

## Article frontmatter (the live Zod schema is `src/content/schema.ts`; this shows the spirit of the fields)
```yaml
---
title: "Break-even: how many students a coaching centre needs"   # 6-10 words, sentence case
summary: "Fixed costs, contribution per student, and the count that covers them."  # ≤ 120 chars
track: start-something                         # money-basics | start-something | how-business-works | protect-your-money | credit-and-fraud
order: 1
lang: en                                       # en | hi | ...
translationOf: null                            # slug of the source article if translated
readingMinutes: 5
level: beginner                                # beginner | intermediate
regions: [IN, US, GLOBAL]                      # examples used
author: { name: "Rajvir", country: "US" }      # first name + country only
reviewedBy: "Business Lab editor"              # role, not a minor's full name
lastReviewed: 2026-09-17
glossary: [fixed-cost, contribution, break-even]
tool: break-even                               # tool linked in "Try it"
sources:
  - { title: "…", url: "https://…", publisher: "…" }
quiz:
  - q: "A student pays ₹1,500 a month and uses ₹300 of printed material. What does each student contribute towards fixed costs?"
    options: ["₹1,200", "₹1,500", "₹1,800", "₹300"]
    answer: 0
    why: "Contribution per unit = price − variable cost = 1,500 − 300."
---
```

## Voice
- Second person ("you"), short sentences, active voice, grade ~8 reading level.
- Start with a real situation a 15-21 year-old faces. Then the idea. Then an example from 2+ countries. Then "try it."
- Use numbers. Show the math once, simply.
- No hype, no fear, no "get rich" framing. No slang that will date fast.
- Always define jargon with a Term.

## Structure (every article)
1. "In 30 seconds" (3 bullets)
2. 3-5 short sections (H2)
3. One inline interaction
4. "Try it" tool link with pre-filled values
5. Quiz (3-5 questions)
6. Sources (2+), and the disclaimer line

## Finance content limits (must follow)
- Education only. Never say what to buy, sell, or hold. No named "best" funds, stocks, or coins.
- No performance promises ("you'll make 12%"). Illustrative rates must be labeled as examples.
- Indian market examples: no named security with a price or target; any market data at least 30 days old (SEBI, Jan 2025, updated May 2026) or fictional. Use historical/lagged data everywhere as good practice. See `LEGAL_AND_PRIVACY.md`.
- Point to official sources for tax and legal questions (for example, the tax authority of that country).
- Scam articles: describe patterns, never link to scam sites. End each with the official reporting route for that edition (India: 1930 / cybercrime.gov.in; US: reportfraud.ftc.gov; EU: the national authority).
- Write per edition: use the currency, rails, institutions and example businesses from `REGIONAL_TEACHING.md` for the edition the lesson belongs to, not a generic average.

## Copyright and reuse (must follow)
Business Lab's lessons are licensed **CC BY-NC-SA 4.0** and the code is **MIT** (PROJECT_BRIEF §12). Every lesson page
carries the notice, a `rel="license"` link and the licence in its structured data; that is automatic. What writers control:

- **Write it yourself.** Read the source, close it, then write. Never paste from a source and edit it into shape: a
  reworded paragraph is still a copy. Facts, numbers and ideas are free to use; the wording is not.
- **Quote rarely and briefly.** At most one short quote per lesson, 25 words or fewer, in quotation marks, with the source
  named in the same sentence. `tests/unit/lessons.test.ts` fails a blockquote longer than that.
- **Link, don't copy.** Government and regulator documents are copyrighted too (in India, by the Government under the
  Copyright Act). Summarise in your own words and link to the original; never reproduce a table, chart or page from one.
- **Images and diagrams.** Draw your own (inline SVG with tokens). No screenshots of apps, websites or documents, no stock
  photos, no logos or brand marks of any bank, app, regulator or company. A photo is allowed only if you took it, or it is
  CC0 / CC BY with the credit written in the caption, and nobody in it can be identified without their consent.
- **Your contribution.** You keep the copyright in what you write and license it to readers under CC BY-NC-SA 4.0 by
  submitting it. You are credited by first name and country. Writers under 18 need a parent's or teacher's OK first.
- **Do not use AI-generated text or images that imitate a named source, author or brand.**
- **Not covered by the licence:** the Business Lab name and logo, and anything belonging to a third party that we link to.

## The curriculum (36 lessons, 12 per edition)

Rewritten on 20 September 2026 from research into what 15–21-year-olds in each region actually
struggle with (`docs/research/regional-core.md`). Each lesson answers one documented struggle in a
real situation, never a toy business. Tracks differ by edition because the struggles do.

**India** — *Your first salary:* your first payslip, from CTC to in-hand · TDS was cut, tax is nil:
how the refund comes back · Changing jobs: what happens to your EPF · a one-month buffer, and
interest that compounds. *Protect your money:* UPI fraud and the three-day clock · the part-time job
that makes you a money mule · every loan as a yearly rate, apps and cards · options trading and tips
groups, SEBI's own numbers. *Start a service business:* pricing freelance work from cost, time and
tax · break-even for a coaching centre · a month's accounts, profit on paper and cash in hand ·
Udyam registration and a first regulated loan.

**Europe** — *Your first pay and what it has to cover:* reading your first payslip · sizing a
three-month buffer · can you afford to move out, the 40% line · interest on interest, and what
inflation takes back. *Credit, payments and fraud:* buy now, pay later is credit · before you send,
checking the payee · the job offer that is really money laundering · money advice on social media,
who is paying. *Run it like a business:* reading an income statement · break-even with platform and
card fees · pricing for customers in another EU country · declaring platform income under DAC7.

**United States** — *Money basics:* your first paycheck, what each deduction is · the first $400, a
cushion before an overdraft · starting a credit file without paying interest · a student loan as a
monthly payment. *Working for yourself:* pricing a job so it pays after tax · break-even for a
custom apparel business · reading a coffee shop's income statement · setting money aside for
self-employment tax. *Who gets paid, and by whom:* how a freelance platform makes its money · how
pay-in-four makes money · who pays the person giving you investment tips · how a job scam is run.

## Review checklist (before publishing)
- [ ] Facts checked against the listed sources
- [ ] Examples from 2+ countries; currency via the picker where numbers appear
- [ ] Reading level ~grade 8; jargon defined
- [ ] Quiz answers correct and explained
- [ ] No advice, no promises, disclaimer present
- [ ] Alt text on images; charts have a text summary
- [ ] Author and reviewer fields filled
