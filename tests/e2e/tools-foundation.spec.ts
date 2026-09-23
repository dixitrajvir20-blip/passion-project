/**
 * The shared behaviour every tool builder relies on, proved on the real build: fragment links,
 * the budget planner's link reader, the tool page template, the edition menu, lesson hand-offs,
 * drill pages built from banks, and the review checks they feed.
 *
 * The tools index, the edition fronts and the home panel blocks prove brief changes 28 to 30.
 *
 * A calculator whose island is still a stub is marked ready: false in the registry and must not
 * appear anywhere. Expectations that involve one are filtered through ready(), so each builder's
 * deleting that line turns its page, rows and hand-offs on here without editing this file.
 */
import { test, expect, type Page } from '@playwright/test';
import { GROUPS, TOOLS, groupsFor, registeredFor, toolBySlug, toolsFor } from '../../src/lib/tools';
import { waitForIslands } from './helpers';

const BASE = '/passion-project/';
const EDITIONS = ['in', 'eu', 'us'] as const;
const DRILL_PAGES = ['in/tools/spot-the-fake', 'eu/tools/spot-the-fake', 'in/tools/job-offer-check', 'eu/tools/job-offer-check', 'us/tools/job-offer-check'];
const NEW_CALCULATORS = ['take-home-pay', 'yearly-rate', 'card-minimum', 'buffer-target', 'pay-later-payday', 'rent-share', 'side-income-tax'];
const ready = (slug: string) => toolBySlug(slug)!.ready !== false;
const STUBS = TOOLS.filter((t) => t.ready === false);

const fixed = (page: Page) => page.getByLabel('Fixed costs per month');
const price = (page: Page) => page.getByLabel('Price you charge');

test.describe('calculator links carry the figures after the #', () => {
  test('a fragment link fills the fields, and the fragment leaves the address bar', async ({ page }) => {
    await page.goto('in/tools/break-even#fixed=5000&variable=8&price=20&units=600');
    await waitForIslands(page);
    await expect(fixed(page)).toHaveValue('5000');
    await expect(price(page)).toHaveValue('20');
    await expect(page.locator('.results')).toContainText('417'); // ceil(5000 / 12)
    expect(page.url()).not.toContain('#');
  });

  test('the fragment wins over the query, key by key', async ({ page }) => {
    await page.goto('in/tools/break-even?price=30#price=20');
    await waitForIslands(page);
    await expect(price(page)).toHaveValue('20');
  });

  test('an old ?link still works, and its query stays', async ({ page }) => {
    await page.goto('in/tools/break-even?fixed=5000&variable=8&price=20&units=600');
    await waitForIslands(page);
    await expect(fixed(page)).toHaveValue('5000');
    await expect(page.locator('.results')).toContainText('417');
    expect(page.url()).toContain('?fixed=5000');
  });

  test('a value longer than 24 characters is ignored', async ({ page }) => {
    await page.goto(`in/tools/break-even#fixed=${'9'.repeat(30)}`);
    await waitForIslands(page);
    await expect(fixed(page)).toHaveValue('18000');
  });

  test('the skip link’s #main is not a link to figures', async ({ page }) => {
    await page.goto('in/tools/break-even#main');
    await waitForIslands(page);
    await expect(fixed(page)).toHaveValue('18000');
    await expect(price(page)).toHaveValue('1500');
  });

  test('Copy link writes the figures after the # and no query', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('in/tools/break-even?fixed=5000&variable=8&price=20&units=600');
    await waitForIslands(page);
    await expect(fixed(page)).toHaveValue('5000');
    await page.getByRole('button', { name: 'Copy link to these numbers' }).click();
    await expect(page.locator('.copied')).toHaveText('Link copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#fixed=5000');
    expect(copied).not.toContain('?');
  });

  test('every calculator says what the link carries, under its buttons', async ({ page }) => {
    for (const slug of ['break-even', 'budget', 'savings', 'side-hustle', 'loan']) {
      await page.goto(`in/tools/${slug}`);
      await waitForIslands(page);
      const note = page.locator('.tool .btn-row + .link-note');
      await expect(note, slug).toBeVisible();
      await expect(note).toHaveText('The link holds the numbers on screen, so anyone you send it to will see them. This site never receives them.');
    }
  });
});

