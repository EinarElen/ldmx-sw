import { describe, expect, it } from 'vitest';
import {
  buildCollectionTree,
  collectCollectionNodeSubtreeIds,
  createCollectionVisibilityState,
  resolveCollectionVisibility
} from '../utils/collectionTree';
import type { EventCollectionSummary } from '../types';

const collections: EventCollectionSummary[] = [
  {
    kind: 'SimParticles',
    name: 'SimParticles',
    path: ['Truth', 'SimParticles'],
    size: 4,
    subsystem: 'truth'
  },
  {
    kind: 'Tracks',
    name: 'visualization_trajectories',
    path: ['Truth', 'Trajectories'],
    size: 2,
    subsystem: 'truth'
  },
  {
    kind: 'Hits',
    name: 'ecal_rec_hits',
    path: ['ECAL', 'Rec hits'],
    size: 8,
    subsystem: 'ecal'
  },
  {
    kind: 'Hits',
    name: 'hcal_rec_back',
    path: ['HCAL', 'Rec hits', 'Back'],
    size: 3,
    subsystem: 'hcal'
  }
];

describe('collectionTree', () => {
  it('builds ordered trees and disables rec hits by default', () => {
    const tree = buildCollectionTree(collections);
    expect(tree.map((node) => node.label)).toEqual(['Truth', 'ECAL', 'HCAL']);

    const visibility = createCollectionVisibilityState(tree);
    expect(visibility.Truth).toBe(true);
    expect(visibility['ECAL/Rec hits']).toBe(false);
    expect(visibility['HCAL/Rec hits/Back']).toBe(false);
  });

  it('resolves visibility through ancestor state and returns subtree ids', () => {
    const tree = buildCollectionTree(collections);
    const state = {
      ...createCollectionVisibilityState(tree),
      Truth: false,
      ECAL: true,
      'ECAL/Rec hits': true,
      HCAL: true,
      'HCAL/Rec hits': true,
      'HCAL/Rec hits/Back': true
    };

    const resolved = resolveCollectionVisibility(tree, state);
    expect(resolved.SimParticles).toBe(false);
    expect(resolved.visualization_trajectories).toBe(false);
    expect(resolved.ecal_rec_hits).toBe(true);
    expect(resolved.hcal_rec_back).toBe(true);

    expect(collectCollectionNodeSubtreeIds(tree, 'HCAL/Rec hits')).toEqual([
      'HCAL/Rec hits',
      'HCAL/Rec hits/Back'
    ]);
  });
});
