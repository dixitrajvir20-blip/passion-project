/**
 * pay-later-payday on the real build: each edition opens on its lesson's payday with the spec's
 * figures and sentence; keyboard-only add and remove at 360px; the cap of 8; errors in text that
 * hide every figure; the # link round trip, '#main', an old ?link and values a link may not set;
 * figures typed before the JavaScript arrives; the fee note in the edition's currency whatever the
 * picker says; the US edition's sourced rule, with no currency picker at all; the edition menu and
 * the lessons; axe. The pins are in docs/research/interactive-tools-revised.json (pay-later-payday).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';

const BASE = '/passion-project/';
const EU = 'eu/tools/pay-later-payday';
const US = 'us/tools/pay-later-payday';
const CFPB_2025 = 'https://files.consumerfinance.gov/f/documents/cfpb_bnpl-market-report_2025-12.pdf';

const total = (page: Page) => page.locator('.tool .results .ledger-total');
const row = (page: Page, label: string) =>
  page.locator('.tool .results .result-block').filter({ has: page.locator('.ledger-label').getByText(label, { exact: true }) });
const fact = (page: Page, label: string) =>
  page
    .locator('.tool .results .result-fact')
    .filter({ has: page.locator('.result-fact-label').getByText(label, { exact: true }) })
    .locator('.result-fact-value');
const sentence = (page: Page) => page.locator('.tool .results p.plain');
const feeNote = (page: Page) => page.locator('.tool .results p.notice');
const removedStatus = (page: Page) => page.locator('.row-list > p[role="status"]');
const addPlan = (page: Page) => page.getByRole('button', { name: 'Add a plan' });

/** A load of the page, not a jump within it, so a new # is read as a new link. */
async function open(page: Page, path: string) {
  await page.goto('about:blank');
  await page.goto(path);
  await waitForIslands(page);
}

async function expectNoBlockingAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')).toEqual([]);
}

/** Presses Tab (or Shift+Tab) until the focused element is the one described; keyboard only. */
async function tabTo(page: Page, target: { id?: string; text?: string }, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  for (let i = 0; i < 150; i++) {
    await page.keyboard.press(key);
    const hit = await page.evaluate(({ id, text }) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      if (id !== undefined) return el.id === id;
      return el.textContent?.trim() === text;
    }, target);
    if (hit) return;
  }
  throw new Error(`Tab never reached ${JSON.stringify(target)}`);
}

