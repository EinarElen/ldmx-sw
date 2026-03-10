import { Box3, Vector3, type Mesh, type Object3D } from 'three';
import type {
  DetectorSubsystemId,
  GeometryColorToken,
  GeometryNodeBounds,
  GeometryRegistryNode
} from '../../../types';
import {
  classifyBackHcal,
  classifySideHcal,
  type GeometryClassification
} from './geometryRegistryHcal';
import {
  describeTrackerLayer,
  extractTrailingIndex,
  formatIndexedVolume,
  formatVolumeLabel,
  normalizeGeometryName,
  normalizeRawGeometryName
} from './geometryRegistryNames';
import { subsystemToColorToken } from './geometryPalette';

type MutableNode = {
  bounds: Box3;
  childIds: Set<string>;
  defaultColorToken: GeometryColorToken;
  directObjectCount: number;
  id: string;
  kind: GeometryRegistryNode['kind'];
  label: string;
  objectUuids: Set<string>;
  parentId: string | null;
  path: string[];
  subsystem: DetectorSubsystemId;
};

const objectBounds = new Box3();
const boundsCenter = new Vector3();
const boundsSize = new Vector3();

/**
 * Classifies a raw renderable mesh into the semantic LDMX detector tree.
 */
export function classifyGeometryObject(
  object: Object3D
): GeometryClassification | null {
  const rawName = normalizeRawGeometryName(object.name);
  const normalized = normalizeGeometryName(object.name);
  if (!normalized || !rawName) return null;
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
      subsystem: 'tagger',
      path: ['Tagger', describeTrackerLayer('Tagger plane', normalized), 'Sensor volume']
    };
  }
  if (normalized === 'tagger_active_sensor') {
    return {
      subsystem: 'tagger',
      path: ['Tagger', 'Active silicon']
    };
  }

  const triggerPadMatch = normalized.match(/^trigger_pad([123])_bar_volume_/);
  if (triggerPadMatch) {
    const barIndex = extractTrailingIndex(normalized);
    return {
      subsystem: 'triggerPads',
      path: [
        'Trigger pads',
        `Pad ${triggerPadMatch[1]}`,
        barIndex == null ? 'Bars' : `Bar ${barIndex + 1}`
      ]
    };
  }

  if (normalized.startsWith('target')) {
    return {
      subsystem: 'target',
      path: ['Target', formatIndexedVolume('Target volume', normalized)]
    };
  }

  if (normalized.startsWith('recoil_l14_sensor_vol_')) {
    return {
      subsystem: 'recoilTracker',
      path: ['Recoil tracker', describeTrackerLayer('Layer', normalized), 'Sensor volume']
    };
  }
  if (normalized === 'recoil_l14_active_sensor') {
    return {
      subsystem: 'recoilTracker',
      path: ['Recoil tracker', 'Layers 1-4', 'Active silicon']
    };
  }
  if (normalized.startsWith('recoil_l56_sensor_vol_')) {
    return {
      subsystem: 'recoilTracker',
      path: ['Recoil tracker', describeTrackerLayer('Layer', normalized), 'Sensor volume']
    };
  }
  if (normalized === 'recoil_l56_active_sensor') {
    return {
      subsystem: 'recoilTracker',
      path: ['Recoil tracker', 'Layers 5-6', 'Active silicon']
    };
  }

  if (normalized.startsWith('back_hcal_')) {
    return classifyBackHcal(rawName, normalized);
  }

  if (normalized.startsWith('side_hcal_')) {
    return classifySideHcal(object, rawName, normalized);
  }

  if (normalized.startsWith('si_volume')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Silicon sensors', formatIndexedVolume('Sensor', normalized)]
    };
  }
  if (normalized.startsWith('pcb_volume')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'PCB', formatIndexedVolume('Board', normalized)]
    };
  }
  if (normalized.startsWith('glue_volume')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Glue layers', formatIndexedVolume('Glue', normalized)]
    };
  }
  if (normalized.startsWith('gluethick_volume')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Glue layers', formatIndexedVolume('Thick glue', normalized)]
    };
  }
  if (normalized.startsWith('carbonbaseplate_volume')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Carbon base plates', formatIndexedVolume('Base plate', normalized)]
    };
  }
  if (normalized.startsWith('c_volume_carboncoolingplane')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Cooling planes', formatIndexedVolume('Cooling plane', normalized)]
    };
  }
  if (normalized.startsWith('w_')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Tungsten absorbers', formatIndexedVolume('Absorber', normalized)]
    };
  }
  if (normalized.includes('strongback')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Strongback', formatIndexedVolume('Strongback', normalized)]
    };
  }
  if (normalized.includes('support_box')) {
    return {
      subsystem: 'ecal',
      path: ['ECAL', 'Support box']
    };
  }

  return {
    subsystem: 'support',
    path: ['Support', formatVolumeLabel(normalized)]
  };
}

/**
 * Determines whether a scene object is actual renderable detector geometry.
 */
export function isRenderableGeometryObject(
  object: Object3D
): object is Mesh {
  return 'material' in object && 'geometry' in object;
}

/**
 * Computes world-space bounds for a renderable geometry object.
 */
export function getObjectBounds(object: Mesh) {
  const geometry = object.geometry;
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  if (!geometry.boundingBox) {
    return null;
  }

  return objectBounds.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld).clone();
}

/**
 * Serializes Three box bounds into stable registry data.
 */
export function serializeBounds(bounds: Box3): GeometryNodeBounds {
  bounds.getCenter(boundsCenter);
  bounds.getSize(boundsSize);
  return {
    center: [boundsCenter.x, boundsCenter.y, boundsCenter.z],
    size: [boundsSize.x, boundsSize.y, boundsSize.z]
  };
}

/**
 * Default color token for a subsystem.
 */
export function geometrySubsystemColorToken(subsystem: DetectorSubsystemId) {
  return subsystemToColorToken(subsystem);
}

/**
 * Sorts semantic tree nodes in detector order rather than lexical order.
 */
export function compareNodeIds(nodes: Map<string, MutableNode>) {
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

  return (leftId: string, rightId: string) => {
    const left = nodes.get(leftId);
    const right = nodes.get(rightId);
    if (!left || !right) return leftId.localeCompare(rightId);

    const leftIndex = order.indexOf(left.label);
    const rightIndex = order.indexOf(right.label);

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? order.length : leftIndex) -
        (rightIndex === -1 ? order.length : rightIndex);
    }

    return left.label.localeCompare(right.label, undefined, { numeric: true });
  };
}

export type { GeometryClassification, MutableNode };
