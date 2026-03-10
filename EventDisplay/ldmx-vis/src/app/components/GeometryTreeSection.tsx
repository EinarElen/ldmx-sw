import { useMemo, useState } from 'react';
import type { GeometryTreeNode } from '../types';

type GeometryTreeSectionProps = {
  tree: GeometryTreeNode[];
  visibilityState: Record<string, boolean>;
  onVisibilityChange: (uuid: string, visible: boolean) => void;
};

export function GeometryTreeSection({
  tree,
  visibilityState,
  onVisibilityChange
}: GeometryTreeSectionProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rootIds = useMemo(() => new Set(tree.map((node) => node.id)), [tree]);

  function toggleExpanded(uuid: string) {
    setExpanded((previous) => ({
      ...previous,
      [uuid]: !isExpanded(uuid)
    }));
  }

  function isExpanded(uuid: string) {
    return expanded[uuid] ?? rootIds.has(uuid);
  }

  return (
    <section className="sidebar-section">
      <header className="sidebar-section__header">geometry</header>
      <div className="geometry-tree">
        {tree.map((node) => (
          <GeometryTreeRow
            key={node.id}
            expandedState={expanded}
            node={node}
            rootIds={rootIds}
            onExpandToggle={toggleExpanded}
            onVisibilityChange={onVisibilityChange}
            visibilityState={visibilityState}
          />
        ))}
      </div>
    </section>
  );
}

type GeometryTreeRowProps = {
  expandedState: Record<string, boolean>;
  node: GeometryTreeNode;
  rootIds: Set<string>;
  onExpandToggle: (uuid: string) => void;
  onVisibilityChange: (uuid: string, visible: boolean) => void;
  visibilityState: Record<string, boolean>;
};

function GeometryTreeRow({
  expandedState,
  node,
  rootIds,
  onExpandToggle,
  onVisibilityChange,
  visibilityState
}: GeometryTreeRowProps) {
  const hasChildren = node.children.length > 0;
  const visible = visibilityState[node.id] ?? true;
  const expanded = expandedState[node.id] ?? rootIds.has(node.id);

  return (
    <div className="geometry-tree__node">
      <div className="geometry-tree__row">
        <button
          className="geometry-tree__expander"
          disabled={!hasChildren}
          onClick={() => onExpandToggle(node.id)}
          type="button"
        >
          {hasChildren ? (expanded ? '−' : '+') : '·'}
        </button>
        <label className="geometry-tree__toggle">
          <input
            checked={visible}
            onChange={(event) =>
              onVisibilityChange(node.id, event.target.checked)
            }
            type="checkbox"
          />
          <span className="geometry-tree__label">
            {node.label}
            <small>{node.objectUuids.length}</small>
          </span>
        </label>
      </div>
      {hasChildren && expanded ? (
        <div className="geometry-tree__children">
          {node.children.map((child) => (
            <GeometryTreeRow
              key={child.id}
              expandedState={expandedState}
              node={child}
              rootIds={rootIds}
              onExpandToggle={onExpandToggle}
              onVisibilityChange={onVisibilityChange}
              visibilityState={visibilityState}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
