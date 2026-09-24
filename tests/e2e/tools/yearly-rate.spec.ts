/**
 * A loan's cost as a yearly rate, India only: the lesson's example, the phone plan in both
 * first-repayment timings, the link fragment round trip, links from outside (old ?query, a bad
 * select value), keyboard-only use, the fixed currency, the rules and terms, and axe at 360 and
 * 1280. Europe and the US have no page and no row for it.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';

const PAGE = 'in/tools/yearly-rate';
const headline = (page: Page) => page.locator('.tool .result-figure-value');
const row = (page: Page, label: string | RegExp) =>
  page.locator('.tool .ledger-row').filter({ has: page.locator('.ledger-label', { hasText: label }) }).locator('.ledger-figure');
const sentence = (page: Page) => page.locator('.tool .yr-sentence');

async function open(page: Page, path = PAGE) {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await waitForIslands(page);
}

/** Open the page afresh: a second link to the same page differs only after the #, which a browser would not reload. */
async function reopen(page: Page, path: string) {
  await page.goto('about:blank');
  await open(page, path);
}

async function enterPhone(page: Page) {
  await page.getByLabel('Amount borrowed').fill('12000');
  await page.getByLabel('Fees and charges at the start').fill('600');
  await page.getByLabel('Each repayment').fill('4000');
  await page.getByLabel('Number of repayments').fill('3');
  await page.getByLabel('Length of each period').selectOption({ label: 'A month' });
}

