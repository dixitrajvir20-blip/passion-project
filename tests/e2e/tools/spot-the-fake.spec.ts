/**
 * The payment drill on the real build: each edition's six situations in order, with the lesson's
 * screens first; the reveal wording, the review schedule and the return line; a keyboard-only
 * run; no brand and no real address on any screen; nothing typed and nothing in the address bar;
 * the page's edition, never the currency picker, deciding how amounts print; the review checks
 * the situations feed; and the whole set working with JavaScript off.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = '/passion-project/';

interface Situation {
  id: string;
  from: string;
  caption: string;
  amount?: string;
  answer: number;
}

const SETS: Record<'in' | 'eu', { title: string; intro: string; locale: string; situations: Situation[] }> = {
  in: {
    title: 'UPI: spot the fake',
    intro: 'Six screens. Two are ordinary payments, so refusing everything is not the answer.',
    locale: 'en-IN',
    situations: [
      { id: 'in/protect-your-money/upi-fraud-and-the-clock#d1', from: 'Refund team', caption: 'QR code', answer: 1 },
      { id: 'in/protect-your-money/upi-fraud-and-the-clock#d2', from: 'Tulvana General Store', caption: 'QR code', amount: '₹85', answer: 1 },
      { id: 'in/protect-your-money/upi-fraud-and-the-clock#d3', from: 'Caller: bank security team', caption: 'Incoming call', answer: 0 },
      { id: 'in/protect-your-money/upi-fraud-and-the-clock#d4', from: 'Video call: caller in uniform', caption: 'Incoming call', answer: 2 },
      { id: 'in/tools/spot-the-fake#kyc-link', from: 'Account alert', caption: 'Text message', answer: 2 },
      { id: 'in/tools/spot-the-fake#own-code', from: 'Your app: receive money', caption: 'QR code', amount: '₹300', answer: 0 },
    ],
  },
  eu: {
    title: 'Payments: spot the fake',
    intro: 'Six screens on the way to paying. Two are ordinary payments, so refusing everything is not the answer.',
    locale: 'en-IE',
    situations: [
      { id: 'eu/credit-and-fraud/instant-transfer-check#d1', from: 'Unknown number', caption: 'Chat', answer: 1 },
      { id: 'eu/credit-and-fraud/instant-transfer-check#d2', from: 'Your bank app', caption: 'Confirm transfer', amount: '€450', answer: 2 },
      { id: 'eu/credit-and-fraud/instant-transfer-check#d3', from: 'Seller, online marketplace', caption: 'Chat', answer: 0 },
      { id: 'eu/tools/spot-the-fake#no-check', from: 'Your bank app', caption: 'Confirm transfer', amount: '€95', answer: 2 },
      { id: 'eu/tools/spot-the-fake#club-match', from: 'Your bank app', caption: 'Confirm transfer', amount: '€45', answer: 1 },
      { id: 'eu/tools/spot-the-fake#shop-match', from: 'Your bank app', caption: 'Confirm transfer', amount: '€240', answer: 0 },
    ],
  },
};
const EDITIONS = ['in', 'eu'] as const;
const LESSON_PATH = {
  in: 'in/learn/protect-your-money/upi-fraud-and-the-clock',
  eu: 'eu/learn/credit-and-fraud/instant-transfer-check',
};

/** The per-edition brand denylist: capitalised marks as written, the rest in any case, whole words. */
const CASE_SENSITIVE = ['ING', 'ECB', 'EBA', 'EPC', 'SEPA', 'BLIK', 'iDEAL', 'BHIM', 'CRED', 'UIDAI', 'I4C', 'RBI', 'NPCI', 'SEBI', 'CBI', 'SBI', 'HDFC', 'ICICI', 'GPay'];
const DENY = {
  in: ['RBI', 'Reserve Bank', 'NPCI', 'SEBI', 'CBI', 'SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'PhonePe', 'Google Pay', 'GPay', 'BHIM', 'Amazon', 'Flipkart', 'WhatsApp', 'Amazon Pay', 'CRED', 'UIDAI', 'I4C'],
  eu: ['Wero', 'Revolut', 'N26', 'ING', 'bunq', 'Klarna', 'PayPal', 'Vinted', 'eBay', 'Bizum', 'iDEAL', 'Swish', 'BLIK', 'Satispay', 'Europol', 'ECB', 'EBA', 'EPC', 'SEPA'],
};
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const denied = (text: string, names: string[]) =>
  names.filter((name) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`, CASE_SENSITIVE.includes(name) ? '' : 'i').test(text));

const situation = (page: Page, n: number) => page.locator('.drill-list > li').nth(n - 1);
const review = (page: Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem('lp:progress');
    return raw ? (JSON.parse(raw).review ?? {}) : {};
  }) as Promise<Record<string, { box: number; due: string }>>;

/** Tomorrow as this browser's calendar day, YYYY-MM-DD, and as the return line prints it. */
const tomorrow = (page: Page, locale: string) =>
  page.evaluate((code) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      text: new Intl.DateTimeFormat(code, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d.getFullYear(), d.getMonth(), d.getDate())),
    };
  }, locale);

// The first-visit consent banner sits over the bottom of a phone screen; a stored "no" to every
// optional category keeps it out of the way, as a reader who answered it once would have it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('lp:consent', JSON.stringify({ v: 1, at: new Date().toISOString(), source: 'user', choices: { embeds: false, stats: false } }));
    } catch {
      // Storage blocked: the banner shows, and the test that blocks storage deals with it.
    }
  });
});

for (const edition of EDITIONS) {
  const set = SETS[edition];

  test.describe(`${edition}/tools/spot-the-fake`, () => {
    test('opens on six situations, the lesson’s first, each a made-up screen with its decision', async ({ page }) => {
      await page.goto(`${edition}/tools/spot-the-fake`);
      await expect(page.locator('h1')).toHaveText(set.title);
      await expect(page.locator('.drill > p').first()).toHaveText(set.intro);
      const items = page.locator('.drill-list > li');
      await expect(items).toHaveCount(6);
      for (const [index, s] of set.situations.entries()) {
        const item = items.nth(index);
        await expect(item.locator('.drill-count')).toHaveText(`Situation ${index + 1} of 6`);
        await expect(item.locator('.ms-from')).toHaveText(s.from);
        await expect(item.locator('figcaption')).toHaveText(s.caption);
        await expect(item.locator('.ms-tag')).toHaveText('A made-up screen for practice, not a real app.');
        if (s.amount) await expect(item.locator('.ms-amount')).toHaveText(s.amount);
        else await expect(item.locator('.ms-amount')).toHaveCount(0);
        await expect(item.locator('.poll')).toHaveAttribute('data-check-id', s.id);
        await expect(item.locator('.poll')).toHaveAttribute('data-answer', String(s.answer));
        await expect(item.locator('summary')).toHaveText('Show what it was');
      }
      await expect(page.locator('[data-drill-return]')).toBeHidden();
    });

    test('names no brand, bank, app or public body, and shows only .example addresses', async ({ page }) => {
      await page.goto(`${edition}/tools/spot-the-fake`);
      // Each printed line on its own, so the end of one line never runs into the start of the next.
      const lines = await page.locator('.mock-screen figcaption, .mock-screen p').allTextContents();
      expect(lines.length).toBeGreaterThan(18);
      expect(denied(lines.join(' | '), DENY[edition])).toEqual([]);
      const hosts = lines.flatMap((line) => line.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) ?? []);
      expect(hosts.filter((host) => !host.toLowerCase().endsWith('.example'))).toEqual([]);
      expect(hosts).toEqual(edition === 'in' ? ['kyc-update.example'] : []);
    });

    test('has nothing to type and no currency to pick; amounts follow the edition, not a saved currency', async ({ page }) => {
      await page.goto(`${edition}/tools/spot-the-fake`);
      await page.evaluate(() => window.localStorage.setItem('lp:locale', 'en-US'));
      await page.reload();
      await expect(page.locator('main select, main input:not([type=radio]), main textarea')).toHaveCount(0);
      await expect(page.locator('main .tool')).toHaveCount(0);
      for (const [index, s] of set.situations.entries()) {
        if (s.amount) await expect(situation(page, index + 1).locator('.ms-amount')).toHaveText(s.amount);
      }
      expect((await page.locator('.mock-screen').allTextContents()).join(' ')).not.toContain('$');
    });

    test('ends with the lesson’s reflection and reporting route, the sources and the terms', async ({ page }) => {
      await page.goto(`${edition}/tools/spot-the-fake`);
      await expect(page.locator('.drill .reflection')).not.toBeEmpty();
      const report = page.locator('.report');
      if (edition === 'in') {
        await expect(report.getByRole('link', { name: '1930' })).toHaveAttribute('href', 'tel:1930');
        await expect(report.getByRole('link', { name: 'cybercrime.gov.in' })).toHaveAttribute('href', 'https://cybercrime.gov.in');
        await expect(page.locator('.drill-scope')).toHaveCount(0);
      } else {
        await expect(report).toContainText('Tell your bank first');
        await expect(report.getByRole('link')).toHaveAttribute('href', 'https://www.europol.europa.eu/report-a-crime/report-cybercrime-online');
        await expect(page.locator('.drill-scope')).toHaveText(
          'Banks in the euro area have had to run the name check on euro transfers since 9 October 2025. Banks in EU countries outside the euro area add it by 9 July 2027; until then, the checks are yours to run.',
        );
      }
      const sources = page.locator('.tool-sources li');
      await expect(sources).toHaveCount(edition === 'in' ? 4 : 5);
      for (const link of await sources.getByRole('link').all()) {
        await expect(link).toHaveAttribute('href', /^https:\/\//);
        await expect(link).toHaveAttribute('rel', /noopener/);
      }
      const terms = edition === 'in' ? ['upi', 'pin', 'kyc', 'otp', 'qr-code', 'digital-arrest'] : ['iban', 'verification-of-payee', 'instant-credit-transfer'];
      for (const id of terms) await expect(page.locator(`.tool-terms #term-${id}`)).toHaveCount(1);
      await expect(page.locator('.related li').first().getByRole('link')).toHaveAttribute('href', `${BASE}${LESSON_PATH[edition]}`);
      await expect(page.locator('main')).toContainText('Every screen and message here is made up.');
    });
  });
}

