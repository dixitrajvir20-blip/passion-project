/**
 * side-income-tax on the real build: each edition opens on its lesson's example with the spec's
 * figures; the currency comes with the edition whatever lp:locale holds; every result branch in
 * both editions; errors in text tied to their field with no double-ruled total; the figures travel
 * only after the # (read once, then cleared; an old-style ?query is ignored); keyboard-only use;
 * the rules, terms and lessons under the tool; axe at 360 and 1280 in light and dark. The pins are
 * in docs/research/interactive-tools-revised.json (side-income-tax).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';

const US_PAGE = 'us/tools/side-income-tax';
const IN_PAGE = 'in/tools/side-income-tax';

const results = (page: Page) => page.locator('.tool .results');
const rows = (page: Page) => results(page).locator('.ledger-row');
const totals = (page: Page) => results(page).locator('.ledger-total');
const answer = (page: Page) => totals(page).last();
const sentence = (page: Page) => results(page).locator('p.plain[role="status"]');
const notes = (page: Page) => results(page).locator('.tool-notes li');
const invoiceFold = (page: Page) => page.locator('.tool details', { has: page.locator('summary', { hasText: 'Check against your invoices (optional)' }) });
const howFold = (page: Page) => page.locator('.tool details.how', { has: page.locator('summary', { hasText: 'How this is worked out' }) });

/**
 * A load of the page, not a jump within it: going from the page to the same page with only a new
 * # is a same-document navigation, which neither reloads the page nor re-reads the link.
 */
async function open(page: Page, path: string) {
  await page.goto('about:blank');
  await page.goto(path);
  await waitForIslands(page);
}

async function expectNoBlockingAxe(page: Page) {
  const found = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const blocking = found.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')).toEqual([]);
}

const US_OPENING = 'Of $6,000 in, $5,000 is profit after costs. Self-employment tax on it is $707, set by law. With income tax at 0%, set aside $707 on these figures.';
const IN_OPENING =
  '₹15,000 of tax is on record in your name for the year you are filing for. With ₹0 due on that year’s whole income, ₹15,000 can come back. It is paid once that year’s return is filed, within the time allowed, and verified, into a bank account the portal has validated.';
const SCOPE_LINE =
  'Federal tax only, before the standard deduction and the deduction for half of self-employment tax, so the income tax line can overstate. Wages from a job count toward the same Social Security cap.';
const BELATED =
  'For 2025-26 income, a belated return can be filed until 31 December 2026, or before assessment if that comes first. An updated return filed after that cannot increase a refund.';

