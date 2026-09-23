/**
 * rent-share on the real build: the Europe edition opens on the lesson's room with the spec's
 * figures, the loss style only where rent and bills pass net pay, the 40% line from the edition
 * whatever lp:locale says, the day-one fold, the fragment link, keyboard-only use, the lesson and
 * budget links, and axe with the fold closed and open. The pins are in
 * docs/research/interactive-tools-revised.json (rent-share).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';
import { TOOLS } from '../../../src/lib/tools';

const BASE = '/passion-project/';
const PAGE = 'eu/tools/rent-share';

const figure = (page: Page) => page.locator('.tool .results .result-figure-value');
const mainRow = (page: Page) => page.locator('.tool .results .ledger-total');
const fact = (page: Page, label: string) =>
  page
    .locator('.tool .results .result-fact')
    .filter({ has: page.locator('.result-fact-label').getByText(label, { exact: true }) })
    .locator('.result-fact-value');
const sentence = (page: Page) => page.locator('.tool .results p.plain');
const fold = (page: Page) => page.locator('.tool details', { has: page.locator('summary', { hasText: 'What moving in costs before the first payday' }) });
const LINE_FACT = '40% of this net pay, the line Eurostat uses for households';
const GAP_FACT = 'Rent and bills against that line';
const TOO_BIG = 'Enter a smaller amount.';

/** How far the page scrolls sideways: 0 or less means it reflows (WCAG 1.4.10). */
const sidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')).toEqual([]);
}

test.describe('rent-share opens on the lesson’s room', () => {
  for (const width of [360, 1280]) {
    test(`at ${width}px: 53.3%, €525 left, €150 over the line, nothing loss-styled, the fold closed`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PAGE);
      await waitForIslands(page);
      await expect(page.locator('h1')).toHaveText('Rent and bills as a share of net pay');

      await expect(figure(page)).toHaveText('53.3%');
      await expect(page.locator('.tool .results .result-figure-label')).toHaveText('of net pay on rent and bills');
      await expect(mainRow(page).locator('.ledger-label')).toHaveText('Left after rent and bills');
      await expect(mainRow(page).locator('.ledger-figure')).toHaveText('€525');
      await expect(fact(page, 'Rent and bills together')).toHaveText('€600');
      await expect(fact(page, LINE_FACT)).toHaveText('€450');
      await expect(fact(page, GAP_FACT)).toHaveText('€150 over it');
      await expect(sentence(page)).toHaveText('Rent and bills of €600 take 53.3% of your €1,125 net pay, leaving €525 for everything else.');
      await expect(page.locator('.is-loss')).toHaveCount(0);

      // The monthly ledger, line by line.
      const rows = page.locator('.tool .results .ledger-row');
      await expect(rows.locator('.ledger-label')).toHaveText(['Net pay', 'Rent', 'After rent', 'Bills', 'Left after rent and bills']);
      await expect(rows.locator('.ledger-figure')).toHaveText(['€1,125', '−€520', '€605', '−€80', '€525']);

      await expect(page.locator('.tool .results p.notice')).toContainText('It is a statistic about households, not a limit set for you.');

      // Closed until asked for; opening it shows day one.
      await expect(fold(page)).not.toHaveAttribute('open', /.*/);
      await fold(page).locator('summary').click();
      await expect(fold(page).locator('.ledger-row .ledger-label')).toHaveText([
        'Deposit',
        "First month's rent in advance",
        'Moving and connecting the bills',
        'Due before the first payday',
      ]);
      await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,700');
      await expect(fold(page).locator('.result-fact-value').last()).toHaveText('€500 more than saved');
      await expect(fold(page).locator('p.plain')).toHaveText('Moving in takes €1,700 before the first payday, €500 more than the €1,200 saved.');
      await expect(page.locator('.is-loss')).toHaveCount(0);

      // Nothing on the page scrolls sideways.
      expect(await sidewaysScroll(page)).toBeLessThanOrEqual(0);
    });
  }

  test('the page is indexed as a calculator and says which example it opens on', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-pagefind-meta]')).toHaveAttribute('data-pagefind-meta', 'kind:Calculator');
    await expect(page.locator('.scenario')).toHaveText(
      "It opens on an example: the lesson's room: €520 a month plus about €80 of bills, on €1,125 net pay. Change any number to match your own.",
    );
  });

  test('India and the United States have no rent-share page', async ({ page }) => {
    for (const edition of ['in', 'us']) {
      const response = await page.goto(`${edition}/tools/rent-share`);
      expect(response?.status(), edition).toBe(404);
    }
  });
});

