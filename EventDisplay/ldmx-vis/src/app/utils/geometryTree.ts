import { Vector3, type Object3D } from 'three';
import type { GeometryTreeNode } from '../types';

type MutableGeometryTreeNode = {
  id: string;
  label: string;
  objectUuids: Set<string>;
  children: Map<string, MutableGeometryTreeNode>;
};

const worldPosition = new Vector3();

export function buildGeometryTree(root: Object3D): GeometryTreeNode[] {
  const roots = new Map<string, MutableGeometryTreeNode>();

  root.updateMatrixWorld(true);
  root.traverse((object: Object3D) => {
    const entry = classifyGeometryObject(object);
    if (!entry) return;
    insertGeometryPath(roots, entry.path, object.uuid);
  });

  return Array.from(roots.values())
    .map(finalizeGeometryNode)
    .sort(compareGeometryNodes);
}

export function createGeometryVisibilityState(
  tree: GeometryTreeNode[]
): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  walkGeometryTree(tree, (node) => {
    state[node.id] = true;
  });
  return state;
}

export function resolveGeometryObjectVisibility(
  tree: GeometryTreeNode[],
  visibilityState: Record<string, boolean>
): Record<string, boolean> {
  const objectVisibility: Record<string, boolean> = {};

  const visit = (node: GeometryTreeNode, ancestorsVisible: boolean) => {
    const visible = ancestorsVisible && (visibilityState[node.id] ?? true);
    for (const uuid of node.objectUuids) {
      objectVisibility[uuid] = visible;
    }
    for (const child of node.children) {
      visit(child, visible);
    }
  };

  for (const node of tree) {
    visit(node, true);
  }

  return objectVisibility;
}

export function collectGeometryNodeSubtreeIds(
  tree: GeometryTreeNode[],
  targetId: string
): string[] {
  const target = findGeometryNode(tree, targetId);
  if (!target) return [];

  const ids: string[] = [];
  walkGeometryTree([target], (node) => {
    ids.push(node.id);
  });

  return ids;
}

export function walkGeometryTree(
  tree: GeometryTreeNode[],
  visit: (node: GeometryTreeNode) => void
) {
  for (const node of tree) {
    visit(node);
    walkGeometryTree(node.children, visit);
  }
}

function classifyGeometryObject(object: Object3D): { path: string[] } | null {
  const normalized = normalizeGeometryName(object.name);
  if (!normalized) return null;
  if (
    normalized === 'ldmx_detector' ||
    normalized === 'detector' ||
    normalized === 'scene' ||
    normalized === 'geometry' ||
    normalized === 'infrastructure' ||
    normalized === '__ldmx_geometry_root__'
  ) {
    return null;
  }

  if (normalized.startsWith('tagger_sensor_vol_')) {
    return {
      path: ['Tagger', describeTrackerLayer('Tagger plane', normalized), 'Sensor volume']
    };
  }
  if (normalized === 'tagger_active_sensor') {
    return { path: ['Tagger', 'Active silicon'] };
  }

  const triggerPadMatch = normalized.match(/^trigger_pad([123])_bar_volume_/);
  if (triggerPadMatch) {
    const barIndex = extractTrailingIndex(normalized);
    return {
      path: [
        'Trigger pads',
        `Pad ${triggerPadMatch[1]}`,
        barIndex == null ? 'Bars' : `Bar ${barIndex + 1}`
      ]
    };
  }

  if (normalized.startsWith('target')) {
    return { path: ['Target', formatIndexedVolume('Target volume', normalized)] };
  }

  if (normalized.startsWith('recoil_l14_sensor_vol_')) {
    return {
      path: [
        'Recoil tracker',
        describeTrackerLayer('Layer', normalized),
        'Sensor volume'
      ]
    };
  }
  if (normalized === 'recoil_l14_active_sensor') {
    return { path: ['Recoil tracker', 'Layers 1-4', 'Active silicon'] };
  }
  if (normalized.startsWith('recoil_l56_sensor_vol_')) {
    return {
      path: [
        'Recoil tracker',
        describeTrackerLayer('Layer', normalized),
        'Sensor volume'
      ]
    };
  }
  if (normalized === 'recoil_l56_active_sensor') {
    return { path: ['Recoil tracker', 'Layers 5-6', 'Active silicon'] };
  }

  if (normalized.startsWith('back_hcal_')) {
    return {
      path: [
        'HCAL',
        'Back',
        describeBackHcalFamily(normalized),
        describeBackHcalSlice(normalized)
      ]
    };
  }

  if (normalized.startsWith('side_hcal_')) {
    return {
      path: [
        'HCAL',
        describeSideHcalDirection(object),
        describeSideHcalFamily(normalized),
        describeSideHcalSlice(normalized)
      ]
    };
  }

  if (normalized.startsWith('si_volume')) {
    return { path: ['ECAL', 'Silicon sensors', formatIndexedVolume('Sensor', normalized)] };
  }
  if (normalized.startsWith('pcb_volume')) {
    return { path: ['ECAL', 'PCB', formatIndexedVolume('Board', normalized)] };
  }
  if (normalized.startsWith('glue_volume')) {
    return { path: ['ECAL', 'Glue layers', formatIndexedVolume('Glue', normalized)] };
  }
  if (normalized.startsWith('gluethick_volume')) {
    return {
      path: ['ECAL', 'Glue layers', formatIndexedVolume('Thick glue', normalized)]
    };
  }
  if (normalized.startsWith('carbonbaseplate_volume')) {
    return {
      path: ['ECAL', 'Carbon base plates', formatIndexedVolume('Base plate', normalized)]
    };
  }
  if (normalized.startsWith('c_volume_carboncoolingplane')) {
    return {
      path: ['ECAL', 'Cooling planes', formatIndexedVolume('Cooling plane', normalized)]
    };
  }
  if (normalized.startsWith('w_')) {
    return {
      path: ['ECAL', 'Tungsten absorbers', formatIndexedVolume('Absorber', normalized)]
    };
  }
  if (normalized.includes('strongback')) {
    return { path: ['ECAL', 'Strongback', formatIndexedVolume('Strongback', normalized)] };
  }
  if (normalized.includes('support_box')) {
    return { path: ['ECAL', 'Support box'] };
  }

  return { path: ['Support', formatVolumeLabel(normalized)] };
}

