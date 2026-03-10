import type {
  GeometryAppearanceOverride,
  GeometryGroup,
  GeometryRenderMode
} from '../../../types';

export function createGeometryGroup(name: string): GeometryGroup {
  return {
    colorOverride: null,
    defaultOpacity: null,
    defaultRenderMode: null,
    id: globalThis.crypto?.randomUUID?.() ?? `group_${Date.now()}`,
    memberNodeIds: [],
    name
  };
}

export function addGroupMembers(group: GeometryGroup, nodeIds: string[]) {
  const members = new Set(group.memberNodeIds);
  for (const nodeId of nodeIds) {
    members.add(nodeId);
  }
  return {
    ...group,
    memberNodeIds: Array.from(members)
  };
}

export function removeGroupMember(group: GeometryGroup, nodeId: string) {
  return {
    ...group,
    memberNodeIds: group.memberNodeIds.filter((entry) => entry !== nodeId)
  };
}

export function moveGroup(
  order: string[],
  activeId: string,
  overId: string
) {
  const sourceIndex = order.indexOf(activeId);
  const targetIndex = order.indexOf(overId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return order;
  }

  const next = [...order];
  const [item] = next.splice(sourceIndex, 1);
  if (!item) return order;
  next.splice(targetIndex, 0, item);
  return next;
}

export function createOverrideFromGroup(group: GeometryGroup) {
  return {
    color: group.colorOverride,
    colorMode: group.colorOverride ? 'custom' : 'default',
    edgeOpacity: 0.78,
    opacity: group.defaultOpacity ?? 0.06,
    renderMode: group.defaultRenderMode ?? 'wire'
  } satisfies GeometryAppearanceOverride;
}

export function applyGroupAppearancePatch(
  group: GeometryGroup,
  patch: Partial<{
    colorOverride: string | null;
    defaultOpacity: number | null;
    defaultRenderMode: GeometryRenderMode | null;
    name: string;
  }>
) {
  return {
    ...group,
    ...patch
  };
}