test.describe('side-income-tax opens on each lesson’s example', () => {
  for (const width of [360, 1280]) {
    test(`United States at ${width}px: $707 to set aside, split into two ledgers, no currency field`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, US_PAGE);
      await expect(page.locator('h1')).toHaveText('Tax on side income and fees');
      await expect(page.locator('.scenario')).toHaveText(
        'It opens on an example: the lesson’s year of tutoring and reselling: $6,000 in, $1,000 of costs, and no other income. Change any number to match your own.',
      );

      await expect(results(page).locator('h3')).toHaveText(['Profit from the work', 'Tax on it']);
      await expect(rows(page).locator('.ledger-label')).toHaveText([
        'Money in',
        'Costs of the work',
        'Net profit',
        'Self-employment tax',
        'Income tax at your example 0%',
        'Tax on these figures',
        'Already paid toward it',
        'To set aside on these figures',
      ]);
      await expect(rows(page).locator('.ledger-figure')).toHaveText(['$6,000', '−$1,000', '$5,000', '$707', '+$0', '$707', '−$0', '$707']);
      await expect(results(page).locator('.ledger-note')).toHaveText('15.3% of $4,618, which is 92.35% of $5,000, rounded to the dollar');
      await expect(results(page).locator('.ledger-subtotal .ledger-label')).toHaveText('Tax on these figures');
      await expect(totals(page)).toHaveCount(2);
      await expect(answer(page).locator('.ledger-label')).toHaveText('To set aside on these figures');
      await expect(answer(page).locator('.ledger-figure')).toHaveText('$707');
      await expect(sentence(page)).toHaveText(US_OPENING);
      await expect(notes(page)).toHaveText(['Self-employment tax is 14.1% of profit, set by law.', SCOPE_LINE]);
      await expect(results(page)).not.toContainText('$1,000 or more');
      await expect(page.locator('.is-loss')).toHaveCount(0);

      // The rules come with the edition, so the currency does too.
      await expect(page.getByLabel('Currency')).toHaveCount(0);
      await expect(page.locator('.tool select')).toHaveCount(0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`India at ${width}px: ₹15,000 can come back, the invoice check in a closed fold`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, IN_PAGE);
      await expect(page.locator('h1')).toHaveText('Tax on side income and fees');
      await expect(page.locator('.scenario')).toHaveText(
        'It opens on an example: the internship in the lesson on getting TDS back: ₹15,000 withheld from ₹1,50,000 of fees, on an income that owed no tax. Change any number to match your own.',
      );

      await expect(results(page).locator('h3')).toHaveText('For the year you are filing for');
      await expect(rows(page).locator('.ledger-label')).toHaveText([
        'Tax deducted on your fees, on your statement',
        'Other tax already paid in your name',
        'Tax on record in your name',
        'Tax due on that year’s whole income',
        'Can come back on that year’s return',
      ]);
      await expect(rows(page).locator('.ledger-figure')).toHaveText(['₹15,000', '+₹0', '₹15,000', '−₹0', '₹15,000']);
      await expect(totals(page)).toHaveCount(1);
      await expect(sentence(page)).toHaveText(IN_OPENING);
      await expect(notes(page)).toHaveText(['Invoices minus what arrived: ₹15,000, the same as the tax on your statement.', BELATED]);

      await expect(invoiceFold(page)).not.toHaveAttribute('open', /.*/);
      await invoiceFold(page).locator('summary').click();
      await expect(page.locator('#sit-invoiced')).toHaveValue('150000');
      await expect(page.locator('#sit-arrived')).toHaveValue('135000');

      await expect(page.getByLabel('Currency')).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('both pages are indexed as calculators and list their rules, terms and lessons', async ({ page }) => {
    await open(page, US_PAGE);
    await expect(page.locator('[data-pagefind-meta]')).toHaveAttribute('data-pagefind-meta', 'kind:Calculator');
    const usRules = page.locator('.rules-line');
    await expect(usRules.locator('.rules-lead')).toHaveText('Rules as of 22 September 2026:');
    await expect(usRules).toContainText('Net earnings from self-employment are 92.35% of net profit');
    await expect(usRules).toContainText('The 12.4% applies to at most $184,500 of wages and net earnings together in 2026');
    await expect(usRules.locator('a[href="https://www.irs.gov/instructions/i1040sse"]').first()).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(usRules.locator('a[href="https://www.irs.gov/taxtopics/tc751"]')).toHaveCount(1);
    await expect(page.locator('.tool-terms dt')).toHaveText(['Net earnings from self-employment', 'Self-employment tax', 'Estimated tax']);
    await expect(page.locator('.related h2')).toHaveText('Lessons that use this');
    await expect(page.locator('.related li')).toContainText(['Setting money aside for self-employment tax']);

    await open(page, IN_PAGE);
    await expect(page.locator('[data-pagefind-meta]')).toHaveAttribute('data-pagefind-meta', 'kind:Calculator');
    const inRules = page.locator('.rules-line');
    await expect(inRules).toContainText('₹10,000 or more');
    await expect(inRules).toContainText('Annual Information Statement in Form No. 168');
    await expect(
      inRules.locator('a[href="https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments"]').first(),
    ).toBeVisible();
    await expect(page.locator('.tool-terms dt')).toHaveText([
      'TDS (tax deducted at source)',
      'Annual Information Statement (AIS)',
      'Form 26AS',
      'Tax return',
      'Advance tax',
    ]);
    await expect(page.locator('.related li')).toContainText(['TDS was cut, tax is nil: how the refund comes back']);
  });

  test('Europe has no page, and its edition link lands on the tools index', async ({ page }) => {
    const response = await page.goto('eu/tools/side-income-tax');
    expect(response?.status()).toBe(404);
    await open(page, US_PAGE);
    await expect(page.locator('a[href$="/eu/tools"]').first()).toBeAttached();
  });
});

test.describe('the currency comes with the edition, never from lp:locale', () => {
  test('lp:locale en-IN on the US page still shows dollars', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-IN'));
    await open(page, US_PAGE);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$707');
    await expect(results(page)).not.toContainText('₹');
    expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBe('en-IN');
  });

  test('lp:locale en-US on the India page still shows rupees', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-US'));
    await open(page, IN_PAGE);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹15,000');
    await expect(answer(page).locator('.ledger-label')).toHaveText('Can come back on that year’s return');
    await expect(results(page)).not.toContainText('$');
    expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBe('en-US');
  });
});

