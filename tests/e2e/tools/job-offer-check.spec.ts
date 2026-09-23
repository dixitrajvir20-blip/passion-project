/**
 * Job offers: spot the fake, on the real build. Each edition's page has its six situations (the
 * lesson's three, then the bank's), works with JavaScript off, schedules a bank situation under
 * its own review id, says when the situations come back, keeps every pick out of the address,
 * draws no real brand, can be used with the keyboard alone, and passes axe at 360px and 1280px.
 *
 * A drill has no island, no currency field and no copy-link: nothing a reader picks can reach the
 * query string or the fragment.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = '/passion-project/';
const EDITIONS = ['in', 'eu', 'us'] as const;
type Edition = (typeof EDITIONS)[number];
const path = (edition: Edition) => `${edition}/tools/job-offer-check`;

const SITUATIONS: Record<Edition, { from: string; caption: string }[]> = {
  in: [
    { from: 'Karan (introduced by a friend)', caption: 'Chat' },
    { from: 'Tutoring centre office', caption: 'Text message' },
    { from: 'Arjun (classmate)', caption: 'Chat' },
    { from: 'Office manager, the firm where you interviewed', caption: 'Text message' },
    { from: 'Task group admin', caption: 'Chat' },
    { from: 'Recruiter, unknown number', caption: 'Text message' },
  ],
  eu: [
    { from: 'Dario (friend of a friend)', caption: 'Chat' },
    { from: 'Tutoring platform you teach on (payments)', caption: 'Text message' },
    { from: 'Alex (met online last month)', caption: 'Chat' },
    { from: 'Overseas trading company (a free email address)', caption: 'Email' },
    { from: 'The bakery where you did a trial shift', caption: 'Email' },
    { from: 'Recruiter, met in a group chat', caption: 'Chat' },
  ],
  us: [
    { from: 'Support, a task app you joined', caption: 'Chat' },
    { from: "The grocery store's own careers page", caption: 'Text message' },
    { from: 'Recruiter, parcel forwarding job', caption: 'Chat' },
    { from: 'Hiring team, events company', caption: 'Email' },
    { from: 'Recruiter, text only', caption: 'Chat' },
    { from: 'Campus jobs office', caption: 'Text message' },
  ],
};

const ANSWERS: Record<Edition, number[]> = { in: [1, 1, 1, 0, 2, 1], eu: [1, 0, 1, 0, 2, 1], us: [1, 1, 1, 2, 0, 0] };

const DENY: Record<Edition, string[]> = {
  in: ['RBI', 'SEBI', 'NPCI', 'SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'PhonePe', 'Google Pay', 'BHIM', 'WhatsApp', 'Telegram', 'Naukri', 'LinkedIn', 'Indeed', 'Amazon', 'Flipkart'],
  eu: ['Europol', 'EBF', 'Revolut', 'N26', 'Wise', 'Wero', 'PayPal', 'Klarna', 'bunq', 'ING', 'WhatsApp', 'Telegram', 'LinkedIn', 'Indeed'],
  us: ['FTC', 'IRS', 'USCIS', 'Chase', 'Venmo', 'Zelle', 'Cash App', 'PayPal', 'Indeed', 'LinkedIn', 'Handshake', 'WhatsApp', 'Telegram', 'Brightline', 'TaskPay', 'Parcelroute', 'Tutorful'],
};

const LESSONS: Record<Edition, { path: string; title: string }> = {
  in: { path: 'in/learn/protect-your-money/money-mule', title: 'The part-time job that makes you a money mule' },
  eu: { path: 'eu/learn/credit-and-fraud/money-mule', title: 'The job offer that is really money laundering' },
  us: { path: 'us/learn/how-business-works/job-scam', title: 'How a job scam works, and what a fake check costs' },
};

const REPORT: Record<Edition, string> = {
  in: 'https://cybercrime.gov.in',
  eu: 'https://www.europol.europa.eu/report-a-crime/report-cybercrime-online',
  us: 'https://reportfraud.ftc.gov',
};

/** The consent banner answered before the page loads, so it is set up, not interacted with. */
async function consentAnswered(page: Page) {
  await page.addInitScript(() =>
    window.localStorage.setItem('lp:consent', JSON.stringify({ v: 1, at: new Date().toISOString(), source: 'user', choices: { embeds: false, stats: false } })),
  );
}

