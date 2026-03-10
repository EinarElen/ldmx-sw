import { CollapsibleSidebarSection } from './CollapsibleSidebarSection';
import type { HitColorMode, HitSizeMode, HitVisualStyle } from '../types';

type HitStyleSectionProps = {
  style: HitVisualStyle;
  onColorModeChange: (mode: HitColorMode) => void;
  onSizeModeChange: (mode: HitSizeMode) => void;
  onSizeStrengthChange: (value: number) => void;
};

export function HitStyleSection({
  style,
  onColorModeChange,
  onSizeModeChange,
  onSizeStrengthChange
}: HitStyleSectionProps) {
  return (
    <CollapsibleSidebarSection title="hit styling">
      <div className="sidebar-controls">
        <label className="sidebar-field">
          <span>color</span>
          <select
            value={style.colorMode}
            onChange={(event) =>
              onColorModeChange(event.target.value as HitColorMode)
            }
          >
            <option value="source">source</option>
            <option value="energy">energy</option>
            <option value="parentSpecies">parent species</option>
            <option value="parentTrack">parent track</option>
          </select>
        </label>

        <label className="sidebar-field">
          <span>size</span>
          <select
            value={style.sizeMode}
            onChange={(event) =>
              onSizeModeChange(event.target.value as HitSizeMode)
            }
          >
            <option value="source">source</option>
            <option value="energy">energy</option>
            <option value="contributors">contributors</option>
          </select>
        </label>

        <label className="sidebar-slider">
          <span>{style.sizeStrength.toFixed(2)}</span>
          <input
            type="range"
            min="0.4"
            max="1.8"
            step="0.05"
            value={style.sizeStrength}
            onChange={(event) =>
              onSizeStrengthChange(Number(event.target.value))
            }
          />
        </label>
      </div>
    </CollapsibleSidebarSection>
  );
}
