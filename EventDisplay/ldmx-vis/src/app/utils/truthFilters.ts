import type {
  TruthFilterState,
  TruthParticle,
  TruthSpeciesFilter,
  TruthTrajectory
} from '../types';
import { truthDisplayEnergy } from './truth';

const NEUTRAL_HADRON_PDGS = new Set([
  111, 130, 310, 311, 2112, 3122, 3212, 3322
]);
const CHARGED_HADRON_PDGS = new Set([
  211, 321, 2212, 3112, 3222, 3312, 3334
]);

export function classifyTruthSpecies(
  particle: TruthParticle
): TruthSpeciesFilter {
  const absPdg = Math.abs(particle.pdgId ?? 0);
  if (absPdg === 11 || absPdg === 22) return 'em';
  if (absPdg === 13) return 'muon';
  if (absPdg > 1_000_000_000) return 'ion';
  if (NEUTRAL_HADRON_PDGS.has(absPdg)) return 'neutralHadron';
  if (CHARGED_HADRON_PDGS.has(absPdg)) return 'chargedHadron';
  return 'other';
}

export function getTruthProcessOptions(particles: TruthParticle[]) {
  return Array.from(
    new Set(
      particles
        .map((particle) => particle.processType.trim())
        .filter((processType) => processType.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right));
}

export function filterTruthParticles(
  particles: TruthParticle[],
  filters: TruthFilterState
) {
  const particleMap = new Map(
    particles.map((particle) => [particle.trackId, particle] as const)
  );

  return particles.filter((particle) => {
    if (
      filters.species !== 'all' &&
      classifyTruthSpecies(particle) !== filters.species
    ) {
      return false;
    }

    if (
      filters.processType &&
      particle.processType.toLowerCase() !== filters.processType.toLowerCase()
    ) {
      return false;
    }

    if (filters.minEnergy > 0 && truthDisplayEnergy(particle) < filters.minEnergy) {
      return false;
    }

    if (
      filters.hideOrphanedLowEnergyEm &&
      isOrphanedLowEnergyEm(
        particle,
        particleMap,
        filters.orphanedEmEnergyThreshold
      )
    ) {
      return false;
    }

    return true;
  });
}

export function filterTruthTrajectories(
  trajectories: Map<number, TruthTrajectory>,
  allowedTrackIds: Set<number>
) {
  const filtered = new Map<number, TruthTrajectory>();

  for (const [trackId, trajectory] of trajectories) {
    if (!allowedTrackIds.has(trackId)) continue;
    filtered.set(trackId, trajectory);
  }

  return filtered;
}

function isOrphanedLowEnergyEm(
  particle: TruthParticle,
  particleMap: Map<number, TruthParticle>,
  threshold: number
) {
  if (classifyTruthSpecies(particle) !== 'em') return false;
  if (truthDisplayEnergy(particle) >= threshold) return false;
  if (isPrimaryTruthParticle(particle)) return false;

  return !particle.parentIds.some((parentId) => {
    if (parentId <= 0) return false;
    return particleMap.has(parentId);
  });
}

function isPrimaryTruthParticle(particle: TruthParticle) {
  return (
    particle.processType === 'Primary' ||
    particle.parentIds.length === 0 ||
    particle.parentIds.includes(0)
  );
}