test.describe('each edition opens on its lesson’s payday', () => {
  for (const width of [360, 1280]) {
    test(`Europe at ${width}px: €306 left, the plans take €90, €180 still owed`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, EU);
      await expect(page.locator('h1')).toHaveText('Pay-later plans against one payday');
      await expect(page.locator('.scenario')).toHaveText(
        'It opens on an example: the Europe lesson’s 1 October pay of €1,200, with €804 of living costs and three plans each on payment 2 of 4. Change any number to match your own.',
      );

      await expect(row(page, 'Pay arriving this payday').locator('.ledger-figure')).toHaveText('€1,200');
      await expect(row(page, 'Living costs').locator('.ledger-figure')).toHaveText('−€804');
      await expect(row(page, 'Left after living costs')).toHaveClass(/ledger-subtotal/);
      await expect(row(page, 'Left after living costs').locator('.ledger-figure')).toHaveText('€396');
      await expect(row(page, 'Moved to savings')).toHaveCount(0);
      await expect(row(page, 'Left after living costs and savings')).toHaveCount(0);
      await expect(row(page, 'Plan 1').locator('.ledger-figure')).toHaveText('−€30');
      await expect(row(page, 'Plan 2').locator('.ledger-figure')).toHaveText('−€36');
      await expect(row(page, 'Plan 3').locator('.ledger-figure')).toHaveText('−€24');
      await expect(total(page).locator('.ledger-label')).toHaveText('Left until your next pay');
      await expect(total(page).locator('.ledger-figure')).toHaveText('€306');
      await expect(page.locator('.tool .results .result-figure')).toHaveCount(0); // the total is the answer
      await expect(fact(page, 'The plans take')).toHaveText('€90, 7.5% of this pay');
      await expect(fact(page, 'Owed on these plans, counting these instalments')).toHaveText('€270');
      await expect(fact(page, 'Still owed after these instalments')).toHaveText('€180');
      await expect(sentence(page)).toHaveText(
        'After living costs and 3 instalments, €306 is left of €1,200. The plans take €90, 7.5% of this pay, and €180 is still owed on them after these instalments.',
      );
      await expect(sentence(page)).toHaveAttribute('role', 'status');
      await expect(feeNote(page)).toHaveText(
        'Late fee if a payment is missed: the lesson’s screen uses €15, a made-up example. Each plan’s terms set the real fee, and each EU country’s law sets any limit on it. A payment that fails can also bring a charge from your bank.',
      );
      await expect(page.locator('.is-loss')).toHaveCount(0);
      await expect(page.getByLabel('Currency')).toHaveValue('en-IE');
      await expect(page.locator('.rules-line')).toHaveCount(0); // Europe's fee is an example, not a rule
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`US at ${width}px: $323 left after savings, the plans take $45, $90 still owed`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, US);
      await expect(page.locator('h1')).toHaveText('Pay-later plans against one payday');
      await expect(page.locator('.scenario')).toContainText('the US lesson’s Friday paycheck of $1,317');

      await expect(row(page, 'Pay arriving this payday').locator('.ledger-figure')).toHaveText('$1,317');
      await expect(row(page, 'Living costs').locator('.ledger-figure')).toHaveText('−$817');
      await expect(row(page, 'Left after living costs').locator('.ledger-figure')).toHaveText('$500');
      await expect(row(page, 'Moved to savings').locator('.ledger-figure')).toHaveText('−$132');
      await expect(row(page, 'Left after living costs and savings')).toHaveClass(/ledger-subtotal/);
      await expect(row(page, 'Left after living costs and savings').locator('.ledger-figure')).toHaveText('$368');
      for (const label of ['Plan 1', 'Plan 2', 'Plan 3']) await expect(row(page, label).locator('.ledger-figure')).toHaveText('−$15');
      await expect(total(page).locator('.ledger-figure')).toHaveText('$323');
      await expect(fact(page, 'The plans take')).toHaveText('$45, 3.4% of this pay');
      await expect(fact(page, 'Owed on these plans, counting these installments')).toHaveText('$135');
      await expect(fact(page, 'Still owed after these installments')).toHaveText('$90');
      await expect(sentence(page)).toHaveText(
        'After living costs, $132 to savings and 3 installments, $323 is left of $1,317. The plans take $45, 3.4% of this pay, and $90 is still owed on them after these installments.',
      );
      await expect(feeNote(page)).toHaveText(
        'Late fee if a payment is missed: in 2023 the average late fee charged by four large pay-in-four lenders was $9.70 (Consumer Financial Protection Bureau, December 2025). Each plan’s terms set the real fee, and some states limit it. Your bank can add an overdraft or non-sufficient funds fee when an automatic payment finds too little in the account.',
      );
      const link = feeNote(page).getByRole('link', { name: 'Consumer Financial Protection Bureau, December 2025' });
      await expect(link).toHaveAttribute('href', CFPB_2025);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('the US edition’s sourced rule', () => {
  test('keeps the edition’s dollars whatever lp:locale says, with no currency picker', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-IN'));
    await open(page, US);
    await expect(total(page).locator('.ledger-figure')).toHaveText('$323');
    await expect(page.locator('#plp-currency')).toHaveCount(0);
    await expect(page.getByLabel('Currency')).toHaveCount(0);
    await expect(feeNote(page)).toContainText('$9.70');
    expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBe('en-IN'); // left alone
  });

  test('a link’s currency cannot change it either', async ({ page }) => {
    await open(page, `${US}#cur=en-IN&pay=1317`);
    await expect(total(page).locator('.ledger-figure')).toHaveText('$323');
  });

  test('prints the rule with its source and date, and the terms on the page', async ({ page }) => {
    await open(page, US);
    const rules = page.locator('.rules-line');
    await expect(rules.locator('.rules-lead')).toHaveText('Figure checked 22 September 2026:');
    await expect(rules.locator('li')).toHaveCount(1);
    await expect(rules.locator('li')).toContainText('Average late fee in 2023 at the four of six large pay-in-four lenders that charged late fees: $9.70 a fee');
    await expect(rules.locator('li')).toContainText('checked 22 September 2026');
    const source = rules.getByRole('link');
    await expect(source).toHaveAttribute('href', CFPB_2025);
    await expect(source).toHaveAttribute('rel', 'noopener noreferrer');

    const terms = page.locator('.tool-terms');
    await expect(terms.getByRole('heading')).toHaveText('Terms on this page');
    await expect(terms.locator('dt')).toHaveText(['Buy now, pay later', 'Loan stacking', 'Late fee', 'Autopay', 'Overdraft fee']);
    await expect(terms.locator('dt a').first()).toHaveAttribute('href', `${BASE}glossary#buy-now-pay-later`);
    await expectNoBlockingAxe(page);
  });
});

test.describe('the Europe edition’s currency picker', () => {
  test('a link’s currency shows the reader’s figures in it for this visit only; the fee stays in euro', async ({ page }) => {
    await open(page, `${EU}#cur=pt-BR`);
    await expect(page.getByLabel('Currency')).toHaveValue('pt-BR');
    await expect(total(page).locator('.ledger-figure')).toHaveText('R$ 306');
    await expect(sentence(page)).toContainText('R$ 306 is left of R$ 1.200');
    await expect(sentence(page)).toContainText('7,5% of this pay');
    await expect(feeNote(page)).toContainText('uses €15, a made-up example');
    expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBeNull();
  });

  test('a saved currency applies to the reader’s figures, never to the fee', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-US'));
    await open(page, EU);
    await expect(total(page).locator('.ledger-figure')).toHaveText('$306');
    await expect(feeNote(page)).toContainText('€15');
    await page.getByLabel('Currency').selectOption('en-GB');
    await expect(total(page).locator('.ledger-figure')).toHaveText('£306');
    await expect(feeNote(page)).toContainText('€15');
  });

  test('Terms on this page, and no rules line', async ({ page }) => {
    await open(page, EU);
    await expect(page.locator('.tool-terms dt')).toHaveText(['Buy now, pay later', 'Net pay', 'Loan stacking', 'Late fee']);
    await expect(page.locator('.rules-line')).toHaveCount(0);
  });
});

