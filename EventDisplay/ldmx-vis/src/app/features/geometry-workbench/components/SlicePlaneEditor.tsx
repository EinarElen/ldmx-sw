import { useEffect, useState } from 'react';
import type { GeometryClipPlane } from '../../../types';

type SlicePlaneEditorProps = {
  onChange: (patch: Partial<GeometryClipPlane>) => void;
  plane: GeometryClipPlane | null;
};

export function SlicePlaneEditor({
  onChange,
  plane
}: SlicePlaneEditorProps) {
  if (!plane) {
    return (
      <p className="sidebar-section__hint">
        select a slice plane to edit position and rotation
      </p>
    );
  }

  return (
    <div className="geometry-workbench__controls">
      <label className="sidebar-field">
        <span>color</span>
        <input
          className="geometry-workbench__color"
          onChange={(event) => onChange({ color: event.target.value })}
          type="color"
          value={plane.color}
        />
      </label>
      <div className="geometry-workbench__vector-grid">
        <VectorInput
          label="pos"
          onChange={(value) => onChange({ position: value })}
          value={plane.position}
        />
        <VectorInput
          label="rot"
          onChange={(value) => onChange({ rotation: value })}
          value={plane.rotation}
        />
      </div>
      <label className="sidebar-slider">
        <span>{plane.helperSize.toFixed(0)}</span>
        <input
          max="4000"
          min="200"
          onChange={(event) =>
            onChange({ helperSize: Number(event.target.value) })
          }
          step="20"
          type="range"
          value={plane.helperSize}
        />
      </label>
      <label className="sidebar-slider">
        <span>{plane.thickness.toFixed(0)}</span>
        <input
          max="2000"
          min="20"
          onChange={(event) =>
            onChange({ thickness: Number(event.target.value) })
          }
          step="10"
          type="range"
          value={plane.thickness}
        />
      </label>
    </div>
  );
}

type VectorInputProps = {
  label: string;
  onChange: (value: [number, number, number]) => void;
  value: [number, number, number];
};

function VectorInput({ label, onChange, value }: VectorInputProps) {
  const [draft, setDraft] = useState(() => value.map(formatVectorValue));

  useEffect(() => {
    setDraft(value.map(formatVectorValue));
  }, [value]);

  return (
    <div className="geometry-workbench__vector">
      <span>{label}</span>
      {draft.map((entry, index) => (
        <input
          key={`${label}-${index}`}
          onChange={(event) => {
            const nextDraft = [...draft];
            nextDraft[index] = event.target.value;
            setDraft(nextDraft);
          }}
          onBlur={() => {
            const parsed = parseVectorDraft(draft, value);
            setDraft(parsed.map(formatVectorValue));
            onChange(parsed);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const parsed = parseVectorDraft(draft, value);
              setDraft(parsed.map(formatVectorValue));
              onChange(parsed);
            }
          }}
          spellCheck={false}
          type="text"
          value={entry}
        />
      ))}
    </div>
  );
}

function formatVectorValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function parseVectorDraft(
  draft: string[],
  fallback: [number, number, number]
): [number, number, number] {
  const next = [...fallback] as [number, number, number];
  for (let index = 0; index < 3; index += 1) {
    const parsed = Number(draft[index]);
    if (Number.isFinite(parsed)) {
      next[index] = parsed;
    }
  }
  return next;
}
