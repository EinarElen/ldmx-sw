type FormatNumberOptions = {
  decimals?: number;
  scientificAbove?: number;
  scientificBelow?: number;
  significantDigits?: number;
  signed?: boolean;
};

/**
 * Shared numeric formatter for operator-facing UI. It preserves meaningful
 * small values, switches to scientific notation when appropriate, and avoids
 * noisy trailing zeroes in both fixed and exponential formats.
 */
export function formatNumber(
  value: number | null | undefined,
  options: FormatNumberOptions = {}
) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '—';

  const {
    decimals = 2,
    scientificAbove = 1e6,
    scientificBelow = 1e-3,
    significantDigits = 4,
    signed = false
  } = options;

  const absValue = Math.abs(value);
  if (absValue === 0) return '0';

  let out: string;
  if (absValue < scientificBelow || absValue >= scientificAbove) {
    out = normalizeExponent(value.toExponential(significantDigits - 1));
  } else {
    let resolvedDecimals = decimals;
    if (absValue < 1) {
      const magnitude = Math.ceil(-Math.log10(absValue));
      resolvedDecimals = Math.max(
        decimals,
        Math.min(8, magnitude + significantDigits - 1)
      );
    }

    out = trimTrailingZeros(value.toFixed(resolvedDecimals));
  }

  if (signed && value > 0) return `+${out}`;
  return out;
}

export function formatInteger(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

export function formatVector(
  value: [number, number, number] | null | undefined,
  options: FormatNumberOptions = {}
) {
  if (!value) return '—';
  return value.map((entry) => formatNumber(entry, options)).join(', ');
}

export function formatMaybeNumericString(
  value: string | null | undefined,
  options: FormatNumberOptions = {}
) {
  if (value == null || value === '') return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return formatNumber(parsed, options);
}

function trimTrailingZeros(value: string) {
  if (!value.includes('.')) return value;
  return value.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

function normalizeExponent(value: string) {
  const [mantissa, exponent] = value.split('e');
  if (!mantissa || !exponent) return trimTrailingZeros(value);
  return `${trimTrailingZeros(mantissa)}e${Number(exponent)}`;
}
