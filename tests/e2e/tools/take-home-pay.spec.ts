/**
 * Take-home pay, line by line, on the real build: each edition opens on its lesson's payslip with
 * the spec's figures; the modes, checks and notes; the fragment link both ways and the old ?link;
 * the edition-bound currency; the rules line and terms; keyboard-only use of the row editor at
 * 360px; and axe on the states the defaults do not show.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForIslands } from '../helpers';

const BASE = '/passion-project/';
const results = (page: Page) => page.locator('.tool .results');
const figure = (page: Page) => page.locator('.tool .result-figure-value');
const status = (page: Page) => page.locator('#thp-status');
const fact = (page: Page, label: string) => results(page).locator('.result-fact', { hasText: label });

async function open(page: Page, path: string) {
  await page.goto(path);
  await waitForIslands(page);
}

async function noSeriousAxeIssues(page: Page) {
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const blocking = scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
}

/** Presses Tab until the focused element matches the selector; keyboard only, no clicks. */
async function tabTo(page: Page, selector: string, { back = false, limit = 120 } = {}) {
  for (let i = 0; i < limit; i++) {
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`Tab never reached ${selector}`);
}

const focused = (page: Page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim() || '');

test.describe('India: from CTC to in-hand pay', () => {
  test('opens on the lesson’s payslip: ₹30,600, 87.4% and both EPF shares', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await expect(page.locator('h1')).toHaveText('Take-home pay, line by line');
    await expect(figure(page)).toHaveText('₹30,600');
    await expect(status(page)).toHaveText(
      'Of a monthly CTC of ₹35,000, ₹30,600 reaches your account: 87.4% of it. ₹4,400 comes off in three lines, and ₹4,200 of that goes into the provident fund and pension scheme for you.',
    );
    const ledger = results(page);
    await expect(ledger).toContainText('Employer\'s EPF share (12% of ₹17,500 PF wages)');
    await expect(ledger.locator('.ledger-subtotal')).toContainText('Gross salary');
    await expect(ledger.locator('.ledger-subtotal')).toContainText('₹32,900');
    await expect(ledger).toContainText('TDS (copied from your payslip)');
    await expect(ledger.locator('.ledger-total')).toContainText('₹30,600');
    await expect(fact(page, 'Into the provident fund and pension scheme for you, both shares')).toContainText('₹4,200');
    await expect(page.getByRole('link', { name: 'Plan the month in the budget planner' })).toHaveAttribute('href', `${BASE}in/tools/budget#income=30600`);
  });

  test('“No EPF line on this payslip” gives ₹34,800 and hides PF wages', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await page.getByLabel('How EPF is taken on this payslip').selectOption('none');
    await expect(figure(page)).toHaveText('₹34,800');
    await expect(page.locator('#thp-pfWages')).toHaveCount(0);
    await expect(results(page)).not.toContainText('EPF share');
    await expect(status(page)).toHaveText('Of a monthly CTC of ₹35,000, ₹34,800 reaches your account: 99.4% of it. ₹200 comes off in one line.');
  });

  test('PF wages of ₹30,000 capped at the ceiling give ₹53,800; uncapped, a note says an employer may cap', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await page.getByLabel('Monthly CTC').fill('60000');
    await page.getByLabel(/^PF wages a month/).fill('30000');
    await expect(figure(page)).toHaveText('₹52,600');
    await expect(page.locator('#thp-notes')).toContainText('an employer may cap both shares there, at ₹3,000 each');
    await page.getByLabel('How EPF is taken on this payslip').selectOption('capped');
    await expect(figure(page)).toHaveText('₹53,800');
    await expect(results(page)).toContainText('Your EPF share (12% of PF wages up to ₹25,000)');
    await expect(page.locator('#thp-notes')).toHaveCount(0);
  });

  test('from gross salary: no employer line, and the employer’s share is said to sit outside the sum', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await page.getByLabel('Where your payslip starts').selectOption('gross');
    await expect(page.locator('#thp-otherEmployerCosts')).toHaveCount(0);
    await page.getByLabel('Gross salary this month').fill('32900');
    await expect(figure(page)).toHaveText('₹30,600');
    await expect(results(page)).not.toContainText("Employer's EPF share");
    await expect(status(page)).toContainText('93.0% of it');
    await expect(fact(page, 'Your EPF share, kept in a fund in your name')).toContainText('₹2,100');
    await expect(results(page)).toContainText('Your employer adds its own share outside this sum.');
  });

  test('as printed: a blank employer share is assumed equal to yours, and the ledger says so', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await page.getByLabel('How EPF is taken on this payslip').selectOption('printed');
    await expect(page.locator('#thp-notes')).toContainText('Type your EPF line as printed.');
    await page.getByLabel('Your EPF line, as printed').fill('1800');
    await expect(results(page)).toContainText("Employer's EPF share, assumed equal to yours");
    await expect(figure(page)).toHaveText('₹31,200');
    await page.getByLabel("Employer’s EPF share, from your salary breakup").fill('2000');
    await expect(results(page)).toContainText("Employer's EPF share (as printed)");
    await expect(figure(page)).toHaveText('₹31,000');
  });

  test('a minus sign is explained under the field, in text, and counts as 0', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    const pt = page.getByLabel('Professional tax this month');
    await pt.fill('-200');
    await expect(page.locator('#thp-professionalTax-error')).toHaveText('Type the amount without a minus sign.');
    await expect(pt).toHaveAttribute('aria-invalid', 'true');
    await expect(pt).toHaveAttribute('aria-describedby', /thp-professionalTax-error/);
    await expect(figure(page)).toHaveText('₹30,800');
  });

  test('lines past the pay hold the answer back and tie the start field to the status line', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await page.getByLabel('Where your payslip starts').selectOption('gross');
    const start = page.getByLabel('Gross salary this month');
    await start.fill('2000');
    await expect(figure(page)).toHaveText('—');
    await expect(status(page)).toHaveText(
      'These lines add up to ₹2,300, more than the gross salary of ₹2,000. Check each one against your payslip; the answer is held back until they fit.',
    );
    await expect(start).toHaveAttribute('aria-describedby', /thp-status/);
    await expect(results(page).locator('.result-fact')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /budget planner/ })).toHaveCount(0);
    await expect(page.locator('#thp-notes')).toContainText('rarely above the gross salary');
    await start.fill('');
    await expect(status(page)).toHaveText('Type the top figure on your payslip, the gross salary, to see what reaches your account.');
    await expect(page.locator('#thp-start-error')).toHaveCount(0);
  });

  test('the hand-off opens the budget planner on the in-hand figure', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await page.getByRole('link', { name: 'Plan the month in the budget planner' }).click();
    await waitForIslands(page);
    await expect(page.getByLabel('What comes in each month')).toHaveValue('30600');
    expect(page.url()).not.toContain('#');
  });

  test('a link figure a number field cannot show is shown as the figure the sum uses', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay#start=35%2C000&tds=0x10');
    await expect(page.locator('#thp-start')).toHaveValue('35000');
    await expect(page.locator('#thp-tds')).toHaveValue('10');
    await expect(figure(page)).toHaveText('₹30,590');
    await expect(status(page)).toContainText('Of a monthly CTC of ₹35,000');
  });

  test('a row figure in a link is read as the row field reads it', async ({ page }) => {
    await open(page, `in/tools/take-home-pay#start=200000&others=${encodeURIComponent('Canteen~1e3')}`);
    await expect(page.locator('#thp-others-amount-0')).toHaveValue('1000');
    await expect(results(page)).toContainText('₹1,000');
  });

  test('a label in a link is text with only the characters a payslip needs', async ({ page }) => {
    await open(page, `in/tools/take-home-pay#others=${encodeURIComponent('<b>x</b>~5')}`);
    await expect(page.locator('#thp-others-name-0')).toHaveValue('b x b');
    await expect(page.locator('.results b')).toHaveCount(0);
  });

  test('other lines travel in the link, capped at five', async ({ page }) => {
    const others = encodeURIComponent('ESI~150|Labour welfare fund~20|a~1|b~1|c~1|d~1|e~1');
    await open(page, `in/tools/take-home-pay#others=${others}`);
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(5);
    await expect(page.locator('#thp-others-name-0')).toHaveValue('ESI');
    await expect(results(page)).toContainText('Labour welfare fund');
    await expect(page.getByRole('button', { name: 'Add a line' })).toBeDisabled();
    await expect(page.getByText('Up to 5 lines; add the rest together into one.')).toBeVisible();
  });

  test('has no serious accessibility issues with rows, printed EPF, notes and errors on screen', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay#others=ESI~150&pfOn=printed&professionalTax=-1');
    await expect(page.locator('#thp-others-name-0')).toHaveValue('ESI');
    await expect(page.locator('#thp-notes')).toBeVisible();
    await noSeriousAxeIssues(page);
  });
});

