import type {
  PhoenixEventData,
  TruthParticle,
  TruthTrajectory
} from '../../types';
import {
  kineticEnergy,
  normalizeNumberList,
  normalizeVector3,
  nullableNumber,
  numberValue,
  stringValue
} from './shared';

/**
 * Extracts the persisted truth view used throughout the frontend. The normal
 * path is the SimParticles map; the ground-truth track fallback exists for
 * older samples that only ship simple trajectory collections.
 */
export function extractTruthParticles(
  eventData: PhoenixEventData | null
): TruthParticle[] {
  const particleMap = eventData?.SimParticles;
  if (particleMap && typeof particleMap === 'object' && !Array.isArray(particleMap)) {
    return Object.values(particleMap)
      .map((entry) => normalizeTruthParticle(entry))
      .filter((entry): entry is TruthParticle => entry !== null)
      .sort((left, right) => left.trackId - right.trackId);
  }

  const tracks = eventData?.Tracks?.ground_truth_tracks;
  if (!Array.isArray(tracks)) return [];

  return tracks
    .map((entry) => normalizeTruthParticle(entry))
    .filter((entry): entry is TruthParticle => entry !== null)
    .sort((left, right) => left.trackId - right.trackId);
}

/**
 * Reads detailed stepping trajectories recorded by the simulation-side
 * trajectory recorder when present.
 */
export function extractTruthTrajectories(
  eventData: PhoenixEventData | null
): Map<number, TruthTrajectory> {
  const entries = eventData?.Tracks?.visualization_trajectories;
  if (!Array.isArray(entries)) return new Map<number, TruthTrajectory>();

  const map = new Map<number, TruthTrajectory>();

  for (const entry of entries) {
    const trajectory = normalizeTruthTrajectory(entry);
    if (!trajectory) continue;
    map.set(trajectory.trackId, trajectory);
  }

  return map;
}

function normalizeTruthParticle(entry: unknown): TruthParticle | null {
  if (!entry || typeof entry !== 'object') return null;

  const record = entry as Record<string, unknown>;
  const trackId = numberValue(record.trackID);
  if (!Number.isFinite(trackId)) return null;

  return {
    daughterIds: normalizeNumberList(record.daughterID),
    energy: nullableNumber(record.energy),
    endpoint: normalizeVector3(record.endpoint, record.pos, 'last'),
    interactionMaterial: stringValue(record.interactionMaterial),
    kineticEnergy: kineticEnergy(record.energy, record.mass),
    mass: nullableNumber(record.mass),
    momentum: normalizeVector3(record.momentum),
    parentIds: normalizeNumberList(record.parentID),
    pdgId: nullableNumber(record.pdgID),
    processType: stringValue(record.processType),
    trackId,
    vertex: normalizeVector3(record.vertex, record.pos, 'first'),
    vertexVolume: stringValue(record.vertexVolume)
  };
}

function normalizeTruthTrajectory(entry: unknown): TruthTrajectory | null {
  if (!entry || typeof entry !== 'object') return null;

  const record = entry as Record<string, unknown>;
  const trackId = numberValue(record.trackID);
  if (!Number.isFinite(trackId)) return null;

  const rawPositions = Array.isArray(record.pos) ? record.pos : [];
  const rawTimes = Array.isArray(record.times) ? record.times : [];
  const rawKinds = Array.isArray(record.pointKinds) ? record.pointKinds : [];
  const rawVolumes = Array.isArray(record.volumes) ? record.volumes : [];

  const points = rawPositions
    .map((position, index) => {
      const normalizedPosition = normalizeVector3(position);
      if (!normalizedPosition) return null;
      return {
        position: normalizedPosition,
        time: nullableNumber(rawTimes[index]),
        kind: stringValue(rawKinds[index]),
        volume: stringValue(rawVolumes[index])
      };
    })
    .filter(
      (
        point
      ): point is TruthTrajectory['points'][number] => point !== null
    );

  if (points.length < 2) return null;

  return {
    parentId: nullableNumber(record.parentID),
    pdgId: nullableNumber(record.pdgID),
    role: stringValue(record.role),
    trackId,
    points
  };
}
