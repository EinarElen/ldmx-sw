import type {
  CollectionSubsystemDefinition,
  CollectionSubsystemId,
  DetectorSubsystemConfig,
  DetectorSubsystemDefinition,
  DetectorSubsystemId,
  SourcePreset,
  Status,
  WorkspaceDefinition,
  WorkspaceId
} from './types';

export const DISPLAY_ID = 'ldmx-display';

const detectorGeometryUrl = new URL('../assets/fulldetector.gltf', import.meta.url)
  .href;
const pnValidationSampleUrl = new URL(
  '../assets/test_data/pn-validation.json',
  import.meta.url
).href;
const pnEcalVetoSampleUrl = new URL(
  '../assets/test_data/pn-validation-ecal-veto.json',
  import.meta.url
).href;
const hcalValidationSampleUrl = new URL(
  '../assets/test_data/hcal-validation.json',
  import.meta.url
).href;
const truthSampleUrl = new URL('../assets/test_data/truth.json', import.meta.url)
  .href;
const clusterSampleUrl = new URL(
  '../assets/test_data/clusters.json',
  import.meta.url
).href;

export const DEFAULT_GEOMETRY_URL = detectorGeometryUrl;

export const STATUS_LABEL: Record<Status, string> = {
  init: 'starting',
  geometry: 'loading geometry',
  events: 'loading events',
  loading: 'loading',
  importing: 'importing file',
  ready: 'sample loaded',
  error: 'load failed'
};

export const SOURCE_PRESETS: SourcePreset[] = [
  {
    id: 'pnEcalVeto',
    label: 'pn-validation-ecal-veto.json',
    url: pnEcalVetoSampleUrl
  },
  {
    id: 'pnValidation',
    label: 'pn-validation.json',
    url: pnValidationSampleUrl
  },
  {
    id: 'hcalValidation',
    label: 'hcal-validation.json',
    url: hcalValidationSampleUrl
  },
  {
    id: 'truth',
    label: 'truth.json',
    url: truthSampleUrl
  },
  {
    id: 'clusters',
    label: 'clusters.json',
    url: clusterSampleUrl
  }
];

// LDMX display frame:
// +z downstream, +y up, +x detector-right.
// Start upstream and above the detector, looking toward the target/ECAL region
// instead of the HCAL-dominated longitudinal center.
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [
  1450,
  900,
  -2100
];
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 60, 520];

export const DETECTOR_SUBSYSTEMS: DetectorSubsystemDefinition[] = [
  {
    id: 'target',
    label: 'Target'
  },
  {
    id: 'tagger',
    label: 'Tagger'
  },
  {
    id: 'triggerPads',
    label: 'Trigger pads'
  },
  {
    id: 'recoilTracker',
    label: 'Recoil tracker'
  },
  {
    id: 'ecal',
    label: 'ECAL'
  },
  {
    id: 'hcal',
    label: 'HCAL'
  },
  {
    id: 'support',
    label: 'Support'
  }
];

export const COLLECTION_SUBSYSTEMS: CollectionSubsystemDefinition[] = [
  {
    id: 'truth',
    label: 'Truth'
  },
  {
    id: 'scoringPlanes',
    label: 'Scoring planes'
  },
  {
    id: 'ecalVeto',
    label: 'ECAL veto'
  },
  {
    id: 'hcalVeto',
    label: 'HCAL veto'
  },
  {
    id: 'analysis',
    label: 'Analysis'
  },
  ...DETECTOR_SUBSYSTEMS
];

const allCollectionsVisible = (): Record<CollectionSubsystemId, boolean> => ({
  truth: true,
  scoringPlanes: true,
  ecalVeto: true,
  hcalVeto: true,
  analysis: true,
  target: true,
  tagger: true,
  triggerPads: true,
  recoilTracker: true,
  ecal: true,
  hcal: true,
  support: true
});

