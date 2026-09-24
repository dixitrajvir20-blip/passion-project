/**
 * Buffer target, on the real build: each edition opens on its lesson's example with the expected
 * payday; every state (dated, covered, no amount, too long, errors); links after the # and the
 * old ?query, with a pay frequency off the list falling back; the US edition's $400 survey figure
 * with its checked date and source, in dollars whatever lp:locale holds; one keyboard-only run;
 * and axe, at 360px and 1280px.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';

const TITLE = 'Buffer target and the payday it is reached';

const OPENING = {
  in: {
    figure: 'Payday 3',
    label: 'about 3 months, counting your next payday as payday 1',
    needed: 'Paydays needed: 2.75, rounded up',
    held: '₹6,000',
    sentence: '1 month of these costs is ₹5,500. Moving ₹2,000 each payday, you reach it on payday 3, about 3 months away, holding ₹6,000, ₹500 above it.',
    scenario: 'It opens on an example: five costs from a month of part-time pay, ₹5,500, with ₹2,000 moved aside each payday.',
  },
  eu: {
    figure: 'Payday 12',
    label: 'about 12 months, counting your next payday as payday 1',
    needed: 'Paydays needed: 11.84, rounded up',
    held: '€2,220',
    sentence: '3 months of these costs is €2,190. Moving €185 each payday, you reach it on payday 12, about 12 months away, holding €2,220, €30 above it.',
    scenario: 'It opens on an example: four essentials, €730 a month, held for three months, with €185 moved aside each payday.',
  },
  us: {
    figure: 'Paycheck 22',
    label: 'about 10 months, counting your next paycheck as paycheck 1',
    needed: 'Paychecks needed: 21.1, rounded up',
    held: '$1,100',
    sentence: '1 month of these costs is $1,055. Moving $50 each paycheck, you reach it on paycheck 22, about 10 months away, holding $1,100, $45 above it.',
    scenario: 'It opens on an example: four must-pay costs, $1,055 a month, with $50 moved aside from each paycheck, paid every two weeks.',
  },
} as const;

const MILESTONE_LABEL = '$400, the Federal Reserve survey’s example emergency expense, not a rule: about 4 months';

const results = (page: Page) => page.locator('.tool .results');
const figure = (page: Page) => results(page).locator('.result-figure-value');
const status = (page: Page) => results(page).locator('p.plain[role="status"]');

async function open(page: Page, path: string) {
  await page.goto(path);
  await waitForIslands(page);
}

/** Tab forward from the top of the page until the element with this id has focus. */
async function tabTo(page: Page, id: string) {
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((target) => document.activeElement?.id === target, id)) return;
  }
  throw new Error(`Tab never reached #${id}`);
}

/** Replace a focused field's text using the keyboard only. */
async function retype(page: Page, text: string) {
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text);
}