const readReview = (page: Page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('lp:progress') ?? '{}').review as Record<string, { box: number; due: string }> | undefined);

test.describe('job-offer-check with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  for (const edition of EDITIONS) {
    test(`${edition}: six situations in order, each decided and revealed, with no return line`, async ({ page }) => {
      await page.goto(path(edition));
      await expect(page.locator('h1')).toHaveText('Job offers: spot the fake');
      const situations = page.locator('.drill-list > li');
      await expect(situations).toHaveCount(6);
      await expect(page.locator('.drill > p').first()).toHaveText(
        'Six messages about work. Some are ordinary jobs, so refusing everything is not the skill. Decide, then look.',
      );
      for (const [index, expected] of SITUATIONS[edition].entries()) {
        const situation = situations.nth(index);
        await expect(situation.locator('.drill-count')).toHaveText(`Situation ${index + 1} of 6`);
        await expect(situation.locator('.ms-from')).toHaveText(expected.from);
        await expect(situation.locator('figcaption')).toHaveText(expected.caption);
        await expect(situation.locator('.poll')).toHaveAttribute('data-answer', String(ANSWERS[edition][index]));
        await situation.locator('input[type=radio]').first().check();
        await situation.locator('summary').click();
        await expect(situation.locator('.answer')).toBeVisible();
      }
      await expect(page.locator('.reflection')).toHaveText('Which message were you least sure of, and which way would the money have moved?');
      await expect(page.locator('[data-drill-return]')).toBeHidden();
      expect(new URL(page.url()).search).toBe('');
      expect(new URL(page.url()).hash).toBe('');
    });

    test(`${edition}: the reporting route, terms, sources and lesson are on the page`, async ({ page }) => {
      await page.goto(path(edition));
      await expect(page.locator(`.report a[href="${REPORT[edition]}"]`)).toHaveCount(1);
      if (edition === 'in') await expect(page.locator('.report a[href="tel:1930"]')).toHaveText('1930');
      await expect(page.locator('.tool-terms h2')).toHaveText('Terms on this page');
      await expect(page.locator('.tool-sources li').first()).toBeVisible();
      const related = page.locator('.related');
      await expect(related.locator('h2')).toHaveText('The lesson behind this');
      await expect(related.locator('a')).toHaveAttribute('href', `${BASE}${LESSONS[edition].path}`);
      await expect(page.locator('.note')).toHaveText('For learning only. Not financial, legal, or tax advice. Every screen and message here is made up.');
      // A drill opens on no example of numbers to change.
      await expect(page.locator('.scenario')).toHaveCount(0);
    });

    test(`${edition}: no currency field, no calculator and no copy-link, so nothing can reach the address`, async ({ page }) => {
      await page.goto(path(edition));
      const main = page.locator('main');
      await expect(main.locator('.tool')).toHaveCount(0);
      await expect(main.locator('select')).toHaveCount(0);
      await expect(main.locator('input:not([type=radio])')).toHaveCount(0);
      await expect(main.getByText(/copy (the )?link/i)).toHaveCount(0);
      await expect(page.locator('astro-island[component-url*="tool-kit"], astro-island[component-url*="Currency"]')).toHaveCount(0);
    });

    test(`${edition}: no real bank, app, employer or public body on any screen, and only .example hosts`, async ({ page }) => {
      await page.goto(path(edition));
      const texts = await page.locator('.mock-screen .ms-body').allInnerTexts();
      expect(texts).toHaveLength(6);
      const found: string[] = [];
      for (const text of texts) {
        for (const name of DENY[edition]) {
          const re = new RegExp(`(?<![A-Za-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`);
          if (re.test(text)) found.push(`"${name}" in ${text}`);
        }
        if (/brightline|taskpay|parcel\s?route|tutorfeld|tutorful/i.test(text)) found.push(`renamed brand in ${text}`);
        for (const token of text.match(/\b[a-z][a-z0-9-]*(\.[a-z0-9-]+)+\b/gi) ?? []) {
          if (!token.endsWith('.example')) found.push(`host ${token}`);
        }
      }
      expect(found).toEqual([]);
    });
  }

  test('the screens print their figures in the edition’s money', async ({ page }) => {
    await page.goto(path('in'));
    await expect(page.locator('.drill-list > li').nth(3).locator('.ms-amount')).toHaveText('₹12,000');
    await expect(page.locator('.drill-list > li').nth(5).locator('.ms-amount')).toHaveText('₹1,499');
    await page.goto(path('eu'));
    await expect(page.locator('.drill-list > li').nth(3).locator('.ms-amount')).toHaveText('€900');
    await expect(page.locator('.drill-list > li').nth(5).locator('.ms-amount')).toHaveText('€300');
    await page.goto(path('us'));
    const fakeCheck = page.locator('.drill-list > li').nth(3);
    await expect(fakeCheck.locator('.ms-amount')).toHaveText('$3,160');
    await expect(fakeCheck.locator('.ms-action')).toHaveText('Send $2,900 to the supplier');
    await expect(page.locator('.drill-list > li').nth(4).locator('.ms-amount')).toHaveCount(0);
  });

  for (const edition of EDITIONS) {
    test(`${edition}: the lesson links on to more situations like its own`, async ({ page }) => {
      await page.goto(LESSONS[edition].path);
      const link = page.locator(`.tool-handoffs a[href="${BASE}${path(edition)}"]`);
      await expect(link).toHaveText('Practise on more situations in “Job offers: spot the fake”');
    });
  }
});