test.describe('the budget planner reads the fragment and the old query', () => {
  for (const link of ['in/tools/budget#income=30600', 'in/tools/budget?income=30600']) {
    test(`${link} fills what comes in`, async ({ page }) => {
      await page.goto(link);
      await waitForIslands(page);
      await expect(page.getByLabel('What comes in each month')).toHaveValue('30600');
    });
  }

  test('rows travel in the fragment too', async ({ page }) => {
    await page.goto('in/tools/budget#income=1000&rows=Bus~200~needs%7CSnacks~300~wants');
    await waitForIslands(page);
    await expect(page.locator('.budget-row')).toHaveCount(2);
    await expect(page.locator('.results')).toContainText('₹500 has no job yet');
  });
});

test.describe('the tool page template', () => {
  test('Pagefind files a calculator and a drill under their own kinds', async ({ page }) => {
    await page.goto('in/tools/loan');
    await expect(page.locator('[data-pagefind-meta]')).toHaveAttribute('data-pagefind-meta', 'kind:Calculator');
    await page.goto('in/tools/spot-the-fake');
    await expect(page.locator('[data-pagefind-meta]')).toHaveAttribute('data-pagefind-meta', 'kind:Practice');
  });

  test('every new calculator opens on its edition’s example, and no drill claims one', async ({ page }) => {
    for (const slug of NEW_CALCULATORS) {
      for (const edition of EDITIONS.filter((e) => toolsFor(e).some((t) => t.slug === slug))) {
        await page.goto(`${edition}/tools/${slug}`);
        await expect(page.locator('.scenario'), `${edition}/${slug}`).toContainText('It opens on an example:');
      }
    }
    for (const path of DRILL_PAGES) {
      await page.goto(path);
      await expect(page.locator('.scenario'), path).toHaveCount(0);
    }
  });

  test('the budget planner and savings still open on the same examples', async ({ page }) => {
    await page.goto('in/tools/budget');
    await expect(page.locator('.scenario')).toContainText('It opens on an example: a first month of money with a job for every part of it.');
    await page.goto('in/tools/savings');
    await expect(page.locator('.scenario')).toContainText('It opens on an example: a small amount, put aside every month.');
  });

  test('a calculator lists the lessons that link to it through moreTools', async ({ page }) => {
    await page.goto('in/tools/budget');
    const related = page.locator('.related');
    await expect(related.getByRole('heading')).toHaveText('Lessons that use this');
    await expect(related.getByRole('link', { name: /Your first payslip/ })).toBeVisible();
  });

  test('a drill lists the lesson its bank names first', async ({ page }) => {
    await page.goto('in/tools/job-offer-check');
    await expect(page.locator('.related li').first()).toHaveText('The part-time job that makes you a money mule');
  });

  test('a tool an edition lacks has no page there', async ({ page }) => {
    const response = await page.goto('eu/tools/spot-the-fake');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Payments: spot the fake');
    const missing = await page.goto('us/tools/spot-the-fake');
    expect(missing?.status()).toBe(404);
    const never = await page.goto('in/tools/rent-share');
    expect(never?.status()).toBe(404);
  });

  test('a calculator that is still a stub has no page in any edition', async ({ page }) => {
    for (const tool of STUBS) {
      for (const edition of tool.regions ?? EDITIONS) {
        const response = await page.goto(`${edition}/tools/${tool.slug}`);
        expect(response?.status(), `${edition}/tools/${tool.slug}`).toBe(404);
      }
    }
  });

  test('the crumb goes back to all tools', async ({ page }) => {
    await page.goto('in/tools/loan');
    await expect(page.locator('.crumb a')).toHaveText('← All tools');
    await expect(page.locator('.crumb a')).toHaveAttribute('href', `${BASE}in/tools`);
  });
});

test.describe('the edition menu from a tool', () => {
  const hrefOf = (page: Page, region: string) => page.locator(`.region-tabs a[data-region="${region}"]`).getAttribute('href');

  test('lands on the same tool where the edition has it, and on its tools index where it does not', async ({ page }) => {
    await page.goto('in/tools/loan');
    expect(await hrefOf(page, 'eu')).toMatch(/\/eu\/tools\/loan$/);
    expect(await hrefOf(page, 'us')).toMatch(/\/us\/tools\/loan$/);
    if (ready('card-minimum')) {
      await page.goto('in/tools/card-minimum');
      expect(await hrefOf(page, 'eu')).toMatch(/\/eu\/tools$/);
      expect(await hrefOf(page, 'us')).toMatch(/\/us\/tools\/card-minimum$/);
    }
    await page.goto('in/tools/spot-the-fake');
    expect(await hrefOf(page, 'eu')).toMatch(/\/eu\/tools\/spot-the-fake$/);
    expect(await hrefOf(page, 'us')).toMatch(/\/us\/tools$/);
  });
});

