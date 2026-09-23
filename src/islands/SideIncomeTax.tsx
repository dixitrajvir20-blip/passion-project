/**
 * Tax on side income and fees, the calculator behind us/start-something/se-tax and
 * in/money-basics/tds-refund. One question per edition, picked by the page's edition, never by
 * the currency picker:
 *  - United States: after costs, self-employment tax (set by law) and an income-tax share the
 *    reader types (0 by default), less what is already paid toward it: what to set aside.
 *  - India: tax deducted in your name as the statement shows it, plus other tax already paid,
 *    less the tax due on that year's whole income (typed, never worked out here): what can come
 *    back, or is still to pay.
 *
 * The rules come with the edition, so the currency does too: no currency field, and lp:locale is
 * neither read nor written. The figures travel only after the #, and this tool reads them only
 * from there: an old-style ?query is ignored, so a tax figure never sits in a request line.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import {
  ERRORS,
  beyondScopeProfit,
  checkAmount,
  dateFromRule,
  indiaRulesFrom,
  ruleValue,
  seCombinedRate,
  seStartProfit,
  selfEmploymentSetAside,
  tdsBalance,
  usRulesFrom,
  type IndiaFields,
  type Link,
  type SideIncomeTaxConfig,
  type UsFields,
} from '../lib/tools/side-income-tax';
import type { Edition } from '../lib/tools/types';
import { roundMoney, toBasisPoints, toCents } from '../lib/finance';
import { localeByCode, percentValue, ratePercent, type Locale } from '../lib/format';
import { parseLinkParams } from '../lib/link-params';
import { HowItWorks, NumberField, Result, ToolActions, exact, linkSnapshot, readAmount } from './tool-kit';
import './tools.css';

interface Props {
  config: SideIncomeTaxConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

const PREFIX = 'sit';

/** US estimated-tax and India advance-tax due dates, as month and day. */
const US_DUE: readonly [number, number][] = [
  [4, 15],
  [6, 15],
  [9, 15],
  [1, 15],
];
const IN_DUE: readonly [number, number][] = [
  [6, 15],
  [9, 15],
  [12, 15],
  [3, 15],
];

