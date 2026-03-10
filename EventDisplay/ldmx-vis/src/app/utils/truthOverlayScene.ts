import type { EventDisplay } from 'phoenix-event-display';
import { Color, Group, Vector2, Vector3 } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { getPhoenixThreeManager } from './phoenixInterop';
import { sanitizeTrajectoryPoints } from './truthTrajectoryDisplay';
import type {
  TrajectoryColorMode,
  TrajectorySizeMode,
  TrajectoryStyleMode,
  TrajectoryVisualStyle,
  TruthParticle,
  TruthTrajectory
} from '../types';

const TRUTH_OVERLAY_GROUP = '__ldmx_truth_overlay__';
const overlayResolution = new Vector2();

/**
 * Rebuilds the custom truth overlay used for trajectory styling and selection.
 */
export function renderTruthOverlay(
  eventDisplay: EventDisplay,
  particles: TruthParticle[],
  trajectories: Map<number, TruthTrajectory>,
  highlightedTrackIds: number[],
  selectedTrackId: number | null,
  visible: boolean,
  style: TrajectoryVisualStyle
) {
  const sceneManager = eventDisplay.getThreeManager().getSceneManager();
  const eventData = sceneManager.getEventData();
  const existing = eventData.getObjectByName(TRUTH_OVERLAY_GROUP);
  if (existing) {
    eventData.remove(existing);
  }

  if (!visible || (!particles.length && !trajectories.size)) return;

  const particleMap = new Map(
    particles.map((particle) => [particle.trackId, particle])
  );
  const highlightedTrackIdSet = new Set(highlightedTrackIds);
  const trackIds =
    selectedTrackId == null
      ? new Set<number>(trajectories.keys())
      : new Set<number>([selectedTrackId, ...highlightedTrackIds]);
  const resolution = getOverlayResolution(eventDisplay);
  const overlay = new Group();
  overlay.name = TRUTH_OVERLAY_GROUP;

  for (const trackId of Array.from(trackIds).sort((left, right) => left - right)) {
    const particle = particleMap.get(trackId);
    const detailedTrajectory = trajectories.get(trackId);
    const sanitizedDetailedPoints = detailedTrajectory
      ? sanitizeTrajectoryPoints(detailedTrajectory.points)
      : [];
    const points =
      sanitizedDetailedPoints.length >= 2
        ? sanitizedDetailedPoints.map((point) => new Vector3(...point.position))
        : selectedTrackId != null &&
            particle?.vertex &&
            particle.endpoint &&
            !samePoint(particle.vertex, particle.endpoint)
          ? [new Vector3(...particle.vertex), new Vector3(...particle.endpoint)]
          : [];
    if (points.length < 2) continue;

    const geometry = new LineGeometry();
    geometry.setPositions(points.flatMap((point) => [point.x, point.y, point.z]));
    const isSelected = selectedTrackId === trackId;
    const isHighlighted =
      selectedTrackId == null ? true : highlightedTrackIdSet.has(trackId);
    const material = createTrajectoryMaterial(
      style,
      particle,
      detailedTrajectory,
      trackId,
      isSelected,
      isHighlighted,
      resolution
    );
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.name = `simparticle_${trackId}`;
    line.userData = {
      collection: 'SimParticles',
      trackId,
      type: 'truth-overlay'
    };
    overlay.add(line);
  }

  eventData.add(overlay);
}

function samePoint(
  left: [number, number, number],
  right: [number, number, number]
) {
  return (
    Math.abs(left[0] - right[0]) < 1e-6 &&
    Math.abs(left[1] - right[1]) < 1e-6 &&
    Math.abs(left[2] - right[2]) < 1e-6
  );
}

function getTruthColor(particle?: TruthParticle) {
  if (!particle) return new Color('#c8ccd4');
  const absPdg = Math.abs(particle.pdgId ?? 0);
  if (absPdg === 11) return new Color('#61afef');
  if (absPdg === 13) return new Color('#e06c75');
  if (absPdg === 22) return new Color('#e5c07b');
  if (absPdg === 2112) return new Color('#c678dd');
  if (absPdg === 211 || absPdg === 111) return new Color('#98c379');
  if (absPdg === 2212) return new Color('#d19a66');
  return new Color('#c8ccd4');
}

function getTrajectoryColor(
  mode: TrajectoryColorMode,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined,
  trackId: number,
  isSelected: boolean
) {
  if (mode === 'selection') {
    return new Color(isSelected ? '#61afef' : '#7a8094');
  }

  if (mode === 'role') {
    switch (trajectory?.role ?? '') {
      case 'beam_electron':
        return new Color('#61afef');
      case 'hard_brem_gamma':
        return new Color('#e5c07b');
      case 'pn_daughter':
        return new Color('#98c379');
      default:
        return new Color('#c8ccd4');
    }
  }

  if (mode === 'track') {
    return new Color().setHSL(((trackId * 53) % 360) / 360, 0.58, 0.62);
  }

  return getTruthColor(particle);
}