test.describe('rent-share results by case', () => {
  test('rent and bills above net pay: only the Figure and the main row are loss-styled', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=500&rent=520&bills=80`);
    await waitForIslands(page);
    await expect(page.locator('#rs-netPay')).toHaveValue('500');
    await expect(figure(page)).toHaveText('120.0%');
    await expect(figure(page)).toHaveClass(/is-loss/);
    await expect(mainRow(page).locator('.ledger-label')).toHaveText('Rent and bills above net pay');
    await expect(mainRow(page).locator('.ledger-figure')).toHaveText('€100');
    await expect(mainRow(page).locator('.ledger-figure')).toHaveClass(/is-loss/);
    await expect(page.locator('.is-loss')).toHaveCount(2);
    await expect(fact(page, LINE_FACT)).toHaveText('€200');
    await expect(fact(page, LINE_FACT)).not.toHaveClass(/is-loss/);
    await expect(fact(page, GAP_FACT)).toHaveText('€400 over it');
    await expect(fact(page, GAP_FACT)).not.toHaveClass(/is-loss/);
    await expect(sentence(page)).toHaveText('Rent and bills of €600 are €100 more than your €500 net pay.');
  });

  test('an old ?query link still fills the fields', async ({ page }) => {
    await page.goto(`${PAGE}?netPay=1240&rent=430&bills=70`);
    await waitForIslands(page);
    await expect(page.locator('#rs-netPay')).toHaveValue('1240');
    await expect(page.locator('#rs-rent')).toHaveValue('430');
    await expect(page.locator('#rs-bills')).toHaveValue('70');
    await expect(figure(page)).toHaveText('40.3%');
    await expect(fact(page, GAP_FACT)).toHaveText('€4 over it');
  });

  test('exactly at the line, and a cent either side of it', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=1125&rent=400&bills=50`);
    await waitForIslands(page);
    await expect(figure(page)).toHaveText('40.0%');
    await expect(fact(page, GAP_FACT)).toHaveText("exactly at it; Eurostat's definition counts only more than 40%");

    await open(page, `${PAGE}#netPay=1125&rent=400&bills=50.01`);
    await expect(figure(page)).toHaveText('just over 40%');
    await expect(fact(page, GAP_FACT)).toHaveText('€0.01 over it');
    await expect(sentence(page)).toHaveText(
      'Rent and bills of €450.01 take just over 40% of your €1,125 net pay, leaving €674.99 for everything else.',
    );

    await open(page, `${PAGE}#netPay=1125.01&rent=400&bills=50`);
    await expect(figure(page)).toHaveText('just under 40%');
    await expect(fact(page, GAP_FACT)).toHaveText('less than €0.01 under it');
  });

  test('rent and bills equal to net pay leave nothing, without the loss style', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=600&rent=520&bills=80`);
    await waitForIslands(page);
    await expect(figure(page)).toHaveText('100.0%');
    await expect(sentence(page)).toHaveText('Rent and bills of €600 take all of your €600 net pay, leaving nothing for anything else.');
    await expect(page.locator('.is-loss')).toHaveCount(0);
  });

  test('net pay of 0: an error in text, no Figure, the day-one fold still works', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=0`);
    await waitForIslands(page);
    await expect(page.locator('#rs-netPay-error')).toHaveText('Enter your net pay a month, more than 0.');
    await expect(page.locator('#rs-netPay')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#rs-netPay')).toHaveAttribute('aria-describedby', /rs-netPay-error/);
    await expect(figure(page)).toHaveCount(0);
    await expect(fact(page, LINE_FACT)).toHaveCount(0);
    await expect(fact(page, GAP_FACT)).toHaveCount(0);
    await expect(mainRow(page).locator('.ledger-figure')).toHaveText('—');
    await expect(sentence(page)).toHaveText('Enter your net pay a month, more than 0, to see what share rent and bills take.');
    await fold(page).locator('summary').click();
    await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,700');
  });

  test('a net pay that rounds to 0 cents is the same error, and the sentence agrees with the field', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=0.001`);
    await waitForIslands(page);
    await expect(page.locator('#rs-netPay-error')).toHaveText('Enter your net pay a month, more than 0.');
    await expect(page.locator('#rs-netPay')).toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page)).toHaveCount(0);
    await expect(mainRow(page).locator('.ledger-figure')).toHaveText('—');
    await expect(sentence(page)).toHaveText('Enter your net pay a month, more than 0, to see what share rent and bills take.');
  });

  test('a negative net pay from a link is the same error', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=-100`);
    await waitForIslands(page);
    await expect(page.locator('#rs-netPay-error')).toHaveText('Enter your net pay a month, more than 0.');
    await expect(figure(page)).toHaveCount(0);
  });

  test('a negative rent is an error and counts as 0', async ({ page }) => {
    await page.goto(PAGE);
    await waitForIslands(page);
    await page.locator('#rs-rent').fill('-5');
    await expect(page.locator('#rs-rent-error')).toHaveText('Enter 0 or more.');
    await expect(page.locator('#rs-rent')).toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page)).toHaveText('7.1%');
  });

  test('with no rent and no bills, it asks for them', async ({ page }) => {
    await page.goto(`${PAGE}#rent=0&bills=`);
    await waitForIslands(page);
    await expect(sentence(page)).toHaveText('Enter the rent and bills to see what share of your €1,125 net pay they take.');
    await expect(page.locator('#rs-bills-error')).toHaveCount(0);
  });
});

