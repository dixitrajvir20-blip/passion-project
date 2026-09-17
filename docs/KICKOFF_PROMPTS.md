# Kickoff prompts for Claude Code (copy these in order)

**0. Setup (you):** CLAUDE.md and docs/ are already in your passion project folder. Open Terminal, run `cd ~/Desktop/"passion project"`, then `claude`. Start a new branch first: `git switch -c plan-docs` (then commit the docs when you're happy).

**1. Interview + plan (plan mode on: Shift+Tab until "plan mode")**
> Read CLAUDE.md and everything in docs/. Then interview me with the AskUserQuestion tool about anything unclear or risky (name, domain, hosting, content review, edge cases). Don't ask what the docs already answer. Then look at the existing site files and write PLAN.md for Phase 0 and Phase 1 only: whether to migrate the current HTML pages to Astro (explain the trade-offs for me first), the files to create or change, and how each step will be verified.

**2. Phase 0 build**
> Implement Phase 0 from PLAN.md on a new branch. Move the existing pages over without losing content, add tokens.css from DESIGN.md, the base layout, header/footer, i18n JSON, CI (build + vitest + playwright + axe + lighthouse), and the GitHub Pages deploy (set site and base for /passion-project). Fix the hero using DESIGN.md section 12. Run the build and tests. Take screenshots at 360px and 1280px, compare them with DESIGN.md's checklist, list any differences, and fix them.

**3. Math first**
> Write src/lib/finance.ts with pure functions for budget split, compound growth, break-even, side-hustle profit, and EMI, and src/lib/format.ts using Intl.NumberFormat. Write unit tests first, including edge cases (rate 0, price ≤ variable cost, empty inputs, en-IN grouping 1,00,000). Make them pass.

**4. One tool end to end**
> Build the Break-even tool page using ToolShell and a Preact island (client:visible). Inputs, live results, "What this means," "How it works," reset, copy-link with query params. Add Playwright tests and an axe check. Show me the screenshots and the test output.

**5. Content pipeline**
> Create the content collections and Zod schema from CONTENT_GUIDE.md, the ArticleLayout, Term popover, Quiz island, and RegionNote. Add one sample article with a quiz. Verify the build fails if required frontmatter is missing.

**6. Review pass (fresh context)**
> Use a subagent to review the whole site against DESIGN.md section 9 (AI-look checklist), section 10 (usability), and PROJECT_BRIEF.md sections 9-12 (performance, accessibility, i18n, privacy). Report only real gaps with file references.

Tips: `/clear` between unrelated tasks; if you correct Claude twice on the same thing, `/clear` and restate the request more precisely; always ask for evidence (test output, screenshots).