test.describe('in/tools/yearly-rate', () => {
  test('opens on the lesson’s seven-day app loan: ₹500 for the week, 521.4% a year', async ({ page }) => {
    await open(page);
    await expect(page.locator('h1')).toHaveText("A loan's cost as a yearly rate");
    await expect(page.locator('.scenario')).toContainText('a ₹5,000 app loan from the lesson, with ₹5,500 due back seven days later.');
    await expect(headline(page)).toHaveText('521.4%');
    await expect(page.locator('.tool .result-figure-label')).toHaveText('a year, worked out from the figures above');
    await expect(row(page, 'Reaches you')).toHaveText('₹5,000');
    await expect(row(page, 'Repaid after 7 days')).toHaveText('₹5,500');
    await expect(row(page, 'Cost of borrowing')).toHaveText('₹500');
    await expect(row(page, 'Rate for the 7 days')).toHaveText('10%');
    await expect(row(page, 'Periods in a year, about 52.14')).toHaveText('×365 ÷ 7');
    await expect(page.locator('.tool .ledger-total .ledger-figure')).toHaveText('521.4%');
    await expect(sentence(page)).toHaveText(
      'Getting ₹5,000 and repaying ₹5,500 after 7 days costs ₹500: 10% for the 7 days, which is 521.4% a year.',
    );
    await expect(sentence(page)).toHaveAttribute('role', 'status');
    await expect(page.locator('.tool')).toContainText('A regulated loan’s Key Facts Statement prints its APR. Set this beside it.');
    await expect(page.locator('#yr-days')).toHaveCount(0);
  });

  test('the “no-cost” phone is 31.3% a year, and 64.3% with the first part paid on the day', async ({ page }) => {
    await open(page);
    await enterPhone(page);
    await expect(headline(page)).toHaveText('31.3%');
    await expect(row(page, 'Repaid, 3 × ₹4,000, the first one period after')).toHaveText('₹12,000');
    await expect(sentence(page)).toHaveText(
      'Getting ₹11,400 and repaying 3 × ₹4,000, one each month, costs ₹600: 2.609% a month on what is still owed, which is 31.3% a year.',
    );

    await page.getByLabel('First repayment').selectOption({ label: 'On the day the money arrives' });
    await expect(headline(page)).toHaveText('64.3%');
    await expect(row(page, 'First repayment, paid on the day')).toHaveText('−₹4,000');
    await expect(row(page, 'Reaches you')).toHaveText('₹7,400');

    // How this is worked out: the table, repayment by repayment, ending at ₹0.
    await page.locator('.tool .how summary').click();
    const table = page.getByRole('region', { name: 'Repayment by repayment' });
    await expect(table.locator('tbody tr')).toHaveCount(3);
    await expect(table.locator('tbody tr').first()).toContainText('On the day');
    await expect(table.locator('tbody tr').last().locator('td').last()).toHaveText('₹0');
    await expect(page.locator('.tool .how')).toContainText('it compounds to 87.1% over a year');
  });

  test('errors are in text under the field, and no rate shows while one stands', async ({ page }) => {
    await open(page);
    const amount = page.getByLabel('Amount borrowed');
    await amount.fill('');
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#yr-amount-error')).toHaveText('Enter the amount borrowed, more than 0.');
    await expect(amount).toHaveAttribute('aria-describedby', /yr-amount-error/);
    await expect(headline(page)).toHaveText('—');
    await expect(sentence(page)).toHaveText('Fix the figure marked above to see the yearly rate.');

    await amount.fill('5000');
    await page.getByLabel('First repayment').selectOption('on-the-day');
    await expect(page.getByLabel('First repayment')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#yr-first-error')).toContainText('nothing is borrowed');
    await expect(headline(page)).toHaveText('—');

    await page.getByLabel('First repayment').selectOption('later');
    await page.getByLabel('Number of repayments').fill('2.7');
    await expect(page.locator('#yr-count-note')).toHaveText('Counted as 2: repayments come whole.');
    await expect(page.getByLabel('Number of repayments')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('another number of days opens its own field, and 7 days gives the same answer', async ({ page }) => {
    await open(page);
    await page.getByLabel('Length of each period').selectOption('days');
    await expect(page.getByLabel('Days in each period')).toHaveValue('7');
    await expect(headline(page)).toHaveText('521.4%');
    await page.getByLabel('Days in each period').fill('28');
    await expect(headline(page)).toHaveText('130.4%');
    await expect(row(page, /^Periods in a year/)).toHaveText('×365 ÷ 28');
  });

  test('keyboard only: type, choose, reset', async ({ page }) => {
    await open(page);
    // Reach the first field from the page's own tab order, starting at the crumb.
    await page.locator('.crumb a').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Amount borrowed')).toBeFocused();

    const typeInto = async (value: string) => {
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(value);
      await page.keyboard.press('Tab');
    };
    await typeInto('12000');
    await expect(page.getByLabel('Fees and charges at the start')).toBeFocused();
    await typeInto('600');
    await typeInto('4000');
    await typeInto('3');
    await expect(page.getByLabel('Length of each period')).toBeFocused();
    // Type-to-select changes a closed select on every platform; an arrow key opens the menu on macOS.
    await page.keyboard.press('a');
    await expect(page.getByLabel('Length of each period')).toHaveValue('month');
    await expect(headline(page)).toHaveText('31.3%');

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('First repayment')).toBeFocused();
    await page.keyboard.press('o');
    await expect(page.getByLabel('First repayment')).toHaveValue('on-the-day');
    await expect(headline(page)).toHaveText('64.3%');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(headline(page)).toHaveText('521.4%');
    await expect(page.getByLabel('Amount borrowed')).toHaveValue('5000');
  });

  test('a # link restores the inputs and the fragment leaves the address bar', async ({ page }) => {
    await open(page, `${PAGE}#amount=12000&fee=600&repayment=4000&count=3&period=month&first=later`);
    await expect(page.getByLabel('Amount borrowed')).toHaveValue('12000');
    await expect(page.getByLabel('Length of each period')).toHaveValue('month');
    await expect(page.getByLabel('First repayment')).toHaveValue('later');
    await expect(headline(page)).toHaveText('31.3%');
    expect(page.url()).not.toContain('#');
  });

  test('the old ?query form of the same link also works', async ({ page }) => {
    await open(page, `${PAGE}?amount=12000&fee=600&repayment=4000&count=3&period=month&first=later`);
    await expect(page.getByLabel('Number of repayments')).toHaveValue('3');
    await expect(headline(page)).toHaveText('31.3%');
  });

  test('a link value outside the select’s options falls back to the default', async ({ page }) => {
    await open(page, `${PAGE}#period=evil&first=__proto__&amount=12000`);
    await expect(page.getByLabel('Length of each period')).toHaveValue('week');
    await expect(page.getByLabel('First repayment')).toHaveValue('later');
    await expect(page.getByLabel('Amount borrowed')).toHaveValue('12000');
    await expect(page.locator('#yr-days')).toHaveCount(0);
  });

  test('Copy link writes the figures after the # and the link round-trips', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await enterPhone(page);
    await page.getByLabel('First repayment').selectOption('on-the-day');
    await expect(headline(page)).toHaveText('64.3%');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.tool .copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#amount=12000&fee=600&repayment=4000&count=3&period=month&first=on-the-day');
    expect(copied).not.toContain('?');
    expect(copied).not.toContain('days=');

    await page.goto('about:blank');
    await page.goto(copied);
    await waitForIslands(page);
    await expect(page.getByLabel('Fees and charges at the start')).toHaveValue('600');
    await expect(page.getByLabel('First repayment')).toHaveValue('on-the-day');
    await expect(headline(page)).toHaveText('64.3%');
  });

  test('no currency field: a currency saved on another tool cannot change the ₹', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-US'));
    await open(page);
    await expect(page.locator('.tool select')).toHaveCount(2);
    await expect(page.getByLabel('Currency')).toHaveCount(0);
    await expect(row(page, 'Cost of borrowing')).toHaveText('₹500');
    await expect(page.locator('.tool .results')).not.toContainText('$');
  });

  test('RulesLine text, source links and ToolTerms render', async ({ page }) => {
    await open(page);
    const rules = page.locator('.rules-line');
    await expect(rules.locator('.rules-lead')).toHaveText('Method as of 22 September 2026:');
    await expect(rules.locator('li')).toHaveCount(1);
    await expect(rules).toContainText('The APR on a Key Facts Statement is worked out on the amount that reaches you, by the IRR and reducing-balance method');
    await expect(rules.locator('a')).toHaveAttribute('href', 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12942');
    await expect(rules.locator('a')).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('.tool-terms dt')).toHaveText([
      'APR (annual percentage rate)',
      'Key Facts Statement',
      'GST (Goods and Services Tax)',
      'RBI (Reserve Bank of India)',
    ]);
    await expect(page.locator('.related')).toContainText('Every loan as a yearly rate: apps and cards');
  });

  test('works out the RBI illustration in How this is worked out', async ({ page }) => {
    await open(page);
    await page.locator('.tool .how summary').click();
    await expect(page.locator('.tool .how')).toContainText(
      'instalments of ₹970 (₹969.73 before rounding) gives 17.07%. Here, with ₹969.73, it shows 17.1%.',
    );
    await expect(page.locator('.tool .how')).toContainText(
      'The illustration labels that line “Annual Percentage rate – Effective annualized interest rate”.',
    );
    await expect(page.locator('.tool .how')).toContainText('with more than one repayment, a table below shows it repayment by repayment');
    await expect(page.locator('.tool .how')).toContainText('works out to 31.7% a year here');
    await expect(page.locator('.tool .how')).not.toContainText('Repayment by repayment');
  });

  test('a hugely negative figure from a link gets its own message, not “or less”', async ({ page }) => {
    await open(page, `${PAGE}#amount=-1e400`);
    await expect(page.locator('#yr-amount-error')).toHaveText('Enter the amount borrowed, more than 0.');
    await reopen(page, `${PAGE}#fee=-1e400`);
    await expect(page.locator('#yr-fee-error')).toHaveText('Fees cannot be below 0. Type 0 if there are none.');
    await reopen(page, `${PAGE}#amount=1e400`);
    await expect(page.locator('#yr-amount-error')).toHaveText('Enter an amount of ₹10,00,00,00,00,000 or less.');
  });

  test('fees above the amount: the figure below 0 carries a note saying nothing reaches you', async ({ page }) => {
    await open(page, `${PAGE}#fee=6000`);
    const reaches = page.locator('.tool .ledger-row').filter({ has: page.locator('.ledger-label', { hasText: 'Reaches you' }) });
    await expect(reaches.locator('.ledger-figure')).toHaveText('−₹1,000');
    await expect(reaches.locator('.ledger-note')).toHaveText('The fees and charges are more than the amount, so nothing reaches you.');
    await expect(sentence(page)).toContainText('nothing reaches you');
    await expect(headline(page)).toHaveText('—');
  });

  test('a long schedule at a high rate leaves the table out rather than print one that does not add up', async ({ page }) => {
    await open(page, `${PAGE}#amount=100000&fee=0&repayment=3000.5&count=600&period=month&first=later`);
    await expect(headline(page)).toHaveText('36%');
    await page.locator('.tool .how summary').click();
    await expect(page.locator('.tool .how')).not.toContainText('Repayment by repayment');
    await expect(page.locator('.tool .how')).toContainText(
      'At this rate over this many repayments, a table rounded to the paisa would not add up, so it is left out.',
    );
    // An ordinary loan still gets its table.
    await reopen(page, `${PAGE}#amount=150000&fee=0&repayment=4910.81&count=36&period=month&first=later`);
    await page.locator('.tool .how summary').click();
    await expect(page.getByRole('region', { name: 'Repayment by repayment' }).locator('tbody tr')).toHaveCount(36);
    await expect(page.locator('.tool .how')).not.toContainText('would not add up');
  });
});

test.describe('Europe and the US', () => {
  for (const edition of ['eu', 'us']) {
    test(`${edition} has no yearly-rate page and its tools index does not list it`, async ({ page }) => {
      const response = await page.goto(`${edition}/tools/yearly-rate`);
      expect(response?.status()).toBe(404);
      await page.goto(`${edition}/tools`);
      await expect(page.locator('a[href$="/tools/yearly-rate"]')).toHaveCount(0);
    });
  }

  test('India’s tools index lists it, and the edition menu sends Europe and the US to their tools index', async ({ page }) => {
    await page.goto('in/tools');
    await expect(page.locator('main a[href$="/in/tools/yearly-rate"]').first()).toBeVisible();
    await page.goto(PAGE);
    expect(await page.locator('.region-tabs a[data-region="eu"]').getAttribute('href')).toMatch(/\/eu\/tools$/);
    expect(await page.locator('.region-tabs a[data-region="us"]').getAttribute('href')).toMatch(/\/us\/tools$/);
  });
});

for (const width of [360, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('no serious or critical axe issue, with How this is worked out open on the phone plan', async ({ page }) => {
      await open(page);
      await expect(headline(page)).toHaveText('521.4%');
      const scan = async () => {
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(blocking, blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')).toEqual([]);
      };
      await scan();
      await enterPhone(page);
      await page.getByLabel('Amount borrowed').fill('');
      await expect(page.locator('#yr-amount-error')).toBeVisible();
      await scan();
      await page.getByLabel('Amount borrowed').fill('12000');
      await expect(headline(page)).toHaveText('31.3%');
      await page.locator('.tool .how summary').click();
      await scan();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
