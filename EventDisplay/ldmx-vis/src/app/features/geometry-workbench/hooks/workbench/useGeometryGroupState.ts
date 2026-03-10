import { useEffect, useState } from 'react';
import type {
  GeometryAppearanceOverride,
  GeometryGroup,
  GeometryRegistry
} from '../../../../types';
import {
  addGroupMembers,
  applyGroupAppearancePatch,
  createGeometryGroup,
  moveGroup,
  removeGroupMember
} from '../../utils/geometryGroups';

/**
 * Owns custom geometry groups and node-level appearance overrides.
 */
export function useGeometryGroupState(registry: GeometryRegistry) {
  const [groups, setGroups] = useState<Record<string, GeometryGroup>>({});
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [nodeOverrides, setNodeOverrides] = useState<
    Record<string, GeometryAppearanceOverride>
  >({});

  useEffect(() => {
    const nodeIds = new Set(Object.keys(registry.nodes));
    setGroups((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([groupId, group]) => [
          groupId,
          {
            ...group,
            memberNodeIds: group.memberNodeIds.filter((nodeId) =>
              nodeIds.has(nodeId)
            )
          }
        ])
      )
    );
    setNodeOverrides((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([nodeId]) => nodeIds.has(nodeId))
      )
    );
  }, [registry]);

  function createGroup(name: string) {
    const group = createGeometryGroup(name);
    setGroups((previous) => ({
      ...previous,
      [group.id]: group
    }));
    setGroupOrder((previous) => [...previous, group.id]);
    return group;
  }

  function deleteGroup(groupId: string) {
    setGroups((previous) => {
      const next = { ...previous };
      delete next[groupId];
      return next;
    });
    setGroupOrder((previous) => previous.filter((entry) => entry !== groupId));
  }

  function moveGroupToIndex(activeId: string, overId: string) {
    setGroupOrder((previous) => moveGroup(previous, activeId, overId));
  }

  function setGroupName(groupId: string, name: string) {
    setGroups((previous) => {
      const group = previous[groupId];
      if (!group) return previous;
      return {
        ...previous,
        [groupId]: applyGroupAppearancePatch(group, { name })
      };
    });
  }

  function assignNodeToGroup(nodeId: string, groupId: string) {
    setGroups((previous) => {
      const group = previous[groupId];
      if (!group) return previous;
      return {
        ...previous,
        [groupId]: addGroupMembers(group, [nodeId])
      };
    });
  }

  function removeMember(groupId: string, nodeId: string) {
    setGroups((previous) => {
      const group = previous[groupId];
      if (!group) return previous;
      return {
        ...previous,
        [groupId]: removeGroupMember(group, nodeId)
      };
    });
  }

  return {
    assignNodeToGroup,
    createGroup,
    deleteGroup,
    groupOrder,
    groups,
    moveGroupToIndex,
    nodeOverrides,
    removeGroupMember: removeMember,
    setGroupName,
    setGroups,
    setNodeOverrides
  };
}