test.describe('Europe: the reader’s own lines', () => {
  test('opens on €1,150, each line as a share of gross, and the employer’s cost beside it', async ({ page }) => {
    await open(page, 'eu/tools/take-home-pay');
    await expect(figure(page)).toHaveText('€1,150');
    await expect(results(page)).toContainText('comes to 9.0% of gross');
    await expect(results(page)).toContainText('comes to 3.3% of gross');
    await expect(page.locator('#thp-lines-amount-0-note')).toHaveText('comes to 9.0% of gross');
    await expect(status(page)).toHaveText(
      'Of gross pay of €1,500 this month, €1,150 reaches your account: 76.7% of it. €350 comes off in four lines. Your employer pays €300 on top, so the job costs it €1,800.',
    );
    await expect(fact(page, 'What the job costs your employer')).toContainText('€1,800');
  });

  test('clearing employer contributions removes the employer facts, not shows €0', async ({ page }) => {
    await open(page, 'eu/tools/take-home-pay');
    await page.getByLabel('Employer contributions, if your payslip prints them').fill('');
    await expect(status(page)).not.toContainText('costs it');
    await expect(results(page).locator('.result-fact')).toHaveCount(0);
  });

  test('a negative line says a line that adds money back is not handled', async ({ page }) => {
    await open(page, 'eu/tools/take-home-pay');
    await page.locator('#thp-lines-amount-3').fill('-50');
    await expect(page.locator('#thp-lines-amount-3-error')).toHaveText('Type the amount without a minus sign. A line that adds money back is not handled here.');
    await expect(figure(page)).toHaveText('€1,200');
  });

  test('keeps at least one line, and a link replaces the lesson’s lines', async ({ page }) => {
    await open(page, `eu/tools/take-home-pay#start=1000&lines=${encodeURIComponent('Church tax~20|Income tax~80')}&employerOnTop=`);
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(2);
    await expect(figure(page)).toHaveText('€900');
    await expect(results(page)).toContainText('Church tax');
    await page.getByRole('button', { name: 'Remove line 2' }).click();
    await expect(page.getByRole('button', { name: /Remove line/ })).toHaveCount(0);
  });

  test('lines typed before the JavaScript arrives are kept, not reset to the lesson’s', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\/_astro\/.*\.js$/, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto('eu/tools/take-home-pay', { waitUntil: 'commit' });
    await page.locator('#thp-lines-amount-0').waitFor();
    await page.locator('#thp-lines-name-0').fill('Pension');
    await page.locator('#thp-lines-amount-0').fill('500');
    await page.locator('#thp-employerOnTop').fill('250');
    release();
    await waitForIslands(page);
    await expect(page.locator('#thp-lines-amount-0')).toHaveValue('500');
    await expect(page.locator('#thp-lines-name-0')).toHaveValue('Pension');
    await expect(page.locator('#thp-employerOnTop')).toHaveValue('250');
    await expect(results(page)).toContainText('€500');
    await expect(figure(page)).toHaveText('€785'); // 1500 − 500 − 135 − 30 − 50
  });

  test('has no serious accessibility issues', async ({ page }) => {
    await open(page, 'eu/tools/take-home-pay');
    await noSeriousAxeIssues(page);
  });
});