test.describe('keyboard only at 360px', () => {
  test('Add moves focus to the new plan; Remove moves it to the plan now in its place, or to Add, and says so', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page, EU);

    await tabTo(page, { text: 'Add a plan' });
    await page.keyboard.press('Enter');
    await expect(page.locator('#plp-plan-3-amount')).toBeFocused();
    await expect(page.locator('#plp-plans-row-3 > legend')).toHaveText('Plan 4');
    await page.keyboard.type('20');
    await expect(row(page, 'Plan 4').locator('.ledger-figure')).toHaveText('−€20');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€286');

    await tabTo(page, { text: 'Remove Plan 2' }, 'Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('#plp-plan-1-amount')).toBeFocused();
    await expect(page.locator('#plp-plan-1-amount')).toHaveValue('24'); // Plan 3 moved up
    await expect(removedStatus(page)).toHaveText('Plan 2 removed. The plans after it move up one.');
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(3);
    await expect(total(page).locator('.ledger-figure')).toHaveText('€322'); // 1200 − 804 − 30 − 24 − 20

    await tabTo(page, { text: 'Remove Plan 3' });
    await page.keyboard.press('Enter');
    await expect(addPlan(page)).toBeFocused();
    await expect(removedStatus(page)).toHaveText('Plan 3 removed.');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€342');

    // A payment count changed from the keyboard: two payments of Plan 1 before the next pay.
    await tabTo(page, { id: 'plp-plan-0-d' }, 'Shift+Tab');
    await page.keyboard.type('2'); // type-ahead: an arrow key opens the list on some platforms instead
    await expect(page.locator('#plp-plan-0-d')).toHaveValue('2');
    await expect(row(page, 'Plan 1, 2 payments').locator('.ledger-figure')).toHaveText('−€60');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€312');
  });

  test('the remove buttons name their plan and are at least 44px tall', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page, US);
    for (const n of [1, 2, 3]) {
      const button = page.getByRole('button', { name: `Remove Plan ${n}` });
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('#plp-plans-row-1 > legend')).toHaveText('Plan 2');
    await expect(page.getByLabel('Out of how many').first()).toHaveValue('4');
  });
});

