import { test, expect } from '@playwright/test';
import { waitForIslands } from './helpers';

test.describe('loan repayments', () => {
  test('works out the payment, the interest and the total', async ({ page }) => {
    await page.goto('in/tools/loan');
    await waitForIslands(page);
    const results = page.locator('.results');
    // ₹50,000 at 12% over 24 months: r = 0.01, payment = 50000 × 0.01 × 1.01²⁴ ÷ (1.01²⁴ − 1) = 2,353.67
    await expect(results).toContainText('₹2,354');
    await expect(results).toContainText('₹6,488');
    await expect(results).toContainText('₹56,488');
    await expect(results).toContainText('price of borrowing');
  });

  test('a zero rate means paying back exactly what was borrowed', async ({ page }) => {
    await page.goto('in/tools/loan');
    await waitForIslands(page);
    await page.getByLabel('Interest rate, % a year').fill('0');
    await expect(page.locator('.results')).toContainText('exactly the ₹50,000');
    await expect(page.locator('.results')).not.toContainText('NaN');
  });

  test('no months is explained in words, not shown as a broken number', async ({ page }) => {
    await page.goto('in/tools/loan');
    await waitForIslands(page);
    await page.getByLabel('Months to repay').fill('0');
    await expect(page.locator('#loan-months-error')).toBeVisible();
    await expect(page.getByLabel('Months to repay')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.results')).not.toContainText(/NaN|Infinity/);
  });

  test('the year-by-year table ends with nothing owed', async ({ page }) => {
    await page.goto('us/tools/loan');
    await waitForIslands(page);
    await expect(page.locator('.results')).toContainText('$114'); // $10,000 at 6.5% over 120 months = 113.55
    await page.getByText('Year by year').click();
    const rows = page.locator('details.how table tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(rows.last()).toContainText('$0');
  });

  test('a shared link restores the inputs', async ({ page }) => {
    await page.goto('in/tools/loan?principal=120000&rate=0&months=12');
    await waitForIslands(page);
    await expect(page.getByLabel('Amount borrowed')).toHaveValue('120000');
    await expect(page.locator('.results')).toContainText('₹10,000');
  });
});

test.describe('side-hustle profit', () => {
  test('takes fees from the whole sale and shows what an hour earns', async ({ page }) => {
    await page.goto('in/tools/side-hustle');
    await waitForIslands(page);
    const results = page.locator('.results');
    // 40 × ₹250 = ₹10,000 in; 40 × ₹110 = ₹4,400 costs; 5% of ₹10,000 = ₹500 fees; ₹5,100 left; ÷ 30 h = ₹170
    await expect(results).toContainText('₹10,000');
    await expect(results).toContainText('₹4,400');
    await expect(results).toContainText('₹500');
    await expect(results).toContainText('₹5,100');
    await expect(results).toContainText('₹170');
  });

  test('says so when there are no hours, and when the month loses money', async ({ page }) => {
    await page.goto('in/tools/side-hustle');
    await waitForIslands(page);
    await page.getByLabel('Hours you put in each month').fill('0');
    await expect(page.locator('.results')).toContainText('Add the hours');
    await page.getByLabel('Hours you put in each month').fill('30');
    await page.getByLabel('What one costs you').fill('300');
    await expect(page.locator('.results')).toContainText('each month costs you');
  });
});

test.describe('savings growth', () => {
  test('separates what you put in from the growth, with lakh grouping', async ({ page }) => {
    await page.goto('in/tools/savings');
    await waitForIslands(page);
    const results = page.locator('.results');
    await expect(results).toContainText('₹60,000'); // 500 × 12 × 10
    await expect(results).toContainText('not a prediction');
    await page.getByLabel('Added every month').fill('10000');
    await expect(results).toContainText('₹12,00,000'); // Indian grouping, never 1,200,000
  });

  test('the chart has a text alternative and the same numbers as a table', async ({ page }) => {
    await page.goto('in/tools/savings');
    await waitForIslands(page);
    const chart = page.locator('svg.growth-chart');
    await expect(chart).toHaveAttribute('role', 'img');
    await expect(chart).toHaveAttribute('aria-label', /curves upward/);
    await page.getByText('The same numbers as a table').click();
    await expect(page.locator('.growth table tbody tr')).toHaveCount(10);
  });

  test('a zero rate grows nothing and says so', async ({ page }) => {
    await page.goto('in/tools/savings');
    await waitForIslands(page);
    await page.getByLabel('Yearly rate, %').fill('0');
    await expect(page.locator('.results')).toContainText('exactly what you put in');
  });
});

test.describe('budget planner', () => {
  test('totals each kind of spending and names what is left, without judging it', async ({ page }) => {
    await page.goto('in/tools/budget');
    await waitForIslands(page);
    const results = page.locator('.results');
    // Needs 1200 + 400 + 1500 = 3,100; wants 1500 + 300 = 1,800; savings 1,600; left 8000 − 6500 = 1,500
    await expect(results).toContainText('₹3,100');
    await expect(results).toContainText('₹1,800');
    await expect(results).toContainText('₹1,600');
    await expect(results).toContainText('₹1,500 has no job yet');
    await expect(results).toContainText('a guideline, not a rule');
    await expect(results).not.toContainText(/too much|overspend|should/i);
  });

  test('lines can be added, changed and removed by keyboard-reachable controls', async ({ page }) => {
    await page.goto('in/tools/budget');
    await waitForIslands(page);
    await page.getByRole('button', { name: 'Add a line' }).click();
    await page.getByLabel('Name of line 7').fill('Books');
    await page.getByLabel('Amount for Books').fill('1500');
    await expect(page.locator('.results')).toContainText('Every part of what comes in has a job');

    await page.getByRole('button', { name: 'Remove Books' }).click();
    await expect(page.locator('.results')).toContainText('₹1,500 has no job yet');

    await page.getByLabel('What comes in each month').fill('5000');
    await expect(page.locator('.results')).toContainText('more than comes in');
  });

  test('a shared link restores the lines', async ({ page }) => {
    await page.goto('in/tools/budget?income=1000&rows=Bus~200~needs%7CSnacks~300~wants');
    await waitForIslands(page);
    await expect(page.getByLabel('What comes in each month')).toHaveValue('1000');
    await expect(page.getByLabel('Name of line 1')).toHaveValue('Bus');
    await expect(page.locator('.budget-row')).toHaveCount(2);
    await expect(page.locator('.results')).toContainText('₹500 has no job yet');
  });

  test('a hostile shared link cannot inject a category or a wall of rows', async ({ page }) => {
    const rows = Array.from({ length: 60 }, (_, i) => `x${i}~1~needs`).join('|') + '|evil~5~<script>';
    await page.goto(`in/tools/budget?income=1000&rows=${encodeURIComponent(rows)}`);
    await waitForIslands(page);
    await expect(page.locator('.budget-row')).toHaveCount(20);
    await expect(page.locator('main')).not.toContainText('<script>');
  });
});

test('every edition lists all five calculators, and each opens in its own currency', async ({ page }) => {
  for (const [region, symbol] of [['in', '₹'], ['eu', '€'], ['us', '$']] as const) {
    await page.goto(`${region}/tools`);
    for (const name of ['Break-even calculator', 'Budget planner', 'Savings growth', 'Side-hustle profit', 'Loan repayments']) {
      await expect(page.getByRole('link', { name })).toBeVisible();
    }
    await page.goto(`${region}/tools/side-hustle`);
    await expect(page.locator('.results')).toContainText(symbol);
  }
});
