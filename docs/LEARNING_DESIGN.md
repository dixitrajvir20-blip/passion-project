# Business Lab learning design

Version 1.0 · 17 September 2026. How lessons are built so they actually change what a 15–21-year-old
does with money, grounded in the evidence. Sources named inline. The content-reviewer subagent
checks content against this and `docs/CONTENT_GUIDE.md`.

## The one finding that shapes everything

Financial *education* decays: a 2014 meta-analysis (Fernandes, Lynch & Netemeyer, 90 studies)
found interventions explained ~0.1% of the variance in behaviour and faded within ~20 months. But
later and better work is more hopeful: Kaiser, Lusardi, Menkhoff & Urban (2022, 76 RCTs, >160k
people) found real effects on knowledge (+0.19 SD) and behaviour (+0.09 SD), no decay past six
months, at ~$23/person. The difference is *how*: the things that work are **narrow, timely,
tied to a real decision, and practised**, not lectured. So Business Lab is built as small
decision-shaped units with retrieval and a calculator, not chapters.

## Teaching formats, ranked by evidence

1. **Retrieval practice** (low-stakes "check" questions). The strongest, cheapest tool: practice
   testing is "high utility" (Dunlosky 2013); testing beats re-reading (Adesope 2017 meta,
   d≈0.5–0.9). Every lesson ends with 2–3 checks; a spaced gap of 1–6 days before review helps
   most. → the quiz component, and the Leitner queue below.
2. **Spaced repetition** (Leitner box). Distributed practice d≈0.85 (Donoghue & Hattie 2021). A
   simple Leitner schedule (1 day → few days → weeks) is as good as fancy ones (Latimier 2021).
   → checks auto-add to a local review queue.
3. **Worked → faded examples** for any calculation (APR, compound interest, tax, break-even).
   g≈0.48 for maths (Barbieri 2023). Show the full worked solution, then fade to the reader
   completing the last step. → the "how this is worked out" panel + a faded practice step.
4. **Predict-then-reveal / productive failure.** Making a confident wrong guess then getting the
   answer drives encoding via surprise (Brod 2021); problem-first g≈0.36 for transfer, strongest
   for ages ~11–16 (Sinha & Kapur 2021). → every lesson opens with a "place your bet" prediction.
5. **Explorable explanations** (a calculator embedded in the prose). Bret Victor's reactive
   documents; Nicky Case's "text for abstractions, interactives for processes". No RCT for the
   genre, but it rests on solid multimedia research (Noetel 2022). → the calculators, and inline
   sliders in lessons.
6. **Short simulations with reflection.** Games beat non-games g≈0.33, *much* more with multiple
   sessions and a reflection step (Clark 2016). Caution: a budgeting sim can backfire and increase
   blame-the-poor attitudes (SPENT study, Roussos & Dovidio 2016) — so our sims never moralise
   about "bad choices". → the region simulators (chai stall, payslip decoder, scam spotter).
7. **Elaborative interrogation** ("why?" after a reveal), d≈0.56. A one-line prompt on wrong answers.
8. **Dual coding** (a diagram beside the words), imagery d≈0.56.
9. **Interleaving** for *discriminating* similar ideas (APR vs APY, Roth vs traditional), g≈0.42
   — not for definitions. → mixed review sets, not first-teach.
10. **Teach-back** ("explain it to a friend"), g up to 0.48 with a teaching expectancy; EEF peer
    tutoring +6 months. → an "explain it" card and printable club worksheets.
11. **Just-in-time micro-guides** tied to a real moment (first payslip, first loan) — the core
    Fernandes finding. → lessons framed as "you just got X, here's what to do".
12. **Printable/offline worksheets** for clubs and classrooms (Business Lab is the origin story).

## Do / don't for 15–21-year-olds (NN/g teen & young-adult research)

**Do:** one idea per screen; question before answer; immediate feedback; real numbers (rent,
phone plan, first payslip); show the working; let them save/export a plan; plain peer-toned
language; fast loads on cheap phones.

**Don't:** walls of text; unexplained jargon; competitive public leaderboards (embarrassment
effect); sims that moralise; auto-advancing carousels; tiny text; "kids" wording or childish
visuals; pointless multimedia (it backfires for teens). NN/g: teens underperform adults on
reading, search and patience, and resent being talked down to.

## The lesson template (6–10 minutes on a phone)

Segment length matters: MOOC engagement drops after ~6 minutes per video (Guo 2014), so a lesson
is short and chunked. Modelled on Khan Academy's mastery loop and Brilliant's problem-first style.

1. **Hook (30s)** — one relatable scenario + a prediction poll ("place your bet").
2. **Reveal + concept (90s)** — answer immediately; one diagram + ≤80 words.
3. **Worked example (60–90s)** — the full calculation, visible.
4. **Explorable (2–3 min)** — the same calculation as a slider/calculator; 1–2 guided "try this"
   prompts, then free play.
5. **Faded practice (60s)** — the reader completes the last step of a near-identical problem.
6. **Retrieval check (60s)** — 2–3 questions with feedback; wrong answers get a "why?" prompt.
7. **Summary + transfer (30s)** — three bullets; "where you'll meet this in real life".
8. **Schedule** — checks join the Leitner queue; offer an "explain it to a friend" card and a
   printable worksheet.

## Accessible interactive charts

Every chart ships with: a short text alternative + a longer description visible to everyone; a
data table; never colour alone (add labels/patterns, ≥3:1 for graphics); a colour-blind-safe
palette (Okabe-Ito-style); keyboard and touch parity; visible focus; ≤5 categories. (W3C WAI
complex-images tutorial; Chartability.) The `dataviz` skill's palette validator is used for any
categorical colour set.

## Ethical guardrails for gamification (minors)

Because this is for under-18s and the UK Children's Code (standard 13) bans nudges that exploit
psychological bias:

1. Reward **learning** (mastery, retrieval accuracy), never time-on-app.
2. Streaks optional, weekly not daily, with a free "freeze"; no loss-framed notifications.
3. No public leaderboards for under-18s — private progress or opt-in friend groups only.
4. No variable/random rewards, no purchasable boosts.
5. Natural stopping points ("lesson done, come back Thursday"); no autoplay.
6. Notifications off by default; ≤1/week if opted in.
7. Badges for real-world actions (made a budget, compared two plans), not for logging in.
8. Data minimisation — no engagement profiling, no tracking, nothing in the printables.

## Key evidence gaps (be honest in the content)

No controlled studies of explorables as a format; no peer-reviewed evaluation of the specific
sims we're modelling on (NGPF Arcade); teen-specific optimal-length evidence is thin. We lean on
the format-level evidence above and test with real students.
