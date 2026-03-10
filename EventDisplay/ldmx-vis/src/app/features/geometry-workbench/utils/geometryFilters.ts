import type { GeometryRegistry } from '../../../types';

export function filterGeometryTree(
  registry: GeometryRegistry,
  rootIds: string[],
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      expandedIds: new Set<string>(),
      visibleIds: new Set(Object.keys(registry.nodes))
    };
  }

  const visibleIds = new Set<string>();
  const expandedIds = new Set<string>();

  const visit = (nodeId: string): boolean => {
    const node = registry.nodes[nodeId];
    if (!node) return false;

    const selfMatch =
      node.label.toLowerCase().includes(normalizedQuery) ||
      node.path.join(' / ').toLowerCase().includes(normalizedQuery);
    let childMatch = false;

    for (const childId of node.childIds) {
      if (visit(childId)) {
        childMatch = true;
        expandedIds.add(nodeId);
      }
    }

    const matched = selfMatch || childMatch;
    if (matched) visibleIds.add(nodeId);
    return matched;
  };

  for (const rootId of rootIds) {
    visit(rootId);
  }

  return {
    expandedIds,
    visibleIds
  };
}
