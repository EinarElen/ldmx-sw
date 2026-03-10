import {
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GeometryGroup, GeometryRegistry } from '../../../types';

type GeometryGroupRowProps = {
  group: GeometryGroup;
  onNameChange: (value: string) => void;
  onRemove: () => void;
  onRemoveMember: (nodeId: string) => void;
  onSelect: () => void;
  registry: GeometryRegistry;
  selected: boolean;
};

export function GeometryGroupRow({
  group,
  onNameChange,
  onRemove,
  onRemoveMember,
  onSelect,
  registry,
  selected
}: GeometryGroupRowProps) {
  const sortable = useSortable({
    id: `geometry-group:${group.id}`
  });
  const droppable = useDroppable({
    data: {
      groupId: group.id,
      type: 'group'
    },
    id: `geometry-group-target:${group.id}`
  });
  const setNodeRef = (node: HTMLElement | null) => {
    sortable.setNodeRef(node);
    droppable.setNodeRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      className={`geometry-workbench__group${selected ? ' geometry-workbench__group--selected' : ''}${droppable.isOver ? ' geometry-workbench__group--over' : ''}`}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition
      }}
    >
      <div className="geometry-workbench__group-header">
        <button
          className="geometry-workbench__group-handle"
          type="button"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          ::
        </button>
        <input
          className="geometry-workbench__group-name"
          onChange={(event) => onNameChange(event.target.value)}
          onFocus={onSelect}
          type="text"
          value={group.name}
        />
        <button className="chrome-button" onClick={onRemove} type="button">
          drop
        </button>
      </div>
      <button
        className="geometry-workbench__group-summary"
        onClick={onSelect}
        type="button"
      >
        {group.memberNodeIds.length} members
      </button>
      {selected && group.memberNodeIds.length ? (
        <div className="geometry-workbench__group-members">
          {group.memberNodeIds.map((nodeId) => (
            <div key={nodeId} className="geometry-workbench__group-member">
              <span>{registry.nodes[nodeId]?.path.join(' / ') ?? nodeId}</span>
              <button
                className="chrome-button"
                onClick={() => onRemoveMember(nodeId)}
                type="button"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
