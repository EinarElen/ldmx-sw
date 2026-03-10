import { describe, expect, it } from 'vitest';
import {
  buildTruthChildrenMap,
  chooseDefaultTruthTrack,
  extractTruthParticles,
  extractTruthTrajectories,
  summarizeTruthContributions,
  summarizeTruthHierarchy
} from '../utils/truth';
import type { PhoenixEventData, TruthParticle } from '../types';

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
    parentIds: [],
    pdgId: 11,
    processType: 'Primary',
    trackId,
    vertex: [0, 0, 0],
    vertexVolume: '',
    ...overrides
  };
}

describe('truth utilities', () => {
  it('extracts sim particles and chooses the highest-energy primary by display energy', () => {
    const eventData: PhoenixEventData = {
      SimParticles: {
        '1': { trackID: 1, parentID: [0], energy: 50, mass: 0, pdgID: 11 },
        '2': { trackID: 2, parentID: [0], energy: 950, mass: 939.6, pdgID: 2112 },
        '3': { trackID: 3, parentID: [2], energy: 80, mass: 0, pdgID: 22 }
      }
    };

    const particles = extractTruthParticles(eventData);
    expect(particles.map((entry) => entry.trackId)).toEqual([1, 2, 3]);
    expect(chooseDefaultTruthTrack(particles)).toBe(1);
  });

  it('builds direct and inferred lineage links and reports missing daughters', () => {
    const particles = [
      particle(10, { daughterIds: [20, 999] }),
      particle(20, { parentIds: [10] }),
      particle(30, { parentIds: [999] }),
      particle(40, { parentIds: [0] })
    ];

    const { childrenMap, roots } = buildTruthChildrenMap(particles);
    expect(roots.map((entry) => entry.trackId)).toEqual([10, 40]);

    const links = childrenMap.get(10) ?? [];
    expect(links.map((link) => [link.child.trackId, link.relation])).toEqual([
      [20, 'direct'],
      [30, 'inferred']
    ]);

    const summary = summarizeTruthHierarchy(particles[0] ?? null, childrenMap);
    expect(summary.directChildren).toBe(1);
    expect(summary.inferredChildren).toBe(1);
    expect(summary.bridgedDaughters).toEqual([999]);
    expect(summary.missingDaughters).toEqual([]);
  });

  it('extracts trajectories and aggregates hit contributions from multiple truth-id fields', () => {
    const eventData: PhoenixEventData = {
      Hits: {
        ecal_sim_hits: [
          { energy: 4.5, incidentIDs: [11], trackIDs: [10] },
          { energy: 1.5, originID: 11 }
        ],
        hcal_sim_back: [
          { energy: 2.25, immediate_child: [999] }
        ]
      },
      Tracks: {
        visualization_trajectories: [
          {
            parentID: 0,
            pdgID: 11,
            pointKinds: ['vertex', 'step'],
            pos: [
              [0, 0, 0],
              [0, 0, 1]
            ],
            role: 'beam-electron',
            times: [0, 1],
            trackID: 10,
            volumes: ['Target', 'ECAL']
          }
        ]
      }
    };

    const trajectories = extractTruthTrajectories(eventData);
    expect(trajectories.get(10)?.points).toHaveLength(2);

    const contributions = summarizeTruthContributions(eventData, [10, 11]);
    expect(contributions).toEqual([
      {
        collectionName: 'ecal_sim_hits',
        count: 2,
        totalEnergy: 6,
        trackIds: [10, 11]
      }
    ]);
  });
});
