import { afterEach, describe, expect, it, vi } from 'vitest';
import { readUtilities, saveUtilities } from './utilityStorage';

afterEach(() => vi.unstubAllGlobals());

describe('utility storage', () => {
  it('persists independent months, zero readings, decimals, and cleared fields', () => {
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    expect(readUtilities()).toEqual({});
    expect(saveUtilities({ '2026-01': { heater: 0, hotWater: 10.5 }, '2026-02': { heater: 100, coldWater: undefined } })).toBe(true);
    expect([...stored.keys()]).toEqual(['growly-utilities-v1']);
    expect(readUtilities()).toEqual({ '2026-01': { heater: 0, hotWater: 10.5 }, '2026-02': { heater: 100 } });
  });

  it('filters malformed entries and invalid readings independently', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({
      '2026-01': { heater: -1, hotWater: '4', coldWater: 10 },
      '2026-13': { heater: 20 },
      '2026-02': null,
      '2026-03': [],
    }) });
    expect(readUtilities()).toEqual({ '2026-01': { coldWater: 10 } });
  });

  it('handles invalid JSON, invalid root data, and unavailable storage', () => {
    for (const value of ['{', 'null', '[]', '5']) {
      vi.stubGlobal('localStorage', { getItem: () => value });
      expect(readUtilities()).toEqual({});
    }
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Unavailable'); },
      setItem: () => { throw new Error('Unavailable'); },
    });
    expect(readUtilities()).toEqual({});
    expect(saveUtilities({})).toBe(false);
  });
});
