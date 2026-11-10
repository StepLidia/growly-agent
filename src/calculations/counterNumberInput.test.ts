import { describe, expect, it } from 'vitest';
import { formatCounterInput, formatCounterValue, parseCounterValue } from './counterNumberInput';

describe('counter number input', () => {
  it('preserves water decimals and uses a dot separator', () => {
    expect(formatCounterValue(1234.567, true)).toBe('1,234.567');
    expect(formatCounterValue(0.005, true)).toBe('0.005');
    expect(formatCounterValue(undefined, true)).toBe('');
    const steps = [
      ['585', '585'], ['585.', '585.'], ['585.0', '585.0'],
      ['585.01', '585.01'], ['585.010', '585.010'],
      ['1234.56', '1,234.56'], ['.', '0.'], ['.5', '0.5'], ['', ''],
    ];
    for (const [typed, displayed] of steps) {
      expect(formatCounterInput(typed, true)).toBe(displayed);
      expect(parseCounterValue(displayed)).toBe(typed === '' ? undefined : Number(typed === '.' ? 0 : typed));
    }
  });

  it('rejects invalid drafts and retains whole-number heater formatting', () => {
    expect(formatCounterInput('585.1.2', true)).toBeNull();
    expect(formatCounterInput('-1', true)).toBeNull();
    expect(formatCounterInput('1234.5')).toBe('1,235');
  });

  it('adds thousands separators at each typing step', () => {
    const steps = [
      ['1', '1'], ['12', '12'], ['123', '123'],
      ['1234', '1,234'], ['1,2345', '12,345'], ['12,3456', '123,456'],
      ['123,4567', '1,234,567'],
    ];
    for (const [typed, displayed] of steps) {
      const value = parseCounterValue(typed);
      expect(value).not.toBeNull();
      expect(formatCounterValue(value!)).toBe(displayed);
    }
  });

  it('matches money formatting for whole-number display and rounding', () => {
    expect(formatCounterValue(0)).toBe('0');
    expect(formatCounterValue(1234.4)).toBe('1,234');
    expect(formatCounterValue(1234.5)).toBe('1,235');
    expect(parseCounterValue('1,234.5')).toBe(1234.5);
  });

  it('supports deleting digits and clearing a reading without saving zero', () => {
    expect(formatCounterValue(parseCounterValue('1,23')!)).toBe('123');
    expect(parseCounterValue('')).toBeUndefined();
    expect(formatCounterValue(undefined)).toBe('');
    expect(parseCounterValue('0')).toBe(0);
  });

  it.each(['abc', '12abc', '-1', '1.2.3', '.', '1e3', 'Infinity', '9'.repeat(400)])('rejects invalid reading %s', (value) => {
    expect(parseCounterValue(value)).toBeNull();
  });
});
