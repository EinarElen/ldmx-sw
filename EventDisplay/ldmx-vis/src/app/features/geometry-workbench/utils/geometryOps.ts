import type {
  GeometryAppearanceOverride,
  GeometryGroup,
  GeometryOp
} from '../../../types';

export function deriveGeometryOps(
  groupOrder: string[],
  groups: Record<string, GeometryGroup>,
  nodeOverrides: Record<string, GeometryAppearanceOverride>
): GeometryOp[] {
  const ops: GeometryOp[] = [];

  groupOrder.forEach((groupId, index) => {
    if (!groups[groupId]) return;
    ops.push({
      id: `group:${groupId}`,
      order: index,
      targetId: groupId,
      targetType: 'group',
      type: 'appearance'
    });
  });

  Object.keys(nodeOverrides)
    .sort((left, right) => left.localeCompare(right))
    .forEach((nodeId, index) => {
      ops.push({
        id: `node:${nodeId}`,
        order: groupOrder.length + index,
        targetId: nodeId,
        targetType: 'node',
        type: 'appearance'
      });
    });

  return ops;
}
