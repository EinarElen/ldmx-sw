import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { GeometryGroup, GeometryRegistry } from '../../../types';
import { CollapsibleSidebarSection } from '../../../components/CollapsibleSidebarSection';
import { GeometryGroupRow } from './GeometryGroupRow';

type GeometryGroupsSectionProps = {
  groupOrder: string[];
  groups: Record<string, GeometryGroup>;
  onAssignNodeToGroup: (nodeId: string, groupId: string) => void;
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveGroup: (activeId: string, overId: string) => void;
  onRemoveGroupMember: (groupId: string, nodeId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectGroup: (groupId: string) => void;
  registry: GeometryRegistry;
  selectedGroupId: string | null;
};

export function GeometryGroupsSection({
  groupOrder,
  groups,
  onAssignNodeToGroup,
  onCreateGroup,
  onDeleteGroup,
  onMoveGroup,
  onRemoveGroupMember,
  onRenameGroup,
  onSelectGroup,
  registry,
  selectedGroupId
}: GeometryGroupsSectionProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type;
    const activeGroupId = event.active.data.current?.groupId as string | undefined;
    const activeNodeId = event.active.data.current?.nodeId as string | undefined;
    const overType = event.over?.data.current?.type;
    const overGroupId = event.over?.data.current?.groupId as string | undefined;

    if (activeType === 'group' && overType === 'group' && activeGroupId && overGroupId) {
      onMoveGroup(activeGroupId, overGroupId);
      return;
    }

    if (activeType === 'node' && overGroupId && activeNodeId) {
      onAssignNodeToGroup(activeNodeId, overGroupId);
    }
  }

  return (
    <CollapsibleSidebarSection
      className="geometry-workbench__section"
      title="groups"
    >
      <div className="geometry-workbench__toolbar">
        <button className="chrome-button" onClick={onCreateGroup} type="button">
          new group
        </button>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={groupOrder.map((groupId) => `geometry-group:${groupId}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="geometry-workbench__groups">
            {groupOrder.map((groupId) => {
              const group = groups[groupId];
              if (!group) return null;

              return (
                <GeometryGroupRow
                  key={group.id}
                  group={group}
                  onNameChange={(value) => onRenameGroup(group.id, value)}
                  onRemove={() => onDeleteGroup(group.id)}
                  onRemoveMember={(nodeId) => onRemoveGroupMember(group.id, nodeId)}
                  onSelect={() => onSelectGroup(group.id)}
                  registry={registry}
                  selected={selectedGroupId === group.id}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </CollapsibleSidebarSection>
  );
}
