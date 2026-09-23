import { breakEven, profitAtUnits } from '../lib/finance';
import { money, number } from '../lib/format';
import { CurrencyField, HowItWorks, Fact, Figure, NumberField, Result, ToolActions, exact, toNumber, useFields, useLocale } from './tool-kit';
import './tools.css';

interface Props {
  defaults: { fixed: string; variable: string; price: string; units: string };
  unitName: string;
  fixedHint: string;
  variableHint: string;
  localeCode: string;
}

export default function BreakEven({ defaults, unitName, fixedHint, variableHint, localeCode }: Props) {
  const { fields, set, reset } = useFields('be', defaults);
  const { locale, code, choose } = useLocale(localeCode);

  const fixed = toNumber(fields.fixed);
  const variable = toNumber(fields.variable);
  const price = toNumber(fields.price);
  const units = toNumber(fields.units);

  const result = breakEven(fixed, variable, price);
  const profit = profitAtUnits(fixed, variable, price, units);

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <CurrencyField id="be-currency" code={code} onChoose={choose} />
          <NumberField id="be-fixed" label="Fixed costs per month" hint={fixedHint} value={fields.fixed} onInput={set('fixed')} />
          <NumberField id="be-variable" label="Cost to make one" hint={variableHint} value={fields.variable} onInput={set('variable')} />
          <NumberField
            id="be-price"
            label="Price you charge"
            value={fields.price}
            onInput={set('price')}
            error={
              result.viable
                ? undefined
                : `Your price needs to be higher than the cost to make one. At this price every sale loses ${exact(Math.abs(result.contributionMargin), locale)}.`
            }
          />
          <NumberField id="be-units" label={`How many ${unitName} you expect to sell per month`} value={fields.units} onInput={set('units')} />
          <ToolActions query={fields} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it means</h2>
          <Figure
            label={`${unitName} to break even each month`}
            value={result.viable ? number(result.units!, locale) : 'Not reachable'}
          />
          <Result label="Price of one" value={exact(price, locale)} />
          <Result minus label="Cost of one" value={exact(variable, locale)} />
          <Result main label="You keep per sale" value={exact(result.contributionMargin, locale)} loss={!result.viable} />
          <Fact label="Sales needed to break even" value={result.viable ? money(result.revenue!, locale) : '—'} />
          <Fact label={`Profit at ${number(units, locale)} ${unitName}`} value={money(profit, locale)} loss={profit < 0} />

          <p class="plain" role="status">
            {result.viable
              ? `You keep ${exact(result.contributionMargin, locale)} from every sale. Once you have sold ${number(result.units!, locale)} ${unitName} in a month, your fixed costs are covered and everything after that is profit.`
              : 'Right now each sale costs you more than it brings in, so selling more makes the loss bigger. Raise the price or cut the cost to make one.'}
          </p>
        </div>
      </div>

      <HowItWorks>
        <p>The amount you keep per sale is called the <strong>contribution margin</strong>:</p>
        <p class="formula numbers">price − cost to make one = margin per unit</p>
        <p>Break-even is your fixed costs divided by that margin, rounded up to a whole unit:</p>
        <p class="formula numbers">fixed costs ÷ margin per unit = units to break even</p>
        <p>
          It rounds up because you cannot sell part of one. If the margin is zero or negative there
          is no break-even point at all, which is why the calculator says "not reachable" instead
          of showing a number.
        </p>
      </HowItWorks>
    </div>
  );
}
