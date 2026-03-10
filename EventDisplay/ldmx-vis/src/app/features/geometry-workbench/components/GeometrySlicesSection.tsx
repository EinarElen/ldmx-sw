import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import type { GeometryClipPlane } from '../../../types';
import { CollapsibleSidebarSection } from '../../../components/CollapsibleSidebarSection';
import { SlicePlaneEditor } from './SlicePlaneEditor';
import { SlicePlaneList } from './SlicePlaneList';

type GeometrySlicesSectionProps = {
  onAddPlane: () => void;
  onMovePlane: (activeId: string, overId: string) => void;
  onRemovePlane: (planeId: string) => void;
  onSelectPlane: (planeId: string) => void;
  onTransformModeChange: (mode: 'translate' | 'rotate') => void;
  onUpdatePlane: (planeId: string, patch: Partial<GeometryClipPlane>) => void;
  planes: GeometryClipPlane[];
  selectedPlane: GeometryClipPlane | null;
  transformMode: 'translate' | 'rotate';
};

export function GeometrySlicesSection({
  onAddPlane,
  onMovePlane,
  onRemovePlane,
  onSelectPlane,
  onTransformModeChange,
  onUpdatePlane,
  planes,
  selectedPlane,
  transformMode
}: GeometrySlicesSectionProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    onMovePlane(String(event.active.id), String(event.over.id));
  }

  return (
    <CollapsibleSidebarSection
      className="geometry-workbench__section"
      title="slices"
    >
      <div className="geometry-workbench__toolbar">
        <button className="chrome-button" onClick={onAddPlane} type="button">
          add plane
        </button>
        <div className="geometry-workbench__mode-switch">
          <button
            className={`chrome-button${transformMode === 'translate' ? ' chrome-button--active' : ''}`}
            onClick={() => onTransformModeChange('translate')}
            type="button"
          >
            move
          </button>
          <button
            className={`chrome-button${transformMode === 'rotate' ? ' chrome-button--active' : ''}`}
            onClick={() => onTransformModeChange('rotate')}
            type="button"
          >
            rotate
          </button>
        </div>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SlicePlaneList
          onEnableChange={(planeId, enabled) =>
            onUpdatePlane(planeId, { enabled })
          }
          onModeChange={(planeId, mode) => onUpdatePlane(planeId, { mode })}
          onRemove={onRemovePlane}
          onSelect={onSelectPlane}
          onVisibilityChange={(planeId, visible) =>
            onUpdatePlane(planeId, { visible })
          }
          planes={planes}
          selectedPlaneId={selectedPlane?.id ?? null}
        />
      </DndContext>
      <SlicePlaneEditor
        onChange={(patch) => {
          if (selectedPlane) {
            onUpdatePlane(selectedPlane.id, patch);
          }
        }}
        plane={selectedPlane}
      />
    </CollapsibleSidebarSection>
  );
}
