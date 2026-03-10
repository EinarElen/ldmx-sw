import { Vector3, type Object3D } from 'three';
import type { DetectorSubsystemId } from '../../../types';
import { formatVolumeLabel } from './geometryRegistryNames';

export type GeometryClassification = {
  path: string[];
  subsystem: DetectorSubsystemId;
};

const worldPosition = new Vector3();

export function classifyBackHcal(
  rawName: string,
  normalized: string
): GeometryClassification {
  const copyIndex = extractCopyIndex(rawName);

  if (normalized.startsWith('back_hcal_absophysvol')) {
    const layer = Math.floor(copyIndex / 2) + 1;
    const slab = (copyIndex % 2) + 1;
    return {
      subsystem: 'hcal',
      path: [
        'HCAL',
        'Back',
        describeBackLayerGroup(layer),
        `Layer ${layer}`,
        'Absorbers',
        `Slab ${slab}`
      ]
    };
  }

  if (
    normalized.startsWith('back_hcal_scintxphysvol') ||
    normalized.startsWith('back_hcal_scintyphysvol')
  ) {
    const layer = Math.floor(copyIndex / 40) + 1;
    const bar = (copyIndex % 40) + 1;
    const quadbarStart = Math.floor((bar - 1) / 4) * 4 + 1;
    const quadbarEnd = quadbarStart + 3;
    return {
      subsystem: 'hcal',
      path: [
        'HCAL',
        'Back',
        describeBackLayerGroup(layer),
        `Layer ${layer}`,
        normalized.startsWith('back_hcal_scintxphysvol')
          ? 'Scintillator X'
          : 'Scintillator Y',
        `Quadbars ${quadbarStart}-${quadbarEnd}`,
        `Bar ${bar}`
      ]
    };
  }

  return {
    subsystem: 'hcal',
    path: ['HCAL', 'Back', formatVolumeLabel(normalized.replace(/^back_hcal_/, ''))]
  };
}

export function classifySideHcal(
  object: Object3D,
  rawName: string,
  normalized: string
): GeometryClassification {
  const numeric = extractSideHcalNumbers(normalized);
  const sectionIndex = numeric[0];
  const direction = describeSideHcalDirection(sectionIndex, object);
  const layerGroup = numeric[1];
  const pieceIndex = numeric[2];
  const isScintillatorFamily =
    normalized.includes('scintx') ||
    normalized.includes('scinty') ||
    normalized.includes('scintzx') ||
    normalized.includes('scintzy');
  const path = ['HCAL', direction];

  if (layerGroup != null) {
    path.push(`Layer group ${layerGroup}`);
  }
  path.push(describeSideHcalFamily(normalized));

  if (pieceIndex != null && isScintillatorFamily) {
    const quadbarStart = Math.floor((pieceIndex - 1) / 4) * 4 + 1;
    const quadbarEnd = Math.min(
      quadbarStart + 3,
      maxSideBarForFamily(normalized)
    );
    path.push(`Quadbars ${quadbarStart}-${quadbarEnd}`);
    path.push(`Bar ${pieceIndex}`);
  } else if (pieceIndex != null) {
    path.push(`Piece ${pieceIndex}`);
  } else if (rawName.includes('#')) {
    path.push(`Piece ${extractCopyIndex(rawName) + 1}`);
  }

  return {
    subsystem: 'hcal',
    path
  };
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

function extractCopyIndex(rawName: string) {
  const match = rawName.match(/#(\d+)$/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) + 1;
}

function extractSideHcalNumbers(normalized: string) {
  const familyMatch = normalized.match(
    /^side_hcal_[a-z0-9]+(?:_(\d+))?(?:_(\d+))?(?:_(\d+))?(?:_(\d+))?_physvol$/
  );
  if (!familyMatch) {
    return [] as number[];
  }
  return familyMatch.slice(1).flatMap((entry) =>
    entry == null ? [] : [Number(entry)]
  );
}

function maxSideBarForFamily(normalized: string) {
  if (normalized.includes('scintzx') || normalized.includes('scintzy')) {
    return 24;
  }
  return 12;
}

function describeBackLayerGroup(layer: number) {
  const start = Math.floor((layer - 1) / 8) * 8 + 1;
  const end = Math.min(start + 7, 49);
  return `Layers ${start}-${end}`;
}

function describeSideHcalDirection(
  sectionIndex: number | undefined,
  object: Object3D
) {
  switch (sectionIndex) {
    case 1:
      return 'Top';
    case 2:
      return 'Bottom';
    case 3:
      return 'Right';
    case 4:
      return 'Left';
    default:
      break;
  }

  object.getWorldPosition(worldPosition);

  if (Math.abs(worldPosition.y) >= Math.abs(worldPosition.x)) {
    return worldPosition.y >= 0 ? 'Top' : 'Bottom';
  }

  return worldPosition.x >= 0 ? 'Right' : 'Left';
}