test.describe('United States: the stub as printed, checked', () => {
  test('opens on $1,317.60 with cents everywhere, the checks matching and a year at this pay', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay');
    await expect(figure(page)).toHaveText('$1,317.60');
    await expect(results(page)).toContainText('$1,600.00');
    await expect(results(page)).toContainText('$110.00');
    await expect(status(page)).toContainText('82.4%');
    const checks = page.locator('#thp-checks');
    await expect(checks).toContainText('Hours: 80 at $20.00 is $1,600.00, the same as the gross line.');
    await expect(checks).toContainText('Social Security: 6.2% of $1,600.00 is $99.20, the same as the stub.');
    await expect(fact(page, 'Your employer pays the same Social Security and Medicare again')).toContainText('$122.40');
    await expect(fact(page, 'A year, if every paycheck matched this one')).toContainText('$34,257.60');
    await expect(fact(page, 'A usual month, if every paycheck matched this one: two paychecks')).toContainText('$2,635.20');
    const handoff = page.getByRole('link', { name: 'Plan the month in the budget planner, starting from two paychecks, if each matched this one' });
    await expect(handoff).toHaveAttribute('href', `${BASE}us/tools/budget#income=2635.2`);
  });

  test('a gross line above the hours asks payroll, and never says error', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay');
    await page.getByLabel('Gross pay on this paycheck').fill('1650');
    await expect(page.locator('#thp-checks')).toContainText('the gross line is $1,650.00, $50.00 more. Overtime, tips');
    await expect(results(page)).not.toContainText(/error/i);
  });

  test('payroll’s sub-cent rounding is a match, said as a cent apart, never as the same', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay');
    await page.getByLabel('Regular hours on this paycheck').fill('37.5');
    await page.getByLabel('Hourly rate').fill('15.35');
    await page.getByLabel('Gross pay on this paycheck').fill('575.62');
    const checks = page.locator('#thp-checks');
    await expect(checks).toContainText('Hours: 37.5 at $15.35 is $575.63; the gross line is $575.62, a cent apart, which is how payroll rounds part of a cent.');
    await expect(checks).not.toContainText('the same as the gross line');
    await page.getByLabel('Gross pay on this paycheck').fill('162.50');
    await page.getByLabel('Regular hours on this paycheck').fill('0');
    await page.getByLabel('Social Security, as on your stub').fill('10.07');
    await page.getByLabel('Medicare, as on your stub').fill('2.36');
    await expect(checks).toContainText('Social Security: 6.2% of $162.50 is $10.08; the stub shows $10.07, a cent apart');
    await expect(checks).toContainText('Medicare: 1.45% of $162.50 is $2.36, the same as the stub.');
  });

  test('an overtime rate with part of a cent is printed whole, so the sum checks by hand', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay#hours=37.5&hourlyRate=15.35&overtimeHours=4&start=667.73');
    await expect(page.locator('#thp-checks')).toContainText('plus 4 overtime hours at $23.025, is $667.73, the same as the gross line.');
  });

  test('with no gross pay, the status line asks for the figure from the pay stub', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay');
    await page.getByLabel('Gross pay on this paycheck').fill('');
    await expect(status(page)).toHaveText('Type the gross pay from your pay stub to see what reaches your account.');
  });

  test('a # link restores gross and overtime, matches, and leaves the address bar', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay#start=1720&overtimeHours=4');
    await expect(page.getByLabel('Gross pay on this paycheck')).toHaveValue('1720');
    await expect(page.getByLabel('Overtime hours on this paycheck')).toHaveValue('4');
    await expect(page.locator('#thp-checks')).toContainText('plus 4 overtime hours at $30.00, is $1,720.00, the same as the gross line.');
    expect(page.url()).not.toContain('#');
  });

  test('an old ?start= link still works, and its query leaves the address bar once read', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay?start=1650');
    await expect(page.getByLabel('Gross pay on this paycheck')).toHaveValue('1650');
    await expect(results(page)).toContainText('$1,650.00');
    expect(page.url()).not.toContain('start=1650');
  });

  test('a pay frequency outside the list falls back to every two weeks', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay#paidEvery=daily&start=1600');
    const select = page.getByLabel('How often you are paid');
    await expect(select).toHaveValue('fortnightly');
    await expect(status(page)).toContainText('26 paychecks make $34,257.60 a year');
    await select.selectOption('weekly');
    await expect(status(page)).toContainText('52 paychecks make $68,515.20 a year; most months hold four, $5,270.40, and usually four months a year hold a fifth.');
  });

  test('a year past the wage base gets the Social Security note', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay#start=7100&hours=0');
    await expect(page.locator('#thp-notes')).toContainText("a year's wages would pass $184,500, where Social Security stops");
  });

  test('Copy link writes a # link and no ?, and that link brings the same numbers and lines back', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, 'us/tools/take-home-pay?start=1650');
    await page.getByLabel('Gross pay on this paycheck').fill('1720');
    await page.getByLabel('Overtime hours on this paycheck').fill('4');
    await page.getByRole('button', { name: 'Add a line' }).click();
    await page.locator('#thp-others-name-0').fill('State disability insurance');
    await page.locator('#thp-others-amount-0').fill('20.80');
    await page.getByLabel('How often you are paid').selectOption('weekly');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#');
    expect(copied).not.toContain('?');
    expect(copied).toContain('start=1720');

    await page.goto('about:blank');
    await page.goto(copied);
    await waitForIslands(page);
    await expect(page.getByLabel('Gross pay on this paycheck')).toHaveValue('1720');
    await expect(page.getByLabel('Overtime hours on this paycheck')).toHaveValue('4');
    await expect(page.getByLabel('How often you are paid')).toHaveValue('weekly');
    await expect(page.locator('#thp-others-name-0')).toHaveValue('State disability insurance');
    await expect(results(page)).toContainText('State disability insurance');
    expect(page.url()).not.toContain('#');
  });

  test('has no serious accessibility issues with checks and notes on screen', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay#start=7100&socialSecurity=0');
    await expect(page.locator('#thp-notes')).toBeVisible();
    await noSeriousAxeIssues(page);
  });
});