/** The hand-offs a lesson shows: the given links, less any tool that is still a stub. */
async function expectHandoffs(page: Page, edition: string, expected: { slug: string; text?: string }[]) {
  const shown = expected.filter((link) => ready(link.slug));
  const links = page.locator('.tool-handoffs a');
  await expect(links).toHaveCount(shown.length);
  for (const [index, link] of shown.entries()) {
    await expect(links.nth(index)).toHaveAttribute('href', `${BASE}${edition}/tools/${link.slug}`);
    if (link.text) await expect(links.nth(index)).toHaveText(link.text);
  }
  for (const tool of STUBS) await expect(page.locator(`.tool-handoffs a[href$="/tools/${tool.slug}"]`)).toHaveCount(0);
}

const FIRST_PAYSLIP = [
  { slug: 'take-home-pay', text: 'Try your own numbers: what reaches my account?' },
  { slug: 'budget', text: 'Try your own numbers: where does my money go?' },
];

test.describe('lesson hand-offs with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('the first payslip lesson links to take-home pay and the budget planner', async ({ page }) => {
    await page.goto('in/learn/money-basics/first-payslip');
    await expectHandoffs(page, 'in', FIRST_PAYSLIP);
  });

  test('the borrowing lesson names the yearly rate and card tools, not the loan its explorer opens', async ({ page }) => {
    await page.goto('in/learn/protect-your-money/cost-of-borrowing');
    await expectHandoffs(page, 'in', [
      { slug: 'yearly-rate', text: 'Try your own numbers: what is this loan as a yearly rate?' },
      { slug: 'card-minimum', text: 'Try your own numbers: how long does the minimum take?' },
    ]);
    await expect(page.locator(`.tool-handoffs a[href="${BASE}in/tools/loan"]`)).toHaveCount(0);
  });

  test('the self-employment tax lesson names only the tax tool', async ({ page }) => {
    await page.goto('us/learn/start-something/se-tax');
    await expectHandoffs(page, 'us', [{ slug: 'side-income-tax' }]);
  });

  test('a drill lesson points to more situations like its own', async ({ page }) => {
    await page.goto('in/learn/protect-your-money/money-mule');
    await expect(page.locator('.tool-handoffs a')).toHaveText('Practise on more situations in “Job offers: spot the fake”');
  });
});

test.describe('lesson hand-offs with JavaScript on', () => {
  test('the hand-off links stay once the islands have loaded', async ({ page }) => {
    await page.goto('in/learn/money-basics/first-payslip');
    const explorer = page.locator('.explorer');
    await explorer.scrollIntoViewIfNeeded();
    await waitForIslands(page, '.explorer');
    await expectHandoffs(page, 'in', FIRST_PAYSLIP);
  });
});

test.describe('explorer hand-offs are fixed by the explorer’s kind', () => {
  test('the borrowing lesson’s loan explorer opens the loan calculator', async ({ page }) => {
    await page.goto('in/learn/protect-your-money/cost-of-borrowing');
    const explorer = page.locator('.explorer');
    await explorer.scrollIntoViewIfNeeded();
    await waitForIslands(page, '.explorer');
    const href = await explorer.getByRole('link', { name: /loan calculator/ }).getAttribute('href');
    expect(href?.startsWith(`${BASE}in/tools/loan`)).toBe(true);
  });

  test('a pricing lesson’s margin explorer opens break-even, not side-hustle', async ({ page }) => {
    await page.goto('in/learn/start-something/pricing-a-service');
    const explorer = page.locator('.explorer');
    await explorer.scrollIntoViewIfNeeded();
    await waitForIslands(page, '.explorer');
    const href = await explorer.getByRole('link', { name: /full calculator/ }).getAttribute('href');
    expect(href?.startsWith(`${BASE}in/tools/break-even`)).toBe(true);
  });
});