test.describe('the cap of 8 plans', () => {
  test('Add is disabled at 8, with the reason in visible text tied to it', async ({ page }) => {
    await open(page, EU);
    for (let i = 0; i < 5; i++) await addPlan(page).click();
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(8);
    await expect(addPlan(page)).toBeDisabled();
    await expect(addPlan(page)).toHaveAttribute('aria-describedby', 'plp-plans-max');
    await expect(page.locator('#plp-plans-max')).toHaveText(
      'This tool holds up to 8 plans. Any more are left out of these totals, so the plans would take more than shown.',
    );
    await addPlan(page).click({ force: true });
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(8);
  });
});

test.describe('errors are said in text and hide every figure', () => {
  test('living costs below 0', async ({ page }) => {
    await open(page, EU);
    const living = page.locator('#plp-living');
    await living.fill('-30');
    await expect(page.locator('#plp-living-error')).toHaveText('Living costs cannot be below 0.');
    await expect(living).toHaveAttribute('aria-invalid', 'true');
    await expect(living).toHaveAttribute('aria-describedby', /plp-living-error/);
    await expect(total(page)).toHaveCount(0);
    await expect(page.locator('.tool .results .result-block')).toHaveCount(0);
    await expect(page.locator('.tool .results .result-fact')).toHaveCount(0);
    await expect(sentence(page)).toHaveText('A number above needs a change first: the note under it says what.');
    await living.fill('804');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€306');
  });

  test('more payments before the next pay than a plan has left', async ({ page }) => {
    await open(page, EU);
    await page.locator('#plp-plan-0-d').selectOption('4');
    await expect(page.locator('#plp-plan-0-d-error')).toHaveText('This plan has only 3 payments left, counting this one.');
    await expect(page.locator('#plp-plan-0-d')).toHaveAttribute('aria-invalid', 'true');
    await expect(total(page)).toHaveCount(0);
  });

  test('a blank payment number asks for the plan’s own numbers', async ({ page }) => {
    await open(page, US);
    await page.locator('#plp-plan-2-k').fill('');
    await expect(page.locator('#plp-plan-2-k-error')).toHaveText(
      'Enter the payment number and the total as the plan shows them, for example payment 2 of 4.',
    );
  });

  test('no pay asks for the pay, and a short payday says so in words as well as colour', async ({ page }) => {
    await open(page, EU);
    await page.locator('#plp-pay').fill('');
    await expect(sentence(page)).toHaveText('Enter the pay arriving this payday to see what is left.');
    await expect(total(page)).toHaveCount(0);
    await page.locator('#plp-pay').fill('850');
    await expect(total(page).locator('.ledger-label')).toHaveText('Short before your next pay');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€44');
    await expect(total(page).locator('.ledger-figure')).toHaveClass(/is-loss/);
    await expect(sentence(page)).toHaveText('This pay is €44 short after 3 instalments: living costs leave €46, and the plans take €90.');
  });
});

