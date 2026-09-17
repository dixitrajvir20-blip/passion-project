import { test, expect } from '@playwright/test';
import { waitForIslands } from './helpers';

const LESSON = 'in/learn/how-business-works/chai-stall';
const LESSON_ID = 'in/how-business-works/chai-stall';

test.describe('a lesson with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('can still be read, guessed at, practised and checked', async ({ page }) => {
    await page.goto(LESSON);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('chai stall');

    // The opening guess: pick, then reveal. Nothing about this needs a script.
    const guess = page.locator('.poll').first();
    await guess.getByLabel('About 130 cups').check();
    await guess.locator('summary').click();
    await expect(guess.locator('.answer')).toContainText('About 290 cups');
    await expect(guess.locator('.fb').first()).toBeVisible(); // feedback for the option picked

    // Worked example is server-computed; every quick check reveals its answer and its why.
    await expect(page.locator('.worked .steps').first()).toContainText('286');
    const checks = page.locator('.poll[data-check-id]');
    await expect(checks).toHaveCount(3);
    for (const check of await checks.all()) {
      await check.locator('summary').click();
      await expect(check.locator('.answer')).toBeVisible();
    }

    // Terms still resolve: a link to the definition at the foot of the page.
    await expect(page.locator('a.term').first()).toHaveAttribute('href', '#term-margin');
    await expect(page.locator('#term-margin')).toContainText('gap between');

    // The explorable is server-rendered with its first price worked out.
    await expect(page.locator('.explorer')).toContainText('1,000 cups');
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

  // Right, wrong, and one left unpicked.
  await checks.nth(0).getByLabel('It doubles').check();
  await checks.nth(0).locator('summary').click();
  await expect(checks.nth(0).locator('.poll-status')).toHaveText('Correct.');

  await checks.nth(1).getByLabel('What is his price?').check();
  await checks.nth(1).locator('summary').click();
  await expect(checks.nth(1).locator('.poll-status')).toHaveText('Not quite.');
  await expect(page.locator('[data-return-line]')).toBeHidden(); // not finished yet

  await checks.nth(2).locator('summary').click();
  await expect(checks.nth(2).locator('.poll-status')).toContainText('No pick');

  const line = page.locator('[data-return-line]');
  await expect(line).toBeVisible();
  await expect(line).toContainText('1 of 3');
  await expect(line).toContainText('come back from');
  await expect(line).not.toContainText(/due|overdue/i);

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lp:progress')!));
  expect(stored.quiz[LESSON_ID]).toMatchObject({ correct: 1, total: 3 });
  expect(Object.keys(stored.review).sort()).toEqual([`${LESSON_ID}#q1`, `${LESSON_ID}#q2`, `${LESSON_ID}#q3`]);
  expect(stored.review[`${LESSON_ID}#q1`].box).toBe(1);
  // A quiz result is not a bookmark: reading and checking are separate marks.
  expect(stored.done).toEqual([]);
});

test('a term opens in place, closes with Escape, and hands focus back', async ({ page }) => {
  await page.goto(LESSON);
  const term = page.locator('button.term').first();
  await expect(term).toHaveText('margin');
  await term.click();
  const pop = page.locator('#pop-margin');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('gap between');
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
  await explorer.getByRole('button', { name: '₹15' }).click();
  await expect(explorer).toContainText('286 cups');
  await expect(explorer.getByRole('button', { name: '₹15' })).toHaveAttribute('aria-pressed', 'true');

  await explorer.getByRole('button', { name: '₹8', exact: true }).click();
  await expect(explorer).toContainText('Never');
  await expect(explorer).toContainText('Selling more only loses more');

  await explorer.getByRole('button', { name: '₹12' }).click();
  await explorer.getByRole('link', { name: /full calculator/ }).click();
  await expect(page).toHaveURL(/in\/tools\/break-even\/?\?.*price=12/);
  await waitForIslands(page);
  await expect(page.getByLabel('Price you charge')).toHaveValue('12');
});

test('practice offers the slips people make, and the worked steps come from the calculator', async ({ page }) => {
  await page.goto(LESSON);
  const practice = page.locator('.practice');
  await expect(practice.locator('.steps')).toContainText('₹18'); // 60 − 42, given
  await practice.getByLabel('75', { exact: true }).check(); // 4500 ÷ 60: divided by the price
  await practice.locator('summary').click();
  await expect(practice.locator('.answer')).toContainText('250');
  await expect(practice.locator('.fb:visible')).toContainText('divides by the full price');
});

test('marking a lesson read shows on the track page, separately from its checks', async ({ page }) => {
  await page.goto(LESSON);
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await expect(page.locator('[data-marked]')).toHaveText('Marked as read.');

  await page.goto('in/learn/how-business-works');
  const row = page.locator(`[data-lesson-row="${LESSON_ID}"]`);
  await expect(row.locator('[data-mark="read"]')).toBeVisible();
  await expect(row.locator('[data-mark="checks"]')).toBeHidden();
});

test('a check that is ready comes back on the review page, and nothing is called overdue', async ({ page }) => {
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
  await expect(page.locator('main')).not.toContainText(/overdue|\bdue\b/i);

  await line.getByRole('link').click();
  await waitForIslands(page);
  await expect(page.locator('.poll')).toHaveCount(1);
  await expect(page.locator('.poll legend')).toContainText('juice seller');
  await page.getByLabel('It doubles').check();
  await page.getByRole('button', { name: 'Show the answer' }).click();
  await expect(page.locator('.poll-status')).toHaveText('Correct.');
  await expect(page.locator('.return-line')).toContainText('1 of 1');

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
    for (const path of ['in/learn/money-basics/upi-scam', 'in/tools/spot-the-fake']) {
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
  expect(ids).toEqual(['in/money-basics/upi-scam#d1']);
});

test('the scam lesson ends with the official reporting route, as a tappable number', async ({ page }) => {
  await page.goto('in/learn/money-basics/upi-scam');
  const report = page.locator('.report');
  await expect(report.getByRole('link', { name: '1930' })).toHaveAttribute('href', 'tel:1930');
  await expect(report.getByRole('link', { name: 'cybercrime.gov.in' })).toHaveAttribute('href', /^https:\/\/cybercrime\.gov\.in/);
});

test('the first-earnings lesson has a working split explorer and hands off to the budget planner', async ({ page }) => {
  await page.goto('in/learn/money-basics/first-earnings');
  const explorer = page.locator('.explorer');
  await explorer.scrollIntoViewIfNeeded();
  await waitForIslands(page);
  await explorer.getByRole('button', { name: '₹8,000' }).click();
  await expect(explorer).toContainText('₹3,200'); // Needs at 40% of 8,000
  await explorer.getByRole('button', { name: 'More for Savings' }).click();
  await expect(explorer).toContainText(/more than came in/);
  await expect(explorer).not.toContainText(/too much|should/i);
});
