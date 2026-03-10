import type { GeometryRegistry } from '../../../../types';
import {
  collectGeometrySubtreeIds,
  isNodeEffectivelyVisible
} from '../../utils/geometryRegistry';

export type GeometryProxyFragment = {
  center: [number, number, number];
  size: [number, number, number];
};

/**
 * Builds the exact proxy fragments for a registry node using the already
 * computed geometry bounds stored on the semantic tree.
 */
export function buildProxyFragments(
  registry: GeometryRegistry,
  nodeId: string,
  visibilityState: Record<string, boolean>
) {
  const node = registry.nodes[nodeId];
  if (!node) {
    return [] as GeometryProxyFragment[];
  }

  const fragmentNodeIds = getProxyFragmentNodeIds(
    registry,
    nodeId,
    visibilityState
  );

  if (fragmentNodeIds.length) {
    return fragmentNodeIds.flatMap((fragmentNodeId) => {
      const fragmentNode = registry.nodes[fragmentNodeId];
      return fragmentNode ? [fragmentFromNode(fragmentNode)] : [];
    });
  }

  return [fragmentFromNode(node)];
}

function getProxyFragmentNodeIds(
  registry: GeometryRegistry,
  nodeId: string,
  visibilityState: Record<string, boolean>
) {
  const node = registry.nodes[nodeId];
  if (!node || node.subsystem !== 'hcal') {
    return [] as string[];
  }

  const candidates =
    node.path[1] === 'Back'
      ? getBackHcalProxyFragmentNodeIds(registry, nodeId)
      : getSideHcalProxyFragmentNodeIds(registry, nodeId);

  return candidates.filter((candidateId) =>
    isNodeEffectivelyVisible(registry, visibilityState, candidateId)
  );
}

function getBackHcalProxyFragmentNodeIds(
  registry: GeometryRegistry,
  nodeId: string
) {
  const node = registry.nodes[nodeId];
  if (!node) {
    return [] as string[];
  }

  if (node.path.length === 2 || node.path.length === 3 || node.path.length === 4) {
    return [...node.childIds];
  }

  if (
    node.path.length === 5 &&
    (node.label === 'Scintillator X' || node.label === 'Scintillator Y')
  ) {
    return [...node.childIds];
  }

  return [] as string[];
}

function getSideHcalProxyFragmentNodeIds(
  registry: GeometryRegistry,
  nodeId: string
) {
  const node = registry.nodes[nodeId];
  if (!node) {
    return [] as string[];
  }

  if (node.path.length === 2) {
    return [...node.childIds];
  }

  if (node.path.length === 3) {
    const exactFragments = collectGeometrySubtreeIds(registry, nodeId).filter(
      (candidateId) => {
        const candidate = registry.nodes[candidateId];
        if (!candidate) return false;
        return (
          candidateId !== nodeId &&
          (candidate.label.startsWith('Piece ') ||
            candidate.label.startsWith('Quadbars '))
        );
      }
    );

    if (exactFragments.length) {
      return exactFragments;
    }

    return [...node.childIds];
  }

  if (node.path.length === 4) {
    return [...node.childIds];
  }

  return [] as string[];
}

function fragmentFromNode(node: GeometryRegistry['nodes'][string]) {
  return {
    center: node.bounds.center,
    size: node.bounds.size
  };
}