test.describe('United States results by case', () => {
  test('an example income tax of 10% gives $1,207 and the estimated-tax fact', async ({ page }) => {
    await open(page, US_PAGE);
    await page.locator('#sit-incomeTaxPercent').fill('10');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$1,207');
    await expect(rows(page).filter({ hasText: 'Income tax at your example 10%' }).locator('.ledger-figure')).toHaveText('+$500');
    await expect(sentence(page)).toHaveText(
      'Of $6,000 in, $5,000 is profit after costs. Tax on it comes to $1,207: $707 of self-employment tax, set by law, and $500 at your example 10%. Set aside $1,207 on these figures.',
    );
    await expect(notes(page).first()).toHaveText('Self-employment tax is 14.1% of profit, set by law, plus your example 10%.');
    const estimated = notes(page).nth(1);
    await expect(estimated).toContainText(
      'The IRS generally expects tax paid during the year from people who will owe $1,000 or more after withholding and credits: by April 15, June 15, September 15 and January 15 of the next year',
    );
    await expect(estimated.locator('a[href="https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes"]')).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await expect(estimated.locator('a[href="https://www.irs.gov/businesses/small-businesses-self-employed/manage-taxes-for-your-gig-work"]')).toHaveCount(1);
  });

  test('a loss: no tax ledger, the loss in words and colour, and what was paid is settled by the return', async ({ page }) => {
    await open(page, `${US_PAGE}#moneyIn=500&costs=900&alreadyPaid=200`);
    await expect(results(page).locator('h3')).toHaveText(['Profit from the work']);
    await expect(answer(page).locator('.ledger-label')).toHaveText('Net loss');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$400');
    await expect(answer(page).locator('.ledger-figure')).toHaveClass(/is-loss/);
    await expect(sentence(page)).toHaveText(
      'Against $900 of costs, $500 in is a loss of $400 on these figures, so no tax is worked out on it. The year’s return settles the $200 already paid.',
    );
    await expect(notes(page)).toHaveText([SCOPE_LINE]);
  });

  test('money in equal to costs, and both at 0', async ({ page }) => {
    await open(page, `${US_PAGE}#moneyIn=900&costs=900`);
    await expect(sentence(page)).toHaveText(
      'Money in of $900 matches the costs of the work, so it made no profit on these figures and no tax is worked out on it.',
    );
    await expect(answer(page).locator('.ledger-label')).toHaveText('Net profit');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$0');

    await open(page, `${US_PAGE}#moneyIn=0&costs=0`);
    await expect(sentence(page)).toHaveText('Enter the money in from the work to see the tax on it.');
  });

  test('a profit under the $400 line of net earnings: no self-employment tax', async ({ page }) => {
    await open(page, `${US_PAGE}#moneyIn=432.59&costs=0`);
    await expect(results(page).locator('.ledger-note')).toHaveText('92.35% of $432.59 is $399, under $400, so none is due');
    await expect(sentence(page)).toHaveText(
      'Of $432.59 in, $432.59 is profit after costs. 92.35% of it is $399, under the $400 line, so no self-employment tax is due on it. Income tax may still apply, depending on the whole year’s income.',
    );

    await open(page, `${US_PAGE}#moneyIn=432.60&costs=0`);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$61');
  });

  test('already paid: more than the sum, and exactly the sum', async ({ page }) => {
    await open(page, `${US_PAGE}#alreadyPaid=800`);
    await expect(answer(page).locator('.ledger-label')).toHaveText('Paid beyond this sum');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$93');
    await expect(sentence(page)).toHaveText(
      'Of $6,000 in, $5,000 is profit after costs. Self-employment tax on it is $707, set by law. More has been paid than this sum shows, by $93; the year’s return settles it.',
    );

    await open(page, `${US_PAGE}#incomeTaxPercent=10&alreadyPaid=1207`);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$0');
    await expect(sentence(page)).toContainText('What you have paid toward it covers this sum.');
  });

  test('a rate that rounds to 0 basis points reads as 0%, never "your example 0%"', async ({ page }) => {
    await open(page, `${US_PAGE}#incomeTaxPercent=0.001`);
    await expect(sentence(page)).toHaveText(US_OPENING);
    await expect(sentence(page)).toContainText('With income tax at 0%, set aside $707 on these figures.');
    await expect(results(page)).not.toContainText('plus your example');
    await expect(notes(page).first()).toHaveText('Self-employment tax is 14.1% of profit, set by law.');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$707');

    await open(page, `${US_PAGE}#moneyIn=432.59&costs=0&incomeTaxPercent=0.004`);
    await expect(sentence(page)).toHaveText(
      'Of $432.59 in, $432.59 is profit after costs. 92.35% of it is $399, under the $400 line, so no self-employment tax is due on it. Income tax may still apply, depending on the whole year’s income.',
    );
  });

  test('the dependent’s standard deduction is the greater of $1,350 or earned income plus $450', async ({ page }) => {
    await open(page, US_PAGE);
    await expect(page.locator('#sit-incomeTaxPercent-hint')).toContainText(
      'in 2026 the standard deduction takes the first $16,100 of income, or, if someone can claim you as a dependent, the greater of $1,350 or your earned income plus $450.',
    );
    await page.locator('.tool details.how summary', { hasText: 'How this is worked out' }).click();
    await expect(howFold(page)).toContainText(
      'In 2026 it is $16,100, or, if someone can claim you as a dependent, the greater of $1,350 or your earned income plus $450, which is why income tax is often nil in a first year.',
    );
  });

  test('above $200,000 of net earnings: the error under Money in and no result', async ({ page }) => {
    await open(page, US_PAGE);
    await page.locator('#sit-moneyIn').fill('300000');
    await expect(page.locator('#sit-moneyIn-error')).toHaveText(
      'Above $200,000 of net earnings, about $216,600 of profit, an extra 0.9% Medicare tax can apply, so this sum stops being complete. IRS Topic 554 explains it.',
    );
    await expect(page.locator('#sit-moneyIn')).toHaveAttribute('aria-invalid', 'true');
    await expect(totals(page)).toHaveCount(0);
    await expect(sentence(page)).toHaveText('');
  });

  test('a negative cost and a rate above 100 are errors in text, tied to their fields', async ({ page }) => {
    await open(page, US_PAGE);
    await page.locator('#sit-costs').fill('-5');
    await expect(page.locator('#sit-costs-error')).toHaveText('Enter 0 or more.');
    await expect(page.locator('#sit-costs')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#sit-costs')).toHaveAttribute('aria-describedby', /sit-costs-error/);
    await expect(totals(page)).toHaveCount(0);
    await expect(sentence(page)).toHaveText('');

    await page.locator('#sit-costs').fill('1000');
    await page.locator('#sit-incomeTaxPercent').fill('101');
    await expect(page.locator('#sit-incomeTaxPercent-error')).toHaveText('A rate cannot be more than 100%.');
    await expect(totals(page)).toHaveCount(0);
  });
});

test.describe('India results by case', () => {
  test('tax due above the credits: still to pay, and the advance-tax fact at ₹10,000 or more', async ({ page }) => {
    await open(page, `${IN_PAGE}#otherCredits=5000&taxDue=40000`);
    await expect(answer(page).locator('.ledger-label')).toHaveText('Still to pay, before any interest');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹20,000');
    await expect(sentence(page)).toHaveText(
      '₹20,000 of tax is on record in your name for the year you are filing for, and ₹40,000 is due on that year’s whole income. On the credits on record, ₹20,000 is still to pay, before any interest for paying late.',
    );
    await expect(notes(page).filter({ hasText: 'due in advance' })).toHaveText(
      'When a year’s tax, after tax deducted at source, is ₹10,000 or more, it is due in advance during that year: by 15 June, 15 September, 15 December and 15 March, or all by 15 March under the presumptive scheme. Interest, from 1% a month, can be added when it is paid late.',
    );
    await expect(page.locator('.is-loss')).toHaveCount(0);

    await open(page, `${IN_PAGE}#taxDue=24999`);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹9,999');
    await expect(notes(page).filter({ hasText: 'due in advance' })).toHaveCount(0);
  });

  test('tax deducted but missing from the statement counts for the advance-tax line', async ({ page }) => {
    await open(page, `${IN_PAGE}#taxDue=25000&missing=20000`);
    await expect(answer(page).locator('.ledger-label')).toHaveText('Still to pay, before any interest');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹10,000');
    await expect(notes(page).filter({ hasText: 'due in advance' })).toHaveCount(0);
    await expect(notes(page).first()).toContainText('₹20,000 deducted but not yet on your statement is not in this sum.');

    // 35,000 − 15,000 − 10,000 = 10,000 after all TDS: on the line.
    await open(page, `${IN_PAGE}#taxDue=35000&missing=10000`);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹20,000');
    await expect(notes(page).filter({ hasText: 'due in advance' })).toHaveCount(1);

    await page.locator('.tool details.how summary', { hasText: 'How this is worked out' }).click();
    await expect(howFold(page)).toContainText(
      'When the year’s tax, after all tax deducted in your name, on the statement or not, is ₹10,000 or more, advance tax was due during the year',
    );
  });

  test('the belated-return lines show only while the window is open', async ({ page }) => {
    await open(page, IN_PAGE);
    await page.locator('.tool details.how summary', { hasText: 'How this is worked out' }).click();
    await expect(howFold(page)).toContainText('For 2025-26 income (Income-tax Act, 1961), a belated return can be filed until 31 December 2026');
    await expect(howFold(page)).not.toContainText('window closed');

    // The day after the last day, the island drops the fact and says the window has closed.
    await page.clock.setFixedTime(new Date('2027-01-01T12:00:00Z'));
    await open(page, IN_PAGE);
    await expect(notes(page)).toHaveText(['Invoices minus what arrived: ₹15,000, the same as the tax on your statement.']);
    await expect(howFold(page)).toContainText(
      'For 2025-26 income, the belated-return window closed on 31 December 2026. An updated return cannot increase a refund (',
    );
    await expect(howFold(page)).not.toContainText('can be filed until');
  });

  test('equal: nothing comes back, nothing to pay', async ({ page }) => {
    await open(page, `${IN_PAGE}#taxDue=15000`);
    await expect(answer(page).locator('.ledger-label')).toHaveText('Nothing comes back, nothing to pay');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹0');
    await expect(sentence(page)).toHaveText(
      '₹15,000 of tax is on record in your name, and ₹15,000 is due on that year’s whole income, so nothing comes back and nothing is left to pay on these figures.',
    );
  });

  test('a credit missing from the statement is a fact, never subtracted; the link opens the invoice fold', async ({ page }) => {
    await open(page, `${IN_PAGE}#tdsOnStatement=18000&missing=6000&invoiced=240000&arrived=216000`);
    await expect(invoiceFold(page)).toHaveAttribute('open', '');
    await expect(page.locator('#sit-invoiced')).toHaveValue('240000');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹18,000');
    await expect(notes(page)).toHaveText([
      '₹6,000 deducted but not yet on your statement is not in this sum. It can count once the payer corrects its filing, claimed on a revised return or a rectification request.',
      'Invoices minus what arrived: ₹24,000, the same as the tax on your statement plus what is still missing.',
      BELATED,
    ]);
  });

  test('an invoice gap that is not the statement’s tax is only a check', async ({ page }) => {
    await open(page, `${IN_PAGE}#invoiced=150000&arrived=140000`);
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹15,000');
    await expect(notes(page).first()).toHaveText(
      'Invoices minus what arrived: ₹10,000. That is not the tax on your statement. The gap can also be GST, platform or bank fees, or a payment not yet made; only the statement’s figure comes back.',
    );
  });

  test('more arrived than was invoiced: an error on that field withholds only the check', async ({ page }) => {
    await open(page, `${IN_PAGE}#arrived=160000`);
    await expect(page.locator('#sit-arrived-error')).toHaveText('More arrived than was invoiced. Check both figures.');
    await expect(page.locator('#sit-arrived')).toHaveAttribute('aria-invalid', 'true');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('₹15,000');
    await expect(sentence(page)).toHaveText(IN_OPENING);
    await expect(notes(page)).toHaveText([BELATED]);

    // Blank means not given: no check, no error.
    await page.locator('#sit-arrived').fill('');
    await expect(page.locator('#sit-arrived-error')).toHaveCount(0);
    await expect(notes(page)).toHaveText([BELATED]);
  });

  test('a negative figure hides the sum until it is fixed', async ({ page }) => {
    await open(page, IN_PAGE);
    await page.locator('#sit-taxDue').fill('-1');
    await expect(page.locator('#sit-taxDue-error')).toHaveText('Enter 0 or more.');
    await expect(totals(page)).toHaveCount(0);
    await expect(sentence(page)).toHaveText('');
    await page.locator('#sit-taxDue').fill('0');
    await expect(sentence(page)).toHaveText(IN_OPENING);
  });
});

test.describe('links carry the figures after the # only', () => {
  test('a fragment link restores the figures, then leaves the address bar', async ({ page }) => {
    await open(page, `${US_PAGE}#moneyIn=8000&costs=0`);
    await expect(page.locator('#sit-moneyIn')).toHaveValue('8000');
    await expect(page.locator('#sit-costs')).toHaveValue('0');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$1,130');
    await expect(notes(page).filter({ hasText: '$1,000 or more' })).toHaveCount(1);
    expect(page.url()).not.toContain('#');
  });

  test('an old-style ?query is ignored on this tool', async ({ page }) => {
    await open(page, `${US_PAGE}?moneyIn=9999`);
    await expect(page.locator('#sit-moneyIn')).toHaveValue('6000');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$707');
  });

  test('a value a number input cannot show is dropped, so the field and the answer agree', async ({ page }) => {
    await open(page, `${US_PAGE}#moneyIn=6%2C000`);
    await expect(page.locator('#sit-moneyIn')).toHaveValue('6000');
    await expect(answer(page).locator('.ledger-figure')).toHaveText('$707');
    await expect(sentence(page)).toHaveText(US_OPENING);

    for (const bad of ['0x10', '%20%205000', '%E2%82%B91000', '%2B5000', '5000.', '1e400']) {
      await open(page, `${US_PAGE}#moneyIn=${bad}&costs=500`);
      await expect(page.locator('#sit-moneyIn'), bad).toHaveValue('6000');
      // The good value in the same link is still taken.
      await expect(page.locator('#sit-costs'), bad).toHaveValue('500');
      await expect(sentence(page), bad).toContainText('Of $6,000 in, $5,500 is profit after costs.');
    }

    // A form the input keeps, blank included, still travels.
    await open(page, `${US_PAGE}#moneyIn=1e4&incomeTaxPercent=`);
    await expect(page.locator('#sit-moneyIn')).toHaveValue('1e4');
    await expect(page.locator('#sit-incomeTaxPercent')).toHaveValue('');
    await expect(sentence(page)).toContainText('Of $10,000 in, $9,000 is profit after costs.');
  });

  test('Copy link after a bad value writes the figure the field shows', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, `${US_PAGE}#moneyIn=0x10`);
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#moneyIn=6000&');
    expect(copied).not.toContain('0x10');
  });

  test('a value over 24 characters is dropped', async ({ page }) => {
    await open(page, `${IN_PAGE}#taxDue=${'1'.repeat(25)}`);
    await expect(page.locator('#sit-taxDue')).toHaveValue('0');
  });

  test('Copy link writes the figures after the # and no query', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, `${US_PAGE}?moneyIn=9999`);
    await page.locator('#sit-costs').fill('1500');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#moneyIn=6000&costs=1500&incomeTaxPercent=0&alreadyPaid=0');
    expect(copied).not.toContain('?');
    await expect(page.locator('.tool .btn-row + .link-note')).toBeVisible();
  });
});

