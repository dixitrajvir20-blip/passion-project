import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitForIslands } from './helpers';

const LESSON = 'in/learn/start-something/break-even-coaching-centre';
const LESSON_ID = 'in/start-something/break-even-coaching-centre';

test.describe('a lesson with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('can still be read, guessed at, practised and checked', async ({ page }) => {
    await page.goto(LESSON);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('coaching centre');

    // The opening guess: pick, then reveal. Nothing about this needs a script.
    const guess = page.locator('.poll').first();
    await guess.locator('input[type=radio]').first().check(); // the fee-not-contribution slip
    await guess.locator('summary').click();
    await expect(guess.locator('.answer')).toContainText('15'); // 18,000 ÷ the 1,200 each fee leaves
    await expect(guess.locator('.fb').first()).toBeVisible(); // feedback for the option picked

    // Worked example is server-computed; every quick check reveals its answer and its why.
    await expect(page.locator('.worked .steps').first()).toContainText('₹1,200'); // 1,500 − 300
    await expect(page.locator('.worked .steps').first()).toContainText('15');
    const checks = page.locator('.poll[data-check-id]');
    await expect(checks).toHaveCount(4);
    for (const check of await checks.all()) {
      await check.locator('summary').click();
      await expect(check.locator('.answer')).toBeVisible();
    }

    // Terms still resolve: a link to the definition at the foot of the page.
    await expect(page.locator('a.term').first()).toHaveAttribute('href', '#term-variable-cost');
    await expect(page.locator('#term-variable-cost')).toContainText('rises as you sell more');

    // The explorable is server-rendered on the worked example's price, so it matches what was just read.
    await expect(page.locator('.explorer')).toContainText('15 students');
    // A control that would do nothing is not shown.
    await expect(page.locator('[data-mark-read]')).toBeHidden();
  });
});

test('moving through the options with arrow keys does not give the answer away', async ({ page }) => {
  await page.goto(LESSON);
  const guess = page.locator('.poll').first();
  await guess.locator('input[type=radio]').first().focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  // A radio is checked by now, and the answer is still closed.
  await expect(guess.locator('input:checked')).toHaveCount(1);
  await expect(guess.locator('.answer')).toBeHidden();
  await expect(guess.locator('.fb').first()).toBeHidden();
});

test('the quick check scores each question, schedules it, and says when it returns', async ({ page }) => {
  await page.goto(LESSON);
  const checks = page.locator('.poll[data-check-id]');

  // Right, wrong, and two left unpicked. The right option is read off the markup rather than
  // typed in, so rewording a lesson never turns this into a false failure.
  const rightOf = (n: number) => checks.nth(n).getAttribute('data-answer').then((a) => Number(a));

  await checks.nth(0).locator('input[type=radio]').nth(await rightOf(0)).check();
  await checks.nth(0).locator('summary').click();
  await expect(checks.nth(0).locator('.poll-status')).toHaveText('Correct.');

  const wrong = ((await rightOf(1)) + 1) % 3;
  await checks.nth(1).locator('input[type=radio]').nth(wrong).check();
  await checks.nth(1).locator('summary').click();
  await expect(checks.nth(1).locator('.poll-status')).toHaveText('Not quite.');
  await expect(page.locator('[data-return-line]')).toBeHidden(); // not finished yet

  await checks.nth(2).locator('summary').click();
  await expect(checks.nth(2).locator('.poll-status')).toContainText('No pick');
  await checks.nth(3).locator('summary').click();
  await expect(checks.nth(3).locator('.poll-status')).toContainText('No pick');

  const line = page.locator('[data-return-line]');
  await expect(line).toBeVisible();
  await expect(line).toContainText('1 of 4');
  await expect(line).toContainText('come back from');
  await expect(line).not.toContainText(/due|overdue/i);

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lp:progress')!));
  expect(stored.quiz[LESSON_ID]).toMatchObject({ correct: 1, total: 4 });
  expect(Object.keys(stored.review).sort()).toEqual([`${LESSON_ID}#q1`, `${LESSON_ID}#q2`, `${LESSON_ID}#q3`, `${LESSON_ID}#q4`]);
  expect(stored.review[`${LESSON_ID}#q1`].box).toBe(1);
  // A quiz result is not a bookmark: reading and checking are separate marks.
  expect(stored.done).toEqual([]);
});