/** "April 15" on /us, "15 June" on /in: a month and day written the edition's way. */
const monthDay = (locale: Locale, [month, day]: readonly [number, number]) =>
  new Intl.DateTimeFormat(locale.code, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(Date.UTC(2026, month - 1, day));

/** "a, b, c and d", without a serial comma, as the rest of the site writes lists. */
const andList = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

const ExternalLink = ({ link, children }: { link: Link; children?: ComponentChildren }) => (
  <a href={link.url} rel="noopener noreferrer">
    {children ?? link.title}
  </a>
);

/**
 * A value an `<input type="number">` keeps: the HTML valid floating-point number (no leading +, no
 * trailing point, no spaces), and finite. Anything else the input shows as blank, while readAmount
 * would still strip it to a number, so the answer would disagree with the field.
 */
const NUMERIC = /^-?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?$/i;
const numberInputKeeps = (value: string) => value === '' || (NUMERIC.test(value) && Number.isFinite(Number(value)));

/**
 * Field state for inputs with ids `sit-<key>`, like the kit's useFields, except that a link is read
 * from the fragment only (the kit also reads the ?query of older links; this tool never had any),
 * and a link value is kept only when a number input can show it (numberInputKeeps). Values typed
 * before the JavaScript arrived are adopted; a link wins over them. The kit's linkSnapshot reads
 * the fragment once and removes it from the address bar.
 */
function useFragmentFields<T extends Record<string, string>>(defaults: T) {
  const [fields, setFields] = useState<T>(defaults);
  const [linked, setLinked] = useState<string[]>([]);

  useEffect(() => {
    const fromDom: Record<string, string> = {};
    for (const key of Object.keys(defaults)) {
      const el = document.getElementById(`${PREFIX}-${key}`);
      if (el instanceof HTMLInputElement && el.value !== defaults[key]) fromDom[key] = el.value;
    }
    const fromLink = Object.fromEntries(
      Object.entries(parseLinkParams(linkSnapshot().hash, '', Object.keys(defaults))).filter(([, value]) => numberInputKeeps(value)),
    );
    if (Object.keys(fromDom).length > 0 || Object.keys(fromLink).length > 0) {
      setFields((current) => ({ ...current, ...fromDom, ...fromLink }));
    }
    setLinked(Object.keys(fromLink));
  }, []);

  const set = (key: keyof T) => (event: Event) => setFields((current) => ({ ...current, [key]: (event.target as HTMLInputElement).value }));
  const reset = () => setFields({ ...defaults });
  return { fields, set, reset, linked };
}

export default function SideIncomeTax({ config, edition, localeCode }: Props) {
  // Money is always the edition's: ₹ with en-IN grouping on /in, $ on /us.
  const locale = localeByCode(localeCode);
  if (edition === 'us') return <UnitedStates config={config} locale={locale} />;
  if (edition === 'in') return <India config={config} locale={locale} />;
  return null;
}

/* ============================================================================================
 * United States
 * ========================================================================================== */

function UnitedStates({ config, locale }: { config: SideIncomeTaxConfig; locale: Locale }) {
  const defaults = config.defaults as UsFields;
  const rules = usRulesFrom(config.rules);
  const standard = ruleValue(config.rules, 'standardDeductionSingle2026');
  const dependentFloor = ruleValue(config.rules, 'dependentStandardDeductionFloor2026');
  const dependentAddOn = ruleValue(config.rules, 'dependentEarnedIncomeAddOn2026');
  const { fields, set, reset } = useFragmentFields(defaults);
  const $ = (value: number) => exact(value, locale);

  const moneyIn = checkAmount(readAmount(fields.moneyIn));
  const costs = checkAmount(readAmount(fields.costs));
  const rate = checkAmount(readAmount(fields.incomeTaxPercent), { percent: true });
  const paid = checkAmount(readAmount(fields.alreadyPaid));
  const typedOk = !moneyIn.error && !costs.error && !rate.error && !paid.error;

  const inMoney = roundMoney(moneyIn.value ?? 0);
  const costMoney = roundMoney(costs.value ?? 0);
  // The rate is used, tested and printed as whole basis points, so a rate that rounds to 0 reads as 0.
  const rateBp = toBasisPoints(rate.value ?? 0);
  const paidMoney = roundMoney(paid.value ?? 0);
  const r = selfEmploymentSetAside({ moneyIn: inMoney, costs: costMoney, incomeTaxPercent: rateBp / 100, alreadyPaid: paidMoney }, rules);

  // Above the Additional Medicare line the sum stops being complete, so it is not shown.
  const scopeError =
    typedOk && r.beyondScope
      ? `Above ${$(rules.additionalMedicareThreshold)} of net earnings, about ${$(Math.round(beyondScopeProfit(rules) / 100) * 100)} of profit, an extra 0.9% Medicare tax can apply, so this sum stops being complete. IRS Topic 554 explains it.`
      : undefined;
  const valid = typedOk && !scopeError;

  const rateText = ratePercent(rateBp / 100, locale, 2);
  const combined = ratePercent(seCombinedRate(rules), locale, 2);
  const share = ratePercent(rules.seNetEarningsShare, locale, 2);
  const startProfit = $(Math.round(seStartProfit(rules)));
  const threshold = $(rules.seThreshold);

  const seCaption = r.seApplies
    ? r.netEarnings > rules.ssWageBase
      ? `${ratePercent(rules.seSocialSecurityRate, locale, 2)} of ${$(rules.ssWageBase)}, the most the Social Security part applies to, and ${ratePercent(rules.seMedicareRate, locale, 2)} of ${$(r.netEarnings)}, which is ${share} of ${$(r.profit)}, rounded to the dollar`
      : `${combined} of ${$(r.netEarnings)}, which is ${share} of ${$(r.profit)}, rounded to the dollar`
    : `${share} of ${$(r.profit)} is ${$(r.netEarnings)}, under ${threshold}, so none is due`;

  const sentence = valid ? usSentence() : '';

  function paidSentence(): string {
    if (r.balance > 0) return `After the ${$(paidMoney)} already paid toward it, set aside ${$(r.balance)} on these figures.`;
    if (r.balance === 0) return 'What you have paid toward it covers this sum.';
    return `More has been paid than this sum shows, by ${$(-r.balance)}; the year’s return settles it.`;
  }

  function usSentence(): string {
    if (inMoney === 0 && costMoney === 0) return 'Enter the money in from the work to see the tax on it.';
    if (r.net === 0) {
      return `Money in of ${$(inMoney)} matches the costs of the work, so it made no profit on these figures and no tax is worked out on it.`;
    }
    if (r.loss) {
      const settled = paidMoney > 0 ? ` The year’s return settles the ${$(paidMoney)} already paid.` : '';
      return `Against ${$(costMoney)} of costs, ${$(inMoney)} in is a loss of ${$(-r.net)} on these figures, so no tax is worked out on it.${settled}`;
    }
    const opening = `Of ${$(inMoney)} in, ${$(r.profit)} is profit after costs.`;
    if (r.seApplies) {
      const body =
        rateBp === 0
          ? `Self-employment tax on it is ${$(r.seTax)}, set by law.`
          : `Tax on it comes to ${$(r.tax)}: ${$(r.seTax)} of self-employment tax, set by law, and ${$(r.incomeTax)} at your example ${rateText}.`;
      const last =
        paidMoney > 0
          ? paidSentence()
          : rateBp === 0
            ? `With income tax at ${rateText}, set aside ${$(r.balance)} on these figures.`
            : `Set aside ${$(r.balance)} on these figures.`;
      return `${opening} ${body} ${last}`;
    }
    const under = `${opening} ${share} of it is ${$(r.netEarnings)}, under the ${threshold} line, so no self-employment tax is due on it. Income tax may still apply, depending on the whole year’s income.`;
    if (rateBp > 0) {
      return paidMoney > 0
        ? `${under} At your example ${rateText}, income tax comes to ${$(r.incomeTax)}. ${paidSentence()}`
        : `${under} At your example ${rateText}, set aside ${$(r.balance)}.`;
    }
    return paidMoney > 0 ? `${under} The year’s return settles the ${$(paidMoney)} already paid.` : under;
  }

  const dueDates = andList(US_DUE.map((d) => monthDay(locale, d)));

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <NumberField
            id={`${PREFIX}-moneyIn`}
            label="Money in from the work this year"
            hint="Tutoring, gigs and sales, before any fees. It counts whether or not a Form 1099-K arrives for it."
            value={fields.moneyIn}
            onInput={set('moneyIn')}
            error={moneyIn.error ?? scopeError}
          />
          <NumberField
            id={`${PREFIX}-costs`}
            label="Costs of the work"
            hint="Shipping, packaging, platform fees: only what your records show. Not things you keep."
            value={fields.costs}
            onInput={set('costs')}
            error={costs.error}
          />
          <NumberField
            id={`${PREFIX}-incomeTaxPercent`}
            label="Income tax, % of profit, if any (an example)"
            hint={`Often nil in a first year of side work: in 2026 the standard deduction takes the first ${$(standard)} of income, or, if someone can claim you as a dependent, the greater of ${$(dependentFloor)} or your earned income plus ${$(dependentAddOn)}. Try 10%, the lesson’s example, to see a year with some due.`}
            value={fields.incomeTaxPercent}
            onInput={set('incomeTaxPercent')}
            error={rate.error}
            max="100"
          />
          <NumberField
            id={`${PREFIX}-alreadyPaid`}
            label="Already paid toward this work’s tax"
            hint="Estimated payments you sent for it, or extra withholding you asked a job to take on your Form W-4. Not the Social Security, Medicare or income tax a job takes for its own pay."
            value={fields.alreadyPaid}
            onInput={set('alreadyPaid')}
            error={paid.error}
          />
          <ToolActions query={{ ...fields }} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          {valid ? (
            <>
              <h3>Profit from the work</h3>
              <Result label="Money in" value={$(inMoney)} />
              <Result op="−" label="Costs of the work" value={$(costMoney)} />
              <Result main label={r.loss ? 'Net loss' : 'Net profit'} value={$(Math.abs(r.net))} loss={r.loss} />
              {r.profit > 0 && (
                <>
                  <h3>Tax on it</h3>
                  <Result label="Self-employment tax" value={$(r.seTax)} note={seCaption} />
                  <Result op="+" label={`Income tax at your example ${rateText}`} value={$(r.incomeTax)} />
                  <Result subtotal label="Tax on these figures" value={$(r.tax)} />
                  <Result op="−" label="Already paid toward it" value={$(paidMoney)} />
                  <Result
                    main
                    label={r.balance < 0 ? 'Paid beyond this sum' : 'To set aside on these figures'}
                    value={$(Math.abs(r.balance))}
                  />
                </>
              )}
            </>
          ) : (
            <p class="notice">The sum shows here once the figure with a message under it is fixed.</p>
          )}
          <p class="plain" role="status">
            {sentence}
          </p>
          {valid && (
            <ul class="tool-notes">
              {r.profit > 0 && r.seTax > 0 && r.seShareOfProfit !== null && (
                <li>
                  Self-employment tax is {percentValue(r.seShareOfProfit, locale, 1)} of profit, set by law
                  {rateBp > 0 ? `, plus your example ${rateText}` : ''}.
                </li>
              )}
              {r.expectDuringYear && (
                <li>
                  The IRS generally expects tax paid during the year from people who will owe {$(rules.estimatedTaxLine)} or more after
                  withholding and credits: by {dueDates} of the next year, or the next business day if one falls on a weekend or
                  holiday. None is needed if you had no tax liability last year, were a US citizen or resident all year, and that year
                  was 12 months. See <ExternalLink link={config.links.estimatedTaxes} /> and <ExternalLink link={config.links.gigWork} />.
                </li>
              )}
              <li>
                Federal tax only, before the standard deduction and the deduction for half of self-employment tax, so the income tax
                line can overstate. Wages from a job count toward the same Social Security cap.
              </li>
            </ul>
          )}
        </div>
      </div>

      <HowItWorks>
        <p class="formula numbers">
          net profit = money in − costs of the work
          <br />
          net earnings = {share} of net profit, rounded to the dollar
          <br />
          self-employment tax = {ratePercent(rules.seSocialSecurityRate, locale, 2)} of net earnings up to {$(rules.ssWageBase)} +{' '}
          {ratePercent(rules.seMedicareRate, locale, 2)} of all net earnings
          <br />
          income tax = your example % of net profit
          <br />
          to set aside = self-employment tax + income tax − already paid toward it
        </p>
        <p>
          Net earnings are {share} of net profit: Schedule SE’s line 4a, which is 100% less the 7.65% an employer would pay.
          Self-employment tax is due once net earnings reach {threshold} in a year, about {startProfit} of profit. It is{' '}
          {ratePercent(rules.seSocialSecurityRate, locale, 2)} for Social Security on net earnings up to {$(rules.ssWageBase)} in 2026,
          plus {ratePercent(rules.seMedicareRate, locale, 2)} for Medicare on all of them, {combined} in all, rounded to the dollar.
        </p>
        <p>
          These rates are set by law. They come from the IRS pages listed under the calculator, each with the date it was checked.
          The income tax share is only your example.
        </p>
        <p>What this does not work out:</p>
        <ul>
          <li>
            The standard deduction. In 2026 it is {$(standard)}, or, if someone can claim you as a dependent, the greater of{' '}
            {$(dependentFloor)} or your earned income plus {$(dependentAddOn)}, which is why income tax is often nil in a first year.
          </li>
          <li>The deduction for half of self-employment tax.</li>
        </ul>
        <p>Because of these two, the income tax line can overstate. It also leaves out:</p>
        <ul>
          <li>
            State income tax (<ExternalLink link={config.links.stateTaxes} />).
          </li>
          <li>
            The 0.9% Additional Medicare Tax, which is why the tool stops above {$(rules.additionalMedicareThreshold)} of net earnings (
            <ExternalLink link={config.links.topic554} />
            ).
          </li>
          <li>Wages from a job, which use up part of the same Social Security cap.</li>
        </ul>
        <p>
          Schedule SE rounds line by line, which can differ from this by a dollar. Your return works out the real figure, and{' '}
          <ExternalLink link={config.links.estimatedTaxes} /> explains how to estimate it during the year. With a job as well, the{' '}
          <ExternalLink link={config.links.withholdingEstimator} /> can take side income into account. It needs a W-2 job or a
          pension, so it does not help with side income alone.
        </p>
        <p>For learning only. This is not tax advice, and the numbers it opens with are the lesson’s example.</p>
      </HowItWorks>
    </div>
  );
}

