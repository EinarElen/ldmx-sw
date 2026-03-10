import type {
  DetectorSubsystemId,
  GeometryAppearanceOverride,
  GeometryColorToken,
  GeometryRenderMode
} from '../../../types';

type PaletteEntry = {
  edge: string;
  opacity: number;
  tint: string;
};

const PALETTE: Record<GeometryColorToken, PaletteEntry> = {
  tagger: {
    tint: '#44505e',
    edge: '#8ea6c0',
    opacity: 0.03
  },
  target: {
    tint: '#555d67',
    edge: '#a2aab5',
    opacity: 0.045
  },
  triggerPads: {
    tint: '#41535b',
    edge: '#7f9aa6',
    opacity: 0.025
  },
  recoilTracker: {
    tint: '#47526b',
    edge: '#8d9dc0',
    opacity: 0.03
  },
  ecal: {
    tint: '#555246',
    edge: '#b4ad93',
    opacity: 0.02
  },
  hcal: {
    tint: '#495044',
    edge: '#8fa08b',
    opacity: 0.015
  },
  support: {
    tint: '#454951',
    edge: '#727882',
    opacity: 0.02
  }
};

export function subsystemToColorToken(
  subsystem: DetectorSubsystemId
): GeometryColorToken {
  return subsystem;
}

export function getPaletteEntry(token: GeometryColorToken) {
  return PALETTE[token];
}

export function createBaseAppearance(
  token: GeometryColorToken
): GeometryAppearanceOverride {
  const entry = getPaletteEntry(token);
  return {
    color: null,
    colorMode: 'default',
    edgeOpacity: getDefaultEdgeOpacity(token),
    opacity: entry.opacity,
    renderMode: getDefaultRenderMode(token)
  };
}

export function getSelectionEdgeColor() {
  return '#61afef';
}

function getDefaultEdgeOpacity(token: GeometryColorToken) {
  switch (token) {
    case 'tagger':
    case 'triggerPads':
    case 'recoilTracker':
      return 0.72;
    case 'target':
      return 0.68;
    case 'ecal':
      return 0.46;
    case 'hcal':
      return 0.38;
    case 'support':
    default:
      return 0.18;
  }
}

function getDefaultRenderMode(token: GeometryColorToken): GeometryRenderMode {
  switch (token) {
    case 'target':
      return 'solidWire';
    case 'tagger':
    case 'triggerPads':
    case 'recoilTracker':
    case 'ecal':
    case 'hcal':
      return 'wire';
    case 'support':
    default:
      return 'hidden';
  }
}