function createTrajectoryMaterial(
  style: TrajectoryVisualStyle,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined,
  trackId: number,
  isSelected: boolean,
  isHighlighted: boolean,
  resolution: Vector2
) {
  const color = getTrajectoryColor(
    style.colorMode,
    particle,
    trajectory,
    trackId,
    isSelected
  );
  const opacity = getTrajectoryOpacity(
    style,
    particle,
    trajectory,
    isSelected,
    isHighlighted
  );
  const lineStyle = getTrajectoryLineStyle(style.styleMode, particle, trajectory);
  const linewidth = getTrajectoryWidth(
    style,
    particle,
    trajectory,
    isSelected,
    isHighlighted
  );

  return new LineMaterial({
    alphaToCoverage: true,
    color,
    dashed: lineStyle.kind === 'dashed',
    dashScale: 1,
    dashSize: lineStyle.kind === 'dashed' ? lineStyle.dashSize : 1,
    gapSize: lineStyle.kind === 'dashed' ? lineStyle.gapSize : 1,
    linewidth,
    resolution,
    transparent: true,
    opacity
  });
}

function getTrajectoryOpacity(
  style: TrajectoryVisualStyle,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined,
  isSelected: boolean,
  isHighlighted: boolean
) {
  const baseOpacity = getTrajectoryBaseOpacity(
    style.styleMode,
    particle,
    trajectory
  );
  if (!style.emphasizeSelected) return baseOpacity;
  if (isSelected) return Math.max(baseOpacity, 0.98);
  if (isHighlighted) return Math.max(0.78, baseOpacity);
  return Math.min(baseOpacity, 0.2);
}

function getTrajectoryBaseOpacity(
  styleMode: TrajectoryStyleMode,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined
) {
  if (styleMode === 'role') {
    switch (trajectory?.role ?? '') {
      case 'beam_electron':
        return 0.96;
      case 'hard_brem_gamma':
        return 0.92;
      case 'pn_daughter':
        return 0.84;
      default:
        return 0.8;
    }
  }

  if (styleMode === 'species') {
    switch (Math.abs(particle?.pdgId ?? 0)) {
      case 11:
        return 0.98;
      case 22:
        return 0.94;
      case 13:
        return 0.92;
      case 2112:
        return 0.84;
      case 2212:
        return 0.9;
      case 211:
      case 111:
        return 0.88;
      default:
        return 0.82;
    }
  }

  return 0.88;
}

function getTrajectoryWidth(
  style: TrajectoryVisualStyle,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined,
  isSelected: boolean,
  isHighlighted: boolean
) {
  const baseWidth = getTrajectoryBaseWidth(style.sizeMode, particle, trajectory);
  const scaledWidth = baseWidth * style.sizeScale;

  if (!style.emphasizeSelected) {
    return scaledWidth;
  }
  if (isSelected) {
    return scaledWidth * 1.45;
  }
  if (isHighlighted) {
    return scaledWidth * 1.12;
  }
  return scaledWidth * 0.72;
}

function getTrajectoryBaseWidth(
  sizeMode: TrajectorySizeMode,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined
) {
  if (sizeMode === 'role') {
    switch (trajectory?.role ?? '') {
      case 'beam_electron':
        return 4.2;
      case 'hard_brem_gamma':
        return 3.4;
      case 'pn_daughter':
        return 2.6;
      default:
        return 2.8;
    }
  }

  if (sizeMode === 'pdg') {
    switch (Math.abs(particle?.pdgId ?? 0)) {
      case 11:
        return 4.0;
      case 22:
        return 3.2;
      case 13:
        return 3.5;
      case 2112:
        return 2.4;
      case 2212:
        return 3.0;
      case 211:
      case 111:
        return 2.7;
      default:
        return 2.8;
    }
  }

  return 3;
}

function getTrajectoryLineStyle(
  styleMode: TrajectoryStyleMode,
  particle: TruthParticle | undefined,
  trajectory: TruthTrajectory | undefined
) {
  if (styleMode === 'role') {
    switch (trajectory?.role ?? '') {
      case 'hard_brem_gamma':
        return { kind: 'dashed' as const, dashSize: 4, gapSize: 2 };
      case 'pn_daughter':
        return { kind: 'dashed' as const, dashSize: 2.5, gapSize: 1.6 };
      default:
        return { kind: 'solid' as const };
    }
  }

  if (styleMode === 'species') {
    switch (Math.abs(particle?.pdgId ?? 0)) {
      case 22:
        return { kind: 'dashed' as const, dashSize: 4.5, gapSize: 2 };
      case 2112:
        return { kind: 'dashed' as const, dashSize: 1.4, gapSize: 2.8 };
      case 211:
      case 111:
        return { kind: 'dashed' as const, dashSize: 2.4, gapSize: 1.4 };
      default:
        return { kind: 'solid' as const };
    }
  }

  return { kind: 'solid' as const };
}

function getOverlayResolution(eventDisplay: EventDisplay) {
  const threeManager = getPhoenixThreeManager(eventDisplay);
  const domElement =
    threeManager.rendererManager?.getMainRenderer?.()?.domElement ?? null;
  const width = Math.max(domElement?.clientWidth ?? window.innerWidth, 1);
  const height = Math.max(domElement?.clientHeight ?? window.innerHeight, 1);
  overlayResolution.set(width, height);
  return overlayResolution;
}
