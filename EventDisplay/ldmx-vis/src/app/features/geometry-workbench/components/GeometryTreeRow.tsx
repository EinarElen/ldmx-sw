import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { GeometryRegistryNode } from '../../../types';

type GeometryTreeRowProps = {
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  node: GeometryRegistryNode;
  onSelect: (nodeId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onVisibilityChange: (nodeId: string, visible: boolean) => void;
  selected: boolean;
  visible: boolean;
};

export function GeometryTreeRow({
  depth,
  expanded,
  hasChildren,
  node,
  onSelect,
  onToggleExpanded,
  onVisibilityChange,
  selected,
  visible
}: GeometryTreeRowProps) {
  const draggable = useDraggable({
    data: {
      nodeId: node.id,
      type: 'node'
    },
    id: `geometry-node:${node.id}`
  });

  return (
    <div
      ref={draggable.setNodeRef}
      className={`geometry-workbench__tree-row${selected ? ' geometry-workbench__tree-row--selected' : ''}`}
      style={{
        paddingLeft: `${12 + depth * 14}px`,
        transform: CSS.Translate.toString(draggable.transform)
      }}
    >
      <button
        className="geometry-workbench__expander"
        disabled={!hasChildren}
        onClick={() => onToggleExpanded(node.id)}
        type="button"
      >
        {hasChildren ? (expanded ? '−' : '+') : '·'}
      </button>
      <input
        checked={visible}
        onChange={(event) => onVisibilityChange(node.id, event.target.checked)}
        type="checkbox"
      />
      <button
        className="geometry-workbench__tree-label"
        onClick={() => onSelect(node.id)}
        type="button"
        {...draggable.listeners}
        {...draggable.attributes}
      >
        <span>{node.label}</span>
        <small>{node.stats.leafObjectCount}</small>
      </button>
    </div>
  );
}
