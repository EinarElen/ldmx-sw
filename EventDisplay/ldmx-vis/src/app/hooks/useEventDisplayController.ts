import { useEffect, useMemo, useState } from 'react';
import { DISPLAY_ID, WORKSPACES } from '../constants';
import { useGeometryWorkbenchController } from '../features/geometry-workbench/hooks/useGeometryWorkbenchController';
import { useSlicePlaneHelpers } from '../features/geometry-workbench/hooks/useSlicePlaneHelpers';
import { applyGeometryWorkbench } from '../features/geometry-workbench/scene/geometryScene';
import {
  extractHcalVetoSummary,
  extractEcalVetoSummary
} from '../utils/classification';
import {
  buildCollectionTree,
  collectCollectionNodeSubtreeIds,
  createCollectionVisibilityState,
  resolveCollectionVisibility
} from '../utils/collectionTree';
import { buildEventGuide, summarizeEventCollections } from '../utils/eventSummary';
import {
  applySceneStyling,
  createCollectionState,
  renderTruthOverlay
} from '../utils/scene';
import { useCameraController } from './useCameraController';
import { useDisplayRuntime } from './useDisplayRuntime';
import { useTruthDisplayState } from './useTruthDisplayState';
import { useVisualizationStyleState } from './useVisualizationStyleState';
import type {
  CollectionSubsystemId,
  CollectionTreeNode,
  EventCollectionSummary,
  WorkspaceId
} from '../types';

/**
 * Central application controller for the event display shell.
 * It bridges Phoenix/Three state, derived event summaries, truth selections,
 * collection visibility, and geometry-workbench state into a single hook.
 */
