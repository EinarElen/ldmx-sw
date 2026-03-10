import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { GeometryClipPlane } from '../../../types';
import { SlicePlaneRow } from './SlicePlaneRow';

type SlicePlaneListProps = {
  onEnableChange: (planeId: string, enabled: boolean) => void;
  onModeChange: (planeId: string, mode: GeometryClipPlane['mode']) => void;
  onRemove: (planeId: string) => void;
  onSelect: (planeId: string) => void;
  onVisibilityChange: (planeId: string, visible: boolean) => void;
  planes: GeometryClipPlane[];
  selectedPlaneId: string | null;
};

export function SlicePlaneList({
  onEnableChange,
  onModeChange,
  onRemove,
  onSelect,
  onVisibilityChange,
  planes,
  selectedPlaneId
}: SlicePlaneListProps) {
  return (
    <SortableContext
      items={planes.map((plane) => plane.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="geometry-workbench__slice-list">
        {planes.map((plane) => (
          <SlicePlaneRow
            key={plane.id}
            onEnableChange={(enabled) => onEnableChange(plane.id, enabled)}
            onModeChange={(mode) => onModeChange(plane.id, mode)}
            onRemove={() => onRemove(plane.id)}
            onSelect={() => onSelect(plane.id)}
            onVisibilityChange={(visible) =>
              onVisibilityChange(plane.id, visible)
            }
            plane={plane}
            selected={selectedPlaneId === plane.id}
          />
        ))}
      </div>
    </SortableContext>
  );
}
