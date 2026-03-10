import { useMemo, useState } from 'react';
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection';
import type { CollectionTreeNode } from '../types';

type CollectionTreeSectionProps = {
  tree: CollectionTreeNode[];
  visibilityState: Record<string, boolean>;
  onVisibilityChange: (id: string, visible: boolean) => void;
};

export function CollectionTreeSection({
  tree,
  visibilityState,
  onVisibilityChange
}: CollectionTreeSectionProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function isExpanded(id: string) {
    return expanded[id] ?? false;
  }

  function toggleExpanded(id: string) {
    setExpanded((previous) => ({
      ...previous,
      [id]: !isExpanded(id)
    }));
  }

  return (
    <CollapsibleSidebarSection title="collections">
      <div className="geometry-tree">
        {tree.map((node) => (
          <CollectionTreeRow
            key={node.id}
            expandedState={expanded}
            node={node}
            onExpandToggle={toggleExpanded}
            onVisibilityChange={onVisibilityChange}
            visibilityState={visibilityState}
          />
        ))}
      </div>
    </CollapsibleSidebarSection>
  );
}

type CollectionTreeRowProps = {
  expandedState: Record<string, boolean>;
  node: CollectionTreeNode;
  onExpandToggle: (id: string) => void;
  onVisibilityChange: (id: string, visible: boolean) => void;
  visibilityState: Record<string, boolean>;
};

function CollectionTreeRow({
  expandedState,
  node,
  onExpandToggle,
  onVisibilityChange,
  visibilityState
}: CollectionTreeRowProps) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedState[node.id] ?? false;
  const visible = visibilityState[node.id] ?? true;

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
            onChange={(event) => onVisibilityChange(node.id, event.target.checked)}
            type="checkbox"
          />
          <span className="geometry-tree__label">
            {node.label}
            <small>
              {node.collectionCount} / {node.itemCount}
            </small>
          </span>
        </label>
      </div>
      {hasChildren && expanded ? (
        <div className="geometry-tree__children">
          {node.children.map((child) => (
            <CollectionTreeRow
              key={child.id}
              expandedState={expandedState}
              node={child}
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