test.describe('job-offer-check with JavaScript on', () => {
  test.beforeEach(async ({ page }) => {
    await consentAnswered(page);
    // 10:00 local on Tuesday 22 September 2026, so "tomorrow" is a known day.
    await page.clock.setFixedTime(new Date('2026-09-22T10:00:00'));
  });

  test('India: situation 5 is scheduled under the tool’s own review id, and the page says when it comes back', async ({ page }) => {
    await page.goto(path('in'));
    const fifth = page.locator('.drill-list > li').nth(4);
    await fifth.locator('input[value="2"]').check();
    await fifth.locator('summary').click();
    await expect(fifth.locator('.poll-status')).toHaveText('Correct.');
    const back = page.locator('[data-drill-return]');
    await expect(back).toBeVisible();
    await expect(back).toHaveText('These situations come back from Wednesday, 23 September. Nothing to do until then.');
    const review = await readReview(page);
    expect(review?.['in/tools/job-offer-check#premium-tasks']).toEqual({ box: 1, due: '2026-09-23' });
    // Only what was revealed is scheduled; the lesson's screens keep their lesson ids.
    expect(Object.keys(review ?? {})).toEqual(['in/tools/job-offer-check#premium-tasks']);
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('a lesson screen practised here is scheduled under the lesson’s id', async ({ page }) => {
    await page.goto(path('eu'));
    const second = page.locator('.drill-list > li').nth(1);
    await second.locator('input[value="0"]').check();
    await second.locator('summary').click();
    await expect(second.locator('.poll-status')).toHaveText('Correct.');
    const review = await readReview(page);
    expect(Object.keys(review ?? {})).toEqual(['eu/credit-and-fraud/money-mule#d2']);
  });

  test('a wrong pick says so, and a reveal with nothing picked comes back tomorrow', async ({ page }) => {
    await page.goto(path('us'));
    const fakeCheck = page.locator('.drill-list > li').nth(3);
    await fakeCheck.locator('input[value="0"]').check();
    await fakeCheck.locator('summary').click();
    await expect(fakeCheck.locator('.poll-status')).toHaveText('Not quite.');
    await expect(fakeCheck.locator('.answer')).toContainText('Send nothing, and tell your bank the check may be fake');
    const campus = page.locator('.drill-list > li').nth(5);
    await campus.locator('summary').click();
    await expect(campus.locator('.poll-status')).toHaveText('No pick this time, so this one comes back tomorrow.');
    const review = await readReview(page);
    expect(review?.['us/tools/job-offer-check#fake-check']).toEqual({ box: 1, due: '2026-09-23' });
    expect(review?.['us/tools/job-offer-check#campus-job']).toEqual({ box: 1, due: '2026-09-23' });
    await expect(page.locator('[data-drill-return]')).toHaveText('These situations come back from Wednesday, September 23. Nothing to do until then.');
  });

  test('only the first reveal of a situation is scored', async ({ page }) => {
    await page.goto(path('in'));
    const fourth = page.locator('.drill-list > li').nth(3);
    await fourth.locator('input[value="2"]').check();
    await fourth.locator('summary').click();
    await expect(fourth.locator('.poll-status')).toHaveText('Not quite.');
    await fourth.locator('summary').click(); // close
    await fourth.locator('input[value="0"]').check();
    await fourth.locator('summary').click(); // open again
    await expect(fourth.locator('.poll-status')).toHaveText('Not quite.');
    const review = await readReview(page);
    expect(review?.['in/tools/job-offer-check#internship-offer']).toEqual({ box: 1, due: '2026-09-23' });
  });

  test('keyboard only: reach situation 5, pick with the arrow keys, reveal with Enter', async ({ page }) => {
    await page.goto(path('in'));
    const fifth = page.locator('.drill-list > li').nth(4);
    const firstRadio = fifth.locator('input[type=radio]').first();
    let reached = false;
    for (let i = 0; i < 250 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await firstRadio.evaluate((el) => el === document.activeElement);
    }
    expect(reached, 'Tab reaches the first option of situation 5').toBe(true);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(fifth.locator('input[value="2"]')).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(fifth.locator('summary')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(fifth.locator('.answer')).toBeVisible();
    await expect(fifth.locator('.poll-status')).toHaveText('Correct.');
    await expect(page.locator('[data-drill-return]')).toBeVisible();
    const review = await readReview(page);
    expect(review?.['in/tools/job-offer-check#premium-tasks']).toEqual({ box: 1, due: '2026-09-23' });
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the edition menu goes to the same drill in another edition', async ({ page }) => {
    await page.goto(path('in'));
    await page.locator('.region-tabs summary').click();
    await page.locator('.region-tabs').getByRole('link', { name: 'Europe' }).click();
    await expect(page).toHaveURL(/\/eu\/tools\/job-offer-check\/?$/);
    await expect(page.locator('.drill-list > li')).toHaveCount(6);
    await expect(page.locator('.drill-list > li').nth(3).locator('figcaption')).toHaveText('Email');
  });
});

test.describe('job-offer-check review checks', () => {
  test('each edition’s checks.json has the bank situations under tool ids, with the screen as context', async ({ page }) => {
    const get = async (edition: Edition) => {
      const response = await page.request.get(`${edition}/checks.json`);
      expect(response.ok()).toBe(true);
      return (await response.json()) as Record<string, { lesson: string; lessonPath: string; context?: string; answer: number }>;
    };
    const ids: Record<Edition, string[]> = {
      in: ['internship-offer', 'premium-tasks', 'joining-kit'],
      eu: ['payment-agent', 'apprenticeship', 'account-for-hire'],
      us: ['fake-check', 'text-interview', 'campus-job'],
    };
    for (const edition of EDITIONS) {
      const checks = await get(edition);
      for (const [index, id] of ids[edition].entries()) {
        const check = checks[`${edition}/tools/job-offer-check#${id}`];
        expect(check, id).toBeDefined();
        expect(check.lessonPath).toBe(`${edition}/tools/job-offer-check`);
        expect(check.lesson).toBe('Job offers: spot the fake');
        expect(check.answer).toBe(ANSWERS[edition][3 + index]);
      }
      // The lesson's screens stay under the lesson's ids, never written twice.
      expect(Object.keys(checks).filter((k) => /\/tools\/job-offer-check#d\d/.test(k))).toEqual([]);
    }
    const india = await get('in');
    expect(india['in/tools/job-offer-check#joining-kit'].context).toBe(
      'Recruiter, unknown number: ₹1,499 Selected for data entry from home, ₹18,000 a month. No interview needed. Pay ₹1,499 for your joining kit to start. [Pay ₹1,499]',
    );
    expect(india['in/protect-your-money/money-mule#d2'].context).toContain('Bring your bank details on your first day, for salary.');
    const us = await get('us');
    expect(us['us/tools/job-offer-check#text-interview'].context).toBe(
      "Recruiter, text only: Great chat. You're hired, no call needed. Send your Social Security number and online banking login for direct deposit. [Send details]",
    );
  });
});

test.describe('job-offer-check accessibility', () => {
  for (const edition of EDITIONS) {
    for (const width of [360, 1280]) {
      test(`${edition} at ${width}px has no serious or critical axe issues`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path(edition));
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
      });
    }
  }
});
