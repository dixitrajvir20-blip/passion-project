# CONTENT_GUIDE.md: articles, voice, and limits

## Article frontmatter (Zod schema in src/content/config.ts)
```yaml
---
title: "How a chai stall makes money"          # 6-10 words, sentence case
summary: "Unit economics explained with one cup of tea."  # ≤ 120 chars
track: how-business-works                      # money-basics | start-something | how-business-works
order: 1
lang: en                                       # en | hi | ...
translationOf: null                            # slug of the source article if translated
readingMinutes: 5
level: beginner                                # beginner | intermediate
regions: [IN, US, GLOBAL]                      # examples used
author: { name: "Rajvir", country: "US" }      # first name + country only
reviewedBy: "LaunchPad editor"              # role, not a minor's full name
lastReviewed: 2026-09-17
glossary: [unit-economics, gross-margin, fixed-cost]
tool: break-even                               # tool linked in "Try it"
sources:
  - { title: "…", url: "https://…", publisher: "…" }
quiz:
  - q: "If a cup costs ₹8 to make and sells for ₹15, what is the margin per cup?"
    options: ["₹7", "₹15", "₹23", "₹8"]
    answer: 0
    why: "Margin per unit = price − variable cost = 15 − 8."
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
- Indian market examples: prices/data at least 3 months old (SEBI, Jan 2025). Use historical data everywhere.
- Point to official sources for tax and legal questions (for example, the tax authority of that country).
- Scam articles: describe patterns, never link to scam sites.

## Starter article list (24)
**Money Basics:** Your first paycheck or pocket money: where it should go · Needs vs wants and the 50/30/20 idea · Compound growth explained with small monthly amounts · Saving vs investing: what's the difference? · UPI, cards, and "buy now, pay later" · Credit scores: US scores vs CIBIL in India · Scams that target students · Inflation: why the same money buys less

**Start Something:** Test a business idea in a weekend without spending money · Pricing your first product · Break-even: how many do you need to sell? · Selling online: Instagram, WhatsApp Business, Etsy, marketplaces · The one-page business plan · Pitch your idea in 60 seconds · Side hustles for students (and checking your local rules) · Taxes basics for young earners (general + official links)

**How Business Works:** How a chai stall makes money · What an income statement tells you · Supply and demand around you · How startups raise money · How businesses use AI (and where it goes wrong) · How to read a stock pitch (education only) · Careers in business: what people actually do · How a phone gets from factory to your pocket

## Review checklist (before publishing)
- [ ] Facts checked against the listed sources
- [ ] Examples from 2+ countries; currency via the picker where numbers appear
- [ ] Reading level ~grade 8; jargon defined
- [ ] Quiz answers correct and explained
- [ ] No advice, no promises, disclaimer present
- [ ] Alt text on images; charts have a text summary
- [ ] Author and reviewer fields filled
