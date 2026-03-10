import type { TruthParticle } from '../../types';

/**
 * Converts truth payload fields into a finite numeric value when possible.
 */
export function nullableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Normalizes a field to a number, using zero for absent or invalid values.
 */
export function numberValue(value: unknown) {
  return nullableNumber(value) ?? 0;
}

/**
 * Normalizes a field to a string.
 */
export function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

/**
 * Flattens the various nested truth-id array shapes emitted by the JSON
 * exporter into a simple numeric list.
 */
export function normalizeNumberList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flat(Infinity).flatMap((entry) => normalizeNumberList(entry));
  }

  const number = nullableNumber(value);
  return number == null ? [] : [number];
}

/**
 * Normalizes a `[x, y, z]` vector, with optional fallback to the first or last
 * point of a path-like array when direct coordinates are unavailable.
 */
export function normalizeVector3(
  value: unknown,
  fallbackPath?: unknown,
  fallbackPosition?: 'first' | 'last'
): [number, number, number] | null {
  const direct = normalizeVectorArray(value);
  if (direct) return direct;

  if (!Array.isArray(fallbackPath) || fallbackPath.length === 0) return null;
  const point =
    fallbackPosition === 'last'
      ? fallbackPath[fallbackPath.length - 1]
      : fallbackPath[0];

  return normalizeVectorArray(point);
}

/**
 * Returns kinetic energy when total energy and mass are both available.
 */
export function kineticEnergy(totalEnergy: unknown, mass: unknown) {
  const total = nullableNumber(totalEnergy);
  const restMass = nullableNumber(mass);
  if (total == null || restMass == null) return null;
  return Math.max(0, total - restMass);
}

/**
 * Chooses the energy value used for UI ranking/filtering. Hadrons should sort
 * by kinetic energy, while other particles typically only have a meaningful
 * total-energy display value.
 */
export function truthDisplayEnergy(particle: TruthParticle) {
  return particle.kineticEnergy ?? particle.energy ?? 0;
}

function normalizeVectorArray(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const x = nullableNumber(value[0]);
  const y = nullableNumber(value[1]);
  const z = nullableNumber(value[2]);
  if (x == null || y == null || z == null) return null;
  return [x, y, z];
}
