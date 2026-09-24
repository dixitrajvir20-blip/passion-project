/**
 * Rent and bills as a share of net pay, the calculator behind eu/money-basics/moving-out. One
 * question on the bench: what share of net pay rent and bills take, and what is left. The 40% line
 * is Eurostat's, from the page's edition (config), never from the currency picker, so the currency
 * is fixed to the edition and no currency field shows. What moving in costs before the first
 * payday is a second, smaller sum in a closed fold that never changes the monthly answer; it opens
 * on load only when a shared link set one of its fields.
 */
import { useEffect, useRef } from 'preact/hooks';
import {
  MAX_AMOUNT,
  UPFRONT_OPTIONS,
  cents,
  dayOneCost,
  housingShare,
  readUpfront,
  requiredLinePercent,
  ruleOf,
  type RentShareConfig,
  type RentShareDefaults,
} from '../lib/tools/rent-share';
import { formatCheckedDate, type Edition } from '../lib/tools/types';
import { money, percent, percentValue, type Locale } from '../lib/format';
import { Fact, Figure, HowItWorks, NumberField, Result, SelectField, ToolActions, exact, readAmount, readLinkParams, useFields, useLocale } from './tool-kit';
import './tools.css';
import './rent-share.css';

interface Props {
  config: RentShareConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

type Fields = Record<keyof RentShareDefaults, string>;

/** The fields inside the day-one fold: a link that sets any of them opens it. */
const FOLD_KEYS = ['deposit', 'firstMonthUpfront', 'moveCosts', 'saved'] as const;

const NET_PAY_ERROR = 'Enter your net pay a month, more than 0.';
const NOT_NEGATIVE = 'Enter 0 or more.';
const TOO_BIG = 'Enter a smaller amount.';

/** Too large to hold, or above MAX_AMOUNT, where the whole-cent sums would stop being exact. */
const tooBig = (read: ReturnType<typeof readAmount>) => read.tooBig || (read.value !== null && Math.abs(read.value) > MAX_AMOUNT);

/** An amount that may be 0: blank counts as 0 with no error, a negative counts as 0 with one. */
function amount(raw: string): { value: number; error?: string } {
  const read = readAmount(raw);
  if (tooBig(read)) return { value: 0, error: TOO_BIG };
  if (read.value === null) return { value: 0 };
  return { value: read.value, error: read.value < 0 ? NOT_NEGATIVE : undefined };
}

/**
 * Net pay must be at least a cent: blank, 0, a negative from a link, or an amount that rounds to
 * 0 cents (0.001) is an error, so the field and the sentence under the results agree.
 */
function netPayOf(raw: string): { value: number; error?: string } {
  const read = readAmount(raw);
  if (tooBig(read)) return { value: 0, error: TOO_BIG };
  if (read.value === null || cents(read.value) === 0) return { value: 0, error: NET_PAY_ERROR };
  return { value: read.value };
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
/** "one month's rent", "two months' rent". */
const monthsOfRent = (n: number) => `${COUNT_WORDS[n] ?? String(n)} ${n === 1 ? "month's" : "months'"} rent`;

export default function RentShare({ config, localeCode }: Props) {
  const defaults: Fields = config.defaults;
  const { fields, set, reset } = useFields('rs', defaults, { allowed: { firstMonthUpfront: UPFRONT_OPTIONS } });
  // The line comes with the edition, so the currency does too: lp:locale is neither read nor written.
  const { locale } = useLocale(localeCode, { fixed: true });
  const fold = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // After mount, never during SSR: a link that carries a day-one field (even one the select
    // refuses) opens the fold, so the reader sees the figures the link was about.
    const linked = readLinkParams(Object.fromEntries(FOLD_KEYS.map((key) => [key, ''])));
    if (Object.keys(linked).length > 0 && fold.current) fold.current.open = true;
  }, []);

  // Never a fallback figure: a config without its sourced line fails the build here.
  const linePercent = requiredLinePercent(config);
  const lineText = percent(linePercent / 100, locale, 0);

