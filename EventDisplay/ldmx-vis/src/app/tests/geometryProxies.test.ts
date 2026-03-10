import { describe, expect, it } from 'vitest';
import type { GeometryRegistry } from '../types';
import {
  buildProxyFragments,
  deriveHcalProxyNodeIds,
  getFocusedDenseHcalNodeId
} from '../features/geometry-workbench/scene/geometryProxies';

const registry: GeometryRegistry = {
  nodeOrder: [
    'HCAL',
    'HCAL/Back',
    'HCAL/Back/Scintillator X',
    'HCAL/Back/Scintillator X/Slice 1',
    'HCAL/Top',
    'HCAL/Top/Layer group 1'
  ],
  nodes: {
    HCAL: {
      bounds: { center: [0, 0, 0], size: [10, 10, 10] },
      childIds: ['HCAL/Back', 'HCAL/Top'],
      defaultColorToken: 'hcal',
      id: 'HCAL',
      kind: 'subsystem',
      label: 'HCAL',
      objectUuids: ['root'],
      parentId: null,
      path: ['HCAL'],
      stats: { childCount: 2, directObjectCount: 0, leafObjectCount: 2 },
      subsystem: 'hcal'
    },
    'HCAL/Back': {
      bounds: { center: [0, 0, 1], size: [8, 8, 2] },
      childIds: ['HCAL/Back/Scintillator X'],
      defaultColorToken: 'hcal',
      id: 'HCAL/Back',
      kind: 'family',
      label: 'Back',
      objectUuids: ['back'],
      parentId: 'HCAL',
      path: ['HCAL', 'Back'],
      stats: { childCount: 1, directObjectCount: 0, leafObjectCount: 1 },
      subsystem: 'hcal'
    },
    'HCAL/Back/Scintillator X': {
      bounds: { center: [0, 0, 1], size: [7, 7, 1] },
      childIds: ['HCAL/Back/Scintillator X/Slice 1'],
      defaultColorToken: 'hcal',
      id: 'HCAL/Back/Scintillator X',
      kind: 'layer',
      label: 'Scintillator X',
      objectUuids: ['back-x'],
      parentId: 'HCAL/Back',
      path: ['HCAL', 'Back', 'Scintillator X'],
      stats: { childCount: 1, directObjectCount: 0, leafObjectCount: 1 },
      subsystem: 'hcal'
    },
    'HCAL/Back/Scintillator X/Slice 1': {
      bounds: { center: [0, 0, 1], size: [1, 1, 1] },
      childIds: [],
      defaultColorToken: 'hcal',
      id: 'HCAL/Back/Scintillator X/Slice 1',
      kind: 'leaf',
      label: 'Slice 1',
      objectUuids: ['slice'],
      parentId: 'HCAL/Back/Scintillator X',
      path: ['HCAL', 'Back', 'Scintillator X', 'Slice 1'],
      stats: { childCount: 0, directObjectCount: 1, leafObjectCount: 1 },
      subsystem: 'hcal'
    },
    'HCAL/Top': {
      bounds: { center: [0, 5, 0], size: [8, 2, 8] },
      childIds: ['HCAL/Top/Layer group 1'],
      defaultColorToken: 'hcal',
      id: 'HCAL/Top',
      kind: 'family',
      label: 'Top',
      objectUuids: ['top'],
      parentId: 'HCAL',
      path: ['HCAL', 'Top'],
      stats: { childCount: 1, directObjectCount: 0, leafObjectCount: 1 },
      subsystem: 'hcal'
    },
    'HCAL/Top/Layer group 1': {
      bounds: { center: [0, 5, 0], size: [6, 2, 6] },
      childIds: [
        'HCAL/Top/Layer group 1/Scintillator Z',
        'HCAL/Top/Layer group 1/Absorber'
      ],
      defaultColorToken: 'hcal',
      id: 'HCAL/Top/Layer group 1',
      kind: 'layer',
      label: 'Layer group 1',
      objectUuids: ['top-module-1'],
      parentId: 'HCAL/Top',
      path: ['HCAL', 'Top', 'Layer group 1'],
      stats: { childCount: 2, directObjectCount: 0, leafObjectCount: 4 },
      subsystem: 'hcal'
    },
    'HCAL/Top/Layer group 1/Scintillator Z': {
      bounds: { center: [0, 5, 0], size: [6, 2, 6] },
      childIds: ['HCAL/Top/Layer group 1/Scintillator Z/Quadbars 1-4'],
      defaultColorToken: 'hcal',
      id: 'HCAL/Top/Layer group 1/Scintillator Z',
      kind: 'component',
      label: 'Scintillator Z',
      objectUuids: ['top-z'],
      parentId: 'HCAL/Top/Layer group 1',
      path: ['HCAL', 'Top', 'Layer group 1', 'Scintillator Z'],
      stats: { childCount: 1, directObjectCount: 0, leafObjectCount: 2 },
      subsystem: 'hcal'
    },
    'HCAL/Top/Layer group 1/Scintillator Z/Quadbars 1-4': {
      bounds: { center: [1, 5, 0], size: [2, 2, 6] },
      childIds: [],
      defaultColorToken: 'hcal',
      id: 'HCAL/Top/Layer group 1/Scintillator Z/Quadbars 1-4',
      kind: 'component',
      label: 'Quadbars 1-4',
      objectUuids: ['top-z-quad'],
      parentId: 'HCAL/Top/Layer group 1/Scintillator Z',
      path: ['HCAL', 'Top', 'Layer group 1', 'Scintillator Z', 'Quadbars 1-4'],
      stats: { childCount: 0, directObjectCount: 1, leafObjectCount: 1 },
      subsystem: 'hcal'
    },
    'HCAL/Top/Layer group 1/Absorber': {
      bounds: { center: [0, 5, 0], size: [6, 2, 6] },
      childIds: ['HCAL/Top/Layer group 1/Absorber/Piece 1'],
      defaultColorToken: 'hcal',
      id: 'HCAL/Top/Layer group 1/Absorber',
      kind: 'component',
      label: 'Absorber',
      objectUuids: ['top-absorber'],
      parentId: 'HCAL/Top/Layer group 1',
      path: ['HCAL', 'Top', 'Layer group 1', 'Absorber'],
      stats: { childCount: 1, directObjectCount: 0, leafObjectCount: 2 },
      subsystem: 'hcal'
    },
    'HCAL/Top/Layer group 1/Absorber/Piece 1': {
      bounds: { center: [-1, 5, 0], size: [2, 2, 6] },
      childIds: [],
      defaultColorToken: 'hcal',
      id: 'HCAL/Top/Layer group 1/Absorber/Piece 1',
      kind: 'component',
      label: 'Piece 1',
      objectUuids: ['top-absorber-piece'],
      parentId: 'HCAL/Top/Layer group 1/Absorber',
      path: ['HCAL', 'Top', 'Layer group 1', 'Absorber', 'Piece 1'],
      stats: { childCount: 0, directObjectCount: 1, leafObjectCount: 1 },
      subsystem: 'hcal'
    }
  },
  objectNodeIds: {},
  rootIds: ['HCAL']
};

