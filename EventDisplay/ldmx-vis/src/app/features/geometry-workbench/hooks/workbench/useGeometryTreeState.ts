import { useEffect, useMemo, useState } from 'react';
import type { GeometryRegistry } from '../../../../types';
import { filterGeometryTree } from '../../utils/geometryFilters';
import {
  collectGeometrySubtreeIds,
  createGeometryVisibilityState
} from '../../utils/geometryRegistry';
import { createDefaultExpandedState } from './shared';

/**
 * Owns search, subtree visibility, and expansion state for the immutable
 * detector hierarchy.
 */
export function useGeometryTreeState(registry: GeometryRegistry) {
  const [visibilityState, setVisibilityState] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setVisibilityState((previous) => {
      const next = createGeometryVisibilityState(registry);
      for (const nodeId of Object.keys(next)) {
        if (previous[nodeId] !== undefined) {
          next[nodeId] = previous[nodeId];
        }
      }
      return next;
    });
    setExpandedState((previous) => {
      const next = createDefaultExpandedState(registry);
      for (const nodeId of Object.keys(next)) {
        if (previous[nodeId] !== undefined) {
          next[nodeId] = previous[nodeId];
        }
      }
      return next;
    });
  }, [registry]);

  const filterState = useMemo(
    () => filterGeometryTree(registry, registry.rootIds, searchQuery),
    [registry, searchQuery]
  );
  const filteredRootIds = useMemo(
    () => registry.rootIds.filter((nodeId) => filterState.visibleIds.has(nodeId)),
    [filterState.visibleIds, registry.rootIds]
  );

  function setNodeVisibility(nodeId: string, visible: boolean) {
    const nodeIds = collectGeometrySubtreeIds(registry, nodeId);
    if (!nodeIds.length) return;
    setVisibilityState((previous) => ({
      ...previous,
      ...Object.fromEntries(nodeIds.map((entry) => [entry, visible]))
    }));
  }

  function toggleExpanded(nodeId: string) {
    setExpandedState((previous) => ({
      ...previous,
      [nodeId]: !previous[nodeId]
    }));
  }

  function expandAll() {
    setExpandedState(
      Object.fromEntries(
        Object.keys(registry.nodes).map((nodeId) => [nodeId, true])
      )
    );
  }

  function collapseAll() {
    setExpandedState(
      Object.fromEntries(
        Object.keys(registry.nodes).map((nodeId) => [nodeId, false])
      )
    );
  }

  return {
    collapseAll,
    expandedState,
    expandAll,
    filteredRootIds,
    searchQuery,
    setNodeVisibility,
    setSearchQuery,
    toggleExpanded,
    visibilityState,
    visibleNodeIds: filterState.visibleIds
  };
}