test('side-income-tax works by keyboard alone', async ({ page }) => {
  await open(page, US_PAGE);
  const focusedId = () => page.evaluate(() => document.activeElement?.id ?? '');

  // Tab from the top of the page until Money in has focus: it must be reachable without a pointer.
  await page.locator('body').press('Tab');
  for (let i = 0; i < 60 && (await focusedId()) !== 'sit-moneyIn'; i++) await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('sit-moneyIn');

  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('8000');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('sit-costs');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('0');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('sit-incomeTaxPercent');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('12');
  await expect(answer(page).locator('.ledger-figure')).toHaveText('$2,090');
  await expect(sentence(page)).toHaveText(
    'Of $8,000 in, $8,000 is profit after costs. Tax on it comes to $2,090: $1,130 of self-employment tax, set by law, and $960 at your example 12%. Set aside $2,090 on these figures.',
  );

  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('sit-alreadyPaid');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('2090');
  await expect(sentence(page)).toContainText('What you have paid toward it covers this sum.');

  // On to Reset, by keyboard, and everything returns to the example.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#sit-moneyIn')).toHaveValue('6000');
  await expect(sentence(page)).toHaveText(US_OPENING);

  // The invoice fold on the India page opens from the keyboard too.
  await open(page, IN_PAGE);
  const summary = invoiceFold(page).locator('summary');
  await page.locator('body').press('Tab');
  for (let i = 0; i < 80 && !(await summary.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(invoiceFold(page)).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('sit-invoiced');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('150000');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('sit-arrived');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('140000');
  await expect(notes(page).first()).toContainText('Invoices minus what arrived: ₹10,000. That is not the tax on your statement.');
});

test.describe('axe finds nothing serious or critical', () => {
  for (const width of [360, 1280]) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`both editions at ${width}px, ${scheme}, with the folds open`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: scheme });
        await open(page, `${US_PAGE}#incomeTaxPercent=10`);
        await page.locator('.tool details.how summary', { hasText: 'How this is worked out' }).click();
        await expectNoBlockingAxe(page);

        await open(page, `${IN_PAGE}#taxDue=40000&arrived=160000`);
        await expect(invoiceFold(page)).toHaveAttribute('open', '');
        await page.locator('.tool details.how summary', { hasText: 'How this is worked out' }).click();
        await expectNoBlockingAxe(page);
      });
    }
  }
});
