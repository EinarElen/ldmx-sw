import type { EventDisplay } from 'phoenix-event-display';
import { type Material, Object3D } from 'three';
import { getWorkspaceDefinition } from '../constants';
import { classifyCollectionName } from './classification';
import { styleHitCollection } from './hitVisuals';
import type {
  CollectionSubsystemId,
  HitVisualStyle,
  PhoenixEventData,
  WorkspaceId
} from '../types';

export function createCollectionState(workspace: WorkspaceId) {
  return structuredClone(getWorkspaceDefinition(workspace).collectionDefaults);
}

/**
 * Applies per-collection visibility and opacity to the Phoenix event subtree.
 */
export function applySceneStyling(
  eventDisplay: EventDisplay,
  workspace: WorkspaceId,
  collectionVisibilityState: Record<string, boolean>,
  currentEventData: PhoenixEventData | null,
  hitVisualStyle: HitVisualStyle
) {
  const sceneManager = eventDisplay.getThreeManager().getSceneManager();
  const eventData = sceneManager.getEventData();

  eventData.traverse((object: Object3D) => {
    if (object === eventData || object.name === '__ldmx_truth_overlay__') return;
    if (!(object.name in collectionVisibilityState)) return;

    // Phoenix draws trajectory collections with its own default styling.
    // Suppress those raw objects and render the truth overlay ourselves so
    // UI color/style controls and selection highlighting are authoritative.
    if (
      object.name === 'visualization_trajectories' ||
      object.name === 'ground_truth_tracks'
    ) {
      setObjectVisibility(object, false);
      return;
    }

    const subsystem = classifyCollectionName(object.name);
    const visible = collectionVisibilityState[object.name] ?? true;
    setObjectVisibility(object, visible);
    if (!visible) return;

    const opacity = getCollectionOpacity(workspace, subsystem);
    object.traverse((child: Object3D) => {
      applyObjectOpacity(child, opacity);
    });

    if (currentEventData?.Hits && object.name in currentEventData.Hits) {
      styleHitCollection(object, object.name, currentEventData, hitVisualStyle);
    }
  });
}

function getCollectionOpacity(
  workspace: WorkspaceId,
  subsystem: CollectionSubsystemId
) {
  if (subsystem === 'analysis') return 0.95;
  if (subsystem === 'ecalVeto') return 0.96;
  if (subsystem === 'hcalVeto') return 0.98;
  if (subsystem === 'truth') {
    return workspace === 'truthLineage' ? 0.96 : 0.86;
  }

  if (subsystem === 'scoringPlanes') return 0.9;
  if (workspace === 'containment' && subsystem === 'hcal') return 0.92;
  if (workspace === 'containment' && subsystem === 'ecal') return 0.88;

  return 0.82;
}

function applyObjectOpacity(object: Object3D, opacity: number) {
  const material = (object as { material?: Material | Material[] }).material;
  if (!material) return;

  if (Array.isArray(material)) {
    for (const entry of material) {
      setMaterialOpacity(entry, opacity);
    }
    return;
  }

  setMaterialOpacity(material, opacity);
}

function setObjectVisibility(object: Object3D, visible: boolean) {
  object.visible = visible;
  object.traverse((child: Object3D) => {
    child.visible = visible;
  });
}

function setMaterialOpacity(material: Material, opacity: number) {
  const target = material as Material & {
    alphaTest?: number;
    opacity?: number;
    transparent?: boolean;
    depthWrite?: boolean;
  };

  target.transparent = opacity < 0.999;
  target.opacity = opacity;
  target.alphaTest = opacity < 0.08 ? 0.02 : 0;
  target.depthWrite = true;
  material.needsUpdate = true;
}
