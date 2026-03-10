import {
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type Mesh,
  type Plane
} from 'three';

type EdgeStyle = {
  clippingPlanes: Plane[];
  color: string;
  opacity: number;
  visible: boolean;
};

const EDGE_CHILD_NAME = '__ldmx_geometry_edges__';

export function applyGeometryEdges(mesh: Mesh, style: EdgeStyle) {
  const edges = ensureGeometryEdges(mesh);
  edges.visible = style.visible;
  if (!style.visible) {
    return;
  }

  const material = edges.material as LineBasicMaterial & {
    clippingPlanes?: Plane[];
  };
  material.color.set(style.color);
  material.opacity = style.opacity;
  material.transparent = style.opacity < 0.999;
  material.depthWrite = false;
  material.clippingPlanes = style.clippingPlanes;
  material.needsUpdate = true;
}

function ensureGeometryEdges(mesh: Mesh) {
  const existing = mesh.getObjectByName(EDGE_CHILD_NAME) as LineSegments | null;
  if (existing) {
    return existing;
  }

  const geometry = new EdgesGeometry(mesh.geometry);
  const material = new LineBasicMaterial({
    color: '#c8ccd4',
    depthWrite: false,
    opacity: 0.72,
    transparent: true
  });
  const edges = new LineSegments(geometry, material);
  edges.name = EDGE_CHILD_NAME;
  edges.renderOrder = 8;
  mesh.add(edges);
  return edges;
}