test.describe('links carry the figures after the #', () => {
  test('Copy link writes every figure, the plans and the currency after the #, and the link restores them', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, EU);
    await page.locator('#plp-pay').fill('1000');
    await page.getByRole('button', { name: 'Remove Plan 3' }).click();
    await page.locator('#plp-plan-0-d').selectOption('2');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€100'); // 1000 − 804 − 60 − 36

    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).not.toContain('?');
    const hash = new URL(copied).hash;
    expect(hash).toBe('#pay=1000&living=804&savings=0&plans=30%7E2%7E4%7E2%7C36%7E2%7E4%7E1&cur=en-IE');

    const other = await context.newPage();
    await other.goto(copied);
    await waitForIslands(other);
    await expect(other.locator('#plp-pay')).toHaveValue('1000');
    await expect(other.locator('fieldset.row-list-row')).toHaveCount(2);
    await expect(other.locator('#plp-plan-0-d')).toHaveValue('2');
    await expect(other.locator('#plp-plan-1-amount')).toHaveValue('36');
    await expect(total(other).locator('.ledger-figure')).toHaveText('€100');
    expect(other.url()).not.toContain('#'); // the figures leave the address bar once read
  });

  test('a US link restores the figures', async ({ page }) => {
    await open(page, `${US}#pay=1100&living=817&savings=132&plans=15%7E2%7E4%7E1%7C15%7E2%7E4%7E1%7C15%7E2%7E4%7E1&cur=en-US`);
    await expect(page.locator('#plp-pay')).toHaveValue('1100');
    await expect(total(page).locator('.ledger-figure')).toHaveText('$106');
  });

  test('the skip link’s #main is not a link to figures', async ({ page }) => {
    await open(page, `${EU}#main`);
    await expect(page.locator('#plp-pay')).toHaveValue('1200');
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(3);
    await expect(total(page).locator('.ledger-figure')).toHaveText('€306');
  });

  test('an old ?link still works', async ({ page }) => {
    await open(page, `${EU}?pay=1000&plans=30~2~4~1`);
    await expect(page.locator('#plp-pay')).toHaveValue('1000');
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(1);
    await expect(total(page).locator('.ledger-figure')).toHaveText('€166');
  });

  test('a value outside a select’s options falls back: an unknown currency, and a plan with 5 payments due', async ({ page }) => {
    await open(page, `${EU}#cur=xx-XX&plans=30~2~4~5%7C36~2~4~1`);
    await expect(page.getByLabel('Currency')).toHaveValue('en-IE');
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(1);
    await expect(page.locator('#plp-plan-0-amount')).toHaveValue('36');
    await expect(page.locator('#plp-plan-0-d')).toHaveValue('1');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€360');
  });

  test('a value a number field cannot show puts that field back, and no figure is hidden', async ({ page }) => {
    // abc, 0x10 and 1e999 would each leave the field looking blank while the tool kept the text.
    await open(page, `${EU}#pay=abc&living=0x10&savings=1e999&plans=30~2~4~1`);
    await expect(page.locator('#plp-pay')).toHaveValue('1200');
    await expect(page.locator('#plp-living')).toHaveValue('804');
    await expect(page.locator('#plp-savings')).toHaveValue('0');
    await expect(page.locator('.tool .error')).toHaveCount(0);
    await expect(total(page).locator('.ledger-figure')).toHaveText('€366');
    // '+5' (sent as %2B5) and '5.' are read as 5 by a lax parser, but the field cannot show them.
    await open(page, `${EU}#pay=%2B5&living=5.&savings=Infinity`);
    await expect(page.locator('#plp-pay')).toHaveValue('1200');
    await expect(page.locator('#plp-living')).toHaveValue('804');
    await expect(page.locator('#plp-savings')).toHaveValue('0');
    await expect(total(page).locator('.ledger-figure')).toHaveText('€306');
    // Values the field shows still come through, errors and all.
    await open(page, `${EU}#pay=1e3&living=-5`);
    await expect(page.locator('#plp-pay')).toHaveValue('1e3');
    await expect(page.locator('#plp-living')).toHaveValue('-5');
    await expect(page.locator('#plp-living-error')).toHaveText('Living costs cannot be below 0.');
  });

  test('a link made with every plan removed opens with none', async ({ page }) => {
    await open(page, `${EU}#pay=1200&living=804&savings=0&plans=&cur=en-IE`);
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(0);
    await expect(sentence(page)).toHaveText('No pay-later payments are entered. After living costs, €396 is left of €1,200.');
    await expect(page.locator('.tool .results .result-fact')).toHaveCount(0);
  });

  test('Reset returns to the example', async ({ page }) => {
    await open(page, `${EU}#pay=1000&plans=30~2~4~1&cur=pt-BR`);
    await expect(total(page).locator('.ledger-figure')).toHaveText('R$ 166');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('#plp-pay')).toHaveValue('1200');
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(3);
    await expect(total(page).locator('.ledger-figure')).toHaveText('€306');
    expect(page.url()).not.toContain('#');
  });
});