const allDetectorVisible = (
  overrides?: Partial<Record<DetectorSubsystemId, DetectorSubsystemConfig>>
): Record<DetectorSubsystemId, DetectorSubsystemConfig> => ({
  target: { visible: true, opacity: 0.22 },
  tagger: { visible: true, opacity: 0.24 },
  triggerPads: { visible: true, opacity: 0.28 },
  recoilTracker: { visible: true, opacity: 0.24 },
  ecal: { visible: true, opacity: 0.18 },
  hcal: { visible: true, opacity: 0.12 },
  support: { visible: true, opacity: 0.08 },
  ...overrides
});

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    detectorDefaults: allDetectorVisible(),
    collectionDefaults: allCollectionsVisible(),
    focusSubsystems: ['ecal', 'recoilTracker', 'hcal']
  },
  {
    id: 'vetoAudit',
    label: 'Veto Audit',
    detectorDefaults: allDetectorVisible({
      target: { visible: true, opacity: 0.2 },
      tagger: { visible: true, opacity: 0.12 },
      triggerPads: { visible: true, opacity: 0.22 },
      recoilTracker: { visible: true, opacity: 0.26 },
      ecal: { visible: true, opacity: 0.1 },
      hcal: { visible: true, opacity: 0.22 },
      support: { visible: true, opacity: 0.05 }
    }),
    collectionDefaults: {
      ...allCollectionsVisible(),
      tagger: false,
      support: false
    },
    focusSubsystems: ['hcal', 'recoilTracker', 'target', 'triggerPads']
  },
  {
    id: 'truthLineage',
    label: 'Truth Lineage',
    detectorDefaults: allDetectorVisible({
      target: { visible: true, opacity: 0.18 },
      tagger: { visible: true, opacity: 0.12 },
      triggerPads: { visible: true, opacity: 0.12 },
      recoilTracker: { visible: true, opacity: 0.12 },
      ecal: { visible: true, opacity: 0.08 },
      hcal: { visible: true, opacity: 0.08 },
      support: { visible: true, opacity: 0.04 }
    }),
    collectionDefaults: {
      ...allCollectionsVisible(),
      analysis: false,
      support: false
    },
    focusSubsystems: ['target', 'ecal', 'hcal']
  },
  {
    id: 'recoTruth',
    label: 'Reco vs Truth',
    detectorDefaults: allDetectorVisible({
      target: { visible: true, opacity: 0.18 },
      tagger: { visible: true, opacity: 0.18 },
      triggerPads: { visible: true, opacity: 0.14 },
      recoilTracker: { visible: true, opacity: 0.22 },
      ecal: { visible: true, opacity: 0.14 },
      hcal: { visible: true, opacity: 0.08 },
      support: { visible: true, opacity: 0.05 }
    }),
    collectionDefaults: {
      ...allCollectionsVisible(),
      support: false
    },
    focusSubsystems: ['recoilTracker', 'ecal', 'tagger']
  },
  {
    id: 'containment',
    label: 'Containment',
    detectorDefaults: allDetectorVisible({
      target: { visible: false, opacity: 0.16 },
      tagger: { visible: false, opacity: 0.12 },
      triggerPads: { visible: true, opacity: 0.12 },
      recoilTracker: { visible: true, opacity: 0.14 },
      ecal: { visible: true, opacity: 0.18 },
      hcal: { visible: true, opacity: 0.18 },
      support: { visible: true, opacity: 0.05 }
    }),
    collectionDefaults: {
      ...allCollectionsVisible(),
      tagger: false,
      target: false,
      support: false
    },
    focusSubsystems: ['ecal', 'hcal']
  }
];

export function getWorkspaceDefinition(id: WorkspaceId): WorkspaceDefinition {
  const workspace = WORKSPACES.find((entry) => entry.id === id) ?? WORKSPACES[0];
  if (!workspace) {
    throw new Error('Workspace definitions are missing');
  }
  return workspace;
}