test.describe('amounts too large to work in exact cents', () => {
  test('a huge net pay from a link is a field error, and nothing prints ∞ or NaN', async ({ page }) => {
    await open(page, `${PAGE}#netPay=1e307`);
    await expect(page.locator('#rs-netPay-error')).toHaveText(TOO_BIG);
    await expect(page.locator('#rs-netPay')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#rs-netPay')).toHaveAttribute('aria-describedby', /rs-netPay-error/);
    await expect(figure(page)).toHaveCount(0);
    await expect(fact(page, LINE_FACT)).toHaveCount(0);
    await expect(sentence(page)).toHaveText('Enter a smaller net pay to see what share rent and bills take.');
    await expect(page.locator('.tool')).not.toContainText(/∞|NaN/);
  });

  test('a huge rent from a link is a field error and counts as 0', async ({ page }) => {
    await open(page, `${PAGE}#rent=1e307`);
    await expect(page.locator('#rs-rent-error')).toHaveText(TOO_BIG);
    await expect(page.locator('#rs-rent')).toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page)).toHaveText('7.1%');
    await expect(sentence(page)).toHaveText('Rent and bills of €80 take 7.1% of your €1,125 net pay, leaving €1,045 for everything else.');
    await fold(page).locator('summary').click();
    await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,180');
    await expect(page.locator('.tool')).not.toContainText(/∞|NaN/);
  });

  test('a huge net pay and rent together: both fields in error, and nothing prints ∞ or NaN', async ({ page }) => {
    await open(page, `${PAGE}#netPay=1e307&rent=1e307`);
    await expect(page.locator('#rs-netPay-error')).toHaveText(TOO_BIG);
    await expect(page.locator('#rs-netPay')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#rs-rent-error')).toHaveText(TOO_BIG);
    await expect(page.locator('#rs-rent')).toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page)).toHaveCount(0);
    await expect(page.locator('.tool')).not.toContainText(/∞|NaN/);
  });

  test('typed: one cent above the largest amount is an error, the largest is worked', async ({ page }) => {
    await page.goto(PAGE);
    await waitForIslands(page);
    await page.locator('#rs-netPay').fill('100000000000.01');
    await expect(page.locator('#rs-netPay-error')).toHaveText(TOO_BIG);
    await expect(figure(page)).toHaveCount(0);
    await page.locator('#rs-netPay').fill('100000000000');
    await expect(page.locator('#rs-netPay-error')).toHaveCount(0);
    await expect(page.locator('#rs-netPay')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page)).toHaveText('0.0%');
    await expect(page.locator('.tool')).not.toContainText(/∞|NaN/);
  });
});