test('a term opens in place, closes with Escape, and hands focus back', async ({ page }) => {
  await page.goto(LESSON);
  const term = page.locator('button.term').first();
  await expect(term).toHaveText('variable cost');
  await term.click();
  const pop = page.locator('#pop-variable-cost');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('rises as you sell more');
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await expect(term).toBeFocused();
});

test('the explorable answers in a sentence and hands off to the full calculator', async ({ page }) => {
  await page.goto(LESSON);
  const explorer = page.locator('.explorer');
  // The explorable hydrates when the reader gets near it (client:visible), not at page load.
  await explorer.scrollIntoViewIfNeeded();
  await waitForIslands(page);
  await explorer.getByRole('button', { name: '₹1,500' }).click();
  await expect(explorer).toContainText('15 students'); // 18,000 ÷ (1,500 − 300)
  await expect(explorer.getByRole('button', { name: '₹1,500' })).toHaveAttribute('aria-pressed', 'true');

  await explorer.getByRole('button', { name: '₹1,200' }).click();
  await expect(explorer).toContainText('20 students'); // a fifth off the fee needs five more students

  await explorer.getByRole('link', { name: /full calculator/ }).click();
  await expect(page).toHaveURL(/in\/tools\/break-even\/?\?.*price=1200/);
  await waitForIslands(page);
  await expect(page.getByLabel('Price you charge')).toHaveValue('1200');
});

test('a price that only covers the cost of the sale says so instead of printing a count', async ({ page }) => {
  await page.goto('eu/learn/start-something/break-even-fees');
  const explorer = page.locator('.explorer');
  await explorer.scrollIntoViewIfNeeded();
  await waitForIslands(page);

  await explorer.getByRole('button', { name: '€27', exact: true }).click(); // the same as the cost of one
  await expect(explorer).toContainText('Never');
  await expect(explorer).toContainText('Selling more only loses more');
});

test('practice offers the slips people make, and the worked steps come from the calculator', async ({ page }) => {
  await page.goto(LESSON);
  const practice = page.locator('.practice');
  await expect(practice.locator('.steps')).toContainText('₹800'); // 1,200 − 400, given
  await practice.getByLabel('12', { exact: true }).check(); // 14,000 ÷ 1,200: divided by the price
  await practice.locator('summary').click();
  await expect(practice.locator('.answer')).toContainText('18'); // 14,000 ÷ 800, rounded up
  await expect(practice.locator('.fb:visible')).toContainText('divides by the full price');
});

test('marking a lesson read shows on the track page, separately from its checks', async ({ page }) => {
  await page.goto(LESSON);
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await expect(page.locator('[data-marked]')).toHaveText('Marked as read.');

  await page.goto('in/learn/start-something');
  const row = page.locator(`[data-lesson-row="${LESSON_ID}"]`);
  await expect(row.locator('[data-mark="read"]')).toBeVisible();
  await expect(row.locator('[data-mark="checks"]')).toBeHidden();
});

test('a check that is ready comes back on the review page, and nothing is called overdue', async ({ page }) => {
  // Which option is right is read off the lesson, so rewording the question cannot fail this.
  await page.goto(LESSON);
  const right = Number(await page.locator('.poll[data-check-id]').first().getAttribute('data-answer'));

  await page.goto('in/learn');
  await page.evaluate((id) => {
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    window.localStorage.setItem(
      'lp:progress',
      JSON.stringify({
        v: 1, done: [], quiz: {}, updatedAt: past,
        review: { [`${id}#q1`]: { box: 1, due: past }, [`${id}#q3`]: { box: 2, due: future } },
      }),
    );
  }, LESSON_ID);

  await page.reload();
  const line = page.locator('[data-review-line]');
  await expect(line).toContainText('Ready to review: 1 check');
  // No loss framing anywhere the site schedules work. Scoped to the scheduling line and the
  // review page itself, because a lesson may legitimately use "minimum due" about a card.
  await expect(line).not.toContainText(/overdue|\bdue\b/i);

  await line.getByRole('link').click();
  await waitForIslands(page);
  await expect(page.locator('.poll')).toHaveCount(1);
  await expect(page.locator('.poll legend')).toContainText('two streets away');
  await page.locator('.poll input[type=radio]').nth(right).check();
  await page.getByRole('button', { name: 'Show the answer' }).click();
  await expect(page.locator('.poll-status')).toHaveText('Correct.');
  await expect(page.locator('.return-line')).toContainText('1 of 1');
  await expect(page.locator('.return-line')).not.toContainText(/overdue|\bdue\b/i);

  const box = await page.evaluate((id) => JSON.parse(window.localStorage.getItem('lp:progress')!).review[`${id}#q1`].box, LESSON_ID);
  expect(box).toBe(2);
});

