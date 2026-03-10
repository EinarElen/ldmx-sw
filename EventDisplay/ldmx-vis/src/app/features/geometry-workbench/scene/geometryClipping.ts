import { Euler, Plane, Vector3 } from 'three';
import type { GeometryClipPlane } from '../../../types';

const DEFAULT_NORMAL = new Vector3(0, 0, 1);

export function buildGeometryClipPlanes(planes: GeometryClipPlane[]) {
  return planes
    .filter((plane) => plane.enabled)
    .map((plane) => buildThreePlane(plane));
}

export function buildThreePlane(plane: GeometryClipPlane) {
  const normal = getPlaneNormal(plane);
  const point = new Vector3(...plane.position);
  return new Plane().setFromNormalAndCoplanarPoint(normal, point);
}

export function getPlaneNormal(plane: GeometryClipPlane) {
  const normal = DEFAULT_NORMAL.clone().applyEuler(
    new Euler(...plane.rotation, 'XYZ')
  );

  if (plane.mode === 'keepNegative' || plane.mode === 'slabEnd') {
    normal.multiplyScalar(-1);
  }

  return normal.normalize();
}
