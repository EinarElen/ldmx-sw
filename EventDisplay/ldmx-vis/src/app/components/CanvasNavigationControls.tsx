import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '../utils/formatting';
import type {
  CameraPanDirection,
  CameraPose,
  CameraViewPreset
} from '../utils/cameraNavigation';

type CanvasNavigationControlsProps = {
  cameraPose: CameraPose | null;
  onPan: (direction: CameraPanDirection) => void;
  onSetDistanceOrZoomValue: (value: number) => void;
  onSetPositionValue: (axis: 0 | 1 | 2, value: number) => void;
  onSetTargetValue: (axis: 0 | 1 | 2, value: number) => void;
  onViewPreset: (preset: CameraViewPreset) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

type NumericDraftFieldProps = {
  ariaLabel: string;
  label: string;
  value: number | null;
  onCommit: (value: number) => void;
};

const VIEW_PRESETS: Array<{ id: CameraViewPreset; label: string }> = [
  { id: 'home', label: 'home' },
  { id: 'full', label: 'full' },
  { id: 'top', label: 'top' },
  { id: 'right', label: 'right' },
  { id: 'downstream', label: 'down' }
];

const AXIS_LABELS = ['x', 'y', 'z'] as const;

export function CanvasNavigationControls({
  cameraPose,
  onPan,
  onSetDistanceOrZoomValue,
  onSetPositionValue,
  onSetTargetValue,
  onViewPreset,
  onZoomIn,
  onZoomOut
}: CanvasNavigationControlsProps) {
  const scalarInfo = useMemo(() => {
    if (!cameraPose) return { label: 'dist', value: null as number | null };
    if (cameraPose.zoom != null) {
      return { label: 'zoom', value: cameraPose.zoom };
    }

    const [px, py, pz] = cameraPose.position;
    const [tx, ty, tz] = cameraPose.target;
    const dx = px - tx;
    const dy = py - ty;
    const dz = pz - tz;
    return {
      label: 'dist',
      value: Math.sqrt(dx * dx + dy * dy + dz * dz)
    };
  }, [cameraPose]);

  return (
    <div className="canvas-nav">
      <div className="canvas-nav__header">
        <div className="canvas-nav__title">nav</div>
        <div className="canvas-nav__subtitle">camera</div>
      </div>

      <div className="canvas-nav__presets">
        {VIEW_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="chrome-button canvas-nav__chip"
            onClick={() => onViewPreset(preset.id)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="canvas-nav__controls">
        <div className="canvas-nav__cluster">
          <div className="canvas-nav__cluster-label">pan</div>
          <div className="canvas-nav__pad">
            <button
              className="canvas-nav__pad-button"
              onClick={() => onPan('up')}
              type="button"
            >
              ^
            </button>
            <div className="canvas-nav__pad-row">
              <button
                className="canvas-nav__pad-button"
                onClick={() => onPan('left')}
                type="button"
              >
                &lt;
              </button>
              <button
                className="canvas-nav__pad-button"
                onClick={() => onPan('right')}
                type="button"
              >
                &gt;
              </button>
            </div>
            <button
              className="canvas-nav__pad-button"
              onClick={() => onPan('down')}
              type="button"
            >
              v
            </button>
          </div>
        </div>

        <div className="canvas-nav__cluster">
          <div className="canvas-nav__cluster-label">zoom</div>
          <div className="zoom-stack">
            <button className="zoom-stack__button" onClick={onZoomIn} type="button">
              +
            </button>
            <button className="zoom-stack__button" onClick={onZoomOut} type="button">
              -
            </button>
          </div>
        </div>
      </div>

      <div className="canvas-nav__vectors">
        <div className="canvas-nav__vector">
          <div className="canvas-nav__vector-label">cam</div>
          <div className="canvas-nav__field-grid">
            {AXIS_LABELS.map((axis, index) => (
              <NumericDraftField
                ariaLabel={`cam ${axis}`}
                key={`position-${axis}`}
                label={axis}
                onCommit={(value) =>
                  onSetPositionValue(index as 0 | 1 | 2, value)
                }
                value={cameraPose?.position[index] ?? null}
              />
            ))}
          </div>
        </div>

        <div className="canvas-nav__vector">
          <div className="canvas-nav__vector-label">aim</div>
          <div className="canvas-nav__field-grid">
            {AXIS_LABELS.map((axis, index) => (
              <NumericDraftField
                ariaLabel={`aim ${axis}`}
                key={`target-${axis}`}
                label={axis}
                onCommit={(value) => onSetTargetValue(index as 0 | 1 | 2, value)}
                value={cameraPose?.target[index] ?? null}
              />
            ))}
          </div>
        </div>

        <div className="canvas-nav__vector">
          <div className="canvas-nav__vector-label">{scalarInfo.label}</div>
          <div className="canvas-nav__field-grid canvas-nav__field-grid--single">
            <NumericDraftField
              ariaLabel={`camera ${scalarInfo.label}`}
              label={scalarInfo.label}
              onCommit={onSetDistanceOrZoomValue}
              value={scalarInfo.value}
            />
          </div>
        </div>
      </div>

      <div className="canvas-nav__hint">drag orbit · right drag pan · wheel zoom</div>
    </div>
  );
}

function NumericDraftField({
  ariaLabel,
  label,
  value,
  onCommit
}: NumericDraftFieldProps) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) return;
    setDraft(formatEditableNumber(value));
  }, [editing, value]);

  function commit() {
    setEditing(false);
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(formatEditableNumber(value));
      return;
    }
    onCommit(parsed);
  }

  return (
    <label className="canvas-nav__field">
      <span className="canvas-nav__field-label">{label}</span>
      <input
        aria-label={ariaLabel}
        className="canvas-nav__field-input"
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setEditing(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
          }
          if (event.key === 'Escape') {
            setEditing(false);
            setDraft(formatEditableNumber(value));
          }
        }}
        type="text"
        value={draft}
      />
    </label>
  );
}

function formatEditableNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '';
  return formatNumber(value, {
    decimals: 2,
    scientificBelow: 1e-2,
    significantDigits: 5
  });
}