function insertGeometryPath(
  roots: Map<string, MutableGeometryTreeNode>,
  path: string[],
  objectUuid: string
) {
  let currentLevel = roots;
  let currentPath = '';

  for (const label of path) {
    currentPath = currentPath ? `${currentPath}/${label}` : label;
    let node = currentLevel.get(label);
    if (!node) {
      node = {
        id: currentPath,
        label,
        objectUuids: new Set<string>(),
        children: new Map<string, MutableGeometryTreeNode>()
      };
      currentLevel.set(label, node);
    }

    node.objectUuids.add(objectUuid);
    currentLevel = node.children;
  }
}

function finalizeGeometryNode(node: MutableGeometryTreeNode): GeometryTreeNode {
  return {
    id: node.id,
    label: node.label,
    objectUuids: Array.from(node.objectUuids),
    children: Array.from(node.children.values())
      .map(finalizeGeometryNode)
      .sort(compareGeometryNodes)
  };
}

function findGeometryNode(
  tree: GeometryTreeNode[],
  targetId: string
): GeometryTreeNode | null {
  for (const node of tree) {
    if (node.id === targetId) return node;
    const child = findGeometryNode(node.children, targetId);
    if (child) return child;
  }

  return null;
}

function describeBackHcalFamily(normalized: string) {
  if (normalized.startsWith('back_hcal_abso')) return 'Absorbers';
  if (normalized.startsWith('back_hcal_scintx')) return 'Scintillator X';
  if (normalized.startsWith('back_hcal_scinty')) return 'Scintillator Y';
  return formatVolumeLabel(normalized.replace(/^back_hcal_/, ''));
}

function describeBackHcalSlice(normalized: string) {
  const index = extractTrailingIndex(normalized);
  return index == null ? 'Volumes' : `Slice ${index + 1}`;
}

function describeSideHcalFamily(normalized: string) {
  if (normalized.includes('absox1')) return 'Absorber X1';
  if (normalized.includes('absox2')) return 'Absorber X2';
  if (normalized.includes('absoy1')) return 'Absorber Y1';
  if (normalized.includes('absoy2')) return 'Absorber Y2';
  if (normalized.includes('scintzx')) return 'Scintillator ZX';
  if (normalized.includes('scintzy')) return 'Scintillator ZY';
  if (normalized.includes('scintx')) return 'Scintillator X';
  if (normalized.includes('scinty')) return 'Scintillator Y';
  return formatVolumeLabel(normalized.replace(/^side_hcal_/, ''));
}

function describeSideHcalSlice(normalized: string) {
  const parts = normalized.split('_');
  const numeric = parts.filter((part) => /^\d+$/.test(part)).map(Number);
  if (!numeric.length) return 'Volumes';
  return numeric.map((value, index) => (index === 0 ? `Module ${value}` : `${value}`)).join(' / ');
}

function describeSideHcalDirection(object: Object3D) {
  object.getWorldPosition(worldPosition);

  if (Math.abs(worldPosition.y) >= Math.abs(worldPosition.x)) {
    return worldPosition.y >= 0 ? 'Top' : 'Bottom';
  }

  return worldPosition.x >= 0 ? 'Right' : 'Left';
}

function normalizeGeometryName(name: string) {
  return name
    .toLowerCase()
    .replace(/#\d+$/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

function formatVolumeLabel(name: string) {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\bphysvol\b/g, '')
    .replace(/\bvol\b/g, '')
    .replace(/\bpv\b/g, '')
    .replace(/\bimpr\b/g, '')
    .replace(/\bassembly\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatIndexedVolume(prefix: string, normalized: string) {
  const index = extractTrailingIndex(normalized);
  return index == null ? prefix : `${prefix} ${index + 1}`;
}

function describeTrackerLayer(prefix: string, normalized: string) {
  const index = extractTrailingIndex(normalized);
  return index == null ? prefix : `${prefix} ${index / 10}`;
}

function extractTrailingIndex(normalized: string) {
  const match = normalized.match(/_(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}

function compareGeometryNodes(left: GeometryTreeNode, right: GeometryTreeNode) {
  const order = [
    'Tagger',
    'Target',
    'Trigger pads',
    'Recoil tracker',
    'ECAL',
    'HCAL',
    'Support',
    'Back',
    'Top',
    'Bottom',
    'Left',
    'Right'
  ];
  const leftIndex = order.indexOf(left.label);
  const rightIndex = order.indexOf(right.label);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? order.length : leftIndex) -
      (rightIndex === -1 ? order.length : rightIndex);
  }

  return left.label.localeCompare(right.label);
}