test.describe('rent-share reflows: no sideways scroll in the states the spec defines', () => {
  const cases: [string, number[]][] = [
    ['#netPay=1125&rent=400&bills=50', [320, 360, 390]],
    ['#netPay=1125.01&rent=400&bills=50', [320, 360]],
    ['#deposit=99999999999&saved=0', [320, 360]],
    ['#netPay=99999999999&rent=1&bills=0', [320, 360]],
    ['#netPay=500&rent=520&bills=80', [320, 360]],
    ['#netPay=0.01&rent=99999999999&bills=99999999999', [320]],
    ['#netPay=99999999999.99&rent=0.01&bills=0.01', [320]],
  ];
  for (const [hash, widths] of cases) {
    for (const width of widths) {
      test(`${hash} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, `${PAGE}${hash}`);
        await expect(figure(page).or(page.locator('#rs-netPay-error'))).toBeVisible();
        expect(await sidewaysScroll(page)).toBeLessThanOrEqual(0);
        // Every ledger figure stays inside the results panel.
        const outside = await page.evaluate(() => {
          const panel = document.querySelector('.tool .results')!.getBoundingClientRect();
          return [...document.querySelectorAll('.tool .results .ledger-figure, .tool .results .result-fact-value')]
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.right > panel.right + 0.5).length;
        });
        expect(outside).toBe(0);
      });
    }
  }

  for (const width of [360, 1280]) {
    test(`at ${width}px an ordinary figure is never split across lines to make room for its label`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, `${PAGE}#saved=1700`);
      await fold(page).locator('summary').click();
      const split = await page.evaluate(() =>
        [...document.querySelectorAll('.tool .ledger-figure, .tool .result-fact-value, .tool .result-figure-value')]
          .filter((el) => /^[−+]?€[\d,.]+$|^[\d.]+%$/.test(el.textContent ?? ''))
          .filter((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1;
          })
          .map((el) => el.textContent),
      );
      expect(split).toEqual([]);
    });
  }
});

test.describe('the day-one fold', () => {
  test('a first-month value outside the select’s options falls back to yes, and the link opens the fold', async ({ page }) => {
    await page.goto(`${PAGE}#firstMonthUpfront=evil`);
    await waitForIslands(page);
    await expect(fold(page)).toHaveAttribute('open', '');
    await expect(page.locator('#rs-firstMonthUpfront')).toHaveValue('yes');
    await expect(page.locator('#rs-firstMonthUpfront option:checked')).toHaveText('Yes, with the deposit');
    await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,700');
  });

  test('a link to day-one figures opens the fold on them', async ({ page }) => {
    await page.goto(`${PAGE}#deposit=0&firstMonthUpfront=no&moveCosts=0&saved=100`);
    await waitForIslands(page);
    await expect(fold(page)).toHaveAttribute('open', '');
    await expect(fold(page).locator('.ledger-row .ledger-label')).toHaveText(['Due before the first payday']);
    await expect(fold(page).locator('p.plain')).toHaveText('Nothing is entered as due before the first payday.');
    // The monthly answer is untouched by anything in the fold.
    await expect(figure(page)).toHaveText('53.3%');
  });

  test('covered, exact and nothing saved', async ({ page }) => {
    await page.goto(`${PAGE}#firstMonthUpfront=no`);
    await waitForIslands(page);
    await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,180');
    await expect(fold(page).locator('.result-fact-value').last()).toHaveText('covered, €20 left');
    await expect(fold(page).locator('p.plain')).toHaveText('Moving in takes €1,180 before the first payday; the €1,200 saved covers it, with €20 left.');

    await open(page, `${PAGE}#saved=1700`);
    await expect(fold(page).locator('.result-fact-value').last()).toHaveText('exactly what is saved');
    await expect(fold(page).locator('p.plain')).toHaveText('Moving in takes €1,700 before the first payday, exactly the €1,700 saved.');

    await open(page, `${PAGE}#saved=0`);
    await expect(fold(page).locator('p.plain')).toHaveText('Moving in takes €1,700 before the first payday, and nothing is entered as saved yet.');
  });
});