for (const width of [360, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const edition of ['in', 'eu', 'us'] as const) {
      test(`${edition}/tools/buffer-target opens on the lesson’s example`, async ({ page }) => {
        const expected = OPENING[edition];
        await open(page, `${edition}/tools/buffer-target`);
        await expect(page.locator('h1')).toHaveText(TITLE);
        await expect(page.locator('.scenario')).toHaveText(`${expected.scenario} Change any number to match your own.`);
        await expect(figure(page)).toHaveText(expected.figure);
        await expect(results(page).locator('.result-figure-label')).toHaveText(expected.label);
        await expect(results(page).locator('.ledger-total .ledger-label')).toHaveText(expected.needed);
        await expect(results(page).locator('.ledger-subtotal .ledger-label')).toHaveText('Still to set aside');
        await expect(results(page).locator('.result-fact').first()).toContainText(expected.held);
        await expect(status(page)).toHaveText(expected.sentence);
        await expect(results(page).locator('.notice')).toContainText('counting your next');
        await expect(results(page).locator('.notice a')).toHaveAttribute('href', `/passion-project/${edition}/tools/savings`);
        await expect(page.locator('.related')).toContainText('Lessons that use this');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
      });
    }

    test('us: the $400 survey figure is dated, with its source and checked date', async ({ page }) => {
      await open(page, 'us/tools/buffer-target');
      const facts = results(page).locator('.result-fact');
      await expect(facts).toHaveCount(2);
      await expect(facts.nth(1).locator('.result-fact-label')).toHaveText(MILESTONE_LABEL);
      await expect(facts.nth(1).locator('.result-fact-value')).toHaveText('Paycheck 8');
      const rules = page.locator('.rules-line');
      await expect(rules.locator('.rules-lead')).toHaveText('Figure checked 22 September 2026:');
      await expect(rules).toContainText('its example, not a rule');
      await expect(rules.locator('a')).toHaveAttribute('href', 'https://www.federalreserve.gov/newsevents/pressreleases/other20260513a.htm');
      await expect(rules.locator('a')).toHaveAttribute('rel', 'noopener noreferrer');
      const how = page.locator('.tool details.how');
      await how.locator('summary').click();
      await expect(how).toContainText('63% of adults said they would cover it with cash or its equivalent');
      await expect(how.locator('a[href*="savings-investments"]')).toBeVisible();
    });

    test('axe finds no serious or critical issue, in each edition and in the error state', async ({ page }) => {
      for (const edition of ['in', 'eu', 'us']) {
        await open(page, `${edition}/tools/buffer-target`);
        await page.locator('.tool details.how summary').click();
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const blocking = scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(blocking, `${edition}: ${blocking.map((v) => v.id).join(', ')}`).toEqual([]);
      }
      await page.getByLabel('Moved aside each paycheck').fill('-5');
      await expect(page.locator('#bt-perPayday-error')).toBeVisible();
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    });
  });
}

test.describe('the edition’s figures, not the currency picker', () => {
  test('us: no currency field, and a saved ₹ in lp:locale still shows dollars and the $400', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-IN'));
    await open(page, 'us/tools/buffer-target');
    await expect(page.locator('#bt-currency')).toHaveCount(0);
    await expect(page.getByLabel('Currency')).toHaveCount(0);
    await expect(status(page)).toHaveText(OPENING.us.sentence);
    await expect(results(page).locator('.result-fact').nth(1)).toContainText('Paycheck 8');
    await expect(results(page)).not.toContainText('₹');
  });

  test('in and eu keep the currency field: the date does not depend on it', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await expect(page.locator('.rules-line')).toHaveCount(0);
    await page.getByLabel('Currency').selectOption('en-US');
    await expect(figure(page)).toHaveText('Payday 3');
    await expect(results(page).locator('.result-fact')).toHaveCount(1); // no $400 outside the US edition
    await expect(results(page).locator('.result-fact')).toContainText('$6,000');

    await open(page, 'eu/tools/buffer-target');
    await expect(page.locator('.rules-line')).toHaveCount(0);
    await expect(page.getByLabel('Currency')).toBeVisible();
  });

  test('eu: How this is worked out cites the survey behind three months', async ({ page }) => {
    await open(page, 'eu/tools/buffer-target');
    const how = page.locator('.tool details.how');
    await how.locator('summary').click();
    await expect(how).toContainText('€2,190 ÷ €185 = 11.84, so payday 12, when you hold 12 × €185 = €2,220.');
    await expect(how).toContainText('It is a measure, not a rule.');
    await expect(how.locator('a[href^="https://eur-lex.europa.eu/"]')).toBeVisible();
  });

  test('every edition defines the buffer under Terms on this page', async ({ page }) => {
    for (const edition of ['in', 'eu', 'us']) {
      await page.goto(`${edition}/tools/buffer-target`);
      const terms = page.locator('.tool-terms');
      await expect(terms.locator('h2')).toHaveText('Terms on this page');
      await expect(terms.locator('dt a')).toHaveText('Emergency fund');
      await expect(terms.locator('dt a')).toHaveAttribute('href', '/passion-project/glossary#emergency-fund');
    }
  });
});

