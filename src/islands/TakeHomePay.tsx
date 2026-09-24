/**
 * Take-home pay, line by line: from the top figure on a payslip to what reaches the account, one
 * printed line at a time. Three modes from the edition's config: India works out the two EPF
 * shares (or takes them as printed) from CTC or gross; Europe takes the reader's own named lines
 * and shows each as a share of gross; the US takes the stub as printed and checks the hours and
 * the two FICA lines. It never works out income tax.
 *
 * India and the US carry edition rules (EPF, FICA), so they show no currency picker and never read
 * lp:locale: a saved $ cannot put the ₹25,000 ceiling in dollars. Europe depends on no rate and
 * keeps the picker. The maths and every sentence are in src/lib/tools/take-home-pay.ts; this file
 * only formats what takeHome returns. Nothing typed leaves the browser.
 */
import { useEffect, useState, type Dispatch, type StateUpdater } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { money, percentValue, ratePercent } from '../lib/format';
import { decodeLines, encodeLines, LABEL_MAX, type LineText } from '../lib/lines-link';
import {
  HOURS_MAX,
  MAX_LINES,
  MAX_OTHERS,
  MONEY_MAX,
  NUMBER_KEYS,
  PAID_EVERY,
  PF_ON,
  RATE_MAX,
  START_FROM,
  checkLines,
  epfNotes,
  fieldCopy,
  ficaNotes,
  needsCents,
  numberFieldValue,
  parsePfOn,
  parseStartFrom,
  ruleValue,
  statusSentence,
  takeHome,
  usualPaychecks,
  type EpfConfig,
  type FicaConfig,
  type LedgerLine,
  type TakeHomePayConfig,
  type TakeHomeResult,
  type TypedConfig,
} from '../lib/tools/take-home-pay';
import { parsePayFrequency } from '../lib/finance';
import type { Edition } from '../lib/tools/types';
import {
  CurrencyField,
  Fact,
  Figure,
  HowItWorks,
  NumberField,
  Result,
  RowList,
  SelectField,
  ToolActions,
  ToolNotes,
  readAmount,
  readLinkParam,
  useFields,
  useLocale,
} from './tool-kit';
import './tools.css';

