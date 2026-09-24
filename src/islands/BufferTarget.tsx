/**
 * Buffer target and the payday it is reached. One question: on which payday is a buffer for the
 * reader's must-pay costs fully set aside? No interest and no rate: only what is moved sets the
 * date (Savings growth adds an example rate). The maths is src/lib/tools/buffer-target.ts; this
 * edition's defaults, words and sources arrive as the config prop, never imported as values.
 *
 * The US edition's config carries a rule (the Federal Reserve survey's $400), so there the
 * currency is fixed to the edition's and no currency field shows (tool-kit useLocale). The $400
 * is printed in dollars whatever happens, and only while the figures are in dollars.
 */
import { useEffect } from 'preact/hooks';
import { isPayFrequency, PAYDAYS_PER_YEAR, roundMoney, roundTo, toCents, type PayFrequency } from '../lib/finance';
import { localeByCode, money, number, plural, type Locale } from '../lib/format';
import {
  BUFFER_LIMITS,
  FREQUENCIES,
  bufferInputProblems,
  bufferPlan,
  type BufferPlan,
  type BufferProblem,
  type BufferTargetConfig,
  type TimeAway,
} from '../lib/tools/buffer-target';
import type { Edition } from '../lib/tools/types';
import {
  CurrencyField,
  Fact,
  Figure,
  HowItWorks,
  NumberField,
  Result,
  SelectField,
  ToolActions,
  capitalise,
  exact,
  readAmount,
  useFields,
  useLocale,
} from './tool-kit';
import './tools.css';

