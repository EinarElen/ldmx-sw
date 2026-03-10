type SlicePlaneViewportControlsProps = {
  onModeChange: (mode: 'translate' | 'rotate') => void;
  planeLabel: string | null;
  transformMode: 'translate' | 'rotate';
};

export function SlicePlaneViewportControls({
  onModeChange,
  planeLabel,
  transformMode
}: SlicePlaneViewportControlsProps) {
  if (!planeLabel) return null;

  return (
    <div className="geometry-workbench__viewport-controls">
      <span>{planeLabel}</span>
      <button
        className={`chrome-button${transformMode === 'translate' ? ' chrome-button--active' : ''}`}
        onClick={() => onModeChange('translate')}
        type="button"
      >
        move
      </button>
      <button
        className={`chrome-button${transformMode === 'rotate' ? ' chrome-button--active' : ''}`}
        onClick={() => onModeChange('rotate')}
        type="button"
      >
        rotate
      </button>
    </div>
  );
}
