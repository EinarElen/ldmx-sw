import { CollapsibleSidebarSection } from '../../../components/CollapsibleSidebarSection';
import { GeometryTree } from './GeometryTree';
import type { GeometryRegistry } from '../../../types';

type GeometryHierarchySectionProps = {
  onCollapseAll: () => void;
  expandedState: Record<string, boolean>;
  onExpandAll: () => void;
  onSearchChange: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onVisibilityChange: (nodeId: string, visible: boolean) => void;
  registry: GeometryRegistry;
  rootIds: string[];
  searchQuery: string;
  selectedNodeId: string | null;
  visibleNodeIds: Set<string>;
  visibilityState: Record<string, boolean>;
};

export function GeometryHierarchySection({
  onCollapseAll,
  expandedState,
  onExpandAll,
  onSearchChange,
  onSelectNode,
  onToggleExpanded,
  onVisibilityChange,
  registry,
  rootIds,
  searchQuery,
  selectedNodeId,
  visibleNodeIds,
  visibilityState
}: GeometryHierarchySectionProps) {
  return (
    <CollapsibleSidebarSection
      className="geometry-workbench__section"
      title="hierarchy"
    >
      <div className="geometry-workbench__toolbar">
        <input
          className="geometry-workbench__search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="filter geometry"
          type="search"
          value={searchQuery}
        />
        <button className="chrome-button" onClick={onExpandAll} type="button">
          expand
        </button>
        <button className="chrome-button" onClick={onCollapseAll} type="button">
          collapse
        </button>
      </div>
      <GeometryTree
        expandedState={expandedState}
        onSelect={onSelectNode}
        onToggleExpanded={onToggleExpanded}
        onVisibilityChange={onVisibilityChange}
        registry={registry}
        rootIds={rootIds}
        selectedNodeId={selectedNodeId}
        visibleNodeIds={visibleNodeIds}
        visibilityState={visibilityState}
      />
    </CollapsibleSidebarSection>
  );
}