interface Props {
  config: BufferTargetConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

const FREQUENCY_VALUES: readonly string[] = FREQUENCIES.map((f) => f.value);
const MAX_TEXT = String(BUFFER_LIMITS.maxAmount);
const AMOUNT_KEYS = ['essentials', 'months', 'saved', 'perPayday'] as const;
/**
 * What a number field can show: a plain number with no currency sign, comma, space or leading +
 * (a field set to any of those shows blank). A trailing point stays allowed, as one mid-typing.
 */
const PLAIN_NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** 0 to 2 decimals, in the reader's locale: 3, 1.5, 11.84. */
const upTo2 = (value: number, locale: Locale) => new Intl.NumberFormat(locale.code, { maximumFractionDigits: 2 }).format(value);

/** "3 months", "2 weeks", "1 month": English words, so English plural rules. */
const timeText = (away: TimeAway, locale: Locale) => `${number(away.count, locale)} ${plural(away.count, away.unit, `${away.unit}s`)}`;

export default function BufferTarget({ config, localeCode, prefix }: Props) {
  const defaults = {
    essentials: config.defaults.essentials,
    months: config.defaults.months,
    saved: config.defaults.saved,
    perPayday: config.defaults.perPayday,
    paidEvery: config.defaults.paidEvery as string,
  };
  const { fields, setFields, set, reset } = useFields('bt', defaults, { allowed: { paidEvery: FREQUENCY_VALUES } });

  // A link can carry "₹500" or "1,00,000", which readAmount reads but a number field shows as
  // blank. Put the number the result uses into the field, so what is shown is what is counted.
  useEffect(() => {
    const plain: Partial<Record<(typeof AMOUNT_KEYS)[number], string>> = {};
    for (const key of AMOUNT_KEYS) {
      const raw = fields[key];
      const read = readAmount(raw);
      if (raw.trim() !== '' && !PLAIN_NUMBER.test(raw) && read.value !== null) plain[key] = String(read.value);
    }
    if (Object.keys(plain).length > 0) setFields((current) => ({ ...current, ...plain }));
  }, [fields.essentials, fields.months, fields.saved, fields.perPayday]);

  const fixed = (config.rules ?? []).length > 0;
  const { locale, code, choose } = useLocale(localeCode, { fixed });

  const word = config.paydayWord;
  const Word = capitalise(word);
  const fallback: PayFrequency = isPayFrequency(config.defaults.paidEvery) ? config.defaults.paidEvery : 'monthly';
  // The one value the select shows, the sum uses and the link carries: never anything off the list.
  const freq: PayFrequency = isPayFrequency(fields.paidEvery) ? fields.paidEvery : fallback;

  const problems = bufferInputProblems(fields);
  const hasProblem = Object.keys(problems).length > 0;
  const milestone = config.milestone;
  const showMilestone = milestone !== undefined && locale.currency === milestone.currency;

  const essentials = readAmount(fields.essentials).value ?? 0;
  // Counted as shown: to 2 decimals, so 2.333 is 2.33 in the sum, the ledger and the sentence.
  // The range check still reads the typed text, so 0.995 and 24.004 stay errors.
  const months = roundTo(readAmount(fields.months).value ?? 0, 2);
  const saved = readAmount(fields.saved).value ?? 0;
  const perPayday = readAmount(fields.perPayday).value ?? 0;
  // Counted, and so printed, in whole cents or paise.
  const hasSaved = toCents(saved) > 0;
  const plan: BufferPlan | null = hasProblem
    ? null
    : bufferPlan(essentials, months, saved, perPayday, PAYDAYS_PER_YEAR[freq], showMilestone ? milestone.value : undefined);

  const m = (value: number) => exact(roundMoney(value), locale);
  const tooBig = `This works with amounts up to ${number(BUFFER_LIMITS.maxAmount, locale)}.`;
  const message = (problem: BufferProblem | undefined, required: string): string | undefined => {
    if (problem === undefined) return undefined;
    if (problem === 'too-big') return tooBig;
    if (problem === 'negative') return 'Enter 0 or more.';
    if (problem === 'months-range') return 'Enter between 1 and 24 months.';
    return required;
  };

  const monthsText = `${upTo2(months, locale)} ${plural(months, 'month', 'months')}`;
  const opening = plan ? `${monthsText} of these costs is ${m(plan.target)}` : '';

  let figure: { value: string; label: string } | null = null;
  let sentence = 'Fix the field marked above to see the date.';
  if (plan) {
    if (plan.state === 'covered') {
      figure = { value: 'Covered now', label: 'Already set aside is at or above the target' };
      sentence =
        plan.surplus > 0
          ? `${m(saved)} already covers the ${m(plan.target)} target, ${m(plan.surplus)} above it.`
          : `${m(saved)} already covers the ${m(plan.target)} target.`;
    } else if (plan.state === 'no-amount') {
      figure = { value: '—', label: `Add what you move each ${word} to see the date` };
      sentence = `${opening}, and ${m(plan.toGo)} is still to set aside. Add what you move each ${word} to see the date.`;
    } else if (plan.state === 'too-long') {
      figure = { value: 'More than 10 years', label: `at ${m(perPayday)} each ${word}` };
      sentence = `${opening}. At ${m(perPayday)} each ${word}, the ${m(plan.toGo)} still to set aside takes more than 10 years; a larger amount brings the date closer.`;
    } else if (plan.paydays !== null && plan.away && plan.heldAtEnd !== null && plan.overTarget !== null) {
      const n = plan.paydays;
      const next = n === 1;
      figure = {
        value: `${Word} ${number(n, locale)}`,
        label: next ? `your next ${word}` : `about ${timeText(plan.away, locale)}, counting your next ${word} as ${word} 1`,
      };
      const moving = hasSaved
        ? `With ${m(saved)} already set aside and ${m(perPayday)} moved each ${word}`
        : `Moving ${m(perPayday)} each ${word}`;
      const when = next ? `on your next ${word}` : `on ${word} ${number(n, locale)}, about ${timeText(plan.away, locale)} away`;
      const ending = plan.overTarget > 0 ? `holding ${m(plan.heldAtEnd)}, ${m(plan.overTarget)} above it.` : `holding exactly ${m(plan.target)}.`;
      sentence = `${opening}. ${moving}, you reach it ${when}, ${ending}`;
    }
  }

  // "Paydays needed: 2.75, rounded up"; exact gives no note; 12.001 shows as "just over 12".
  let neededLabel = `${Word}s needed`;
  if (plan?.state === 'dated' && plan.quotient !== null && !plan.exactDivision) {
    const raw = toCents(plan.toGo) / toCents(perPayday);
    const shown = Number.isInteger(plan.quotient)
      ? raw > plan.quotient
        ? `just over ${number(plan.quotient, locale)}`
        : `just under ${number(plan.quotient, locale)}`
      : upTo2(plan.quotient, locale);
    neededLabel = `${Word}s needed: ${shown}, rounded up`;
  }

  const milestoneFact =
    showMilestone && plan && plan.milestonePayday !== null && plan.milestoneAway
      ? {
          label: `${money(milestone.value, localeByCode('en-US'))}, the Federal Reserve survey’s example emergency expense, not a rule: ${
            plan.milestonePayday === 1 ? `your next ${word}` : `about ${timeText(plan.milestoneAway, locale)}`
          }`,
          value: `${Word} ${number(plan.milestonePayday, locale)}`,
        }
      : null;

  const held = plan?.state === 'dated' && plan.paydays !== null && plan.heldAtEnd !== null && plan.overTarget !== null
    ? {
        label: `Held on ${plan.paydays === 1 ? `your next ${word}` : `${word} ${number(plan.paydays, locale)}`}${plan.overTarget > 0 ? `, ${m(plan.overTarget)} above the target` : ', exactly the target'}`,
        value: m(plan.heldAtEnd),
      }
    : null;

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          {!fixed && <CurrencyField id="bt-currency" code={code} onChoose={choose} />}
          <NumberField
            id="bt-essentials"
            label="Must-pay costs a month"
            hint="Rent or room share, food, getting to work or college, your phone, and course costs you must pay: what still arrives in a month with no pay. Leave out spending that would stop."
            value={fields.essentials}
            onInput={set('essentials')}
            max={MAX_TEXT}
            error={message(problems.essentials, 'Enter your must-pay costs for one month, above 0.')}
          />
          <NumberField
            id="bt-months"
            label="Months to cover"
            hint={config.monthsHint}
            value={fields.months}
            onInput={set('months')}
            min="1"
            max="24"
            error={message(problems.months, 'Enter between 1 and 24 months.')}
          />
          <NumberField
            id="bt-saved"
            label="Already set aside for this"
            hint="Only money kept apart for a bill you did not choose, not this month’s spending money."
            value={fields.saved}
            onInput={set('saved')}
            max={MAX_TEXT}
            error={message(problems.saved, 'Enter 0 or more.')}
          />
          <NumberField
            id="bt-perPayday"
            label={`Moved aside each ${word}`}
            hint="The amount moved aside the day pay lands, the same every time."
            value={fields.perPayday}
            onInput={set('perPayday')}
            max={MAX_TEXT}
            error={message(problems.perPayday, 'Enter 0 or more.')}
          />
          <SelectField
            id="bt-paidEvery"
            label="How often you are paid"
            hint="Turns a count of paydays into weeks or months."
            value={freq}
            options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
            onChange={set('paidEvery')}
          />
          <ToolActions
            query={{ essentials: fields.essentials, months: fields.months, saved: fields.saved, perPayday: fields.perPayday, paidEvery: freq }}
            onReset={reset}
          />
        </div>

        <div class="results">
          <h2>What it means</h2>
          {plan && figure && (
            <>
              <Figure value={figure.value} label={figure.label} />
              <Result label={`Buffer target: ${m(essentials)} × ${monthsText}`} value={m(plan.target)} />
              <Result minus label="Already set aside" value={m(saved)} />
              {plan.state === 'dated' && plan.paydays !== null ? (
                <>
                  <Result subtotal label="Still to set aside" value={m(plan.toGo)} />
                  <Result label={`Moved each ${word}`} value={m(perPayday)} />
                  <Result main label={neededLabel} value={number(plan.paydays, locale)} />
                </>
              ) : (
                <Result main label="Still to set aside" value={m(plan.toGo)} />
              )}
              {held && <Fact label={held.label} value={held.value} />}
              {milestoneFact && <Fact label={milestoneFact.label} value={milestoneFact.value} />}
            </>
          )}
          <p class="plain" role="status">{sentence}</p>
          {plan && (
            <p class="notice">
              The same amount every {word}, counting your next {word} as {word} 1, and no interest: only what you move
              sets the date. To add an example rate, use <a href={`${prefix}/tools/savings`}>Savings growth</a>.
            </p>
          )}
        </div>
      </div>

      <HowItWorks>
        <p>
          The target is one month of your must-pay costs times the months you chose
          {plan ? `: ${m(essentials)} × ${upTo2(months, locale)} = ${m(plan.target)}.` : '.'} Anything already set
          aside comes off it
          {plan?.state === 'covered'
            ? `: ${m(saved)} already covers ${m(plan.target)}, so nothing is left to set aside.`
            : plan && hasSaved
              ? `: ${m(plan.target)} − ${m(saved)} leaves ${m(plan.toGo)}.`
              : '.'}{' '}
          The rest is divided by what you move each {word} and rounded up, because the target is passed on a {word},
          not between two
          {plan?.state === 'dated' && plan.paydays !== null && plan.quotient !== null && plan.heldAtEnd !== null
            ? `: ${m(plan.toGo)} ÷ ${m(perPayday)} = ${upTo2(plan.quotient, locale)}, so ${word} ${number(plan.paydays, locale)}, when you hold ${
                hasSaved ? `${m(saved)} + ` : ''
              }${number(plan.paydays, locale)} × ${m(perPayday)} = ${m(plan.heldAtEnd)}.`
            : '.'}
        </p>
        <p class="formula numbers">{Word}s needed = (target − already set aside) ÷ moved each {word}, rounded up</p>
        <p>
          {Word} 1 is your next {word}, or today if you were paid today, so the months shown can be out by up to one pay
          period. Weeks and months come from 52, 26, 24 or 12 paydays a year. Past 10 years no date is shown.
        </p>
        <p>
          What this leaves out: interest, since only what you move sets the date (Savings growth adds an example rate); a
          smaller or missed {word}, which moves the date later, so try the smaller amount; and a bill paid from the buffer
          before it is full, after which the count starts again from what is left. It does not say how many months to
          hold, or where to keep the money.
        </p>
        {config.howNote && (
          <p>
            {config.howNote.text} Source:{' '}
            <a href={config.howNote.source.url} rel="noopener noreferrer">{config.howNote.source.title}</a>.
          </p>
        )}
      </HowItWorks>
    </div>
  );
}
