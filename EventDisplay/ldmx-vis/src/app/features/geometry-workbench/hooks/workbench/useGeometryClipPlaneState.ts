import { useState } from 'react';
import type { GeometryClipPlane } from '../../../../types';
import { createClipPlane, type BoundsSummary, moveItem } from './shared';

/**
 * Owns geometry-only clip planes and their viewport/editor updates.
 */
export function useGeometryClipPlaneState(bounds: BoundsSummary) {
  const [clipPlanes, setClipPlanes] = useState<GeometryClipPlane[]>([]);

  function addClipPlane() {
    const plane = createClipPlane(clipPlanes.length, bounds);
    setClipPlanes((previous) => [...previous, plane]);
    return plane;
  }

  function updateClipPlane(
    planeId: string,
    patch: Partial<GeometryClipPlane>
  ) {
    setClipPlanes((previous) =>
      previous.map((plane) =>
        plane.id === planeId
          ? {
              ...plane,
              ...patch
            }
          : plane
      )
    );
  }

  function updatePlaneTransform(
    planeId: string,
    patch: Pick<GeometryClipPlane, 'position' | 'rotation'>
  ) {
    setClipPlanes((previous) =>
      previous.map((plane) =>
        plane.id === planeId
          ? {
              ...plane,
              position: patch.position,
              rotation: patch.rotation
            }
          : plane
      )
    );
  }

  function movePlaneToIndex(activeId: string, overId: string) {
    setClipPlanes((previous) => moveItem(previous, activeId, overId));
  }

  function removeClipPlane(planeId: string) {
    setClipPlanes((previous) => previous.filter((plane) => plane.id !== planeId));
  }

  return {
    addClipPlane,
    clipPlanes,
    movePlaneToIndex,
    removeClipPlane,
    setClipPlanes,
    updateClipPlane,
    updatePlaneTransform
  };
}
