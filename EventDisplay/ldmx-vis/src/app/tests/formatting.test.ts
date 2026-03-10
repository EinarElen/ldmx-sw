import { describe, expect, it } from 'vitest';
import {
  formatInteger,
  formatMaybeNumericString,
  formatNumber,
  formatVector
} from '../utils/formatting';

describe('formatting', () => {
  it('preserves small nonzero numbers instead of rounding them to zero', () => {
    expect(
      formatNumber(0.00042, { decimals: 3, scientificBelow: 1e-4 })
    ).toBe('0.00042');
    expect(
      formatNumber(0.000034, { decimals: 3, scientificBelow: 1e-4 })
    ).toBe('3.4e-5');
  });

  it('formats signed values, vectors, and numeric strings consistently', () => {
    expect(formatNumber(12.5, { signed: true })).toBe('+12.5');
    expect(formatVector([1.2, -0.0042, 5000], { scientificAbove: 1e4 })).toBe(
      '1.2, -0.0042, 5000'
    );
    expect(formatMaybeNumericString('0.000056', { scientificBelow: 1e-4 })).toBe(
      '5.6e-5'
    );
    expect(formatInteger(24.4)).toBe('24');
  });
});