test.describe('the reveal, the schedule and the return line', () => {
  test('keyboard only: tab to a situation, choose with the arrows, reveal with Enter', async ({ page }) => {
    await page.goto('in/tools/spot-the-fake');
    // From the top of the page, with nothing but the Tab key, to situation 5's options.
    let reached = false;
    for (let presses = 0; presses < 250 && !reached; presses++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.name === 'drill-5');
    }
    expect(reached, 'Tab reaches the fifth situation').toBe(true);
    const fifth = situation(page, 5);
    await expect(fifth.locator('input[type=radio]').first()).toBeFocused();
    await page.keyboard.press('ArrowDown'); // moves to and picks the second option
    await page.keyboard.press('ArrowDown'); // and on to the third, the right one
    await expect(fifth.locator('input[type=radio]').nth(2)).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(fifth.locator('summary')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(fifth.locator('.answer')).toBeVisible();
    await expect(fifth.locator('.poll-status')).toHaveText('Correct.');
    await expect(fifth.locator('.answer')).toContainText("Leave it, and check in your bank's app");
    await expect(fifth.locator('.answer')).toContainText('Banks tell you in advance when KYC is due');

    const { day, text } = await tomorrow(page, 'en-IN');
    expect((await review(page))['in/tools/spot-the-fake#kyc-link']).toEqual({ box: 1, due: day });
    await expect(page.locator('[data-drill-return]')).toHaveText(`These situations come back from ${text}. Nothing to do until then.`);
    // Nothing chosen travels: no query and no fragment.
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('a reveal with no pick shows the answer, says so, and comes back tomorrow', async ({ page }) => {
    await page.goto('in/tools/spot-the-fake');
    const sixth = situation(page, 6);
    await sixth.locator('summary').click();
    await expect(sixth.locator('.poll-status')).toHaveText('No pick this time, so this one comes back tomorrow.');
    await expect(sixth.locator('.answer')).toContainText('Show your code and let your friend scan it');
    await expect(sixth.locator('.answer')).toContainText('No scan, and no PIN, fingerprint or face from you.');
    const { day } = await tomorrow(page, 'en-IN');
    expect((await review(page))['in/tools/spot-the-fake#own-code']).toEqual({ box: 1, due: day });
    await expect(page.locator('[data-drill-return]')).toBeVisible();
  });

  test('a wrong pick says not quite and explains that pick, and only the first reveal counts', async ({ page }) => {
    await page.goto('eu/tools/spot-the-fake');
    const sixth = situation(page, 6);
    await sixth.getByLabel('Send it. The name check says match').check();
    await sixth.locator('summary').click();
    await expect(sixth.locator('.poll-status')).toHaveText('Not quite.');
    await expect(sixth.locator('.answer')).toContainText('not that the shop will deliver');
    await expect(sixth.locator('.answer')).toContainText('Stop, and pay this shop nothing');
    // Only the line for the reader's own pick (the second option) shows under the answer.
    await expect(sixth.locator('.fb').nth(1)).toBeVisible();
    await expect(sixth.locator('.fb').nth(1)).toContainText('It says nothing about whether a phone will arrive.');
    await expect(sixth.locator('.fb').nth(0)).toBeHidden();
    await expect(sixth.locator('.fb').nth(2)).toBeHidden();
    const first = await review(page);
    expect(first['eu/tools/spot-the-fake#shop-match'].box).toBe(1);

    // Close, change to the right pick, reveal again: the first reveal stands.
    await sixth.locator('summary').click();
    await sixth.locator('input[type=radio]').nth(0).check();
    await sixth.locator('summary').click();
    await expect(sixth.locator('.poll-status')).toHaveText('Not quite.');
    expect(await review(page)).toEqual(first);
  });

  test('a right pick in Europe is scheduled under the tool’s own id, with the date in the edition’s format', async ({ page }) => {
    await page.goto('eu/tools/spot-the-fake');
    const fifth = situation(page, 5);
    await fifth.getByLabel('Check the amount and the name, then confirm').check();
    await fifth.locator('summary').click();
    await expect(fifth.locator('.poll-status')).toHaveText('Correct.');
    const { day, text } = await tomorrow(page, 'en-IE');
    expect(await review(page)).toEqual({ 'eu/tools/spot-the-fake#club-match': { box: 1, due: day } });
    await expect(page.locator('[data-drill-return]')).toHaveText(`These situations come back from ${text}. Nothing to do until then.`);
  });

  test('with storage blocked the reveals still work, and no return is promised', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
    });
    await page.goto('in/tools/spot-the-fake');
    // With storage blocked no consent can be stored, so the banner is there to answer.
    await page.locator('.consent-banner').getByRole('button', { name: 'Reject all' }).click();
    const fifth = situation(page, 5);
    await fifth.locator('input[type=radio]').nth(2).check();
    await fifth.locator('summary').click();
    await expect(fifth.locator('.answer')).toBeVisible();
    await expect(fifth.locator('.poll-status')).toHaveText('Correct.');
    await expect(page.locator('[data-drill-return]')).toBeHidden();
  });

  test('with storage blocked, a reveal with no pick still shows the answer and no return line', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
    });
    await page.goto('in/tools/spot-the-fake');
    await page.locator('.consent-banner').getByRole('button', { name: 'Reject all' }).click();
    const sixth = situation(page, 6);
    await sixth.locator('summary').click();
    await expect(sixth.locator('.answer')).toBeVisible();
    await expect(sixth.locator('.answer')).toContainText('Show your code and let your friend scan it');
    await expect(sixth.locator('.poll-status')).toHaveText(/^No pick this time/);
    await expect(page.locator('[data-drill-return]')).toBeHidden();
  });

  // Nothing is saved with storage blocked, so the status must not promise a return.
  test('with storage blocked, a no-pick reveal promises no return', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
    });
    await page.goto('in/tools/spot-the-fake');
    await page.locator('.consent-banner').getByRole('button', { name: 'Reject all' }).click();
    const sixth = situation(page, 6);
    await sixth.locator('summary').click();
    const status = sixth.locator('.poll-status');
    await expect(status).toHaveText(/^No pick this time/);
    expect(await status.textContent()).not.toContain('comes back');
  });

  test('with every situation revealed, the page still has no serious accessibility issue', async ({ page }) => {
    test.setTimeout(60_000);
    for (const edition of EDITIONS) {
      await page.goto(`${edition}/tools/spot-the-fake`);
      for (let n = 1; n <= 6; n++) {
        await situation(page, n).locator('input[type=radio]').first().check();
        await situation(page, n).locator('summary').click();
      }
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
    }
  });
});