describe('geometryProxies', () => {
  it('uses section proxies by default and drills into the selected hcal subtree', () => {
    const visibilityState = {
      HCAL: true,
      'HCAL/Back': true,
      'HCAL/Back/Scintillator X': true,
      'HCAL/Back/Scintillator X/Slice 1': true,
      'HCAL/Top': true
    };

    expect(getFocusedDenseHcalNodeId(registry, null)).toBeNull();
    expect(
      deriveHcalProxyNodeIds(registry, 'section', null, visibilityState)
    ).toEqual(['HCAL/Back', 'HCAL/Top']);
    expect(
      deriveHcalProxyNodeIds(registry, 'layerGroup', null, visibilityState)
    ).toEqual(['HCAL/Back/Scintillator X', 'HCAL/Top/Layer group 1']);

    expect(
      getFocusedDenseHcalNodeId(registry, {
        id: 'HCAL/Back/Scintillator X',
        type: 'node'
      })
    ).toBe('HCAL/Back/Scintillator X');
    expect(
      deriveHcalProxyNodeIds(
        registry,
        'layerGroup',
        { id: 'HCAL/Back/Scintillator X', type: 'node' },
        visibilityState
      )
    ).toEqual(['HCAL/Top/Layer group 1']);
  });

  it('builds side hcal layer-group proxies from exact descendant group bounds', () => {
    const fragments = buildProxyFragments(registry, 'HCAL/Top/Layer group 1', {
      HCAL: true,
      'HCAL/Top': true,
      'HCAL/Top/Layer group 1': true,
      'HCAL/Top/Layer group 1/Scintillator Z': true,
      'HCAL/Top/Layer group 1/Scintillator Z/Quadbars 1-4': true,
      'HCAL/Top/Layer group 1/Absorber': true,
      'HCAL/Top/Layer group 1/Absorber/Piece 1': true
    });

    expect(fragments).toEqual([
      { center: [1, 5, 0], size: [2, 2, 6] },
      { center: [-1, 5, 0], size: [2, 2, 6] }
    ]);
  });
});
