import { describe, it, expect } from 'vitest';
import { decodeLines, encodeLines, LABEL_MAX } from '../../src/lib/lines-link';

describe('payslip lines in a link', () => {
  const EU = 'Pension contribution~135|Health cover~135|Unemployment cover~30|Income tax~50';

  it('decodes the Europe lesson’s four lines', () => {
    const rows = decodeLines(EU, 8);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.amount)).toEqual(['135', '135', '30', '50']);
    expect(rows[0].label).toBe('Pension contribution');
  });

  it('caps the row count', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `Line ${i}~${i}`).join('|');
    expect(decodeLines(ten, 5)).toHaveLength(5);
    expect(decodeLines(ten, 8)).toHaveLength(8);
  });

  it('turns an unreadable amount into 0', () => {
    expect(decodeLines('x~abc', 5)).toEqual([{ label: 'x', amount: '0' }]);
    expect(decodeLines('x~', 5)).toEqual([{ label: 'x', amount: '0' }]);
    expect(decodeLines('x~-', 5)).toEqual([{ label: 'x', amount: '0' }]);
  });

  it('reads an amount as the row field does, exponents included', () => {
    expect(decodeLines('x~1e5', 5)).toEqual([{ label: 'x', amount: '100000' }]);
    expect(decodeLines('x~1.5e3', 5)).toEqual([{ label: 'x', amount: '1500' }]);
    expect(decodeLines('x~1,500', 5)).toEqual([{ label: 'x', amount: '1500' }]);
    expect(decodeLines('x~-5', 5)).toEqual([{ label: 'x', amount: '-5' }]);
  });

  it('cuts labels to 40 characters and amounts to 16 before reading them', () => {
    const [row] = decodeLines(`${'a'.repeat(60)}~${'9'.repeat(30)}`, 5);
    expect(row.label).toHaveLength(LABEL_MAX);
    expect(row.amount).toBe(String(Number('9'.repeat(16))));
  });

  it('drops a part that is not one label and one amount', () => {
    expect(decodeLines('no amount here|a~1~2|ok~5', 5)).toEqual([{ label: 'ok', amount: '5' }]);
    expect(decodeLines('', 5)).toEqual([]);
  });

  it('keeps only the characters a payslip label needs, so a hostile label cannot read as markup or an address', () => {
    const [row] = decodeLines('<script>alert(1)</script>~5', 5);
    expect(row.label).toBe('script alert(1) script');
    expect(row.amount).toBe('5');
    expect(decodeLines('Refund fee to 98xxxxxxxx@upi~5', 5)[0].label).toBe('Refund fee to 98xxxxxxxx upi');
    expect(decodeLines("Employer's ESI (0.75%) & LWF~5", 5)[0].label).toBe("Employer's ESI (0.75%) & LWF");
  });

  it('drops a text longer than eight full rows could make', () => {
    const longest = Array.from({ length: 8 }, () => `${'a'.repeat(40)}~${'1'.repeat(16)}`).join('|');
    expect(decodeLines(longest, 8)).toHaveLength(8);
    expect(decodeLines(`${longest}|`, 8)).toEqual([]);
  });

  it('round-trips, with ~ and | taken out of a label', () => {
    const rows = [
      { label: 'State disability insurance', amount: '20.80' },
      { label: 'City~tax|here', amount: '12' },
    ];
    const text = encodeLines(rows);
    expect(text).toBe('State disability insurance~20.80|City tax here~12');
    expect(decodeLines(text, 5)).toEqual([
      { label: 'State disability insurance', amount: '20.8' },
      { label: 'City tax here', amount: '12' },
    ]);
    expect(decodeLines(encodeLines(decodeLines(EU, 8)), 8)).toEqual(decodeLines(EU, 8));
  });
});
