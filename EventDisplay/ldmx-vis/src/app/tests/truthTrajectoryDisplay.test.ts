import { describe, expect, it } from 'vitest';
import { sanitizeTrajectoryPoints } from '../utils/truthTrajectoryDisplay';

describe('truthTrajectoryDisplay', () => {
  it('drops useless far-world endpoint tails', () => {
    const points = [
      {
        kind: 'boundary',
        position: [280, 750, 132] as [number, number, number],
        time: 1,
        volume: 'World_PV'
      },
      {
        kind: 'endpoint',
        position: [6000, 4376, -4005] as [number, number, number],
        time: 2,
        volume: 'World_PV'
      }
    ];

    expect(sanitizeTrajectoryPoints(points)).toEqual([points[0]]);
  });

  it('keeps ordinary in-detector endpoints', () => {
    const points = [
      {
        kind: 'boundary',
        position: [10, 10, 200] as [number, number, number],
        time: 1,
        volume: 'coil_1_vol_PV'
      },
      {
        kind: 'endpoint',
        position: [15, 11, 205] as [number, number, number],
        time: 2,
        volume: 'coil_1_vol_PV'
      }
    ];

    expect(sanitizeTrajectoryPoints(points)).toEqual(points);
  });
});
