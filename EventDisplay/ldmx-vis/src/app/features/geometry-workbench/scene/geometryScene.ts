import { type Mesh, type Object3D } from 'three';
import type { GeometryRegistry, GeometryWorkbenchState } from '../../../types';
import { createOverrideFromGroup } from '../utils/geometryGroups';
import { createBaseAppearance, getPaletteEntry, getSelectionEdgeColor } from '../utils/geometryPalette';
import {
  isNodeEffectivelyVisible,
  nodeContainsNode,
  resolveGeometryObjectVisibility
} from '../utils/geometryRegistry';
import { applyGeometryEdges } from './geometryEdges';
import { buildGeometryClipPlanes } from './geometryClipping';
import { applyGeometryMaterial } from './geometryMaterials';
import {
  buildProxyFragments,
  deriveHcalProxyNodeIds,
  getFocusedDenseHcalNodeId,
  syncGeometryProxies
} from './geometryProxies';
import { syncSlicePlaneHelpers } from './geometryHelpers';

/**
 * Applies the geometry workbench state onto the managed detector scene:
 * clip planes, subtree visibility, appearance overrides, and HCAL proxies.
 * Event hits/trajectories are handled elsewhere and intentionally remain
 * independent from these geometry-only operations.
 */
export function applyGeometryWorkbench(
  sceneRoot: Object3D,
  registry: GeometryRegistry,
  workbenchState: GeometryWorkbenchState
) {
  const clipPlanes = buildGeometryClipPlanes(workbenchState.clipPlanes);
  const objectVisibility = resolveGeometryObjectVisibility(
    registry,
    workbenchState.visibilityState
  );
  const focusedDenseHcalNodeId = getFocusedDenseHcalNodeId(
    registry,
    workbenchState.selectedTarget
  );
  const hcalProxyNodeIds = deriveHcalProxyNodeIds(
    registry,
    workbenchState.hcalProxyGranularity,
    workbenchState.selectedTarget,
    workbenchState.visibilityState
  );

  syncGeometryProxies(
    sceneRoot,
    hcalProxyNodeIds.flatMap((nodeId) => {
      const node = registry.nodes[nodeId];
      if (!node) return [];
      const appearance = resolveAppearance(registry, workbenchState, nodeId);
      const palette = getPaletteEntry(node.defaultColorToken);
      const fragments = buildProxyFragments(
        registry,
        nodeId,
        workbenchState.visibilityState
      );
      return [{
        clippingPlanes: clipPlanes,
        color: palette.edge,
        fragments,
        nodeId,
        opacity: Math.max(appearance.edgeOpacity, 0.24),
        visible:
          isNodeEffectivelyVisible(registry, workbenchState.visibilityState, nodeId) &&
          fragments.length > 0 &&
          appearance.renderMode !== 'hidden'
      }];
    })
  );

  sceneRoot.traverse((object: Object3D) => {
    const nodeId = registry.objectNodeIds[object.uuid];
    if (!nodeId || !('material' in object)) {
      return;
    }

    const node = registry.nodes[nodeId];
    if (!node) {
      return;
    }

    const appearance = resolveAppearance(registry, workbenchState, nodeId);
    const palette = getPaletteEntry(node.defaultColorToken);
    const selected = matchesSelection(registry, workbenchState, nodeId);
    const suppressDenseHcalGeometry =
      node.subsystem === 'hcal' &&
      node.kind === 'leaf' &&
      (!focusedDenseHcalNodeId ||
        !nodeContainsNode(registry, focusedDenseHcalNodeId, node.id));
    const visible =
      (objectVisibility[object.uuid] ?? true) &&
      !suppressDenseHcalGeometry &&
      appearance.renderMode !== 'hidden' &&
      appearance.opacity > 0.001;

    const fillColor =
      appearance.colorMode === 'custom' && appearance.color
        ? appearance.color
        : palette.tint;
    const selectedOpacity =
      appearance.renderMode === 'solid'
        ? Math.min(0.18, Math.max(appearance.opacity, 0.06))
        : appearance.renderMode === 'solidWire'
        ? Math.min(0.1, Math.max(appearance.opacity, 0.02))
        : appearance.opacity;

    applyGeometryMaterial(object as Mesh, {
      clippingPlanes: clipPlanes,
      fillColor,
      opacity: selected ? selectedOpacity : appearance.opacity,
      renderMode: appearance.renderMode,
      visible
    });

    applyGeometryEdges(object as Mesh, {
      clippingPlanes: clipPlanes,
      color: selected ? getSelectionEdgeColor() : palette.edge,
      opacity: selected ? 0.98 : appearance.edgeOpacity,
      visible:
        visible &&
        (selected ||
          appearance.renderMode === 'wire' ||
          appearance.renderMode === 'solidWire')
    });
  });
}

export { syncSlicePlaneHelpers };

function resolveAppearance(
  registry: GeometryRegistry,
  workbenchState: GeometryWorkbenchState,
  nodeId: string
) {
  const node = registry.nodes[nodeId];
  if (!node) {
    throw new Error(`Unknown geometry node: ${nodeId}`);
  }
  let appearance = createBaseAppearance(node.defaultColorToken);

  for (const op of workbenchState.ops) {
    if (op.targetType === 'group') {
      const group = workbenchState.groups[op.targetId];
      if (!group) continue;
      const matches = group.memberNodeIds.some((memberId) =>
        nodeContainsNode(registry, memberId, nodeId)
      );
      if (!matches) continue;
      appearance = {
        ...appearance,
        ...createOverrideFromGroup(group)
      };
      continue;
    }

    if (nodeContainsNode(registry, op.targetId, nodeId)) {
      const override = workbenchState.nodeOverrides[op.targetId];
      if (override) {
        appearance = {
          ...appearance,
          ...override
        };
      }
    }
  }

  return appearance;
}

function matchesSelection(
  registry: GeometryRegistry,
  workbenchState: GeometryWorkbenchState,
  nodeId: string
) {
  const target = workbenchState.selectedTarget;
  if (!target) return false;

  if (target.type === 'node') {
    return nodeContainsNode(registry, target.id, nodeId);
  }

  if (target.type === 'group') {
    const group = workbenchState.groups[target.id];
    if (!group) return false;
    return group.memberNodeIds.some((memberId) =>
      nodeContainsNode(registry, memberId, nodeId)
    );
  }

  return false;
}