test.describe('links', () => {
  test('a fragment link restores every field, then leaves the address bar', async ({ page }) => {
    await open(page, 'eu/tools/buffer-target#essentials=680&months=3&saved=0&perPayday=122&paidEvery=monthly');
    await expect(page.getByLabel('Must-pay costs a month')).toHaveValue('680');
    await expect(page.getByLabel('Months to cover')).toHaveValue('3');
    await expect(page.getByLabel('Moved aside each payday')).toHaveValue('122');
    await expect(page.getByLabel('How often you are paid')).toHaveValue('monthly');
    await expect(figure(page)).toHaveText('Payday 17');
    await expect(results(page).locator('.ledger-total .ledger-label')).toHaveText('Paydays needed: 16.72, rounded up');
    await expect(results(page).locator('.result-fact')).toHaveText(/Held on payday 17, €34 above the target\s*€2,074/);
    expect(page.url()).not.toContain('#');
  });

  for (const link of ['#paidEvery=abc', '?paidEvery=abc', '#paidEvery=toString', '?paidEvery=every%20two%20weeks']) {
    test(`a pay frequency off the list (${link}) falls back to the edition’s`, async ({ page }) => {
      await open(page, `us/tools/buffer-target${link}`);
      await expect(page.getByLabel('How often you are paid')).toHaveValue('fortnightly');
      await expect(page.locator('#bt-paidEvery option:checked')).toHaveText('Every two weeks, 26 a year');
      await expect(figure(page)).toHaveText('Paycheck 22');
    });
  }

  test('a link value a number field cannot show is put in the field as the number the result uses', async ({ page }) => {
    await open(page, 'in/tools/buffer-target#essentials=%E2%82%B9500&months=1&saved=%2B100&perPayday=1%2C00%2C000');
    await expect(page.getByLabel('Must-pay costs a month')).toHaveValue('500');
    await expect(page.getByLabel('Already set aside for this')).toHaveValue('100');
    await expect(page.getByLabel('Moved aside each payday')).toHaveValue('100000');
    await expect(figure(page)).toHaveText('Payday 1');
    await expect(status(page)).toHaveText(
      '1 month of these costs is ₹500. With ₹100 already set aside and ₹1,00,000 moved each payday, you reach it on your next payday, holding ₹1,00,100, ₹99,600 above it.',
    );
    await expect(page.locator('.tool [aria-invalid="true"]')).toHaveCount(0);
  });

  test('an old ?link still works, and a listed frequency from it is used', async ({ page }) => {
    await open(page, 'in/tools/buffer-target?essentials=5500&perPayday=2750&paidEvery=weekly');
    await expect(page.getByLabel('How often you are paid')).toHaveValue('weekly');
    await expect(figure(page)).toHaveText('Payday 2');
    await expect(results(page).locator('.result-figure-label')).toHaveText('about 2 weeks, counting your next payday as payday 1');
    expect(page.url()).not.toContain('essentials=5500'); // read once, then out of the address bar
  });

  test('Copy link carries every field after the #, and the link opens the same result', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, 'us/tools/buffer-target?saved=1');
    await page.getByLabel('Already set aside for this').fill('100');
    await page.getByLabel('How often you are paid').selectOption('twice-monthly');
    await expect(figure(page)).toHaveText('Paycheck 20');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#essentials=1055&months=1&saved=100&perPayday=50&paidEvery=twice-monthly');
    expect(copied).not.toContain('?');

    const again = await context.newPage();
    await again.goto(copied);
    await waitForIslands(again);
    await expect(again.getByLabel('Already set aside for this')).toHaveValue('100');
    await expect(again.getByLabel('How often you are paid')).toHaveValue('twice-monthly');
    await expect(again.locator('.tool .results .result-figure-value')).toHaveText('Paycheck 20');
    expect(again.url()).not.toContain('#');
  });
});

