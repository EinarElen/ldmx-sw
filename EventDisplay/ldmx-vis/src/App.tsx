import { useEffect, useEffectEvent } from 'react';
import { CanvasNavigationControls } from './app/components/CanvasNavigationControls';
import { InspectorPanel } from './app/components/InspectorPanel';
import { Sidebar } from './app/components/Sidebar';
import { StatusBar } from './app/components/StatusBar';
import { TitleBar } from './app/components/TitleBar';
import { ViewportPane } from './app/components/ViewportPane';
import { SlicePlaneViewportControls } from './app/features/geometry-workbench/components/SlicePlaneViewportControls';
import { useEventDisplayController } from './app/hooks/useEventDisplayController';

export default function App() {
  const controller = useEventDisplayController();
  const workspaceIndex = controller.workspaces.findIndex(
    (workspace) => workspace.id === controller.workspace
  );

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    const command = event.metaKey || event.ctrlKey;
    if (!command) return;

    if (event.key.toLowerCase() === 'i') {
      event.preventDefault();
      controller.openEventPicker();
      return;
    }

    if (event.key.toLowerCase() === 'p' && event.shiftKey) {
      event.preventDefault();
      const nextIndex = (workspaceIndex + 1) % controller.workspaces.length;
      const nextWorkspace = controller.workspaces[nextIndex];
      if (!nextWorkspace) return;
      controller.selectWorkspace(nextWorkspace.id);
    }
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      onShortcut(event);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onShortcut]);

  return (
    <div className="app-shell">
      <TitleBar
        clipping={controller.clipping}
        currentEventIndex={controller.currentEventIndex}
        eventCount={controller.eventKeys.length}
        inspectorOpen={controller.inspectorOpen}
        onGeometryImport={controller.openGeometryPicker}
        onImportEvent={controller.openEventPicker}
        onNextEvent={controller.goToNextEvent}
        onPreviousEvent={controller.goToPreviousEvent}
        onInspectorToggle={() =>
          controller.setInspectorOpen((value) => !value)
        }
        onToggleClipping={controller.toggleClipping}
        onToggleProjection={controller.toggleProjection}
        orthographic={controller.orthographic}
      />

      <div className="app-shell__body">
        <Sidebar
          collectionTree={controller.collectionTree}
          collectionVisibilityState={controller.collectionVisibilityState}
          geometryWorkbench={{
            clipPlanes: controller.geometryWorkbench.clipPlanes,
            expandedState: controller.geometryWorkbench.expandedState,
            groupOrder: controller.geometryWorkbench.groupOrder,
            groups: controller.geometryWorkbench.groups,
            hcalProxyGranularity: controller.geometryWorkbench.hcalProxyGranularity,
            registry: controller.geometryWorkbench.registry,
            searchQuery: controller.geometryWorkbench.searchQuery,
            selectedAppearance: controller.geometryWorkbench.selectedAppearance,
            selectedLabel: controller.geometryWorkbench.selectedLabel,
            selectedTarget: controller.geometryWorkbench.selectedTarget,
            transformMode: controller.geometryWorkbench.transformMode,
            visibleNodeIds: controller.geometryWorkbench.visibleNodeIds,
            visibilityState: controller.geometryWorkbench.visibilityState
          }}
          hitVisualStyle={controller.hitVisualStyle}
          trajectoryVisualStyle={controller.trajectoryVisualStyle}
          onAddClipPlane={controller.geometryWorkbench.addClipPlane}
          onAssignNodeToGroup={controller.geometryWorkbench.assignNodeToGroup}
          onCollectionVisibilityChange={controller.setCollectionNodeVisibility}
          onCollapseAllGeometry={controller.geometryWorkbench.collapseAll}
          onCreateGroup={controller.geometryWorkbench.createGroup}
          onDeleteGroup={controller.geometryWorkbench.deleteGroup}
          onExpandAllGeometry={controller.geometryWorkbench.expandAll}
          onGeometryGroupNameChange={controller.geometryWorkbench.setGroupName}
          onGeometryMoveGroup={controller.geometryWorkbench.moveGroupToIndex}
          onGeometryMovePlane={controller.geometryWorkbench.movePlaneToIndex}
          onGeometryNodeSelect={controller.geometryWorkbench.selectNode}
          onGeometryNodeVisibilityChange={controller.geometryWorkbench.setNodeVisibility}
          onGeometryPlaneSelect={controller.geometryWorkbench.selectPlane}
          onGeometryRemoveGroupMember={controller.geometryWorkbench.removeGroupMember}
          onGeometryRemovePlane={controller.geometryWorkbench.removeClipPlane}
          onGeometrySearchChange={controller.geometryWorkbench.setSearchQuery}
          onGeometryHcalProxyGranularityChange={
            controller.geometryWorkbench.setHcalProxyGranularity
          }
          onGeometrySelectedAppearanceChange={
            controller.geometryWorkbench.setSelectedAppearance
          }
          onGeometrySelectedAppearanceReset={
            controller.geometryWorkbench.resetSelectedAppearance
          }
          onGeometrySelectedGroup={controller.geometryWorkbench.selectGroup}
          onGeometryToggleExpanded={controller.geometryWorkbench.toggleExpanded}
          onGeometryTransformModeChange={
            controller.geometryWorkbench.setTransformMode
          }
          onGeometryUpdatePlane={controller.geometryWorkbench.updateClipPlane}
          onHitColorModeChange={controller.setHitColorMode}
          onHitSizeModeChange={controller.setHitSizeMode}
          onHitSizeStrengthChange={controller.setHitSizeStrength}
          onTrajectoryColorModeChange={controller.setTrajectoryColorMode}
          onTrajectorySizeModeChange={controller.setTrajectorySizeMode}
          onTrajectorySizeScaleChange={controller.setTrajectorySizeScale}
          onTrajectoryStyleModeChange={controller.setTrajectoryStyleMode}
          onTrajectoryEmphasizeSelectedChange={
            controller.setTrajectoryEmphasizeSelected
          }
          onTrajectoryShowDescendantsChange={
            controller.setTrajectoryShowDescendants
          }
        />
        <div className="canvas-shell">
          <ViewportPane
            currentEventKey={controller.currentEventKey}
            displayId={controller.displayId}
            eventCount={controller.eventKeys.length}
            navigationControls={
              <CanvasNavigationControls
                cameraPose={controller.cameraPose}
                onPan={controller.panCamera}
                onSetDistanceOrZoomValue={controller.setCameraDistanceOrZoomValue}
                onSetPositionValue={controller.setCameraPositionValue}
                onSetTargetValue={controller.setCameraTargetValue}
                onViewPreset={controller.setCameraView}
                onZoomIn={() => controller.zoom(1.15)}
                onZoomOut={() => controller.zoom(0.85)}
              />
            }
            overlayControls={
              <SlicePlaneViewportControls
                onModeChange={controller.geometryWorkbench.setTransformMode}
                planeLabel={
                  controller.geometryWorkbench.selectedPlane?.visible
                    ? (controller.geometryWorkbench.selectedPlane.label ?? null)
                    : null
                }
                transformMode={controller.geometryWorkbench.transformMode}
              />
            }
          />
        </div>
        {controller.inspectorOpen ? (
          <InspectorPanel
            currentEventIndex={controller.currentEventIndex}
            ecalVetoSummary={controller.ecalVetoSummary}
            eventCount={controller.eventKeys.length}
            eventGuide={controller.eventGuide}
            hcalVetoSummary={controller.hcalVetoSummary}
            onSelectTruthTrack={controller.setSelectedTruthTrackId}
            onTruthFilterHideOrphanedLowEnergyEmChange={
              controller.setTruthFilterHideOrphanedLowEnergyEm
            }
            onTruthFilterMinEnergyChange={controller.setTruthFilterMinEnergy}
            onTruthFilterOrphanedEmEnergyThresholdChange={
              controller.setTruthFilterOrphanedEmEnergyThreshold
            }
            onTruthFilterProcessTypeChange={
              controller.setTruthFilterProcessType
            }
            onTruthFilterReset={controller.resetTruthFilters}
            onTruthFilterSpeciesChange={controller.setTruthFilterSpecies}
            selectedTruthHierarchy={controller.selectedTruthHierarchy}
            selectedTruthParticle={controller.selectedTruthParticle}
            selectedTruthTrackId={controller.selectedTruthTrackId}
            selectedTruthTrajectory={controller.selectedTruthTrajectory}
            truthChildrenMap={controller.truthChildrenMap}
            truthContributions={controller.truthContributions}
            truthFilterProcessOptions={controller.truthFilterProcessOptions}
            truthFilters={controller.truthFilters}
            truthParticles={controller.truthParticles}
            truthRoots={controller.truthRoots}
          />
        ) : null}
      </div>

      <StatusBar
        currentEventIndex={controller.currentEventIndex}
        currentEventKey={controller.currentEventKey}
        eventCount={controller.eventKeys.length}
        geometryLabel={controller.geometryLabel}
        sourceLabel={controller.sourceLabel}
        status={controller.status}
      />

      <input
        ref={controller.eventFileInputRef}
        accept=".json,.phnx,application/json"
        className="sr-only"
        onChange={controller.handleEventFileChange}
        type="file"
      />
      <input
        ref={controller.geometryFileInputRef}
        accept=".gltf,.glb,model/gltf-binary"
        className="sr-only"
        onChange={controller.handleGeometryFileChange}
        type="file"
      />
    </div>
  );
}