test.describe('rent-share keeps the edition’s currency and its line', () => {
  test('no currency field, and a saved ₹ from another edition changes nothing', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-IN'));
    await page.goto(PAGE);
    await waitForIslands(page);
    await expect(page.getByLabel('Currency')).toHaveCount(0);
    await expect(page.locator('.tool select')).toHaveCount(1); // the first-month select only
    await expect(figure(page)).toHaveText('53.3%');
    await expect(mainRow(page).locator('.ledger-figure')).toHaveText('€525');
    await expect(fact(page, LINE_FACT)).toHaveText('€450');
    expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBe('en-IN');
  });

  test('the line under the tool says where the 40% comes from and when it was checked, never calling it a rule', async ({ page }) => {
    await page.goto(PAGE);
    const line = page.locator('.rules-line');
    await expect(line.locator('.rules-lead')).toHaveText('Checked 22 September 2026:');
    await expect(line.locator('li')).toHaveCount(1);
    await expect(line.locator('li')).toContainText('not a limit');
    await expect(line.getByRole('link', { name: 'Eurostat, Glossary: Housing cost overburden rate' })).toHaveAttribute(
      'href',
      'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Housing_cost_overburden_rate',
    );
    await expect(line).not.toContainText('Rules');
    const terms = page.locator('.tool-terms dt');
    await expect(terms).toHaveText(['Net pay', 'Housing cost overburden', 'Rental deposit']);
  });
});

test.describe('the rent-share link', () => {
  test('Copy link carries all seven fields after the #, and no query', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    await waitForIslands(page);
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).not.toContain('?');
    expect(new URL(copied).hash).toBe('#netPay=1125&rent=520&bills=80&deposit=1040&firstMonthUpfront=yes&moveCosts=140&saved=1200');
  });

  test('a copied link round-trips: the figures come back, and leave the address bar', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    await waitForIslands(page);
    await page.locator('#rs-netPay').fill('900');
    await fold(page).locator('summary').click();
    await page.locator('#rs-saved').fill('1500');
    await page.locator('#rs-firstMonthUpfront').selectOption('no');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).hash).toBe('#netPay=900&rent=520&bills=80&deposit=1040&firstMonthUpfront=no&moveCosts=140&saved=1500');

    await open(page, copied);
    await expect(page.locator('#rs-netPay')).toHaveValue('900');
    await expect(figure(page)).toHaveText('66.7%');
    await expect(mainRow(page).locator('.ledger-figure')).toHaveText('€300');
    await expect(fold(page)).toHaveAttribute('open', '');
    await expect(page.locator('#rs-firstMonthUpfront')).toHaveValue('no');
    await expect(page.locator('#rs-saved')).toHaveValue('1500');
    await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,180');
    expect(page.url()).not.toContain('#');
  });
});