interface Props {
  config: TakeHomePayConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

const STATUS_ID = 'thp-status';
const MINUS = 'Type the amount without a minus sign.';
const TOO_BIG = 'That is more than this tool handles; check the figure.';

interface Amount {
  /** What the sum uses: 0 for blank, negative or too large. */
  n: number;
  blank: boolean;
  error?: string;
}

/** A field as typed: blank tells from 0, a minus or an oversize figure gets its words, both count as 0. */
function amount(raw: string, max = MONEY_MAX, messages: { minus?: string; tooBig?: string } = {}): Amount {
  const { value, tooBig } = readAmount(raw);
  if (tooBig) return { n: 0, blank: false, error: messages.tooBig ?? TOO_BIG };
  if (value === null) return { n: 0, blank: true };
  if (value < 0) return { n: 0, blank: false, error: messages.minus ?? MINUS };
  if (value > max) return { n: 0, blank: false, error: messages.tooBig ?? TOO_BIG };
  return { n: value, blank: false };
}

export default function TakeHomePay({ config, localeCode, prefix }: Props) {
  if (config.mode === 'epf') return <IndiaPay config={config} localeCode={localeCode} prefix={prefix} />;
  if (config.mode === 'typed') return <EuropePay config={config} localeCode={localeCode} prefix={prefix} />;
  return <UsPay config={config} localeCode={localeCode} prefix={prefix} />;
}

/* ---------------------------------------------------------------------------------------------
 * Shared pieces
 * ------------------------------------------------------------------------------------------- */

/**
 * Rows from the config. Names and figures typed into the server-rendered rows before the
 * JavaScript arrived are kept (slow 4G is the target); a link that carries the key wins over both.
 * `id` is the row editor's id, whose inputs are `${id}-name-${i}` and `${id}-amount-${i}`.
 */
function useLines(id: string, key: 'lines' | 'others', initial: string, max: number, min: number) {
  const [rows, setRows] = useState<LineText[]>(() => decodeLines(initial, max));
  useEffect(() => {
    const base = decodeLines(initial, max);
    const typed = base.map((row, i) => {
      const name = document.getElementById(`${id}-name-${i}`);
      const figure = document.getElementById(`${id}-amount-${i}`);
      return {
        label: name instanceof HTMLInputElement ? name.value.slice(0, LABEL_MAX) : row.label,
        amount: figure instanceof HTMLInputElement ? figure.value : row.amount,
      };
    });
    const changed = typed.some((row, i) => row.label !== base[i].label || row.amount !== base[i].amount);
    const shared = readLinkParam(key);
    const decoded = shared === null ? null : decodeLines(shared, max);
    if (decoded && decoded.length >= min) setRows(decoded);
    else if (changed) setRows(typed);
  }, []);
  return { rows, setRows, reset: () => setRows(decodeLines(initial, max)) };
}

/**
 * Runs after useFields has applied the link: a figure a number field cannot show ('35,000',
 * '0x10') is rewritten as one it can, so the field never sits blank while the sum uses a number,
 * and Copy link carries the figure the reader sees.
 */
function useShowableNumbers<T extends Record<string, string>>(setFields: Dispatch<StateUpdater<T>>, keys: readonly (keyof T & string)[]) {
  useEffect(() => {
    setFields((current) => {
      let next = current;
      for (const key of keys) {
        const shown = numberFieldValue(current[key]);
        if (shown !== current[key]) next = { ...next, [key]: shown } as T;
      }
      return next;
    });
  }, []);
}

function LinesEditor({
  id,
  legend,
  hint,
  rows,
  setRows,
  max,
  min,
  rowName,
  nameLabel,
  errors,
  notes,
}: {
  id: string;
  legend: string;
  hint: string;
  rows: LineText[];
  setRows: (rows: LineText[]) => void;
  max: number;
  min: number;
  rowName: string;
  nameLabel: string;
  errors: (string | undefined)[];
  notes?: (string | undefined)[];
}) {
  const change = (index: number, patch: Partial<LineText>) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <RowList
      id={id}
      legend={legend}
      hint={hint}
      count={rows.length}
      max={max}
      min={min}
      addLabel="Add a line"
      atMaxText={`Up to ${max} lines; add the rest together into one.`}
      rowLegend={(n) => `${rowName} ${n}`}
      removeLabel={(n) => `Remove ${rowName.toLowerCase()} ${n}`}
      removedText={(n) => `${rowName} ${n} removed.`}
      onAdd={() => setRows([...rows, { label: '', amount: '' }])}
      onRemove={(index) => setRows(rows.filter((_, i) => i !== index))}
    >
      {(i) => (
        <>
          <p class="field">
            <label for={`${id}-name-${i}`}>{nameLabel}</label>
            <input
              id={`${id}-name-${i}`}
              type="text"
              maxLength={LABEL_MAX}
              value={rows[i].label}
              onInput={(e) => change(i, { label: (e.target as HTMLInputElement).value })}
            />
          </p>
          <NumberField
            id={`${id}-amount-${i}`}
            label="Amount"
            value={rows[i].amount}
            onInput={(e) => change(i, { amount: (e.target as HTMLInputElement).value })}
            error={errors[i]}
            note={notes?.[i]}
          />
        </>
      )}
    </RowList>
  );
}

/**
 * The ledger: the start, each line with a minus, a subtotal where a line names one, and the
 * double-ruled answer. While the lines reach or pass the start, the answer is held back as '—'.
 */
