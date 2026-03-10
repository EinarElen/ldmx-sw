import type { GeometryRegistry } from '../../../types';
import { GeometryTreeRow } from './GeometryTreeRow';

type GeometryTreeProps = {
  expandedState: Record<string, boolean>;
  registry: GeometryRegistry;
  rootIds: string[];
  selectedNodeId: string | null;
  visibleNodeIds: Set<string>;
  visibilityState: Record<string, boolean>;
  onSelect: (nodeId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onVisibilityChange: (nodeId: string, visible: boolean) => void;
};

export function GeometryTree({
  expandedState,
  registry,
  rootIds,
  selectedNodeId,
  visibleNodeIds,
  visibilityState,
  onSelect,
  onToggleExpanded,
  onVisibilityChange
}: GeometryTreeProps) {
  return (
    <div className="geometry-workbench__tree">
      {rootIds.map((nodeId) => (
        <GeometryTreeBranch
          key={nodeId}
          depth={0}
          expandedState={expandedState}
          nodeId={nodeId}
          onSelect={onSelect}
          onToggleExpanded={onToggleExpanded}
          onVisibilityChange={onVisibilityChange}
          registry={registry}
          selectedNodeId={selectedNodeId}
          visibleNodeIds={visibleNodeIds}
          visibilityState={visibilityState}
        />
      ))}
    </div>
  );
}

type BranchProps = Omit<GeometryTreeProps, 'rootIds'> & {
  depth: number;
  nodeId: string;
};

function GeometryTreeBranch({
  depth,
  expandedState,
  nodeId,
  onSelect,
  onToggleExpanded,
  onVisibilityChange,
  registry,
  selectedNodeId,
  visibleNodeIds,
  visibilityState
}: BranchProps) {
  const node = registry.nodes[nodeId];
  if (!node || !visibleNodeIds.has(nodeId)) {
    return null;
  }

  const expanded = expandedState[nodeId] ?? false;

  return (
    <>
      <GeometryTreeRow
        depth={depth}
        expanded={expanded}
        hasChildren={node.childIds.length > 0}
        node={node}
        onSelect={onSelect}
        onToggleExpanded={onToggleExpanded}
        onVisibilityChange={onVisibilityChange}
        selected={selectedNodeId === nodeId}
        visible={visibilityState[nodeId] ?? true}
      />
      {expanded
        ? node.childIds.map((childId) => (
            <GeometryTreeBranch
              key={childId}
              depth={depth + 1}
              expandedState={expandedState}
              nodeId={childId}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
              onVisibilityChange={onVisibilityChange}
              registry={registry}
              selectedNodeId={selectedNodeId}
              visibleNodeIds={visibleNodeIds}
              visibilityState={visibilityState}
            />
          ))
        : null}
    </>
  );
}