/* ============================================================================================
 * India
 * ========================================================================================== */

/** The fields inside the invoice fold: a link that sets either opens it. */
const FOLD_KEYS = ['invoiced', 'arrived'];

function India({ config, locale }: { config: SideIncomeTaxConfig; locale: Locale }) {
  const defaults = config.defaults as IndiaFields;
  const rules = indiaRulesFrom(config.rules);
  const interest = ruleValue(config.rules, 'advanceTaxInterestPerMonth');
  const belatedDay = dateFromRule(ruleValue(config.rules, 'belatedReturnLastDay'));
  const { fields, set, reset, linked } = useFragmentFields(defaults);
  const fold = useRef<HTMLDetailsElement>(null);
  const rs = (value: number) => exact(value, locale);

  useEffect(() => {
    if (fold.current && linked.some((key) => FOLD_KEYS.includes(key))) fold.current.open = true;
  }, [linked]);

  const tds = checkAmount(readAmount(fields.tdsOnStatement));
  const other = checkAmount(readAmount(fields.otherCredits));
  const taxDue = checkAmount(readAmount(fields.taxDue));
  const missing = checkAmount(readAmount(fields.missing));
  const invoiced = checkAmount(readAmount(fields.invoiced), { optional: true });
  let arrived = checkAmount(readAmount(fields.arrived), { optional: true });
  if (!invoiced.error && !arrived.error && invoiced.value !== null && arrived.value !== null && toCents(arrived.value) > toCents(invoiced.value)) {
    arrived = { value: null, error: ERRORS.arrived };
  }
  const valid = !tds.error && !other.error && !taxDue.error && !missing.error;
  // An error in the optional pair withholds only the check, never the sum.
  const checkGiven = !invoiced.error && !arrived.error;

  const tdsMoney = roundMoney(tds.value ?? 0);
  const otherMoney = roundMoney(other.value ?? 0);
  const dueMoney = roundMoney(taxDue.value ?? 0);
  const missingMoney = roundMoney(missing.value ?? 0);
  const r = tdsBalance(
    {
      tdsOnStatement: tdsMoney,
      otherCredits: otherMoney,
      taxDue: dueMoney,
      missing: missingMoney,
      invoiced: checkGiven && invoiced.value !== null ? roundMoney(invoiced.value) : null,
      arrived: checkGiven && arrived.value !== null ? roundMoney(arrived.value) : null,
    },
    rules,
  );

  const mainLabel = r.balance > 0 ? 'Can come back on that year’s return' : r.balance < 0 ? 'Still to pay, before any interest' : 'Nothing comes back, nothing to pay';
  const mainValue = r.balance > 0 ? r.comesBack : r.stillToPay;

  const sentence = !valid
    ? ''
    : r.balance > 0
      ? `${rs(r.credits)} of tax is on record in your name for the year you are filing for. With ${rs(dueMoney)} due on that year’s whole income, ${rs(r.comesBack)} can come back. It is paid once that year’s return is filed, within the time allowed, and verified, into a bank account the portal has validated.`
      : r.balance < 0
        ? `${rs(r.credits)} of tax is on record in your name for the year you are filing for, and ${rs(dueMoney)} is due on that year’s whole income. On the credits on record, ${rs(r.stillToPay)} is still to pay, before any interest for paying late.`
        : `${rs(r.credits)} of tax is on record in your name, and ${rs(dueMoney)} is due on that year’s whole income, so nothing comes back and nothing is left to pay on these figures.`;

  const dateText = new Intl.DateTimeFormat(locale.code, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(belatedDay);
  // The belated-return window is for 2025-26 income only; after it closes the line would be wrong.
  const belatedOpen = Date.now() < belatedDay + 86_400_000;
  const advanceDates = andList(IN_DUE.map((d) => monthDay(locale, d)));
  const interestText = ratePercent(interest, locale, 2);

  let checkText: string | null = null;
  if (r.gap !== null) {
    checkText = r.gapMatches
      ? missingMoney > 0
        ? `Invoices minus what arrived: ${rs(r.gap)}, the same as the tax on your statement plus what is still missing.`
        : `Invoices minus what arrived: ${rs(r.gap)}, the same as the tax on your statement.`
      : `Invoices minus what arrived: ${rs(r.gap)}. That is not the tax on your statement. The gap can also be GST, platform or bank fees, or a payment not yet made; only the statement’s figure comes back.`;
  }

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <NumberField
            id={`${PREFIX}-tdsOnStatement`}
            label="Tax deducted on your fees, as your statement shows it"
            hint="Part B of your Annual Information Statement lists what each payer deducted in your name for the year you are filing for. Form 26AS shows the same."
            value={fields.tdsOnStatement}
            onInput={set('tdsOnStatement')}
            error={tds.error}
          />
          <NumberField
            id={`${PREFIX}-otherCredits`}
            label="Other tax already paid in your name for that year"
            hint="Tax deducted from a salary or interest, and any advance or self-assessment tax you paid. The year’s return counts them all."
            value={fields.otherCredits}
            onInput={set('otherCredits')}
            error={other.error}
          />
          <NumberField
            id={`${PREFIX}-taxDue`}
            label="Tax due on that year’s whole income"
            hint="The tax your return worked out. If you have not filed yet, the department’s Income and Tax Calculator estimates it; nothing here chooses a regime. On the lesson’s ₹1,50,000, with no other income, it is ₹0."
            value={fields.taxDue}
            onInput={set('taxDue')}
            error={taxDue.error}
          />
          <NumberField
            id={`${PREFIX}-missing`}
            label="Deducted but not yet on your statement"
            hint="A payer that has not filed it yet. Once it corrects its filing, the credit can be claimed, on a revised return or a rectification request."
            value={fields.missing}
            onInput={set('missing')}
            error={missing.error}
          />
          <details class="how" ref={fold}>
            <summary>Check against your invoices (optional)</summary>
            <NumberField
              id={`${PREFIX}-invoiced`}
              label="Fees invoiced for that year"
              hint="It checks the statement and never changes the answer. Leave it blank to skip the check."
              value={fields.invoiced}
              onInput={set('invoiced')}
              error={invoiced.error}
            />
            <NumberField
              id={`${PREFIX}-arrived`}
              label="Paid into your account for those invoices"
              hint="What actually reached you for them."
              value={fields.arrived}
              onInput={set('arrived')}
              error={arrived.error}
            />
          </details>
          <ToolActions query={{ ...fields }} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          {valid ? (
            <>
              <h3>For the year you are filing for</h3>
              <Result label="Tax deducted on your fees, on your statement" value={rs(tdsMoney)} />
              <Result op="+" label="Other tax already paid in your name" value={rs(otherMoney)} />
              <Result subtotal label="Tax on record in your name" value={rs(r.credits)} />
              <Result op="−" label="Tax due on that year’s whole income" value={rs(dueMoney)} />
              <Result main label={mainLabel} value={rs(mainValue)} />
            </>
          ) : (
            <p class="notice">The sum shows here once the figure with a message under it is fixed.</p>
          )}
          <p class="plain" role="status">
            {sentence}
          </p>
          {valid && (
            <ul class="tool-notes">
              {missingMoney > 0 && (
                <li>
                  {rs(missingMoney)} deducted but not yet on your statement is not in this sum. It can count once the payer corrects its
                  filing, claimed on a revised return or a rectification request.
                </li>
              )}
              {checkText && <li>{checkText}</li>}
              {r.advanceTaxDue && (
                <li>
                  When a year’s tax, after tax deducted at source, is {rs(rules.advanceTaxLine)} or more, it is due in advance during
                  that year: by {advanceDates}, or all by {monthDay(locale, IN_DUE[3])} under the presumptive scheme. Interest, from{' '}
                  {interestText} a month, can be added when it is paid late.
                </li>
              )}
              {belatedOpen && (
                <li>
                  For 2025-26 income, a belated return can be filed until {dateText}, or before assessment if that comes first. An
                  updated return filed after that cannot increase a refund.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <HowItWorks>
        <p class="formula numbers">
          tax on record = tax deducted on your fees, as your statement shows it + other tax already paid in your name for that year
          <br />
          can come back = tax on record − tax due on that year’s whole income
        </p>
        <p>
          Other tax already paid means tax deducted from a salary or interest, and advance or self-assessment tax. A figure below zero
          is still to pay, before any interest for paying late. When the year’s tax, after all tax deducted in your name, on the
          statement or not, is {rs(rules.advanceTaxLine)} or more, advance tax was due during the year, and interest from{' '}
          {interestText} a month can be added (<ExternalLink link={config.links.taxPayments} />
          ).
        </p>
        <p>
          Only credits on record are refunded. Tax deducted but not yet on your statement is shown on its own: it can count once the
          payer corrects its filing, claimed on a revised return or a rectification request (
          <ExternalLink link={config.links.tdsCompliance} />; <ExternalLink link={config.links.rectification} />
          ).
        </p>
        <p>Invoices minus what arrived is only a check. The gap can be tax, but also:</p>
        <ul>
          <li>GST billed on top</li>
          <li>platform or bank fees</li>
          <li>a payment not yet made</li>
        </ul>
        <p>Not every payment has tax deducted from it.</p>
        <p>
          This tool never works out the tax due. It models no slab, regime, rebate or presumptive scheme. Your return gives that
          figure, or the department’s <ExternalLink link={config.links.taxCalculator} /> estimates it.
        </p>
        <p>It does not work out:</p>
        <ul>
          <li>interest or fees for filing or paying late</li>
          <li>interest the department may add to a refund</li>
        </ul>
        <p>
          A refund is processed only after the return is e-verified. It is paid only into a pre-validated bank account in the name on
          your PAN (<ExternalLink link={config.links.refundStatus} />
          ).
        </p>
        <p>
          {belatedOpen ? (
            <>
              For 2025-26 income (Income-tax Act, 1961), a belated return can be filed until {dateText}, and an updated return cannot
              increase a refund (<ExternalLink link={config.links.returns} />
              ).
            </>
          ) : (
            <>
              For 2025-26 income, the belated-return window closed on {dateText}. An updated return cannot increase a refund (
              <ExternalLink link={config.links.returns} />
              ).
            </>
          )}{' '}
          The statements for that year are the Annual Information Statement and Form 26AS (
          <ExternalLink link={config.links.ais} />
          ). For income from 1 April 2026 (Income-tax Act, 2025, tax year 2026-27), the statement is the Annual Information Statement
          in Form No. 168.
        </p>
        <p>For learning only. This is not tax advice, and the numbers it opens with are the lesson’s example.</p>
      </HowItWorks>
    </div>
  );
}
