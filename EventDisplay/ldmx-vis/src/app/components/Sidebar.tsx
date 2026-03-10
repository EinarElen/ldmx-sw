import { CollectionTreeSection } from './CollectionTreeSection';
import { HitStyleSection } from './HitStyleSection';
import { TrajectoryStyleSection } from './TrajectoryStyleSection';
import { GeometryWorkbenchPanel } from '../features/geometry-workbench/components/GeometryWorkbenchPanel';
import type {
  CollectionTreeNode,
  GeometryAppearanceOverride,
  GeometryClipPlane,
  GeometryGroup,
  GeometryRegistry,
  GeometrySelectionTarget,
  HcalProxyGranularity,
  HitColorMode,
  HitSizeMode,
  HitVisualStyle,
  TrajectoryColorMode,
  TrajectorySizeMode,
  TrajectoryStyleMode,
  TrajectoryVisualStyle
} from '../types';

type SidebarProps = {
  collectionTree: CollectionTreeNode[];
  collectionVisibilityState: Record<string, boolean>;
  geometryWorkbench: {
    clipPlanes: GeometryClipPlane[];
    expandedState: Record<string, boolean>;
    groupOrder: string[];
    groups: Record<string, GeometryGroup>;
    hcalProxyGranularity: HcalProxyGranularity;
    registry: GeometryRegistry;
    searchQuery: string;
    selectedAppearance: GeometryAppearanceOverride | null;
    selectedLabel: string | null;
    selectedTarget: GeometrySelectionTarget | null;
    transformMode: 'translate' | 'rotate';
    visibleNodeIds: Set<string>;
    visibilityState: Record<string, boolean>;
  };
  hitVisualStyle: HitVisualStyle;
  trajectoryVisualStyle: TrajectoryVisualStyle;
  onAddClipPlane: () => void;
  onAssignNodeToGroup: (nodeId: string, groupId: string) => void;
  onCollectionVisibilityChange: (id: string, visible: boolean) => void;
  onCreateGroup: () => void;
  onCollapseAllGeometry: () => void;
  onDeleteGroup: (groupId: string) => void;
  onExpandAllGeometry: () => void;
  onGeometryGroupNameChange: (groupId: string, name: string) => void;
  onGeometryMoveGroup: (activeId: string, overId: string) => void;
  onGeometryMovePlane: (activeId: string, overId: string) => void;
  onGeometryNodeSelect: (nodeId: string) => void;
  onGeometryNodeVisibilityChange: (nodeId: string, visible: boolean) => void;
  onGeometryPlaneSelect: (planeId: string) => void;
  onGeometryRemoveGroupMember: (groupId: string, nodeId: string) => void;
  onGeometryRemovePlane: (planeId: string) => void;
  onGeometrySearchChange: (value: string) => void;
  onGeometryHcalProxyGranularityChange: (value: HcalProxyGranularity) => void;
  onGeometrySelectedAppearanceChange: (
    patch: Partial<GeometryAppearanceOverride>
  ) => void;
  onGeometrySelectedAppearanceReset: () => void;
  onGeometrySelectedGroup: (groupId: string) => void;
  onGeometryToggleExpanded: (nodeId: string) => void;
  onGeometryTransformModeChange: (mode: 'translate' | 'rotate') => void;
  onGeometryUpdatePlane: (
    planeId: string,
    patch: Partial<GeometryClipPlane>
  ) => void;
  onHitColorModeChange: (mode: HitColorMode) => void;
  onHitSizeModeChange: (mode: HitSizeMode) => void;
  onHitSizeStrengthChange: (value: number) => void;
  onTrajectoryColorModeChange: (mode: TrajectoryColorMode) => void;
  onTrajectorySizeModeChange: (mode: TrajectorySizeMode) => void;
  onTrajectorySizeScaleChange: (value: number) => void;
  onTrajectoryStyleModeChange: (mode: TrajectoryStyleMode) => void;
  onTrajectoryEmphasizeSelectedChange: (value: boolean) => void;
  onTrajectoryShowDescendantsChange: (value: boolean) => void;
};

