import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type Object3D,
  type Plane
} from 'three';
import type { GeometryProxyFragment } from './proxyFragments';

type ProxyConfig = {
  clippingPlanes: Plane[];
  color: string;
  fragments: GeometryProxyFragment[];
  nodeId: string;
  opacity: number;
  visible: boolean;
};

const PROXY_ROOT = '__ldmx_geometry_proxies__';
const PROXY_PREFIX = '__ldmx_geometry_proxy__';
const proxyScale = new Vector3();
const proxyPosition = new Vector3();
const proxyMatrix = new Matrix4();

/**
 * Synchronizes the scene-side helper geometry used to represent simplified
 * HCAL structure when dense bars are intentionally suppressed.
 */
export function syncGeometryProxies(
  sceneRoot: Object3D,
  proxies: ProxyConfig[]
) {
  const proxiesRoot = ensureProxiesRoot(sceneRoot);
  const activeIds = new Set(proxies.map((proxy) => proxy.nodeId));

  for (const child of [...proxiesRoot.children]) {
    const nodeId = child.userData.nodeId as string | undefined;
    if (!nodeId || activeIds.has(nodeId)) {
      continue;
    }
    proxiesRoot.remove(child);
  }

  proxies.forEach((proxy) => {
    const helper = ensureProxyHelper(proxiesRoot, proxy.nodeId);
    updateProxyHelper(helper, proxy);
  });
}

function ensureProxiesRoot(sceneRoot: Object3D) {
  const existing = sceneRoot.getObjectByName(PROXY_ROOT) as Group | null;
  if (existing) {
    return existing;
  }

  const root = new Group();
  root.name = PROXY_ROOT;
  sceneRoot.add(root);
  return root;
}

function ensureProxyHelper(root: Group, nodeId: string) {
  const existing = root.getObjectByName(`${PROXY_PREFIX}:${nodeId}`) as
    | Group
    | null;
  if (existing) {
    return existing;
  }

  const helper = new Group();
  helper.name = `${PROXY_PREFIX}:${nodeId}`;
  helper.userData.nodeId = nodeId;
  root.add(helper);
  return helper;
}

function updateProxyHelper(helper: Group, proxy: ProxyConfig) {
  helper.visible = proxy.visible;
  if (!proxy.visible) {
    return;
  }

  syncProxyFragments(helper, proxy);
}

function syncProxyFragments(helper: Group, proxy: ProxyConfig) {
  const activeNames = new Set(
    proxy.fragments.map((_, index) => `proxy-fragment:${index}`)
  );

  for (const child of [...helper.children]) {
    if (!activeNames.has(child.name)) {
      helper.remove(child);
    }
  }

  proxy.fragments.forEach((fragment, index) => {
    const group = ensureProxyFragment(helper, index);
    updateProxyFragment(group, fragment, proxy);
  });
}

function ensureProxyFragment(helper: Group, index: number) {
  const name = `proxy-fragment:${index}`;
  const existing = helper.getObjectByName(name) as Group | null;
  if (existing) {
    return existing;
  }

  const group = new Group();
  group.name = name;

  const fill = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial({
      color: '#c8ccd4',
      depthWrite: false,
      opacity: 0.02,
      transparent: true
    })
  );
  fill.name = 'proxy-fill';
  fill.renderOrder = 9;

  const edges = new LineSegments(
    new EdgesGeometry(new BoxGeometry(1, 1, 1)),
    new LineBasicMaterial({
      color: '#c8ccd4',
      depthWrite: false,
      opacity: 0.36,
      transparent: true
    })
  );
  edges.name = 'proxy-edge';
  edges.renderOrder = 10;

  group.add(fill);
  group.add(edges);
  helper.add(group);
  return group;
}

function updateProxyFragment(
  group: Group,
  fragment: GeometryProxyFragment,
  proxy: ProxyConfig
) {
  proxyScale.set(
    Math.max(fragment.size[0], 1e-3),
    Math.max(fragment.size[1], 1e-3),
    Math.max(fragment.size[2], 1e-3)
  );
  proxyPosition.set(...fragment.center);
  proxyMatrix.compose(proxyPosition, group.quaternion.identity(), proxyScale);
  group.matrixAutoUpdate = false;
  group.matrix.copy(proxyMatrix);
  group.matrixWorldNeedsUpdate = true;

  const fill = group.getObjectByName('proxy-fill') as Mesh | null;
  const edge = group.getObjectByName('proxy-edge') as LineSegments | null;
  if (!fill || !edge) {
    return;
  }

  const fillMaterial = fill.material as MeshBasicMaterial & {
    clippingPlanes?: Plane[];
  };
  fillMaterial.color.set(proxy.color);
  fillMaterial.opacity = Math.min(0.03, proxy.opacity * 0.08);
  fillMaterial.transparent = fillMaterial.opacity < 0.999;
  fillMaterial.clippingPlanes = proxy.clippingPlanes;
  fillMaterial.needsUpdate = true;

  const edgeMaterial = edge.material as LineBasicMaterial & {
    clippingPlanes?: Plane[];
  };
  edgeMaterial.color.set(proxy.color);
  edgeMaterial.opacity = proxy.opacity;
  edgeMaterial.transparent = proxy.opacity < 0.999;
  edgeMaterial.clippingPlanes = proxy.clippingPlanes;
  edgeMaterial.needsUpdate = true;
}