test('rent-share works by keyboard alone', async ({ page }) => {
  await page.goto(PAGE);
  await waitForIslands(page);

  // Tab from the top of the page until net pay has focus: it must be reachable without a pointer.
  const focusedId = () => page.evaluate(() => document.activeElement?.id ?? '');
  for (let i = 0; i < 60 && (await focusedId()) !== 'rs-netPay'; i++) await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('rs-netPay');

  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('900');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('rs-rent');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('rs-bills');
  await expect(figure(page)).toHaveText('66.7%');
  await expect(sentence(page)).toHaveText('Rent and bills of €600 take 66.7% of your €900 net pay, leaving €300 for everything else.');

  // Into the day-one fold: open it from its summary, then change the select by typing.
  const summary = fold(page).locator('summary');
  for (let i = 0; i < 20 && !(await summary.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fold(page)).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('rs-deposit');
  await page.keyboard.press('Tab');
  expect(await focusedId()).toBe('rs-firstMonthUpfront');
  await page.keyboard.press('n');
  await expect(page.locator('#rs-firstMonthUpfront')).toHaveValue('no');
  await expect(fold(page).locator('.ledger-total .ledger-figure')).toHaveText('€1,180');

  // Back to Reset, by keyboard, and everything returns to the example.
  const reset = page.getByRole('button', { name: 'Reset' });
  for (let i = 0; i < 40 && !(await reset.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Shift+Tab');
  await expect(reset).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#rs-netPay')).toHaveValue('1125');
  await expect(figure(page)).toHaveText('53.3%');
  await expect(page.locator('#rs-firstMonthUpfront')).toHaveValue('yes');
});

/** The registry's rent-share entry: its copy belongs to the foundation, not to this tool. */
const REGISTRY = TOOLS.find((t) => t.slug === 'rent-share')!;
const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
/** The short question the revised spec's changes set, replacing the rent-only framing. */
const SPEC_SHORT = 'How much of my pay goes on rent and bills?';

test.describe('where rent-share is linked from', () => {
  test('the moving-out lesson links to it once, and to the budget planner', async ({ page }) => {
    await page.goto('eu/learn/money-basics/moving-out');
    const links = page.locator('.tool-handoffs a');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href', `${BASE}eu/tools/rent-share`);
    await expect(links.nth(0)).toHaveText(`Try your own numbers: ${lowerFirst(REGISTRY.short)}`);
    await expect(links.nth(1)).toHaveAttribute('href', `${BASE}eu/tools/budget`);
    await expect(page.locator('a[href$="/eu/tools/rent-share"]')).toHaveCount(1);
  });

  test('the hand-off asks the revised spec’s question, bills included', async ({ page }) => {
    expect(REGISTRY.short).toBe(SPEC_SHORT);
    await page.goto('eu/learn/money-basics/moving-out');
    await expect(page.locator('.tool-handoffs a').nth(0)).toHaveText('Try your own numbers: how much of my pay goes on rent and bills?');
  });

  test('the tool lists the lesson, and the budget planner still does too', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.related').getByRole('link', { name: 'Can you afford to move out? The 40% line' })).toBeVisible();
    await page.goto('eu/tools/budget');
    await expect(page.locator('.related').getByRole('link', { name: 'Can you afford to move out? The 40% line' })).toBeVisible();
  });
});

test.describe('rent-share accessibility', () => {
  test('no serious or critical axe issue with the fold closed and open', async ({ page }) => {
    await page.goto(PAGE);
    await waitForIslands(page);
    await expectNoBlockingAxe(page);
    await fold(page).locator('summary').click();
    await expect(fold(page)).toHaveAttribute('open', '');
    await page.locator('.tool details.how').last().locator('summary').click(); // How this is worked out
    await expectNoBlockingAxe(page);
  });

  test('errors are in text and tied to their fields; results speak through a status line', async ({ page }) => {
    await page.goto(`${PAGE}#netPay=0&bills=-3`);
    await waitForIslands(page);
    await expect(page.locator('#rs-bills-error')).toHaveText('Enter 0 or more.');
    await expect(page.locator('#rs-bills')).toHaveAttribute('aria-describedby', /rs-bills-error/);
    await expect(sentence(page)).toHaveAttribute('role', 'status');
    await expectNoBlockingAxe(page);
  });
});
