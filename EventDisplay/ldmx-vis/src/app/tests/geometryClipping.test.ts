import { describe, expect, test } from 'vitest';
import { buildGeometryClipPlanes } from '../features/geometry-workbench/scene/geometryClipping';

describe('buildGeometryClipPlanes', () => {
  test('creates enabled geometry clip planes with mode-aware normals', () => {
    const planes = buildGeometryClipPlanes([
      {
        color: '#61afef',
        enabled: true,
        helperSize: 1000,
        id: 'p1',
        label: 'Plane 1',
        mode: 'keepPositive',
        position: [10, 0, 0],
        rotation: [0, 0, 0],
        thickness: 100,
        visible: true
      },
      {
        color: '#98c379',
        enabled: true,
        helperSize: 1000,
        id: 'p2',
        label: 'Plane 2',
        mode: 'keepNegative',
        position: [20, 0, 0],
        rotation: [0, 0, 0],
        thickness: 100,
        visible: true
      }
    ]);

    expect(planes).toHaveLength(2);
    const firstPlane = planes[0];
    const secondPlane = planes[1];
    expect(firstPlane?.normal.z).toBeCloseTo(1);
    expect(secondPlane?.normal.z).toBeCloseTo(-1);
  });
});
