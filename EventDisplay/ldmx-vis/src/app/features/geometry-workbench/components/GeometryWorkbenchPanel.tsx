import type {
  GeometryAppearanceOverride,
  GeometryClipPlane,
  GeometryGroup,
  GeometryRegistry,
  GeometrySelectionTarget,
  HcalProxyGranularity
} from '../../../types';
import { GeometryAppearanceSection } from './GeometryAppearanceSection';
import { GeometryGroupsSection } from './GeometryGroupsSection';
import { GeometryHierarchySection } from './GeometryHierarchySection';
import { GeometrySlicesSection } from './GeometrySlicesSection';

type GeometryWorkbenchPanelProps = {
  expandedState: Record<string, boolean>;
  groupOrder: string[];
  groups: Record<string, GeometryGroup>;
  hcalProxyGranularity: HcalProxyGranularity;
  onAddPlane: () => void;
  onAssignNodeToGroup: (nodeId: string, groupId: string) => void;
  onCreateGroup: () => void;
  onCollapseAll: () => void;
  onDeleteGroup: (groupId: string) => void;
  onExpandAll: () => void;
  onMoveGroup: (activeId: string, overId: string) => void;
  onMovePlane: (activeId: string, overId: string) => void;
  onRemoveGroupMember: (groupId: string, nodeId: string) => void;
  onRemovePlane: (planeId: string) => void;
  onResetSelectedAppearance: () => void;
  onSearchChange: (value: string) => void;
  onSelectGroup: (groupId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectPlane: (planeId: string) => void;
  onSetHcalProxyGranularity: (value: HcalProxyGranularity) => void;
  onSetSelectedAppearance: (patch: Partial<GeometryAppearanceOverride>) => void;
  onToggleExpanded: (nodeId: string) => void;
  onTransformModeChange: (mode: 'translate' | 'rotate') => void;
  onUpdateGroupName: (groupId: string, name: string) => void;
  onUpdatePlane: (planeId: string, patch: Partial<GeometryClipPlane>) => void;
  onVisibilityChange: (nodeId: string, visible: boolean) => void;
  planes: GeometryClipPlane[];
  registry: GeometryRegistry;
  searchQuery: string;
  selectedAppearance: GeometryAppearanceOverride | null;
  selectedGroupId: string | null;
  selectedLabel: string | null;
  selectedNodeId: string | null;
  selectedPlane: GeometryClipPlane | null;
  selectedTarget: GeometrySelectionTarget | null;
  transformMode: 'translate' | 'rotate';
  visibleNodeIds: Set<string>;
  visibilityState: Record<string, boolean>;
};

export function GeometryWorkbenchPanel({
  expandedState,
  groupOrder,
  groups,
  hcalProxyGranularity,
  onAddPlane,
  onAssignNodeToGroup,
  onCreateGroup,
  onCollapseAll,
  onDeleteGroup,
  onExpandAll,
  onMoveGroup,
  onMovePlane,
  onRemoveGroupMember,
  onRemovePlane,
  onResetSelectedAppearance,
  onSearchChange,
  onSelectGroup,
  onSelectNode,
  onSelectPlane,
  onSetHcalProxyGranularity,
  onSetSelectedAppearance,
  onToggleExpanded,
  onTransformModeChange,
  onUpdateGroupName,
  onUpdatePlane,
  onVisibilityChange,
  planes,
  registry,
  searchQuery,
  selectedAppearance,
  selectedGroupId,
  selectedLabel,
  selectedNodeId,
  selectedPlane,
  selectedTarget,
  transformMode,
  visibleNodeIds,
  visibilityState
}: GeometryWorkbenchPanelProps) {
  return (
    <>
      <GeometryHierarchySection
        onCollapseAll={onCollapseAll}
        expandedState={expandedState}
        onExpandAll={onExpandAll}
        onSearchChange={onSearchChange}
        onSelectNode={onSelectNode}
        onToggleExpanded={onToggleExpanded}
        onVisibilityChange={onVisibilityChange}
        registry={registry}
        rootIds={registry.rootIds.filter((nodeId) => visibleNodeIds.has(nodeId))}
        searchQuery={searchQuery}
        selectedNodeId={selectedNodeId}
        visibleNodeIds={visibleNodeIds}
        visibilityState={visibilityState}
      />
      <GeometryGroupsSection
        groupOrder={groupOrder}
        groups={groups}
        onAssignNodeToGroup={onAssignNodeToGroup}
        onCreateGroup={onCreateGroup}
        onDeleteGroup={onDeleteGroup}
        onMoveGroup={onMoveGroup}
        onRemoveGroupMember={onRemoveGroupMember}
        onRenameGroup={onUpdateGroupName}
        onSelectGroup={onSelectGroup}
        registry={registry}
        selectedGroupId={selectedGroupId}
      />
      <GeometryAppearanceSection
        appearance={selectedAppearance}
        hcalProxyGranularity={hcalProxyGranularity}
        onChange={onSetSelectedAppearance}
        onHcalProxyGranularityChange={onSetHcalProxyGranularity}
        onReset={onResetSelectedAppearance}
        selectedLabel={selectedLabel}
        selectedTarget={selectedTarget}
      />
      <GeometrySlicesSection
        onAddPlane={onAddPlane}
        onMovePlane={onMovePlane}
        onRemovePlane={onRemovePlane}
        onSelectPlane={onSelectPlane}
        onTransformModeChange={onTransformModeChange}
        onUpdatePlane={onUpdatePlane}
        planes={planes}
        selectedPlane={selectedPlane}
        transformMode={transformMode}
      />
    </>
  );
}