test('the review page says so plainly when there is nothing to do', async ({ page }) => {
  await page.goto('in/review');
  await waitForIslands(page);
  await expect(page.locator('main')).toContainText('Nothing to review right now');
});

test('every link out of a lesson is safe against tab-napping', async ({ page }) => {
  await page.goto(LESSON);
  const external = page.locator('main a[href^="http"]');
  expect(await external.count()).toBeGreaterThan(0);
  for (const link of await external.all()) {
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).not.toHaveAttribute('target', '_blank');
  }
});

test('every lesson says who owns it and how it may be reused, for people and for machines', async ({ page }) => {
  await page.goto(LESSON);
  const notice = page.locator('.lesson-fine');
  await expect(notice).toContainText('©');
  await expect(notice).toContainText('non-commercial');
  await expect(notice).toContainText('To credit it');
  await expect(notice).toContainText('name and logo are not covered');

  const deed = notice.getByRole('link', { name: /Creative Commons/ });
  await expect(deed).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-nc-sa/4.0/');
  await expect(deed).toHaveAttribute('rel', /license/);

  await expect(page.locator('head link[rel="license"]')).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-nc-sa/4.0/');
  const data = await page.locator('head script[type="application/ld+json"]').allTextContents();
  const lesson = data.map((text) => JSON.parse(text)).find((d) => d['@type'] === 'LearningResource');
  expect(lesson.license).toBe('https://creativecommons.org/licenses/by-nc-sa/4.0/');
  expect(lesson.copyrightHolder.name).toBe('Rajvir Dixit');
  expect(lesson.isAccessibleForFree).toBe(true);
});

test.describe('the scam drill with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('every situation can be decided and revealed, in the lesson and in the tool', async ({ page }) => {
    for (const path of ['in/learn/protect-your-money/upi-fraud-and-the-clock', 'in/tools/spot-the-fake']) {
      await page.goto(path);
      const situations = page.locator('.drill-list > li');
      expect(await situations.count()).toBeGreaterThanOrEqual(5);
      const first = situations.first();
      await expect(first.locator('.mock-screen')).toContainText('A made-up screen for practice');
      await first.locator('input[type=radio]').first().check();
      await first.locator('summary').click();
      await expect(first.locator('.answer')).toBeVisible();
    }
  });
});

test('mock screens never carry a real brand, bank or agency name', async ({ page }) => {
  await page.goto('in/tools/spot-the-fake');
  const screens = (await page.locator('.mock-screen .ms-from, .mock-screen .ms-action').allTextContents()).join(' | ');
  // A made-up screen that names a real institution is impersonation, and teaches the wrong tell.
  expect(screens).not.toMatch(/\b(RBI|Reserve Bank|NPCI|SEBI|CBI|SBI|HDFC|ICICI|Axis|Paytm|PhonePe|Google Pay|GPay|BHIM|Amazon|Flipkart|WhatsApp)\b/i);
});

test('a situation practised in the tool is scheduled under the lesson it came from', async ({ page }) => {
  await page.goto('in/tools/spot-the-fake');
  const first = page.locator('.drill-list > li').first();
  await first.locator('input[type=radio]').first().check();
  await first.locator('summary').click();
  await expect(first.locator('.poll-status')).toHaveText(/Correct\.|Not quite\./);
  const ids = await page.evaluate(() => Object.keys(JSON.parse(window.localStorage.getItem('lp:progress')!).review));
  expect(ids).toEqual(['in/protect-your-money/upi-fraud-and-the-clock#d1']);
});

test('the scam lesson ends with the official reporting route, as a tappable number', async ({ page }) => {
  await page.goto('in/learn/protect-your-money/upi-fraud-and-the-clock');
  const report = page.locator('.report');
  await expect(report.getByRole('link', { name: '1930' })).toHaveAttribute('href', 'tel:1930');
  await expect(report.getByRole('link', { name: 'cybercrime.gov.in' })).toHaveAttribute('href', /^https:\/\/cybercrime\.gov\.in/);
});