test.describe('the review checks these situations feed', () => {
  test('India: the two bank situations under the tool’s ids, and the lesson’s under the lesson’s', async ({ page }) => {
    const checks = await (await page.request.get('in/checks.json')).json();
    expect(checks['in/tools/spot-the-fake#kyc-link']).toMatchObject({ lesson: 'UPI: spot the fake', lessonPath: 'in/tools/spot-the-fake', answer: 2 });
    expect(checks['in/tools/spot-the-fake#kyc-link'].context).toBe(
      'Account alert: Your bank KYC expires today. Update now or your account will be blocked: kyc-update.example/verify [Open link]',
    );
    expect(checks['in/tools/spot-the-fake#own-code'].context).toBe(
      'Your app: receive money: ₹300 Your own payment code Whoever scans this pays you. [Show code]',
    );
    expect(checks['in/protect-your-money/upi-fraud-and-the-clock#d2'].context).toBe(
      'Tulvana General Store: ₹85 Paying Tulvana General Store You scanned this code at the counter. [Enter UPI PIN to pay]',
    );
    expect(Object.keys(checks).filter((k) => k.startsWith('in/tools/spot-the-fake#')).sort()).toEqual([
      'in/tools/spot-the-fake#kyc-link',
      'in/tools/spot-the-fake#own-code',
    ]);
  });

  test('Europe: the three bank situations, with the amounts the screens print', async ({ page }) => {
    const checks = await (await page.request.get('eu/checks.json')).json();
    expect(checks['eu/tools/spot-the-fake#club-match']).toMatchObject({ lesson: 'Payments: spot the fake', lessonPath: 'eu/tools/spot-the-fake' });
    expect(checks['eu/tools/spot-the-fake#club-match'].context).toBe(
      'Your bank app: €45 To: Lirmavik Rowing Club Name check: match. You paid this account in March. [Confirm and send]',
    );
    expect(checks['eu/tools/spot-the-fake#shop-match'].context).toBe(
      'Your bank app: €240 To: Velquist Phones Name check: match. Speed: instant Reference: order 4471 [Confirm and send]',
    );
    expect(checks['eu/tools/spot-the-fake#no-check'].context).toBe(
      'Your bank app: €95 To: Ostrakel Driving School New payee: first payment to this IBAN Name check: not possible. [Send anyway]',
    );
    expect(checks['eu/credit-and-fraud/instant-transfer-check#d2'].context).toMatch(/^Your bank app: €450 To: Rovaskel Property/);
  });

  test('the United States has none of them', async ({ page }) => {
    const checks = await (await page.request.get('us/checks.json')).json();
    expect(Object.keys(checks).some((k) => k.includes('spot-the-fake'))).toBe(false);
  });
});

