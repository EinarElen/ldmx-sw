import type { GeometryRegistry, GeometryRegistryNode } from '../../../types';

/**
 * Visibility state is stored per registry node so subtree toggles can be
 * resolved without mutating the source scene graph directly.
 */
export function createGeometryVisibilityState(registry: GeometryRegistry) {
  const state = Object.fromEntries(
    Object.keys(registry.nodes).map((nodeId) => [nodeId, true])
  );

  for (const node of Object.values(registry.nodes)) {
    if (node.subsystem === 'support') {
      state[node.id] = false;
    }
  }

  return state;
}

/**
 * Returns all registry node ids below a subtree root, including the root
 * itself. Geometry operations use this for bulk visibility and group updates.
 */
export function collectGeometrySubtreeIds(
  registry: GeometryRegistry,
  targetId: string
) {
  const target = registry.nodes[targetId];
  if (!target) return [] as string[];

  const ids: string[] = [];
  const queue = [target.id];
  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId) continue;
    ids.push(currentId);
    const currentNode = registry.nodes[currentId];
    if (!currentNode) continue;
    queue.push(...currentNode.childIds);
  }
  return ids;
}

/**
 * Resolves per-object visibility by combining registry hierarchy membership
 * with the current node-level visibility state.
 */
export function resolveGeometryObjectVisibility(
  registry: GeometryRegistry,
  visibilityState: Record<string, boolean>
) {
  const visibility: Record<string, boolean> = {};

  for (const rootId of registry.rootIds) {
    visitVisibility(registry, visibilityState, visibility, rootId, true);
  }

  return visibility;
}

export function nodeContainsNode(
  registry: GeometryRegistry,
  ancestorId: string,
  nodeId: string
) {
  let currentId: string | null = nodeId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    currentId = registry.nodes[currentId]?.parentId ?? null;
  }
  return false;
}

export function isNodeEffectivelyVisible(
  registry: GeometryRegistry,
  visibilityState: Record<string, boolean>,
  nodeId: string
) {
  let currentId: string | null = nodeId;
  while (currentId) {
    if ((visibilityState[currentId] ?? true) === false) {
      return false;
    }
    currentId = registry.nodes[currentId]?.parentId ?? null;
  }
  return true;
}

export function getGeometryChildren(
  registry: GeometryRegistry,
  nodeId: string | null
) {
  if (nodeId == null) {
    return registry.rootIds.map((id) => registry.nodes[id]);
  }

  const node = registry.nodes[nodeId];
  if (!node) return [] as GeometryRegistryNode[];
  return node.childIds.map((id) => registry.nodes[id]);
}

function visitVisibility(
  registry: GeometryRegistry,
  visibilityState: Record<string, boolean>,
  objectVisibility: Record<string, boolean>,
  nodeId: string,
  ancestorsVisible: boolean
) {
  const node = registry.nodes[nodeId];
  if (!node) return;

  const visible = ancestorsVisible && (visibilityState[nodeId] ?? true);
  if (!node.childIds.length) {
    for (const uuid of node.objectUuids) {
      objectVisibility[uuid] = visible;
    }
  }

  for (const childId of node.childIds) {
    visitVisibility(registry, visibilityState, objectVisibility, childId, visible);
  }
}
