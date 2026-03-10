import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GeometryClipPlane } from '../../../types';

type SlicePlaneRowProps = {
  onEnableChange: (enabled: boolean) => void;
  onModeChange: (mode: GeometryClipPlane['mode']) => void;
  onRemove: () => void;
  onSelect: () => void;
  onVisibilityChange: (visible: boolean) => void;
  plane: GeometryClipPlane;
  selected: boolean;
};

export function SlicePlaneRow({
  onEnableChange,
  onModeChange,
  onRemove,
  onSelect,
  onVisibilityChange,
  plane,
  selected
}: SlicePlaneRowProps) {
  const sortable = useSortable({
    data: {
      planeId: plane.id,
      type: 'plane'
    },
    id: plane.id
  });

  return (
    <div
      ref={sortable.setNodeRef}
      className={`geometry-workbench__slice-row${selected ? ' geometry-workbench__slice-row--selected' : ''}`}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition
      }}
    >
      <button
        className="geometry-workbench__group-handle"
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        ::
      </button>
      <input
        checked={plane.enabled}
        onChange={(event) => onEnableChange(event.target.checked)}
        title="clip enabled"
        type="checkbox"
      />
      <input
        checked={plane.visible}
        onChange={(event) => onVisibilityChange(event.target.checked)}
        title="plane visible"
        type="checkbox"
      />
      <button
        className="geometry-workbench__slice-label"
        onClick={onSelect}
        type="button"
      >
        {plane.label}
      </button>
      <select
        onChange={(event) =>
          onModeChange(event.target.value as GeometryClipPlane['mode'])
        }
        value={plane.mode}
      >
        <option value="keepPositive">keep +</option>
        <option value="keepNegative">keep −</option>
        <option value="slabStart">slab start</option>
        <option value="slabEnd">slab end</option>
      </select>
      <button className="chrome-button" onClick={onRemove} type="button">
        x
      </button>
    </div>
  );
}
