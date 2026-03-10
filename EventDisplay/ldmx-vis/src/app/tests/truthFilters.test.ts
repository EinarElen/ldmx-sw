import { describe, expect, it } from 'vitest';
import {
  classifyTruthSpecies,
  filterTruthParticles,
  getTruthProcessOptions
} from '../utils/truthFilters';
import type { TruthParticle } from '../types';

function particle(
  trackId: number,
  overrides: Partial<TruthParticle> = {}
): TruthParticle {
  return {
    daughterIds: [],
    energy: 100,
    endpoint: [0, 0, 1],
    interactionMaterial: '',
    kineticEnergy: 100,
    mass: 0,
    momentum: [0, 0, 1],
    parentIds: [1],
    pdgId: 11,
    processType: 'phot',
    trackId,
    vertex: [0, 0, 0],
    vertexVolume: '',
    ...overrides
  };
}

describe('truthFilters', () => {
  it('classifies common truth species buckets', () => {
    expect(classifyTruthSpecies(particle(1, { pdgId: 22 }))).toBe('em');
    expect(classifyTruthSpecies(particle(2, { pdgId: 13 }))).toBe('muon');
    expect(classifyTruthSpecies(particle(3, { pdgId: 2112 }))).toBe(
      'neutralHadron'
    );
    expect(classifyTruthSpecies(particle(4, { pdgId: 211 }))).toBe(
      'chargedHadron'
    );
  });

  it('filters orphaned low-energy EM without removing primaries or parented tracks', () => {
    const particles = [
      particle(1, { parentIds: [0], processType: 'Primary', pdgId: 11 }),
      particle(2, { parentIds: [1], pdgId: 22, energy: 5, kineticEnergy: 5 }),
      particle(3, {
        parentIds: [999],
        pdgId: 22,
        energy: 5,
        kineticEnergy: 5
      }),
      particle(4, {
        parentIds: [999],
        pdgId: 2112,
        energy: 5,
        kineticEnergy: 5
      }),
      particle(5, {
        parentIds: [999],
        pdgId: 22,
        energy: 80,
        kineticEnergy: 80
      })
    ];

    const filtered = filterTruthParticles(particles, {
      hideOrphanedLowEnergyEm: true,
      minEnergy: 0,
      orphanedEmEnergyThreshold: 50,
      processType: '',
      species: 'all'
    });

    expect(filtered.map((entry) => entry.trackId)).toEqual([1, 2, 4, 5]);
  });

  it('uses kinetic energy for hadronic truth filtering', () => {
    const particles = [
      particle(1, {
        pdgId: 2112,
        energy: 941.8,
        kineticEnergy: 2.2,
        mass: 939.6
      }),
      particle(2, {
        pdgId: 2212,
        energy: 1200,
        kineticEnergy: 261.7,
        mass: 938.3
      })
    ];

    const filtered = filterTruthParticles(particles, {
      hideOrphanedLowEnergyEm: false,
      minEnergy: 10,
      orphanedEmEnergyThreshold: 50,
      processType: '',
      species: 'all'
    });

    expect(filtered.map((entry) => entry.trackId)).toEqual([2]);
  });

  it('builds sorted process options', () => {
    const options = getTruthProcessOptions([
      particle(1, { processType: 'phot' }),
      particle(2, { processType: 'Primary' }),
      particle(3, { processType: 'phot' }),
      particle(4, { processType: 'conv' })
    ]);

    expect(options).toEqual(['conv', 'phot', 'Primary']);
  });
});
