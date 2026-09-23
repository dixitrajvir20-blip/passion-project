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

## Lesson template v2 (21 September 2026): teaching first, then doing

A tester said the lessons "had too much text" and "didn't actually teach"; six reader passes
over all 36 agreed (ease 2.5 of 5). Template v2 fixes the shape, and `tests/unit/lessons.test.ts`
holds every `template: v2` lesson to it. The pilot was `in/money-basics/first-payslip` (21
September); the other 35 followed on 22 September, each by a writer and an independent editor
agent (their notes: `docs/research/lesson-v2-editor-notes.md`; the video picks:
`docs/research/lesson-videos.md`). Every lesson now carries `template: v2`.

1. **The moment.** `situation` (one or two sentences) and, where a real document exists, the
   `document`: the payslip, pay stub, loan sheet or payout drawn in tokens, each line with a hint,
   and one `find` question a reader can answer from the picture alone. Never a screenshot, never a
   real employer, bank, app or regulator name.
2. **Watch.** One `video` that teaches the idea: an 11-character YouTube id, the title exactly as
   published, the channel, the length in minutes, an optional `startSeconds`, and a one-line
   `note` for context ("Made for the US; the idea is the same"). It plays in a click-to-load player
   from youtube-nocookie.com behind the "Videos from other sites" consent; nothing loads before the
   reader taps play and has said yes. Choosing one: regulator or government first (RBI, SEBI, NPCI,
   EPFO, the Income Tax Department, CFPB, FTC, IRS, ECB, national central banks), then nonprofit or
   university (Khan Academy, NGPF), then education platforms and public broadcasters (CrashCourse,
   Zerodha Varsity), then a creator only if nothing better exists and its description carries no
   affiliate links, discount codes, paid courses or product referrals. Two to ten minutes; it must
   teach this lesson's own idea; no promised returns, no named security, no fear framing. Verify
   the id, title and length before shipping. A lesson with no acceptable video runs on step 3 alone.
3. **Show me.** `worked` becomes the teaching (the short body, "why it works", sits just before it): one ledger line at a time behind "Next line", each
   line with a caption of twenty words or fewer saying what it is and who gets it, ending on the
   answer. Kinds: margin, split, loan, growth, deduction (a chain of subtractions from a starting
   figure: CTC to in-hand, price to payout, award to loan). The deduction kind carries a `caption`
   on each line; the other four take `captions: [...]`, one per line in order (margin has two
   lines, what you keep and the count; loan and growth three; split one per share). Every line is
   captioned: the tests count them. `keyIdea` is the one-sentence rule the
   calculation just showed, set as a highlighted line after it. `prediction` is optional and v2
   does not render it; the document's "find this line" question is the opening question instead.
4. **Your turn.** `practice`: the same calculation with new numbers, the last line blank, and three
   `hints` in Khan Academy's order (the method, the sum, the answer), free to open. `practiceMore`
   is "one more" with different numbers where the skill needs a second run.
5. **Change one thing.** `explorable`: always this lesson's own calculation, with labelled
   controls and a result sentence.
6. **What this means for you.** `takeaways`: three actions.
7. **Details, if you want them.** `details`: law, dates, thresholds, statistics, per-country rules,
   folded away. No check may turn on a figure that only the details fold explains.
8. **Check your understanding.** Three `quiz` checks, one per `objectives` line ("After this you can…").

The caps the tests enforce: 400 words of prose outside the fold (body, situation, contexts, key
idea, prompts, captions, objectives, takeaways); 1,250 reader-facing words in all outside the details;
hints and the key idea of 25 words or fewer;
a body of at most two sections and 200 words; captions of twenty words or fewer; every acronym a
reader meets is one of the lesson's glossary terms. The v1 fields (`prediction`, "Key points")
stay in the schema until the last lesson migrates, then go.

## Tools, moreTools and drill banks

The registry of tools is `src/lib/tools.ts` (title, the question each answers, its group and
minutes); a lesson names tools by slug, and the tests fail a slug its edition does not have.

- **`tool`** is the calculator a reader uses with their own numbers after the lesson.
- **`moreTools`** lists at most two more. Both appear as named links in the lesson's explorable
  section: "Try your own numbers: {the short question}" for a calculator, "Practise on more
  situations in “{title}”" for a drill. The tool the explorer already opens is not repeated, and a
  calculator still marked `ready: false` in the registry is not linked until it is built.
- **Explorer hand-offs are fixed by kind**, not chosen per lesson: margin opens break-even, split
  opens the budget planner, loan opens loans, growth opens savings.
- **`ordinary: true`** marks a drill screen in a lesson that is exactly what it seems. It is never
  shown to the reader; it lets the tests count the mix.

**Drill banks.** A drill tool's own situations live in `src/content/drills/<edition>/<tool>.json`
(schema `drillBankSchema` in `src/content/schema.ts`). The tool page shows the screens of the
bank's `fromLesson` first, then the bank's own.

- `fromLesson` is a drill lesson of the same edition that links to this tool.
- A situation's `id` is permanent once shipped: it is the reader's review key
  (`<edition>/tools/<tool>#<id>`), so renaming it orphans their review. Lower case, never starting
  with `q` or `d` plus a digit, no `#` or `/`.
- Five to eight situations in all (the lesson's plus the bank's), with between 2 and n − 2 of them
  ordinary, so refusing everything is not the skill. The intro's counts must match the set
  ("Six messages. Two are ordinary …"); rewrite the intro whenever the set grows.
- Every address on a screen ends in `.example`. No real bank, app, platform, employer or regulator
  appears on a screen. Search every invented name for a real business before shipping, list the
  names in `inventedNames` and the day in `namesCheckedOn`; the denylist test catches only the
  obvious, so the content-reviewer still reads every screen.
- Reveals explain the pattern and never blame the reader.
- Every acronym on a screen, question or reveal is one of the bank's `glossary` terms.
- `sources` each carry an `id`, and a situation's `sourceIds` name the ones behind it.
  `reportTo` defaults to the lesson's; `scopeNote` says what the set covers (e.g. the euro area).

**Tool rules.** Every rate, threshold or method a calculator uses is a `Rule` in that tool's own
module (`src/lib/tools/<slug>.ts`), keyed on the page's edition, never on the currency picker,
with a label, an https source and `asOf`, the day the source was last opened (`reviewBy` when the
figure is known to change). The page prints them in its RulesLine. `npm run rules` warns at
eleven months and fails at twelve.

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
