import { useMemo, useState } from 'react';
import type {
  GeometryAppearanceOverride,
  GeometryClipPlane,
  GeometryGroup,
  GeometryRegistry,
  GeometrySelectionTarget
} from '../../../types';

type GeometrySelectionArgs = {
  clipPlanes: GeometryClipPlane[];
  groups: Record<string, GeometryGroup>;
  nodeOverrides: Record<string, GeometryAppearanceOverride>;
  registry: GeometryRegistry;
};

export function useGeometrySelection({
  clipPlanes,
  groups,
  nodeOverrides,
  registry
}: GeometrySelectionArgs) {
  const [selectedTarget, setSelectedTarget] =
    useState<GeometrySelectionTarget | null>(null);

  const selectedNode = useMemo(() => {
    if (selectedTarget?.type !== 'node') return null;
    return registry.nodes[selectedTarget.id] ?? null;
  }, [registry, selectedTarget]);

  const selectedGroup = useMemo(() => {
    if (selectedTarget?.type !== 'group') return null;
    return groups[selectedTarget.id] ?? null;
  }, [groups, selectedTarget]);

  const selectedPlane = useMemo(() => {
    if (selectedTarget?.type !== 'plane') return null;
    return clipPlanes.find((plane) => plane.id === selectedTarget.id) ?? null;
  }, [clipPlanes, selectedTarget]);

  const selectedNodeOverride = useMemo(() => {
    if (selectedTarget?.type !== 'node') return null;
    return nodeOverrides[selectedTarget.id] ?? null;
  }, [nodeOverrides, selectedTarget]);

  return {
    selectedGroup,
    selectedNode,
    selectedNodeOverride,
    selectedPlane,
    selectedTarget,
    setSelectedTarget
  };
}