export function Sidebar({
  collectionTree,
  collectionVisibilityState,
  geometryWorkbench,
  hitVisualStyle,
  trajectoryVisualStyle,
  onAddClipPlane,
  onAssignNodeToGroup,
  onCollectionVisibilityChange,
  onCreateGroup,
  onCollapseAllGeometry,
  onDeleteGroup,
  onExpandAllGeometry,
  onGeometryGroupNameChange,
  onGeometryMoveGroup,
  onGeometryMovePlane,
  onGeometryNodeSelect,
  onGeometryNodeVisibilityChange,
  onGeometryPlaneSelect,
  onGeometryRemoveGroupMember,
  onGeometryRemovePlane,
  onGeometrySearchChange,
  onGeometryHcalProxyGranularityChange,
  onGeometrySelectedAppearanceChange,
  onGeometrySelectedAppearanceReset,
  onGeometrySelectedGroup,
  onGeometryToggleExpanded,
  onGeometryTransformModeChange,
  onGeometryUpdatePlane,
  onHitColorModeChange,
  onHitSizeModeChange,
  onHitSizeStrengthChange,
  onTrajectoryColorModeChange,
  onTrajectorySizeModeChange,
  onTrajectorySizeScaleChange,
  onTrajectoryStyleModeChange,
  onTrajectoryEmphasizeSelectedChange,
  onTrajectoryShowDescendantsChange
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <GeometryWorkbenchPanel
        expandedState={geometryWorkbench.expandedState}
        groupOrder={geometryWorkbench.groupOrder}
        groups={geometryWorkbench.groups}
        hcalProxyGranularity={geometryWorkbench.hcalProxyGranularity}
        onAddPlane={onAddClipPlane}
        onAssignNodeToGroup={onAssignNodeToGroup}
        onCreateGroup={onCreateGroup}
        onCollapseAll={onCollapseAllGeometry}
        onDeleteGroup={onDeleteGroup}
        onExpandAll={onExpandAllGeometry}
        onMoveGroup={onGeometryMoveGroup}
        onMovePlane={onGeometryMovePlane}
        onRemoveGroupMember={onGeometryRemoveGroupMember}
        onRemovePlane={onGeometryRemovePlane}
        onResetSelectedAppearance={onGeometrySelectedAppearanceReset}
        onSearchChange={onGeometrySearchChange}
        onSelectGroup={onGeometrySelectedGroup}
        onSelectNode={onGeometryNodeSelect}
        onSelectPlane={onGeometryPlaneSelect}
        onSetHcalProxyGranularity={onGeometryHcalProxyGranularityChange}
        onSetSelectedAppearance={onGeometrySelectedAppearanceChange}
        onToggleExpanded={onGeometryToggleExpanded}
        onTransformModeChange={onGeometryTransformModeChange}
        onUpdateGroupName={onGeometryGroupNameChange}
        onUpdatePlane={onGeometryUpdatePlane}
        onVisibilityChange={onGeometryNodeVisibilityChange}
        planes={geometryWorkbench.clipPlanes}
        registry={geometryWorkbench.registry}
        searchQuery={geometryWorkbench.searchQuery}
        selectedAppearance={geometryWorkbench.selectedAppearance}
        selectedGroupId={
          geometryWorkbench.selectedTarget?.type === 'group'
            ? geometryWorkbench.selectedTarget.id
            : null
        }
        selectedLabel={geometryWorkbench.selectedLabel}
        selectedNodeId={
          geometryWorkbench.selectedTarget?.type === 'node'
            ? geometryWorkbench.selectedTarget.id
            : null
        }
        selectedPlane={
          geometryWorkbench.selectedTarget?.type === 'plane'
            ? geometryWorkbench.clipPlanes.find(
                (plane) => plane.id === geometryWorkbench.selectedTarget?.id
              ) ?? null
            : null
        }
        selectedTarget={geometryWorkbench.selectedTarget}
        transformMode={geometryWorkbench.transformMode}
        visibleNodeIds={geometryWorkbench.visibleNodeIds}
        visibilityState={geometryWorkbench.visibilityState}
      />

      <CollectionTreeSection
        onVisibilityChange={onCollectionVisibilityChange}
        tree={collectionTree}
        visibilityState={collectionVisibilityState}
      />

      <HitStyleSection
        onColorModeChange={onHitColorModeChange}
        onSizeModeChange={onHitSizeModeChange}
        onSizeStrengthChange={onHitSizeStrengthChange}
        style={hitVisualStyle}
      />

      <TrajectoryStyleSection
        onColorModeChange={onTrajectoryColorModeChange}
        onEmphasizeSelectedChange={onTrajectoryEmphasizeSelectedChange}
        onShowDescendantsChange={onTrajectoryShowDescendantsChange}
        onSizeModeChange={onTrajectorySizeModeChange}
        onSizeScaleChange={onTrajectorySizeScaleChange}
        onStyleModeChange={onTrajectoryStyleModeChange}
        style={trajectoryVisualStyle}
      />
    </aside>
  );
}
