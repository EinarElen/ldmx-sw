import { useEffect, useMemo, useState } from 'react';
import type {
  GeometryAppearanceOverride,
  GeometryRegistry,
  HcalProxyGranularity
} from '../../../types';
import { useGeometrySelection } from './useGeometrySelection';
import { deriveGeometryOps } from '../utils/geometryOps';
import { createBaseAppearance } from '../utils/geometryPalette';
import { applyGroupAppearancePatch } from '../utils/geometryGroups';
import { buildGeometryRegistry } from '../utils/geometryRegistry';
import { summarizeBounds } from './workbench/shared';
import { useGeometryClipPlaneState } from './workbench/useGeometryClipPlaneState';
import { useGeometryGroupState } from './workbench/useGeometryGroupState';
import { useGeometryTreeState } from './workbench/useGeometryTreeState';
import type { Object3D } from 'three';

/**
 * Composes all geometry-workbench state: immutable registry data, tree state,
 * custom groups, appearance overrides, clip planes, and selection.
 */
export function useGeometryWorkbenchController(geometryRoot: Object3D | null) {
  const registry = useMemo<GeometryRegistry>(
    () =>
      geometryRoot
        ? buildGeometryRegistry(geometryRoot)
        : {
            nodeOrder: [],
            nodes: {},
            objectNodeIds: {},
            rootIds: []
          },
    [geometryRoot]
  );
  const bounds = useMemo(() => summarizeBounds(geometryRoot), [geometryRoot]);
  const treeState = useGeometryTreeState(registry);
  const groupState = useGeometryGroupState(registry);
  const clipPlaneState = useGeometryClipPlaneState(bounds);
  const [hcalProxyGranularity, setHcalProxyGranularity] =
    useState<HcalProxyGranularity>('layerGroup');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>(
    'translate'
  );

  const {
    selectedGroup,
    selectedNode,
    selectedNodeOverride,
    selectedPlane,
    selectedTarget,
    setSelectedTarget
  } = useGeometrySelection({
    clipPlanes: clipPlaneState.clipPlanes,
    groups: groupState.groups,
    nodeOverrides: groupState.nodeOverrides,
    registry
  });

  useEffect(() => {
    const nodeIds = new Set(Object.keys(registry.nodes));
    const groupIds = new Set(Object.keys(groupState.groups));
    const planeIds = new Set(clipPlaneState.clipPlanes.map((plane) => plane.id));

    setSelectedTarget((previous) => {
      if (!previous) return previous;
      if (previous.type === 'node' && !nodeIds.has(previous.id)) return null;
      if (previous.type === 'group' && !groupIds.has(previous.id)) return null;
      if (previous.type === 'plane' && !planeIds.has(previous.id)) return null;
      return previous;
    });
  }, [clipPlaneState.clipPlanes, groupState.groups, registry, setSelectedTarget]);

  const ops = useMemo(
    () =>
      deriveGeometryOps(
        groupState.groupOrder,
        groupState.groups,
        groupState.nodeOverrides
      ),
    [groupState.groupOrder, groupState.groups, groupState.nodeOverrides]
  );

  const workbenchState = useMemo(
    () => ({
      clipPlanes: clipPlaneState.clipPlanes,
      groupOrder: groupState.groupOrder,
      groups: groupState.groups,
      hcalProxyGranularity,
      nodeOverrides: groupState.nodeOverrides,
      ops,
      selectedTarget,
      transformMode,
      visibilityState: treeState.visibilityState
    }),
    [
      clipPlaneState.clipPlanes,
      groupState.groupOrder,
      groupState.groups,
      groupState.nodeOverrides,
      hcalProxyGranularity,
      ops,
      selectedTarget,
      transformMode,
      treeState.visibilityState
    ]
  );

  const selectedAppearance = useMemo(() => {
    if (selectedTarget?.type === 'node' && selectedNode) {
      return (
        selectedNodeOverride ??
        createBaseAppearance(selectedNode.defaultColorToken)
      );
    }

    if (selectedTarget?.type === 'group' && selectedGroup) {
      return {
        color: selectedGroup.colorOverride,
        colorMode: selectedGroup.colorOverride ? 'custom' : 'default',
        edgeOpacity: 0.78,
        opacity: selectedGroup.defaultOpacity ?? 0.06,
        renderMode: selectedGroup.defaultRenderMode ?? 'wire'
      } satisfies GeometryAppearanceOverride;
    }

    return null;
  }, [selectedGroup, selectedNode, selectedNodeOverride, selectedTarget]);

  const selectedLabel = useMemo(() => {
    if (selectedNode) return selectedNode.path.join(' / ');
    if (selectedGroup) return selectedGroup.name;
    if (selectedPlane) return selectedPlane.label;
    return null;
  }, [selectedGroup, selectedNode, selectedPlane]);

  function createGroup() {
    const group = groupState.createGroup(`Group ${groupState.groupOrder.length + 1}`);
    setSelectedTarget({ id: group.id, type: 'group' });
  }

  function deleteGroup(groupId: string) {
    groupState.deleteGroup(groupId);
    setSelectedTarget((previous) =>
      previous?.type === 'group' && previous.id === groupId ? null : previous
    );
  }

  function removeClipPlane(planeId: string) {
    clipPlaneState.removeClipPlane(planeId);
    setSelectedTarget((previous) =>
      previous?.type === 'plane' && previous.id === planeId ? null : previous
    );
  }

  function addClipPlane() {
    const plane = clipPlaneState.addClipPlane();
    setSelectedTarget({ id: plane.id, type: 'plane' });
  }

  function setSelectedAppearance(
    patch: Partial<GeometryAppearanceOverride>
  ) {
    if (selectedTarget?.type === 'node' && selectedNode) {
      groupState.setNodeOverrides((previous) => {
        const base =
          previous[selectedTarget.id] ??
          createBaseAppearance(selectedNode.defaultColorToken);
        return {
          ...previous,
          [selectedTarget.id]: {
            ...base,
            ...patch
          }
        };
      });
      return;
    }

    if (selectedTarget?.type === 'group' && selectedGroup) {
      groupState.setGroups((previous) => {
        const group = previous[selectedTarget.id];
        if (!group) return previous;
        return {
          ...previous,
          [selectedTarget.id]: applyGroupAppearancePatch(group, {
            colorOverride:
              patch.colorMode === 'custom' ? (patch.color ?? null) : null,
            defaultOpacity: patch.opacity ?? group.defaultOpacity,
            defaultRenderMode: patch.renderMode ?? group.defaultRenderMode
          })
        };
      });
    }
  }

  function resetSelectedAppearance() {
    if (selectedTarget?.type === 'node') {
      groupState.setNodeOverrides((previous) => {
        if (!(selectedTarget.id in previous)) return previous;
        const next = { ...previous };
        delete next[selectedTarget.id];
        return next;
      });
      return;
    }

    if (selectedTarget?.type === 'group' && selectedGroup) {
      groupState.setGroups((previous) => {
        const group = previous[selectedTarget.id];
        if (!group) return previous;
        return {
          ...previous,
          [selectedTarget.id]: applyGroupAppearancePatch(group, {
            colorOverride: null,
            defaultOpacity: null,
            defaultRenderMode: null
          })
        };
      });
    }
  }

  return {
    addClipPlane,
    assignNodeToGroup: groupState.assignNodeToGroup,
    bounds,
    clipPlanes: clipPlaneState.clipPlanes,
    collapseAll: treeState.collapseAll,
    createGroup,
    deleteGroup,
    expandedState: treeState.expandedState,
    expandAll: treeState.expandAll,
    filteredRootIds: treeState.filteredRootIds,
    groupOrder: groupState.groupOrder,
    groups: groupState.groups,
    hcalProxyGranularity,
    moveGroupToIndex: groupState.moveGroupToIndex,
    movePlaneToIndex: clipPlaneState.movePlaneToIndex,
    registry,
    removeClipPlane,
    removeGroupMember: groupState.removeGroupMember,
    resetSelectedAppearance,
    searchQuery: treeState.searchQuery,
    selectGroup: (groupId: string) =>
      setSelectedTarget({ id: groupId, type: 'group' }),
    selectNode: (nodeId: string) =>
      setSelectedTarget({ id: nodeId, type: 'node' }),
    selectPlane: (planeId: string) =>
      setSelectedTarget({ id: planeId, type: 'plane' }),
    selectedAppearance,
    selectedGroup,
    selectedLabel,
    selectedNode,
    selectedPlane,
    selectedTarget,
    setGroupName: groupState.setGroupName,
    setHcalProxyGranularity,
    setNodeVisibility: treeState.setNodeVisibility,
    setSearchQuery: treeState.setSearchQuery,
    setSelectedAppearance,
    setSelectedTarget,
    setTransformMode,
    toggleExpanded: treeState.toggleExpanded,
    transformMode,
    updateClipPlane: clipPlaneState.updateClipPlane,
    updatePlaneTransform: clipPlaneState.updatePlaneTransform,
    visibleNodeIds: treeState.visibleNodeIds,
    visibilityState: treeState.visibilityState,
    workbenchState
  };
}