test('the payslip lesson has a working split explorer that reports without judging', async ({ page }) => {
  await page.goto('in/learn/money-basics/first-payslip');
  const explorer = page.locator('.explorer');
  await explorer.scrollIntoViewIfNeeded();
  await waitForIslands(page);
  await explorer.getByRole('button', { name: '₹35,000' }).click();
  await expect(explorer).toContainText('₹10,500'); // rent and bills at 30% of 35,000

  // The five lines come to 75%, so six nudges of 5% push the plan past what came in.
  for (let i = 0; i < 6; i++) await explorer.getByRole('button', { name: 'More for Savings' }).click();
  await expect(explorer).toContainText(/more than came in/);
  await expect(explorer).not.toContainText(/too much|should/i);
});

test('the split explorer rows and the leftover always add back to what came in', async ({ page }) => {
  await page.goto('in/learn/money-basics/first-payslip');
  const explorer = page.locator('.explorer');
  await explorer.scrollIntoViewIfNeeded();
  await waitForIslands(page);

  // Rounding each row and then deriving the leftover from the unrounded percentages would let
  // these disagree by a rupee, which is exactly the kind of sum this site cannot get wrong.
  const rupees = async (loc: ReturnType<typeof page.locator>) =>
    (await loc.allTextContents()).map((t) => Number(t.replace(/[^0-9]/g, '')));
  for (const income of ['₹35,000', '₹30,600', '₹15,300']) {
    await explorer.getByRole('button', { name: income }).click();
    const rows = await rupees(explorer.locator('.split-amount'));
    const left = Number((await explorer.locator('.explorer-says').textContent())!.replace(/[^0-9]/g, ''));
    const total = Number(income.replace(/[^0-9]/g, ''));
    expect(rows.reduce((sum, n) => sum + n, 0) + left).toBe(total);
  }
});

test('the payslip split opens in the budget planner with the same numbers', async ({ page }) => {
  await page.goto('in/learn/money-basics/first-payslip');
  const explorer = page.locator('.explorer');
  await explorer.scrollIntoViewIfNeeded();
  await waitForIslands(page);
  await explorer.getByRole('button', { name: '₹35,000' }).click();
  await explorer.getByRole('link', { name: /budget planner/ }).click();
  await expect(page).toHaveURL(/in\/tools\/budget\/?\?/);
  await waitForIslands(page);
  await expect(page.getByLabel('What comes in each month')).toHaveValue('35000');
  await expect(page.getByLabel('Name of line 2')).toHaveValue('Food');
  // Rent 10,500 + food 7,000 + travel 2,450 + phone 1,050 are all needs; savings 5,250 is its own.
  await expect(page.locator('.results')).toContainText('₹21,000');
  await expect(page.locator('.results')).toContainText('₹8,750'); // the quarter with no job yet
});

test('the review date on a lesson is the date in its frontmatter, whatever the build machine’s time zone', async ({ page }) => {
  // Read the date off the file, so an editor pass that bumps it cannot fail this for the wrong reason.
  const source = readFileSync(`src/content/lessons/${LESSON_ID}.mdx`, 'utf8');
  const iso = /^lastReviewed:\s*(\d{4}-\d{2}-\d{2})/m.exec(source)![1];
  const [y, m, d] = iso.split('-').map(Number);
  const shown = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  await page.goto(LESSON);
  await expect(page.locator('.lesson-meta')).toContainText(`Reviewed ${shown}`);
});

test('progress keeps calendar days, never the time someone studied', async ({ page }) => {
  await page.goto(LESSON);
  const check = page.locator('.poll[data-check-id]').first();
  await check.locator('input[type=radio]').first().check();
  await check.locator('summary').click();
  // The same handler that saves progress writes this line, so once it shows, the save has happened.
  await expect(check.locator('.poll-status')).toHaveText(/Correct\.|Not quite\./);
  const raw = await page.evaluate(() => window.localStorage.getItem('lp:progress'));
  expect(raw).not.toBeNull();
  expect(raw!).not.toMatch(/T\d\d:\d\d/);
});