test.describe('states', () => {
  test('covered: already set aside at or above the target', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await page.getByLabel('Already set aside for this').fill('6000');
    await expect(figure(page)).toHaveText('Covered now');
    await expect(results(page).locator('.result-figure-label')).toHaveText('Already set aside is at or above the target');
    await expect(results(page).locator('.ledger-total')).toContainText('Still to set aside');
    await expect(results(page).locator('.ledger-total')).toContainText('₹0');
    await expect(results(page).locator('.result-fact')).toHaveCount(0);
    await expect(status(page)).toHaveText('₹6,000 already covers the ₹5,500 target, ₹500 above it.');
    const how = page.locator('.tool details.how');
    await how.locator('summary').click();
    await expect(how).toContainText('₹6,000 already covers ₹5,500, so nothing is left to set aside.');
    await expect(how).not.toContainText('− ₹6,000 leaves ₹0');
    await page.getByLabel('Already set aside for this').fill('5500');
    await expect(status(page)).toHaveText('₹5,500 already covers the ₹5,500 target.');
  });

  test('saved counts first, and the sentence says so', async ({ page }) => {
    await open(page, 'us/tools/buffer-target');
    await page.getByLabel('Already set aside for this').fill('100');
    await expect(figure(page)).toHaveText('Paycheck 20');
    await expect(status(page)).toHaveText(
      '1 month of these costs is $1,055. With $100 already set aside and $50 moved each paycheck, you reach it on paycheck 20, about 9 months away, holding $1,100, $45 above it.',
    );
    await expect(results(page).locator('.result-fact').nth(1)).toHaveText(/Paycheck 6$/);
    await page.getByLabel('Already set aside for this').fill('400');
    await expect(results(page).locator('.result-fact')).toHaveCount(1); // $400 already set aside
  });

  test('us: the $400 one paycheck away says your next paycheck, not about 2 weeks', async ({ page }) => {
    await open(page, 'us/tools/buffer-target');
    await page.getByLabel('Already set aside for this').fill('399.99');
    const milestone = results(page).locator('.result-fact').nth(1);
    await expect(milestone.locator('.result-fact-label')).toHaveText(/not a rule: your next paycheck$/);
    await expect(milestone.locator('.result-fact-value')).toHaveText('Paycheck 1');
    await expect(milestone).not.toContainText('about');
  });

  test('months beyond 2 decimals are counted as shown, so the printed sum adds up', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await page.getByLabel('Months to cover').fill('2.333');
    await expect(page.locator('#bt-months-error')).toHaveCount(0);
    const target = results(page).locator('.ledger-row').first();
    await expect(target).toContainText('Buffer target: ₹5,500 × 2.33 months');
    await expect(target).toContainText('₹12,815');
    await expect(status(page)).toHaveText(
      '2.33 months of these costs is ₹12,815. Moving ₹2,000 each payday, you reach it on payday 7, about 7 months away, holding ₹14,000, ₹1,185 above it.',
    );
    const how = page.locator('.tool details.how');
    await how.locator('summary').click();
    await expect(how).toContainText('₹5,500 × 2.33 = ₹12,815.');

    await page.getByLabel('Months to cover').fill('1.001');
    await expect(status(page)).toHaveText(/^1 month of these costs is ₹5,500\. /);
    await expect(target).toContainText('Buffer target: ₹5,500 × 1 month');
    await expect(target).toContainText('₹5,500');

    await page.getByLabel('Months to cover').fill('24.004');
    await expect(page.locator('#bt-months-error')).toHaveText('Enter between 1 and 24 months.');
  });

  test('an exact division says exactly, and one payday away says your next payday', async ({ page }) => {
    await open(page, 'eu/tools/buffer-target');
    await page.getByLabel('Moved aside each payday').fill('182.5');
    await expect(results(page).locator('.ledger-total .ledger-label')).toHaveText('Paydays needed');
    await expect(status(page)).toHaveText(
      '3 months of these costs is €2,190. Moving €182.50 each payday, you reach it on payday 12, about 12 months away, holding exactly €2,190.',
    );
    await page.getByLabel('Moved aside each payday').fill('2190');
    await expect(figure(page)).toHaveText('Payday 1');
    await expect(results(page).locator('.result-figure-label')).toHaveText('your next payday');
    await expect(status(page)).toHaveText('3 months of these costs is €2,190. Moving €2,190 each payday, you reach it on your next payday, holding exactly €2,190.');
  });

  test('no amount moved: no date, and the sentence asks for one', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await page.getByLabel('Moved aside each payday').fill('');
    await expect(figure(page)).toHaveText('—');
    await expect(results(page).locator('.result-figure-label')).toHaveText('Add what you move each payday to see the date');
    await expect(status(page)).toHaveText('1 month of these costs is ₹5,500, and ₹5,500 is still to set aside. Add what you move each payday to see the date.');
    await expect(page.locator('#bt-perPayday-error')).toHaveCount(0);
  });

  test('more than ten years away: no payday number', async ({ page }) => {
    await open(page, 'eu/tools/buffer-target');
    await page.getByLabel('Months to cover').fill('24');
    await page.getByLabel('Moved aside each payday').fill('10');
    await expect(figure(page)).toHaveText('More than 10 years');
    await expect(results(page).locator('.result-figure-label')).toHaveText('at €10 each payday');
    await expect(status(page)).toHaveText(
      '24 months of these costs is €17,520. At €10 each payday, the €17,520 still to set aside takes more than 10 years; a larger amount brings the date closer.',
    );
  });

  test('a field error shows only the error, even when already covered', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await page.getByLabel('Already set aside for this').fill('6000');
    await page.getByLabel('Moved aside each payday').fill('-5');
    await expect(page.locator('#bt-perPayday-error')).toHaveText('Enter 0 or more.');
    await expect(page.getByLabel('Moved aside each payday')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Moved aside each payday')).toHaveAttribute('aria-describedby', /bt-perPayday-error/);
    await expect(results(page).locator('.result-figure')).toHaveCount(0);
    await expect(results(page).locator('.ledger-row')).toHaveCount(0);
    await expect(results(page).locator('.notice')).toHaveCount(0);
    await expect(status(page)).toHaveText('Fix the field marked above to see the date.');
    await expect(results(page)).not.toContainText('Covered now');
  });

  test('must-pay costs of 0 is an error, never already covered', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await page.getByLabel('Must-pay costs a month').fill('0');
    await expect(page.locator('#bt-essentials-error')).toHaveText('Enter your must-pay costs for one month, above 0.');
    await expect(page.getByLabel('Must-pay costs a month')).toHaveAttribute('aria-invalid', 'true');
    await expect(results(page)).not.toContainText('Covered now');
    await expect(status(page)).toHaveText('Fix the field marked above to see the date.');
  });

  test('months outside 1 to 24 and amounts over the limit are errors in words', async ({ page }) => {
    await open(page, 'in/tools/buffer-target');
    await page.getByLabel('Months to cover').fill('0.5');
    await expect(page.locator('#bt-months-error')).toHaveText('Enter between 1 and 24 months.');
    await page.getByLabel('Months to cover').fill('1.5');
    await expect(page.locator('#bt-months-error')).toHaveCount(0);
    await expect(results(page).locator('.ledger-row').first()).toContainText('Buffer target: ₹5,500 × 1.5 months');
    await page.getByLabel('Already set aside for this').fill('1000000001');
    await expect(page.locator('#bt-saved-error')).toHaveText('This works with amounts up to 1,00,00,00,000.');
  });
});

