import { Box3, Vector3, type Object3D } from 'three';
import type { GeometryClipPlane, GeometryRegistry } from '../../../../types';

type BoundsSummary = {
  center: [number, number, number];
  helperSize: number;
  thickness: number;
};

const DEFAULT_PLANE_COLORS = ['#61afef', '#98c379', '#d19a66', '#c678dd'];

/**
 * Summarizes detector bounds for clip-plane defaults and helper sizing.
 */
export function summarizeBounds(geometryRoot: Object3D | null): BoundsSummary {
  if (!geometryRoot) {
    return {
      center: [0, 0, 0],
      helperSize: 1600,
      thickness: 300
    };
  }

  const box = new Box3().setFromObject(geometryRoot);
  const center = new Vector3();
  const size = new Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z, 1);

  return {
    center: [center.x, center.y, center.z],
    helperSize: maxDimension * 0.9,
    thickness: maxDimension * 0.25
  };
}

/**
 * Default expansion state starts fully collapsed.
 */
export function createDefaultExpandedState(registry: GeometryRegistry) {
  return Object.fromEntries(
    Object.keys(registry.nodes).map((nodeId) => [nodeId, false])
  );
}

/**
 * Creates a new clip plane seeded from detector bounds.
 */
export function createClipPlane(
  index: number,
  bounds: BoundsSummary
): GeometryClipPlane {
  const color =
    DEFAULT_PLANE_COLORS[index % DEFAULT_PLANE_COLORS.length] ?? '#61afef';
  return {
    color,
    enabled: true,
    helperSize: bounds.helperSize,
    id: globalThis.crypto?.randomUUID?.() ?? `plane_${Date.now()}_${index}`,
    label: `Plane ${index + 1}`,
    mode: 'keepPositive',
    position: [...bounds.center],
    rotation: [0, 0, 0],
    thickness: bounds.thickness,
    visible: true
  };
}

/**
 * Reorders objects with stable ids.
 */
export function moveItem<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string
) {
  const sourceIndex = items.findIndex((item) => item.id === activeId);
  const targetIndex = items.findIndex((item) => item.id === overId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(sourceIndex, 1);
  if (!item) return items;
  next.splice(targetIndex, 0, item);
  return next;
}

export type { BoundsSummary };
