import {
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Object3D
} from 'three';
import type { GeometryClipPlane } from '../../../types';

const HELPERS_ROOT = '__ldmx_geometry_helpers__';
const HELPER_PREFIX = '__ldmx_geometry_plane__';

export function syncSlicePlaneHelpers(
  sceneRoot: Object3D,
  planes: GeometryClipPlane[],
  selectedPlaneId: string | null
) {
  const helpersRoot = ensureHelpersRoot(sceneRoot);
  const activeIds = new Set(planes.map((plane) => plane.id));

  for (const child of [...helpersRoot.children]) {
    const planeId = child.userData.planeId as string | undefined;
    if (!planeId || activeIds.has(planeId)) continue;
    helpersRoot.remove(child);
  }

  planes.forEach((plane, index) => {
    const helper = ensurePlaneHelper(helpersRoot, plane.id);
    updatePlaneHelper(helper, plane, plane.id === selectedPlaneId, index);
  });
}

export function getSlicePlaneHelper(
  sceneRoot: Object3D,
  planeId: string
) {
  const helpersRoot = sceneRoot.getObjectByName(HELPERS_ROOT);
  if (!helpersRoot) return null;
  return helpersRoot.getObjectByName(`${HELPER_PREFIX}:${planeId}`) ?? null;
}

function ensureHelpersRoot(sceneRoot: Object3D) {
  const existing = sceneRoot.getObjectByName(HELPERS_ROOT) as Group | null;
  if (existing) {
    return existing;
  }

  const helpersRoot = new Group();
  helpersRoot.name = HELPERS_ROOT;
  sceneRoot.add(helpersRoot);
  return helpersRoot;
}

function ensurePlaneHelper(helpersRoot: Group, planeId: string) {
  const existing = helpersRoot.getObjectByName(
    `${HELPER_PREFIX}:${planeId}`
  ) as Group | null;
  if (existing) {
    return existing;
  }

  const helper = new Group();
  helper.name = `${HELPER_PREFIX}:${planeId}`;
  helper.userData.planeId = planeId;

  const fill = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      color: '#61afef',
      depthWrite: false,
      opacity: 0.03,
      side: DoubleSide,
      transparent: true
    })
  );
  fill.name = 'plane-fill';

  const edges = new LineSegments(
    new EdgesGeometry(new PlaneGeometry(1, 1)),
    new LineBasicMaterial({
      color: '#61afef',
      depthWrite: false,
      opacity: 0.5,
      transparent: true
    })
  );
  edges.name = 'plane-edge';

  helper.add(fill);
  helper.add(edges);
  helpersRoot.add(helper);
  return helper;
}

function updatePlaneHelper(
  helper: Group,
  plane: GeometryClipPlane,
  selected: boolean,
  index: number
) {
  helper.visible = plane.visible;
  helper.position.set(...plane.position);
  helper.rotation.set(...plane.rotation);
  helper.scale.set(plane.helperSize, plane.helperSize, 1);
  helper.renderOrder = 40 + index;

  const fill = helper.getObjectByName('plane-fill') as Mesh | null;
  const edge = helper.getObjectByName('plane-edge') as LineSegments | null;
  if (!fill || !edge) return;

  const fillMaterial = fill.material as MeshBasicMaterial;
  fillMaterial.color.set(plane.color);
  fillMaterial.opacity = plane.visible
    ? plane.enabled
    ? selected
      ? 0.025
      : 0
    : 0
    : 0;
  fillMaterial.needsUpdate = true;

  const edgeMaterial = edge.material as LineBasicMaterial;
  edgeMaterial.color.set(selected ? '#61afef' : plane.color);
  edgeMaterial.opacity = plane.visible
    ? plane.enabled
    ? selected
      ? 0.82
      : 0.22
    : 0.08
    : 0;
  edgeMaterial.needsUpdate = true;
}