test.describe('edition rules, never the currency picker', () => {
  test('India and the US show no currency choice; Europe shows one', async ({ page }) => {
    for (const [edition, count] of [['in', 0], ['us', 0], ['eu', 1]] as const) {
      await open(page, `${edition}/tools/take-home-pay`);
      await expect(page.locator('.tool').getByLabel('Currency'), edition).toHaveCount(count);
    }
  });

  test('a saved currency from another edition cannot move India’s or the US’s figures', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-US'));
    await open(page, 'in/tools/take-home-pay');
    await expect(figure(page)).toHaveText('₹30,600');
    await expect(page.locator('.tool')).not.toContainText('$');
    await context.addInitScript(() => window.localStorage.setItem('lp:locale', 'en-IN'));
    await open(page, 'us/tools/take-home-pay');
    await expect(figure(page)).toHaveText('$1,317.60');
    await expect(page.locator('.tool')).not.toContainText('₹');
    expect(await page.evaluate(() => window.localStorage.getItem('lp:locale'))).toBe('en-IN');
  });

  test('India prints its rules with sources and dates, and its terms', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    const rules = page.locator('.rules-line');
    await expect(rules.locator('.rules-lead')).toHaveText('Rules as of 22 September 2026:');
    await expect(rules.locator('li')).toHaveCount(4);
    await expect(rules).toContainText('EPF: 12% of PF wages from you, and 12% from your employer');
    await expect(rules).toContainText('₹25,000 a month from 17 September 2026');
    await expect(rules).toContainText('₹3,000 a side');
    await expect(rules).not.toContainText('voluntary');
    await expect(rules).toContainText('₹2,500 a year');
    const scheme = rules.locator('a[href="https://newsonair.gov.in/central-govt-notifies-employees-provident-fund-scheme-2026/"]');
    await expect(scheme).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(rules).toContainText('checked 22 September 2026');
    const terms = page.locator('.tool-terms');
    await expect(terms.getByRole('heading')).toHaveText('Terms on this page');
    await expect(terms.locator(`a[href="${BASE}glossary#esi"]`)).toHaveText("ESI (Employees' State Insurance)");
    await expect(terms.locator(`a[href="${BASE}glossary#ctc"]`)).toBeVisible();
    await expect(terms.locator('dt')).toHaveCount(11);
  });

  test('the US prints its rules and terms; Europe, which uses no rate, prints no rules line', async ({ page }) => {
    await open(page, 'us/tools/take-home-pay');
    const rules = page.locator('.rules-line');
    await expect(rules.locator('li')).toHaveCount(5);
    await expect(rules).toContainText('Social Security: 6.2% of wages');
    await expect(rules).toContainText('$184,500');
    await expect(rules).toContainText('0.9% of Medicare');
    await expect(rules).toContainText('1.5 times the regular rate');
    await expect(rules.locator('a[href="https://www.irs.gov/taxtopics/tc751"]').first()).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(rules.locator('a[href="https://www.dol.gov/agencies/whd/overtime"]')).toHaveCount(1);
    await expect(page.locator(`.tool-terms a[href="${BASE}glossary#fica"]`)).toBeVisible();
    await expect(page.locator(`.tool-terms a[href="${BASE}glossary#w-4"]`)).toBeVisible();
    await expect(page.locator(`.tool-terms a[href="${BASE}glossary#hourly-wage"]`)).toHaveText('Hourly wage');
    await expect(page.locator(`.tool-terms a[href="${BASE}glossary#hourly-rate"]`)).toHaveCount(0);

    await open(page, 'eu/tools/take-home-pay');
    await expect(page.locator('.rules-line')).toHaveCount(0);
    await expect(page.locator(`.tool-terms a[href="${BASE}glossary#employer-contributions"]`)).toBeVisible();
  });

  test('the lessons behind it are listed', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    await expect(page.locator('.related').getByRole('link', { name: /Your first payslip/ })).toBeVisible();
    await open(page, 'us/tools/take-home-pay');
    await expect(page.locator('.related').getByRole('link', { name: /Your first paycheck/ })).toBeVisible();
  });
});

