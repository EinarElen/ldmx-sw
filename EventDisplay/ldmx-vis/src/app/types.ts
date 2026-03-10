export type Status =
  | 'init'
  | 'geometry'
  | 'events'
  | 'loading'
  | 'importing'
  | 'ready'
  | 'error';

export type MetadataEntry = {
  label: string;
  value: string;
};

export type HcalVetoSummary = {
  maxLayer: string;
  maxPe: string;
  maxSection: string;
  maxStrip: string;
  maxTime: string;
  numValidHits: string;
  pass: string;
  totalPe: string;
};

export type EcalVetoSeries = {
  electronEnergy: number[];
  outsideEnergy: number[];
  outsideNHits: number[];
  outsideXStd: number[];
  outsideYStd: number[];
  photonEnergy: number[];
};

export type EcalVetoSegmentSummary = {
  energy: number[];
  layerMean: number[];
  layerStd: number[];
  xMean: number[];
  xStd: number[];
  yMean: number[];
  yStd: number[];
};

export type EcalVetoProfiles = {
  electron: {
    energy: number[][];
    xMean: number[][];
    yMean: number[][];
  };
  outside: {
    energy: number[][];
    layerMean: number[][];
    layerStd: number[][];
    nHits: number[][];
    xMean: number[][];
    xStd: number[][];
    yMean: number[][];
    yStd: number[][];
  };
  photon: {
    energy: number[][];
    nHits: number[][];
    xMean: number[][];
    yMean: number[][];
  };
};

/**
 * Flattened ECAL-veto summary used by the inspector and event guide.
 * The raw JSON carries both scalar metadata and profile arrays; this is the
 * normalized frontend contract after classification/parsing.
 */
export type EcalVetoSummary = {
  avgLayerHit: number | null;
  deepestLayerHit: number | null;
  disc: number | null;
  discCut: number | null;
  discMargin: number | null;
  ecalBackEnergy: number | null;
  epAng: number | null;
  epAngAtTarget: number | null;
  epDot: number | null;
  epDotAtTarget: number | null;
  epSep: number | null;
  fiducial: boolean | null;
  interesting: boolean;
  interestingTags: string[];
  layerReadoutEnergy: number[];
  maxCellDep: number | null;
  nReadoutHits: number | null;
  nTrackingHits: number | null;
  pass: boolean | null;
  peakLayerEnergy: number | null;
  peakLayerIndex: number | null;
  peakOutsideEnergy: number | null;
  peakOutsideRing: number | null;
  peakSegmentEnergy: number | null;
  peakSegmentIndex: number | null;
  profiles: EcalVetoProfiles;
  recoilMomentum: [number, number, number] | null;
  recoilPosition: [number, number, number] | null;
  segments: EcalVetoSegmentSummary;
  series: EcalVetoSeries;
  showerRMS: number | null;
  stdLayerHit: number | null;
  summedDet: number | null;
  summedTightIso: number | null;
  trackingFiducial: boolean | null;
  xStd: number | null;
  yStd: number | null;
};

export type PhoenixEventData = {
  EcalVeto?: Record<string, unknown>;
  Hits?: Record<string, unknown[]>;
  SimParticles?: Record<string, unknown>;
  Tracks?: Record<string, unknown[]>;
  [key: string]: unknown;
};

/**
 * Frontend-facing truth particle view derived from persisted SimParticles.
 * Both total and kinetic energy are preserved because selection/filtering
 * logic uses different notions of "energy" for EM and hadronic particles.
 */
export type TruthParticle = {
  daughterIds: number[];
  energy: number | null;
  endpoint: [number, number, number] | null;
  interactionMaterial: string;
  kineticEnergy: number | null;
  mass: number | null;
  momentum: [number, number, number] | null;
  parentIds: number[];
  pdgId: number | null;
  processType: string;
  trackId: number;
  vertex: [number, number, number] | null;
  vertexVolume: string;
};

export type TruthTrajectoryPoint = {
  position: [number, number, number];
  time: number | null;
  kind: string;
  volume: string;
};

export type TruthTrajectory = {
  parentId: number | null;
  pdgId: number | null;
  role: string;
  trackId: number;
  points: TruthTrajectoryPoint[];
};

export type TruthContributionSummary = {
  collectionName: string;
  count: number;
  totalEnergy: number;
  trackIds: number[];
};

/**
 * Tree relation between visible truth particles in the inspector.
 * "inferred" means the direct parent is not present, but a visible ancestor
 * can be linked through a claimed missing daughter id.
 */
export type TruthHierarchyLink = {
  child: TruthParticle;
  relation: 'direct' | 'inferred';
  viaTrackIds: number[];
};

export type TruthSpeciesFilter =
  | 'all'
  | 'em'
  | 'muon'
  | 'chargedHadron'
  | 'neutralHadron'
  | 'ion'
  | 'other';

export type TruthFilterState = {
  hideOrphanedLowEnergyEm: boolean;
  minEnergy: number;
  orphanedEmEnergyThreshold: number;
  processType: string;
  species: TruthSpeciesFilter;
};

export type EventCollectionSummary = {
  path: string[];
  subsystem: CollectionSubsystemId;
  kind: 'Hits' | 'Tracks' | 'SimParticles';
  name: string;
  size: number;
};

export type SourcePreset = {
  id: string;
  label: string;
  url: string;
};

