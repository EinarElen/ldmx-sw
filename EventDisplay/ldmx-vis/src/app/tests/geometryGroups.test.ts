import { describe, expect, test } from 'vitest';
import {
  addGroupMembers,
  createGeometryGroup,
  moveGroup,
  removeGroupMember
} from '../features/geometry-workbench/utils/geometryGroups';
import { deriveGeometryOps } from '../features/geometry-workbench/utils/geometryOps';

describe('geometry group utilities', () => {
  test('adds, removes, and reorders group membership and ops', () => {
    const groupA = addGroupMembers(createGeometryGroup('Calorimeters'), [
      'ECAL',
      'HCAL'
    ]);
    const groupB = addGroupMembers(createGeometryGroup('Trackers'), ['Tagger']);
    const updated = removeGroupMember(groupA, 'ECAL');

    expect(updated.memberNodeIds).toEqual(['HCAL']);
    expect(moveGroup([groupA.id, groupB.id], groupB.id, groupA.id)).toEqual([
      groupB.id,
      groupA.id
    ]);

    const ops = deriveGeometryOps(
      [groupA.id, groupB.id],
      {
        [groupA.id]: groupA,
        [groupB.id]: groupB
      },
      {
        HCAL: {
          color: '#61afef',
          colorMode: 'custom',
          edgeOpacity: 0.8,
          opacity: 0.22,
          renderMode: 'wire'
        }
      }
    );

    expect(ops.map((entry) => entry.id)).toEqual([
      `group:${groupA.id}`,
      `group:${groupB.id}`,
      'node:HCAL'
    ]);
  });
});