test.describe('drill pages with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of DRILL_PAGES) {
    test(`${path} can be decided and revealed, and never marks a screen as ordinary`, async ({ page }) => {
      await page.goto(path);
      const situations = page.locator('.drill-list > li');
      expect(await situations.count()).toBeGreaterThanOrEqual(3);
      for (const index of [0, 1, 2]) {
        const situation = situations.nth(index);
        await situation.locator('input[type=radio]').first().check();
        await situation.locator('summary').click();
        await expect(situation.locator('.answer')).toBeVisible();
      }
      await expect(page.locator('[data-ordinary], [ordinary]')).toHaveCount(0);
      // Inside a tag: an attribute name, a class or a data value. The intro's own words are text.
      expect(await page.content()).not.toMatch(/<[^>]*\bordinary\b[^>]*>/i);
      await expect(page.locator('[data-drill-return]')).toBeHidden();
    });
  }

  test('a voice call is captioned as a call', async ({ page }) => {
    await page.goto('in/tools/spot-the-fake');
    await expect(page.locator('.drill-list > li').nth(2).locator('figcaption')).toHaveText('Incoming call');
  });
});

test.describe('drill pages with JavaScript on', () => {
  test('after a reveal, the page says when its situations come back', async ({ page }) => {
    await page.goto('in/tools/spot-the-fake');
    const second = page.locator('.drill-list > li').nth(1);
    const answer = await second.locator('.poll').getAttribute('data-answer');
    await second.locator(`input[value="${answer}"]`).check();
    await second.locator('summary').click();
    await expect(second.locator('.poll-status')).toHaveText('Correct.');
    const back = page.locator('[data-drill-return]');
    await expect(back).toBeVisible();
    await expect(back).toContainText('come back from');
    const review = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lp:progress')!).review);
    expect(review['in/protect-your-money/upi-fraud-and-the-clock#d2'].box).toBe(1);
  });

  test('the review checks include every drill situation once, under ids that cannot clash', async ({ page }) => {
    const response = await page.request.get('in/checks.json');
    expect(response.ok()).toBe(true);
    const raw = await response.text();
    const checks = JSON.parse(raw) as Record<string, { context?: string; lessonPath: string }>;
    const keys = Object.keys(checks);
    const written = [...raw.matchAll(/"([^"]+)":\{"lesson"/g)].map((m) => m[1]);
    expect(written.length).toBe(keys.length);
    expect(keys).toContain('in/protect-your-money/upi-fraud-and-the-clock#d2');
    for (const key of keys.filter((k) => k.includes('/tools/'))) {
      expect(key).toMatch(/^in\/tools\/[a-z-]+#[a-z][a-z0-9-]+$/);
      expect(checks[key].lessonPath).toBe(key.split('#')[0]);
    }
    expect(checks['in/protect-your-money/upi-fraud-and-the-clock#d2'].context).toContain('₹85');
  });
});

// ---- Brief changes 28 to 30: the grouped tools index, the edition fronts and the home panel ----

const GROUP_TITLES = {
  in: ['Your first pay', 'A buffer for a bad month', 'Borrowing and paying later', 'Working for yourself', 'Before you send, sign or reply'],
  eu: ['Your first pay', 'A buffer for a bad month', 'Borrowing and paying later', 'Moving out', 'Working for yourself', 'Before you send, sign or reply'],
  us: ['Your first pay', 'A buffer for a bad month', 'Borrowing and paying later', 'Working for yourself', 'Before you send, sign or reply'],
};
/** The groups with at least one tool ready to show, in page order. */
const shownGroupTitles = (edition: (typeof EDITIONS)[number]) =>
  GROUP_TITLES[edition].filter((title) => groupsFor(edition).some((g) => g.group.title === title));

test.describe('the tools index, grouped by moment', () => {
  for (const edition of EDITIONS) {
    test(`/${edition}/tools has its groups in order and every tool once`, async ({ page }) => {
      expect(registeredFor(edition)).toHaveLength({ in: 12, eu: 11, us: 11 }[edition]);
      await page.goto(`${edition}/tools`);
      await expect(page.locator('.tool-group h2')).toHaveText(shownGroupTitles(edition));
      await expect(page.locator('.tool-group a.index-row')).toHaveCount(toolsFor(edition).length);
      for (const tool of STUBS) await expect(page.locator(`a[href$="/tools/${tool.slug}"]`)).toHaveCount(0);
    });
  }

  test('each row says what kind of tool it is and how long it takes', async ({ page }) => {
    await page.goto('in/tools');
    await expect(page.locator(`a.index-row[href="${BASE}in/tools/loan"]`)).toContainText('Calculator, about 2 minutes');
    const drill = page.locator(`a.index-row[href="${BASE}in/tools/spot-the-fake"]`);
    await expect(drill).toContainText('UPI: spot the fake');
    await expect(drill.locator('.index-meta')).toHaveText(/Drill, \d+ situations, about 5 minutes/);
  });

  test('the United States index promises no payment drill it does not have', async ({ page }) => {
    await page.goto('us/tools');
    await expect(page.locator('a[href*="/tools/spot-the-fake"]')).toHaveCount(0);
  });

  test('a jump link goes to its group, below the header', async ({ page }) => {
    await page.goto('eu/tools');
    await page.locator('.tool-jumps').getByRole('link', { name: 'Working for yourself' }).click();
    await expect(page).toHaveURL(/#own-work$/);
    const heading = page.locator('#own-work-h');
    await expect(heading).toBeInViewport();
    const header = await page.locator('.site-header').evaluate((e) => ({
      bottom: e.getBoundingClientRect().bottom,
      stuck: ['sticky', 'fixed'].includes(getComputedStyle(e).position),
    }));
    const top = await heading.evaluate((e) => e.getBoundingClientRect().top);
    if (header.stuck) expect(top).toBeGreaterThanOrEqual(header.bottom);
  });
});

test.describe('the edition fronts and the home page', () => {
  const panel = (page: Page) => page.locator('.taxonomy');
  /** The first tool of each group, where a stub gives way to the next tool in its group. */
  const firstOfEach = (candidates: string[][]) =>
    candidates.map((group) => group.find(ready)).filter((slug): slug is string => slug !== undefined).map((slug) => toolBySlug(slug)!.short);

  test('India shows one question per group and all its tools', async ({ page }) => {
    await page.goto('in');
    await expect(panel(page).locator('h2')).toHaveText('Tools that answer');
    await expect(panel(page).locator('.taxonomy-list a')).toHaveText(
      firstOfEach([['take-home-pay', 'budget'], ['buffer-target', 'savings'], ['loan'], ['side-hustle'], ['spot-the-fake']]),
    );
    if (ready('take-home-pay')) await expect(panel(page).locator('.taxonomy-list a').first()).toHaveText('What reaches my account?');
    const all = panel(page).getByRole('link', { name: `All ${toolsFor('in').length} tools` });
    await expect(all).toHaveAttribute('href', `${BASE}in/tools`);
  });

  test('Europe adds moving out, and the United States ends with the job drill', async ({ page }) => {
    await page.goto('eu');
    await expect(panel(page).locator('.taxonomy-list a')).toHaveCount(groupsFor('eu').length);
    if (ready('rent-share')) await expect(panel(page).locator('.taxonomy-list')).toContainText('How much would this room take?');
    await expect(panel(page).getByRole('link', { name: `All ${toolsFor('eu').length} tools` })).toBeVisible();
    await page.goto('us');
    await expect(panel(page).locator('.taxonomy-list a').last()).toHaveText('Would I spot a fake job?');
    await expect(panel(page).getByRole('link', { name: `All ${toolsFor('us').length} tools` })).toBeVisible();
    for (const path of ['in', 'eu', 'us']) {
      await page.goto(path);
      for (const tool of STUBS) await expect(panel(page).locator(`a[href$="/tools/${tool.slug}"]`)).toHaveCount(0);
    }
  });

  test('the home page shows the five all-edition questions, routed through the reader’s edition', async ({ page }) => {
    await page.goto('');
    const links = panel(page).locator('.taxonomy-list a');
    await expect(links).toHaveCount(5);
    const paths = await links.evaluateAll((els) => els.map((el) => el.getAttribute('data-edition-path')));
    // The first all-edition tool of each group that is ready; a stub gives way to the next one.
    const expected = GROUPS.map((g) => TOOLS.find((t) => t.group === g.id && !t.regions && ready(t.slug)))
      .filter((t) => t !== undefined)
      .map((t) => `tools/${t.slug}`);
    expect(paths).toEqual(expected);
    if (STUBS.length === 0) {
      expect(paths).toEqual(['tools/take-home-pay', 'tools/buffer-target', 'tools/loan', 'tools/side-hustle', 'tools/job-offer-check']);
    }
  });
});

test('the registry and the built pages agree on which tools exist', async ({ page }) => {
  for (const edition of EDITIONS) {
    for (const tool of registeredFor(edition)) {
      const response = await page.request.get(`${edition}/tools/${tool.slug}/`);
      expect(response.status(), `${edition}/tools/${tool.slug}`).toBe(tool.ready === false ? 404 : 200);
    }
  }
  expect(TOOLS.length).toBe(14);
});
