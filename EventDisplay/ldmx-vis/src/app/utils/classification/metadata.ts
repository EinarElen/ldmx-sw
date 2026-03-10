import type { MetadataEntry } from '../../types';

/**
 * Normalizes Phoenix metadata payloads into a stable string-key/string-value
 * list used throughout the inspector and event-summary pipeline.
 */
export function normalizeMetadata(input: unknown): MetadataEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as { label?: unknown; value?: unknown };
      if (typeof item.label !== 'string') return null;

      return {
        label: item.label,
        value: String(item.value ?? '')
      };
    })
    .filter((entry): entry is MetadataEntry => entry !== null);
}

export function findMetadataValue(metadata: MetadataEntry[], pattern: RegExp) {
  return metadata.find((entry) => pattern.test(entry.label))?.value ?? null;
}

export function readMetadataNumber(metadata: MetadataEntry[], pattern: RegExp) {
  return readNumber(findMetadataValue(metadata, pattern));
}

export function readMetadataBoolean(
  metadata: MetadataEntry[],
  pattern: RegExp
) {
  return readBoolean(findMetadataValue(metadata, pattern));
}

export function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

export function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry : null))
    .filter((entry): entry is string => entry !== null);
}

export function readNumberArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value
    .map((entry) => readNumber(entry))
    .filter((entry): entry is number => entry !== null);
}

export function readNumberMatrix(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => readNumberArray(row))
    .filter((row): row is number[] => row !== null);
}

export function readFixedVector(
  value: unknown,
  dimensions: number
): [number, number, number] | null {
  const values = readNumberArray(value);
  if (!values || values.length !== dimensions) return null;
  const [x, y, z] = values;
  if (x == null || y == null || z == null) return null;
  return [x, y, z];
}