test.describe('keyboard only, at 360px', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('choose a start, type figures, and add and remove other lines without a pointer', async ({ page }) => {
    await open(page, 'in/tools/take-home-pay');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // A select by keyboard: type-ahead picks "Gross salary…".
    await tabTo(page, '#thp-startFrom');
    await page.keyboard.type('G');
    await expect(page.locator('#thp-startFrom')).toHaveValue('gross');
    await page.keyboard.press('Tab');
    await expect.poll(() => focused(page)).toBe('thp-start');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('32900');
    await expect(figure(page)).toHaveText('₹30,600');

    // Add: focus lands on the new row's first field.
    await tabTo(page, '.row-list > button.btn');
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page)).toBe('thp-others-name-0');
    await page.keyboard.type('ESI');
    await page.keyboard.press('Tab');
    await expect.poll(() => focused(page)).toBe('thp-others-amount-0');
    await page.keyboard.type('150');
    await expect(figure(page)).toHaveText('₹30,450');
    await expect(results(page)).toContainText('ESI');

    // Fill the list to its cap of five, by keyboard.
    for (let row = 1; row < 5; row++) {
      await tabTo(page, '.row-list > button.btn');
      await page.keyboard.press('Space');
      await expect.poll(() => focused(page)).toBe(`thp-others-name-${row}`);
      await page.keyboard.type(`Line ${row + 1}`);
      await page.keyboard.press('Tab');
      await page.keyboard.type('10');
    }
    const add = page.getByRole('button', { name: 'Add a line' });
    await expect(add).toBeDisabled();
    await expect(page.locator('#thp-others-max')).toHaveText('Up to 5 lines; add the rest together into one.');
    await expect(add).toHaveAttribute('aria-describedby', 'thp-others-max');
    await expect(figure(page)).toHaveText('₹30,410');

    // Remove line 2: focus moves to the row now in its place, and the removal is announced.
    await tabTo(page, '#thp-others-row-1 .remove-line', { back: true });
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page)).toBe('thp-others-name-1');
    await expect(page.locator('#thp-others-name-1')).toHaveValue('Line 3');
    await expect(page.locator('.row-list [role="status"]')).toHaveText('Other line 2 removed.');
    await expect(add).toBeEnabled();

    // Remove the last row: nothing takes its place, so focus goes to Add.
    await tabTo(page, '#thp-others-row-3 .remove-line');
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page)).toBe('Add a line');
    await expect(page.locator('fieldset.row-list-row')).toHaveCount(3);
    await expect(page.locator('.row-list [role="status"]')).toHaveText('Other line 4 removed.');
  });
});