function Ledger({
  result,
  startLabel,
  endLabel,
  fmt,
  labelFor,
  noteFor,
}: {
  result: TakeHomeResult;
  startLabel: string;
  endLabel: string;
  fmt: (v: number) => string;
  labelFor: (line: LedgerLine) => string;
  noteFor?: (index: number) => ComponentChildren;
}) {
  const started = result.status !== 'no-start';
  return (
    <>
      <Result label={startLabel} value={started ? fmt(result.start) : '—'} />
      {result.lines.map((line, i) => (
        <>
          <Result op="−" label={labelFor(line)} value={fmt(line.amount)} note={noteFor?.(i)} />
          {line.subtotalLabel && (
            <Result
              subtotal
              label={line.subtotalLabel}
              value={started ? fmt(result.running[i]) : '—'}
              loss={started && result.running[i] < 0}
            />
          )}
        </>
      ))}
      <Result main label={endLabel} value={result.status === 'ok' ? fmt(result.net) : '—'} />
    </>
  );
}

function StatusLine({ text }: { text: string }) {
  return (
    <p class="plain" id={STATUS_ID} role="status">
      {text}
    </p>
  );
}

function BudgetLink({ prefix, income, words = '' }: { prefix: string; income: number; words?: string }) {
  return (
    <p class="plain">
      <a href={`${prefix}/tools/budget#${new URLSearchParams({ income: String(income) }).toString()}`}>Plan the month in the budget planner{words}</a>
    </p>
  );
}

const Private = () => (
  <p>Nothing you type leaves your browser. A copied link carries the numbers after the #, which browsers do not send to any server.</p>
);

/* ---------------------------------------------------------------------------------------------
 * India: CTC or gross, the two EPF shares, professional tax, TDS, other lines
 * ------------------------------------------------------------------------------------------- */

