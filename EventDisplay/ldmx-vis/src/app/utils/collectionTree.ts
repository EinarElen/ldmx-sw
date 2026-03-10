import type { CollectionTreeNode, EventCollectionSummary } from '../types';

type MutableCollectionTreeNode = {
  id: string;
  label: string;
  collectionCount: number;
  itemCount: number;
  collectionNames: Set<string>;
  children: Map<string, MutableCollectionTreeNode>;
};

export function buildCollectionTree(
  collections: EventCollectionSummary[]
): CollectionTreeNode[] {
  const roots = new Map<string, MutableCollectionTreeNode>();

  for (const collection of collections) {
    insertCollectionPath(roots, collection);
  }

  return Array.from(roots.values())
    .map(finalizeCollectionNode)
    .sort(compareCollectionNodes);
}

export function createCollectionVisibilityState(
  tree: CollectionTreeNode[]
): Record<string, boolean> {
  const state: Record<string, boolean> = {};

  walkCollectionTree(tree, (node) => {
    state[node.id] = !node.collectionNames.every(isRecHitCollection);
  });

  return state;
}

export function resolveCollectionVisibility(
  tree: CollectionTreeNode[],
  visibilityState: Record<string, boolean>
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  const visit = (node: CollectionTreeNode, ancestorsVisible: boolean) => {
    const visible = ancestorsVisible && (visibilityState[node.id] ?? true);
    for (const name of node.collectionNames) {
      result[name] = visible;
    }
    for (const child of node.children) {
      visit(child, visible);
    }
  };

  for (const node of tree) {
    visit(node, true);
  }

  return result;
}

export function collectCollectionNodeSubtreeIds(
  tree: CollectionTreeNode[],
  targetId: string
): string[] {
  const target = findCollectionNode(tree, targetId);
  if (!target) return [];

  const ids: string[] = [];
  walkCollectionTree([target], (node) => {
    ids.push(node.id);
  });
  return ids;
}

function insertCollectionPath(
  roots: Map<string, MutableCollectionTreeNode>,
  collection: EventCollectionSummary
) {
  let currentLevel = roots;
  let currentPath = '';

  for (const label of collection.path) {
    currentPath = currentPath ? `${currentPath}/${label}` : label;
    let node = currentLevel.get(label);
    if (!node) {
      node = {
        id: currentPath,
        label,
        collectionCount: 0,
        itemCount: 0,
        collectionNames: new Set<string>(),
        children: new Map<string, MutableCollectionTreeNode>()
      };
      currentLevel.set(label, node);
    }

    node.collectionCount += 1;
    node.itemCount += collection.size;
    node.collectionNames.add(collection.name);
    currentLevel = node.children;
  }
}

function finalizeCollectionNode(node: MutableCollectionTreeNode): CollectionTreeNode {
  return {
    id: node.id,
    label: node.label,
    collectionCount: node.collectionCount,
    itemCount: node.itemCount,
    collectionNames: Array.from(node.collectionNames),
    children: Array.from(node.children.values())
      .map(finalizeCollectionNode)
      .sort(compareCollectionNodes)
  };
}

function walkCollectionTree(
  tree: CollectionTreeNode[],
  visit: (node: CollectionTreeNode) => void
) {
  for (const node of tree) {
    visit(node);
    walkCollectionTree(node.children, visit);
  }
}

function findCollectionNode(
  tree: CollectionTreeNode[],
  targetId: string
): CollectionTreeNode | null {
  for (const node of tree) {
    if (node.id === targetId) return node;
    const child = findCollectionNode(node.children, targetId);
    if (child) return child;
  }
  return null;
}

function compareCollectionNodes(left: CollectionTreeNode, right: CollectionTreeNode) {
  const order = [
    'Truth',
    'Scoring planes',
    'ECAL veto',
    'Target',
    'Tagger',
    'Trigger pads',
    'Recoil tracker',
    'ECAL',
    'HCAL',
    'HCAL veto',
    'Analysis'
  ];
  const leftIndex = order.indexOf(left.label);
  const rightIndex = order.indexOf(right.label);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? order.length : leftIndex) -
      (rightIndex === -1 ? order.length : rightIndex);
  }

  if (right.collectionCount !== left.collectionCount) {
    return right.collectionCount - left.collectionCount;
  }

  return left.label.localeCompare(right.label);
}

function isRecHitCollection(name: string) {
  return /^ecal_rec_hits$/i.test(name) || /^hcal_rec_/i.test(name);
}