  const net = netPayOf(fields.netPay);
  const rent = amount(fields.rent);
  const bills = amount(fields.bills);
  const deposit = amount(fields.deposit);
  const moveCosts = amount(fields.moveCosts);
  const saved = amount(fields.saved);
  const upfront = readUpfront(fields.firstMonthUpfront);

  const month = housingShare(net.value, rent.value, bills.value, linePercent);
  const day = dayOneCost(rent.value, deposit.value, upfront === 'yes', moveCosts.value, saved.value);
  const valid = month.ratio !== null && month.left !== null;

  const shareText = shareOf(month, linePercent, locale);
  const left = month.left ?? 0;
  const over = left < 0;

  // Every field, in the order of the page, after the #; the select normalised.
  const query: Fields = {
    netPay: fields.netPay,
    rent: fields.rent,
    bills: fields.bills,
    deposit: fields.deposit,
    firstMonthUpfront: upfront,
    moveCosts: fields.moveCosts,
    saved: fields.saved,
  };

  const young = ruleOf(config, 'overburdenYoung2025');
  const all = ruleOf(config, 'overburdenAll2025');
  const frUnfurnished = ruleOf(config, 'depositCapFrUnfurnished');
  const frFurnished = ruleOf(config, 'depositCapFrFurnished');
  const de = ruleOf(config, 'depositCapDe');
  const lineRule = ruleOf(config, 'overburdenLine');

  const dayRows = [
    day.deposit > 0 && { label: 'Deposit', value: day.deposit },
    upfront === 'yes' && { label: "First month's rent in advance", value: day.firstMonth },
    day.moveCosts > 0 && { label: 'Moving and connecting the bills', value: day.moveCosts },
  ].filter((row): row is { label: string; value: number } => Boolean(row));

