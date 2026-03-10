import { afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasNavigationControls } from '../components/CanvasNavigationControls';

afterEach(() => {
  cleanup();
});

function requireButton(container: HTMLElement, label: string) {
  const buttons = Array.from(container.querySelectorAll('button'));
  const button = buttons.find(
    (entry) => entry.textContent?.trim() === label
  );
  if (!button) {
    throw new Error(`Missing button "${label}"`);
  }
  return button;
}

function requireInput(container: HTMLElement, label: string) {
  const input = container.querySelector<HTMLInputElement>(
    `input[aria-label="${label}"]`
  );
  if (!input) {
    throw new Error(`Missing input "${label}"`);
  }
  return input;
}

describe('CanvasNavigationControls', () => {
  it('emits preset, pan, and zoom actions', () => {
    const onPan = vi.fn();
    const onViewPreset = vi.fn();
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();

    const { container } = render(
      <CanvasNavigationControls
        cameraPose={{
          position: [10, 20, 30],
          target: [1, 2, 3],
          zoom: null
        }}
        onPan={onPan}
        onSetDistanceOrZoomValue={vi.fn()}
        onSetPositionValue={vi.fn()}
        onSetTargetValue={vi.fn()}
        onViewPreset={onViewPreset}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    );

    fireEvent.click(requireButton(container, 'full'));
    fireEvent.click(requireButton(container, '>'));
    fireEvent.click(requireButton(container, '+'));
    fireEvent.click(requireButton(container, '-'));

    expect(onViewPreset).toHaveBeenCalledWith('full');
    expect(onPan).toHaveBeenCalledWith('right');
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('commits explicit numeric camera edits, including negative values', () => {
    const onSetPositionValue = vi.fn();
    const onSetTargetValue = vi.fn();
    const onSetDistanceOrZoomValue = vi.fn();

    const { container } = render(
      <CanvasNavigationControls
        cameraPose={{
          position: [10, 20, 30],
          target: [1, 2, 3],
          zoom: null
        }}
        onPan={vi.fn()}
        onSetDistanceOrZoomValue={onSetDistanceOrZoomValue}
        onSetPositionValue={onSetPositionValue}
        onSetTargetValue={onSetTargetValue}
        onViewPreset={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
      />
    );

    const camX = requireInput(container, 'cam x');
    const aimY = requireInput(container, 'aim y');
    const distance = requireInput(container, 'camera dist');

    fireEvent.change(camX, { target: { value: '-12.5' } });
    fireEvent.blur(camX);

    fireEvent.change(aimY, { target: { value: '44' } });
    fireEvent.blur(aimY);

    fireEvent.change(distance, { target: { value: '850' } });
    fireEvent.blur(distance);

    expect(onSetPositionValue).toHaveBeenCalledWith(0, -12.5);
    expect(onSetTargetValue).toHaveBeenCalledWith(1, 44);
    expect(onSetDistanceOrZoomValue).toHaveBeenCalledWith(850);
  });
});
