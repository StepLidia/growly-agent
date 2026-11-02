import { currency } from '../finance';

// Match money inputs: group thousands and display whole numbers while typing.
export function formatCounterValue(value: number | undefined): string {
  return value === undefined ? '' : currency(Math.round(value));
}

// An empty input clears a reading; null indicates invalid input.
export function parseCounterValue(rawValue: string): number | undefined | null {
  const value = rawValue.replaceAll(',', '');
  if (value === '') return undefined;
  if (!/^\d*\.?\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