test('keyboard only: change the numbers and the frequency, copy the link, reset', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, 'in/tools/buffer-target');

  await tabTo(page, 'bt-essentials');
  await retype(page, '7200');
  await page.keyboard.press('Tab'); // months
  await page.keyboard.press('Tab'); // already set aside
  await page.keyboard.press('Tab'); // moved each payday
  await expect(page.locator('#bt-perPayday')).toBeFocused();
  await retype(page, '2500');
  await expect(figure(page)).toHaveText('Payday 3');
  await expect(results(page).locator('.result-fact')).toContainText('₹7,500');

  await page.keyboard.press('Tab');
  await expect(page.locator('#bt-paidEvery')).toBeFocused();
  // Type-to-select: arrow keys open the list on macOS, a first letter picks the option everywhere.
  await page.keyboard.press('t'); // Twice a month
  await expect(page.locator('#bt-paidEvery')).toHaveValue('twice-monthly');
  await expect(results(page).locator('.result-figure-label')).toHaveText('about 2 months, counting your next payday as payday 1');

  await page.keyboard.press('Tab'); // Reset
  await page.keyboard.press('Tab'); // Copy link
  await expect(page.getByRole('button', { name: 'Copy link to these numbers' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.copied')).toHaveText('Link copied.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('#essentials=7200&months=1&saved=0&perPayday=2500&paidEvery=twice-monthly');

  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#bt-essentials')).toHaveValue('5500');
  await expect(page.locator('#bt-paidEvery')).toHaveValue('monthly');
  await expect(figure(page)).toHaveText('Payday 3');
  await expect(status(page)).toHaveText(OPENING.in.sentence);
});
