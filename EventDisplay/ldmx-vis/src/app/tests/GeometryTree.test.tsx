import { fireEvent, render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { GeometryTree } from '../features/geometry-workbench/components/GeometryTree';
import type { GeometryRegistry } from '../types';

const registry: GeometryRegistry = {
  nodeOrder: ['HCAL', 'HCAL/Back'],
  nodes: {
    HCAL: {
      bounds: { center: [0, 0, 0], size: [10, 10, 10] },
      childIds: ['HCAL/Back'],
      defaultColorToken: 'hcal',
      id: 'HCAL',
      kind: 'subsystem',
      label: 'HCAL',
      objectUuids: ['root'],
      parentId: null,
      path: ['HCAL'],
      stats: {
        childCount: 1,
        directObjectCount: 0,
        leafObjectCount: 1
      },
      subsystem: 'hcal'
    },
    'HCAL/Back': {
      bounds: { center: [0, 0, 1], size: [8, 8, 2] },
      childIds: [],
      defaultColorToken: 'hcal',
      id: 'HCAL/Back',
      kind: 'family',
      label: 'Back',
      objectUuids: ['leaf'],
      parentId: 'HCAL',
      path: ['HCAL', 'Back'],
      stats: {
        childCount: 0,
        directObjectCount: 1,
        leafObjectCount: 1
      },
      subsystem: 'hcal'
    }
  },
  objectNodeIds: {
    leaf: 'HCAL/Back'
  },
  rootIds: ['HCAL']
};

describe('GeometryTree', () => {
  test('emits expand and visibility actions for hierarchy rows', () => {
    const onSelect = vi.fn();
    const onToggleExpanded = vi.fn();
    const onVisibilityChange = vi.fn();

    const view = render(
      <GeometryTree
        expandedState={{ HCAL: true, 'HCAL/Back': false }}
        onSelect={onSelect}
        onToggleExpanded={onToggleExpanded}
        onVisibilityChange={onVisibilityChange}
        registry={registry}
        rootIds={['HCAL']}
        selectedNodeId={null}
        visibleNodeIds={new Set(['HCAL', 'HCAL/Back'])}
        visibilityState={{ HCAL: true, 'HCAL/Back': true }}
      />
    );

    const buttons = Array.from(view.container.querySelectorAll('button'));
    const checkboxes = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    );
    const expander = buttons[0];
    const backCheckbox = checkboxes[1];
    const backLabelButton = buttons.find(
      (button) => button.textContent?.includes('Back')
    );

    if (!expander || !backCheckbox || !backLabelButton) {
      throw new Error('Missing expected geometry tree controls');
    }

    fireEvent.click(expander);
    expect(onToggleExpanded).toHaveBeenCalledWith('HCAL');

    fireEvent.click(backCheckbox);
    expect(onVisibilityChange).toHaveBeenCalledWith('HCAL/Back', false);

    fireEvent.click(backLabelButton);
    expect(onSelect).toHaveBeenCalledWith('HCAL/Back');
  });
});