  return (
    <div class="tool rent-share">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <NumberField
            id="rs-netPay"
            label="Net pay a month"
            hint="What reaches your account from work in a normal month. Paid 13 or 14 times a year? Add up a year's net pay and divide by 12. Leave out any housing allowance and take it off the rent instead: Eurostat counts it that way."
            value={fields.netPay}
            onInput={set('netPay')}
            error={net.error}
          />
          <NumberField
            id="rs-rent"
            label="Rent a month, your share"
            hint="The rent in the listing or contract. If it already includes some bills (an all-in or warm rent), put only the bills it leaves out under Bills. Weekly rent: multiply by 52 and divide by 12."
            value={fields.rent}
            onInput={set('rent')}
            error={rent.error}
          />
          <NumberField
            id="rs-bills"
            label="Bills a month, your share"
            hint="Your share of water, electricity, gas and heating, plus any refuse or building charges you pay, if the rent does not include them. Not your phone or internet. Ask the current tenants."
            value={fields.bills}
            onInput={set('bills')}
            error={bills.error}
          />
          <ToolActions query={query} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          {valid && <Figure label="of net pay on rent and bills" value={shareText} loss={over} />}
          <Result label="Net pay" value={valid ? exact(month.netPay, locale) : '—'} />
          <Result op="−" label="Rent" value={exact(month.rent, locale)} />
          <Result subtotal label="After rent" value={month.afterRent !== null ? exact(month.afterRent, locale) : '—'} />
          <Result op="−" label="Bills" value={exact(month.bills, locale)} />
          <Result
            main
            label={over ? 'Rent and bills above net pay' : 'Left after rent and bills'}
            value={valid ? exact(Math.abs(left), locale) : '—'}
            loss={over}
          />
          <div class="rent-share-facts">
            <Fact label="Rent and bills together" value={exact(month.housing, locale)} />
            {valid && month.line !== null && (
              <>
                <Fact label={`${lineText} of this net pay, the line Eurostat uses for households`} value={exact(month.line, locale)} />
                <Fact label="Rent and bills against that line" value={gapText(month.gap ?? 0, month.position, lineText, locale)} />
              </>
            )}
          </div>
          <p class="notice">
            Eurostat counts a household as overburdened when housing costs, net of housing allowances, take more than {lineText} of
            its disposable income. Here your net pay stands in for the household's, as in the lesson. It is a statistic about
            households, not a limit set for you.
          </p>
          <p class="plain" role="status">
            {monthSentence(month, shareText, locale, net.error)}
          </p>
        </div>
      </div>

      <details class="how" ref={fold}>
        <summary>What moving in costs before the first payday</summary>
        <div class="tool-grid">
          <div class="inputs">
            <NumberField
              id="rs-deposit"
              label="Deposit due at the start"
              hint="The amount in the listing or contract, returned at the end if nothing is owed. The lesson's example is two months' rent, 2 × €520. Your country may cap it: France and Germany do, counting the cap on rent without bills. If you may pay it in parts, enter the part due at the start."
              value={fields.deposit}
              onInput={set('deposit')}
              error={deposit.error}
            />
            <SelectField
              id="rs-firstMonthUpfront"
              label="First month's rent paid in advance"
              hint="Whether the first month's rent is due on the day you collect the keys, on top of the deposit. The contract says."
              value={upfront}
              options={[
                { value: 'yes', label: 'Yes, with the deposit' },
                { value: 'no', label: 'No' },
              ]}
              onChange={set('firstMonthUpfront')}
            />
            <NumberField
              id="rs-moveCosts"
              label="Moving and connecting the bills"
              hint="Moving your things and connecting the bills: a one-off amount. The lesson's example is €60 + €80."
              value={fields.moveCosts}
              onInput={set('moveCosts')}
              error={moveCosts.error}
            />
            <NumberField
              id="rs-saved"
              label="Saved so far"
              hint="What you could use on day one without borrowing."
              value={fields.saved}
              onInput={set('saved')}
              error={saved.error}
            />
          </div>
          <div>
            {dayRows.map((row, index) => (
              <Result op={index > 0 ? '+' : undefined} label={row.label} value={exact(row.value, locale)} />
            ))}
            <Result main label="Due before the first payday" value={exact(day.total, locale)} />
            <div class="rent-share-facts">
              <Fact label="Saved so far" value={exact(day.saved, locale)} />
              <Fact
                label="Against what is saved"
                value={
                  day.position === 'more'
                    ? `${exact(day.gap, locale)} more than saved`
                    : day.position === 'covered'
                      ? `covered, ${exact(-day.gap, locale)} left`
                      : 'exactly what is saved'
                }
              />
            </div>
            <p class="plain" role="status">
              {daySentence(day, locale)}
            </p>
          </div>
        </div>
      </details>

      <HowItWorks>
        <p class="formula numbers">
          rent and bills = rent + bills
          <br />
          share of net pay = rent and bills ÷ net pay
          <br />
          left after rent and bills = net pay − rent − bills
          <br />
          the line = {lineText} × net pay
        </p>
        <p>
          The {lineText} comes from Eurostat, the EU's statistics office. It counts a household as overburdened when its total
          housing costs, net of housing allowances, come to more than {lineText} of its disposable income
          {lineRule && (
            <>
              {' '}(<a href={lineRule.source.url} rel="noopener noreferrer">{lineRule.source.title}</a>, checked{' '}
              {formatCheckedDate(lineRule.asOf)})
            </>
          )}
          . Two things differ here, as in the lesson: your net pay stands in for the household's disposable income, and the sum is
          done for one month. The line is a statistic about households, not a limit or a verdict on a room. Exactly {lineText} is
          not counted as overburdened, because the definition says more than {lineText}. The question that matters is whether what
          is left covers food, travel, your phone and a buffer; the budget planner works that out.
          {young && all && (
            <>
              {' '}In 2025, {percentValue(young.value, locale, 1)} of people aged 15 to 29 in the EU lived in a household above
              the line, against {percentValue(all.value, locale, 1)} of all people (
              <a href={young.source.url} rel="noopener noreferrer">{young.source.title}</a>).
            </>
          )}
        </p>
        <p>
          What this does not count: anyone else's income in your household; pay that comes 13 or 14 times a year, unless you enter
          a year's net pay divided by 12; a housing allowance, unless you leave it out of net pay and take it off the rent as the
          hint says; bills already inside an all-in rent, which belong in the rent only; rises in rent or bills; and the rest of
          your month.
        </p>
        <p>
          Moving in: due before the first payday = the deposit due at the start + the first month's rent, if it is asked in
          advance + moving and connecting the bills, set against what you have saved. The deposit comes back at the end if nothing
          is owed, so until then it is money you cannot spend. Deposit rules are national.
          {frUnfurnished && frFurnished && (
            <>
              {' '}France caps the deposit at {monthsOfRent(frUnfurnished.value)} without charges for an unfurnished home and{' '}
              {COUNT_WORDS[frFurnished.value] ?? frFurnished.value} for a furnished one (
              <a href={frUnfurnished.source.url} rel="noopener noreferrer">{frUnfurnished.source.title}</a>).
            </>
          )}
          {de && (
            <>
              {' '}German law caps it at {monthsOfRent(de.value)} without operating costs and lets a tenant pay it in three monthly
              parts, the first at the start (<a href={de.source.url} rel="noopener noreferrer">{de.source.title}</a>).
            </>
          )}{' '}
          Your national housing or consumer authority states the rule where you rent.
        </p>
        <p>
          Before you pay anything: pay nothing before a viewing and a signed contract. If a listing asks for money first, report it
          to the portal. If you have paid, tell the police and, if you paid by card or direct debit, your bank at once. A European
          Consumer Centre advises free of charge when the business is in another EU country, Norway or Iceland.
        </p>
        <p>
          Currency: the share and the line are the same in any currency. The amounts here are shown in euros, the currency of this
          edition. For złoty, kronor or another currency, type the amounts as they are and read the share and the line, which do not
          depend on the symbol.
        </p>
      </HowItWorks>
    </div>
  );
}