function IndiaPay({ config, localeCode, prefix }: { config: EpfConfig; localeCode: string; prefix: string }) {
  const d = config.defaults;
  const { fields, set, setFields, reset: resetFields } = useFields(
    'thp',
    {
      startFrom: d.startFrom as string,
      start: d.start,
      otherEmployerCosts: d.otherEmployerCosts,
      pfOn: d.pfOn as string,
      pfWages: d.pfWages,
      epfPrinted: d.epfPrinted,
      employerEpfPrinted: d.employerEpfPrinted,
      professionalTax: d.professionalTax,
      tds: d.tds,
    },
    { allowed: { startFrom: START_FROM, pfOn: PF_ON } },
  );
  useShowableNumbers(setFields, NUMBER_KEYS.epf);
  const { locale } = useLocale(localeCode, { fixed: true });
  const others = useLines('thp-others', 'others', d.others, MAX_OTHERS, 0);
  const copy = fieldCopy(config, locale);

  const rule = (key: string) => ruleValue(config.rules, key);
  const rules = { epfRate: rule('epfRate'), epfWageCeiling: rule('epfWageCeiling'), professionalTaxYearCap: rule('professionalTaxYearCap') };

  const startFrom = parseStartFrom(fields.startFrom);
  const pfOn = parsePfOn(fields.pfOn);
  const fromCtc = startFrom === 'ctc';
  const worked = pfOn === 'all' || pfOn === 'capped';

  const start = amount(fields.start);
  const other = amount(fields.otherEmployerCosts);
  const wages = amount(fields.pfWages);
  const printed = amount(fields.epfPrinted);
  const employerPrinted = amount(fields.employerEpfPrinted);
  const pt = amount(fields.professionalTax);
  const tds = amount(fields.tds);
  const otherAmounts = others.rows.map((row) => amount(row.amount));

  const result = takeHome({
    mode: 'epf',
    startFrom,
    start: start.n,
    otherEmployerCosts: fromCtc ? other.n : 0,
    pfOn,
    pfWages: worked ? wages.n : 0,
    epfPrinted: printed.blank ? null : printed.n,
    employerEpfPrinted: employerPrinted.blank ? null : employerPrinted.n,
    professionalTax: pt.n,
    tds: tds.n,
    others: others.rows.map((row, i) => ({ label: row.label, amount: otherAmounts[i].n })),
    rules,
  });

  const ok = result.status === 'ok';
  const cents = needsCents(result, [worked ? wages.n : 0]);
  const fmt = (v: number) => money(v, locale, cents ? 2 : 0);
  const words = { locale, cents };

  const rate = ratePercent(rules.epfRate, locale, 2);
  const basis =
    pfOn === 'printed'
      ? ' (as printed)'
      : wages.n > 0
        ? result.capApplied
          ? ` (${rate} of PF wages up to ${fmt(rules.epfWageCeiling)})`
          : ` (${rate} of ${fmt(wages.n)} PF wages)`
        : '';
  const labelFor = (line: LedgerLine) => {
    if (line.kind === 'employer-epf') return pfOn === 'printed' && result.employerAssumed ? "Employer's EPF share, assumed equal to yours" : `Employer's EPF share${basis}`;
    if (line.kind === 'your-epf') return `Your EPF share${basis}`;
    if (line.kind === 'tds') return 'TDS (copied from your payslip)';
    return line.label;
  };

  const notes = epfNotes(result, { ...rules, epfShareAtCeiling: rule('epfShareAtCeiling') }, locale);

  const query: Record<string, string> = { startFrom, start: fields.start };
  if (fromCtc) query.otherEmployerCosts = fields.otherEmployerCosts;
  query.pfOn = pfOn;
  if (worked) query.pfWages = fields.pfWages;
  if (pfOn === 'printed') {
    query.epfPrinted = fields.epfPrinted;
    if (fromCtc) query.employerEpfPrinted = fields.employerEpfPrinted;
  }
  query.professionalTax = fields.professionalTax;
  query.tds = fields.tds;
  if (others.rows.length > 0) query.others = encodeLines(others.rows);

  const startCopy = fromCtc ? copy.startCtc : copy.startGross;

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <SelectField id="thp-startFrom" {...copy.startFrom} options={copy.startFrom.options!} value={startFrom} onChange={set('startFrom')} />
          <NumberField
            id="thp-start"
            label={startCopy.label}
            hint={startCopy.hint}
            value={fields.start}
            onInput={set('start')}
            max={String(MONEY_MAX)}
            error={start.error}
            describedBy={result.status === 'over' ? STATUS_ID : undefined}
          />
          {fromCtc && (
            <NumberField
              id="thp-otherEmployerCosts"
              label={copy.otherEmployerCosts.label}
              hint={copy.otherEmployerCosts.hint}
              value={fields.otherEmployerCosts}
              onInput={set('otherEmployerCosts')}
              max={String(MONEY_MAX)}
              error={other.error}
            />
          )}
          <SelectField id="thp-pfOn" {...copy.pfOn} options={copy.pfOn.options!} value={pfOn} onChange={set('pfOn')} />
          {worked && (
            <NumberField
              id="thp-pfWages"
              label={copy.pfWages.label}
              hint={copy.pfWages.hint}
              value={fields.pfWages}
              onInput={set('pfWages')}
              max={String(MONEY_MAX)}
              error={wages.error}
            />
          )}
          {pfOn === 'printed' && (
            <NumberField
              id="thp-epfPrinted"
              label={copy.epfPrinted.label}
              hint={copy.epfPrinted.hint}
              value={fields.epfPrinted}
              onInput={set('epfPrinted')}
              max={String(MONEY_MAX)}
              error={printed.error}
            />
          )}
          {pfOn === 'printed' && fromCtc && (
            <NumberField
              id="thp-employerEpfPrinted"
              label={copy.employerEpfPrinted.label}
              hint={copy.employerEpfPrinted.hint}
              value={fields.employerEpfPrinted}
              onInput={set('employerEpfPrinted')}
              max={String(MONEY_MAX)}
              error={employerPrinted.error}
            />
          )}
          <NumberField
            id="thp-professionalTax"
            label={copy.professionalTax.label}
            hint={copy.professionalTax.hint}
            value={fields.professionalTax}
            onInput={set('professionalTax')}
            max={String(MONEY_MAX)}
            error={pt.error}
          />
          <NumberField
            id="thp-tds"
            label={copy.tds.label}
            hint={copy.tds.hint}
            value={fields.tds}
            onInput={set('tds')}
            max={String(MONEY_MAX)}
            error={tds.error}
          />
          <LinesEditor
            id="thp-others"
            legend={copy.others.label}
            hint={copy.others.hint!}
            rows={others.rows}
            setRows={others.setRows}
            max={MAX_OTHERS}
            min={0}
            rowName="Other line"
            nameLabel="Name, as on your payslip"
            errors={otherAmounts.map((a) => a.error)}
          />
          <ToolActions
            query={query}
            onReset={() => {
              resetFields();
              others.reset();
            }}
          />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          <Figure label="In-hand pay a month" value={ok ? fmt(result.net) : '—'} />
          <Ledger
            result={result}
            startLabel={fromCtc ? 'Monthly CTC' : 'Gross salary'}
            endLabel="In-hand pay"
            fmt={fmt}
            labelFor={labelFor}
          />
          <StatusLine text={statusSentence(result, words)} />
          <ToolNotes id="thp-notes" notes={notes} />
          {ok && result.fundTotal !== null && fromCtc && (
            <Fact label="Into the provident fund and pension scheme for you, both shares" value={fmt(result.fundTotal)} />
          )}
          {ok && result.fundTotal !== null && !fromCtc && (
            <>
              <Fact label="Your EPF share, kept in a fund in your name" value={fmt(result.yours)} />
              <p class="notice">Your employer adds its own share outside this sum.</p>
            </>
          )}
          {ok && <BudgetLink prefix={prefix} income={result.net} />}
        </div>
      </div>

      <HowItWorks>
        <p>
          The tool takes each line off in the order a payslip prints it. It works out one thing only: the two provident
          fund shares, each {rate} of your PF wages, in whole rupees. It can also work them out on wages up to the{' '}
          {money(rules.epfWageCeiling, locale)} ceiling, where the compulsory share stops at {money(rule('epfShareAtCeiling'), locale)} a side,
          or take the amount printed on your payslip.
        </p>
        <p class="formula numbers">each EPF share = {rate} × PF wages, to the nearest rupee</p>
        <p class="formula numbers">in-hand pay = CTC − employer’s EPF share − other parts of the CTC − your EPF share − professional tax − TDS − other lines</p>
        <p>
          PF wages are basic pay plus any dearness allowance. Under the labour codes, allowances above half your pay count as
          wages too. This tool does not work that out, so if your EPF line differs, choose “As printed on my payslip”. A few
          notified employers use {ratePercent(rule('epfReducedRate'), locale, 2)}, and employers with fewer than {rule('epfCoverageStaff')} staff
          need not enrol you. Part of the employer’s share goes to the pension scheme rather than to your fund; the tool does
          not split it.
        </p>
        <p>
          Professional tax, TDS, ESI and every other line are copied from your payslip. The tool never works out income tax or
          the tax regime. Professional tax cannot pass {money(rules.professionalTaxYearCap, locale)} a year. The{' '}
          {money(Number(d.start), locale)} payslip is the lesson’s example.
        </p>
        <Private />
      </HowItWorks>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Europe: the reader's own named lines, each as a share of gross; employer costs beside it
 * ------------------------------------------------------------------------------------------- */

const LINE_MINUS = 'Type the amount without a minus sign. A line that adds money back is not handled here.';

function EuropePay({ config, localeCode, prefix }: { config: TypedConfig; localeCode: string; prefix: string }) {
  const d = config.defaults;
  const { fields, set, setFields, reset: resetFields } = useFields('thp', { start: d.start, employerOnTop: d.employerOnTop });
  useShowableNumbers(setFields, NUMBER_KEYS.typed);
  const { locale, code, choose } = useLocale(localeCode);
  const lines = useLines('thp-lines', 'lines', d.lines, MAX_LINES, 1);
  const copy = fieldCopy(config, locale);

  const start = amount(fields.start);
  const onTop = amount(fields.employerOnTop);
  const lineAmounts = lines.rows.map((row) => amount(row.amount, MONEY_MAX, { minus: LINE_MINUS }));

  const result = takeHome({
    mode: 'typed',
    start: start.n,
    rows: lines.rows.map((row, i) => ({ label: row.label, amount: lineAmounts[i].n })),
    employerOnTop: onTop.blank ? null : onTop.n,
  });

  const ok = result.status === 'ok';
  const cents = needsCents(result);
  const fmt = (v: number) => money(v, locale, cents ? 2 : 0);
  const shareOfGross = result.impliedPercents.map((p) => (p === null ? undefined : `comes to ${percentValue(p, locale, 1)} of gross`));

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <CurrencyField id="thp-currency" code={code} onChoose={choose} />
          <NumberField
            id="thp-start"
            label={copy.start.label}
            hint={copy.start.hint}
            value={fields.start}
            onInput={set('start')}
            max={String(MONEY_MAX)}
            error={start.error}
            describedBy={result.status === 'over' ? STATUS_ID : undefined}
          />
          <LinesEditor
            id="thp-lines"
            legend={copy.lines.label}
            hint={copy.lines.hint!}
            rows={lines.rows}
            setRows={lines.setRows}
            max={MAX_LINES}
            min={1}
            rowName="Line"
            nameLabel="Name, as on your payslip"
            errors={lineAmounts.map((a) => a.error)}
            notes={shareOfGross}
          />
          <NumberField
            id="thp-employerOnTop"
            label={copy.employerOnTop.label}
            hint={copy.employerOnTop.hint}
            value={fields.employerOnTop}
            onInput={set('employerOnTop')}
            max={String(MONEY_MAX)}
            error={onTop.error}
          />
          <ToolActions
            query={{ start: fields.start, employerOnTop: fields.employerOnTop, lines: encodeLines(lines.rows) }}
            onReset={() => {
              resetFields();
              lines.reset();
            }}
          />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          <Figure label="Net pay this month" value={ok ? fmt(result.net) : '—'} />
          <Ledger
            result={result}
            startLabel="Gross pay"
            endLabel="Net pay"
            fmt={fmt}
            labelFor={(line) => line.label}
            noteFor={(i) => shareOfGross[i]}
          />
          <StatusLine text={statusSentence(result, { locale, cents })} />
          {ok && result.employerOnTop !== null && result.employerCost !== null && (
            <>
              <Fact label="Your employer pays on top" value={fmt(result.employerOnTop)} />
              <Fact label="What the job costs your employer" value={fmt(result.employerCost)} />
            </>
          )}
          {ok && <BudgetLink prefix={prefix} income={result.net} />}
        </div>
      </div>

      <HowItWorks>
        <p>
          Every line is copied from your payslip, under the name your payslip gives it, and taken off gross pay in order. Beside
          each line the tool prints the share of gross pay it comes to, so you can see your own country’s rates. It knows no
          country’s rates, and it never works out tax or contributions.
        </p>
        <p class="formula numbers">net pay = gross pay − each line, in order</p>
        <p class="formula numbers">share of gross = line ÷ gross pay × 100, to one decimal place</p>
        <p>
          Employer contributions are paid on top of gross pay: they are shown beside the answer and never taken off your pay. A
          refund, or any line that adds money back, is not handled; add it to net pay yourself. The {money(Number(d.start), locale)}{' '}
          payslip and its lines are the lesson’s example, not any country’s rules.
        </p>
        <Private />
      </HowItWorks>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The US: the stub as printed, with the hours and the two FICA lines checked
 * ------------------------------------------------------------------------------------------- */

const MORE_HOURS = 'More hours than a month holds; check the stub.';

function UsPay({ config, localeCode, prefix }: { config: FicaConfig; localeCode: string; prefix: string }) {
  const d = config.defaults;
  const { fields, set, setFields, reset: resetFields } = useFields(
    'thp',
    {
      start: d.start,
      hours: d.hours,
      hourlyRate: d.hourlyRate,
      overtimeHours: d.overtimeHours,
      socialSecurity: d.socialSecurity,
      medicare: d.medicare,
      federal: d.federal,
      state: d.state,
      paidEvery: d.paidEvery as string,
    },
    { allowed: { paidEvery: PAID_EVERY } },
  );
  useShowableNumbers(setFields, NUMBER_KEYS.fica);
  const { locale } = useLocale(localeCode, { fixed: true });
  const others = useLines('thp-others', 'others', d.others, MAX_OTHERS, 0);
  const copy = fieldCopy(config, locale);

  const rule = (key: string) => ruleValue(config.rules, key);
  const rules = {
    socialSecurityRate: rule('socialSecurityRate'),
    medicareRate: rule('medicareRate'),
    socialSecurityWageBase: rule('socialSecurityWageBase'),
    additionalMedicareRate: rule('additionalMedicareRate'),
    additionalMedicareThreshold: rule('additionalMedicareThreshold'),
    overtimeMultiplier: rule('overtimeMultiplier'),
  };

  const paidEvery = parsePayFrequency(fields.paidEvery, 'fortnightly');
  const start = amount(fields.start);
  const hours = amount(fields.hours, HOURS_MAX, { tooBig: MORE_HOURS });
  const rate = amount(fields.hourlyRate, RATE_MAX);
  const overtime = amount(fields.overtimeHours, HOURS_MAX, { tooBig: MORE_HOURS });
  const ss = amount(fields.socialSecurity);
  const medicare = amount(fields.medicare);
  const federal = amount(fields.federal);
  const state = amount(fields.state);
  const otherAmounts = others.rows.map((row) => amount(row.amount));

  const input = {
    mode: 'fica' as const,
    start: start.n,
    hours: hours.n,
    hourlyRate: rate.n,
    overtimeHours: overtime.n,
    socialSecurity: ss.n,
    medicare: medicare.n,
    federal: federal.n,
    state: state.n,
    others: others.rows.map((row, i) => ({ label: row.label, amount: otherAmounts[i].n })),
    paidEvery,
    rules,
  };
  const result = takeHome(input);

  const ok = result.status === 'ok';
  const words = { locale, cents: true };
  const fmt = (v: number) => money(v, locale, 2);
  const checks = checkLines(result, input, words);
  const notes = ficaNotes(result, rules, locale);
  const usual = usualPaychecks(paidEvery);

  const query: Record<string, string> = {
    start: fields.start,
    hours: fields.hours,
    hourlyRate: fields.hourlyRate,
    overtimeHours: fields.overtimeHours,
    socialSecurity: fields.socialSecurity,
    medicare: fields.medicare,
    federal: fields.federal,
    state: fields.state,
    paidEvery,
  };
  if (others.rows.length > 0) query.others = encodeLines(others.rows);

  const numberField = (key: keyof typeof fields & keyof typeof copy, a: Amount, max: number, extra: { describedBy?: string } = {}) => (
    <NumberField
      id={`thp-${key}`}
      label={copy[key].label}
      hint={copy[key].hint}
      value={fields[key]}
      onInput={set(key)}
      max={String(max)}
      error={a.error}
      {...extra}
    />
  );

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          {numberField('start', start, MONEY_MAX, { describedBy: result.status === 'over' ? STATUS_ID : undefined })}
          {numberField('hours', hours, HOURS_MAX)}
          {numberField('hourlyRate', rate, RATE_MAX)}
          {numberField('overtimeHours', overtime, HOURS_MAX)}
          {numberField('socialSecurity', ss, MONEY_MAX)}
          {numberField('medicare', medicare, MONEY_MAX)}
          {numberField('federal', federal, MONEY_MAX)}
          {numberField('state', state, MONEY_MAX)}
          <LinesEditor
            id="thp-others"
            legend={copy.others.label}
            hint={copy.others.hint!}
            rows={others.rows}
            setRows={others.setRows}
            max={MAX_OTHERS}
            min={0}
            rowName="Other line"
            nameLabel="Name, as on your stub"
            errors={otherAmounts.map((a) => a.error)}
          />
          <SelectField id="thp-paidEvery" {...copy.paidEvery} options={copy.paidEvery.options!} value={paidEvery} onChange={set('paidEvery')} />
          <ToolActions
            query={query}
            onReset={() => {
              resetFields();
              others.reset();
            }}
          />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          <Figure label="Net pay on this paycheck" value={ok ? fmt(result.net) : '—'} />
          <Ledger result={result} startLabel="Gross pay" endLabel="Net pay" fmt={fmt} labelFor={(line) => line.label} />
          <ToolNotes id="thp-checks" notes={checks} />
          <StatusLine text={statusSentence(result, words)} />
          <ToolNotes id="thp-notes" notes={notes} />
          {ok && result.employerMatch !== null && (
            <Fact label="Your employer pays the same Social Security and Medicare again" value={fmt(result.employerMatch)} />
          )}
          {ok && result.projection && (
            <>
              <Fact label="A year, if every paycheck matched this one" value={fmt(result.projection.year)} />
              <Fact label={`A usual month, if every paycheck matched this one: ${usual}`} value={fmt(result.projection.usualMonth)} />
              <BudgetLink prefix={prefix} income={result.projection.usualMonth} words={`, starting from ${usual}, if each matched this one`} />
            </>
          )}
        </div>
      </div>

      <HowItWorks>
        <p>
          The tool takes each line on the stub off gross pay, in order, as printed, and works out nothing the stub already
          says. It checks two things.
        </p>
        <p>
          First, that regular hours times the rate, plus overtime at {rules.overtimeMultiplier} times the rate, match the gross
          line. Federal law pays overtime for hours over {rule('overtimeWeeklyHours')} in a workweek. Tips, a shift premium, a
          second rate or a bonus also change gross, so a difference is a question for payroll, not a verdict.
        </p>
        <p class="formula numbers">hours × rate + overtime hours × rate × {rules.overtimeMultiplier} = gross pay</p>
        <p>
          Second, that Social Security is {ratePercent(rules.socialSecurityRate, locale, 2)} and Medicare{' '}
          {ratePercent(rules.medicareRate, locale, 2)} of gross. Both can rightly differ. A pre-tax health plan lowers the pay
          they are worked on. Students working for their own school pay neither, nor do under-18s working in a business owned
          only by a parent, nor some international students on F-1 or J-1 student visas in their first five years. Social
          Security stops once a year’s wages pass {money(rules.socialSecurityWageBase, locale)} in 2026; Medicare has no cap,
          and an extra {ratePercent(rules.additionalMedicareRate, locale, 2)} applies to wages over{' '}
          {money(rules.additionalMedicareThreshold, locale)} in a year (IRS Topic 751).
        </p>
        <p class="formula numbers">
          Social Security = {ratePercent(rules.socialSecurityRate, locale, 2)} × gross pay; Medicare ={' '}
          {ratePercent(rules.medicareRate, locale, 2)} × gross pay
        </p>
        <p>
          Federal and state income tax, and every other line, are copied from the stub. The tool never works out withholding,
          and does not recompute it for a 401(k) or a health plan. The yearly and monthly figures assume every paycheck matches
          this one. Every two weeks gives 26 paychecks in most years and 27 in some; weekly gives 52, sometimes 53. Money is
          counted in whole cents, rounded half up, as payroll does.
        </p>
        <Private />
      </HowItWorks>
    </div>
  );
}

