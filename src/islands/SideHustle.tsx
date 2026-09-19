import { sideHustleProfit } from '../lib/finance';
import { money, number } from '../lib/format';
import { CurrencyField, HowItWorks, Figure, NumberField, Result, ToolActions, capitalise, exact, toNumber, useFields, useLocale } from './tool-kit';
import './tools.css';

interface Props {
  defaults: { units: string; price: string; cost: string; fee: string; hours: string };
  unitName: string;
  localeCode: string;
}

export default function SideHustle({ defaults, unitName, localeCode }: Props) {
  const { fields, set, reset } = useFields('sh', defaults);
  const { locale, code, choose } = useLocale(localeCode);

  const units = toNumber(fields.units);
  const price = toNumber(fields.price);
  const cost = toNumber(fields.cost);
  const fee = toNumber(fields.fee);
  const hours = toNumber(fields.hours);
  const result = sideHustleProfit(units, price, cost, fee, hours);

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <CurrencyField id="sh-currency" code={code} onChoose={choose} />
          <NumberField id="sh-units" label={`${capitalise(unitName)} in a month`} value={fields.units} onInput={set('units')} />
          <NumberField id="sh-price" label="Price of one" value={fields.price} onInput={set('price')} />
          <NumberField id="sh-cost" label="What one costs you" hint="Materials, packaging, delivery. Not your time: that comes next." value={fields.cost} onInput={set('cost')} />
          <NumberField
            id="sh-fee"
            label="Platform or payment fees, %"
            hint="What the marketplace or payment service keeps from each sale. 0 if you sell direct."
            value={fields.fee}
            onInput={set('fee')}
            max="100"
            error={fee > 100 ? 'A fee cannot be more than 100% of the sale.' : undefined}
          />
          <NumberField
            id="sh-hours"
            label="Hours you put in each month"
            hint="Making, packing, messaging customers, posting. All of it."
            value={fields.hours}
            onInput={set('hours')}
          />
          <ToolActions query={fields} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it means</h2>
          <Figure
            label="per hour of your time"
            value={result.profitPerHour === null ? '—' : exact(Math.round(result.profitPerHour * 100) / 100, locale)}
            loss={result.profitPerHour !== null && result.profitPerHour < 0}
          />
          <Result label="Money in" value={money(result.revenue, locale)} />
          <Result minus label="Cost of what you sold" value={money(result.costs, locale)} />
          <Result minus label="Fees" value={money(result.fees, locale)} />
          <Result main label="Left for you" value={money(result.profit, locale)} loss={result.profit < 0} />

          <p class="plain">
            {result.profitPerHour === null
              ? 'Add the hours you put in. The hourly figure is the one that tells you whether this is worth your time.'
              : result.profit < 0
                ? `At these numbers each month costs you ${money(-result.profit, locale)}. Look at the price and the cost of one before selling more.`
                : `After costs and fees, ${number(units, locale)} ${unitName} leave you ${money(result.profit, locale)}, which is ${exact(Math.round(result.profitPerHour * 100) / 100, locale)} for each hour you put in. Compare that with what else an hour of yours could earn.`}
          </p>
        </div>
      </div>

      <HowItWorks>
        <p class="formula numbers">money in = {unitName} × price</p>
        <p class="formula numbers">left for you = money in − ({unitName} × cost of one) − fees</p>
        <p class="formula numbers">per hour = left for you ÷ hours</p>
        <p>
          Fees are taken from the whole sale price, not from your profit, so a 10% fee can be far
          more than 10% of what you keep. Hours are the cost people forget: a side hustle that pays
          well per sale can still pay badly per hour.
        </p>
      </HowItWorks>
    </div>
  );
}
