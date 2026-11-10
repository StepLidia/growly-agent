import { currency } from '../finance';

// Water meters retain decimals; other counters match whole-number money inputs.
export function formatCounterValue(value: number | undefined, allowDecimals = false): string {
  if (value === undefined) return '';
  return allowDecimals
    ? value.toLocaleString('en-US', { maximumFractionDigits: 20 })
    : currency(Math.round(value));
}

export function formatCounterInput(rawValue: string, allowDecimals = false): string | null {
  const normalized = rawValue.replaceAll(',', '');
  if (allowDecimals && normalized === '.') return '0.';
  const value = parseCounterValue(rawValue);
  if (value === null) return null;
  if (!allowDecimals || !normalized.includes('.')) return formatCounterValue(value, allowDecimals);
  const [whole, fraction] = normalized.split('.');
  return `${formatCounterValue(Number(whole), true)}.${fraction}`;
}

// An empty input clears a reading; null indicates invalid input.
export function parseCounterValue(rawValue: string): number | undefined | null {
  const value = rawValue.replaceAll(',', '');
  if (value === '') return undefined;
  if (!/^\d*\.?\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