test.describe('where the drill is listed', () => {
  test('each edition’s tools index counts its six situations', async ({ page }) => {
    for (const edition of EDITIONS) {
      await page.goto(`${edition}/tools`);
      const row = page.locator(`a.index-row[href="${BASE}${edition}/tools/spot-the-fake"]`);
      await expect(row).toContainText(SETS[edition].title);
      await expect(row.locator('.index-meta')).toHaveText('Drill, 6 situations, about 5 minutes');
    }
  });

  test('the Europe lesson now points to more situations like its own', async ({ page }) => {
    await page.goto('eu/learn/credit-and-fraud/instant-transfer-check');
    const link = page.locator(`.tool-handoffs a[href="${BASE}eu/tools/spot-the-fake"]`);
    await expect(link).toHaveText('Practise on more situations in “Payments: spot the fake”');
  });
});

test.describe('with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  for (const edition of EDITIONS) {
    test(`${edition}/tools/spot-the-fake: all six can be decided and revealed, and nothing is scored`, async ({ page }) => {
      await page.goto(`${edition}/tools/spot-the-fake`);
      await expect(page.locator('.drill-list > li')).toHaveCount(6);
      for (let n = 1; n <= 6; n++) {
        const item = situation(page, n);
        await item.locator('input[type=radio]').first().check();
        await item.locator('summary').click();
        await expect(item.locator('.answer')).toBeVisible();
        await expect(item.locator('.poll-status')).toBeEmpty();
      }
      await expect(page.locator('[data-drill-return]')).toBeHidden();
    });
  }
});
