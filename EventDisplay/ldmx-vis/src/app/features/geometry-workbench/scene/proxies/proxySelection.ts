import type {
  HcalProxyGranularity,
  GeometryRegistry,
  GeometrySelectionTarget
} from '../../../../types';
import {
  isNodeEffectivelyVisible,
  nodeContainsNode
} from '../../utils/geometryRegistry';

/**
 * Determines whether the current selection is specific enough to justify
 * showing dense HCAL geometry instead of section or layer-group proxies.
 */
export function getFocusedDenseHcalNodeId(
  registry: GeometryRegistry,
  selectedTarget: GeometrySelectionTarget | null
) {
  if (selectedTarget?.type !== 'node') {
    return null;
  }

  const selectedNode = registry.nodes[selectedTarget.id];
  if (!selectedNode || selectedNode.subsystem !== 'hcal') {
    return null;
  }

  return selectedNode.path.length > 1 ? selectedNode.id : null;
}

/**
 * Picks the HCAL nodes that should be represented by simplified proxy
 * geometry for the current granularity and selection combination.
 */
export function deriveHcalProxyNodeIds(
  registry: GeometryRegistry,
  granularity: HcalProxyGranularity,
  selectedTarget: GeometrySelectionTarget | null,
  visibilityState: Record<string, boolean>
) {
  const hcalRootId = registry.rootIds.find(
    (nodeId) => registry.nodes[nodeId]?.subsystem === 'hcal'
  );
  if (!hcalRootId) {
    return [] as string[];
  }

  const focusNodeId = getFocusedDenseHcalNodeId(registry, selectedTarget);
  const targetDepth = getHcalProxyDepth(granularity);

  return Object.values(registry.nodes)
    .filter((node) => {
      if (node.subsystem !== 'hcal') return false;
      if (node.path.length !== targetDepth) return false;
      if (!nodeContainsNode(registry, hcalRootId, node.id)) return false;
      if (!isNodeEffectivelyVisible(registry, visibilityState, node.id)) {
        return false;
      }
      if (focusNodeId && nodeContainsNode(registry, node.id, focusNodeId)) {
        return false;
      }
      return true;
    })
    .map((node) => node.id);
}

function getHcalProxyDepth(granularity: HcalProxyGranularity) {
  switch (granularity) {
    case 'section':
      return 2;
    case 'layer':
      return 4;
    case 'layerGroup':
    default:
      return 3;
  }
}