/** The share as the Figure prints it, or "just over / under 40%" where one decimal would print the line itself. */
function shareOf(month: ReturnType<typeof housingShare>, linePercent: number, locale: Locale): string {
  if (month.ratio === null) return '—';
  const text = percent(month.ratio, locale, 1);
  if (month.position !== 'at' && text === percent(linePercent / 100, locale, 1)) {
    return `just ${month.position === 'over' ? 'over' : 'under'} ${percent(linePercent / 100, locale, 0)}`;
  }
  return text;
}

/** Where rent and bills sit against the line, in plain words; never a verdict. */
function gapText(gap: number, position: ReturnType<typeof housingShare>['position'], lineText: string, locale: Locale): string {
  if (position === 'at') return `exactly at it; Eurostat's definition counts only more than ${lineText}`;
  const side = position === 'over' ? 'over' : 'under';
  if (gap === 0) return `less than ${money(0.01, locale, 2)} ${side} it`;
  return `${exact(Math.abs(gap), locale)} ${side} it`;
}

function monthSentence(month: ReturnType<typeof housingShare>, share: string, locale: Locale, netError?: string): string {
  if (netError === TOO_BIG) return 'Enter a smaller net pay to see what share rent and bills take.';
  if (month.left === null) return 'Enter your net pay a month, more than 0, to see what share rent and bills take.';
  const netPay = exact(month.netPay, locale);
  if (month.housing === 0) return `Enter the rent and bills to see what share of your ${netPay} net pay they take.`;
  const housing = exact(month.housing, locale);
  if (month.left > 0) return `Rent and bills of ${housing} take ${share} of your ${netPay} net pay, leaving ${exact(month.left, locale)} for everything else.`;
  if (month.left === 0) return `Rent and bills of ${housing} take all of your ${netPay} net pay, leaving nothing for anything else.`;
  return `Rent and bills of ${housing} are ${exact(-month.left, locale)} more than your ${netPay} net pay.`;
}

function daySentence(day: ReturnType<typeof dayOneCost>, locale: Locale): string {
  if (day.total === 0) return 'Nothing is entered as due before the first payday.';
  const total = exact(day.total, locale);
  const saved = exact(day.saved, locale);
  if (day.gap > 0) {
    return day.saved > 0
      ? `Moving in takes ${total} before the first payday, ${exact(day.gap, locale)} more than the ${saved} saved.`
      : `Moving in takes ${total} before the first payday, and nothing is entered as saved yet.`;
  }
  if (day.gap < 0) return `Moving in takes ${total} before the first payday; the ${saved} saved covers it, with ${exact(-day.gap, locale)} left.`;
  return `Moving in takes ${total} before the first payday, exactly the ${saved} saved.`;
}