test('figures typed before the JavaScript arrives are kept', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(
    (url) => url.pathname.includes('/_astro/') && url.pathname.endsWith('.js'),
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  await page.goto(EU, { waitUntil: 'commit' });
  await page.locator('#plp-plan-0-amount').waitFor();
  await page.locator('#plp-pay').fill('1000');
  await page.locator('#plp-plan-0-amount').fill('50');
  // The reader is on the next plan's amount when the JavaScript lands: the row must not be rebuilt.
  await page.focus('#plp-plan-1-amount');
  await page.locator('#plp-plan-1-amount').evaluate((el) => el.setAttribute('data-before-js', ''));
  release();
  await waitForIslands(page);
  await expect(page.locator('#plp-pay')).toHaveValue('1000');
  await expect(page.locator('#plp-plan-0-amount')).toHaveValue('50');
  await expect(total(page).locator('.ledger-figure')).toHaveText('€86'); // 1000 − 804 − 50 − 36 − 24
  await expect(page.locator('#plp-plan-1-amount')).toBeFocused();
  await expect(page.locator('#plp-plan-1-amount')).toHaveAttribute('data-before-js', '');
  // Typing carries on in the same field.
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('40');
  await expect(total(page).locator('.ledger-figure')).toHaveText('€82'); // 1000 − 804 − 50 − 40 − 24
});

test.describe('around the tool', () => {
  test('the edition menu keeps the tool where the edition has it', async ({ page }) => {
    await page.goto(EU);
    expect(await page.locator('.region-tabs a[data-region="us"]').getAttribute('href')).toMatch(/\/us\/tools\/pay-later-payday$/);
    expect(await page.locator('.region-tabs a[data-region="in"]').getAttribute('href')).toMatch(/\/in\/tools$/);
    expect((await page.goto('in/tools/pay-later-payday'))?.status()).toBe(404);
  });

  test('is filed as a calculator, and lists the lesson that uses it', async ({ page }) => {
    await page.goto(EU);
    await expect(page.locator('[data-pagefind-meta]')).toHaveAttribute('data-pagefind-meta', 'kind:Calculator');
    await expect(page.locator('.related').getByRole('link', { name: 'Buy now, pay later is credit: the month it lands' })).toBeVisible();
    await page.goto(US);
    await expect(page.locator('.related').getByRole('link', { name: 'How pay-in-four makes money, and what it costs you' })).toBeVisible();
  });

  test('both lessons hand off to it, and the US lesson’s screen uses the 2023 figure', async ({ page }) => {
    await page.goto('eu/learn/credit-and-fraud/bnpl-is-credit');
    await expect(page.locator(`.tool-handoffs a[href="${BASE}eu/tools/pay-later-payday"]`)).toHaveText(
      'Try your own numbers: what do my pay-later plans leave?',
    );
    await page.goto('us/learn/how-business-works/bnpl');
    await expect(page.locator(`.tool-handoffs a[href="${BASE}us/tools/pay-later-payday"]`)).toHaveText(
      'Try your own numbers: what do my pay-later plans leave?',
    );
    await expect(page.locator('main')).toContainText('In 2023 the average late fee at four large lenders was $9.70');
  });

  test('How this is worked out links the budget planner, the loan calculator and each source', async ({ page }) => {
    await open(page, EU);
    const how = page.locator('.tool details.how');
    await how.locator('summary').click();
    await expect(how.getByRole('link', { name: 'budget planner' })).toHaveAttribute('href', `${BASE}eu/tools/budget`);
    await expect(how.getByRole('link', { name: 'loan calculator' })).toHaveAttribute('href', `${BASE}eu/tools/loan`);
    await expect(how).toContainText('covers most pay-later plans');
    await expect(how.getByRole('link', { name: 'Directive (EU) 2023/2225 (EUR-Lex)' })).toHaveAttribute('rel', 'noopener noreferrer');
    await expectNoBlockingAxe(page);

    await open(page, US);
    await page.locator('.tool details.how summary').click();
    await expect(page.locator('.tool details.how')).toContainText('The fee note’s $9.70 is the 2023 average late fee');
    await expect(page.locator('.tool details.how')).toContainText('New York proposed rules in 2026');
  });

  for (const path of [EU, US]) {
    for (const width of [360, 1280]) {
      test(`${path} at ${width}px passes axe`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, path);
        await expectNoBlockingAxe(page);
      });
    }
  }
});