export function useEventDisplayController() {
  const runtime = useDisplayRuntime();
  const [collectionTree, setCollectionTree] = useState<CollectionTreeNode[]>([]);
  const [collectionVisibilityState, setCollectionVisibilityState] = useState<
    Record<string, boolean>
  >({});
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceId>('overview');
  const geometryWorkbench = useGeometryWorkbenchController(runtime.geometryRoot);
  const camera = useCameraController(runtime.eventDisplay, runtime.geometryRoot);
  const visualization = useVisualizationStyleState();
  const clipping = geometryWorkbench.clipPlanes.some((plane) => plane.enabled);
  const resolvedCollectionVisibility = useMemo(
    () => resolveCollectionVisibility(collectionTree, collectionVisibilityState),
    [collectionTree, collectionVisibilityState]
  );
  const hcalVetoSummary = useMemo(
    () => extractHcalVetoSummary(runtime.metadata),
    [runtime.metadata]
  );
  const currentEventData = useMemo(
    () =>
      runtime.currentEventKey
        ? runtime.eventPayloads[runtime.currentEventKey] ?? null
        : null,
    [runtime.currentEventKey, runtime.eventPayloads]
  );
  const ecalVetoSummary = useMemo(
    () => extractEcalVetoSummary(currentEventData, runtime.metadata),
    [currentEventData, runtime.metadata]
  );
  const eventCollectionSummary = useMemo<EventCollectionSummary[]>(
    () => summarizeEventCollections(currentEventData),
    [currentEventData]
  );
  const eventGuide = useMemo(
    () =>
      buildEventGuide(
        currentEventData,
        runtime.metadata,
        hcalVetoSummary,
        ecalVetoSummary
      ),
    [currentEventData, ecalVetoSummary, hcalVetoSummary, runtime.metadata]
  );
  const truth = useTruthDisplayState(
    currentEventData,
    visualization.trajectoryVisualStyle.showDescendants
  );
  const selectedPlaneId =
    geometryWorkbench.selectedTarget?.type === 'plane'
      ? geometryWorkbench.selectedTarget.id
      : null;

  useSlicePlaneHelpers({
    cameraModeKey: camera.orthographic ? 'orthographic' : 'perspective',
    eventDisplay: runtime.eventDisplay,
    onPlaneTransform: geometryWorkbench.updatePlaneTransform,
    planes: geometryWorkbench.clipPlanes,
    selectedPlaneId,
    transformMode: geometryWorkbench.transformMode
  });

  useEffect(() => {
    const geometryRoot = runtime.geometryRoot;
    if (!geometryRoot) return;

    const frame = window.requestAnimationFrame(() => {
      applyGeometryWorkbench(
        geometryRoot,
        geometryWorkbench.registry,
        geometryWorkbench.workbenchState
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    runtime.geometryRoot,
    geometryWorkbench.registry,
    geometryWorkbench.workbenchState
  ]);

  useEffect(() => {
    const eventDisplay = runtime.eventDisplay;
    if (!eventDisplay) return;

    const frame = window.requestAnimationFrame(() => {
      applySceneStyling(
        eventDisplay,
        workspace,
        resolvedCollectionVisibility,
        currentEventData,
        visualization.hitVisualStyle
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    currentEventData,
    runtime.eventDisplay,
    visualization.hitVisualStyle,
    resolvedCollectionVisibility,
    workspace
  ]);

  useEffect(() => {
    const eventDisplay = runtime.eventDisplay;
    if (!eventDisplay) return;

    const frame = window.requestAnimationFrame(() => {
      renderTruthOverlay(
        eventDisplay,
        truth.truthParticles,
        truth.truthTrajectories,
        truth.overlayTruthTrackIds,
        truth.selectedTruthTrackId,
        (resolvedCollectionVisibility.visualization_trajectories ??
          resolvedCollectionVisibility.SimParticles ??
          resolvedCollectionVisibility.ground_truth_tracks ??
          true),
        visualization.trajectoryVisualStyle
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    runtime.eventDisplay,
    resolvedCollectionVisibility,
    truth.overlayTruthTrackIds,
    truth.selectedTruthTrackId,
    truth.truthParticles,
    truth.truthTrajectories,
    visualization.trajectoryVisualStyle
  ]);

  useEffect(() => {
    const nextTree = buildCollectionTree(eventCollectionSummary);
    setCollectionTree(nextTree);
    setCollectionVisibilityState((previous) => {
      const nextState = createCollectionVisibilityState(nextTree);
      for (const key of Object.keys(nextState)) {
        if (previous[key] !== undefined) {
          nextState[key] = previous[key];
        }
      }
      return nextState;
    });
  }, [eventCollectionSummary]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, [clipping, geometryWorkbench.transformMode, camera.orthographic]);

  function toggleClipping() {
    if (!geometryWorkbench.clipPlanes.length) {
      geometryWorkbench.addClipPlane();
      return;
    }

    const targetPlaneId = selectedPlaneId ?? geometryWorkbench.clipPlanes[0]?.id;
    if (!targetPlaneId) return;
    const plane = geometryWorkbench.clipPlanes.find(
      (entry) => entry.id === targetPlaneId
    );
    if (!plane) return;
    geometryWorkbench.updateClipPlane(targetPlaneId, {
      enabled: !plane.enabled
    });
  }

  function selectWorkspace(nextWorkspace: WorkspaceId) {
    const nextCollectionState = createCollectionState(nextWorkspace);
    setWorkspace(nextWorkspace);
    setCollectionVisibilityState((previous) => {
      const next = { ...previous };
      for (const [subsystem, visible] of Object.entries(nextCollectionState)) {
        const root = subsystemRoot(subsystem as CollectionSubsystemId);
        for (const id of Object.keys(previous)) {
          if (id === root || id.startsWith(`${root}/`)) {
            next[id] = visible;
          }
        }
      }
      return next;
    });
  }

  function setCollectionNodeVisibility(id: string, visible: boolean) {
    const subtreeIds = collectCollectionNodeSubtreeIds(collectionTree, id);
    if (!subtreeIds.length) return;

    setCollectionVisibilityState((previous) => ({
      ...previous,
      ...Object.fromEntries(subtreeIds.map((entry) => [entry, visible]))
    }));
  }


  return {
    clipping,
    collectionTree,
    collectionVisibilityState,
    cameraPose: camera.cameraPose,
    currentEventIndex: runtime.currentEventIndex,
    currentEventKey: runtime.currentEventKey,
    displayId: DISPLAY_ID,
    ecalVetoSummary,
    error: runtime.error,
    eventCollectionSummary,
    eventFileInputRef: runtime.eventFileInputRef,
    eventGuide,
    eventKeys: runtime.eventKeys,
    geometryFileInputRef: runtime.geometryFileInputRef,
    geometryLabel: runtime.geometryLabel,
    geometryWorkbench,
    goToNextEvent: runtime.goToNextEvent,
    goToPreviousEvent: runtime.goToPreviousEvent,
    handleEventFileChange: runtime.handleEventFileChange,
    handleGeometryFileChange: runtime.handleGeometryFileChange,
    hitVisualStyle: visualization.hitVisualStyle,
    hcalVetoSummary,
    inspectorOpen,
    metadata: runtime.metadata,
    openEventPicker: runtime.openEventPicker,
    openGeometryPicker: runtime.openGeometryPicker,
    orthographic: camera.orthographic,
    selectedTruthParticle: truth.selectedTruthParticle,
    selectedTruthHierarchy: truth.selectedTruthHierarchy,
    selectedTruthTrackId: truth.selectedTruthTrackId,
    selectedTruthTrajectory: truth.selectedTruthTrajectory,
    selectWorkspace,
    setCollectionNodeVisibility,
    setCurrentEventKey: runtime.setCurrentEventKey,
    setHitColorMode: visualization.setHitColorMode,
    setHitSizeMode: visualization.setHitSizeMode,
    setHitSizeStrength: visualization.setHitSizeStrength,
    setInspectorOpen,
    setCameraDistanceOrZoomValue: camera.setCameraDistanceOrZoomValue,
    setCameraPositionValue: camera.setCameraPositionValue,
    setCameraTargetValue: camera.setCameraTargetValue,
    setSelectedTruthTrackId: truth.setSelectedTruthTrackId,
    setTruthFilterHideOrphanedLowEnergyEm:
      truth.setTruthFilterHideOrphanedLowEnergyEm,
    setTruthFilterMinEnergy: truth.setTruthFilterMinEnergy,
    setTruthFilterOrphanedEmEnergyThreshold:
      truth.setTruthFilterOrphanedEmEnergyThreshold,
    setTruthFilterProcessType: truth.setTruthFilterProcessType,
    setTruthFilterSpecies: truth.setTruthFilterSpecies,
    setTrajectoryColorMode: visualization.setTrajectoryColorMode,
    setTrajectoryEmphasizeSelected:
      visualization.setTrajectoryEmphasizeSelected,
    setTrajectoryShowDescendants: visualization.setTrajectoryShowDescendants,
    setTrajectorySizeMode: visualization.setTrajectorySizeMode,
    setTrajectorySizeScale: visualization.setTrajectorySizeScale,
    setTrajectoryStyleMode: visualization.setTrajectoryStyleMode,
    sourceLabel: runtime.sourceLabel,
    status: runtime.status,
    setCameraView: camera.setCameraView,
    toggleClipping,
    toggleProjection: camera.toggleProjection,
    truthChildrenMap: truth.truthChildrenMap,
    truthContributions: truth.truthContributions,
    truthFilterProcessOptions: truth.truthFilterProcessOptions,
    truthFilters: truth.truthFilters,
    truthParticles: truth.truthParticles,
    truthRoots: truth.truthRoots,
    trajectoryVisualStyle: visualization.trajectoryVisualStyle,
    workspace,
    workspaces: WORKSPACES,
    panCamera: camera.panCamera,
    zoom: camera.zoom,
    resetTruthFilters: truth.resetTruthFilters
  };
}

function subsystemRoot(subsystem: CollectionSubsystemId) {
  switch (subsystem) {
    case 'truth':
      return 'Truth';
    case 'scoringPlanes':
      return 'Scoring planes';
    case 'ecalVeto':
      return 'ECAL veto';
    case 'analysis':
      return 'Analysis';
    case 'hcalVeto':
      return 'HCAL veto';
    case 'target':
      return 'Target';
    case 'tagger':
      return 'Tagger';
    case 'triggerPads':
      return 'Trigger pads';
    case 'recoilTracker':
      return 'Recoil tracker';
    case 'ecal':
      return 'ECAL';
    case 'hcal':
      return 'HCAL';
    case 'support':
      return 'Support';
  }
}
