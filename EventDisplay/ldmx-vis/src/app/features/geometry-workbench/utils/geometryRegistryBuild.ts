import type { Box3, Object3D } from 'three';
import type {
  GeometryRegistry,
  GeometryRegistryNode
} from '../../../types';
import {
  classifyGeometryObject,
  compareNodeIds,
  geometrySubsystemColorToken,
  getObjectBounds,
  isRenderableGeometryObject,
  serializeBounds,
  type GeometryClassification,
  type MutableNode
} from './geometryRegistryClassification';

/**
 * Builds a stable, LDMX-specific geometry registry from the imported scene.
 * The registry collapses raw renderable objects into a semantic hierarchy
 * used by the tree view, proxy generation, and appearance operations.
 */
export function buildGeometryRegistry(root: Object3D): GeometryRegistry {
  const nodes = new Map<string, MutableNode>();
  const objectNodeIds: Record<string, string> = {};

  root.updateMatrixWorld(true);
  root.traverse((object: Object3D) => {
    if (!isRenderableGeometryObject(object)) return;
    const classification = classifyGeometryObject(object);
    if (!classification) return;
    const bounds = getObjectBounds(object);
    if (!bounds) return;
    insertGeometryPath(nodes, classification, object.uuid, bounds);
    objectNodeIds[object.uuid] = classification.path.join('/');
  });

  const finalizedNodes: Record<string, GeometryRegistryNode> = {};
  const rootIds = Array.from(nodes.values())
    .filter((node) => node.parentId == null)
    .map((node) => node.id)
    .sort(compareNodeIds(nodes));
  const nodeOrder: string[] = [];

  for (const rootId of rootIds) {
    finalizeNode(rootId, nodes, finalizedNodes, nodeOrder);
  }

  return {
    nodeOrder,
    nodes: finalizedNodes,
    objectNodeIds,
    rootIds
  };
}

function finalizeNode(
  nodeId: string,
  nodes: Map<string, MutableNode>,
  finalizedNodes: Record<string, GeometryRegistryNode>,
  nodeOrder: string[]
) {
  const node = nodes.get(nodeId);
  if (!node) return;

  const childIds = Array.from(node.childIds).sort(compareNodeIds(nodes));
  nodeOrder.push(nodeId);
  finalizedNodes[nodeId] = {
    bounds: serializeBounds(node.bounds),
    childIds,
    defaultColorToken: node.defaultColorToken,
    id: node.id,
    kind: node.kind,
    label: node.label,
    objectUuids: Array.from(node.objectUuids),
    parentId: node.parentId,
    path: node.path,
    stats: {
      childCount: childIds.length,
      directObjectCount: node.directObjectCount,
      leafObjectCount: node.objectUuids.size
    },
    subsystem: node.subsystem
  };

  childIds.forEach((childId) => finalizeNode(childId, nodes, finalizedNodes, nodeOrder));
}

function insertGeometryPath(
  nodes: Map<string, MutableNode>,
  classification: GeometryClassification,
  objectUuid: string,
  bounds: Box3
) {
  let parentId: string | null = null;

  classification.path.forEach((label, index) => {
    const path = classification.path.slice(0, index + 1);
    const id = path.join('/');
    const existingNode = nodes.get(id);
    if (!existingNode) {
      const createdNode: MutableNode = {
        bounds: bounds.clone(),
        childIds: new Set<string>(),
        defaultColorToken: geometrySubsystemColorToken(classification.subsystem),
        directObjectCount: 0,
        id,
        kind: inferNodeKind(index, classification.path.length),
        label,
        objectUuids: new Set<string>(),
        parentId,
        path,
        subsystem: classification.subsystem
      };
      nodes.set(id, createdNode);
    } else {
      existingNode.bounds.union(bounds);
    }

    const node = nodes.get(id);
    if (!node) return;

    node.objectUuids.add(objectUuid);
    if (index === classification.path.length - 1) {
      node.directObjectCount += 1;
    }

    if (parentId) {
      nodes.get(parentId)?.childIds.add(id);
    }

    parentId = id;
  });
}

function inferNodeKind(
  depth: number,
  pathLength: number
): GeometryRegistryNode['kind'] {
  if (depth === 0) return 'subsystem';
  if (depth === pathLength - 1) return 'leaf';
  if (depth === 1) return 'family';
  if (depth === 2) return 'layer';
  return 'component';
}
