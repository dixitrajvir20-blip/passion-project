/**
 * Card balance at the minimum payment, on the real build: each edition opens on its lesson's
 * statement with the spec's figures, the rules come from the edition and never from the currency
 * picker, links carry the figures after the #, errors are in text, and the whole thing works from
 * the keyboard alone.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';

const BASE = '/passion-project/';
const figure = (page: Page) => page.locator('.tool .result-figure-value');
const figureLabel = (page: Page) => page.locator('.tool .result-figure-label');
const results = (page: Page) => page.locator('.tool .results');
const said = (page: Page) => page.locator('.tool .results p.plain[role="status"]');

const IN_SENTENCE =
  'Paying only the minimum clears ₹20,000 in 11 years 10 months and adds ₹40,332.68 of interest, ₹60,332.68 in all. At a fixed ₹1,000 a month it clears in 2 years 11 months and adds ₹14,997.77.';
const US_SENTENCE =
  'Paying only the minimum clears $400 in 1 year 8 months and adds $89.79 of interest, $489.79 in all. At a fixed $50 a month it clears in 9 months and adds $35.97.';

for (const width of [360, 1280]) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('India opens on the lesson’s ₹20,000 statement', async ({ page }) => {
      await page.goto('in/tools/card-minimum');
      await waitForIslands(page);
      await expect(page.locator('h1')).toHaveText('Card balance at the minimum payment');
      await expect(page.locator('.scenario')).toContainText('It opens on an example: the card statement from the India lesson');
      await expect(figure(page)).toHaveText('142 months');
      await expect(figureLabel(page)).toHaveText('paying only the minimum: 11 years 10 months');
      for (const text of ['₹20,000.00', '₹700.00', '₹1,000.00', '₹19,700.00', '₹40,332.68', '₹60,332.68']) {
        await expect(results(page)).toContainText(text);
      }
      await expect(said(page)).toHaveText(IN_SENTENCE);
      await expect(page.getByLabel('Currency')).toHaveCount(0);
      await expect(page.locator('.tool select')).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
    });

    test('the United States opens on the lesson’s $400 first statement', async ({ page }) => {
      await page.goto('us/tools/card-minimum');
      await waitForIslands(page);
      await expect(page.locator('.scenario')).toContainText('It opens on an example: the first card statement from the US lesson');
      await expect(figure(page)).toHaveText('20 months');
      await expect(figureLabel(page)).toHaveText('paying only the minimum: 1 year 8 months');
      for (const text of ['$400.00', '$25.00', '$375.00', '$8.59', '$383.59', '$89.79', '$489.79']) {
        await expect(results(page)).toContainText(text);
      }
      await expect(said(page)).toHaveText(US_SENTENCE);
      await expect(page.getByLabel('Currency')).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
    });
  });
}

test('the year-by-year fold adds up to the run', async ({ page }) => {
  await page.goto('in/tools/card-minimum');
  await waitForIslands(page);
  await page.getByText('Year by year', { exact: true }).click();
  const rows = page.locator('.tool table tbody tr');
  await expect(rows).toHaveCount(12);
  await expect(rows.first()).toContainText('₹11,057.88');
  await expect(rows.first()).toContainText('₹7,740.52');
  await expect(rows.first()).toContainText('₹16,682.64');
  await expect(rows.last()).toContainText('₹1,896.88');
  await expect(rows.last()).toContainText('₹306.68');
  await expect(rows.last()).toContainText('₹0.00');
  await expect(page.locator('.tool table th[scope="col"]')).toHaveCount(4);
  await expect(page.locator('.tool table caption')).toHaveText('Paying only the minimum, year by year');
});

test('a saved currency never changes the edition’s money', async ({ page, context }) => {
  await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-US'));
  await page.goto('in/tools/card-minimum');
  await waitForIslands(page);
  await expect(results(page)).toContainText('₹40,332.68');
  await expect(results(page)).not.toContainText('$');
  // Neither read nor written.
  expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBe('en-US');
});

test.describe('links carry the figures after the #', () => {
  test('a fragment link sets the balance, and the fragment leaves the address bar', async ({ page }) => {
    await page.goto('us/tools/card-minimum#balance=1116');
    await waitForIslands(page);
    await expect(page.locator('#cm-balance')).toHaveValue('1116');
    await expect(figure(page)).toHaveText('89 months');
    expect(page.url()).not.toContain('#');
  });

  test('an old ?link still works', async ({ page }) => {
    await page.goto('us/tools/card-minimum?balance=1116');
    await waitForIslands(page);
    await expect(figure(page)).toHaveText('89 months');
  });

  test('Copy link round trip: the figures go after the #, and the link restores them', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('us/tools/card-minimum');
    await waitForIslands(page);
    await page.locator('#cm-balance').fill('1000');
    await page.locator('#cm-compare').fill('30');
    await expect(said(page)).toContainText('A fixed $30 is below the minimum due from month 2');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#balance=1000&apr=27.5&minPercent=1&minFloor=25&compare=30');
    expect(copied).not.toContain('?');
    // The rule and the interest model are the edition's, never the link's.
    expect(copied).not.toMatch(/rule=|interestBase=/);

    await page.goto(copied);
    await waitForIslands(page);
    await expect(page.locator('#cm-balance')).toHaveValue('1000');
    await expect(page.locator('#cm-compare')).toHaveValue('30');
    await expect(said(page)).toContainText('A fixed $30 is below the minimum due from month 2, so from then it would not count as on time.');
  });

  test('a blank compare from a link hides the compare sentence', async ({ page }) => {
    await page.goto('in/tools/card-minimum#compare=');
    await waitForIslands(page);
    await expect(page.locator('#cm-compare')).toHaveValue('');
    await expect(figure(page)).toHaveText('142 months');
    await expect(said(page)).toHaveText(
      'Paying only the minimum clears ₹20,000 in 11 years 10 months and adds ₹40,332.68 of interest, ₹60,332.68 in all.',
    );
  });

  test('a US link opened on the India page runs India’s rule', async ({ page }) => {
    await page.goto('in/tools/card-minimum#balance=400&apr=27.5&minPercent=1&minFloor=25&compare=50');
    await waitForIslands(page);
    await expect(results(page)).toContainText('₹');
    await expect(results(page)).toContainText('Interest for the month');
    await expect(results(page)).not.toContainText('Interest on what carried');
  });
});

test.describe('what the page says when the balance does not fall, or the numbers are not usable', () => {
  test('India at a 3% minimum: the balance grows, and the run ledger is gone', async ({ page }) => {
    await page.goto('in/tools/card-minimum');
    await waitForIslands(page);
    await page.locator('#cm-minPercent').fill('3');
    await expect(figure(page)).toHaveText('—');
    await expect(figureLabel(page)).toHaveText('the balance does not fall on this rule');
    await expect(said(page)).toContainText('On this rule the balance grows every month.');
    await expect(results(page)).toContainText('₹20,100.00');
    await expect(results(page)).not.toContainText('Total paid');
    await expect(page.getByText('Year by year', { exact: true })).toHaveCount(0);
  });

  test('India at 3.5%: the minimum only covers the interest, with no claim about RBI', async ({ page }) => {
    await page.goto('in/tools/card-minimum#minPercent=3.5');
    await waitForIslands(page);
    await expect(said(page)).toContainText('On this rule the minimum only covers the interest, so the balance stays where it is.');
    await expect(said(page)).not.toContainText('RBI');
  });

  test('a fixed amount below the minimum in month one', async ({ page }) => {
    await page.goto('in/tools/card-minimum#compare=800');
    await waitForIslands(page);
    await expect(said(page)).toContainText('A fixed ₹800 is below this month’s minimum due, so it would not count as on time.');
  });

  test('a balance under the floor is paid in one go, with no interest', async ({ page }) => {
    await page.goto('us/tools/card-minimum#balance=20');
    await waitForIslands(page);
    await expect(figure(page)).toHaveText('1 month');
    await expect(results(page)).toContainText('Whole statement paid');
    await expect(said(page)).toContainText('The minimum here covers the whole $20, so it is paid in one go by the due date, with no interest.');
  });

  test('a blank balance is an error in text, tied to the field, with no NaN or Infinity anywhere', async ({ page }) => {
    await page.goto('in/tools/card-minimum');
    await waitForIslands(page);
    const balance = page.locator('#cm-balance');
    await balance.fill('');
    const error = page.locator('#cm-balance-error');
    await expect(error).toHaveText('Enter what you owe, more than 0.');
    await expect(balance).toHaveAttribute('aria-invalid', 'true');
    await expect(balance).toHaveAttribute('aria-describedby', /cm-balance-error/);
    await expect(figure(page)).toHaveText('—');
    await expect(results(page)).not.toContainText('Owed next month');
    await expect(results(page)).not.toContainText('Total paid');
    await expect(said(page)).toHaveText('Enter what you owe, the rate, the minimum rule and the smallest minimum to see how long the minimum takes.');
    const text = await page.locator('.tool').innerText();
    expect(text).not.toMatch(/NaN|Infinity/);
  });

  test('too large an amount is refused in the edition’s grouping', async ({ page }) => {
    await page.goto('in/tools/card-minimum');
    await waitForIslands(page);
    await page.locator('#cm-minFloor').fill('2000000000');
    await expect(page.locator('#cm-minFloor-error')).toHaveText('Enter an amount up to 1,00,00,00,000.');
    await expect(figure(page)).toHaveText('—');
  });

  test('an error in the compare field hides only its sentence', async ({ page }) => {
    await page.goto('us/tools/card-minimum');
    await waitForIslands(page);
    await page.locator('#cm-compare').fill('-5');
    await expect(page.locator('#cm-compare-error')).toHaveText('Enter an amount, 0 or more, or leave it blank.');
    await expect(page.locator('#cm-compare')).toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page)).toHaveText('20 months');
    await expect(said(page)).not.toContainText('fixed');
  });
});

test('works from the keyboard alone', async ({ page }) => {
  await page.goto('us/tools/card-minimum');
  await waitForIslands(page);
  const focusedId = () => page.evaluate(() => document.activeElement?.id ?? '');

  for (let i = 0; i < 80 && (await focusedId()) !== 'cm-balance'; i++) await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('cm-balance');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('10000');

  for (const id of ['cm-apr', 'cm-minPercent', 'cm-minFloor', 'cm-compare']) {
    await page.keyboard.press('Tab');
    expect(await focusedId()).toBe(id);
  }
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('150');
  await expect(figure(page)).toHaveText('304 months');
  await expect(said(page)).toContainText('A fixed $150 is below the minimum due from month 2');

  // The year-by-year fold opens from the keyboard too.
  const onSummary = () => page.evaluate(() => document.activeElement?.tagName === 'SUMMARY' && document.activeElement.textContent === 'Year by year');
  for (let i = 0; i < 20 && !(await onSummary()); i++) await page.keyboard.press('Tab');
  expect(await onSummary()).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('.tool table tbody tr')).toHaveCount(26);

  // Back up to Reset.
  const onReset = () => page.evaluate(() => document.activeElement?.textContent === 'Reset');
  for (let i = 0; i < 20 && !(await onReset()); i++) await page.keyboard.press('Shift+Tab');
  expect(await onReset()).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#cm-balance')).toHaveValue('400');
  await expect(figure(page)).toHaveText('20 months');
});

test.describe('with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('the page still shows the example worked out', async ({ page }) => {
    await page.goto('in/tools/card-minimum');
    await expect(figure(page)).toHaveText('142 months');
    await expect(results(page)).toContainText('₹40,332.68');
    await expect(page.locator('.rules-line')).toBeVisible();
  });
});

test.describe('the rules, the terms and the lessons', () => {
  test('India prints RBI’s card directions and the CBIC notification, dated, and defines RBI and GST', async ({ page }) => {
    await page.goto('in/tools/card-minimum');
    const rules = page.locator('.rules-line');
    await expect(rules.locator('.rules-lead')).toHaveText('Rules as of 22 September 2026:');
    await expect(rules.locator('a[href="https://rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=13155"]')).toHaveCount(3);
    await expect(rules.locator('a[href^="https://cbic-gst.gov.in/"]')).toHaveCount(1);
    await expect(rules).toContainText('para 23(2)');
    await expect(rules).not.toContainText('Business Lab lesson');
    const terms = page.locator('.tool-terms');
    for (const term of ['Minimum amount due', 'RBI (Reserve Bank of India)', 'GST (Goods and Services Tax)']) await expect(terms).toContainText(term);
    await expect(page.locator('.related')).toContainText('Every loan as a yearly rate: apps and cards');
  });

  test('the US prints the CFPB report, Regulation Z and the grace-period page, and defines APR and CFPB', async ({ page }) => {
    await page.goto('us/tools/card-minimum');
    const rules = page.locator('.rules-line');
    await expect(rules.locator('.rules-lead')).toHaveText('Rules as of 22 September 2026:');
    await expect(rules.locator('a[href="https://files.consumerfinance.gov/f/documents/cfpb_consumer-credit-card-market-report_2025.pdf"]')).toHaveCount(3);
    await expect(rules.locator('a[href="https://www.consumerfinance.gov/rules-policy/regulations/1026/m1/"]')).toHaveCount(1);
    await expect(rules.locator('a[href="https://www.consumerfinance.gov/rules-policy/regulations/1026/7/"]')).toHaveCount(1);
    await expect(rules.locator('a[href*="what-is-a-grace-period"]')).toHaveCount(1);
    await expect(rules).not.toContainText('Business Lab lesson');
    const terms = page.locator('.tool-terms');
    for (const term of ['Statement balance', 'Minimum payment', 'APR (annual percentage rate)', 'CFPB (Consumer Financial Protection Bureau)']) {
      await expect(terms).toContainText(term);
    }
    await expect(page.locator('.related')).toContainText('Starting a credit file without paying interest');
  });

  test('the edition menu goes to India’s card tool and to Europe’s tools index', async ({ page }) => {
    await page.goto('us/tools/card-minimum');
    const hrefOf = (region: string) => page.locator(`.region-tabs a[data-region="${region}"]`).getAttribute('href');
    expect(await hrefOf('in')).toMatch(/\/in\/tools\/card-minimum$/);
    expect(await hrefOf('eu')).toMatch(/\/eu\/tools$/);
    const missing = await page.goto('eu/tools/card-minimum');
    expect(missing?.status()).toBe(404);
  });

  for (const edition of ['in', 'us']) {
    test(`${edition}/tools/card-minimum has no serious or critical accessibility issues, with every fold open`, async ({ page }) => {
      await page.goto(`${edition}/tools/card-minimum`);
      await waitForIslands(page);
      await page.getByText('Year by year', { exact: true }).click();
      await page.getByText('How this is worked out', { exact: true }).click();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(blocking, blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')).toEqual([]);
    });
  }
});

test.describe('the lessons hand off to it with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  for (const [edition, lesson] of [
    ['us', 'money-basics/credit-file'],
    ['in', 'protect-your-money/cost-of-borrowing'],
  ]) {
    test(`${edition}/learn/${lesson} links to the card tool`, async ({ page }) => {
      await page.goto(`${edition}/learn/${lesson}`);
      const link = page.locator(`.tool-handoffs a[href="${BASE}${edition}/tools/card-minimum"]`);
      await expect(link).toHaveText('Try your own numbers: how long does the minimum take?');
    });
  }
});