export type WorkspaceId =
  | 'overview'
  | 'vetoAudit'
  | 'truthLineage'
  | 'recoTruth'
  | 'containment';

export type DetectorSubsystemId =
  | 'target'
  | 'tagger'
  | 'triggerPads'
  | 'recoilTracker'
  | 'ecal'
  | 'hcal'
  | 'support';

export type CollectionSubsystemId =
  | 'truth'
  | 'scoringPlanes'
  | 'ecalVeto'
  | 'analysis'
  | 'hcalVeto'
  | DetectorSubsystemId;

export type DetectorSubsystemConfig = {
  visible: boolean;
  opacity: number;
};

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  detectorDefaults: Record<DetectorSubsystemId, DetectorSubsystemConfig>;
  collectionDefaults: Record<CollectionSubsystemId, boolean>;
  focusSubsystems: DetectorSubsystemId[];
};

export type DetectorSubsystemDefinition = {
  id: DetectorSubsystemId;
  label: string;
};

export type CollectionSubsystemDefinition = {
  id: CollectionSubsystemId;
  label: string;
};

export type GeometryTreeNode = {
  id: string;
  label: string;
  objectUuids: string[];
  children: GeometryTreeNode[];
};

export type GeometryNodeKind =
  | 'root'
  | 'subsystem'
  | 'family'
  | 'layer'
  | 'component'
  | 'leaf';

export type GeometryColorToken =
  | 'tagger'
  | 'target'
  | 'triggerPads'
  | 'recoilTracker'
  | 'ecal'
  | 'hcal'
  | 'support';

export type GeometryRenderMode =
  | 'hidden'
  | 'solid'
  | 'ghost'
  | 'wire'
  | 'solidWire';

export type HcalProxyGranularity = 'section' | 'layerGroup' | 'layer';

export type GeometrySelectionTarget = {
  type: 'node' | 'group' | 'plane';
  id: string;
};

export type GeometryClipMode =
  | 'keepPositive'
  | 'keepNegative'
  | 'slabStart'
  | 'slabEnd';

export type GeometryNodeStats = {
  childCount: number;
  directObjectCount: number;
  leafObjectCount: number;
};

export type GeometryNodeBounds = {
  center: [number, number, number];
  size: [number, number, number];
};

export type GeometryRegistryNode = {
  bounds: GeometryNodeBounds;
  childIds: string[];
  defaultColorToken: GeometryColorToken;
  id: string;
  kind: GeometryNodeKind;
  label: string;
  objectUuids: string[];
  parentId: string | null;
  path: string[];
  stats: GeometryNodeStats;
  subsystem: DetectorSubsystemId;
};

/**
 * Immutable geometry inventory built from the imported LDMX scene graph.
 * Tree operations and geometry rendering work against this registry instead
 * of mutating the raw Three.js hierarchy directly.
 */
export type GeometryRegistry = {
  nodeOrder: string[];
  nodes: Record<string, GeometryRegistryNode>;
  objectNodeIds: Record<string, string>;
  rootIds: string[];
};

export type GeometryAppearanceOverride = {
  color: string | null;
  colorMode: 'default' | 'custom';
  edgeOpacity: number;
  opacity: number;
  renderMode: GeometryRenderMode;
};

export type GeometryGroup = {
  colorOverride: string | null;
  defaultOpacity: number | null;
  defaultRenderMode: GeometryRenderMode | null;
  id: string;
  memberNodeIds: string[];
  name: string;
};

export type GeometryOp = {
  id: string;
  order: number;
  targetId: string;
  targetType: 'group' | 'node';
  type: 'appearance';
};

export type GeometryClipPlane = {
  color: string;
  enabled: boolean;
  helperSize: number;
  id: string;
  label: string;
  mode: GeometryClipMode;
  position: [number, number, number];
  rotation: [number, number, number];
  thickness: number;
  visible: boolean;
};

export type CollectionTreeNode = {
  id: string;
  label: string;
  collectionCount: number;
  itemCount: number;
  collectionNames: string[];
  children: CollectionTreeNode[];
};

export type HitColorMode =
  | 'source'
  | 'energy'
  | 'parentSpecies'
  | 'parentTrack';

export type HitSizeMode = 'source' | 'energy' | 'contributors';

export type HitVisualStyle = {
  colorMode: HitColorMode;
  sizeMode: HitSizeMode;
  sizeStrength: number;
};

export type TrajectoryColorMode = 'selection' | 'pdg' | 'role' | 'track';

export type TrajectoryStyleMode = 'plain' | 'species' | 'role';

export type TrajectorySizeMode = 'uniform' | 'pdg' | 'role';

export type TrajectoryVisualStyle = {
  colorMode: TrajectoryColorMode;
  sizeMode: TrajectorySizeMode;
  sizeScale: number;
  styleMode: TrajectoryStyleMode;
  emphasizeSelected: boolean;
  showDescendants: boolean;
};

export type GeometryWorkbenchState = {
  clipPlanes: GeometryClipPlane[];
  groupOrder: string[];
  groups: Record<string, GeometryGroup>;
  hcalProxyGranularity: HcalProxyGranularity;
  nodeOverrides: Record<string, GeometryAppearanceOverride>;
  ops: GeometryOp[];
  selectedTarget: GeometrySelectionTarget | null;
  transformMode: 'translate' | 'rotate';
  visibilityState: Record<string, boolean>;
};
