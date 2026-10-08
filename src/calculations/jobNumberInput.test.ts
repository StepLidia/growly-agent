import { describe, expect, it } from 'vitest';
import { formatJobNumberInput, parseJobNumberInput } from './jobNumberInput';

describe('job number editing', () => {
  it('allows clearing zero and entering decimal values incrementally', () => {
    expect(parseJobNumberInput('')).toBe('');
    expect(formatJobNumberInput('', true)).toBe('');
    expect(parseJobNumberInput('0')).toBe('0');
    expect(parseJobNumberInput('.')).toBe('0.');
    expect(parseJobNumberInput('.5')).toBe('0.5');
    expect(formatJobNumberInput('1.', false)).toBe('1.');
    expect(formatJobNumberInput('1.50', false)).toBe('1.50');
  });

  it('groups money inputs without rounding away decimal amounts', () => {
    expect(parseJobNumberInput('85,000.50')).toBe('85000.50');
    expect(formatJobNumberInput('85000.50', true)).toBe('85,000.50');
    expect(formatJobNumberInput('85000.', true)).toBe('85,000.');
    expect(formatJobNumberInput('37.5', false)).toBe('37.5');
    expect(formatJobNumberInput('055', false)).toBe('55');
  });

  it.each(['abc', '12abc', '1e3', '-5', '+5', '1.2.3', ' 5', 'Infinity', '9'.repeat(400)])('rejects invalid input %s', (value) => {
    expect(parseJobNumberInput(value)).toBeNull();
  });
});
